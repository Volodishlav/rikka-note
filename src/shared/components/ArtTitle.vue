<template>
  <div class="art-title-wrapper">
    <svg
        width="1000"
        height="220"
        viewBox="0 0 900 220"
        xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- 蜡笔质感滤镜：保留颗粒感，但不过度模糊 -->
        <filter
            id="crayon-texture"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
        >
          <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035"
              numOctaves="4"
              result="noise"
          />
          <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
          />
          <feGaussianBlur stdDeviation="0.4" />
        </filter>

        <!-- 定义指定的颜色与渐变 - 使用 Tailwind 配置中的品牌颜色 -->

        <!-- 粉色: 使用 brand-pink 和 brand-pink-shadow -->
        <linearGradient id="g-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: pinkLight }" />
          <stop offset="100%" :style="{ stopColor: pinkMain }" />
        </linearGradient>

        <!-- 紫色: 使用 brand-purple 和 brand-purple-shadow -->
        <linearGradient id="g-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: purpleLight }" />
          <stop offset="100%" :style="{ stopColor: purpleMain }" />
        </linearGradient>

        <!-- 橙色: 使用 brand-orange 和 brand-orange-shadow -->
        <linearGradient id="g-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: orangeLight }" />
          <stop offset="100%" :style="{ stopColor: orangeMain }" />
        </linearGradient>

        <!-- 青色: 使用 brand-cyan 和 brand-cyan-shadow -->
        <linearGradient id="g-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: cyanLight }" />
          <stop offset="100%" :style="{ stopColor: cyanMain }" />
        </linearGradient>

        <!-- muted 颜色: 用于 NOTE 字母 -->
        <linearGradient id="g-muted" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: mutedLight }" />
          <stop offset="100%" :style="{ stopColor: mutedMain }" />
        </linearGradient>
      </defs>

      <!-- 背景装饰：几何图形装饰（圆形、矩形等） -->
      <g v-if="showBackground === 'graphic'" filter="url(#crayon-texture)" opacity="0.6">
        <circle cx="120" cy="50" r="15" fill="#ED90BD" />
        <circle cx="780" cy="180" r="20" fill="#54C1CC" />
        <path d="M200,190 Q400,120 600,200" stroke="#C87438" stroke-width="8" fill="none" stroke-linecap="round" />
        <rect x="650" y="40" width="30" height="30" fill="#5D5F86" transform="rotate(20 665 55)" />
      </g>


      <!-- 定义渐变和滤镜 -->
      <defs>
        <!-- 毛刷纹理滤镜：增加噪点和轻微的模糊，模拟毛刷质感 -->
        <filter id="crayon-texture" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
          <feGaussianBlur stdDeviation="0.8" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>

        <!-- 主笔触渐变：从左到右橙色系渐变 -->
        <linearGradient id="g-orange-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF8A00"/>
          <stop offset="50%" stop-color="#FFB039"/>
          <stop offset="100%" stop-color="#FFD56B"/>
        </linearGradient>

        <!-- 叠加笔触渐变：从左到右粉色系渐变 -->
        <linearGradient id="g-pink-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF9EBB"/>
          <stop offset="50%" stop-color="#FFC2D1"/>
          <stop offset="100%" stop-color="#FFE5EC"/>
        </linearGradient>
      </defs>

      <!-- 背景装饰：毛刷笔触装饰 -->
      <g v-if="showBackground === 'brush'" opacity="0.6" filter="url(#crayon-texture)">
        <!-- 加粗的主笔触：模拟毛刷效果 -->
        <path
            d="M80 180 Q250 185, 450 175 T820 180"
            stroke="url(#g-orange-gradient)"
            stroke-width="20"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            stroke-dasharray="none"
            stroke-dashoffset="0"
        />
        <!-- 叠加层笔触：调整宽度和位置，增强毛刷叠色质感 -->
        <path
            d="M80 182 Q250 187, 450 177 T820 182"
            stroke="url(#g-pink-gradient)"
            stroke-width="10"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            opacity="0.8"
        />
        <!-- 额外增加一层极细的纹理笔触，强化毛刷质感 -->
        <path
            d="M80 178 Q250 183, 450 173 T820 178"
            stroke="url(#g-orange-gradient)"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            opacity="0.5"
        />
      </g>


      <!-- 主体文字层 -->
      <g filter="url(#crayon-texture)">
        <!-- RIKKA -->
        <!-- R: 橙色 - 使用 brand-orange -->
        <text
            x="50" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-orange)"
            :stroke="orangeShadow"
            stroke-width="5"
            stroke-linejoin="round"
        >R</text>

        <!-- I: 紫色 - 使用 brand-purple -->
        <text
            x="140" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-purple)"
            :stroke="purpleShadow"
            stroke-width="5"
            stroke-linejoin="round"
        >I</text>

        <!-- K: 粉色 - 使用 brand-pink -->
        <text
            x="190" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-pink)"
            :stroke="pinkShadow"
            stroke-width="5"
            stroke-linejoin="round"
        >K</text>

        <!-- K: 粉色 - 使用 brand-pink -->
        <text
            x="290" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-pink)"
            :stroke="pinkShadow"
            stroke-width="5"
            stroke-linejoin="round"
        >K</text>

        <!-- A: 青色 - 使用 brand-cyan -->
        <text
            x="390" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-cyan)"
            :stroke="cyanShadow"
            stroke-width="5"
            stroke-linejoin="round"
        >A</text>

        <!-- NOTE -->
        <!-- N: muted 填充, muted-foreground 描边 -->
        <text
            x="535" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-muted)"
            :stroke="mutedForeground"
            stroke-width="5"
            stroke-linejoin="round"
        >N</text>

        <!-- O: muted 填充, muted-foreground 描边 -->
        <text
            x="630" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-muted)"
            :stroke="mutedForeground"
            stroke-width="5"
            stroke-linejoin="round"
        >O</text>

        <!-- T: muted 填充, muted-foreground 描边 -->
        <text
            x="725" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-muted)"
            :stroke="mutedForeground"
            stroke-width="5"
            stroke-linejoin="round"
        >T</text>

        <!-- E: muted 填充, muted-foreground 描边 -->
        <text
            x="810" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-muted)"
            :stroke="mutedForeground"
            stroke-width="5"
            stroke-linejoin="round"
        >E</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

/**
 * 装饰物类型常量定义
 * - 'graphic': 几何图形装饰（圆形、矩形等）
 * - 'brush': 毛刷笔触装饰
 * - null: 无装饰物
 */
const DECORATION_TYPES = {
  GRAPHIC: 'graphic',
  BRUSH: 'brush',
  NONE: null
}

// 定义props：控制背景装饰显示类型
// 注意：validator 中直接使用字符串字面量，避免引用外部变量导致的 hoist 问题
const props = defineProps({
  showBackground: {
    type: String,
    default: null, // 默认无装饰物
    validator: (value) => {
      // 验证传入的值必须是有效的装饰物类型
      // 使用字符串字面量进行比较，不引用外部变量
      return value === null || value === 'graphic' || value === 'brush'
    }
  }
})

/**
 * 从 CSS 变量获取 HSL 颜色值
 * @param varName - CSS 变量名（如 --brand-purple）
 * @returns HSL 颜色字符串
 */
const getCssVarColor = (varName: string): string => {
  if (typeof document === 'undefined') return 'hsl(0, 0%, 0%)'
  const styles = getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue(varName).trim()
  return value ? `hsl(${value})` : 'hsl(0, 0%, 0%)'
}

/**
 * 将 HSL 颜色调亮
 * @param hslValue - HSL 值字符串（如 "247 41% 24%"）
 * @param amount - 调亮百分比
 * @returns 调亮后的 HSL 颜色字符串
 */
const lightenHsl = (hslValue: string, amount: number): string => {
  const parts = hslValue.split(' ')
  if (parts.length !== 3) return `hsl(${hslValue})`
  
  const h = parts[0]
  const s = parts[1]
  const l = parseFloat(parts[2])
  const newL = Math.min(100, l + amount)
  
  return `hsl(${h} ${s} ${newL}%)`
}

// 响应式颜色值，用于在组件挂载后获取 CSS 变量
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

// 品牌颜色 - 主色
const pinkMain = computed(() => isMounted.value ? getCssVarColor('--brand-pink') : 'hsl(333, 82%, 73%)')
const purpleMain = computed(() => isMounted.value ? getCssVarColor('--brand-purple') : 'hsl(247, 41%, 24%)')
const orangeMain = computed(() => isMounted.value ? getCssVarColor('--brand-orange') : 'hsl(32, 95%, 44%)')
const cyanMain = computed(() => isMounted.value ? getCssVarColor('--brand-cyan') : 'hsl(190, 100%, 42%)')

// 品牌颜色 - 浅色（用于渐变起点）
const pinkLight = computed(() => {
  if (!isMounted.value) return 'hsl(333, 82%, 83%)'
  const styles = getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue('--brand-pink').trim()
  return value ? lightenHsl(value, 10) : 'hsl(333, 82%, 83%)'
})
const purpleLight = computed(() => {
  if (!isMounted.value) return 'hsl(247, 41%, 44%)'
  const styles = getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue('--brand-purple').trim()
  return value ? lightenHsl(value, 20) : 'hsl(247, 41%, 44%)'
})
const orangeLight = computed(() => {
  if (!isMounted.value) return 'hsl(32, 95%, 64%)'
  const styles = getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue('--brand-orange').trim()
  return value ? lightenHsl(value, 20) : 'hsl(32, 95%, 64%)'
})
const cyanLight = computed(() => {
  if (!isMounted.value) return 'hsl(190, 100%, 62%)'
  const styles = getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue('--brand-cyan').trim()
  return value ? lightenHsl(value, 20) : 'hsl(190, 100%, 62%)'
})

// 品牌颜色 - 阴影色
const pinkShadow = computed(() => isMounted.value ? getCssVarColor('--brand-pink-shadow') : 'hsl(331, 45%, 49%)')
const purpleShadow = computed(() => isMounted.value ? getCssVarColor('--brand-purple-shadow') : 'hsl(237, 16%, 27%)')
const orangeShadow = computed(() => isMounted.value ? getCssVarColor('--brand-orange-shadow') : 'hsl(23, 91%, 28%)')
const cyanShadow = computed(() => isMounted.value ? getCssVarColor('--brand-cyan-shadow') : 'hsl(194, 17%, 22%)')

// muted 颜色 - 用于 NOTE 字母
const mutedMain = computed(() => isMounted.value ? getCssVarColor('--muted') : 'hsl(220, 14%, 91%)')
const mutedLight = computed(() => {
  if (!isMounted.value) return 'hsl(220, 14%, 96%)'
  const styles = getComputedStyle(document.documentElement)
  const value = styles.getPropertyValue('--muted').trim()
  return value ? lightenHsl(value, 5) : 'hsl(220, 14%, 96%)'
})
const mutedForeground = computed(() => isMounted.value ? getCssVarColor('--sidebar-primary') : 'hsl(215, 14%, 46%)')
</script>

<style scoped>
.art-title-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 2rem;
  background: transparent; /* 关键修改：将纯色背景改为透明 */
  border-radius: 12px; /* 保留圆角不影响透明效果，如需移除可直接删除 */
}

svg {
  width: 100%;
  height: auto;
  max-width: 1200px;
  /* SVG 默认背景就是透明的，无需额外设置 */
}
</style>