<template>
  <div class="canvas-bg-container w-full h-full">
    <canvas ref="canvasEl"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  paused: {
    type: Boolean,
    default: false
  }
})

const { effectiveTheme } = useTheme()

const config = {
  shapeCount: 16,    // 几何体数量
  splineCount: 3,    // 扭曲流体线条数量
  trailLength: 20,   // 轨迹拖影长度（3~5 效果最佳）
  baseAlpha: 0.85    // 基础不透明度
}

const isIntersecting = ref(true) // 默认认为可见

// 获取当主题色彩配置
const getThemeColors = () => {
  const isDark = effectiveTheme.value === 'dark'
  return {
    isDark,
    // 纯背景底色 (与 globals.scss 对应)
    bgSolid: isDark ? '#111827' : '#fafafa',
    // 形状配色参数
    shapeLightness: isDark ? 60 : 65,
    shapeAlpha: config.baseAlpha
  }
}

// 辅助函数：计算二次贝塞尔曲线上的点
const getQuadraticBezierPoint = (t, p0, p1, p2) => {
  const c = 1 - t
  return {
    x: c * c * p0.x + 2 * t * c * p1.x + t * t * p2.x,
    y: c * c * p0.y + 2 * t * c * p1.y + t * t * p2.y
  }
}

// 辅助函数：近似计算二次贝塞尔曲线的长度
const computeQuadraticBezierLength = (p0, p1, p2, numSamples = 100) => {
  let length = 0
  let prevPoint = getQuadraticBezierPoint(0, p0, p1, p2)
  for (let i = 1; i <= numSamples; i++) {
    const t = i / numSamples
    const currentPoint = getQuadraticBezierPoint(t, p0, p1, p2)
    const dx = currentPoint.x - prevPoint.x
    const dy = currentPoint.y - prevPoint.y
    length += Math.sqrt(dx * dx + dy * dy)
    prevPoint = currentPoint
  }
  return length
}

// 3D 线框几何体类
class Wireframe3D {
  constructor(width, height) {
    this.x = Math.random() * width
    this.y = Math.random() * height
    this.vx = (Math.random() - 0.8) * 1.2
    this.vy = (Math.random() - 0.8) * 1.2
    this.size = Math.random() * 30 + 15
    this.rotX = Math.random() * Math.PI * 2
    this.rotY = Math.random() * Math.PI * 2
    this.rotZ = Math.random() * Math.PI * 2
    this.vRotX = (Math.random() - 0.5) * 0.01
    this.vRotY = (Math.random() - 0.5) * 0.01
    this.vRotZ = (Math.random() - 0.5) * 0.01
    this.hue = Math.random() * 360
    this.hueSpeed = Math.random()  + 0.1
    this.gradientOffset = 0
    this.gradientSpeed = 0.2
    this.type = Math.random() > 0.5 ? 0 : 1
    
    // 轨迹历史缓存
    this.history = []
    
    this.initShape()
  }

  initShape() {
    this.vertices = []
    this.edges = []
    if (this.type === 0) {
      this.vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
      ]
      this.edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]
      ]
    } else {
      this.vertices = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]
      this.edges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]
    }
  }

  update(width, height) {
    // 记录历史
    this.history.push({
      x: this.x, y: this.y, 
      rotX: this.rotX, rotY: this.rotY, rotZ: this.rotZ,
      hue: this.hue, gradientOffset: this.gradientOffset
    })
    if (this.history.length > config.trailLength) {
      this.history.shift()
    }

    this.x += this.vx
    this.y += this.vy
    this.rotX += this.vRotX
    this.rotY += this.vRotY
    this.rotZ += this.vRotZ
    this.hue = (this.hue + this.hueSpeed) % 360
    this.gradientOffset = (this.gradientOffset + this.gradientSpeed) % 360

    const margin = this.size * 2
    if (this.x < -margin || this.x > width + margin) this.vx *= -1
    if (this.y < -margin || this.y > height + margin) this.vy *= -1
  }

  rotate3D(x, y, z, rotX, rotY, rotZ) {
    let cosX = Math.cos(rotX), sinX = Math.sin(rotX)
    let y1 = y * cosX - z * sinX
    let z1 = y * sinX + z * cosX
    let cosY = Math.cos(rotY), sinY = Math.sin(rotY)
    let x2 = x * cosY + z1 * sinY
    let z2 = -x * sinY + z1 * cosY
    let cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ)
    let x3 = x2 * cosZ - y1 * sinZ
    let y3 = x2 * sinZ + y1 * cosZ
    return [x3, y3, z2]
  }

  drawSingle(ctx, state, theme, alphaMult) {
    const fov = 250
    const projectedPoints = this.vertices.map(v => {
      const [rx, ry, rz] = this.rotate3D(v[0] * this.size, v[1] * this.size, v[2] * this.size, state.rotX, state.rotY, state.rotZ)
      const scale = fov / (fov + rz + this.size * 2)
      return { x: state.x + rx * scale, y: state.y + ry * scale }
    })

    this.edges.forEach((edge, index) => {
      const p1 = projectedPoints[edge[0]]
      const p2 = projectedPoints[edge[1]]
      const hue1 = (state.hue + state.gradientOffset + index * 15) % 360
      const hue2 = (state.hue + state.gradientOffset + (index + 2) * 15) % 360
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
      gradient.addColorStop(0, `hsla(${hue1}, 85%, ${theme.shapeLightness}%, ${theme.shapeAlpha * alphaMult})`)
      gradient.addColorStop(1, `hsla(${hue2}, 85%, ${theme.shapeLightness}%, ${theme.shapeAlpha * alphaMult})`)
      ctx.strokeStyle = gradient
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    })
  }

  draw(ctx, theme) {
    ctx.lineWidth = 0.8
    // 绘制历史轨迹
    this.history.forEach((state, i) => {
      const alphaMult = (i + 1) / (this.history.length + 1) * 0.4 // 轨迹透明度渐减
      this.drawSingle(ctx, state, theme, alphaMult)
    })
    // 绘制当前本体
    this.drawSingle(ctx, this, theme, 1.0)
  }
}

// 肆意扭动变化的流体线条类
class FluidSpline {
  constructor(width, height) {
    this.numPoints = Math.floor(Math.random() * 4) + 4
    this.points = []
    for (let i = 0; i < this.numPoints; i++) {
      this.points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5
      })
    }
    this.hue = Math.random() * 360
    this.hueSpeed = Math.random()  + 0.1
    this.gradientOffset = 0
    this.gradientSpeed = 0.2
    
    // 历史状态缓存
    this.history = []
  }

  update(width, height) {
    // 拷贝当前所有点的坐标作为历史
    this.history.push({
      points: this.points.map(p => ({ x: p.x, y: p.y })),
      hue: this.hue,
      gradientOffset: this.gradientOffset
    })
    if (this.history.length > config.trailLength) {
      this.history.shift()
    }

    this.hue = (this.hue + this.hueSpeed) % 360
    this.gradientOffset = (this.gradientOffset + this.gradientSpeed) % 360

    this.points.forEach(pt => {
      pt.x += pt.vx
      pt.y += pt.vy
      if (pt.x < 0 || pt.x > width) pt.vx *= -1
      if (pt.y < 0 || pt.y > height) pt.vy *= -1
    })
  }

  drawSingle(ctx, state, theme, alphaMult) {
    ctx.lineWidth = 1.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const numSamples = 120
    let totalSplineLength = 0
    const curveSegments = []
    let startPt = state.points[0]

    for (let i = 0; i < state.points.length - 1; i++) {
      const p0 = startPt
      const p1 = state.points[i]
      const p2 = {
        x: (state.points[i].x + state.points[i + 1].x) / 2,
        y: (state.points[i].y + state.points[i + 1].y) / 2
      }
      const length = computeQuadraticBezierLength(p0, p1, p2, 20)
      curveSegments.push({ p0, p1, p2, length })
      totalSplineLength += length
      startPt = p2
    }
    const lastPt = state.points[state.points.length - 1]
    const lastLength = computeQuadraticBezierLength(startPt, lastPt, lastPt, 20)
    curveSegments.push({ p0: startPt, p1: lastPt, p2: lastPt, length: lastLength })
    totalSplineLength += lastLength

    let currentTotalLen = 0
    let prevPoint = curveSegments[0].p0

    curveSegments.forEach(seg => {
      const segmentSamples = Math.max(1, Math.floor((seg.length / totalSplineLength) * numSamples))
      for (let j = 1; j <= segmentSamples; j++) {
        const t = j / segmentSamples
        const currentPoint = getQuadraticBezierPoint(t, seg.p0, seg.p1, seg.p2)
        const dx = currentPoint.x - prevPoint.x
        const dy = currentPoint.y - prevPoint.y
        currentTotalLen += Math.sqrt(dx * dx + dy * dy)
        const progress = currentTotalLen / totalSplineLength
        const currentHue = (state.hue + state.gradientOffset + progress * 360) % 360
        ctx.beginPath()
        ctx.moveTo(prevPoint.x, prevPoint.y)
        ctx.lineTo(currentPoint.x, currentPoint.y)
        ctx.strokeStyle = `hsla(${currentHue}, 90%, ${theme.shapeLightness - 5}%, ${theme.shapeAlpha * alphaMult})`
        ctx.stroke()
        prevPoint = currentPoint
      }
    })
  }

  draw(ctx, theme) {
    // 绘制历史轨迹
    this.history.forEach((state, i) => {
      const alphaMult = (i + 1) / (this.history.length + 1) * 0.3
      this.drawSingle(ctx, state, theme, alphaMult)
    })
    // 绘制当前本体
    this.drawSingle(ctx, this, theme, 1.0)
  }
}

const canvasEl = ref(null)
let ctx = null
let width = 0
let height = 0
let animationFrameId = null
let elements = []

const resize = () => {
  if (!canvasEl.value) return
  const dpr = window.devicePixelRatio || 1
  width = window.innerWidth
  height = window.innerHeight
  canvasEl.value.width = width * dpr
  canvasEl.value.height = height * dpr
  canvasEl.value.style.width = width + 'px'
  canvasEl.value.style.height = height + 'px'
  ctx = canvasEl.value.getContext('2d')
  ctx.scale(dpr, dpr)
}

const initElements = () => {
  elements = []
  for (let i = 0; i < config.shapeCount; i++) {
    elements.push(new Wireframe3D(width, height))
  }
  for (let i = 0; i < config.splineCount; i++) {
    elements.push(new FluidSpline(width, height))
  }
}

const animate = () => {
  // 如果组件被设置为暂停，或者当前处于不可见状态，则停止循环
  if (props.paused || !isIntersecting.value) {
    animationFrameId = null
    return
  }

  const theme = getThemeColors()
  // 彻底清空画布，消除色彩堆积
  ctx.fillStyle = theme.bgSolid
  ctx.fillRect(0, 0, width, height)

  elements.forEach(el => {
    el.update(width, height)
    el.draw(ctx, theme)
  })

  animationFrameId = requestAnimationFrame(animate)
}

// 监听暂停状态和可见性变化，用于在恢复时重启动画循环
watch([() => props.paused, isIntersecting], ([newPaused, newVisible]) => {
  if (!newPaused && newVisible && !animationFrameId) {
    animate()
  }
})

watch(effectiveTheme, () => {
  if (ctx) {
    const theme = getThemeColors()
    ctx.fillStyle = theme.bgSolid
    ctx.fillRect(0, 0, width, height)
  }
})

let observer = null

onMounted(() => {
  resize()
  initElements()
  const theme = getThemeColors()
  ctx.fillStyle = theme.bgSolid
  ctx.fillRect(0, 0, width, height)

  // 初始化视口观察器
  observer = new IntersectionObserver((entries) => {
    isIntersecting.value = entries[0].isIntersecting
  }, { threshold: 0.01 })
  
  if (canvasEl.value) {
    observer.observe(canvasEl.value)
  }

  animate()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
  }
  window.removeEventListener('resize', resize)
  cancelAnimationFrame(animationFrameId)
})
</script>

<style>
.canvas-bg-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>