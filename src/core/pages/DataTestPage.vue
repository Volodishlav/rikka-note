<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from '@/hooks/useI18n.ts'
import { Button } from '@/components/ui/button'
import { UiInput } from '@/components/ui'
import { useToast } from '@/composables/useToast'

// 导入数据库表操作接口
import { getTags, insertTag, updateTag, delTag, type Tag } from '@/db/tags'
import { insertNote, getNoteByTagId, getNoteById, type Note } from '@/db/notes'
import { getMarks, insertMark, updateMark, delMark, type Mark } from '@/db/marks'
import { getChats, insertChat, updateChat, deleteChat, type Chat, type Role, type ChatType } from '@/db/chats'
import { upsertVectorDocument, getVectorDocumentsByFilename, deleteVectorDocumentsByFilename, type VectorDocument } from '@/db/vector'

const { t } = useI18n()
const toast = useToast()

// ========== 数据库测试相关状态 ==========
// Tags表测试
const tags = ref<Tag[]>([])
const newTagName = ref('')
const updateTagName = ref('')
const selectedTagId = ref<number | null>(null)

// Notes表测试
const newNoteContent = ref('')
const newNoteTagId = ref<string>('1')
const noteByTagId = ref<Note | null>(null)

// Marks表测试
const newMark = ref<{
  tagId: string
  type: Mark['type']
  content?: string
  desc?: string
  url: string
}>({
  tagId: '1',
  type: 'text',
  content: '',
  desc: '',
  url: ''
})
const marks = ref<Mark[]>([])

// Chats表测试
const newChat = ref<{
  tagId: string
  content?: string
  role: Role
  type: ChatType
  image?: string
  inserted: boolean
}>({
  tagId: '1',
  content: '',
  role: 'user',
  type: 'chat',
  inserted: false
})
const chats = ref<Chat[]>([])

// Vector表测试
const newVectorDoc = ref<{
  filename: string
  chunk_id: string
  content: string
  embedding: string
}>({
  filename: 'test.txt',
  chunk_id: '0',
  content: '测试内容',
  embedding: JSON.stringify([0.1, 0.2, 0.3])
})
const vectorDocs = ref<VectorDocument[]>([])

// ========== 数据库测试函数 ==========
// Tags表测试函数
async function loadTags() {
  try {
    tags.value = await getTags()
    toast.success('加载成功', '标签数据已加载')
  } catch (error) {
    console.error('加载标签失败:', error)
    toast.error('加载失败', '标签数据加载失败')
  }
}

async function addTag() {
  if (!newTagName.value.trim()) {
    toast.warning('输入错误', '请输入标签名称')
    return
  }
  
  try {
    await insertTag({ name: newTagName.value.trim() })
    console.log('添加标签:', { name: newTagName.value.trim() })
    toast.success('添加成功', '标签已添加')
    newTagName.value = ''
    await loadTags()
  } catch (error) {
    console.error('添加标签失败:', error)
    toast.error('添加失败', '标签添加失败')
  }
}

async function updateSelectedTag() {
  if (!selectedTagId.value || !updateTagName.value.trim()) {
    toast.warning('输入错误', '请选择标签并输入新名称')
    return
  }
  
  try {
    await updateTag({ id: selectedTagId.value, name: updateTagName.value.trim(), isLocked: false, isPin: false })
    toast.success('更新成功', '标签已更新')
    updateTagName.value = ''
    selectedTagId.value = null
    await loadTags()
  } catch (error) {
    console.error('更新标签失败:', error)
    toast.error('更新失败', '标签更新失败')
  }
}

async function deleteSelectedTag() {
  if (!selectedTagId.value) {
    toast.warning('操作错误', '请选择要删除的标签')
    return
  }
  
  try {
    await delTag(selectedTagId.value)
    toast.success('删除成功', '标签已删除')
    selectedTagId.value = null
    await loadTags()
  } catch (error) {
    console.error('删除标签失败:', error)
    toast.error('删除失败', '标签删除失败')
  }
}

// Notes表测试函数
async function loadNoteByTagId() {
  try {
    const tagId = parseInt(newNoteTagId.value, 10)
    noteByTagId.value = await getNoteByTagId(tagId)
    toast.success('加载成功', '笔记数据已加载')
  } catch (error) {
    console.error('加载笔记失败:', error)
    toast.error('加载失败', '笔记数据加载失败')
  }
}

async function addNote() {
  if (!newNoteContent.value.trim()) {
    toast.warning('输入错误', '请输入笔记内容')
    return
  }
  
  try {
    const tagId = parseInt(newNoteTagId.value, 10)
    await insertNote({ tagId, content: newNoteContent.value.trim(), locale: 'zh', count: newNoteContent.value.trim().length.toString() })
    toast.success('添加成功', '笔记已添加')
    newNoteContent.value = ''
    await loadNoteByTagId()
  } catch (error) {
    console.error('添加笔记失败:', error)
    toast.error('添加失败', '笔记添加失败')
  }
}

// Marks表测试函数
async function loadMarks() {
  try {
    const tagId = parseInt(newMark.value.tagId, 10)
    marks.value = await getMarks(tagId)
    toast.success('加载成功', '标记数据已加载')
  } catch (error) {
    console.error('加载标记失败:', error)
    toast.error('加载失败', '标记数据加载失败')
  }
}

async function addMark() {
  if (!newMark.value.content?.trim() || !newMark.value.url) {
    toast.warning('输入错误', '请输入标记内容和URL')
    return
  }
  
  try {
    const markData = {
      ...newMark.value,
      tagId: parseInt(newMark.value.tagId, 10)
    }
    await insertMark(markData)
    toast.success('添加成功', '标记已添加')
    newMark.value.content = ''
    newMark.value.desc = ''
    newMark.value.url = ''
    await loadMarks()
  } catch (error) {
    console.error('添加标记失败:', error)
    toast.error('添加失败', '标记添加失败')
  }
}

// Chats表测试函数
async function loadChats() {
  try {
    const tagId = parseInt(newChat.value.tagId, 10)
    chats.value = await getChats(tagId)
    toast.success('加载成功', '聊天数据已加载')
  } catch (error) {
    console.error('加载聊天失败:', error)
    toast.error('加载失败', '聊天数据加载失败')
  }
}

async function addChat() {
  if (!newChat.value.content?.trim()) {
    toast.warning('输入错误', '请输入聊天内容')
    return
  }
  
  try {
    const chatData = {
      ...newChat.value,
      tagId: parseInt(newChat.value.tagId, 10)
    }
    await insertChat(chatData)
    toast.success('添加成功', '聊天记录已添加')
    newChat.value.content = ''
    await loadChats()
  } catch (error) {
    console.error('添加聊天失败:', error)
    toast.error('添加失败', '聊天记录添加失败')
  }
}

// Vector表测试函数
async function loadVectorDocs() {
  try {
    vectorDocs.value = await getVectorDocumentsByFilename(newVectorDoc.value.filename)
    toast.success('加载成功', '向量文档已加载')
  } catch (error) {
    console.error('加载向量文档失败:', error)
    toast.error('加载失败', '向量文档加载失败')
  }
}

async function addVectorDoc() {
  if (!newVectorDoc.value.filename.trim() || !newVectorDoc.value.content.trim()) {
    toast.warning('输入错误', '请输入文件名和内容')
    return
  }
  
  try {
    const vectorData = {
      ...newVectorDoc.value,
      chunk_id: parseInt(newVectorDoc.value.chunk_id, 10),
      updated_at: Date.now()
    }
    await upsertVectorDocument(vectorData)
    toast.success('添加成功', '向量文档已添加/更新')
    const currentChunkId = parseInt(newVectorDoc.value.chunk_id, 10)
    newVectorDoc.value.chunk_id = (currentChunkId + 1).toString()
    await loadVectorDocs()
  } catch (error) {
    console.error('添加向量文档失败:', error)
    toast.error('添加失败', '向量文档添加失败')
  }
}

async function deleteVectorDocs() {
  try {
    await deleteVectorDocumentsByFilename(newVectorDoc.value.filename)
    toast.success('删除成功', '向量文档已删除')
    vectorDocs.value = []
  } catch (error) {
    console.error('删除向量文档失败:', error)
    toast.error('删除失败', '向量文档删除失败')
  }
}
</script>

<template>
  <main class="m-0 pt-8 flex flex-col justify-start items-center gap-8">
    <h1>数据测试页面</h1>

    <!-- ========== 数据库测试区域 ========== -->
    <div class="max-w-[1200px] mx-auto p-8">
      <h2 class="text-2xl font-bold mb-8">数据库表测试</h2>

      <!-- Tags表测试 -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Tags表测试</h3>
        
        <!-- 添加标签 -->
        <div class="mb-6">
          <h4 class="text-lg font-medium mb-2">添加标签</h4>
          <div class="flex gap-2">
            <UiInput v-model="newTagName" placeholder="输入标签名称" />
            <Button variant="default" @click="addTag">添加</Button>
          </div>
        </div>

        <!-- 更新/删除标签 -->
        <div class="mb-6">
          <h4 class="text-lg font-medium mb-2">更新/删除标签</h4>
          <div class="flex gap-2 mb-2">
            <select v-model="selectedTagId" class="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <option value="">选择标签</option>
              <option v-for="tag in tags" :key="tag.id" :value="tag.id">
                {{ tag.name }} ({{ tag.id }})
              </option>
            </select>
            <UiInput v-model="updateTagName" placeholder="输入新名称" />
            <Button variant="secondary" @click="updateSelectedTag" :disabled="!selectedTagId">更新</Button>
            <Button variant="destructive" @click="deleteSelectedTag" :disabled="!selectedTagId">删除</Button>
          </div>
        </div>

        <!-- 标签列表 -->
        <div>
          <h4 class="text-lg font-medium mb-2">标签列表</h4>
          <Button variant="default" @click="loadTags">加载标签</Button>
          <div class="mt-4 max-h-60 overflow-y-auto">
            <table class="min-w-full divide-y divide-border">
              <thead class="bg-muted">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">名称</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">锁定</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">置顶</th>
                </tr>
              </thead>
              <tbody class="bg-background divide-y divide-border">
                <tr v-for="tag in tags" :key="tag.id">
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ tag.id }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ tag.name }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ tag.isLocked ? '是' : '否' }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ tag.isPin ? '是' : '否' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Notes表测试 -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Notes表测试</h3>
        
        <!-- 添加笔记 -->
        <div class="mb-6">
          <h4 class="text-lg font-medium mb-2">添加笔记</h4>
          <div class="flex gap-2 mb-2">
            <UiInput v-model="newNoteTagId" placeholder="标签ID" type="number" />
            <UiInput v-model="newNoteContent" placeholder="输入笔记内容" class="flex-1" />
            <Button variant="default" @click="addNote">添加</Button>
          </div>
        </div>

        <!-- 加载笔记 -->
        <div class="mb-6">
          <h4 class="text-lg font-medium mb-2">加载笔记</h4>
          <div class="flex gap-2">
            <UiInput v-model="newNoteTagId" placeholder="标签ID" type="number" />
            <Button variant="default" @click="loadNoteByTagId">加载最新笔记</Button>
          </div>
          <div v-if="noteByTagId" class="mt-4 p-4 border border-border rounded-md">
            <p class="text-sm text-muted-foreground mb-1">ID: {{ noteByTagId.id }}</p>
            <p class="text-sm text-muted-foreground mb-1">标签ID: {{ noteByTagId.tagId }}</p>
            <p class="text-sm text-muted-foreground mb-1">语言: {{ noteByTagId.locale }}</p>
            <p class="text-sm text-muted-foreground mb-1">创建时间: {{ new Date(noteByTagId.createdAt).toLocaleString() }}</p>
            <p class="mt-2">{{ noteByTagId.content }}</p>
          </div>
        </div>
      </div>

      <!-- Marks表测试 -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Marks表测试</h3>
        
        <!-- 添加标记 -->
        <div class="mb-6">
          <h4 class="text-lg font-medium mb-2">添加标记</h4>
          <div class="space-y-2">
            <div class="flex gap-2">
              <UiInput v-model="newMark.tagId" placeholder="标签ID" type="number" />
              <select v-model="newMark.type" class="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="scan">扫描</option>
                <option value="text">文本</option>
                <option value="image">图片</option>
                <option value="link">链接</option>
                <option value="file">文件</option>
              </select>
            </div>
            <div class="flex gap-2">
              <UiInput v-model="newMark.content" placeholder="内容" class="flex-1" />
              <UiInput v-model="newMark.desc" placeholder="描述" class="flex-1" />
            </div>
            <div class="flex gap-2">
              <UiInput v-model="newMark.url" placeholder="URL" class="flex-1" />
              <Button variant="default" @click="addMark">添加</Button>
            </div>
          </div>
        </div>

        <!-- 标记列表 -->
        <div>
          <h4 class="text-lg font-medium mb-2">标记列表</h4>
          <Button variant="default" @click="loadMarks">加载标记</Button>
          <div class="mt-4 max-h-60 overflow-y-auto">
            <table class="min-w-full divide-y divide-border">
              <thead class="bg-muted">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">标签ID</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">类型</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">状态</th>
                </tr>
              </thead>
              <tbody class="bg-background divide-y divide-border">
                <tr v-for="mark in marks" :key="mark.id">
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ mark.id }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ mark.tagId }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ mark.type }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ mark.deleted ? '已删除' : '正常' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Chats表测试 -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Chats表测试</h3>
        
        <!-- 添加聊天记录 -->
        <div class="mb-6">
          <h4 class="text-lg font-medium mb-2">添加聊天记录</h4>
          <div class="space-y-2">
            <div class="flex gap-2">
              <UiInput v-model="newChat.tagId" placeholder="标签ID" type="number" />
              <select v-model="newChat.role" class="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="user">用户</option>
                <option value="system">系统</option>
              </select>
              <select v-model="newChat.type" class="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="chat">聊天</option>
                <option value="note">笔记</option>
                <option value="clipboard">剪贴板</option>
                <option value="clear">清除</option>
              </select>
            </div>
            <div class="flex gap-2">
              <UiInput v-model="newChat.content" placeholder="聊天内容" class="flex-1" />
              <Button variant="default" @click="addChat">添加</Button>
            </div>
          </div>
        </div>

        <!-- 聊天记录列表 -->
        <div>
          <h4 class="text-lg font-medium mb-2">聊天记录列表</h4>
          <Button variant="default" @click="loadChats">加载聊天记录</Button>
          <div class="mt-4 max-h-60 overflow-y-auto">
            <table class="min-w-full divide-y divide-border">
              <thead class="bg-muted">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">标签ID</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">角色</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">类型</th>
                </tr>
              </thead>
              <tbody class="bg-background divide-y divide-border">
                <tr v-for="chat in chats" :key="chat.id">
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ chat.id }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ chat.tagId }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ chat.role }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ chat.type }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Vector表测试 -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Vector表测试</h3>
        
        <!-- 添加向量文档 -->
        <div class="mb-6">
          <h4 class="text-lg font-medium mb-2">添加向量文档</h4>
          <div class="space-y-2">
            <div class="flex gap-2">
              <UiInput v-model="newVectorDoc.filename" placeholder="文件名" />
              <UiInput v-model="newVectorDoc.chunk_id" placeholder="分块ID" type="number" />
            </div>
            <div class="flex gap-2">
              <UiInput v-model="newVectorDoc.content" placeholder="内容" class="flex-1" />
              <UiInput v-model="newVectorDoc.embedding" placeholder="向量JSON" class="flex-1" />
            </div>
            <div class="flex gap-2">
              <Button variant="default" @click="addVectorDoc">添加/更新</Button>
              <Button variant="default" @click="loadVectorDocs">加载文档</Button>
              <Button variant="destructive" @click="deleteVectorDocs">删除文件</Button>
            </div>
          </div>
        </div>

        <!-- 向量文档列表 -->
        <div>
          <h4 class="text-lg font-medium mb-2">向量文档列表</h4>
          <div class="mt-4 max-h-60 overflow-y-auto">
            <table class="min-w-full divide-y divide-border">
              <thead class="bg-muted">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">文件名</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">分块ID</th>
                </tr>
              </thead>
              <tbody class="bg-background divide-y divide-border">
                <tr v-for="doc in vectorDocs" :key="doc.id">
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ doc.id }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ doc.filename }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-foreground">{{ doc.chunk_id }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
</style>