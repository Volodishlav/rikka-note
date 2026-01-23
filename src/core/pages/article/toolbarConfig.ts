/**
 * Vditor 工具栏配置
 * 意义：集中管理编辑器工具栏按钮，支持自定义操作
 */

export const createToolbarConfig = () => {
    return [
        { name: 'undo', tipPosition: 's' },
        { name: 'redo', tipPosition: 's' },
        '|',
        // 自定义标记按钮（暂时禁用，后续AI集成时启用）
        {
            name: 'mark',
            tipPosition: 's',
            tip: 'Mark (AI)',
            className: 'right',
            icon: '<svg><use xlink:href="#vditor-icon-mark"></svg>',
            click: () => {
                // TODO: 触发AI标记事件
            },
        },
        '|',
        { name: 'headings', tipPosition: 's', className: 'bottom' },
        { name: 'bold', tipPosition: 's' },
        { name: 'italic', tipPosition: 's' },
        { name: 'strike', tipPosition: 's' },
        '|',
        { name: 'line', tipPosition: 's' },
        { name: 'quote', tipPosition: 's' },
        { name: 'list', tipPosition: 's' },
        { name: 'ordered-list', tipPosition: 's' },
        { name: 'check', tipPosition: 's' },
        { name: 'code', tipPosition: 's' },
        { name: 'inline-code', tipPosition: 's' },
        { name: 'upload', tipPosition: 's' },
        { name: 'link', tipPosition: 's' },
        { name: 'table', tipPosition: 's' },
        '|',
        { name: 'edit-mode', tipPosition: 's', className: 'bottom edit-mode-button' },
        { name: 'preview', tipPosition: 's', className: 'bottom' },
        { name: 'fullscreen', tipPosition: 's', className: 'bottom' },
    ]
}