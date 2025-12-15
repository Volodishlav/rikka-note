// src/composables/useI18n.ts
import { useI18n as useVueI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'

export function useI18n() {
    const { t, locale } = useVueI18n()
    function changeLocale(l: string) {
        setLocale(l)
        // 另外的 locale-dependent 逻辑可以在这里添加，例如切换 dayjs（i18n.setLocale 已做）
    }
    return { t, locale, changeLocale }
}