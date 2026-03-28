import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logger } from '@/utils/logger'

/**
 * 将焦点从当前活动元素移出，用于在隐藏面板前清除焦点
 * 避免 aria-hidden 警告：当元素被 aria-hidden 时不能有焦点
 * @param selector 可选的 CSS 选择器，用于指定需要清除焦点的面板区域
 */
function blurActiveElement(selector?: string): void {
    const activeElement = document.activeElement as HTMLElement | null
    if (!activeElement) return
    // 输出调试信息：元素标签名 + blurActiveElement
    logger.general.debug(activeElement.tagName + ' is blurActiveElement')
    // 如果指定了选择器，只处理该选择器内的元素
    if (selector) {
        const container = document.querySelector(selector)
        if (container && container.contains(activeElement)) {
            activeElement.blur()
        }
    } else {
        // 默认情况下，如果活动元素是可输入的元素，则移除焦点
        if (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable ||
            activeElement.classList.contains('cm-content')
        ) {
            activeElement.blur()
        }
    }
}

export const useLayoutStore = defineStore('layout', () => {
    // 控制三个核心面板的显示状态，默认为全部显示
    const isLeftSidebarVisible = ref(true)
    const isEditorVisible = ref(true)
    const isRightSidebarVisible = ref(true)
    // 控制是否显示搜索面板
    const isSearchPanelVisible = ref(false)
    // 控制是否显示设置页面（独占整个窗口）
    const isSettingPageVisible = ref(false)
    // 控制是否显示 OCR 面板
    const isOcrVisible = ref(false)
    // 控制是否处于截屏选区状态
    const isScreenSelecting = ref(false)
    // 存储当前截屏的 Base64 数据
    const screenImageData = ref('')

    // Action to toggle the visibility of the left sidebar
    function toggleLeftSidebar() {
        // 在隐藏左侧面板前，移除左侧面板内元素的焦点
        // 避免 splitpanes 设置 aria-hidden 时产生警告
        if (isLeftSidebarVisible.value) {
            blurActiveElement('.splitpanes__pane:first-child')
            logger.general.debug('LeftSidebar blurActiveElement')
        }
        isLeftSidebarVisible.value = !isLeftSidebarVisible.value
    }

    // Action to toggle the visibility of the editor
    function toggleEditor() {
        // 在隐藏编辑器面板前，移除编辑器内元素的焦点
        if (isEditorVisible.value) {
            // 编辑器通常使用 CodeMirror，其内容区域有 cm-content 类
            blurActiveElement()
            logger.general.debug('Editor blurActiveElement')

        }
        isEditorVisible.value = !isEditorVisible.value
    }

    // Action to toggle the visibility of the right sidebar
    function toggleRightSidebar() {
        // 在隐藏右侧面板前，移除右侧面板内元素的焦点
        if (isRightSidebarVisible.value) {
            blurActiveElement('.splitpanes__pane:last-child')
            logger.general.debug('RightSidebar blurActiveElement')

        }
        isRightSidebarVisible.value = !isRightSidebarVisible.value
    }

    // Action to toggle the visibility of the search panel
    function toggleSearchPanel() {
        // 在切换搜索面板前，移除左侧面板内元素的焦点
        if (isLeftSidebarVisible.value) {
            blurActiveElement('.splitpanes__pane:first-child')
            logger.general.debug('SearchPanel blurActiveElement')
        }
        isSearchPanelVisible.value = !isSearchPanelVisible.value
    }

    // Action to toggle the visibility of the setting page
    function toggleSettingPage() {
        // 在显示设置页面前，移除所有面板内元素的焦点
        // 设置页面会隐藏所有 splitpanes 面板
        if (!isSettingPageVisible.value) {
            blurActiveElement()
            logger.general.debug('SettingPage blurActiveElement')

        }
        isSettingPageVisible.value = !isSettingPageVisible.value
    }

    // Action to toggle the visibility of the OCR panel
    function toggleOcr() {
        isOcrVisible.value = !isOcrVisible.value
    }

    // 更新截屏选区状态
    function setScreenSelecting(selecting: boolean, imageData: string = '') {
        isScreenSelecting.value = selecting
        screenImageData.value = imageData
    }

    return {
        isLeftSidebarVisible,
        isEditorVisible,
        isRightSidebarVisible,
        isSearchPanelVisible,
        isSettingPageVisible,
        isOcrVisible,
        isScreenSelecting,
        screenImageData,
        toggleLeftSidebar,
        toggleEditor,
        toggleRightSidebar,
        toggleSearchPanel,
        toggleSettingPage,
        toggleOcr,
        setScreenSelecting
    }
})