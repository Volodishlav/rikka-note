// UI组件库聚合导出文件
// 导出所有UI组件，方便在项目中统一引入

// 对于使用 <script setup> 的组件，需要先导入再重新导出
import Input from './Input.vue'
import Dialog from './Dialog.vue'

// 重新导出并添加Ui前缀
export const UiInput = Input
export const UiDialog = Dialog
// 移除旧Toast组件，改用新的Toast系统