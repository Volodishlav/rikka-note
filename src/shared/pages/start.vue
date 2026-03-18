<template>
  <div id="app">
    <canvas ref="canvasEl"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
const config = {
  shapeCount: 15,   // 几何体数量
  splineCount: 5   // 扭曲流体线条数量
}
// 辅助函数：计算二次贝塞尔曲线上的点
// P = (1-t)^2 * P0 + 2t(1-t) * P1 + t^2 * P2
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
    // 基础移动速度
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = (Math.random() - 0.5) * 0.5

    // 尺寸控制 (3D 空间中的基础大小)
    this.size = Math.random() * 30 + 15

    // 3D 旋转角度 (X, Y, Z轴)
    this.rotX = Math.random() * Math.PI * 2
    this.rotY = Math.random() * Math.PI * 2
    this.rotZ = Math.random() * Math.PI * 2
    // 旋转速度
    this.vRotX = (Math.random() - 0.5) * 0.01
    this.vRotY = (Math.random() - 0.5) * 0.01
    this.vRotZ = (Math.random() - 0.5) * 0.01

    // 色彩与流动控制
    this.hue = Math.random() * 360
    this.hueSpeed = Math.random()  + 0.1
    this.gradientOffset = 0
    this.gradientSpeed = 0.2

    // 随机选择形状类型：0 为正方体，1 为四面体
    this.type = Math.random() > 0.5 ? 0 : 1
    this.initShape()
  }

  initShape() {
    this.vertices = []
    this.edges = []

    if (this.type === 0) {
      // 构造正方体的 8 个顶点 (取值范围 -1 到 1)
      this.vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
      ]
      // 构造正方体的 12 条边 (顶点的索引)
      this.edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // 后平面
        [4, 5], [5, 6], [6, 7], [7, 4], // 前平面
        [0, 4], [1, 5], [2, 6], [3, 7]  // 连接前后平面的线
      ]
    } else {
      // 构造正四面体的 4 个顶点
      this.vertices = [
        [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
      ]
      // 构造四面体的 6 条边
      this.edges = [
        [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]
      ]
    }
  }

  update(width, height) {
    this.x += this.vx
    this.y += this.vy
    this.rotX += this.vRotX
    this.rotY += this.vRotY
    this.rotZ += this.vRotZ
    this.hue = (this.hue + this.hueSpeed) % 360
    this.gradientOffset = (this.gradientOffset + this.gradientSpeed) % 360

    // 边缘回弹逻辑 (留有一定裕度避免穿模)
    const margin = this.size * 2
    if (this.x < -margin || this.x > width + margin) this.vx *= -1
    if (this.y < -margin || this.y > height + margin) this.vy *= -1
  }

  // 核心：3D旋转计算
  rotate3D(x, y, z) {
    // 绕 X 轴旋转
    let cosX = Math.cos(this.rotX), sinX = Math.sin(this.rotX)
    let y1 = y * cosX - z * sinX
    let z1 = y * sinX + z * cosX

    // 绕 Y 轴旋转
    let cosY = Math.cos(this.rotY), sinY = Math.sin(this.rotY)
    let x2 = x * cosY + z1 * sinY
    let z2 = -x * sinY + z1 * cosY

    // 绕 Z 轴旋转
    let cosZ = Math.cos(this.rotZ), sinZ = Math.sin(this.rotZ)
    let x3 = x2 * cosZ - y1 * sinZ
    let y3 = x2 * sinZ + y1 * cosZ

    return [x3, y3, z2]
  }

  draw(ctx) {
    ctx.lineWidth = 0.8
    const fov = 250 // 视场深度：值越大透视变形越小

    // 1. 先计算所有顶点在当前帧的 2D 投影坐标
    const projectedPoints = this.vertices.map(v => {
      // 放大基础坐标并进行 3D 旋转
      const [rx, ry, rz] = this.rotate3D(v[0] * this.size, v[1] * this.size, v[2] * this.size)

      // 透视投影公式：将 Z 轴深度转化为 2D 上的缩放比例
      const scale = fov / (fov + rz + this.size * 2)

      return {
        x: this.x + rx * scale,
        y: this.y + ry * scale,
        z: rz // 保留 z 深度，如果未来你想做遮挡剔除可以用上
      }
    })

    // 2. 根据投影后的点，绘制连线并赋予色彩流动效果
    this.edges.forEach((edge, index) => {
      const p1 = projectedPoints[edge[0]]
      const p2 = projectedPoints[edge[1]]

      // 为了性能和连贯性，我们直接利用起点和终点的坐标创建线性渐变
      // 利用边的索引 (index) 制造色彩差异，结合全局 hue 和 gradientOffset 形成流动感
      const hue1 = (this.hue + this.gradientOffset + index * 15) % 360
      const hue2 = (this.hue + this.gradientOffset + (index + 2) * 15) % 360

      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
      gradient.addColorStop(0, `hsla(${hue1}, 85%, 65%, 0.85)`)
      gradient.addColorStop(1, `hsla(${hue2}, 85%, 65%, 0.85)`)

      ctx.strokeStyle = gradient
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    })
  }
}

/*
 2D几何体类
*/
class GeometricShape {
  constructor(width, height) {
    this.x = Math.random() * width
    this.y = Math.random() * height
    // 随机移动速度
    this.vx = (Math.random() - 0.5) * 1.5
    this.vy = (Math.random() - 0.5) * 1.5
    // 尺寸大小
    this.size = Math.random() * 40 + 10
    // 旋转角度与自转速度
    this.angle = Math.random() * Math.PI * 2
    this.vAngle = (Math.random() - 0.5) * 0.05
    // 色相及其变化速度 (用于流动的基准色)
    this.hue = Math.random() * 360
    this.hueSpeed = Math.random() * 1.5 + 0.5
    // 形状类型 (0为圆, 3为三角形, 4为正方形, 5+为多边形)
    this.sides = Math.random() > 0.3 ? Math.floor(Math.random() * 5) + 3 : 0
    // 色彩流动偏移
    this.gradientOffset = 0
    this.gradientSpeed = 2 // 颜色流动的速度
  }

  update(width, height) {
    // 更新位置
    this.x += this.vx
    this.y += this.vy
    this.angle += this.vAngle
    this.hue = (this.hue + this.hueSpeed) % 360
    this.gradientOffset = (this.gradientOffset + this.gradientSpeed) % 360

    // 边缘碰撞回弹
    if (this.x < -this.size || this.x > width + this.size) this.vx *= -1
    if (this.y < -this.size || this.y > height + this.size) this.vy *= -1
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    // 线条极细
    ctx.lineWidth = 0.5

    const numSamples = 120 // 用于采样轮廓以创建流动渐变的采样点数

    if (this.sides === 0) {
      // 画流动色的圆
      // 通过将圆周分成小段，并为每一段设置微小的线性渐变来实现色彩流动
      for (let i = 0; i < numSamples; i++) {
        const theta1 = (Math.PI * 2 * i) / numSamples
        const theta2 = (Math.PI * 2 * (i + 1)) / numSamples
        const px1 = Math.cos(theta1) * this.size
        const py1 = Math.sin(theta1) * this.size
        const px2 = Math.cos(theta2) * this.size
        const py2 = Math.sin(theta2) * this.size

        // 计算当前小段的 normalized 位置 (0 到 1)
        const p1 = i / numSamples
        const p2 = (i + 1) / numSamples
        // 根据位置和偏移量计算流动色相
        const hue1 = (this.hue + this.gradientOffset + p1 * 360) % 360
        const hue2 = (this.hue + this.gradientOffset + p2 * 360) % 360

        // 创建微小的线性渐变，从前一个采样点到当前采样点
        const gradient = ctx.createLinearGradient(px1, py1, px2, py2)
        gradient.addColorStop(0, `hsla(${hue1}, 85%, 55%, 0.8)`)
        gradient.addColorStop(1, `hsla(${hue2}, 85%, 55%, 0.8)`)

        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(px1, py1)
        ctx.lineTo(px2, py2)
        ctx.stroke()
      }
    } else {
      // 画流动色的多边形
      // 需要计算总周长，沿边采样，计算沿周长的位置，并分段绘制

      // 1. 计算顶点
      const vertices = []
      for (let i = 0; i < this.sides; i++) {
        const theta = (Math.PI * 2 * i) / this.sides
        vertices.push({
          x: Math.cos(theta) * this.size,
          y: Math.sin(theta) * this.size
        })
      }
      vertices.push(vertices[0]) // 闭合多边形

      // 2. 计算总周长
      let totalPerimeter = 0
      for (let i = 0; i < this.sides; i++) {
        const dx = vertices[i + 1].x - vertices[i].x
        const dy = vertices[i + 1].y - vertices[i].y
        totalPerimeter += Math.sqrt(dx * dx + dy * dy)
      }

      // 3. 沿边采样和分段绘制
      let currentLength = 0
      for (let i = 0; i < this.sides; i++) {
        const startPoint = vertices[i]
        const endPoint = vertices[i + 1]
        const edgeLength = Math.sqrt(
            (endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2
        )

        // 根据边的长度按比例分配采样点
        const numEdgeSamples = Math.ceil((edgeLength / totalPerimeter) * numSamples)

        for (let j = 0; j < numEdgeSamples; j++) {
          const t1 = j / numEdgeSamples
          const t2 = (j + 1) / numEdgeSamples
          const px1 = startPoint.x + (endPoint.x - startPoint.x) * t1
          const py1 = startPoint.y + (endPoint.y - startPoint.y) * t1
          const px2 = startPoint.x + (endPoint.x - startPoint.x) * t2
          const py2 = startPoint.y + (endPoint.y - startPoint.y) * t2

          const len1 = currentLength + t1 * edgeLength
          const len2 = currentLength + t2 * edgeLength
          const p1 = len1 / totalPerimeter
          const p2 = len2 / totalPerimeter

          const hue1 = (this.hue + this.gradientOffset + p1 * 360) % 360
          const hue2 = (this.hue + this.gradientOffset + p2 * 360) % 360

          const gradient = ctx.createLinearGradient(px1, py1, px2, py2)
          gradient.addColorStop(0, `hsla(${hue1}, 85%, 55%, 0.8)`)
          gradient.addColorStop(1, `hsla(${hue2}, 85%, 55%, 0.8)`)

          ctx.strokeStyle = gradient
          ctx.beginPath()
          ctx.moveTo(px1, py1)
          ctx.lineTo(px2, py2)
          ctx.stroke()
        }
        currentLength += edgeLength
      }
    }
    ctx.restore()
  }
}

// 肆意扭动变化的流体线条类 (基于多个控制点的平滑样条曲线，具有流动色彩)
class FluidSpline {
  constructor(width, height) {
    this.numPoints = Math.floor(Math.random() * 4) + 4
    this.points = []
    for (let i = 0; i < this.numPoints; i++) {
      this.points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) ,
        vy: (Math.random() - 0.5)
      })
    }
    this.hue = Math.random() * 360
    this.hueSpeed = Math.random()  + 0.1
    // 色彩流动偏移
    this.gradientOffset = 0
    this.gradientSpeed = 0.2
  }

  update(width, height) {
    this.hue = (this.hue + this.hueSpeed) % 360
    this.gradientOffset = (this.gradientOffset + this.gradientSpeed) % 360

    this.points.forEach(pt => {
      pt.x += pt.vx
      pt.y += pt.vy
      if (pt.x < 0 || pt.x > width) pt.vx *= -1
      if (pt.y < 0 || pt.y > height) pt.vy *= -1
    })
  }

  draw(ctx) {
    ctx.lineWidth = 1.2 // 稍微加粗一点点，让流动色彩更显眼
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const numSamples = 120 // 整条线的采样分段数

    // 1. 正确构建连续的贝塞尔曲线段
    let totalSplineLength = 0
    const curveSegments = []
    let startPt = this.points[0] // 正确的起点初始化

    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = startPt // 起点承接上一个分段的终点
      const p1 = this.points[i] // 控制点
      const p2 = { // 终点为两点中点
        x: (this.points[i].x + this.points[i + 1].x) / 2,
        y: (this.points[i].y + this.points[i + 1].y) / 2
      }
      const length = computeQuadraticBezierLength(p0, p1, p2, 20)
      curveSegments.push({ p0, p1, p2, length })
      totalSplineLength += length
      startPt = p2 // 将终点作为下一段的起点
    }

    // 闭合最后一段连接
    const lastPt = this.points[this.points.length - 1]
    const lastLength = computeQuadraticBezierLength(startPt, lastPt, lastPt, 20)
    curveSegments.push({ p0: startPt, p1: lastPt, p2: lastPt, length: lastLength })
    totalSplineLength += lastLength

    // 2. 采样并绘制带有流动色彩的微小线段 (实色拼接法，性能极佳)
    let currentTotalLen = 0
    let prevPoint = curveSegments[0].p0

    curveSegments.forEach(seg => {
      // 根据当前段的长度占比，按比例分配采样点数量
      const segmentSamples = Math.max(1, Math.floor((seg.length / totalSplineLength) * numSamples))

      for (let j = 1; j <= segmentSamples; j++) {
        const t = j / segmentSamples
        const currentPoint = getQuadraticBezierPoint(t, seg.p0, seg.p1, seg.p2)

        // 计算当前节点在整条线上的长度进度 (0 到 1)
        const dx = currentPoint.x - prevPoint.x
        const dy = currentPoint.y - prevPoint.y
        currentTotalLen += Math.sqrt(dx * dx + dy * dy)
        const progress = currentTotalLen / totalSplineLength

        // 计算这极小一截线段的对应色相
        const currentHue = (this.hue + this.gradientOffset + progress * 360) % 360

        ctx.beginPath()
        ctx.moveTo(prevPoint.x, prevPoint.y)
        ctx.lineTo(currentPoint.x, currentPoint.y)
        // 使用单色实线绘制微小线段，避免渐变对象带来的性能损耗
        ctx.strokeStyle = `hsla(${currentHue}, 90%, 60%, 0.8)`
        ctx.stroke()

        prevPoint = currentPoint
      }
    })
  }
}

const canvasEl = ref(null)
let ctx = null
let width = 0
let height = 0
let animationFrameId = null
let elements = [] // 存储所有视觉元素

// 处理窗口尺寸和高分屏缩放
const resize = () => {
  if (!canvasEl.value) return
  const dpr = window.devicePixelRatio || 1
  width = window.innerWidth
  height = window.innerHeight

  // 设置画布物理像素大小
  canvasEl.value.width = width * dpr
  canvasEl.value.height = height * dpr
  // 设置 CSS 逻辑尺寸
  canvasEl.value.style.width = width + 'px'
  canvasEl.value.style.height = height + 'px'

  ctx = canvasEl.value.getContext('2d')
  ctx.scale(dpr, dpr)
}
// 3D几何体初始化
const initElements = () => {
  elements = []

  // 使用配置变量
  for (let i = 0; i < config.shapeCount; i++) {
    elements.push(new Wireframe3D(width, height))
  }

  for (let i = 0; i < config.splineCount; i++) {
    elements.push(new FluidSpline(width, height))
  }
}
//2D几何体初始化
// const initElements = () => {
//   elements = []
//
//   // 使用配置变量
//   for (let i = 0; i < config.shapeCount; i++) {
//     elements.push(new GeometricShape(width, height))
//   }
//
//   for (let i = 0; i < config.splineCount; i++) {
//     elements.push(new FluidSpline(width, height))
//   }
// }
const animate = () => {
  // 核心拖影效果：不使用 clearRect，而是覆盖一层带有一定透明度的白色矩形
  // alpha 控制拖影长短，0.08 会留下优雅且逐渐消失的渐变轨迹
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.fillRect(0, 0, width, height)

  // 更新并绘制每一个元素
  elements.forEach(el => {
    el.update(width, height)
    el.draw(ctx)
  })

  animationFrameId = requestAnimationFrame(animate)
}

// Vue 生命周期
onMounted(() => {
  resize()
  initElements()

  // 初始纯白背景铺底
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  animate()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  cancelAnimationFrame(animationFrameId)
})
</script>

<style>
body, html {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #ffffff; /* 纯白背景 */
  width: 100vw;
  height: 100vh;
}
#app {
  width: 100%;
  height: 100%;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  /* 避免默认的触控行为干扰 */
  touch-action: none;
}
</style>