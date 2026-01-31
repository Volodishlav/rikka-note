import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    type Mark,
    getMarks,
    insertMark as insertMarkDb,
    updateMark as updateMarkDb,
    delMark as delMarkDb,
    initMarksDb
} from '@/db/marks'
import { useTagStore } from './tag'

export const useMarkStore = defineStore('mark', () => {
    const marks = ref<Mark[]>([])
    const loading = ref(false)
    const tagStore = useTagStore()

    // 初始化
    const init = async (tagId: number) => {
        loading.value = true
        try {
            await initMarksDb()
            const data = await getMarks(tagId)
            marks.value = data
        } finally {
            loading.value = false
        }
    }

    // 插入 Mark
    const insert = async (mark: Partial<Mark>) => {
        const res = await insertMarkDb(mark)
        if (res.lastInsertId) {
            const newMark: Mark = {
                id: res.lastInsertId,
                tagId: mark.tagId!,
                type: mark.type || 'text',
                content: mark.content,
                url: mark.url || '',
                desc: mark.desc,
                deleted: 0,
                createdAt: Date.now()
            }
            // 插入到列表头部
            marks.value.unshift(newMark)
            return newMark
        }
        return null
    }

    // 更新 Mark
    const update = async (mark: Mark) => {
        const index = marks.value.findIndex(item => item.id === mark.id)
        if (index !== -1) {
            marks.value[index] = mark
            await updateMarkDb(mark)
        }
    }

    // 删除 Mark (软删除)
    const remove = async (id: number) => {
        const index = marks.value.findIndex(item => item.id === id)
        if (index !== -1) {
            marks.value.splice(index, 1)
            await delMarkDb(id)
        }
    }

    // 刷新当前 Tag 的 Marks
    const fetchMarks = async () => {
        if (tagStore.currentTagId) {
            await init(tagStore.currentTagId)
        }
    }

    return {
        marks,
        loading,
        init,
        insert,
        update,
        remove,
        fetchMarks
    }
})