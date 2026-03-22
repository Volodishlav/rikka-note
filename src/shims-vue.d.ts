// src/shims-vue.d.ts
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    // 声明 Vue 组件的基础类型，避免 TS 报 any 类型错误
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}

// 可选：若项目中使用 Vue 的全局属性/方法，可在此扩展
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        // 示例：扩展全局属性（根据你的项目需求添加）
        // $message: (msg: string) => void
    }
}