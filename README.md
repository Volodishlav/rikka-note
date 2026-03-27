# Rikka Note (六花笔记)

<div align="center">

一个基于 **Tauri 2.x** + **Vue 3** 开发的跨平台个人笔记应用。
具备 AI 辅助编辑、本地离线 OCR、信封加密隐私保护及多工作区管理等核心功能。

[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app/)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vuedotjs)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust)](https://www.rust-lang.org/)

</div>

---

## 🛠️ 核心功能特性

### 1. AI 智能辅助与知识增强
- **对话式编辑**: 支持与 AI 实时交互，提供文本润色、解释、重写及续写功能。
- **RAG (知识库增强)**: 通过检索增强生成技术，使 AI 能够基于笔记内容提供更精准的回答。
- **模型管理**: 适配 OpenAI 标准 API 协议，支持自定义模型参数及系统提示词 (Prompt)。

### 2. 本地离线 OCR 识别
- **系统原生 API**: 调用 Windows Native OCR (WinRT) 接口，实现全离线文字识别，保障数据隐私。
- **高效录入**: 提供截图识别与图片文字批量提取功能。

### 3. 数据安全与隐私保护
- **信封加密架构 (DEK/KEK)**: 采用多层密钥管理方案。
- **加密标准**: 使用 Argon2id 算法进行密钥派生，结合 XChaCha20-Poly1305 进行核心数据加密存储。
- **多工作区隔离**: 支持创建独立的工作区，各工作区拥有独立的数据库文件与配置。

### 4. 笔记管理与同步
- **三栏布局**: 资源管理器 (Explorer)、编辑器 (Editor) 与 AI 助手 (Assistant) 的高效协作空间。
- **多端同步**: 集成 WebDAV 协议，支持第三方网盘备份与同步。
- **高级渲染**: 支持 Markdown、MathJax/KaTeX 公式、Mermaid 图表及 ECharts 数据可视化。

---

## 📂 项目结构树

```text
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