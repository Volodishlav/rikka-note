# Rikka Note

一个使用 Vue 3 + Tauri 2.x 开发的跨平台笔记应用，支持桌面端和浏览器端，具备主题切换和多语言支持。

## 技术栈

### 前端
- **Vue 3**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Pinia**
- **Vue Router**
- **Vue I18n**

### 桌面端
- **Tauri 2.x**
- **Rust**
- 
### 图标与样式
- **Lucide Vue Next**
- **PostCSS**

## 项目结构树
```
d:\graduation_project\project\rikka-note
├── public
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button/
│   │   │   ├── collapsible/
│   │   │   ├── context-menu/
│   │   │   ├── dialog/
│   │   │   ├── dropdown-menu/
│   │   │   ├── input/
│   │   │   ├── separator/
│   │   │   ├── sheet/
│   │   │   ├── sidebar/
│   │   │   ├── skeleton/
│   │   │   ├── textarea/
│   │   │   ├── toast/
│   │   │   └── tooltip/
│   │   ├── AppSidebar.vue
│   │   ├── AppStatus.vue
│   │   ├── ModeToggle.vue
│   │   └── ThemeProvider.vue
│   ├── composables/
│   │   ├── useAI.ts
│   │   ├── useChatSend.ts
│   │   ├── useInsertChat.ts
│   │   ├── useTheme.ts
│   │   └── useToast.ts
│   ├── core/
│   │   ├── layouts/
│   │   │   └── CoreLayout.vue
│   │   └── pages/
│   │       ├── article/
│   │       │   ├── FileIcon.vue
│   │       │   ├── FileItem.vue
│   │       │   ├── FileManager.vue
│   │       │   ├── FileSidebar.vue
│   │       │   ├── FileToolbar.vue
│   │       │   ├── FolderItem.vue
│   │       │   ├── MdEditor.vue
│   │       │   └── TreeItem.vue
│   │       ├── record/
│   │       │   ├── chat/
│   │       │   │   ├── ChatContent.vue
│   │       │   │   ├── ChatHeader.vue
│   │       │   │   ├── ChatInput.vue
│   │       │   │   ├── ChatLayout.vue
│   │       │   │   ├── InputModeSelect.vue
│   │       │   │   ├── ModelSelect.vue
│   │       │   │   ├── PromptSelect.vue
│   │       │   │   └── RagSwitch.vue
│   │       │   ├── mark/
│   │       │   │   ├── MarkDetail.vue
│   │       │   │   ├── MarkHeader.vue
│   │       │   │   ├── MarkItem.vue
│   │       │   │   └── MarkList.vue
│   │       │   ├── tag/
│   │       │   │   ├── TagList.vue
│   │       │   │   └── TagListItem.vue
│   │       │   ├── NoteSidebar.vue
│   │       ├── setting/
│   │       │   ├── SettingPage.vue
│   │       │   ├── ai/
│   │       │   │   ├── AiSetting.vue
│   │       │   │   ├── AiCheck.vue
│   │       │   │   ├── CreateConfig.vue
│   │       │   │   └── DefaultModels.vue
│   │       ├── ArticlePage.vue
│   │       ├── DataTestPage.vue
│   │       ├── RecordPage.vue
│   │       └── test.vue
│   ├── db/
│   │   ├── chats.ts
│   │   ├── index.ts
│   │   ├── marks.ts
│   │   ├── notes.ts
│   │   ├── tags.ts
│   │   └── vector.ts
│   ├── hooks/
│   │   └── useI18n.ts
│   ├── i18n/
│   │   └── index.ts
│   ├── layouts/
│   │   └── RootLayout.vue
│   ├── lib/
│   │   ├── ai.ts
│   │   ├── locales.ts
│   │   ├── path.ts
│   │   ├── utils.ts
│   │   └── workspace.ts
│   ├── locales/
│   │   ├── en.json
│   │   └── zh.json
│   ├── mobile/
│   │   ├── layouts/
│   │   │   └── MobileLayout.vue
│   │   └── pages/
│   │       └── ChatPage.vue
│   ├── router/
│   │   └── index.ts
│   ├── shared/
│   │   ├── pages/
│   │   │   └── NotFound.vue
│   │   └── globals.scss
│   ├── stores/
│   │   ├── article.ts
│   │   ├── chat.ts
│   │   ├── clipboard.ts
│   │   ├── index.ts
│   │   ├── mark.ts
│   │   ├── prompt.ts
│   │   ├── setting.ts
│   │   ├── sidebar.ts
│   │   └── tag.ts
│   ├── types/
│   │   └── ai.ts
│   ├── utils/
│   │   ├── device.ts
│   │   ├── tauriStore.ts
│   │   └── themeStorage.ts
│   ├── App.vue
│   ├── main.ts
│   └── vite-env.d.ts
├── src-tauri/
│   ├── capabilities/
│   │   ├── default.json
│   │   └── desktop.json
│   ├── icons/
│   ├── src/
│   │   ├── app_setup.rs
│   │   ├── backup.rs
│   │   ├── fuzzy_search.rs
│   │   ├── keywords.rs
│   │   ├── lib.rs
│   │   ├── main.rs
│   │   ├── screenshot.rs
│   │   ├── tray.rs
│   │   ├── webdav.rs
│   │   └── window.rs
│   ├── .gitignore
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json
├── .gitignore
├── README.md
├── app-icon.png
├── components.json
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 关键文件说明

### 1. 前端核心文件
- **src/App.vue** - 应用入口组件
- **src/main.ts** - 前端应用入口，初始化 Vue 应用
- **src/router/index.ts** - 路由配置，定义应用页面路由
- **src/core/layouts/CoreLayout.vue** - 桌面端核心布局组件
- **src/core/pages/DataTestPage.vue** - 数据库测试页面，用于测试各数据表的增删改查功能
- **src/core/pages/test.vue** - UI组件测试页面，用于测试UI组件功能
- **src/components/AppSidebar.vue** - 应用侧边栏组件
- **src/components/ModeToggle.vue** - 主题切换组件
- **src/components/ThemeProvider.vue** - 主题提供组件，管理全局主题

### 2. 状态管理与工具
- **src/stores/setting.ts** - 设置状态管理（主题、UI缩放等）
- **src/stores/sidebar.ts** - 侧边栏状态管理
- **src/composables/useTheme.ts** - 主题管理组合式函数
- **src/utils/tauriStore.ts** - Tauri 存储工具，封装 store 插件调用
- **src/utils/themeStorage.ts** - 主题存储工具，适配不同环境
- **src/utils/device.ts** - 设备检测工具

### 3. 国际化
- **src/i18n/index.ts** - i18n 初始化配置
- **src/hooks/useI18n.ts** - 国际化钩子函数
- **src/locales/en.json** - 英文语言包
- **src/locales/zh.json** - 中文语言包

### 4. UI 组件库
- **src/components/ui/**

### 5. Tauri 核心文件
- **src-tauri/Cargo.toml** - Rust 依赖配置，管理 Tauri 插件版本
- **src-tauri/tauri.conf.json** - Tauri 应用配置，包含窗口、安全等设置
- **src-tauri/capabilities/default.json** - Tauri 2.x 权限配置，控制命令访问
- **src-tauri/src/lib.rs** - Rust 库入口，注册 Tauri 命令和插件
- **src-tauri/src/main.rs** - Rust 主入口，初始化 Tauri 应用

### 6. 构建配置
- **package.json** - 前端依赖和脚本配置
- **vite.config.ts** - Vite 构建配置
- **tsconfig.json** - TypeScript 配置
- **tailwind.config.ts** - Tailwind CSS 配置
- **postcss.config.mjs** - PostCSS 配置

### 7. 数据库相关
- **src/db/index.ts** - 数据库初始化和连接管理
- **src/db/tags.ts** - 标签表操作
- **src/db/notes.ts** - 笔记表操作
- **src/db/marks.ts** - 标记表操作
- **src/db/chats.ts** - 聊天记录表操作
- **src/db/vector.ts** - 向量文档表操作

## 架构特点

### 1. 清晰的分层架构
- **components/** - UI 组件
- **core/** - 核心业务逻辑和页面
- **mobile/** - 移动端特定实现
- **shared/** - 共享组件和工具
- **utils/** - 通用工具函数

# 环境配置
- PS C:\Users\ASUS> node --version
  v22.20.0
- PS C:\Users\ASUS> npm --version
  10.9.3
- PS C:\Users\ASUS> rustc --version
  rustc 1.91.1 (ed61e7d7e 2025-11-07)
- PS C:\Users\ASUS> cargo --version
  cargo 1.91.1 (ea2d97820 2025-10-10)
- PS C:\Users\ASUS> npm exec tauri --version
  10.9.3
- PS C:\Users\ASUS> java -version
  openjdk version "21.0.2" 2024-01-16
  OpenJDK Runtime Environment (build 21.0.2+13-58)
  OpenJDK 64-Bit Server VM (build 21.0.2+13-58, mixed mode, sharing)
- PS C:\Users\ASUS> python --version
  Python 3.13.9

## 1. 前端技术栈

| 技术/依赖              | 版本      | 用途                 |
| ------------------ | ------- | ------------------ |
| Vue                | ^3.5.13 | 前端框架               |
| TypeScript         | ~5.6.2  | 类型系统               |
| Vite               | ^6.0.3  | 构建工具               |
| @vitejs/plugin-vue | ^5.2.1  | Vue 3 Vite 插件      |
| vue-tsc            | ^2.1.10 | Vue TypeScript 编译器 |

## 4. 环境配置

### 开发服务器配置
- 开发服务器端口：1420
- HMR (热模块替换) 端口：1421
- 开发 URL：http://localhost:1420
- 构建输出目录：`../dist`

### 应用程序配置
- 应用名称：rikka-note
- 应用版本：0.1.0
- 应用标识符：com.RemnantSong.rikka-note
- 初始窗口大小：800x600
- 窗口标题：rikka-note
- 安全策略 CSP：null (未设置)