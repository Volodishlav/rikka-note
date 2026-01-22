import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TAURI_DEV_HOST?: string;
            NODE_ENV?: 'development' | 'production';
        }
    }
}
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern',
            },
        },
    },
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