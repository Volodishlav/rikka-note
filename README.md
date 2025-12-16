
# 项目结构树
```
d:\graduation_project\rikka-note
├── .vscode/
│   └── extensions.json
├── public/
│   ├── tauri.svg
│   └── vite.svg
├── src/
│   ├── assets/
│   │   └── vue.svg
│   ├── core/
│   │   ├── layouts/
│   │   │   └── CoreLayout.vue
│   │   └── pages/
│   │       ├── RecordPage.vue
│   │       └── test.vue        # 测试页面
│   ├── hooks/
│   │   └── useI18n.ts
│   ├── i18n/
│   │   └── index.ts
│   ├── locales/
│   │   ├── en.json
│   │   └── zh.json
│   ├── mobile/
│   │   ├── layouts/
│   │   │   └── MobileLayout.vue
│   │   └── pages/
│   │       └── ChatPage.vue
│   ├── router/
│   │   └── index.ts
│   ├── shared/
│   │   ├── pages/
│   │   │   └── NotFound.vue
│   │   └── globals.scss
│   ├── stores/
│   │   ├── index.ts
│   │   └── setting.ts
│   ├── utils/
│   │   ├── device.ts
│   │   └── tauriStore.ts      # Tauri存储工具
│   ├── App.vue
│   ├── main.ts
│   └── vite-env.d.ts
├── src-tauri/
│   ├── capabilities/
│   │   └── default.json       # Tauri权限配置
│   ├── icons/                 # 应用图标
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── 32x32.png
│   │   ├── Square107x107Logo.png
│   │   ├── Square142x142Logo.png
│   │   ├── Square150x150Logo.png
│   │   ├── Square284x284Logo.png
│   │   ├── Square30x30Logo.png
│   │   ├── Square310x310Logo.png
│   │   ├── Square44x44Logo.png
│   │   ├── Square71x71Logo.png
│   │   ├── Square89x89Logo.png
│   │   ├── StoreLogo.png
│   │   ├── icon.icns
│   │   ├── icon.ico
│   │   └── icon.png
│   ├── src/
│   │   ├── lib.rs             # Rust库入口
│   │   └── main.rs            # Rust主入口
│   ├── .gitignore
│   ├── Cargo.lock
│   ├── Cargo.toml             # Rust依赖配置
│   ├── build.rs
│   └── tauri.conf.json        # Tauri配置
├── .gitignore
├── README.md
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```
## 关键文件说明
1. 前端核心文件 ：

    - src/core/pages/test.vue ：功能测试页面，用于验证Tauri插件集成
    - src/utils/tauriStore.ts ：Tauri存储工具，封装store插件调用
    - src/router/index.ts ：路由配置
    - src/App.vue ：应用入口组件
    - src/main.ts ：前端应用入口
2. Tauri核心文件 ：

    - src-tauri/Cargo.toml ：Rust依赖配置，管理Tauri插件版本
    - src-tauri/tauri.conf.json ：Tauri应用配置，包含窗口、安全等设置
    - src-tauri/capabilities/default.json ：Tauri 2.x权限配置，控制命令访问
    - src-tauri/src/lib.rs ：Rust库入口，注册Tauri命令和插件
    - src-tauri/src/main.rs ：Rust主入口，初始化Tauri应用
3. 配置文件 ：

    - package.json ：前端依赖和脚本配置
    - vite.config.ts ：Vite构建配置
    - tsconfig.json ：TypeScript配置
    - tailwind.config.ts ：Tailwind CSS配置
      该项目采用了清晰的分层架构，前端代码位于 src/ 目录，Tauri后端代码位于 src-tauri/ 目录，符合Tauri项目的标准结构。项目使用Vue 3 + TypeScript + Tauri 2.x技术栈，支持国际化和响应式布局。