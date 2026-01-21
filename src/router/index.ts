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

// 导入布局组件
import CoreLayout from '@/core/layouts/CoreLayout.vue' // 核心布局
import MobileLayout from '@/mobile/layouts/MobileLayout.vue' // 移动端布局

// 导入页面组件
import RecordPage from '@/core/pages/RecordPage.vue' // 记录页面
import ChatPage from '@/mobile/pages/ChatPage.vue' // 聊天页面
import TestPage from '@/core/pages/test.vue' // 测试页面
import DataTestPage from '@/core/pages/DataTestPage.vue' // 数据测试页面
import ArticleTest from '@/core/pages/ArticleTest.vue' // 文章测试页面

// 路由表 - 仅保留指定的三个路由
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'root',
        // 添加默认重定向（解决类型错误的核心）
        redirect: '/core/record',
        // 进入根时根据设备和持久化的currentPage重定向到合适页面
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

                // 确定最终重定向路径
                let redirectPath: string

                if (currentPage) {
                    // 检查currentPage是否有效且匹配当前设备类型
                    if (isMobile && currentPage.startsWith('/mobile/')) {
                        redirectPath = currentPage
                    } else if (!isMobile && currentPage.startsWith('/core/')) {
                        redirectPath = currentPage
                    } else {
                        // currentPage无效或不匹配设备类型，使用默认路由
                        redirectPath = isMobile ? '/mobile/chat' : '/core/record'
                    }
                } else {
                    // 没有currentPage，使用默认路由
                    redirectPath = isMobile ? '/mobile/chat' : '/core/record'
                }

                // 执行重定向
                next(redirectPath)
            } catch (e) {
                console.error('路由重定向处理失败:', e)
                // 异常时的兜底重定向
                next(isMobileDevice() ? '/mobile/chat' : '/core/record')
            }
        }
    },
    {
        path: '/core',
        name: 'core',
        component: CoreLayout, // 使用CoreLayout布局组件
        children: [
            { path: 'record', name: 'core-record', component: RecordPage }, // 记录页面
            { path: 'test', name: 'core-test', component: TestPage }, // 测试页面
            { path: 'data-test', name: 'core-data-test', component: DataTestPage }, // 数据测试页面
            { path: 'article-test', name: 'core-article-test', component: ArticleTest }, // 文章测试页面
            // 添加404路由，匹配所有未定义的core子路由
            { path: ':pathMatch(.*)*', name: 'core-404', component: TestPage } // 暂时使用TestPage作为404页面
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
        console.error('保存路由失败，已兜底到localStorage:', e)
    }
})

export default router