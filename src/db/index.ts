// src/db/index.ts
import Database from '@tauri-apps/plugin-sql';
import { join } from '@tauri-apps/api/path';
import {logger} from "@/utils/logger.ts";

// 数据库实例（初始为 null）
let db: Awaited<ReturnType<typeof Database.load>> | null = null;
let currentDbPath: string | null = null;

/**
 * 初始化数据库
 * @param workspacePath 工作区路径，由调用方提供。调用方应确保路径有效。
 * @returns 数据库实例，如果初始化失败则返回 null
 */
export async function initDb(workspacePath: string) {
    // 注意：仓库标识 .rikka_note 是一个文件，不能把它当目录用！
    const expectedDbPath = await join(workspacePath, '.rikka_note.db');

    // 避免当前连接的同路径库重复初始化
    if (db && currentDbPath === expectedDbPath) {
        logger.db.debug('[DB] 数据库已在当前路径下就绪，跳过初始化:', expectedDbPath)
        return db;
    }

    logger.db.debug('[DB] 开始初始化数据库连接, 目标路径:', expectedDbPath)

    // 若存在旧连接且路径不同（例如切换了仓库），则先断开旧连接
    if (db) {
        await closeDb();
    }

    try {
        // 使用绝对路径加载：Tauri plugin-sql v2 允许 sqlite: 后接绝对文件路径
        logger.db.debug('[DB] 执行 Database.load...')
        db = await Database.load(`sqlite:${expectedDbPath}`);
        currentDbPath = expectedDbPath;
        logger.db.debug('[DB] Database.load 成功，实例已挂载')
        return db;
    } catch (e: any) {
        const errorMsg = (e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e))) || 'Unknown Error';
        logger.general.error('[DB] 数据库加载失败:', errorMsg)
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

// 获取数据库实例（确保先调用 initDb 初始化）
export async function getDb() {
    if (!db) {
        logger.db.warn('[DB] getDb() 被调用，但当前 db 实例为 null!')
    }
    return db;
}

// 导出 db 和 currentDbPath 变量
export { db, currentDbPath };

// 初始化所有数据库表
// 注意：调用此函数前必须先调用 initDb() 建立数据库连接
export async function initAllDatabases() {
    if (!db) {
        throw new Error('数据库未初始化，请先调用 initDb()');
    }

    const { initChatsDb } = await import('./chats');
    const { initChatSessionsDb } = await import('./chat_sessions');
    const { initVectorDb } = await import('./vector');
    const { initGraphDb } = await import('./graph');

    // 并行初始化所有表
    await Promise.all([
        initChatsDb(),
        initChatSessionsDb(),
        initVectorDb(),
        initGraphDb()
    ]);
}