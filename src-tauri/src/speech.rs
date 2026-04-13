use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;

use crate::model_manager::get_app_data_dir;

// ============================================
// 全局状态：录音控制与音频缓冲
// ============================================

pub struct SpeechState {
    /// 是否正在录音
    pub is_recording: Arc<AtomicBool>,
    /// 录音数据缓冲区 (16kHz 单声道 f32)
    pub audio_buffer: Arc<Mutex<Vec<f32>>>,
    /// cpal 音频流句柄（需要保持存活才能持续录音）
    pub audio_stream: Mutex<Option<cpal::Stream>>,
    /// 设备采样率（用于重采样判断）
    pub device_sample_rate: Mutex<Option<u32>>,
}

// cpal::Stream 不是 Send，但我们通过 Mutex 保护访问，在 Tauri 上下文中是安全的
unsafe impl Send for SpeechState {}
unsafe impl Sync for SpeechState {}

// ============================================
// 辅助函数
// ============================================

/// 获取语音模型目录
fn get_speech_model_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = get_app_data_dir(app)?;
    let speech_dir = app_dir.join("speech-models");
    if !speech_dir.exists() {
        std::fs::create_dir_all(&speech_dir).map_err(|e| format!("创建语音模型目录失败: {}", e))?;
    }
    Ok(speech_dir)
}

/// 简单线性重采样 (从 src_rate 到 dst_rate)
fn resample_linear(input: &[f32], src_rate: u32, dst_rate: u32) -> Vec<f32> {
    if src_rate == dst_rate {
        return input.to_vec();
    }
    let ratio = src_rate as f64 / dst_rate as f64;
    let output_len = (input.len() as f64 / ratio) as usize;
    let mut output = Vec::with_capacity(output_len);
    for i in 0..output_len {
        let src_pos = i as f64 * ratio;
        let src_idx = src_pos as usize;
        let frac = src_pos - src_idx as f64;
        if src_idx + 1 < input.len() {
            let sample = input[src_idx] as f64 * (1.0 - frac) + input[src_idx + 1] as f64 * frac;
            output.push(sample as f32);
        } else if src_idx < input.len() {
            output.push(input[src_idx]);
        }
    }
    output
}

// ============================================
// Tauri Commands
// ============================================

/// 检查 ASR 模型文件是否存在
#[tauri::command]
pub async fn check_speech_model_exists(app: AppHandle, model_type: String) -> Result<bool, String> {
    let speech_dir = get_speech_model_dir(&app)?;
    match model_type.as_str() {
        "sense_voice" => {
            let model_file = speech_dir.join("model.int8.onnx");
            let tokens_file = speech_dir.join("tokens.txt");
            Ok(model_file.exists() && tokens_file.exists())
        }
        "vad" => {
            let vad_file = speech_dir.join("silero_vad.onnx");
            Ok(vad_file.exists())
        }
        _ => Err(format!("未知模型类型: {}", model_type)),
    }
}

/// 启动麦克风录音
#[tauri::command]
pub async fn start_recording(
    state: tauri::State<'_, SpeechState>,
) -> Result<(), String> {
    // 如果已经在录音中，先停止
    if state.is_recording.load(Ordering::SeqCst) {
        return Err("已经在录音中".to_string());
    }

    // 清空之前的音频缓冲
    {
        let mut buffer = state.audio_buffer.lock().unwrap();
        buffer.clear();
    }

    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "未找到默认输入设备（麦克风）".to_string())?;

    let supported = device
        .default_input_config()
        .map_err(|e| format!("获取输入设备配置失败: {}", e))?;

    let config = supported.config();
    let sample_format = supported.sample_format();
    let channels = config.channels as usize;
    let sample_rate = config.sample_rate.0;

    println!("[Speech] 输入设备: {:?}, 格式: {:?}, 通道: {}, 采样率: {}",
        device.name().unwrap_or("unknown".into()), sample_format, channels, sample_rate);

    // 保存设备采样率
    {
        let mut sr = state.device_sample_rate.lock().unwrap();
        *sr = Some(sample_rate);
    }

    let buffer_clone = state.audio_buffer.clone();
    let is_recording_clone = state.is_recording.clone();
    let err_fn = |err| eprintln!("[Speech] 音频流错误: {:?}", err);

    // 根据采样格式创建输入流
    let stream = match sample_format {
        SampleFormat::F32 => device.build_input_stream(
            &config,
            move |data: &[f32], _| {
                if !is_recording_clone.load(Ordering::SeqCst) || data.is_empty() {
                    return;
                }
                // 多声道转单声道
                let mono: Vec<f32> = data
                    .chunks(channels)
                    .map(|frame| {
                        let sum: f32 = frame.iter().copied().sum();
                        sum / channels as f32
                    })
                    .collect();
                let mut buffer = buffer_clone.lock().unwrap();
                buffer.extend_from_slice(&mono);
            },
            err_fn,
            None,
        ).map_err(|e| format!("创建F32音频流失败: {}", e))?,

        SampleFormat::I16 => device.build_input_stream(
            &config,
            move |data: &[i16], _| {
                if !is_recording_clone.load(Ordering::SeqCst) || data.is_empty() {
                    return;
                }
                let mono: Vec<f32> = data
                    .chunks(channels)
                    .map(|frame| {
                        let sum: f32 = frame.iter().map(|&s| s as f32 / i16::MAX as f32).sum();
                        sum / channels as f32
                    })
                    .collect();
                let mut buffer = buffer_clone.lock().unwrap();
                buffer.extend_from_slice(&mono);
            },
            err_fn,
            None,
        ).map_err(|e| format!("创建I16音频流失败: {}", e))?,

        other => return Err(format!("不支持的采样格式: {:?}", other)),
    };

    stream.play().map_err(|e| format!("启动录音流失败: {}", e))?;

    // 设置录音标记
    state.is_recording.store(true, Ordering::SeqCst);

    // 保存流句柄（保持存活）
    {
        let mut stream_holder = state.audio_stream.lock().unwrap();
        *stream_holder = Some(stream);
    }

    println!("[Speech] 录音已启动");
    Ok(())
}

/// 停止录音并执行离线语音识别
#[tauri::command]
pub async fn stop_recording_and_recognize(
    app: AppHandle,
    state: tauri::State<'_, SpeechState>,
) -> Result<String, String> {
    if !state.is_recording.load(Ordering::SeqCst) {
        return Err("当前未在录音".to_string());
    }

    // 停止录音
    state.is_recording.store(false, Ordering::SeqCst);
    {
        let mut stream_holder = state.audio_stream.lock().unwrap();
        // drop 掉 stream 会自动停止录音
        *stream_holder = None;
    }

    // 获取录音数据
    let raw_samples = {
        let mut buffer = state.audio_buffer.lock().unwrap();
        let samples = buffer.clone();
        buffer.clear();
        samples
    };

    if raw_samples.is_empty() {
        return Err("未录到任何音频数据".to_string());
    }

    // 获取设备采样率并重采样到 16kHz
    let device_sr = {
        let sr = state.device_sample_rate.lock().unwrap();
        sr.unwrap_or(16000)
    };

    let samples_16k = if device_sr != 16000 {
        println!("[Speech] 重采样: {} Hz -> 16000 Hz, 样本数: {}", device_sr, raw_samples.len());
        resample_linear(&raw_samples, device_sr, 16000)
    } else {
        raw_samples
    };

    let audio_duration = samples_16k.len() as f64 / 16000.0;
    println!("[Speech] 录音时长: {:.2}s, 样本数: {}", audio_duration, samples_16k.len());

    if audio_duration < 0.3 {
        return Err("录音时间太短（<0.3秒）".to_string());
    }

    // 在后台线程执行识别（避免阻塞主线程）
    let speech_dir = get_speech_model_dir(&app)?;

    let result = tokio::task::spawn_blocking(move || {
        recognize_with_vad(&speech_dir, &samples_16k)
    })
    .await
    .map_err(|e| format!("识别任务执行失败: {}", e))?;

    result
}

/// VAD + SenseVoice 离线识别核心逻辑
fn recognize_with_vad(model_dir: &PathBuf, samples: &[f32]) -> Result<String, String> {
    let model_path = model_dir.join("model.int8.onnx");
    let tokens_path = model_dir.join("tokens.txt");
    let vad_path = model_dir.join("silero_vad.onnx");

    if !model_path.exists() || !tokens_path.exists() {
        return Err("ASR 模型文件不存在，请先在设置中下载".to_string());
    }

    // 创建 VAD（如果 VAD 模型存在）
    let use_vad = vad_path.exists();

    if use_vad {
        recognize_with_vad_internal(&model_path, &tokens_path, &vad_path, samples)
    } else {
        // 无 VAD，直接全段识别
        recognize_full_segment(&model_path, &tokens_path, samples)
    }
}

/// 使用 VAD 裁剪后识别
fn recognize_with_vad_internal(
    model_path: &PathBuf,
    tokens_path: &PathBuf,
    vad_path: &PathBuf,
    samples: &[f32],
) -> Result<String, String> {
    use sherpa_onnx::{OfflineRecognizer, OfflineRecognizerConfig, OfflineSenseVoiceModelConfig,
                      VoiceActivityDetector, VadModelConfig, SileroVadModelConfig};

    // 配置 VAD
    let vad_config = VadModelConfig {
        silero_vad: SileroVadModelConfig {
            model: Some(vad_path.to_string_lossy().to_string()),
            threshold: 0.5,
            min_silence_duration: 0.3,
            min_speech_duration: 0.25,
            max_speech_duration: 30.0,
            window_size: 512,
        },
        sample_rate: 16000,
        debug: false,
        ..Default::default()
    };

    let vad = VoiceActivityDetector::create(&vad_config, 60.0)
        .ok_or_else(|| "创建 VAD 失败".to_string())?;

    // 先用 VAD 处理音频，提取语音段
    let window_size = 512usize;
    let mut offset = 0;
    while offset + window_size <= samples.len() {
        vad.accept_waveform(&samples[offset..offset + window_size]);
        offset += window_size;
    }
    // 处理剩余样本
    if offset < samples.len() {
        let mut padded = samples[offset..].to_vec();
        padded.resize(window_size, 0.0);
        vad.accept_waveform(&padded);
    }
    // Flush VAD
    vad.flush();

    // 收集所有语音段
    let mut speech_segments: Vec<Vec<f32>> = Vec::new();
    while !vad.is_empty() {
        if let Some(segment) = vad.front() {
            speech_segments.push(segment.samples().to_vec());
            vad.pop();
        }
    }

    if speech_segments.is_empty() {
        // 如果 VAD 没有检测到语音，回退到全段识别
        println!("[Speech] VAD 未检测到语音，回退全段识别");
        return recognize_full_segment(model_path, tokens_path, samples);
    }

    println!("[Speech] VAD 检测到 {} 段语音", speech_segments.len());

    // 创建识别器
    let mut config = OfflineRecognizerConfig::default();
    config.model_config.sense_voice = OfflineSenseVoiceModelConfig {
        model: Some(model_path.to_string_lossy().to_string()),
        language: Some("auto".to_string()),
        use_itn: true,
    };
    config.model_config.tokens = Some(tokens_path.to_string_lossy().to_string());
    config.model_config.num_threads = 4;
    config.model_config.debug = false;

    let recognizer = OfflineRecognizer::create(&config)
        .ok_or_else(|| "创建识别器失败，请检查模型文件是否完整".to_string())?;

    // 对每段语音进行识别
    let mut results: Vec<String> = Vec::new();
    for segment_samples in &speech_segments {
        let stream = recognizer.create_stream();
        stream.accept_waveform(16000, segment_samples);
        recognizer.decode(&stream);
        if let Some(result) = stream.get_result() {
            let text = result.text.trim().to_string();
            if !text.is_empty() {
                results.push(text);
            }
        }
    }

    let final_text = results.join("");
    println!("[Speech] 识别结果: {}", final_text);
    Ok(final_text)
}

/// 全段识别（不使用 VAD）
fn recognize_full_segment(
    model_path: &PathBuf,
    tokens_path: &PathBuf,
    samples: &[f32],
) -> Result<String, String> {
    use sherpa_onnx::{OfflineRecognizer, OfflineRecognizerConfig, OfflineSenseVoiceModelConfig};

    let mut config = OfflineRecognizerConfig::default();
    config.model_config.sense_voice = OfflineSenseVoiceModelConfig {
        model: Some(model_path.to_string_lossy().to_string()),
        language: Some("auto".to_string()),
        use_itn: true,
    };
    config.model_config.tokens = Some(tokens_path.to_string_lossy().to_string());
    config.model_config.num_threads = 4;
    config.model_config.debug = false;

    let recognizer = OfflineRecognizer::create(&config)
        .ok_or_else(|| "创建识别器失败，请检查模型文件是否完整".to_string())?;

    let stream = recognizer.create_stream();
    stream.accept_waveform(16000, samples);
    recognizer.decode(&stream);

    if let Some(result) = stream.get_result() {
        let text = result.text.trim().to_string();
        println!("[Speech] 全段识别结果: {}", text);
        Ok(text)
    } else {
        Err("识别返回空结果".to_string())
    }
}

/// 下载语音模型文件到 speech-models 目录
#[tauri::command]
pub async fn download_speech_model(
    app: AppHandle,
    url: String,
    filename: String,
) -> Result<String, String> {
    let speech_dir = get_speech_model_dir(&app)?;
    let file_path = speech_dir.join(&filename);

    println!("[Speech] 下载模型: {} -> {:?}", filename, file_path);

    if file_path.exists() {
        println!("[Speech] 文件已存在: {:?}", file_path);
        return Ok(file_path.to_string_lossy().to_string());
    }

    // 复用下载逻辑（带进度事件）
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("下载失败，HTTP 状态: {}", res.status()));
    }

    let total_size = res.content_length();

    let mut file = tokio::fs::File::create(&file_path)
        .await
        .map_err(|e| format!("创建文件失败: {}", e))?;

    use tokio::io::AsyncWriteExt;
    use futures_util::StreamExt;
    use tauri::Emitter;

    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();
    let mut last_emit = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("下载数据块错误: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("写入文件错误: {}", e))?;
        downloaded += chunk.len() as u64;

        // 节流进度事件 (200ms 间隔)
        if last_emit.elapsed().as_millis() > 200 || downloaded == total_size.unwrap_or(0) {
            let _ = app.emit(
                "speech-model-download-progress",
                serde_json::json!({
                    "filename": filename,
                    "downloaded": downloaded,
                    "total": total_size
                }),
            );
            last_emit = std::time::Instant::now();
        }
    }

    println!("[Speech] 模型下载完成: {:?}", file_path);
    Ok(file_path.to_string_lossy().to_string())
}
