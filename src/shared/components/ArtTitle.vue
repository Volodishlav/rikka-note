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

        <!-- 定义指定的颜色与渐变 -->

        <!-- 粉色: ED90BD / 阴影: B5447B -->
        <linearGradient id="g-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFB3D1" />
          <stop offset="100%" stop-color="#ED90BD" />
        </linearGradient>

        <!-- 紫色: 5D5F86 / 阴影: 3C3D4F -->
        <linearGradient id="g-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7B7DA6" />
          <stop offset="100%" stop-color="#5D5F86" />
        </linearGradient>

        <!-- 橙色: C87438 / 阴影: 873706 -->
        <linearGradient id="g-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E89458" />
          <stop offset="100%" stop-color="#C87438" />
        </linearGradient>

        <!-- 绿色: 54C1CC - 335F66 / 阴影: 2B3E44 -->
        <linearGradient id="g-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#54C1CC" />
          <stop offset="100%" stop-color="#335F66" />
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
        <!-- R: 橙色 -->
        <text
            x="50" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-orange)"
            stroke="#873706"
            stroke-width="5"
            stroke-linejoin="round"
        >R</text>

        <!-- I: 紫色 -->
        <text
            x="140" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-purple)"
            stroke="#3C3D4F"
            stroke-width="5"
            stroke-linejoin="round"
        >I</text>

        <!-- K: 粉色 -->
        <text
            x="190" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-pink)"
            stroke="#B5447B"
            stroke-width="5"
            stroke-linejoin="round"
        >K</text>

        <!-- K: 粉色-->
        <text
            x="290" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-pink)"
            stroke="#B5447B"
            stroke-width="5"
            stroke-linejoin="round"
        >K</text>

        <!-- A: 绿色 -->
        <text
            x="390" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-green)"
            stroke="#2B3E44"
            stroke-width="5"
            stroke-linejoin="round"
        >A</text>

        <!-- NOTE -->
        <!-- N: 紫色 -->
        <text
            x="535" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-purple)"
            stroke="#3C3D4F"
            stroke-width="5"
            stroke-linejoin="round"
        >N</text>

        <!-- O: 橙色 -->
        <text
            x="630" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-orange)"
            stroke="#873706"
            stroke-width="5"
            stroke-linejoin="round"
        >O</text>

        <!-- T: 绿色 -->
        <text
            x="725" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-green)"
            stroke="#2B3E44"
            stroke-width="5"
            stroke-linejoin="round"
        >T</text>

        <!-- E: 粉色 -->
        <text
            x="810" y="140"
            font-family="Arial Black, Helvetica, sans-serif"
            font-size="90"
            font-weight="900"
            fill="url(#g-pink)"
            stroke="#B5447B"
            stroke-width="5"
            stroke-linejoin="round"
        >E</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
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