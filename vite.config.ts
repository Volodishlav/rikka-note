import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// 1. 解决 ESModule 中 __dirname 缺失 + Node.js 模块类型问题
import path from 'path';
import { fileURLToPath } from 'url';

// 生成 __dirname（适配 ESModule 环境）
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 2. 正确处理 process 环境变量（移除无效的 @ts-expect-error）
// 手动声明 process 类型（避免安装 @types/node 前的临时报错）
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TAURI_DEV_HOST?: string;
            NODE_ENV?: 'development' | 'production';
        }
    }
}
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
// 修复：移除 async（Vite 配置不需要异步），直接返回配置对象
export default defineConfig({
    plugins: [vue()],

    // 路径别名配置
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },

    // SCSS 预处理器配置
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern', // Vue 3.4+ 推荐使用 modern API
            },
        },
    },

    // Tauri 开发核心配置
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
});