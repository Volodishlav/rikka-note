// src/stores/sidebar.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
// ref是 Vue3 中用于创建响应式数据的核心 API。因为collapsed是布尔值（基本类型），需要用ref包裹才能成为响应式数据（当值变化时，依赖它的组件会自动更新）

import { tauriGet, tauriSet } from '@/utils/tauriStore'
// 使用defineStore函数创建并导出一个名为useSidebarStore的 Store（命名规范：use+Store名称+Store）：
// 第一个参数'sidebar'是 Store 的唯一 ID（命名空间），Pinia 通过这个 ID 区分不同的 Store，不能重复。
// 第二个参数是一个箭头函数，用于定义 Store 的状态、方法等（这是 Pinia 的组合式写法，符合 Vue3 的组合式 API 风格）
export const useSidebarStore = defineStore('sidebar', () => {
//     创建一个响应式的布尔类型变量collapsed：
// 类型注解<boolean>是 TypeScript 的语法，明确变量只能是布尔值，避免类型错误。
// 初始值为false，表示侧边栏默认是展开状态（false= 未折叠 = 展开，true= 折叠）。
// 注意：ref包裹的变量需要通过.value访问 / 修改其值。
    const collapsed = ref<boolean>(false)

    // init (restore persisted state)
    async function init() {
        const val = await tauriGet('sidebar:collapsed')
        if (typeof val === 'boolean') collapsed.value = val
    }

    function toggle() {
        collapsed.value = !collapsed.value
        tauriSet('sidebar:collapsed', collapsed.value)
    }

    return { collapsed, toggle, init }
})