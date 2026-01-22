import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 CSS 类名（shadcn-vue 核心工具函数）
 * @param inputs 要合并的类名列表
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}