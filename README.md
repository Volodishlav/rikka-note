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
├── public/                     # 静态资源
├── src/                        # 前端源代码
│   ├── components/             # 通用 UI 组件
│   │   ├── ui/                 # 基础原子组件 (Shadcn 风格)
│   │   ├── AppSidebar.vue      # 全局侧边栏
│   │   ├── AppStatus.vue       # 状态显示
│   │   ├── ModeToggle.vue      # 主题切换
│   │   └── ThemeProvider.vue   # 主题配置
│   ├── composables/            # 组合式函数 (AI、主题、Toast等)
│   ├── core/                   # 核心业务逻辑
│   │   ├── layouts/            # 核心布局封装
│   │   └── pages/              # 业务页面
│   │       ├── article/        # 笔记编辑与文件管理 (MdEditor, FileManager)
│   │       ├── record/         # AI 聊天信息与标注管理 (Chat, Mark, Tag)
│   │       ├── setting/        # 应用设置 (AI 配置、通用设置)
│   │       └── ArticlePage.vue # 笔记主入口
│   ├── db/                     # 数据库模块 (chats, notes, marks, tags, vector)
│   ├── hooks/                  # 全局钩子
│   ├── i18n/                   # 国际化配置
│   ├── layouts/                # 根布局
│   ├── lib/                    # 核心逻辑库 (AI、本地化、工作区管理)
│   ├── locales/                # 多语言 JSON (zh, en)
│   ├── router/                 # Vue Router 路由配置
│   ├── shared/                 # 共享样式与页面
│   ├── stores/                 # Pinia 状态管理 (Chat, Article, Setting, Sidebar 等)
│   ├── types/                  # TypeScript 类型定义
│   ├── utils/                  # 工具函数 (Device, Theme, Storage)
│   ├── App.vue                 # 根组件
│   └── main.ts                 # 入口文件
├── src-tauri/                  # Tauri 后端源代码
│   ├── capabilities/           # 权限策略配置
│   ├── icons/                  # 应用图标
│   ├── src/                    # Rust 实现代码
│   │   ├── app_setup.rs        # 应用初始化
│   │   ├── backup.rs           # 备份逻辑
│   │   ├── fuzzy_search.rs     # 模糊搜索 (Jieba-rs)
│   │   ├── lib.rs              # Tauri 指令注册入口
│   │   ├── main.rs             # Rust 入口
│   │   ├── screenshot.rs       # 截图功能实现
│   │   ├── tray.rs             # 系统托盘
│   │   ├── webdav.rs           # WebDAV 实现
│   │   └── window.rs           # 窗口控制
│   ├── Cargo.toml              # Rust 依赖配置
│   ├── tauri.conf.json         # Tauri 核心配置
│   └── build.rs                # 构建脚本
├── dist/                       # 构建输出目录
├── index.html                  # HTML 入口
├── package.json                # 前端依赖与脚本定义
├── tailwind.config.ts          # Tailwind 配置
└── tsconfig.json               # TypeScript 配置
```

---

## 📝 核心文件说明

### 1. 前端架构文件
- **src/main.ts**: Vue 应用初始化入口。
- **src/router/index.ts**: 定义应用全局路由映射。
- **src/core/layouts/CoreLayout.vue**: 桌面端三栏协作核心布局。
- **src/db/index.ts**: 基于 `tauri-plugin-sql` 的数据库连接与初始化管理。

### 2. 状态与逻辑管理
- **src/stores/setting.ts**: 管理主题、界面缩放、AI 偏好等持久化配置。
- **src/lib/ai.ts**: 封装 AI 调用接口、Prompt 管理及流式响应逻辑。
- **src/lib/workspace.ts**: 管理多工作区切换、路径解析及独立数据库连接。

### 3. 数据存取模块
- **src/db/notes.ts**: 笔记及其 Frontmatter 数据的 CRUD 操作。
- **src/db/vector.ts**: 实现笔记内容的向量化存储，支撑 RAG 功能。

---

## 💻 环境配置要求

项目开发需预先配置以下开发环境并保证版本符合要求：

### 系统组件版本
- **Node.js**: `v22.20.0` 或更高版本
- **NPM**: `v10.9.3` 或更高版本
- **Rust**: `1.81.0` (推荐 Rust 2021 edition)
- **Cargo**: `1.81.0` 或更高版本
- **Java**: `OpenJDK 21.0.2` (相关构建链依赖)
- **Python**: `3.13.9` 或更高版本

### 核心技术栈
| 技术/依赖 | 版本 | 用途 |
| --- | --- | --- |
| Vue | `^3.5.13` | 渐进式 JavaScript 框架 |
| TypeScript | `~5.6.2` | 静态类型支持 |
| Vite | `^6.0.3` | 高度性能的构建工具 |
| Tauri | `^2.x` | 跨平台桌面应用开发框架 |

---

## ⚙️ 开发指南

### 端口与访问配置
- **开发服务器端口**: `1420`
- **HMR 端口**: `1421`
- **开发 URL**: `http://localhost:1420`
- **构建输出目录**: `./dist`

### 指令集
- **安装依赖**: `npm install`
- **开发模式运行**: `npm run dev` 或 `npx tauri dev`
- **生产环境构建**: `npm run build`

---

## ⚠️ 备注
- 本项目为毕业设计项目，代码与文档描述遵循客观事实原则。
- 文档中的部分功能（如 OCR 与加密）严重依赖 Windows 系统原生组件及特定的 Rust 库环境。

---
> Rikka Note - 致力于打造高效、隐私、智能的个人数字笔记中心。