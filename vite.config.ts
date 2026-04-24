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
            '@router': path.resolve(
                __dirname,
                process.env.TAURI_ENV_PLATFORM === 'android' || process.env.TAURI_ENV_PLATFORM === 'ios'
                    ? './src/router/mobile.ts'
                    : './src/router/desktop.ts'
            ),
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