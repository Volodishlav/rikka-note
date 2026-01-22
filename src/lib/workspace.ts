import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { Store } from '@tauri-apps/plugin-store'

/**
 * 获取当前工作区路径
 * 如果设置了自定义工作区，则返回自定义路径
 * 否则返回默认的 AppData/article 路径
 */
export async function getWorkspacePath(): Promise<{ path: string, isCustom: boolean }> {
    const store = await Store.load('store.json')
    const workspacePath = await store.get<string>('workspacePath')

    if (workspacePath) {
        return {
            path: workspacePath,
            isCustom: true
        }
    }

    return {
        path: 'article',
        isCustom: false
    }
}

/**
 * 获取文件的完整路径选项
 * @param relativePath 相对于工作区的路径
 * @returns 包含文件路径和baseDir的选项
 */
export async function getFilePathOptions(relativePath: string): Promise<{ path: string, baseDir?: BaseDirectory }> {
    const workspace = await getWorkspacePath()

    if (workspace.isCustom) {
        const fullPath = await join(workspace.path, relativePath)
        return { path: fullPath }
    } else {
        return {
            path: `article/${relativePath}`,
            baseDir: BaseDirectory.AppData
        }
    }
}

/**
 * 获取通用文件路径选项
 * 不限于article目录，可处理任意AppData下的路径
 * @param path 原始路径
 * @param prefix 可选的目录前缀
 * @returns 包含文件路径和baseDir的选项
 */
export async function getGenericPathOptions(path: string, prefix?: string): Promise<{ path: string, baseDir?: BaseDirectory }> {
    const workspace = await getWorkspacePath()

    if (workspace.isCustom) {
        let fullPath = workspace.path

        if (prefix && !path.startsWith(`${prefix}/`) && !path.startsWith(prefix)) {
            fullPath = await join(fullPath, prefix || '', path)
        } else {
            fullPath = await join(fullPath, path)
        }

        return { path: fullPath }
    } else {
        if (prefix && !path.startsWith(`${prefix}/`) && !path.startsWith(prefix)) {
            return {
                path: `${prefix}/${path}`,
                baseDir: BaseDirectory.AppData
            }
        }

        return {
            path: path,
            baseDir: BaseDirectory.AppData
        }
    }
}

/**
 * 将任何路径转换为相对于工作区的路径
 * @param path 原始路径
 * @returns 相对于工作区的路径
 */
export async function toWorkspaceRelativePath(path: string): Promise<string> {
    const workspace = await getWorkspacePath()

    const defaultDirRegex = /^(article[\\\/])/
    if (!workspace.isCustom && defaultDirRegex.test(path)) {
        return path.replace(/article[\\\/]/g, '')
    }

    if (workspace.isCustom && path.startsWith(workspace.path)) {
        const relativePath = path.substring(workspace.path.length)
        return relativePath.startsWith('/') ? relativePath.substring(1) : relativePath
    }

    return path
}