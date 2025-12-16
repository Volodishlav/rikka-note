# UI组件库

基于 Vue 3 + Tailwind CSS + Radix Vue 构建的企业级UI组件库，专为Tauri 2.x应用设计。

## 组件列表

### 核心组件
- **UiButton** - 按钮组件，支持多种变体和尺寸
- **UiInput** - 输入框组件，支持多种尺寸和状态
- **UiDialog** - 对话框组件，支持模态对话框功能
- **UiToast** - 消息提示组件，支持多种类型和自动关闭
- **UiTooltip** - 提示组件，支持悬停提示功能

## 安装依赖

```bash
# 安装核心依赖
npm install @radix-ui/vue@latest @headlessui/vue

# 安装测试依赖
npm install -D vitest @vue/test-utils jsdom
```

## 使用方法

### 1. 导入组件

```typescript
// 导入单个组件
import UiButton from '@/components/ui/Button.vue'

// 或从聚合导出文件导入
import { UiButton, UiInput, UiDialog } from '@/components/ui'
```

### 2. 在组件中使用

```vue
<template>
  <UiButton variant="primary" size="md" @click="handleClick">
    点击按钮
  </UiButton>
  
  <UiInput v-model="inputValue" placeholder="请输入内容" />
  
  <UiDialog v-model="dialogOpen">
    <h3>对话框标题</h3>
    <p>对话框内容</p>
  </UiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiInput, UiDialog } from '@/components/ui'

const inputValue = ref('')
const dialogOpen = ref(false)

function handleClick() {
  dialogOpen.value = true
}
</script>
```

## 组件属性

### UiButton

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| variant | 'primary' \| 'secondary' \| 'destructive' \| 'ghost' | 'primary' | 按钮变体 |
| size | 'sm' \| 'md' \| 'lg' | 'md' | 按钮尺寸 |
| disabled | boolean | false | 是否禁用 |
| loading | boolean | false | 是否加载中 |
| className | string | '' | 自定义类名 |

### UiInput

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | string | 'text' | 输入框类型 |
| size | 'sm' \| 'md' \| 'lg' | 'md' | 输入框尺寸 |
| disabled | boolean | false | 是否禁用 |
| readonly | boolean | false | 是否只读 |
| error | boolean | false | 是否错误状态 |
| className | string | '' | 自定义类名 |
| placeholder | string | '' | 占位符文本 |

### UiDialog

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| modelValue | boolean | false | 是否显示对话框 |
| backdropClose | boolean | true | 是否可通过点击背景关闭 |
| escClose | boolean | true | 是否可通过ESC键关闭 |
| className | string | '' | 自定义类名 |

### UiToast

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | 'success' \| 'error' \| 'info' \| 'warning' | 'info' | 消息类型 |
| message | string | '' | 消息内容 |
| visible | boolean | false | 是否显示 |
| duration | number | 3000 | 自动关闭时间（毫秒） |
| closable | boolean | true | 是否可关闭 |
| className | string | '' | 自定义类名 |

### UiTooltip

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| content | string | '' | 提示内容 |
| position | 'top' \| 'right' \| 'bottom' \| 'left' | 'top' | 提示位置 |
| delay | number | 300 | 延迟显示时间（毫秒） |
| className | string | '' | 自定义类名 |
| contentClassName | string | '' | 自定义提示框类名 |

## 测试方法

### 1. 单元测试

使用 Vitest + Vue Test Utils 进行单元测试：

```bash
# 运行所有测试
npm run test

# 运行特定组件测试
npm run test -- Button.spec.ts
```

### 2. 集成测试

使用已添加的 `test.vue` 页面进行集成测试：

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问 `http://localhost:3000/test` 页面

3. 测试各个组件的功能：
   - **Button组件**：点击不同变体、尺寸和状态的按钮
   - **Input组件**：在输入框中输入内容，观察错误状态
   - **Dialog组件**：点击打开对话框，测试关闭功能
   - **Toast组件**：点击不同类型的Toast按钮，观察显示效果
   - **Tooltip组件**：将鼠标悬停在不同位置的按钮上，观察提示效果

## 开发规范

1. **组件命名**：使用 `PascalCase` 命名组件文件
2. **属性设计**：支持 `variant`/`size` 等通用属性
3. **样式规范**：使用 Tailwind CSS + CSS变量，保持与项目主题一致
4. **无障碍性**：确保组件支持键盘导航和ARIA属性
5. **类型安全**：使用 TypeScript 定义组件属性和事件
6. **文档注释**：为组件和属性添加详细的文档注释

## 主题配置

组件使用 `globals.scss` 中定义的 CSS 变量，支持明暗主题切换：

```scss
// 明主题变量
@theme {
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  // ... 其他变量
}

// 暗主题变量
@theme dark {
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  // ... 其他变量
}
```

## 版本管理

遵循 Semantic Versioning (SemVer) 规范：

- **MAJOR**：不兼容的API变更
- **MINOR**：向下兼容的新功能
- **PATCH**：向下兼容的问题修复

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request