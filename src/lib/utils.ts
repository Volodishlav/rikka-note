//utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { appDataDir } from '@tauri-apps/api/path';
import {getWorkspacePath} from "@/lib/workspace.ts";
import {convertFileSrc} from "@tauri-apps/api/core";
import { logger } from "@/utils/logger";

/**
 * 合并 CSS 类名（shadcn-vue 核心工具函数）
 * @param inputs 要合并的类名列表
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * 将相对图片路径转换为Tauri兼容的URL
 * 意义：Tauri需要特殊的asset://协议访问本地文件
 */
export async function convertImageByWorkspace(relativePath: string): Promise<string> {
  try {
    const workspace = await getWorkspacePath()

    if (!workspace.isCustom) {
      // AppData 工作区：使用转换函数
      const appDir = await appDataDir()
      const fullPath = `${appDir}/article/${relativePath}`
      return await convertImage(fullPath)
    } else {
      // 自定义工作区：直接使用 convertFileSrc
      const fullPath = `${workspace.path}/${relativePath}`
      return convertFileSrc(fullPath)
    }
  } catch (error) {
    logger.general.error('Convert image failed:', error)
    return ''
  }
}


/**
 * 转换AppData中的相对路径为Tauri资源URL
 */
async function convertImage(fullPath: string): Promise<string> {
  // 修复：使用 Tauri 官方的 convertFileSrc 而非手动拼接 asset://
  return convertFileSrc(fullPath)
}