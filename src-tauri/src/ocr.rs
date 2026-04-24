use tauri::command;

#[cfg(target_os = "windows")]
use std::io::Cursor;
#[cfg(target_os = "windows")]
use windows::Graphics::Imaging::BitmapDecoder;
#[cfg(target_os = "windows")]
use windows::Media::Ocr::OcrEngine;
#[cfg(target_os = "windows")]
use windows::Storage::Streams::{InMemoryRandomAccessStream, DataWriter};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use xcap::Monitor;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::io::Cursor as XcapCursor;

/// 执行 OCR 识别的核心逻辑 (同步版本，用于 spawn_blocking)
#[cfg(target_os = "windows")]
fn perform_ocr_sync(data: Vec<u8>) -> Result<String, String> {
    // 创建随机访问流
    let stream = InMemoryRandomAccessStream::new().map_err(|e| format!("无法创建流: {:?}", e))?;
    let writer = DataWriter::CreateDataWriter(&stream).map_err(|e| format!("无法创建写入器: {:?}", e))?;
    writer.WriteBytes(&data).map_err(|e| format!("写入失败: {:?}", e))?;
    
    // 同步等待存储和刷新
    writer.StoreAsync().map_err(|e| format!("存储失败: {:?}", e))?.get().map_err(|e| format!("存储等待失败: {:?}", e))?;
    writer.FlushAsync().map_err(|e| format!("刷新失败: {:?}", e))?.get().map_err(|e| format!("刷新等待失败: {:?}", e))?;
    stream.Seek(0).map_err(|e| format!("重置流指针失败: {:?}", e))?;

    // 解码图像
    let decoder = BitmapDecoder::CreateAsync(&stream).map_err(|e| format!("创建解码器失败: {:?}", e))?.get().map_err(|e| format!("解码等待失败: {:?}", e))?;
    let software_bitmap = decoder.GetSoftwareBitmapAsync().map_err(|e| format!("获取位图失败: {:?}", e))?.get().map_err(|e| format!("位图等待失败: {:?}", e))?;

    // 尝试从用户语言创建引擎
    let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|e| format!("创建 OCR 引擎失败: {:?}", e))?;
    
    // 执行识别
    let result = engine.RecognizeAsync(&software_bitmap).map_err(|e| format!("识别失败: {:?}", e))?.get().map_err(|e| format!("识别等待失败: {:?}", e))?;
    
    let text = result.Text().map_err(|e| format!("获取文本失败: {:?}", e))?;
    Ok(text.to_string())
}

#[command]
pub async fn ocr_from_bytes(data: Vec<u8>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        tauri::async_runtime::spawn_blocking(move || {
            perform_ocr_sync(data)
        }).await.map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = data; // suppress unused warning
        Err("OCR 功能当前仅支持 Windows 平台".to_string())
    }
}

#[command]
pub async fn ocr_from_screen() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let bytes = {
            let monitor = Monitor::all().map_err(|e| e.to_string())?
                .into_iter()
                .next()
                .ok_or("找不到显示器")?;

            let image = monitor.capture_image().map_err(|e| e.to_string())?;
            let mut buffer = Cursor::new(Vec::new());
            image.write_to(&mut buffer, image::ImageFormat::Png).map_err(|e| e.to_string())?;
            buffer.into_inner()
        };
        
        tauri::async_runtime::spawn_blocking(move || {
            perform_ocr_sync(bytes)
        }).await.map_err(|e| e.to_string())?
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("屏幕 OCR 功能当前仅支持 Windows 平台".to_string())
    }
}

#[command]
pub async fn capture_main_screen() -> Result<Vec<u8>, String> {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let monitor = Monitor::all().map_err(|e| e.to_string())?
            .into_iter()
            .next()
            .ok_or("找不到显示器")?;

        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        
        let mut buffer = XcapCursor::new(Vec::new());
        image.write_to(&mut buffer, image::ImageFormat::Png).map_err(|e| e.to_string())?;
        Ok(buffer.into_inner())
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        Err("移动端暂不支持屏幕捕获".to_string())
    }
}
