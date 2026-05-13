use std::path::{Path, PathBuf};
use std::fs;

fn main() {
    // 1. Windows 平台特有的 DLL 自动补全逻辑
    // 必须在 tauri_build::build() 之前运行，否则 Tauri 会因为找不到资源文件而报错
    #[cfg(target_os = "windows")]
    {
        copy_sherpa_dlls();
    }

    // 2. 执行 Tauri 默认构建流程
    tauri_build::build();
}

#[cfg(target_os = "windows")]
fn copy_sherpa_dlls() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let src_tauri = Path::new(&manifest_dir);
    let dest_dir = src_tauri.join("bin").join("win64");

    // 确保目标目录存在
    if !dest_dir.exists() {
        fs::create_dir_all(&dest_dir).expect("无法创建 bin/win64 目录");
    }

    let dll_name = "sherpa-onnx-c-api.dll";
    let dest_path = dest_dir.join(dll_name);

    // 如果 DLL 已经存在，可以跳过（或者强制更新）
    if let Some(src_path) = find_dll(dll_name) {
        println!("cargo:warning=Found {} at {:?}", dll_name, src_path);
        if src_path != dest_path {
            match fs::copy(&src_path, &dest_path) {
                Ok(_) => println!("cargo:warning=Successfully copied DLL to {:?}", dest_path),
                Err(e) => {
                    // 如果文件被占用（Os Error 32），在 CI 环境下通常不影响打包，因为资源已经存在于 bin/win64
                    println!("cargo:warning=Notice: Could not copy DLL to target directory (it might be in use): {}", e);
                    println!("cargo:warning=This is expected on Windows during concurrent builds and usually doesn't affect bundling.");
                }
            }
        }
    } else {
        println!("cargo:warning=Warning: Could not find {}. This might cause runtime errors in the bundled app.", dll_name);
    }
}

#[cfg(target_os = "windows")]
fn find_dll(name: &str) -> Option<PathBuf> {
    println!("cargo:warning=Searching for DLL: {}", name);
    
    // 1. 优先检查项目中的 bin/win64 目录 (CI 下载的 DLL 会在这里)
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let bin_dir = Path::new(&manifest_dir).join("bin").join("win64");
    let local_path = bin_dir.join(name);
    if local_path.exists() {
        println!("cargo:warning=Found DLL in local bin directory: {:?}", local_path);
        return Some(local_path);
    }

    // 2. 检查输出目录 (OUT_DIR) 的同级 release 目录 (本地编译产物)
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let out_path = Path::new(&out_dir);
        let mut current = out_path;
        while let Some(parent) = current.parent() {
            if parent.ends_with("release") || parent.ends_with("debug") {
                let path = parent.join(name);
                if path.exists() {
                    return Some(path);
                }
                break;
            }
            current = parent;
        }
    }

    println!("cargo:warning=DLL {} not found in common locations.", name);
    None
}

