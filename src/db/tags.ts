import { getDb } from "./index"
import { Store } from '@tauri-apps/plugin-store';

export interface Tag {
  id: number
  name: string
  isLocked?: boolean
  isPin?: boolean
  total?: number
}

// 定义数据库里实际存的结构
interface TagDTO {
  id: number
  name: string
  isLocked: number // DB 里是 number
  isPin: number    // DB 里是 number
}

// 1. 转入数据库的辅助函数 (Model -> DB)
function toDbModel(tag: Partial<Tag>): any[] {
  // 这里统一处理 Boolean 转 0/1 的逻辑
  // 以后如果要改逻辑，只改这一个地方
  return [
    tag.name,
    tag.isLocked ? 1 : 0,
    tag.isPin ? 1 : 0,
    tag.id
  ]
}

// 2. 从数据库出来的辅助函数 (DB -> Model)
function fromDbModel(row: TagDTO): Tag {
  return {
    ...row,
    isLocked: Boolean(row.isLocked), // 统一处理转 Boolean
    isPin: Boolean(row.isPin)
  }
}

// 创建 tags 表
export async function initTagsDb() {
  const db = await getDb()
  await db.execute(`
    create table if not exists tags (
      id integer primary key autoincrement,
      name text not null,
      isLocked boolean DEFAULT false,
      isPin boolean DEFAULT false
    )
  `)
  const hasDefaultTag = (await db.select<Tag[]>("select * from tags")).length === 0
  if (hasDefaultTag) {
    await db.execute(
      "insert into tags (name, isLocked, isPin) values ($1, $2, $3)",
      ['Idea', true, true]
    )
    const tag = (await db.select<Tag[]>("select * from tags where name = $1", ['Idea']))[0]
    const store = await Store.load('store.json');
    await store.set('currentTagId', tag.id)
    await store.save()
  }
}

export async function getTags() {
  const db = await getDb();
  // 泛型用 TagDTO，表示取出来的是原始数据
  const rows = await db.select<TagDTO[]>("select * from tags")
  
  // 统一转换，业务逻辑清爽了
  const tags = rows.map(fromDbModel)

  // 获取 tags 对应的 marks 数量
  for (const tag of tags) {
    const res = await db.select<{ total: number }[]>("select count(*) as total from marks where tagId = $1 and deleted = $2", [tag.id, 0])
    tag.total = res[0].total
  }

  return tags
}

export async function insertTag(tag: Partial<Tag>) {
  const db = await getDb();
  return await db.execute(
    "insert into tags (name) values ($1)",
    [tag.name]
  )
}

export async function updateTag(tag: Tag) {
  const db = await getDb();

  // 这里的参数通过 helper 函数生成，不用再手写三元表达式了
  // 注意：SQL 参数顺序要和 toDbModel 返回的顺序一致
  return await db.execute(
      "update tags set name = $1, isLocked = $2, isPin = $3 where id = $4",
      toDbModel(tag)
  )
}

export async function delTag(id: number) {
  const db = await getDb();
  return await db.execute("delete from tags where id = $1", [id])
}

export async function deleteAllTags() {
  const db = await getDb();
  return await db.execute("delete from tags where isLocked = false")
}

export async function insertTags(tags: Tag[]) {
  const db = await getDb();
  for (const tag of tags) {
    if (tag.isLocked) continue;

    const exists = await db.select<TagDTO[]>("select * from tags where id = $1", [tag.id])
    if (exists.length > 0) {
      await db.execute(
          "update tags set name = $1, isLocked = $2, isPin = $3 where id = $4",
          toDbModel(tag)
      )
    } else {
      // 插入时参数顺序需要调整，因为 insert 的列顺序是 id, name, isLocked, isPin
      await db.execute(
          "insert into tags (id, name, isLocked, isPin) values ($1, $2, $3, $4)",
          [tag.id, tag.name, tag.isLocked ? 1 : 0, tag.isPin ? 1 : 0]
      )
    }
  }
  return true;
}