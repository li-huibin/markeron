<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window'
import { useI18n } from '../i18n'

const { t } = useI18n()

const tauriWindow = getCurrentWindow()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const isSelecting = ref(false)
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const currentY = ref(0)

const selectedRegion = computed(() => {
  const x = Math.min(startX.value, currentX.value)
  const y = Math.min(startY.value, currentY.value)
  const width = Math.abs(currentX.value - startX.value)
  const height = Math.abs(currentY.value - startY.value)
  return { x, y, width, height }
})

const showResultMenu = ref(false)
const resultMenuX = ref(0)
const resultMenuY = ref(0)
const capturedImage = ref<string | null>(null)

function resetSelection() {
  isSelecting.value = false
  startX.value = 0
  startY.value = 0
  currentX.value = 0
  currentY.value = 0
  showResultMenu.value = false
  capturedImage.value = null

  const canvas = canvasRef.value
  const container = containerRef.value
  if (canvas && container) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = container.offsetWidth * dpr
  canvas.height = container.offsetHeight * dpr

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
  }
}

function drawSelection() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, container.offsetWidth, container.offsetHeight)

  const region = selectedRegion.value

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, container.offsetWidth, container.offsetHeight)

  ctx.clearRect(region.x, region.y, region.width, region.height)

  ctx.strokeStyle = '#FF0000'
  ctx.lineWidth = 2
  ctx.strokeRect(region.x, region.y, region.width, region.height)

  const padding = 8
  ctx.fillStyle = '#FF0000'
  ctx.fillRect(region.x - padding, region.y - padding, padding * 2, padding)
  ctx.fillRect(region.x - padding, region.y - padding, padding, padding * 2)

  ctx.fillRect(region.x + region.width - padding, region.y - padding, padding * 2, padding)
  ctx.fillRect(region.x + region.width, region.y - padding, padding, padding * 2)

  ctx.fillRect(region.x - padding, region.y + region.height - padding, padding * 2, padding)
  ctx.fillRect(region.x - padding, region.y + region.height, padding, padding * 2)

  ctx.fillRect(region.x + region.width - padding, region.y + region.height - padding, padding * 2, padding)
  ctx.fillRect(region.x + region.width, region.y + region.height, padding, padding * 2)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${Math.round(region.width)} × ${Math.round(region.height)}`, region.x + region.width / 2, region.y - 15)
}

async function captureAndClose() {
  const region = selectedRegion.value
  if (region.width < 10 || region.height < 10) return

  try {
    const dpr = window.devicePixelRatio || 1
    const imageDataUrl = await invoke<string>('capture_region', {
      x: Math.round(region.x * dpr),
      y: Math.round(region.y * dpr),
      width: Math.round(region.width * dpr),
      height: Math.round(region.height * dpr),
    })

    capturedImage.value = imageDataUrl
    resultMenuX.value = region.x + region.width / 2
    resultMenuY.value = region.y + region.height / 2
    showResultMenu.value = true
  } catch (error) {
    console.error('Capture failed:', error)
    await tauriWindow.hide()
  }
}

async function handlePointerDown(e: PointerEvent) {
  isSelecting.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  currentX.value = e.clientX
  currentY.value = e.clientY
}

async function handlePointerMove(e: PointerEvent) {
  if (!isSelecting.value) return
  currentX.value = e.clientX
  currentY.value = e.clientY
  drawSelection()
}

async function handlePointerUp() {
  if (!isSelecting.value) return
  isSelecting.value = false

  const region = selectedRegion.value
  if (region.width >= 10 && region.height >= 10) {
    await captureAndClose()
  } else {
    await tauriWindow.hide()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    tauriWindow.hide()
  }
}

async function onPinImage() {
  if (!capturedImage.value) return

  await invoke('pin_screenshot', { image: capturedImage.value })
  showResultMenu.value = false
  await tauriWindow.hide()
}

async function onCancel() {
  showResultMenu.value = false
  await tauriWindow.hide()
}

onMounted(async () => {
  resetSelection()
  resizeCanvas()

  window.addEventListener('resize', resizeCanvas)

  await tauriWindow.setSize(new LogicalSize(window.screen.availWidth, window.screen.availHeight))
  await tauriWindow.setPosition(new LogicalPosition(0, 0))

  await tauriWindow.show()
  await tauriWindow.setFocus()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <div
    ref="containerRef"
    class="fixed inset-0 w-screen h-screen bg-transparent overflow-hidden screenshot-cursor"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @keydown="handleKeyDown"
    tabindex="0"
  >
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />

    <div
      v-if="showResultMenu"
      class="absolute bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 p-2 z-50"
      :style="{
        left: `${resultMenuX}px`,
        top: `${resultMenuY}px`,
        transform: 'translate(-50%, -50%)',
      }"
    >
      <div class="flex flex-col gap-1">
        <button
          class="px-4 py-2 text-white hover:bg-gray-700 rounded-md text-sm flex items-center gap-2 transition-colors"
          @click="onPinImage"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <path d="M5 12h14"></path>
          </svg>
          {{ t('screenshot.pin') }}
        </button>
        <button
          class="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md text-sm flex items-center gap-2 transition-colors"
          @click="onCancel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          {{ t('screenshot.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screenshot-cursor {
  cursor: crosshair;
}
</style>
