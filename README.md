# Rikka Note

一个使用 Vue 3 + Tauri 2.x 开发的跨平台笔记应用，支持桌面端和浏览器端，具备主题切换和多语言支持。

## 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 下一代前端构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Pinia** - 轻量级状态管理
- **Vue Router** - 官方路由管理器
- **Vue I18n** - 国际化解决方案

### 桌面端
- **Tauri 2.x** - 安全的跨平台桌面应用框架
- **Rust** - 系统级编程语言，用于 Tauri 后端

### 图标与样式
- **Lucide Vue Next** - 现代化 SVG 图标库
- **PostCSS** - CSS 处理工具

## 项目结构树
```
d:\graduation_project\rikka-note
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
│   │   │   ├── toast/
│   │   │   └── tooltip/
│   │   ├── AppSidebar.vue
│   │   ├── AppStatus.vue
│   │   ├── ModeToggle.vue
│   │   └── ThemeProvider.vue
│   ├── composables/
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
│   │       │   ├── AddTagDialog.vue
│   │       │   ├── TagItem.vue
│   │       │   ├── TagSelectDialog.vue
│   │       │   └── TagSidebar.vue
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
│   ├── lib
│   │   ├── path.ts
│   │   ├── locales.ts
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
│   │   ├── clipboard.ts
│   │   ├── index.ts
│   │   ├── setting.ts
│   │   ├── chat.ts
│   │   ├── tag.ts
│   │   └── sidebar.ts
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
- **src/components/ui/** - 基础 UI 组件库
  - Button.vue - 按钮组件
  - Dialog.vue - 对话框组件
  - Input.vue - 输入框组件
  - Toast.vue - 提示组件
  - Tooltip.vue - 工具提示组件

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

### 2. 响应式设计
- 适配桌面端和浏览器端
- 支持主题切换（Light / Dark / System）
- 支持系统主题自动切换

### 3. 跨平台兼容性
- 基于 Tauri 实现桌面端应用
- 支持浏览器端直接访问
- 统一的存储方案适配不同环境

### 4. 可扩展性
- 模块化的组件设计
- 基于 Pinia 的状态管理
- 可插拔的 UI 组件库

## 开发与构建

### 安装依赖
```bash
npm install
```

## 功能特性

### 1. 主题管理
- 支持 Light / Dark / System 三种主题模式
- 主题设置持久化存储
- 系统主题自动跟随
- 无闪烁主题切换效果

### 2. 国际化支持
- 多语言切换界面
- 语言设置持久化
- 支持扩展更多语言

### 3. 响应式布局
- 桌面端侧边栏布局
- 移动端适配
- 灵活的页面路由

### 4. 安全的存储
- 基于 Tauri Store 的安全存储
- 支持加密存储敏感信息
- 适配浏览器本地存储

### 5. 完善的数据库功能
- 基于 SQLite 的本地数据库存储
- 支持标签、笔记、标记、聊天记录等多种数据类型
- 完整的增删改查操作支持
- 向量文档存储，支持AI语义搜索

## 技术亮点

1. **现代化前端技术栈** - 使用 Vue 3 + TypeScript + Vite 构建高性能应用
2. **安全的桌面应用** - 基于 Tauri 2.x 实现轻量、安全的桌面应用
3. **主题系统** - 完整的主题管理方案，支持多种主题模式和自动切换
4. **组件化设计** - 可复用的 UI 组件库，提高开发效率
5. **国际化支持** - 完善的多语言支持方案

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

## 2. Tauri 相关

### 前端 Tauri 依赖
| 依赖 | 版本 | 用途 |
|------|------|------|
| @tauri-apps/api | ^2 | Tauri JavaScript API |
| @tauri-apps/plugin-opener | ^2 | Tauri 打开文件/URL 插件 |
| @tauri-apps/cli | ^2 | Tauri 命令行工具 |

### 后端 Rust Tauri 依赖
| 依赖 | 版本 | 用途 |
|------|------|------|
| tauri-build | 2 | Tauri 构建脚本 |
| tauri | 2 | Tauri 核心库 |
| tauri-plugin-opener | 2 | Tauri 文件/URL 打开插件 |

## 3. Rust 相关

| 依赖 | 版本 | 用途 |
|------|------|------|
| Rust Edition | 2021 | Rust 版本 |
| serde | 1 (with derive) | 序列化/反序列化库 |
| serde_json | 1 | JSON 处理库 |

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

## 5. 项目类型

- **架构**：基于 Vue 3 + TypeScript + Vite + Tauri 的桌面应用程序
- **后端语言**：Rust
- **前端框架**：Vue 3
- **构建工具**：Vite 6
- **类型系统**：TypeScript 5.6
- **开发模式**：热模块替换 (HMR)

## 6. 项目结构类型

- 前端代码位于 `src/` 目录
- Tauri 后端代码位于 `src-tauri/` 目录
- 静态资源位于 `public/` 目录
- 应用图标位于 `src-tauri/icons/` 目录