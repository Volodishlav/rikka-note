<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from '@/hooks/useI18n.ts'
import { useSettingStore } from '@/stores/setting'

const { t, changeLocale } = useI18n()
const settingStore = useSettingStore()
const greetMsg = ref("");
const name = ref("");

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
})
</script>

<template>
  <main class="container">
    <h1>Welcome to Tauri + Vue</h1>
    
    <!-- 主题切换测试区域 -->
    <div class="test-section">
      <h2>主题切换测试</h2>
      <div class="theme-info">
        <p>当前主题: {{ settingStore.theme }}</p>
        <p>实际应用: {{ themeClass ? 'dark' : 'light' }}</p>
      </div>
      <button class="theme-toggle-btn" @click="toggleTheme">
        切换主题 (当前: {{ settingStore.theme }})
      </button>
    </div>
    
    <!-- 原有内容 -->
    <div>
      <h1>{{ t('navigation.record') }}</h1>
      <button @click="changeLocale('en')">EN</button>
      <button @click="changeLocale('zh')">中文</button>
    </div>
    <div class="row">
      <a href="https://vite.dev" target="_blank">
        <img src="/vite.svg" class="logo vite" alt="Vite logo" />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="/src/assets/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>

    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <p>{{ greetMsg }}</p>
  </main>
</template>

<style scoped>
.logo.vite:hover {
  filter: drop-shadow(0 0 2em #747bff);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #249b73);
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  gap: 2rem;
}

/* 测试区域样式 */
.test-section {
  background-color: var(--card-bg, #ffffff);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 2rem auto;
  max-width: 500px;
  transition: background-color 0.3s ease;
}

.test-section h2 {
  margin-bottom: 1rem;
  color: var(--foreground, #0f0f0f);
}

.theme-info {
  margin-bottom: 1.5rem;
  text-align: left;
  line-height: 1.6;
}

.theme-toggle-btn {
  background-color: #646cff;
  color: white;
  border: none;
  padding: 0.8em 1.5em;
  font-size: 1em;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.theme-toggle-btn:hover {
  background-color: #535bf2;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.theme-toggle-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: 0.75s;
}

.logo.tauri:hover {
  filter: drop-shadow(0 0 2em #24c8db);
}

.row {
  display: flex;
  justify-content: center;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
  transition: color 0.3s ease;
}

.dark a {
  color: #818cf8;
}

a:hover {
  color: #535bf2;
}

.dark a:hover {
  color: #24c8db;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: all 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

.dark input,
.dark button {
  color: #ffffff;
  background-color: #0f0f0f98;
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}

.dark button:hover {
  border-color: #24c8db;
}

button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

.dark button:active {
  background-color: #0f0f0f69;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}
</style>