use std::io::Cursor;
use tauri::command;
use windows::Graphics::Imaging::BitmapDecoder;
use windows::Media::Ocr::OcrEngine;
use windows::Storage::Streams::{InMemoryRandomAccessStream, DataWriter};
use xcap::Monitor;

/// 执行 OCR 识别的核心逻辑 (同步版本，用于 spawn_blocking)
fn perform_ocr_sync(data: Vec<u8>) -> Result<String, String> {
    // 确保 COM 已初始化 (WinRT 通常需要 MTA)
    // windows 库在调用时会自动处理一些初始化，但为了保险可以手动或依赖其错误处理
    
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
    tauri::async_runtime::spawn_blocking(move || {
        perform_ocr_sync(data)
    }).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn ocr_from_screen() -> Result<String, String> {
    // 在异步函数中获取图像数据，但不跨 Await 点持有非 Send 类型
    let bytes = {
        // 获取主显示器
        let monitor = Monitor::all().map_err(|e| e.to_string())?
            .into_iter()
            .next()
            .ok_or("找不到显示器")?;

        // 捕获全屏图像
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        
        // 转换为 PNG 字节流
        let mut buffer = Cursor::new(Vec::new());
        image.write_to(&mut buffer, image::ImageFormat::Png).map_err(|e| e.to_string())?;
        buffer.into_inner()
    };
    
    // 此时 monitor 已经超出作用域并被丢弃，bytes (Vec<u8>) 是 Send 的
    tauri::async_runtime::spawn_blocking(move || {
        perform_ocr_sync(bytes)
    }).await.map_err(|e| e.to_string())?
}

#[command]
pub async fn capture_main_screen() -> Result<Vec<u8>, String> {
    let monitor = Monitor::all().map_err(|e| e.to_string())?
        .into_iter()
        .next()
        .ok_or("找不到显示器")?;

    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    
    let mut buffer = Cursor::new(Vec::new());
    image.write_to(&mut buffer, image::ImageFormat::Png).map_err(|e| e.to_string())?;
    Ok(buffer.into_inner())
}
