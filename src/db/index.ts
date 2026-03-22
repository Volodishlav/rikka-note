// src/db/index.ts
import Database from '@tauri-apps/plugin-sql';

// 数据库实例（初始为 null）
let db: Awaited<ReturnType<typeof Database.load>> | null = null;

// 初始化数据库（官方推荐的异步调用方式）
export async function initDb() {
    if (db) return db; // 避免重复初始化

    try {
        // 严格按照官方文档：路径相对于 BaseDirectory::App
        db = await Database.load('sqlite:note.db');
        return db;
    } catch (e: any) {
        console.error('❌ 数据库加载失败:', e.message);
        // 分类提示错误原因
        if (e.message.includes('plugin sql not found')) {
            throw new Error('SQL 插件未找到：请检查 main.rs 中是否用 Builder 注册插件');
        } else if (e.message.includes('not allowed')) {
            throw new Error('权限不足：请检查 capabilities/default.json 中的权限配置');
        } else {
            throw new Error(`数据库加载失败：${e.message}`);
        }
    }
}

// 获取数据库实例（确保先初始化）
export async function getDb() {
    if (!db) {
        await initDb(); // 未初始化则自动初始化
    }
    return db!;
}

// 导出 db 变量（兼容原有代码）
export { db };

// 初始化所有数据库表
export async function initAllDatabases() {
    await getDb(); // 确保数据库已加载

    const { initChatsDb } = await import('./chats');
    const { initChatSessionsDb } = await import('./chat_sessions');
    const { initMarksDb } = await import('./marks');
    const { initTagsDb } = await import('./tags');
    const { initVectorDb } = await import('./vector');

    // 并行初始化所有表
    await Promise.all([
        initChatsDb(),
        initChatSessionsDb(),
        initMarksDb(),
        initTagsDb(),
        initVectorDb()
    ]);
}