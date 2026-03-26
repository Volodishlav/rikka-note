// encryption.ts - 加密功能状态管理
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { getAbsoluteFilePath } from '@/lib/workspace'

export const useEncryptionStore = defineStore('encryption', () => {
    // -------- 状态 --------
    // 会话级密码缓存（仅在内存中，不持久化）
    const sessionPassword = ref<string | null>(null)
    // 当前已知的加密文件相对路径集合
    const encryptedFiles = ref<Set<string>>(new Set())
    // 是否已设置过加密密码
    const isPasswordSet = ref(false)

    // -------- 初始化 --------
    async function initEncryption() {
        const saved = await tauriGet<boolean>('encryptionPasswordSet')
        isPasswordSet.value = saved ?? false
    }

    // -------- 密码管理 --------
    function setSessionPassword(password: string) {
        sessionPassword.value = password
    }

    function clearSessionPassword() {
        sessionPassword.value = null
    }

    function hasSessionPassword(): boolean {
        return sessionPassword.value !== null
    }

    /** 首次设置加密密码（标记已设置） */
    async function markPasswordSet() {
        isPasswordSet.value = true
        await tauriSet('encryptionPasswordSet', true)
    }

    // -------- 加密操作 --------

    /** 加密指定笔记 */
    async function encryptNote(relativePath: string, password: string): Promise<void> {
        const absPath = await getAbsoluteFilePath(relativePath)
        await invoke('encrypt_file', { path: absPath, password })
        encryptedFiles.value.add(relativePath)
        // 标记已设置密码
        if (!isPasswordSet.value) {
            await markPasswordSet()
        }
        // 缓存密码到会话
        sessionPassword.value = password
    }

    /** 永久解除加密（恢复为明文文件） */
    async function removeEncryption(relativePath: string, password: string): Promise<string> {
        const absPath = await getAbsoluteFilePath(relativePath)
        // 解密获取明文
        const plaintext: string = await invoke('decrypt_file', { path: absPath, password })
        // 用明文覆盖写回文件（通过 Tauri fs plugin）
        const { writeTextFile } = await import('@tauri-apps/plugin-fs')
        await writeTextFile(absPath, plaintext)
        encryptedFiles.value.delete(relativePath)
        return plaintext
    }

    /** 读取加密笔记内容（不改变文件状态） */
    async function readEncryptedNote(relativePath: string, password: string): Promise<string> {
        const absPath = await getAbsoluteFilePath(relativePath)
        return await invoke('decrypt_file', { path: absPath, password })
    }

    /** 检查文件是否已加密 */
    async function checkFileEncrypted(relativePath: string): Promise<boolean> {
        const absPath = await getAbsoluteFilePath(relativePath)
        const result: boolean = await invoke('check_file_encrypted', { path: absPath })
        if (result) {
            encryptedFiles.value.add(relativePath)
        } else {
            encryptedFiles.value.delete(relativePath)
        }
        return result
    }

    /** 验证密码是否正确 */
    async function verifyPassword(relativePath: string, password: string): Promise<boolean> {
        const absPath = await getAbsoluteFilePath(relativePath)
        return await invoke('verify_password', { path: absPath, password })
    }

    /** 修改密码：对所有已知加密文件重新加密 */
    async function changePassword(oldPassword: string, newPassword: string): Promise<{ success: number; failed: string[] }> {
        const failed: string[] = []
        let success = 0
        for (const filePath of encryptedFiles.value) {
            try {
                const absPath = await getAbsoluteFilePath(filePath)
                await invoke('re_encrypt_file', {
                    path: absPath,
                    oldPassword,
                    newPassword
                })
                success++
            } catch (e) {
                failed.push(filePath)
                console.error(`重新加密 ${filePath} 失败:`, e)
            }
        }
        // 更新会话密码
        sessionPassword.value = newPassword
        return { success, failed }
    }

    /** 快速判断（基于缓存，不读磁盘） */
    function isEncrypted(relativePath: string): boolean {
        return encryptedFiles.value.has(relativePath)
    }

    return {
        // 状态
        sessionPassword,
        encryptedFiles,
        isPasswordSet,
        // 方法
        initEncryption,
        setSessionPassword,
        clearSessionPassword,
        hasSessionPassword,
        markPasswordSet,
        encryptNote,
        removeEncryption,
        readEncryptedNote,
        checkFileEncrypted,
        verifyPassword,
        changePassword,
        isEncrypted
    }
})
