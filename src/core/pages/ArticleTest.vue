<template>
  <div class="article-test-container">
    <!-- 顶部操作栏 -->
    <header class="test-header">
      <h1>Article Store 测试页面</h1>
      <div class="header-actions">
        <button
            @click="refreshFileTree"
            :disabled="articleStore.fileTreeLoading"
            class="btn primary"
        >
          <span v-if="articleStore.fileTreeLoading">加载中...</span>
          <span v-else>刷新文件树</span>
        </button>
        <button @click="createNewFile" class="btn secondary">新建文件</button>
        <button @click="createNewFolder" class="btn secondary">新建文件夹</button>
        <button
            @click="toggleAllFolders"
            class="btn secondary"
        >
          {{ articleStore.collapsibleList.length > 0 ? '折叠所有' : '展开所有' }}
        </button>
      </div>
    </header>

    <!-- 错误提示 -->
    <div v-if="articleStore.errorMsg" class="error-alert">
      {{ articleStore.errorMsg }}
      <button @click="clearError" class="close-btn">×</button>
    </div>

    <div class="main-content">
      <!-- 左侧文件树 -->
      <aside class="file-tree-panel">
        <h2>文件树</h2>
        <div v-if="articleStore.fileTreeLoading" class="loading">加载文件树中...</div>
        <div v-else-if="articleStore.fileTree.length === 0" class="empty-state">
          暂无文件，请创建新文件/文件夹
        </div>
        <ul class="file-tree" v-else>
          <FileTreeNode
              v-for="node in articleStore.fileTree"
              :key="`${node.name}-${node.isDirectory ? 'dir' : 'file'}`"
              :node="node"
              :depth="0"
              @open-file="openFile"
              @create-file-in-folder="createFileInFolder"
              @create-folder-in-folder="createFolderInFolder"
          />
        </ul>
      </aside>

      <!-- 右侧编辑器 -->
      <main class="editor-panel">
        <div v-if="!activeFile" class="empty-editor">
          请从左侧选择或创建一个文件进行编辑
        </div>
        <div v-else class="editor">
          <div class="editor-header">
            <h3>{{ activeFile }}</h3>
            <button
                @click="saveArticle"
                :disabled="articleStore.loading"
                class="btn primary save-btn"
            >
              <span v-if="articleStore.loading">保存中...</span>
              <span v-else>保存文件</span>
            </button>
          </div>
          <textarea
              v-model="articleStore.currentArticle"
              :disabled="articleStore.loading"
              class="editor-content"
              placeholder="请输入Markdown内容..."
          ></textarea>
        </div>
      </main>
    </div>

    <!-- 所有文章列表（用于测试 loadAllArticle） -->
    <div class="all-articles-panel">
      <h2>所有文章列表</h2>
      <button @click="loadAllArticles" class="btn secondary">加载所有文章</button>
      <div v-if="articleStore.allArticle.length === 0" class="empty-state">
        暂无文章数据
      </div>
      <ul v-else class="articles-list">
        <li v-for="(article, index) in articleStore.allArticle" :key="index">
          <span class="article-path">{{ article.path }}</span>
          <button
              @click="openFile(article.path)"
              class="btn tiny"
          >
            打开
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useArticleStore } from '@/stores/article'
import { appDataDir, join } from '@tauri-apps/api/path'
import { exists, mkdir } from '@tauri-apps/plugin-fs'
import FileTreeNode from '@/core/pages/FileTreeNode.vue'

// 初始化 Store
const articleStore = useArticleStore()

// 计算属性：当前激活的文件路径
const activeFile = computed(() => articleStore.activeFilePath)

// 页面初始化
onMounted(async () => {
  try {
    // 初始化配置
    await articleStore.initHtml2md()
    await articleStore.initCollapsibleList()
    // 加载文件树
    await articleStore.loadFileTree()
  } catch (error) {
    console.error('页面初始化失败:', error)
    articleStore.errorMsg = '页面初始化失败，请刷新重试'
  }
})

// 刷新文件树
const refreshFileTree = async () => {
  await articleStore.loadFileTree()
}

// 创建新文件（根目录）
const createNewFile = async () => {
  await articleStore.newFile()
}

// 创建新文件夹（根目录）
const createNewFolder = async () => {
  try {
    // 直接在根目录创建带有默认名称的文件夹
    const appData = await appDataDir()
    const fullPath = await join(appData, 'article')
    
    // 生成新文件夹名
    let newFolderName = 'New Folder'
    let counter = 1
    
    // 检查文件夹是否已存在
    while (await exists(await join(fullPath, newFolderName))) {
      newFolderName = `New Folder ${counter}`
      counter++
    }
    
    // 创建新文件夹
    const newFolderPath = await join(fullPath, newFolderName)
    await mkdir(newFolderPath)
    
    // 重新加载文件树
    await articleStore.loadFileTree()
  } catch (error) {
    console.error('创建文件夹失败:', error)
  }
}

// 切换所有文件夹状态
const toggleAllFolders = async () => {
  await articleStore.toggleAllFolders()
}

// 打开文件
const openFile = async (path: string) => {
  await articleStore.readArticle(path)
  await articleStore.setActiveFilePath(path)
}

// 在指定文件夹创建文件
const createFileInFolder = async (folderPath: string) => {
  await articleStore.newFileOnFolder(folderPath)
}

// 在指定文件夹创建子文件夹
const createFolderInFolder = async (folderPath: string) => {
  await articleStore.newFolderInFolder(folderPath)
}

// 保存当前文章
const saveArticle = async () => {
  if (!activeFile.value) {
    articleStore.errorMsg = '请先选择或创建一个文件'
    return
  }

  await articleStore.saveCurrentArticle(articleStore.currentArticle)

  // 保存成功后刷新文件树（延迟确保文件写入完成）
  setTimeout(async () => {
    await articleStore.loadFileTree()
  }, 500)
}

// 加载所有文章
const loadAllArticles = async () => {
  await articleStore.loadAllArticle()
}

// 清除错误提示
const clearError = () => {
  articleStore.errorMsg = null
}
</script>

<style scoped>
.article-test-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

/* 顶部操作栏 */
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 按钮样式 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background-color: #4299e1;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background-color: #3182ce;
}

.btn.secondary {
  background-color: #f7fafc;
  color: #2d3748;
  border: 1px solid #e2e8f0;
}

.btn.secondary:hover:not(:disabled) {
  background-color: #edf2f7;
}

.btn.tiny {
  padding: 4px 8px;
  font-size: 12px;
}

/* 错误提示 */
.error-alert {
  background-color: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #dc2626;
}

/* 主内容区 */
.main-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

/* 文件树面板 */
.file-tree-panel {
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 16px;
  height: 600px;
  overflow-y: auto;
}

.file-tree-panel h2 {
  margin-top: 0;
  font-size: 18px;
  margin-bottom: 16px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #718096;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #718096;
  font-style: italic;
}

.file-tree {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* 编辑器面板 */
.editor-panel {
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 16px;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.empty-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #718096;
  font-style: italic;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.editor-header h3 {
  margin: 0;
  font-size: 16px;
  color: #2d3748;
}

.save-btn {
  white-space: nowrap;
}

.editor-content {
  flex: 1;
  width: 100%;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  resize: none;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  box-sizing: border-box;
}

/* 所有文章列表面板 */
.all-articles-panel {
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 16px;
}

.all-articles-panel h2 {
  margin-top: 0;
  font-size: 18px;
  margin-bottom: 16px;
}

.articles-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.articles-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f7fafc;
  border-radius: 4px;
}

.article-path {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #2d3748;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>