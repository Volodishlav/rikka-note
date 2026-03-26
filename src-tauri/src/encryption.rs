use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::fs;
use std::sync::Mutex;

// 加密文件格式常量
const MAGIC: &[u8; 8] = b"RIKKAENC";
const VERSION: u8 = 0x01;
const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;
const HEADER_LEN: usize = 8 + 1 + SALT_LEN + NONCE_LEN; // 53 bytes
// 降低迭代次数以减少保存时的延迟（本地文件加密场景可接受）
const PBKDF2_ITERATIONS: u32 = 100_000;

/// 缓存的密钥信息
struct CachedKey {
    password_hash: [u8; 32], // 密码的 SHA-256，用于快速比较
    salt: [u8; SALT_LEN],
    key: [u8; 32],
}

/// 全局密钥缓存：相同密码只派生一次密钥
static KEY_CACHE: Mutex<Option<CachedKey>> = Mutex::new(None);

/// 计算密码的 SHA-256 哈希（仅用于缓存比较，不用于加密）
fn hash_password(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}

/// 从密码和 salt 派生 AES-256 密钥
fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    key
}

/// 获取或派生密钥（使用缓存加速）
fn get_or_derive_key(password: &str, salt: &[u8; SALT_LEN]) -> [u8; 32] {
    let pw_hash = hash_password(password);
    let mut cache = KEY_CACHE.lock().unwrap();

    // 缓存命中：密码和 salt 都匹配
    if let Some(ref cached) = *cache {
        if cached.password_hash == pw_hash && cached.salt == *salt {
            return cached.key;
        }
    }

    // 缓存未命中：派生新密钥并缓存
    let key = derive_key(password, salt);
    *cache = Some(CachedKey {
        password_hash: pw_hash,
        salt: *salt,
        key,
    });
    key
}

/// 加密文件：明文 → 密文覆盖写入
#[tauri::command]
pub fn encrypt_file(path: String, password: String) -> Result<(), String> {
    // 读取原始明文
    let plaintext = fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 尝试复用已缓存的 salt（同一密码复用，避免重新派生）
    let pw_hash = hash_password(&password);
    let salt = {
        let cache = KEY_CACHE.lock().unwrap();
        if let Some(ref cached) = *cache {
            if cached.password_hash == pw_hash {
                cached.salt // 复用缓存的 salt
            } else {
                let mut s = [0u8; SALT_LEN];
                OsRng.fill_bytes(&mut s);
                s
            }
        } else {
            let mut s = [0u8; SALT_LEN];
            OsRng.fill_bytes(&mut s);
            s
        }
    };

    // 每次加密都生成新的 nonce（AES-GCM 安全性要求）
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);

    // 获取密钥（缓存命中时几乎零开销）
    let key = get_or_derive_key(&password, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("加密失败: {}", e))?;

    // 组装加密文件：Magic + Version + Salt + Nonce + Ciphertext
    let mut output = Vec::with_capacity(HEADER_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC);
    output.push(VERSION);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    // 覆盖写入
    fs::write(&path, &output).map_err(|e| format!("写入加密文件失败: {}", e))?;

    Ok(())
}

/// 解密文件：读取密文 → 返回明文字符串
#[tauri::command]
pub fn decrypt_file(path: String, password: String) -> Result<String, String> {
    let data = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 验证文件头
    if data.len() < HEADER_LEN {
        return Err("文件太小，不是有效的加密文件".into());
    }
    if &data[0..8] != MAGIC {
        return Err("文件未加密或格式无效".into());
    }
    if data[8] != VERSION {
        return Err(format!("不支持的加密版本: {}", data[8]));
    }

    // 解析各段
    let mut salt = [0u8; SALT_LEN];
    salt.copy_from_slice(&data[9..9 + SALT_LEN]);
    let nonce_bytes = &data[9 + SALT_LEN..9 + SALT_LEN + NONCE_LEN];
    let ciphertext = &data[HEADER_LEN..];

    // 获取密钥（缓存命中时几乎零开销）
    let key = get_or_derive_key(&password, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext_bytes = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "解密失败：密码错误或文件已损坏".to_string())?;

    String::from_utf8(plaintext_bytes).map_err(|e| format!("解码明文失败: {}", e))
}

/// 检查文件是否已加密（读取 magic bytes）
#[tauri::command]
pub fn check_file_encrypted(path: String) -> Result<bool, String> {
    let data = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    Ok(data.len() >= 8 && &data[0..8] == MAGIC)
}

/// 验证密码是否正确（尝试解密）
#[tauri::command]
pub fn verify_password(path: String, password: String) -> Result<bool, String> {
    match decrypt_file(path, password) {
        Ok(_) => Ok(true),
        Err(e) if e.contains("密码错误") => Ok(false),
        Err(e) => Err(e),
    }
}

/// 用新密码重新加密文件
#[tauri::command]
pub fn re_encrypt_file(
    path: String,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    // 先用旧密码解密得到明文
    let plaintext = decrypt_file(path.clone(), old_password)?;

    // 清除旧的密钥缓存（密码变更）
    {
        let mut cache = KEY_CACHE.lock().unwrap();
        *cache = None;
    }

    // 将明文写回文件（临时恢复为明文）
    fs::write(&path, &plaintext).map_err(|e| format!("写入临时明文失败: {}", e))?;

    // 用新密码重新加密
    encrypt_file(path, new_password)
}
