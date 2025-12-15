// src/router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { isMobileDevice } from '@/utils/device' // 设备检测工具
import { initStores } from '@/stores' // store初始化函数
import { Store } from '@tauri-apps/plugin-store' // Tauri Store插件

// 导入布局组件
import CoreLayout from '@/core/layouts/CoreLayout.vue' // 核心布局
import MobileLayout from '@/mobile/layouts/MobileLayout.vue' // 移动端布局

// 导入页面组件
import RecordPage from '@/core/pages/RecordPage.vue' // 记录页面
import ChatPage from '@/mobile/pages/ChatPage.vue' // 聊天页面
import TestPage from '@/core/pages/test.vue' // 测试页面

// 路由表 - 仅保留指定的三个路由
const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'root',
        // 进入根时根据设备重定向到 mobile 或 core
        beforeEnter: async (to, from, next) => {
            // 初始化所有store
            try {
                await initStores()
                console.log('初始化store成功')
            } catch (e) {
                console.warn('初始化store失败:', e)
            }
            // 设备检测重定向
            if (isMobileDevice()) {
                next('/mobile/chat') // 直接重定向到聊天页面
            } else {
                next('/core/record') // 直接重定向到记录页面
            }
        }
    },
    {
        path: '/core',
        name: 'core',
        component: CoreLayout, // 使用CoreLayout布局组件
        children: [
            { path: 'record', name: 'core-record', component: RecordPage }, // 记录页面
            { path: 'test', name: 'core-test', component: TestPage } // 测试页面
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
        // 在浏览器 dev 环境 plugin-store 可能不可用，兜底到 localStorage
        if (window.__TAURI__) {
            const s = await Store.load('store.json')
            await s.set('currentPage', to.fullPath)
            await s.save()
            console.log('路由已保存到Tauri Store:', to.fullPath)
        } else {
            localStorage.setItem('currentPage', to.fullPath)
            console.log('路由已保存到localStorage:', to.fullPath)
        }
    } catch (e) {
        // fallback
        localStorage.setItem('currentPage', to.fullPath)
        console.error('保存路由失败，已兜底到localStorage:', e)
    }
})

export default router