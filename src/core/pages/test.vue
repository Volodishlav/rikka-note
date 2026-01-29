<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from '@/hooks/useI18n.ts'
import { useSettingStore } from '@/stores/setting'
// 导入UI组件库
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogClose, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
// 导入新的Toast系统
import { useToast } from '@/composables/useToast'

const { t, changeLocale, locale } = useI18n()
const settingStore = useSettingStore()
const greetMsg = ref("");
const name = ref("");
// 新Toast系统实例
const toast = useToast()

// RootLayout 测试相关变量
const isSettingInit = ref(false)
import dayjs from 'dayjs'

// 计算当前日期，使用本地化格式
const currentDate = computed(() => {
  // 根据当前locale动态调整日期格式
  if (locale.value === 'en') {
    // 英文格式: MM/DD/YYYY HH:mm:ss
    return dayjs().format('MM/DD/YYYY HH:mm:ss')
  } else {
    // 中文格式: YYYY-MM-DD HH:mm:ss
    return dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
})

// UI缩放处理方法
function handleUiScaleChange(e: Event) {
  const target = e.target as HTMLInputElement
  settingStore.setUiScale(Number(target.value))
}

// 计算当前主题类名
const themeClass = computed(() => {
  if (settingStore.theme === 'system') {
    // 检测系统主题
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : ''
  }
  return settingStore.theme === 'dark' ? 'dark' : ''
})

// 主题切换函数
async function toggleTheme() {
  const currentTheme = settingStore.theme
  let newTheme: 'light' | 'dark' | 'system' = 'light'
  
  if (currentTheme === 'light') {
    newTheme = 'dark'
  } else if (currentTheme === 'dark') {
    newTheme = 'system'
  }
  
  await settingStore.setTheme(newTheme)
  console.log('主题已切换为:', newTheme)
}

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsg.value = await invoke("greet", { name: name.value });
}

// 添加系统主题变化监听
onMounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    // 当系统主题变化且当前主题设置为system时，重新计算themeClass
    if (settingStore.theme === 'system') {
      console.log('系统主题已变化')
    }
  })
  
  // 标记设置已初始化
  isSettingInit.value = true
})

// ========== UI组件测试相关状态 ==========
// Button测试
const buttonClicked = ref(false)
const buttonLoading = ref(false)

async function handleButtonClick() {
  buttonLoading.value = true
  buttonClicked.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  buttonLoading.value = false
}

// Input测试
const inputValue = ref('')
const inputError = ref(false)

function handleInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  inputValue.value = target.value
  inputError.value = target.value.length < 3
}

// Dialog测试




// Tooltip测试
const tooltipContent = ref('这是一个Tooltip提示')
</script>

<template>
  <main class="m-0 pt-[10vh] flex flex-col justify-center items-center gap-8">
    <h1>Welcome to Tauri + Vue</h1>
    <div>
      <h1>{{ t('navigation.record') }}</h1>
      <button class="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="changeLocale('en')">EN</button>
      <button class="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="changeLocale('zh')">中文</button>
    </div>
    <!-- 主题切换测试区域 -->
    <div class="bg-card rounded-xl p-8 shadow-md max-w-[500px] transition-colors">
      <h2 class="mb-4 text-foreground">主题切换测试</h2>
      <div class="mb-6 text-left leading-relaxed">
        <p>当前主题: {{ settingStore.theme }}</p>
        <p>实际应用: {{ themeClass ? 'dark' : 'light' }}</p>
      </div>
      <button class="mt-4 bg-[#646cff] text-white border-none px-6 py-3 text-base font-semibold rounded-lg cursor-pointer transition-all hover:bg-[#535bf2] hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:shadow-md" @click="toggleTheme">
        切换主题 (当前: {{ settingStore.theme }})
      </button>
    </div>

    <!-- RootLayout 功能测试 -->
    <div class="bg-card rounded-xl p-8 shadow-md max-w-[500px] transition-colors">
      <h2 class="mb-4 text-foreground">RootLayout 功能测试</h2>
      
      <div class="mb-6">
        <h3 class="text-lg font-medium mb-2">1. UI缩放测试</h3>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <label for="ui-scale">缩放比例: {{ settingStore.uiScale }}%</label>
            <input 
              id="ui-scale" 
              type="range" 
              min="80" 
              max="120" 
              step="5" 
              :value="settingStore.uiScale" 
              @input="handleUiScaleChange" 
              class="flex-1"
            >
          </div>
          <div class="flex gap-2">
            <button class="rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="settingStore.setUiScale(80)">80%</button>
            <button class="rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="settingStore.setUiScale(90)">90%</button>
            <button class="rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="settingStore.setUiScale(100)">100%</button>
            <button class="rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="settingStore.setUiScale(110)">110%</button>
            <button class="rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="settingStore.setUiScale(120)">120%</button>
          </div>
        </div>
      </div>
      
      <div class="mb-6">
        <h3 class="text-lg font-medium mb-2">2. 语言切换测试</h3>
        <div class="flex gap-2">
          <button class="rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="changeLocale('zh')">中文</button>
          <button class="rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all" @click="changeLocale('en')">English</button>
        </div>
        <p class="mt-2">当前语言: {{ locale }}</p>
      </div>
      
      <div class="mb-6">
        <h3 class="text-lg font-medium mb-2">3. dayjs locale 测试</h3>
        <p>当前日期: {{ currentDate }}</p>
        <p>日期格式会随语言切换而变化</p>
      </div>
      
      <div class="mb-6">
        <h3 class="text-lg font-medium mb-2">4. 初始化状态测试</h3>
        <p>设置已初始化: {{ isSettingInit }}</p>
      </div>
    </div>

    <!-- ========== UI组件测试区域 ========== -->
    <div class="max-w-[1200px] mx-auto p-8">
      <h2 class="text-2xl font-bold mb-6">UI组件库测试</h2>

      <!-- Button组件测试 -->
      <div class="bg-card border border-border rounded-lg p-8 mb-8 transition-all hover:shadow-md">
        <h3 class="text-xl font-semibold mb-4">Button组件</h3>
        <div class="flex flex-wrap gap-4">
          <Button variant="default" @click="handleButtonClick">
            主要按钮
          </Button>
          <Button variant="secondary">
            次要按钮
          </Button>
          <Button variant="destructive">
            危险按钮
          </Button>
          <Button variant="ghost">
            幽灵按钮
          </Button>
          <Button variant="default" size="sm">
            小按钮
          </Button>
          <Button variant="default" size="lg">
            大按钮
          </Button>
          <Button variant="default" disabled class="relative">
            <span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            加载按钮
          </Button>
          <Button variant="default" disabled>
            禁用按钮
          </Button>
        </div>
        <p class="mt-4 text-sm text-muted-foreground">
          按钮点击状态: {{ buttonClicked ? '已点击' : '未点击' }}
        </p>
      </div>

      <!-- Input组件测试 -->
      <div class="bg-card border border-border rounded-lg p-8 mb-8 transition-all hover:shadow-md">
        <h3 class="text-xl font-semibold mb-4">Input组件</h3>
        <div class="flex flex-col gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">标准输入框</label>
            <Input placeholder="请输入内容" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">带值的输入框</label>
            <Input v-model="inputValue" placeholder="至少3个字符" @input="handleInputChange" :class="{ 'border-destructive focus-visible:ring-destructive': inputError }" />
            <p v-if="inputError" class="mt-1 text-xs text-destructive">
              内容长度至少3个字符
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">小尺寸输入框</label>
            <Input placeholder="小尺寸" class="h-8 px-3" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">大尺寸输入框</label>
            <Input placeholder="大尺寸" class="h-12 px-5" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">禁用输入框</label>
            <Input placeholder="禁用" disabled />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">只读输入框</label>
            <Input placeholder="只读" readonly value="只读内容" />
          </div>
        </div>
      </div>

      <!-- Dialog组件测试 -->
      <div class="bg-card border border-border rounded-lg p-8 mb-8 transition-all hover:shadow-md">
        <h3 class="text-xl font-semibold mb-4">Dialog组件</h3>
        <Dialog>
          <DialogTrigger as-child>
            <Button variant="default">
              打开对话框
            </Button>
          </DialogTrigger>
          <DialogContent class="max-w-[500px]">
            <DialogTitle class="text-lg font-semibold mb-3">对话框标题</DialogTitle>
            <DialogDescription class="mb-4">
              这是对话框的内容区域。你可以在这里放置任何你想要的内容，包括表单、图片、文本等。
            </DialogDescription>
            <div class="flex justify-end gap-2">
              <DialogClose as-child>
                <Button variant="ghost">
                  取消
                </Button>
              </DialogClose>
              <DialogClose as-child>
                <Button variant="default">
                  确认
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <!-- Toast系统测试 -->
      <div class="bg-card border border-border rounded-lg p-8 mb-8 transition-all hover:shadow-md">
        <h3 class="text-xl font-semibold mb-4">Toast系统</h3>
        <div class="flex flex-wrap gap-4">
          <Button variant="default" @click="toast.success('保存成功', '已保存')">
            成功Toast
          </Button>
          <Button variant="default" @click="toast.error('操作失败', '请重试')">
            错误Toast
          </Button>
          <Button variant="default" @click="toast.warning('注意', '这是一个警告')">
            警告Toast
          </Button>
          <Button variant="default" @click="toast.info('提示', '这是一条信息')">
            信息Toast
          </Button>
          <Button variant="secondary" @click="toast.show({ title: '永驻Toast', message: '手动关闭', duration: 0 })">
            永驻Toast
          </Button>
        </div>
      </div>

      <!-- Tooltip组件测试 -->
      <div class="bg-card border border-border rounded-lg p-8 mb-8 transition-all hover:shadow-md">
        <h3 class="text-xl font-semibold mb-4">Tooltip组件</h3>
        <div class="flex flex-wrap gap-8">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="default">顶部Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>顶部提示</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="default">右侧Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>右侧提示</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="default">底部Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>底部提示</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="default">左侧Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>左侧提示</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
</style>