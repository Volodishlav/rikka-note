import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { tauriGet, tauriSet } from '@/utils/tauriStore'
import { logger } from '@/utils/logger'

import CoreLayout from '@/core/layouts/CoreLayout.vue'
import SettingPage from '@/core/pages/setting/SettingPage.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'root',
        beforeEnter: async (_to, _from, next) => {
            try {
                const currentPage = await tauriGet<string>('currentPage')
                if (currentPage && currentPage.startsWith('/core')) {
                    next(currentPage)
                } else {
                    next('/core')
                }
            } catch (e) {
                logger.general.error('路由重定向处理失败:', e)
                next('/core')
            }
        }
    },
    {
        path: '/core',
        name: 'core',
        component: CoreLayout,
        children: [
            { path: 'setting', name: 'core-setting', component: SettingPage },
            { path: ':pathMatch(.*)*', redirect: '/core' },
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
