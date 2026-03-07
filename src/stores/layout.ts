import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLayoutStore = defineStore('layout', () => {
    // 控制三个核心面板的显示状态，默认为全部显示
    const isLeftSidebarVisible = ref(true)
    const isEditorVisible = ref(true)
    const isRightSidebarVisible = ref(true)
    // 控制是否显示搜索面板
    const isSearchPanelVisible = ref(false)
    // 控制是否显示设置页面（独占整个窗口）
    const isSettingPageVisible = ref(false)

    // Action to toggle the visibility of the left sidebar
    function toggleLeftSidebar() {
        isLeftSidebarVisible.value = !isLeftSidebarVisible.value
    }

    // Action to toggle the visibility of the editor
    function toggleEditor() {
        isEditorVisible.value = !isEditorVisible.value
    }

    // Action to toggle the visibility of the right sidebar
    function toggleRightSidebar() {
        isRightSidebarVisible.value = !isRightSidebarVisible.value
    }

    // Action to toggle the visibility of the search panel
    function toggleSearchPanel() {
        isSearchPanelVisible.value = !isSearchPanelVisible.value
    }

    // Action to toggle the visibility of the setting page
    function toggleSettingPage() {
        isSettingPageVisible.value = !isSettingPageVisible.value
    }

    return {
        isLeftSidebarVisible,
        isEditorVisible,
        isRightSidebarVisible,
        isSearchPanelVisible,
        isSettingPageVisible,
        toggleLeftSidebar,
        toggleEditor,
        toggleRightSidebar,
        toggleSearchPanel,
        toggleSettingPage
    }
})