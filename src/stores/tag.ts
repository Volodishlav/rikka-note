// src/stores/tag.ts (Pinia + Vue3 - 最终版本)

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Tag, getTags, insertTag, updateTag, delTag, deleteAllTags } from '@/db/tags'
import { Store } from '@tauri-apps/plugin-store'

// 如果已迁移这些模块，可以导入；否则暂时注释掉
// import { uploadFile as uploadGithubFile, getFiles as githubGetFiles, decodeBase64ToString } from '@/lib/github'
// import { uploadFile as uploadGiteeFile, getFiles as giteeGetFiles } from '@/lib/gitee'
// import { uploadFile as uploadGitlabFile, getFiles as gitlabGetFiles, getFileContent as gitlabGetFileContent } from '@/lib/gitlab'
// import { RepoNames } from '@/lib/github.types'

export const useTagStore = defineStore('tag', () => {
    // ==================== 状态声明 ====================

    const currentTagId = ref<number>(1)
    const tags = ref<Tag[]>([])
    const syncState = ref<boolean>(false)
    const lastSyncTime = ref<string>('')

    // ==================== Getters ====================

    /**
     * 计算当前选中的标签对象
     * 使用computed而不是额外的ref/state，更简洁高效
     * 自动响应currentTagId和tags的变化
     */
    const currentTag = computed(() =>
        tags.value.find(tag => tag.id === currentTagId.value)
    )

    // ==================== 核心Actions ====================

    /**
     * 获取当前选中的标签
     * 此方法用于手动更新currentTag计算值（如果需要）
     * 在Pinia中，computed会自动追踪，此方法主要用于显式调用的场景
     */
    const getCurrentTag = () => {
        return currentTag.value
    }

    /**
     * 初始化标签系统
     * - 从store.json读取保存的currentTagId
     * - 从数据库加载所有标签
     * - 获取当前选中的标签对象
     * 调用场景: 应用启动时 (App.vue的onMounted或main.ts)
     */
    const initTags = async () => {
        try {
            const store = await Store.load('store.json')
            const savedTagId = await store.get<number>('currentTagId')

            if (savedTagId) {
                currentTagId.value = savedTagId
            }

            // 从数据库加载标签列表
            await fetchTags()

            // 获取当前选中的标签对象
            getCurrentTag()
        } catch (error) {
            console.error('Failed to init tags:', error)
            // 备用方案：直接从DB加载
            await fetchTags()
            getCurrentTag()
        }
    }

    /**
     * 从数据库刷新标签列表
     * getTags() 已自动计算每个标签关联的mark数量 (total)
     */
    const fetchTags = async () => {
        try {
            const tagList = await getTags()
            tags.value = tagList
        } catch (error) {
            console.error('Failed to fetch tags:', error)
        }
    }

    /**
     * 切换当前选中的标签
     * @param id 目标标签ID
     * 调用场景: 用户点击侧边栏标签项、删除标签后自动切换
     */
    const setCurrentTagId = async (id: number) => {
        currentTagId.value = id

        try {
            const store = await Store.load('store.json')
            await store.set('currentTagId', id)
            await store.save()
        } catch (error) {
            console.error('Failed to save currentTagId:', error)
        }
    }

    // ==================== 标签CRUD操作 ====================

    /**
     * 新增标签
     * @param name 标签名称
     */
    const addTag = async (name: string) => {
        try {
            const result = await insertTag({ name })
            await fetchTags()
            return result
        } catch (error) {
            console.error('Failed to add tag:', error)
            throw error
        }
    }

    /**
     * 更新标签信息（名称、锁定状态、置顶状态）
     * @param tag 完整的Tag对象
     */
    const updateTagItem = async (tag: Tag) => {
        try {
            await updateTag(tag)
            await fetchTags()
        } catch (error) {
            console.error('Failed to update tag:', error)
            throw error
        }
    }

    /**
     * 删除标签
     * 注意: isLocked=true的标签（如"Idea"）不会被删除
     * 删除后自动刷新列表，并直接切换到第一个标签
     * @param id 要删除的标签ID
     */
    const deleteTag = async (id: number) => {
        try {
            await delTag(id)
            await fetchTags()

            // 删除标签后直接切换到第一个标签
            if (tags.value.length > 0) {
                await setCurrentTagId(tags.value[0].id)
            }
        } catch (error) {
            console.error('Failed to delete tag:', error)
            throw error
        }
    }

    /**
     * 清空所有非锁定标签（同步操作）
     * 仅删除 isLocked=false 的标签，保留"Idea"等默认标签
     */
    const clearTags = async () => {
        try {
            await deleteAllTags()
            await fetchTags()
        } catch (error) {
            console.error('Failed to clear tags:', error)
            throw error
        }
    }

    // ==================== 同步操作 ====================

    /**
     * 上传标签到远程（GitHub/Gitee/GitLab）
     * 流程: getTags() → JSON → Base64编码 → 上传
     */
    // const uploadTags = async (): Promise<boolean> => {
    //     syncState.value = true
    //     try {
    //         const path = '.data'
    //         const filename = 'tags.json'
    //         const tagList = await getTags()
    //
    //         const store = await Store.load('store.json')
    //         const primaryBackupMethod = await store.get<string>('primaryBackupMethod') || 'github'
    //
    //         // 将JSON转为Base64
    //         const jsonToBase64 = (data: Tag[]) => {
    //             try {
    //                 // Webview环境：使用btoa
    //                 return btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
    //             } catch {
    //                 // Node环境备用
    //                 return Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
    //             }
    //         }
    //
    //         let result = false
    //
    //         // 远程同步模块需要先迁移，这里仅提供结构框架
    //         switch (primaryBackupMethod) {
    //             case 'github':
    //                 // const files = await githubGetFiles({ path: `${path}/${filename}`, repo: RepoNames.sync })
    //                 // const res = await uploadGithubFile({...})
    //                 // if (res) result = true
    //                 break
    //             case 'gitee':
    //                 // const files = await giteeGetFiles({ path: `${path}/${filename}`, repo: RepoNames.sync })
    //                 // const res = await uploadGiteeFile({...})
    //                 // if (res) result = true
    //                 break
    //             case 'gitlab':
    //                 // const files = await gitlabGetFiles({ path, repo: RepoNames.sync })
    //                 // const res = await uploadGitlabFile({...})
    //                 // if (res) result = true
    //                 break
    //         }
    //
    //         lastSyncTime.value = new Date().toLocaleString()
    //         return result
    //     } catch (error) {
    //         console.error('Failed to upload tags:', error)
    //         throw error
    //     } finally {
    //         syncState.value = false
    //     }
    // }
    //
    // /**
    //  * 从远程下载标签
    //  * 流程: 获取远程Base64 → 解码 → JSON.parse → 批量导入
    //  */
    // const downloadTags = async (): Promise<Tag[]> => {
    //     syncState.value = true
    //     try {
    //         const store = await Store.load('store.json')
    //         const primaryBackupMethod = await store.get<string>('primaryBackupMethod') || 'github'
    //
    //         let result: Tag[] = []
    //
    //         // 远程同步模块需要先迁移，这里仅提供结构框架
    //         switch (primaryBackupMethod) {
    //             case 'github':
    //                 // const files = await githubGetFiles({ path: `${path}/${filename}`, repo: RepoNames.sync })
    //                 // if (files) {
    //                 //   const jsonStr = decodeBase64ToString(files.content)
    //                 //   result = JSON.parse(jsonStr)
    //                 // }
    //                 break
    //             case 'gitee':
    //                 // 类似逻辑
    //                 break
    //             case 'gitlab':
    //                 // 类似逻辑
    //                 break
    //         }
    //
    //         // 清空非锁定标签，批量导入
    //         await clearTags()
    //         if (result.length > 0) {
    //             await insertTags(result)
    //             await fetchTags()
    //         }
    //
    //         lastSyncTime.value = new Date().toLocaleString()
    //         return result
    //     } catch (error) {
    //         console.error('Failed to download tags:', error)
    //         throw error
    //     } finally {
    //         syncState.value = false
    //     }
    // }

    // ==================== 辅助方法 ====================

    const setSyncState = (state: boolean) => {
        syncState.value = state
    }

    const setLastSyncTime = (time: string) => {
        lastSyncTime.value = time
    }

    return {
        // 状态
        currentTagId,
        tags,
        syncState,
        lastSyncTime,

        // Getters
        currentTag,

        // Actions
        initTags,
        fetchTags,
        setCurrentTagId,
        getCurrentTag,
        addTag,
        updateTagItem,
        deleteTag,
        clearTags,
        // uploadTags,
        // downloadTags,
        setSyncState,
        setLastSyncTime,
    }
})