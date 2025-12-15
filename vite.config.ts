import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from 'path'; // 添加path导入
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],
    // 添加路径别名配置
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },

    // 添加SCSS预处理器配置
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern', // Vue 3.4+ 推荐使用 modern API
            },
        },
    },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
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
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
