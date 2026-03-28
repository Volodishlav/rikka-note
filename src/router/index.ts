import {
    createRouter,
    createWebHistory,
    RouteRecordRaw,
    RouteLocationNormalized,
    NavigationGuardNext
} from 'vue-router'
import { isMobileDevice } from '@/utils/device' // 设备检测工具
import { initStores } from '@/stores' // store初始化函数
import { tauriGet, tauriSet } from '@/utils/tauriStore' // 持久化存储工具
import { logger } from '@/utils/logger'

// 导入布局组件
import CoreLayout from '@/core/layouts/CoreLayout.vue' // 核心布局
import MobileLayout from '@/mobile/layouts/MobileLayout.vue' // 移动端布局

// 导入页面组件
import SettingPage from '@/core/pages/setting/SettingPage.vue' // 设置页面
import ChatPage from '@/mobile/pages/ChatPage.vue' // 聊天页面

// 路由表 - 仅保留必要的路由
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'root',
        redirect: '/core',
        beforeEnter: async (
            _to: RouteLocationNormalized,
            _from: RouteLocationNormalized,
            next: NavigationGuardNext
        ) => {
            try {
                // 初始化所有store
                await initStores()

                // 读取持久化的currentPage
                const currentPage = await tauriGet<string>('currentPage')

                // 设备检测
                const isMobile = isMobileDevice()

                let redirectPath: string

                if (currentPage) {
                    if (isMobile && currentPage.startsWith('/mobile/')) {
                        redirectPath = currentPage
                    } else if (!isMobile && currentPage.startsWith('/core')) {
                        redirectPath = currentPage
                    } else {
                        redirectPath = isMobile ? '/mobile/chat' : '/core'
                    }
                } else {
                    redirectPath = isMobile ? '/mobile/chat' : '/core'
                }

                next(redirectPath)
            } catch (e) {
                logger.general.error('路由重定向处理失败:', e)
                next(isMobileDevice() ? '/mobile/chat' : '/core')
            }
        }
    },
    {
        path: '/core',
        name: 'core',
        component: CoreLayout,
        children: [
            { path: 'setting', name: 'core-setting', component: SettingPage },
            // 添加404路由
            { path: ':pathMatch(.*)*', redirect: '/core' },
        ]
    },
    {
        path: '/mobile',
        name: 'mobile',
        component: MobileLayout, // 使用MobileLayout布局组件
        children: [
            { path: 'chat', name: 'mobile-chat', component: ChatPage } // 聊天页面
        ]
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

// 全局守卫：每次导航把 currentPage 保存到 Tauri store（或 localStorage）
router.afterEach(async (to) => {
    try {
        // 使用封装的tauriSet函数自动适配Tauri Store/localStorage
        await tauriSet('currentPage', to.fullPath)
    } catch (e) {
        // fallback
        localStorage.setItem('currentPage', to.fullPath)
        logger.general.error('保存路由失败，已兜底到localStorage:', e)
    }
})

export default router