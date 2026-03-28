/// <reference types="vite/client" />

// 为 .vue 文件提供基本类型支持，解决在 .ts/.vue 文件中导入时的报错
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 扩展 Window 接口以支持 Tauri 环境（解决类型报错）
interface Window {
  __TAURI__?: import('@tauri-apps/api').TauriGlobal;
}