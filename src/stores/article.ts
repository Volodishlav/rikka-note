import { defineStore } from 'pinia'
import { ref } from 'vue'
import { BaseDirectory, DirEntry, exists, mkdir, readDir, readTextFile, writeTextFile, stat } from '@tauri-apps/plugin-fs'
import { Store } from '@tauri-apps/plugin-store'
import { cloneDeep, uniq } from 'lodash-es'
import { join } from '@tauri-apps/api/path'

// 导入路径/工作区工具函数
import { getWorkspacePath, getFilePathOptions, toWorkspaceRelativePath } from '@/lib/workspace.ts'
import { getCurrentFolder } from '@/lib/path.ts'

// ====== 类型定义 ======
export type SortType = 'name' | 'created' | 'modified' | 'none'
export type SortDirection = 'asc' | 'desc'

export interface DirTree extends DirEntry {
    children?: DirTree[]
    parent?: DirTree
    sha?: string
    isEditing?: boolean
    isLocale: boolean
    createdAt?: string
    modifiedAt?: string
}

export interface Article {
    article: string
    path: string
}

// ====== Store 定义 ======
export const useArticleStore = defineStore('article', () => {
    // -------- 状态管理 --------
    const loading = ref(false)
    const activeFilePath = ref('')
    const matchPosition = ref<number | null>(null)
    const html2md = ref(false)
    const sortType = ref<SortType>('none')
    const sortDirection = ref<SortDirection>('asc')
    const fileTree = ref<DirTree[]>([])
    const fileTreeLoading = ref(false)
    const collapsibleList = ref<string[]>([])
    const currentArticle = ref('')
    const allArticle = ref<Article[]>([])
    const errorMsg = ref<string | null>(null)

    // -------- 基础状态设置方法 --------
    function setLoading(val: boolean) {
        loading.value = val
    }

    async function setActiveFilePath(path: string) {
        activeFilePath.value = path
        try {
            const store = await Store.load('store.json')
            await store.set('activeFilePath', path)
            await store.save()
        } catch (err) {
            errorMsg.value = `保存活跃文件路径失败：${(err as Error).message}`
            console.warn('Failed to save activeFilePath:', err)
        }
    }

    function setMatchPosition(position: number | null) {
        matchPosition.value = position
    }

    // -------- HTML转MD配置 --------
    async function initHtml2md() {
        try {
            const store = await Store.load('store.json')
            const res = await store.get<boolean>('html2md')
            html2md.value = res || false
        } catch (err) {
            errorMsg.value = `初始化html2md配置失败：${(err as Error).message}`
            console.warn('Failed to init html2md:', err)
        }
    }

    async function setHtml2mdValue(val: boolean) {
        html2md.value = val
        try {
            const store = await Store.load('store.json')
            await store.set('html2md', val)
            await store.save()
        } catch (err) {
            errorMsg.value = `保存html2md配置失败：${(err as Error).message}`
            console.warn('Failed to save html2md:', err)
        }
    }

    // -------- 文件树排序逻辑 --------
    function sortFileTree(tree: DirTree[]): DirTree[] {
        if (sortType.value === 'none') return tree

        const sortedTree = cloneDeep(tree)
        const sortFunction = (a: DirTree, b: DirTree) => {
            // 文件夹优先排序
            if (a.isDirectory && !b.isDirectory) return -1
            if (!a.isDirectory && b.isDirectory) return 1

            let result = 0
            switch (sortType.value) {
                case 'name':
                    result = a.name.localeCompare(b.name)
                    break
                case 'created':
                    if (a.createdAt && b.createdAt) {
                        result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    } else {
                        result = a.name.localeCompare(b.name)
                    }
                    break
                case 'modified':
                    if (a.modifiedAt && b.modifiedAt) {
                        result = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
                    } else {
                        result = a.name.localeCompare(b.name)
                    }
                    break
                default:
                    result = 0
            }
            return sortDirection.value === 'asc' ? result : -result
        }

        // 排序根节点
        sortedTree.sort(sortFunction)

        // 递归排序子节点
        const sortChildren = (items: DirTree[]) => {
            for (const item of items) {
                if (item.children && item.children.length > 0) {
                    item.children.sort(sortFunction)
                    sortChildren(item.children)
                }
            }
        }
        sortChildren(sortedTree)

        return sortedTree
    }

    // -------- 更新文件统计信息（创建/修改时间） --------
    async function updateFileStats(basePath: string, tree: DirTree[]): Promise<DirTree[]> {
        const workspace = await getWorkspacePath()

        for (const entry of tree) {
            if (entry.isFile) {
                const filePath = await join(basePath, entry.name)
                try {
                    let fileStat
                    if (workspace.isCustom) {
                        fileStat = await stat(filePath)
                    } else {
                        const relPath = await toWorkspaceRelativePath(filePath)
                        const pathOptions = await getFilePathOptions(relPath)
                        fileStat = await stat(pathOptions.path, { baseDir: pathOptions.baseDir })
                    }
                    entry.createdAt = fileStat.birthtime?.toISOString()
                    entry.modifiedAt = fileStat.mtime?.toISOString()
                } catch (error) {
                    errorMsg.value = `获取文件统计信息失败(${filePath})：${(error as Error).message}`
                    console.error(`Error getting stats for ${filePath}:`, error)
                }
            } else if (entry.isDirectory && entry.children) {
                const dirPath = await join(basePath, entry.name)
                await updateFileStats(dirPath, entry.children)
            }
        }
        return tree
    }

    // -------- 设置文件树（自动排序） --------
    function setFileTree(tree: DirTree[]) {
        const sortedTree = sortFileTree(tree)
        fileTree.value = sortedTree
    }

    // -------- 添加文件到文件树 --------
    function addFile(file: DirTree) {
        fileTree.value = [file, ...fileTree.value]
    }

    // -------- 加载文件树（核心逻辑） --------
    async function loadFileTree() {
        fileTreeLoading.value = true
        fileTree.value = []
        errorMsg.value = null

        try {
            // 获取当前工作区路径
            const workspace = await getWorkspacePath()

            // 确保工作区目录存在
            if (workspace.isCustom) {
                const isWorkspaceExists = await exists(workspace.path)
                if (!isWorkspaceExists) {
                    await mkdir(workspace.path)
                }
            } else {
                const isArticleDir = await exists('article', { baseDir: BaseDirectory.AppData })
                if (!isArticleDir) {
                    await mkdir('article', { baseDir: BaseDirectory.AppData })
                }
            }

            // 读取工作区文件
            let dirs: DirTree[] = []
            if (workspace.isCustom) {
                dirs = (await readDir(workspace.path))
                    .filter(file =>
                        file.name !== '.DS_Store' &&
                        !file.name.startsWith('.') &&
                        (file.isDirectory || file.name.endsWith('.md') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i))
                    ).map(file => ({
                        ...file,
                        isEditing: false,
                        isLocale: true,
                        parent: undefined,
                        sha: '',
                        createdAt: undefined,
                        modifiedAt: undefined
                    }))
            } else {
                dirs = (await readDir('article', { baseDir: BaseDirectory.AppData }))
                    .filter(file =>
                        file.name !== '.DS_Store' &&
                        !file.name.startsWith('.') &&
                        (file.isDirectory || file.name.endsWith('.md') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i))
                    ).map(file => ({
                        ...file,
                        isEditing: false,
                        isLocale: true,
                        parent: undefined,
                        sha: '',
                        createdAt: undefined,
                        modifiedAt: undefined
                    }))
            }

            // 递归处理工作区下的所有文件和文件夹
            async function processEntriesRecursively(parent: string, entries: DirTree[]) {
                const workspace = await getWorkspacePath()
                for (const entry of entries) {
                    if (entry.isDirectory) {
                        const dir = await join(parent, entry.name)
                        let children: DirTree[] = []

                        if (workspace.isCustom) {
                            children = (await readDir(dir))
                                .filter(file =>
                                    file.name !== '.DS_Store' &&
                                    !file.name.startsWith('.') &&
                                    (file.isDirectory || file.name.endsWith('.md') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i))
                                ).map(file => ({
                                    ...file,
                                    parent: entry,
                                    isEditing: false,
                                    isLocale: true,
                                    sha: ''
                                })) as DirTree[]
                        } else {
                            const dirRelative = await toWorkspaceRelativePath(dir)
                            const pathOptions = await getFilePathOptions(dirRelative)
                            children = (await readDir(pathOptions.path, { baseDir: pathOptions.baseDir }))
                                .filter(file =>
                                    file.name !== '.DS_Store' &&
                                    !file.name.startsWith('.') &&
                                    (file.isDirectory || file.name.endsWith('.md') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i))
                                ).map(file => ({
                                    ...file,
                                    parent: entry,
                                    isEditing: false,
                                    isLocale: true,
                                    sha: ''
                                })) as DirTree[]
                        }

                        entry.children = children
                        await processEntriesRecursively(dir, children)
                    }
                }
            }

            await processEntriesRecursively(workspace.path, dirs as DirTree[])

            // 更新文件统计信息并排序
            await updateFileStats(workspace.path, dirs)
            const sortedDirs = sortFileTree(dirs)
            fileTree.value = sortedDirs

        } catch (error) {
            errorMsg.value = `加载文件树失败：${(error as Error).message}`
            console.error('[ArticleStore] loadFileTree error:', error)
        } finally {
            fileTreeLoading.value = false
        }
    }

    // -------- 空实现：兼容原接口（移除远程同步） --------
    async function loadCollapsibleFiles(_fullpath: string) {
        // 无需实现：已移除远程同步功能
    }

    // -------- 新建文件夹（根目录） --------
    async function newFolder() {
        errorMsg.value = null
        try {
            const cacheTree = cloneDeep(fileTree.value)
            const exists = cacheTree.find(item => item.name === '' && item.isDirectory)
            if (exists) return

            // 生成临时文件夹名称
            const tempFolderName = `新建文件夹-${new Date().getTime()}`

            // 获取工作区信息并拼接路径
            const workspace = await getWorkspacePath()
            let folderPath: string

            if (workspace.isCustom) {
                folderPath = await join(workspace.path, tempFolderName)
            } else {
                folderPath = await join('article', tempFolderName)
            }

            // 创建本地文件夹
            if (workspace.isCustom) {
                await mkdir(folderPath, { recursive: true })
            } else {
                await mkdir(folderPath, { baseDir: BaseDirectory.AppData, recursive: true })
            }

            // 更新文件树
            const node: DirTree = {
                name: tempFolderName,
                isFile: false,
                isDirectory: true,
                isSymlink: false,
                isEditing: true,
                isLocale: true,
                children: []
            }

            cacheTree.unshift(node)
            fileTree.value = cacheTree

        } catch (error) {
            errorMsg.value = `新建文件夹失败：${(error as Error).message}`
            console.error('[ArticleStore] newFolder error:', error)
        }
    }

    // -------- 新建文件（根目录/当前文件父目录） --------
    async function newFile() {
        errorMsg.value = null
        try {
            const cacheTree = cloneDeep(fileTree.value)
            // 检查是否已有空名称的编辑中文件
            const exists = cacheTree.find(item => item.name === '' && item.isFile)
            if (exists) return

            const path = activeFilePath.value
            if (path.includes('/')) {
                // 在当前活动文件的父文件夹下创建
                const folderPath = path.split('/').slice(0, -1).join('/')
                const currentFolder = getCurrentFolder(folderPath, cacheTree)

                // 检查父文件夹是否已有空文件
                if (currentFolder?.children?.find((item: DirTree) => item.name === '' && item.isFile)) {
                    return
                }

                // 确保文件夹展开
                if (!collapsibleList.value.includes(folderPath)) {
                    collapsibleList.value.push(folderPath)
                }

                if (currentFolder) {
                    const newFile: DirTree = {
                        name: '',
                        isFile: true,
                        isSymlink: false,
                        parent: currentFolder,
                        isEditing: true,
                        isDirectory: false,
                        isLocale: true,
                        sha: '',
                        children: []
                    }
                    currentFolder.children?.unshift(newFile)
                    fileTree.value = cacheTree
                }
            } else {
                // 根目录创建
                const newFile: DirTree = {
                    name: '',
                    isFile: true,
                    isSymlink: false,
                    parent: undefined,
                    isEditing: true,
                    isDirectory: false,
                    isLocale: true,
                    sha: '',
                    children: []
                }
                cacheTree.unshift(newFile)
                fileTree.value = cacheTree
            }
        } catch (error) {
            errorMsg.value = `新建文件失败：${(error as Error).message}`
            console.error('[ArticleStore] newFile error:', error)
        }
    }

    // -------- 在指定文件夹下新建文件 --------
    async function newFileOnFolder(path: string) {
        errorMsg.value = null
        try {
            const cacheTree = cloneDeep(fileTree.value)
            const currentFolder = path.includes('/')
                ? getCurrentFolder(path, cacheTree)
                : cacheTree.find(item => item.name === path)

            // 获取工作区信息并生成文件名
            const workspace = await getWorkspacePath()
            const fileName = `新建文件-${new Date().getTime()}.md`
            const fullPath = `${path}/${fileName}`
            const pathOptions = await getFilePathOptions(fullPath)

            // 写入空文件到本地
            if (workspace.isCustom) {
                await writeTextFile(pathOptions.path, '')
            } else {
                await writeTextFile(pathOptions.path, '', { baseDir: pathOptions.baseDir })
            }

            // 更新文件树
            const node: DirTree = {
                name: fileName,
                isFile: true,
                isDirectory: false,
                isSymlink: false,
                isEditing: false,
                isLocale: true,
                parent: currentFolder,
                sha: '',
                children: []
            }

            currentFolder?.children?.unshift(node)
            fileTree.value = cacheTree
            await setActiveFilePath(fullPath)
        } catch (error) {
            errorMsg.value = `在文件夹下新建文件失败：${(error as Error).message}`
            console.error('[ArticleStore] newFileOnFolder error:', error)
        }
    }

    // -------- 在指定文件夹下新建子文件夹 --------
    async function newFolderInFolder(path: string) {
        errorMsg.value = null
        try {
            const cacheTree = cloneDeep(fileTree.value)
            const currentFolder = path.includes('/')
                ? getCurrentFolder(path, cacheTree)
                : cacheTree.find(item => item.name === path)

            // 检查是否已有空名称文件夹
            const hasEmptyFolder = currentFolder?.children?.find((item: DirTree) => item.name === '' && item.isDirectory)
            if (hasEmptyFolder) return

            // 生成临时文件夹名称并拼接路径
            const tempFolderName = `新建文件夹-${new Date().getTime()}`
            const fullFolderPath = `${path}/${tempFolderName}`
            const workspace = await getWorkspacePath()

            let physicalPath: string
            if (workspace.isCustom) {
                physicalPath = await join(workspace.path, fullFolderPath)
            } else {
                physicalPath = await join('article', fullFolderPath)
            }

            // 创建本地子文件夹
            if (workspace.isCustom) {
                await mkdir(physicalPath, { recursive: true })
            } else {
                await mkdir(physicalPath, { baseDir: BaseDirectory.AppData, recursive: true })
            }

            // 更新文件树节点
            const node: DirTree = {
                name: tempFolderName,
                isFile: false,
                isDirectory: true,
                isSymlink: false,
                isEditing: true,
                isLocale: true,
                parent: currentFolder,
                sha: '',
                children: []
            }

            currentFolder?.children?.unshift(node)
            fileTree.value = cacheTree

        } catch (error) {
            errorMsg.value = `在文件夹下新建文件夹失败：${(error as Error).message}`
            console.error('[ArticleStore] newFolderInFolder error:', error)
        }
    }

    // -------- 初始化折叠列表 --------
    async function initCollapsibleList() {
        errorMsg.value = null
        try {
            const store = await Store.load('store.json')
            const res = await store.get<string[]>('collapsibleList')
            const activeFilePathStored = await store.get<string>('activeFilePath')

            if (activeFilePathStored) {
                activeFilePath.value = activeFilePathStored
                await readArticle(activeFilePathStored)
            }

            collapsibleList.value = res ? uniq(res.filter(item => !item.includes('.md'))) : []
        } catch (err) {
            errorMsg.value = `初始化折叠列表失败：${(err as Error).message}`
            console.warn('Failed to init collapsibleList:', err)
        }
    }

    // -------- 设置折叠列表项 --------
    async function setCollapsibleListItem(path: string, value: boolean) {
        errorMsg.value = null
        try {
            const list = cloneDeep(collapsibleList.value)
            if (value) {
                list.push(path)
            } else {
                const idx = list.indexOf(path)
                if (idx !== -1) list.splice(idx, 1)
            }

            const store = await Store.load('store.json')
            await store.set('collapsibleList', list)
            await store.save()

            collapsibleList.value = uniq(list).filter(item => !item.includes('.md'))
        } catch (err) {
            errorMsg.value = `保存折叠列表失败：${(err as Error).message}`
            console.warn('Failed to save collapsibleList:', err)
        }
    }

    // -------- 展开所有文件夹 --------
    async function expandAllFolders() {
        errorMsg.value = null
        try {
            const getAllFolderPaths = (tree: DirTree[], parentPath: string = ''): string[] => {
                let paths: string[] = []
                for (const item of tree) {
                    if (!item.isFile) {
                        const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name
                        paths.push(currentPath)
                        if (item.children && item.children.length > 0) {
                            paths = [...paths, ...getAllFolderPaths(item.children, currentPath)]
                        }
                    }
                }
                return paths
            }

            const folderPaths = getAllFolderPaths(fileTree.value)
            const store = await Store.load('store.json')
            await store.set('collapsibleList', folderPaths)
            await store.save()

            collapsibleList.value = uniq(folderPaths)
        } catch (err) {
            errorMsg.value = `展开所有文件夹失败：${(err as Error).message}`
            console.warn('Failed to expand all folders:', err)
        }
    }

    // -------- 折叠所有文件夹 --------
    async function collapseAllFolders() {
        errorMsg.value = null
        try {
            const store = await Store.load('store.json')
            await store.set('collapsibleList', [])
            await store.save()

            collapsibleList.value = []
        } catch (err) {
            errorMsg.value = `折叠所有文件夹失败：${(err as Error).message}`
            console.warn('Failed to collapse all folders:', err)
        }
    }

    // -------- 切换所有文件夹状态 --------
    async function toggleAllFolders() {
        if (collapsibleList.value.length > 0) {
            await collapseAllFolders()
        } else {
            await expandAllFolders()
        }
    }

    // -------- 清空折叠列表 --------
    async function clearCollapsibleList() {
        errorMsg.value = null
        try {
            collapsibleList.value = []
            const store = await Store.load('store.json')
            await store.set('collapsibleList', [])
            await store.save()
        } catch (err) {
            errorMsg.value = `清空折叠列表失败：${(err as Error).message}`
            console.warn('Failed to clear collapsibleList:', err)
        }
    }

    // -------- 读取文章内容 --------
    async function readArticle(path: string, _sha?: string, isLocale = true) {
        setLoading(true)
        errorMsg.value = null
        try {
            if (isLocale) {
                const workspace = await getWorkspacePath()
                const pathOptions = await getFilePathOptions(path)
                let content = ''

                // 检查文件是否存在
                let fileExists = false
                if (workspace.isCustom) {
                    fileExists = await exists(pathOptions.path)
                } else {
                    fileExists = await exists(pathOptions.path, { baseDir: pathOptions.baseDir })
                }

                if (fileExists) {
                    // 读取本地文件
                    if (workspace.isCustom) {
                        content = await readTextFile(pathOptions.path)
                    } else {
                        content = await readTextFile(pathOptions.path, { baseDir: pathOptions.baseDir })
                    }
                    currentArticle.value = content
                } else {
                    currentArticle.value = ''
                    errorMsg.value = `本地文件不存在：${path}`
                }
            }
        } catch (error) {
            errorMsg.value = `读取文章失败：${(error as Error).message}`
            currentArticle.value = ''
            console.error('[ArticleStore] readArticle error:', error)
        } finally {
            setLoading(false)
        }
    }

    // -------- 设置当前文章内容 --------
    function setCurrentArticle(content: string) {
        currentArticle.value = content
    }

    // -------- 保存当前文章 --------
    async function saveCurrentArticle(content: string) {
        if (!content || !activeFilePath.value) return

        setLoading(true)
        errorMsg.value = null
        try {
            const path = activeFilePath.value
            const workspace = await getWorkspacePath()

            // 检查文件是否存在
            let isLocale = false
            const pathOptions = await getFilePathOptions(path)
            if (workspace.isCustom) {
                isLocale = await exists(pathOptions.path)
            } else {
                isLocale = await exists(pathOptions.path, { baseDir: pathOptions.baseDir })
            }

            // 确保目录结构存在（递归创建）
            if (path.includes('/')) {
                const dirOptions = await getFilePathOptions(path.substring(0, path.lastIndexOf('/')))
                if (workspace.isCustom) {
                    await mkdir(dirOptions.path, { recursive: true })
                } else {
                    await mkdir(dirOptions.path, { baseDir: dirOptions.baseDir, recursive: true })
                }
            }

            // 保存文件内容
            if (workspace.isCustom) {
                await writeTextFile(pathOptions.path, content)
            } else {
                await writeTextFile(pathOptions.path, content, { baseDir: pathOptions.baseDir })
            }

            // 更新缓存树的 isLocale 状态
            if (!isLocale) {
                const cacheTree = cloneDeep(fileTree.value)
                const current = path.includes('/')
                    ? getCurrentFolder(path, cacheTree)
                    : cacheTree.find(item => item.name === path)
                if (current) {
                    current.isLocale = true
                }
                fileTree.value = cacheTree
            }

        } catch (error) {
            errorMsg.value = `保存文章失败：${(error as Error).message}`
            console.error('[ArticleStore] saveCurrentArticle error:', error)
        } finally {
            setLoading(false)
        }
    }

    // -------- 加载所有文章（用于搜索） --------
    async function loadAllArticle() {
        errorMsg.value = null
        try {
            const workspace = await getWorkspacePath()
            let allArticles: Article[] = []

            const readDirRecursively = async (dirPath: string, basePath: string, isCustomWorkspace: boolean): Promise<Article[]> => {
                let articles: Article[] = []

                // 读取当前目录
                const res = isCustomWorkspace
                    ? await readDir(dirPath)
                    : await readDir(dirPath, { baseDir: BaseDirectory.AppData })

                // 过滤并读取MD文件
                const files = res.filter(file =>
                    file.isFile &&
                    file.name !== '.DS_Store' &&
                    !file.name.startsWith('.') &&
                    file.name.endsWith('.md')
                )

                for (const file of files) {
                    const relativePath = await join(basePath, file.name)
                    let articleContent = ''

                    if (isCustomWorkspace) {
                        const fullPath = await join(dirPath, file.name)
                        articleContent = await readTextFile(fullPath)
                    } else {
                        const filePath = await join(dirPath, file.name)
                        articleContent = await readTextFile(filePath, { baseDir: BaseDirectory.AppData })
                    }

                    articles.push({ article: articleContent, path: relativePath })
                }

                // 递归处理子目录
                const directories = res.filter(entry =>
                    entry.isDirectory &&
                    !entry.name.startsWith('.')
                )

                for (const dir of directories) {
                    const newDirPath = await join(dirPath, dir.name)
                    const newBasePath = await join(basePath, dir.name)
                    const subDirArticles = await readDirRecursively(newDirPath, newBasePath, isCustomWorkspace)
                    articles = [...articles, ...subDirArticles]
                }

                return articles
            }

            if (workspace.isCustom) {
                allArticles = await readDirRecursively(workspace.path, '', true)
            } else {
                allArticles = await readDirRecursively('article', '', false)
            }

            allArticle.value = allArticles
        } catch (error) {
            errorMsg.value = `加载所有文章失败：${(error as Error).message}`
            console.error('[ArticleStore] loadAllArticle error:', error)
        }
    }

    // -------- 暴露状态和方法 --------
    return {
        // 状态
        loading,
        activeFilePath,
        matchPosition,
        html2md,
        sortType,
        sortDirection,
        fileTree,
        fileTreeLoading,
        collapsibleList,
        currentArticle,
        allArticle,
        errorMsg,

        // 方法
        setLoading,
        setActiveFilePath,
        setMatchPosition,
        initHtml2md,
        setHtml2mdValue,
        sortFileTree,
        updateFileStats,
        setFileTree,
        addFile,
        loadFileTree,
        loadCollapsibleFiles,
        newFolder,
        newFile,
        newFileOnFolder,
        newFolderInFolder,
        initCollapsibleList,
        setCollapsibleListItem,
        expandAllFolders,
        collapseAllFolders,
        toggleAllFolders,
        clearCollapsibleList,
        readArticle,
        setCurrentArticle,
        saveCurrentArticle,
        loadAllArticle
    }
})