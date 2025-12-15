// src/utils/device.ts
export function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera
    // 新增：结合UA+屏幕尺寸（768px是移动端常用断点，符合企业级规范）
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768
    return isMobileUA || isSmallScreen
}