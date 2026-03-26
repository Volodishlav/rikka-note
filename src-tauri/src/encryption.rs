use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use argon2::Argon2;
use rand::RngCore;
use std::fs;
use std::sync::Mutex;

// 加密文件格式常量
const MAGIC: &[u8; 8] = b"RIKKAENC";
const VERSION: u8 = 0x02; // v2: XChaCha20-Poly1305 + Argon2id
const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 24; // XChaCha20 使用 24 字节 nonce
const HEADER_LEN: usize = 8 + 1 + SALT_LEN + NONCE_LEN; // 65 bytes

// Argon2id 参数（平衡安全性和性能）
const ARGON2_M_COST: u32 = 32_768; // 32 MB 内存
const ARGON2_T_COST: u32 = 2;      // 2 次迭代
const ARGON2_P_COST: u32 = 4;      // 4 线程并行

/// 缓存的密钥信息
struct CachedKey {
    /// 密码原始字节的简单哈希，用于快速比较是否同一密码
    password_tag: [u8; 32],
    salt: [u8; SALT_LEN],
    key: [u8; 32],
}

/// 全局密钥缓存：相同密码 + salt 只派生一次密钥
static KEY_CACHE: Mutex<Option<CachedKey>> = Mutex::new(None);

/// 简单的密码标签（用于缓存比较，非安全用途）
fn password_tag(password: &str) -> [u8; 32] {
    // 用简单的填充/截断方式生成固定长度标签，仅用于缓存键比较
    let bytes = password.as_bytes();
    let mut tag = [0u8; 32];
    for (i, &b) in bytes.iter().enumerate() {
        tag[i % 32] ^= b;
        tag[(i + 7) % 32] = tag[(i + 7) % 32].wrapping_add(b);
    }
    tag
}

/// 使用 Argon2id 从密码和 salt 派生 256-bit 密钥
fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        argon2::Params::new(ARGON2_M_COST, ARGON2_T_COST, ARGON2_P_COST, Some(32))
            .map_err(|e| format!("Argon2 参数错误: {}", e))?,
    );
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Argon2 密钥派生失败: {}", e))?;
    Ok(key)
}

/// 获取或派生密钥（使用缓存加速）
fn get_or_derive_key(password: &str, salt: &[u8; SALT_LEN]) -> Result<[u8; 32], String> {
    let tag = password_tag(password);
    let mut cache = KEY_CACHE.lock().unwrap();

    // 缓存命中：密码和 salt 都匹配
    if let Some(ref cached) = *cache {
        if cached.password_tag == tag && cached.salt == *salt {
            return Ok(cached.key);
        }
    }

    // 缓存未命中：派生新密钥并缓存
    let key = derive_key(password, salt)?;
    *cache = Some(CachedKey {
        password_tag: tag,
        salt: *salt,
        key,
    });
    Ok(key)
}

/// 加密文件：明文 → 密文覆盖写入
#[tauri::command]
pub fn encrypt_file(path: String, password: String) -> Result<(), String> {
    // 读取原始明文
    let plaintext = fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 尝试复用已缓存的 salt（同一密码复用，避免重新派生）
    let tag = password_tag(&password);
    let salt = {
        let cache = KEY_CACHE.lock().unwrap();
        if let Some(ref cached) = *cache {
            if cached.password_tag == tag {
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

    // 每次加密都生成新的 24 字节 nonce（XChaCha20 的扩展 nonce 极大降低碰撞概率）
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);

    // 获取密钥（缓存命中时零开销）
    let key = get_or_derive_key(&password, &salt)?;
    let cipher = XChaCha20Poly1305::new_from_slice(&key)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(&nonce_bytes);
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

    // 获取密钥（缓存命中时零开销）
    let key = get_or_derive_key(&password, &salt)?;
    let cipher = XChaCha20Poly1305::new_from_slice(&key)
        .map_err(|e| format!("创建密码器失败: {}", e))?;
    let nonce = XNonce::from_slice(nonce_bytes);
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
