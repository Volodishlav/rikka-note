// src/composables/useI18n.ts
import { useI18n as useVueI18n } from 'vue-i18n'
import { useSettingStore } from '@/stores/setting'

export function useI18n() {
    const { t, locale } = useVueI18n()
    const settingStore = useSettingStore()

    function changeLocale(l: string) {
        settingStore.setLocale(l)
    }
    return { t, locale, changeLocale }
}