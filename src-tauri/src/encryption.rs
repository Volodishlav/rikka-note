use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use std::fs;
use std::sync::Mutex;
use zeroize::{Zeroize, Zeroizing};

// ======== 常量 ========

// YAML Frontmatter 标记
const FRONTMATTER_MARKER: &str = "---";
const ENCRYPTED_FLAG: &str = "rikka_encrypted: true";
const VERSION_TAG: &str = "version: 3";

// DEK 密钥文件格式（二进制，存储被 KEK 加密的全局 DEK）
const KEY_FILE_SALT_LEN: usize = 32;
const KEY_FILE_NONCE_LEN: usize = 24;
const DEK_LEN: usize = 32;
// 密钥文件 = salt(32) + nonce(24) + encrypted_dek(32 + 16 tag = 48) = 104 bytes

// XChaCha20 nonce 长度
const NONCE_LEN: usize = 24;

// Argon2id 参数（仅在密码操作时使用，日常笔记加解密不涉及）
const ARGON2_M_COST: u32 = 32_768; // 32 MB 内存
const ARGON2_T_COST: u32 = 2;      // 2 次迭代
const ARGON2_P_COST: u32 = 4;      // 4 线程并行

// ======== 后端密钥托管状态（zeroize 保护） ========

/// 全局 DEK 托管：解锁后在内存中持有 DEK，锁定时自动安全清零
static GLOBAL_DEK: Mutex<Option<Zeroizing<[u8; DEK_LEN]>>> = Mutex::new(None);

// ======== 内部工具函数 ========

/// 使用 Argon2id 从密码 + salt 派生 KEK（返回自动清零的密钥）
fn derive_kek(password: &str, salt: &[u8]) -> Result<Zeroizing<[u8; 32]>, String> {
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        argon2::Params::new(ARGON2_M_COST, ARGON2_T_COST, ARGON2_P_COST, Some(32))
            .map_err(|e| format!("Argon2 参数错误: {}", e))?,
    );
    let mut kek = Zeroizing::new([0u8; 32]);
    argon2
        .hash_password_into(password.as_bytes(), salt, kek.as_mut())
        .map_err(|e| format!("Argon2 密钥派生失败: {}", e))?;
    Ok(kek)
}

/// 获取当前托管的 DEK 明文副本（用于加解密操作，离开作用域自动清零）
fn get_dek() -> Result<Zeroizing<[u8; DEK_LEN]>, String> {
    let guard = GLOBAL_DEK.lock().unwrap();
    match guard.as_ref() {
        Some(dek) => Ok(Zeroizing::new(**dek)),
        None => Err("加密未解锁，请先输入密码".to_string()),
    }
}

/// 将笔记内容序列化为 YAML Frontmatter + Base64 格式
fn serialize_encrypted_note(nonce: &[u8], ciphertext: &[u8]) -> String {
    let nonce_b64 = BASE64.encode(nonce);
    let cipher_b64 = BASE64.encode(ciphertext);
    format!(
        "{fm}\n{flag}\n{ver}\nnonce: \"{nonce}\"\n{fm}\n{body}",
        fm = FRONTMATTER_MARKER,
        flag = ENCRYPTED_FLAG,
        ver = VERSION_TAG,
        nonce = nonce_b64,
        body = cipher_b64,
    )
}

/// 从 YAML Frontmatter + Base64 格式解析加密笔记
fn deserialize_encrypted_note(content: &str) -> Result<(Vec<u8>, Vec<u8>), String> {
    let content = content.trim();

    // 检查以 --- 开头
    if !content.starts_with(FRONTMATTER_MARKER) {
        return Err("文件未加密或格式无效".into());
    }

    // 跳过第一个 --- 和紧跟的换行符，找到 frontmatter 内容
    let after_first = content[3..].trim_start_matches(['\n', '\r']);

    // 找到结束标记 \n---（第二个 ---）
    let end_idx = after_first.find("\n---")
        .or_else(|| after_first.find("\r\n---"))
        .ok_or("加密文件格式无效：缺少 frontmatter 结束标记")?;

    let frontmatter = &after_first[..end_idx];

    // 跳过 \n---\n 或 \r\n---\r\n 获取 body
    let after_closing = &after_first[end_idx..];
    // 跳过 "\n---" (4字节) 或 "\r\n---" (5字节)
    let skip_len = if after_closing.starts_with("\r\n---") { 5 } else { 4 };
    let body = after_closing[skip_len..].trim();

    // 检查 rikka_encrypted 标记
    if !frontmatter.contains(ENCRYPTED_FLAG) {
        return Err("文件不是 Rikka 加密文件".into());
    }

    // 提取 nonce
    let nonce_line = frontmatter.lines()
        .find(|l| l.trim().starts_with("nonce:"))
        .ok_or("加密文件格式无效：缺少 nonce")?;
    let nonce_b64 = nonce_line.trim()
        .trim_start_matches("nonce:")
        .trim()
        .trim_matches('"');
    let nonce = BASE64.decode(nonce_b64)
        .map_err(|e| format!("nonce Base64 解码失败: {}", e))?;

    // 解码密文
    let ciphertext = BASE64.decode(body)
        .map_err(|e| format!("密文 Base64 解码失败: {}", e))?;

    Ok((nonce, ciphertext))
}

// ======== Tauri 命令：密钥管理 ========

/// 首次设置加密密码
#[tauri::command]
pub fn setup_encryption(password: String, key_file_path: String) -> Result<(), String> {
    // 生成随机 DEK（Zeroizing 保护）
    let mut dek = Zeroizing::new([0u8; DEK_LEN]);
    OsRng.fill_bytes(dek.as_mut());

    // 生成 salt 并派生 KEK
    let mut salt = [0u8; KEY_FILE_SALT_LEN];
    OsRng.fill_bytes(&mut salt);
    let kek = derive_kek(&password, &salt)?;

    // 用 KEK 加密 DEK
    let mut nonce_bytes = [0u8; KEY_FILE_NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let cipher = XChaCha20Poly1305::new_from_slice(kek.as_ref())
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(&nonce_bytes);
    let encrypted_dek = cipher.encrypt(nonce, dek.as_ref() as &[u8])
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
    *guard = Some(Zeroizing::new(*dek));

    Ok(())
}

/// 解锁加密：验证密码并将 DEK 加载到内存
#[tauri::command]
pub fn unlock_encryption(password: String, key_file_path: String) -> Result<(), String> {
    let key_data = fs::read(&key_file_path).map_err(|e| format!("读取密钥文件失败: {}", e))?;

    let expected_len = KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN + DEK_LEN + 16;
    if key_data.len() != expected_len {
        return Err(format!("密钥文件格式无效（长度 {} != {}）", key_data.len(), expected_len));
    }

    let salt = &key_data[..KEY_FILE_SALT_LEN];
    let nonce_bytes = &key_data[KEY_FILE_SALT_LEN..KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN];
    let encrypted_dek = &key_data[KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN..];

    // 派生 KEK 并解密 DEK（KEK 离开作用域自动清零）
    let kek = derive_kek(&password, salt)?;
    let cipher = XChaCha20Poly1305::new_from_slice(kek.as_ref())
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(nonce_bytes);
    let mut dek_bytes = Zeroizing::new(
        cipher.decrypt(nonce, encrypted_dek)
            .map_err(|_| "密码错误".to_string())?
    );

    // 将 DEK 保持在内存中
    let mut dek = Zeroizing::new([0u8; DEK_LEN]);
    dek.copy_from_slice(&dek_bytes);
    dek_bytes.zeroize();

    let mut guard = GLOBAL_DEK.lock().unwrap();
    *guard = Some(dek);

    Ok(())
}

/// 锁定加密：释放 DEK，Zeroizing 自动安全清零
#[tauri::command]
pub fn lock_encryption() -> Result<(), String> {
    let mut guard = GLOBAL_DEK.lock().unwrap();
    // 设置为 None 时，Zeroizing 包装器自动将内存清零
    *guard = None;
    Ok(())
}

/// 检查是否已解锁
#[tauri::command]
pub fn is_encryption_unlocked() -> bool {
    let guard = GLOBAL_DEK.lock().unwrap();
    guard.is_some()
}

/// 修改密码：O(1) 操作，只重新加密 DEK
#[tauri::command]
pub fn change_encryption_password(
    old_password: String,
    new_password: String,
    key_file_path: String,
) -> Result<(), String> {
    let key_data = fs::read(&key_file_path).map_err(|e| format!("读取密钥文件失败: {}", e))?;

    let expected_len = KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN + DEK_LEN + 16;
    if key_data.len() != expected_len {
        return Err("密钥文件格式无效".into());
    }

    let old_salt = &key_data[..KEY_FILE_SALT_LEN];
    let old_nonce = &key_data[KEY_FILE_SALT_LEN..KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN];
    let encrypted_dek = &key_data[KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN..];

    // 用旧密码解密 DEK（KEK/DEK 都用 Zeroizing 保护）
    let old_kek = derive_kek(&old_password, old_salt)?;
    let old_cipher = XChaCha20Poly1305::new_from_slice(old_kek.as_ref())
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let dek_bytes = Zeroizing::new(
        old_cipher.decrypt(XNonce::from_slice(old_nonce), encrypted_dek)
            .map_err(|_| "原密码错误".to_string())?
    );

    // 用新密码重新加密 DEK
    let mut new_salt = [0u8; KEY_FILE_SALT_LEN];
    OsRng.fill_bytes(&mut new_salt);
    let new_kek = derive_kek(&new_password, &new_salt)?;

    let mut new_nonce_bytes = [0u8; KEY_FILE_NONCE_LEN];
    OsRng.fill_bytes(&mut new_nonce_bytes);
    let new_cipher = XChaCha20Poly1305::new_from_slice(new_kek.as_ref())
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let new_encrypted_dek = new_cipher.encrypt(
        XNonce::from_slice(&new_nonce_bytes),
        dek_bytes.as_ref() as &[u8],
    ).map_err(|e| format!("加密 DEK 失败: {}", e))?;

    // 写回密钥文件
    let mut new_key_data = Vec::with_capacity(KEY_FILE_SALT_LEN + KEY_FILE_NONCE_LEN + new_encrypted_dek.len());
    new_key_data.extend_from_slice(&new_salt);
    new_key_data.extend_from_slice(&new_nonce_bytes);
    new_key_data.extend_from_slice(&new_encrypted_dek);
    fs::write(&key_file_path, &new_key_data).map_err(|e| format!("写入密钥文件失败: {}", e))?;

    Ok(())
}

// ======== Tauri 命令：笔记加解密（YAML Frontmatter 格式） ========

/// 加密笔记文件（YAML Frontmatter + Base64 格式）
#[tauri::command]
pub fn encrypt_file(path: String) -> Result<(), String> {
    let dek = get_dek()?;

    let plaintext = fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 每次加密使用新的 24 字节随机 nonce
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);

    // 用 DEK 直接加密
    let cipher = XChaCha20Poly1305::new_from_slice(dek.as_ref())
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("加密失败: {}", e))?;

    // 序列化为 YAML Frontmatter + Base64 格式
    let output = serialize_encrypted_note(&nonce_bytes, &ciphertext);
    fs::write(&path, output.as_bytes()).map_err(|e| format!("写入加密文件失败: {}", e))?;

    Ok(())
}

/// 解密笔记文件
#[tauri::command]
pub fn decrypt_file(path: String) -> Result<String, String> {
    let dek = get_dek()?;

    let content = fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let (nonce_bytes, ciphertext) = deserialize_encrypted_note(&content)?;

    if nonce_bytes.len() != NONCE_LEN {
        return Err(format!("nonce 长度无效: {} != {}", nonce_bytes.len(), NONCE_LEN));
    }

    let cipher = XChaCha20Poly1305::new_from_slice(dek.as_ref())
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(&nonce_bytes);
    let plaintext_bytes = cipher.decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "解密失败：密钥不匹配或文件已损坏".to_string())?;

    String::from_utf8(plaintext_bytes).map_err(|e| format!("解码明文失败: {}", e))
}

/// 检查文件是否已加密（检测 YAML Frontmatter 标记）
#[tauri::command]
pub fn check_file_encrypted(path: String) -> Result<bool, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let trimmed = content.trim();
    // 检查是否以 --- 开头且包含 rikka_encrypted: true
    Ok(trimmed.starts_with(FRONTMATTER_MARKER) && trimmed.contains(ENCRYPTED_FLAG))
}
