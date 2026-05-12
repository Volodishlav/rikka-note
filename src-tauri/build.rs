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
    // 这里我们选择总是尝试查找并更新，以防版本变化
    if let Some(src_path) = find_dll(dll_name) {
        println!("cargo:warning=Found {} at {:?}", dll_name, src_path);
        fs::copy(&src_path, &dest_path).expect("复制 DLL 失败");
        println!("cargo:warning=Successfully copied DLL to {:?}", dest_path);
    } else {
        println!("cargo:warning=Warning: Could not find {}. This might cause runtime errors in the bundled app.", dll_name);
    }
}

#[cfg(target_os = "windows")]
fn find_dll(name: &str) -> Option<PathBuf> {
    // 搜索路径优先级：
    
    // 1. 基于 OUT_DIR 逆向推导 (最可靠，支持自定义 target 路径)
    // OUT_DIR 通常在 .../target/release/build/rikka-note-xxxx/out
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let out_path = Path::new(&out_dir);
        let mut current = out_path;
        while let Some(parent) = current.parent() {
            // 查找名为 release 或 debug 的父目录
            if parent.ends_with("release") || parent.ends_with("debug") {
                let path = parent.join(name);
                if path.exists() {
                    return Some(path);
                }
                // 某些情况下可能在 build 目录下
                let build_path = parent.join("build");
                if build_path.exists() {
                     // 递归查找 build 目录 (限制深度)
                     if let Some(p) = find_in_dir(&build_path, name, 3) {
                         return Some(p);
                     }
                }
                break;
            }
            current = parent;
        }
    }

    // 2. 尝试环境变量 CARGO_TARGET_DIR
    if let Ok(target_dir) = std::env::var("CARGO_TARGET_DIR") {
        let base = Path::new(&target_dir);
        for mode in &["release", "debug"] {
            let path = base.join(mode).join(name);
            if path.exists() {
                return Some(path);
            }
        }
    }

    // 3. 尝试在项目根目录的 target 下查找 (默认路径)
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let project_root = Path::new(&manifest_dir);
    let target_dirs = vec![
        project_root.join("target").join("release"),
        project_root.join("target").join("debug"),
        project_root.join("..").join("target").join("release"),
        project_root.join("..").join("target").join("debug"),
    ];
    for dir in target_dirs {
        let path = dir.join(name);
        if path.exists() {
            return Some(path);
        }
    }

    // 4. 尝试在 Cargo Registry 中查找 (GitHub Actions 兜底)
    if let Ok(home) = std::env::var("USERPROFILE") {
        let registry_src = Path::new(&home).join(".cargo").join("registry").join("src");
        if registry_src.exists() {
            if let Ok(entries) = fs::read_dir(&registry_src) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        if let Ok(sub_entries) = fs::read_dir(&path) {
                            for sub_entry in sub_entries.flatten() {
                                let sub_path = sub_entry.path();
                                if sub_path.is_dir() && sub_path.to_string_lossy().contains("sherpa-onnx-sys") {
                                    let dll_path = sub_path.join("sherpa-onnx").join("lib").join("x86_64-pc-windows-msvc").join(name);
                                    if dll_path.exists() {
                                        return Some(dll_path);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

#[cfg(target_os = "windows")]
fn find_in_dir(dir: &Path, name: &str, depth: u8) -> Option<PathBuf> {
    if depth == 0 { return None; }
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.file_name().and_then(|s| s.to_str()) == Some(name) {
                return Some(path);
            } else if path.is_dir() {
                if let Some(p) = find_in_dir(&path, name, depth - 1) {
                    return Some(p);
                }
            }
        }
    }
    None
}

