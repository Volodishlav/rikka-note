import { getDb } from "./index"

export interface ChatSession {
  id: number
  tagId: number
  title: string
  createdAt: number
  updatedAt: number
}

// 创建 chat_sessions 表
export async function initChatSessionsDb() {
  const db = await getDb()
  await db.execute(`
    create table if not exists chat_sessions (
                                       id integer primary key autoincrement,
                                       tagId integer not null,
                                       title text not null,
                                       createdAt integer not null,
                                       updatedAt integer not null
    )
  `)
}

// 插入一条 chat_session
export async function insertChatSession(session: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb()
  const now = Date.now()
  return await db.execute(
      "insert into chat_sessions (tagId, title, createdAt, updatedAt) values ($1, $2, $3, $4)",
      [session.tagId, session.title, now, now]
  )
}

// 获取 tagId 下所有 chat_sessions
export async function getChatSessions(tagId: number) {
  const db = await getDb()
  const result = await db.select<ChatSession[]>(
      "select * from chat_sessions where tagId = $1 order by updatedAt desc",
      [tagId]
  )
  return result
}

// 更新一条 chat_session 的标题或更新时间
export async function updateChatSession(session: Omit<ChatSession, 'createdAt'>) {
  const db = await getDb()
  const now = Date.now()
  return await db.execute(
      "update chat_sessions set title = $1, updatedAt = $2 where id = $3",
      [session.title, now, session.id]
  )
}

// 更新一条 chat_session 的时间
export async function updateChatSessionTime(id: number) {
  const db = await getDb()
  const now = Date.now()
  return await db.execute(
      "update chat_sessions set updatedAt = $1 where id = $2",
      [now, id]
  )
}

// 删除一条 chat_session
export async function deleteChatSession(id: number) {
  const db = await getDb()
  return await db.execute(
      "delete from chat_sessions where id = $1",
      [id]
  )
}

// 清空 tagId 下的所有 chat_sessions
export async function clearChatSessionsByTagId(tagId: number) {
  const db = await getDb()
  return await db.execute(
      "delete from chat_sessions where tagId = $1",
      [tagId]
  )
}
