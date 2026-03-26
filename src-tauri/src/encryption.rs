use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use argon2::Argon2;
use rand::RngCore;
use std::fs;
use std::sync::Mutex;

// ======== 常量 ========

// 加密笔记文件格式
const MAGIC: &[u8; 8] = b"RIKKAENC";
const VERSION: u8 = 0x03; // v3: 信封加密，笔记使用 DEK 直接加密
const NONCE_LEN: usize = 24;
const NOTE_HEADER_LEN: usize = 8 + 1 + NONCE_LEN; // 33 bytes: magic + version + nonce

// DEK 密钥文件格式（存储被 KEK 加密的全局 DEK）
const KEY_FILE_SALT_LEN: usize = 32;
const KEY_FILE_NONCE_LEN: usize = 24;
const DEK_LEN: usize = 32;
// 密钥文件 = salt(32) + nonce(24) + encrypted_dek(32 + 16 tag = 48) = 104 bytes

// Argon2id 参数（仅在密码操作时使用，日常笔记加解密不涉及）
const ARGON2_M_COST: u32 = 32_768; // 32 MB 内存
const ARGON2_T_COST: u32 = 2;      // 2 次迭代
const ARGON2_P_COST: u32 = 4;      // 4 线程并行

// ======== 后端密钥托管状态 ========

/// 全局 DEK 托管：解锁后在内存中持有 DEK，锁定时清除
static GLOBAL_DEK: Mutex<Option<[u8; DEK_LEN]>> = Mutex::new(None);

// ======== 内部工具函数 ========

/// 使用 Argon2id 从密码 + salt 派生 KEK
fn derive_kek(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        argon2::Params::new(ARGON2_M_COST, ARGON2_T_COST, ARGON2_P_COST, Some(32))
            .map_err(|e| format!("Argon2 参数错误: {}", e))?,
    );
    let mut kek = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut kek)
        .map_err(|e| format!("Argon2 密钥派生失败: {}", e))?;
    Ok(kek)
}

/// 获取当前托管的 DEK，未解锁时返回错误
fn get_dek() -> Result<[u8; DEK_LEN], String> {
    let guard = GLOBAL_DEK.lock().unwrap();
    guard.ok_or_else(|| "加密未解锁，请先输入密码".to_string())
}

// ======== Tauri 命令：密钥管理 ========

/// 首次设置加密密码
/// - 生成随机 DEK
/// - 用密码派生 KEK 加密 DEK
/// - 存储加密后的 DEK 到密钥文件
/// - 将 DEK 保持在内存中（自动解锁）
#[tauri::command]
pub fn setup_encryption(password: String, key_file_path: String) -> Result<(), String> {
    // 生成随机 DEK
    let mut dek = [0u8; DEK_LEN];
    OsRng.fill_bytes(&mut dek);

    // 生成 salt 并派生 KEK
    let mut salt = [0u8; KEY_FILE_SALT_LEN];
    OsRng.fill_bytes(&mut salt);
    let kek = derive_kek(&password, &salt)?;

    // 用 KEK 加密 DEK
    let mut nonce_bytes = [0u8; KEY_FILE_NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let cipher = XChaCha20Poly1305::new_from_slice(&kek)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(&nonce_bytes);
    let encrypted_dek = cipher.encrypt(nonce, dek.as_ref())
        .map_err(|e| format!("加密 DEK 失败: {}", e))?;

    // 写入密钥文件：salt + nonce + encrypted_dek
    let mut key_data = Vec::with_capacity(KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN + encrypted_dek.len());
    key_data.extend_from_slice(&salt);
    key_data.extend_from_slice(&nonce_bytes);
    key_data.extend_from_slice(&encrypted_dek);

    // 确保密钥文件的父目录存在
    let key_path = std::path::Path::new(&key_file_path);
    if let Some(parent) = key_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| {
                format!("创建目录失败 (路径: {}): {}", parent.display(), e)
            })?;
        }
    }
    fs::write(&key_file_path, &key_data).map_err(|e| {
        format!("写入密钥文件失败 (路径: {}): {}", key_file_path, e)
    })?;

    // 自动解锁：将 DEK 保持在内存中
    let mut guard = GLOBAL_DEK.lock().unwrap();
    *guard = Some(dek);

    Ok(())
}

/// 解锁加密：验证密码并将 DEK 加载到内存
#[tauri::command]
pub fn unlock_encryption(password: String, key_file_path: String) -> Result<(), String> {
    // 读取密钥文件
    let key_data = fs::read(&key_file_path).map_err(|e| format!("读取密钥文件失败: {}", e))?;

    let expected_len = KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN + DEK_LEN + 16; // 16 = Poly1305 tag
    if key_data.len() != expected_len {
        return Err(format!("密钥文件格式无效（长度 {} != {}）", key_data.len(), expected_len));
    }

    // 解析各段
    let salt = &key_data[..KEY_FILE_SALT_LEN];
    let nonce_bytes = &key_data[KEY_FILE_SALT_LEN..KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN];
    let encrypted_dek = &key_data[KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN..];

    // 派生 KEK 并解密 DEK
    let kek = derive_kek(&password, salt)?;
    let cipher = XChaCha20Poly1305::new_from_slice(&kek)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(nonce_bytes);
    let dek_bytes = cipher.decrypt(nonce, encrypted_dek)
        .map_err(|_| "密码错误".to_string())?;

    // 将 DEK 保持在内存中
    let mut dek = [0u8; DEK_LEN];
    dek.copy_from_slice(&dek_bytes);
    let mut guard = GLOBAL_DEK.lock().unwrap();
    *guard = Some(dek);

    Ok(())
}

/// 锁定加密：清除内存中的 DEK
#[tauri::command]
pub fn lock_encryption() -> Result<(), String> {
    let mut guard = GLOBAL_DEK.lock().unwrap();
    // 安全清零
    if let Some(ref mut dek) = *guard {
        dek.fill(0);
    }
    *guard = None;
    Ok(())
}

/// 检查是否已解锁
#[tauri::command]
pub fn is_encryption_unlocked() -> bool {
    let guard = GLOBAL_DEK.lock().unwrap();
    guard.is_some()
}

/// 修改密码：O(1) 操作，只重新加密 DEK，不触碰笔记文件
#[tauri::command]
pub fn change_encryption_password(
    old_password: String,
    new_password: String,
    key_file_path: String,
) -> Result<(), String> {
    // 先用旧密码解锁获取 DEK
    let key_data = fs::read(&key_file_path).map_err(|e| format!("读取密钥文件失败: {}", e))?;

    let expected_len = KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN + DEK_LEN + 16;
    if key_data.len() != expected_len {
        return Err("密钥文件格式无效".into());
    }

    let old_salt = &key_data[..KEY_FILE_SALT_LEN];
    let old_nonce = &key_data[KEY_FILE_SALT_LEN..KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN];
    let encrypted_dek = &key_data[KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN..];

    // 用旧密码解密 DEK
    let old_kek = derive_kek(&old_password, old_salt)?;
    let old_cipher = XChaCha20Poly1305::new_from_slice(&old_kek)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let dek_bytes = old_cipher.decrypt(XNonce::from_slice(old_nonce), encrypted_dek)
        .map_err(|_| "原密码错误".to_string())?;

    // 用新密码重新加密 DEK
    let mut new_salt = [0u8; KEY_FILE_SALT_LEN];
    OsRng.fill_bytes(&mut new_salt);
    let new_kek = derive_kek(&new_password, &new_salt)?;

    let mut new_nonce_bytes = [0u8; KEY_FILE_NONCE_LEN];
    OsRng.fill_bytes(&mut new_nonce_bytes);
    let new_cipher = XChaCha20Poly1305::new_from_slice(&new_kek)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let new_encrypted_dek = new_cipher.encrypt(XNonce::from_slice(&new_nonce_bytes), dek_bytes.as_ref())
        .map_err(|e| format!("加密 DEK 失败: {}", e))?;

    // 写回密钥文件
    let mut new_key_data = Vec::with_capacity(KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN + new_encrypted_dek.len());
    new_key_data.extend_from_slice(&new_salt);
    new_key_data.extend_from_slice(&new_nonce_bytes);
    new_key_data.extend_from_slice(&new_encrypted_dek);
    fs::write(&key_file_path, &new_key_data).map_err(|e| format!("写入密钥文件失败: {}", e))?;

    Ok(())
}

// ======== Tauri 命令：笔记加解密 ========

/// 加密笔记文件（使用内存中的 DEK，无需传递密码）
#[tauri::command]
pub fn encrypt_file(path: String) -> Result<(), String> {
    let dek = get_dek()?;

    // 读取明文
    let plaintext = fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 每次加密使用新的 24 字节随机 nonce
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);

    // 用 DEK 直接加密（无需密钥派生，瞬间完成）
    let cipher = XChaCha20Poly1305::new_from_slice(&dek)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("加密失败: {}", e))?;

    // 写入加密文件：Magic + Version + Nonce + Ciphertext
    let mut output = Vec::with_capacity(NOTE_HEADER_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC);
    output.push(VERSION);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    fs::write(&path, &output).map_err(|e| format!("写入加密文件失败: {}", e))?;

    Ok(())
}

/// 解密笔记文件（使用内存中的 DEK，无需传递密码）
#[tauri::command]
pub fn decrypt_file(path: String) -> Result<String, String> {
    let dek = get_dek()?;

    let data = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 验证文件头
    if data.len() < NOTE_HEADER_LEN {
        return Err("文件太小，不是有效的加密文件".into());
    }
    if &data[0..8] != MAGIC {
        return Err("文件未加密或格式无效".into());
    }
    if data[8] != VERSION {
        return Err(format!("不支持的加密版本: {}", data[8]));
    }

    // 解析 nonce 和密文
    let nonce_bytes = &data[9..9 + NONCE_LEN];
    let ciphertext = &data[NOTE_HEADER_LEN..];

    // 用 DEK 直接解密
    let cipher = XChaCha20Poly1305::new_from_slice(&dek)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(nonce_bytes);
    let plaintext_bytes = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| "解密失败：密钥不匹配或文件已损坏".to_string())?;

    String::from_utf8(plaintext_bytes).map_err(|e| format!("解码明文失败: {}", e))
}

/// 检查文件是否已加密
#[tauri::command]
pub fn check_file_encrypted(path: String) -> Result<bool, String> {
    let data = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    Ok(data.len() >= 8 && &data[0..8] == MAGIC)
}
