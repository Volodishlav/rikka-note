import { check, Update } from '@tauri-apps/plugin-updater'
import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { logger } from '@/utils/logger'
import { useToast } from '@/components/ui/toast/use-toast'
import { ref, onMounted } from 'vue'

export function useUpdater() {
    const isChecking = ref(false)
    const isDownloading = ref(false)
    const downloadProgress = ref(0)
    const pendingUpdate = ref<Update | null>(null)
    const currentVersion = ref('')
    const { toast } = useToast()

    onMounted(async () => {
        try {
            currentVersion.value = await getVersion()
        } catch (e) {
            logger.general.error('Failed to get version:', e)
        }
    })

    async function checkForUpdates(manual = false) {
        if (isChecking.value) return
        isChecking.value = true
        pendingUpdate.value = null

        try {
            const update = await check()
            if (update) {
                logger.general.info(`发现新版本: ${update.version}`)
                pendingUpdate.value = update
                
                if (!manual) {
                  // If it's not manual, we might still want to notify the user but we won't auto-install
                  toast({
                      title: '发现新版本',
                      description: `版本 ${update.version} 已就绪，请前往设置进行更新。`,
                  })
                }
            } else if (manual) {
                toast({
                    title: '暂无更新',
                    description: '当前已是最新版本',
                })
            }
        } catch (error) {
            logger.general.error('检查更新失败:', error)
            if (manual) {
                toast({
                    title: '检查更新失败',
                    description: error instanceof Error ? error.message : String(error),
                    variant: 'destructive',
                })
            }
        } finally {
            isChecking.value = false
        }
    }

    async function installUpdate() {
        if (!pendingUpdate.value || isDownloading.value) return
        
        isDownloading.value = true
        downloadProgress.value = 0

        try {
            await pendingUpdate.value.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        logger.general.info(`开始下载更新: ${event.data.contentLength} bytes`)
                        break
                    case 'Progress':
                        if (event.data.chunkLength && pendingUpdate.value) {
                           // Progress tracking logic if needed
                           // In v2, the event data structure might be different
                        }
                        break
                    case 'Finished':
                        logger.general.info('下载完成')
                        break
                }
            })
            
            toast({
                title: '更新已安装',
                description: '正在重启应用以应用更新...',
            })
            
            setTimeout(async () => {
                await relaunch()
            }, 1500)
        } catch (error) {
            logger.general.error('安装更新失败:', error)
            toast({
                title: '安装失败',
                description: error instanceof Error ? error.message : String(error),
                variant: 'destructive',
            })
        } finally {
            isDownloading.value = false
        }
    }

    return {
        isChecking,
        isDownloading,
        downloadProgress,
        pendingUpdate,
        currentVersion,
        checkForUpdates,
        installUpdate
    }
}
