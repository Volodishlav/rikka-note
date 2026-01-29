// src/stores/chat.ts
import { defineStore } from 'pinia'
import { Store as TauriStore } from '@tauri-apps/plugin-store'
import {
    Chat,
    clearChatsByTagId,
    deleteChat as dbDeleteChat,
    getChats,
    initChatsDb,
    insertChat as dbInsertChat,
    updateChat as dbUpdateChat,
    updateChatsInsertedById,
    getAllChats,
    deleteAllChats,
    insertChats
} from '@/db/chats'
// import {
//     uploadFile as uploadGithubFile,
//     getFiles as githubGetFiles,
//     decodeBase64ToString
// } from '@/lib/github'
// import {
//     uploadFile as uploadGiteeFile,
//     getFiles as giteeGetFiles
// } from '@/lib/gitee'
// import {
//     uploadFile as uploadGitlabFile,
//     getFiles as gitlabGetFiles,
//     getFileContent as gitlabGetFileContent
// } from '@/lib/gitlab'
// import { RepoNames } from '@/lib/github.types'
import { locales } from '@/lib/locales'

export const useChatStore = defineStore('chat', {
    state: () => ({
        loading: false as boolean,
        isLinkMark: true as boolean,
        isPlaceholderEnabled: true as boolean,
        chats: [] as Chat[],
        locale: locales[0] as string,
        syncState: false as boolean,
        lastSyncTime: '' as string
    }),
    actions: {
        setLoading(loading: boolean) {
            this.loading = loading
        },
        setIsLinkMark(v: boolean) {
            this.isLinkMark = v
        },
        setPlaceholderEnabled(v: boolean) {
            this.isPlaceholderEnabled = v
        },

        // 初始化 chats（调用 DB 初始化并读取指定 tagId 下的数据）
        async init(tagId: number) {
            await initChatsDb()
            const data = await getChats(tagId)
            this.chats = data || []
        },

        // 插入一条 chat（返回完整 Chat 对象或 null）
        async insert(chat: Omit<Chat, 'id' | 'createdAt'>): Promise<Chat | null> {
            const res = await dbInsertChat(chat)
            if ((res as any).lastInsertId) {
                const inserted: Chat = {
                    id: (res as any).lastInsertId,
                    createdAt: Date.now(),
                    ...chat
                }
                this.chats = [...this.chats, inserted]
                return inserted
            }
            return null
        },

        // 更新内存中的 chat（不立即写 DB）
        updateChat(chat: Chat) {
            this.chats = this.chats.map(item => (item.id === chat.id ? chat : item))
        },

        // 保存一条 chat 到 DB（isSave=true 时写 DB）
        async saveChat(chat: Chat, isSave: boolean = false) {
            this.updateChat(chat)
            if (isSave) {
                await dbUpdateChat(chat)
            }
        },

        // 删除一条 chat
        async deleteChat(id: number) {
            this.chats = this.chats.filter(c => c.id !== id)
            await dbDeleteChat(id)
        },

        // locale 管理（持久化到 store.json）
        async getLocale() {
            const store = await TauriStore.load('store.json')
            const res = (await store.get<string>('note_locale')) || locales[0]
            this.locale = res
        },
        async setLocale(locale: string) {
            this.locale = locale
            const store = await TauriStore.load('store.json')
            await store.set('note_locale', locale)
            await store.save()
        },

        // 清空 tagId 下的所有 chats（DB + 内存）
        async clearChats(tagId: number) {
            this.chats = []
            await clearChatsByTagId(tagId)
        },

        // 将某条 chat 标记为已插入（更新 DB 并更新内存）
        async updateInsert(id: number) {
            await updateChatsInsertedById(id)
            this.chats = this.chats.map(item => {
                if (item.id === id) item.inserted = true
                return item
            })
        },

        // 同步：上传 chats（到 GitHub/Gitee/GitLab） - 返回 boolean 成功与否
        // async uploadChats(): Promise<boolean> {
        //     this.syncState = true
        //     const path = '.data'
        //     const filename = 'chats.json'
        //     const chats = await getAllChats()
        //     const store = await TauriStore.load('store.json')
        //     const jsonToBase64 = (data: Chat[]) => {
        //         // Buffer may be available in Tauri environment; fallback to btoa if not
        //         try {
        //             // @ts-ignore
        //             return Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
        //         } catch {
        //             return btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
        //         }
        //     }
        //     const primaryBackupMethod = (await store.get<string>('primaryBackupMethod')) || 'github'
        //     let result = false
        //     let files: any
        //     let res: any
        //
        //     switch (primaryBackupMethod) {
        //         case 'github':
        //             files = await githubGetFiles({ path: `${path}/${filename}`, repo: RepoNames.sync })
        //             res = await uploadGithubFile({
        //                 ext: 'json',
        //                 file: jsonToBase64(chats),
        //                 repo: RepoNames.sync,
        //                 path,
        //                 filename,
        //                 sha: files?.sha
        //             })
        //             break
        //         case 'gitee':
        //             files = await giteeGetFiles({ path: `${path}/${filename}`, repo: RepoNames.sync })
        //             res = await uploadGiteeFile({
        //                 ext: 'json',
        //                 file: jsonToBase64(chats),
        //                 repo: RepoNames.sync,
        //                 path,
        //                 filename,
        //                 sha: files?.sha
        //             })
        //             if (res) result = true
        //             break
        //         case 'gitlab':
        //             files = await gitlabGetFiles({ path, repo: RepoNames.sync })
        //             const chatFile = files?.find((f: any) => f.name === filename)
        //             res = await uploadGitlabFile({
        //                 ext: 'json',
        //                 file: jsonToBase64(chats),
        //                 repo: RepoNames.sync,
        //                 path,
        //                 filename,
        //                 sha: chatFile?.sha || ''
        //             })
        //             break
        //     }
        //
        //     if (res) result = true
        //     this.syncState = false
        //     return result
        // },

        // 同步：从远端下载 chats 并替换本地（返回下载的数据）
        // async downloadChats(): Promise<Chat[]> {
        //     const path = '.data'
        //     const filename = 'chats.json'
        //     const store = await TauriStore.load('store.json')
        //     const primaryBackupMethod = (await store.get<string>('primaryBackupMethod')) || 'github'
        //     let result: Chat[] = []
        //     let files: any
        //
        //     switch (primaryBackupMethod) {
        //         case 'github':
        //             files = await githubGetFiles({ path: `${path}/${filename}`, repo: RepoNames.sync })
        //             break
        //         case 'gitee':
        //             files = await giteeGetFiles({ path: `${path}/${filename}`, repo: RepoNames.sync })
        //             break
        //         case 'gitlab':
        //             files = await gitlabGetFileContent({ path: `${path}/${filename}`, ref: 'main', repo: RepoNames.sync })
        //             break
        //     }
        //
        //     if (files) {
        //         const configJson = decodeBase64ToString(files.content)
        //         result = JSON.parse(configJson)
        //     }
        //
        //     // 替换本地 DB：删全表、插入下载的数据
        //     await deleteAllChats()
        //     if (result.length > 0) {
        //         await insertChats(result)
        //     }
        //
        //     return result
        // }
    }
})