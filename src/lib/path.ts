import { DirTree } from "@/stores/article"

/**
 * 计算父目录路径（递归实现）
 * @param item 目录树节点
 * @returns 完整的父路径字符串
 */
export function computedParentPath(item: DirTree) {
    let path = item.name
    function readParentPath(item: DirTree) {
        if (item.parent) {
            path = item.parent.name + '/' + path
            if (item.parent.parent) {
                readParentPath(item.parent)
            }
        }
    }
    readParentPath(item)
    return path
}

/**
 * 根据路径查找当前文件夹节点
 * @param path 文件夹路径
 * @param fileTree 目录树
 * @returns 找到的文件夹节点或undefined
 */
export function getCurrentFolder(path: string, fileTree: DirTree[]) {
    if (path === '') {
        return undefined
    }

    let currentFolder: DirTree | undefined
    const levels = path.split('/')

    for (let index = 0; index < levels.length; index++) {
        const level = levels[index]
        let currentIndex = -1

        if (index === 0) {
            currentIndex = fileTree.findIndex(item => item.name === level)
        } else {
            const _index = currentFolder?.children?.findIndex(item => item.name === level)
            currentIndex = _index === undefined ? -1 : _index
        }

        if (currentIndex === -1) return undefined // 路径不存在，提前返回

        if (index === 0) {
            currentFolder = fileTree[currentIndex]
        } else {
            currentFolder = currentFolder?.children?.[currentIndex]
        }
    }

    return currentFolder
}