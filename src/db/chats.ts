import { getDb } from "./index"

export type Role = 'system' | 'user' | 'assistant'
export type ChatType = 'chat' | 'note' | 'clipboard' | 'clear'

export interface Chat {
  id: number
  sessionId: number
  content?: string
  role: Role
  type: ChatType
  image?: string
  inserted: boolean // 是否插入到 mark 中
  createdAt: number
}

// 创建 chats 表
export async function initChatsDb() {
  const db = await getDb()
  
  // 检查旧表结构，如果没有 sessionId（代表旧版本），则直接丢弃不作迁移
  try {
    const result = await db.select("PRAGMA table_info(chats);") as any[]
    const hasSessionId = result.some(r => r.name === 'sessionId')
    if (result.length > 0 && !hasSessionId) {
      await db.execute("DROP TABLE chats;")
    }
  } catch (e) {
    console.error("Failed to check or drop old chats table", e)
  }

  await db.execute(`
    create table if not exists chats (
                                       id integer primary key autoincrement,
                                       sessionId integer not null,
                                       content text default null,
                                       role text not null,
                                       type text not null,
                                       image text default null,
                                       inserted boolean default false,
                                       createdAt integer not null
    )
  `)
}

// 插入一条 chat
export async function insertChat(chat: Omit<Chat, 'id' | 'createdAt'>) {
  const db = await getDb()
  const createdAt = Date.now();
  return await db.execute(
      "insert into chats (sessionId, content, role, type, image, inserted, createdAt) values ($1, $2, $3, $4, $5, $6, $7)",
      [chat.sessionId, chat.content, chat.role, chat.type, chat.image, chat.inserted ? 1 : 0, createdAt])
}

// 获取所有 chats
export async function getChats(sessionId: number) {
  const db = await getDb()
  const result = await db.select<Chat[]>(
      "select * from chats where sessionId = $1 order by createdAt",
      [sessionId]
  )
  return result
}

// 获取所有 chats（用于同步）
export async function getAllChats() {
  const db = await getDb()
  const result = await db.select<Chat[]>(
      "select * from chats order by createdAt",
      []
  )
  return result
}

// 插入多条 chat（用于同步）
export async function insertChats(chats: Chat[]) {
  const db = await getDb()
  for (const chat of chats) {
    await db.execute(
        "insert into chats (sessionId, content, role, type, image, inserted, createdAt) values ($1, $2, $3, $4, $5, $6, $7)",
        [chat.sessionId, chat.content, chat.role, chat.type, chat.image, chat.inserted ? 1 : 0, chat.createdAt]
    )
  }
}

// 删除所有 chats（用于同步）
export async function deleteAllChats() {
  const db = await getDb()
  return await db.execute(
      "delete from chats",
      []
  )
}

// 更新一条 chat
export async function updateChat(chat: Chat) {
  const db = await getDb()
  return await db.execute(
      "update chats set content = $1, role = $2, type = $3, image = $4, inserted = $5 where id = $6",
      [chat.content, chat.role, chat.type, chat.image, chat.inserted ? 1 : 0, chat.id])
}

// 清空 sessionId 下的所有 chats
export async function clearChatsBySessionId(sessionId: number) {
  const db = await getDb()
  return await db.execute(
      "delete from chats where sessionId = $1",
      [sessionId])
}

// 已插入
export async function updateChatsInsertedById(id: number) {
  const db = await getDb()
  return await db.execute(
      "update chats set inserted = $1 where id = $2",
      [true, id])
}

// 删除一条 chat
export async function deleteChat(id: number) {
  const db = await getDb()
  return await db.execute(
      "delete from chats where id = $1",
      [id])
}