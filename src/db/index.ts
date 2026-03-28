// src/db/index.ts
import Database from '@tauri-apps/plugin-sql';
import { getWorkspacePath } from '@/lib/workspace';
import { join } from '@tauri-apps/api/path';
import {logger} from "@/utils/logger.ts";

// 数据库实例（初始为 null）
let db: Awaited<ReturnType<typeof Database.load>> | null = null;
let currentDbPath: string | null = null;

// 初始化数据库（官方推荐的异步调用方式）
export async function initDb() {
    const workspace = await getWorkspacePath();
    if (!workspace.isCustom) {
        throw new Error('未激活任何笔记仓库，无法加载数据库');
    }

    // 注意：仓库标识 .rikka_note 是一个文件，不能把它当目录用！
    const expectedDbPath = await join(workspace.path, '.rikka_note.db');

    // 避免当前连接的同路径库重复初始化
    if (db && currentDbPath === expectedDbPath) {
        return db;
    }

    // 若存在旧连接且路径不同（例如切换了仓库），则先断开旧连接
    if (db) {
        await closeDb();
    }

    try {
        // 使用绝对路径加载：Tauri plugin-sql v2 允许 sqlite: 后接绝对文件路径
        db = await Database.load(`sqlite:${expectedDbPath}`);
        currentDbPath = expectedDbPath;
        return db;
    } catch (e: any) {
        const errorMsg = (e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e))) || 'Unknown Error';
        logger.general.error('数据库加载失败:', errorMsg)
        if (errorMsg.includes('plugin sql not found')) {
            throw new Error('SQL 插件未找到：请检查 main.rs 中是否用 Builder 注册插件');
        } else if (errorMsg.includes('not allowed')) {
            throw new Error('权限不足：请检查 capabilities/default.json 中的权限配置');
        } else {
            throw new Error(`数据库加载失败：${errorMsg}`);
        }
    }
}

// 供切换工作区或卸载时关闭连接使用
export async function closeDb() {
    if (db) {
        try {
            await db.close();
        } catch (e) {
            logger.general.error('关闭数据库连接失败:', e)
        } finally {
            db = null;
            currentDbPath = null;
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

// 导出 db 和 currentDbPath 变量
export { db, currentDbPath };

// 初始化所有数据库表
export async function initAllDatabases() {
    await getDb(); // 确保数据库已加载

    const { initChatsDb } = await import('./chats');
    const { initChatSessionsDb } = await import('./chat_sessions');
    const { initVectorDb } = await import('./vector');

    // 并行初始化所有表
    await Promise.all([
        initChatsDb(),
        initChatSessionsDb(),
        initVectorDb()
    ]);
}