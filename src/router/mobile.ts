import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { logger } from '@/utils/logger'

import MobileLayout from '@/mobile/layouts/MobileLayout.vue'
import ChatPage from '@/mobile/pages/ChatPage.vue'
import NoteListPage from '@/mobile/pages/NoteListPage.vue'
import MobileSettingPage from '@/mobile/pages/SettingPage.vue'
import MobileEditorPage from '@/mobile/pages/MobileEditorPage.vue'
import SettingDetailPage from '@/mobile/pages/SettingDetailPage.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'root',
        beforeEnter: async (_to, _from, next) => {
            try {
                const currentPage = await tauriGet<string>('currentPage')
                if (currentPage && currentPage.startsWith('/mobile/')) {
                    next(currentPage)
                } else {
                    next('/mobile/notes')
                }
            } catch (e) {
                logger.general.error('路由重定向处理失败:', e)
                next('/mobile/notes')
            }
        }
    },
    {
        path: '/mobile',
        name: 'mobile',
        component: MobileLayout,
        children: [
            { path: 'notes', name: 'mobile-notes', component: NoteListPage },
            { path: 'chat', name: 'mobile-chat', component: ChatPage },
            { path: 'setting', name: 'mobile-setting', component: MobileSettingPage },
            { path: 'editor', name: 'mobile-editor', component: MobileEditorPage },
            { path: 'setting/:id', name: 'mobile-setting-detail', component: SettingDetailPage },
            { path: ':pathMatch(.*)*', redirect: '/mobile/notes' },
        ]
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

router.afterEach(async (to) => {
    try {
        await tauriSet('currentPage', to.fullPath)
    } catch (e) {
        localStorage.setItem('currentPage', to.fullPath)
        logger.general.error('保存路由失败，已兜底到localStorage:', e)
    }
})

export default router
