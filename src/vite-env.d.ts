//vite-env.d.ts
/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
// 扩展 Window 接口，添加 __TAURI__ 属性（解决类型报错）
declare global {
  interface Window {
    __TAURI__?: import('@tauri-apps/api').TauriGlobal;
  }
}
export {};