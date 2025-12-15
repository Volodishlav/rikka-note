// src/i18n/index.ts
import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import zh from '../locales/zh.json'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'

// 消息集合：后续可把更多语言放入这里
const messages = {
    en,
    zh,
}

// 初始语言：优先来源 localStorage（或可改用 Pinia / Tauri store）
const saved = localStorage.getItem('locale') || 'zh'

export const i18n = createI18n({
    legacy: false,       // 使用 composition API 风格
    locale: saved,
    fallbackLocale: 'en',
    messages,
})

/**
 * 工具：切换语言并同步 dayjs
 */
export function setLocale(locale: string) {
    // 更新 i18n 运行时 locale
    (i18n.global as any).locale.value = locale
    // persist
    localStorage.setItem('locale', locale)
    // dayjs 切换（注意：dayjs 的 locale 名称可能与 i18n key 一致或需要映射）
    const dayjsLocale = locale === 'zh' ? 'zh-cn' : 'en'
    dayjs.locale(dayjsLocale)
}

export default i18n