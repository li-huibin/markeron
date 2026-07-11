<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window'

const appWindow = getCurrentWindow()

const imageSrc = ref<string>('')
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragWindowStartX = ref(0)
const dragWindowStartY = ref(0)

function parsePinIdFromHash(): number | null {
  const match = window.location.hash.match(/^#pinned-image\/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

async function loadImage() {
  const id = parsePinIdFromHash()
  if (id === null) return

  try {
    const data = await invoke<string | null>('take_pinned_image', { id })
    if (data) {
      imageSrc.value = data

      const img = new Image()
      img.onload = () => {
        const maxWidth = 600
        const maxHeight = 450
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          const ratio = maxWidth / w
          w = maxWidth
          h = h * ratio
        }
        if (h > maxHeight) {
          const ratio = maxHeight / h
          h = maxHeight
          w = w * ratio
        }
        appWindow.setSize(new LogicalSize(Math.round(w), Math.round(h) + 32))
      }
      img.src = data
    }
  } catch {}
}

async function onDragStart(e: MouseEvent) {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  const pos = await appWindow.innerPosition()
  dragWindowStartX.value = pos.x
  dragWindowStartY.value = pos.y
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStartX.value
  const dy = e.clientY - dragStartY.value
  appWindow.setPosition(new LogicalPosition(dragWindowStartX.value + dx, dragWindowStartY.value + dy))
}

function onDragEnd() {
  isDragging.value = false
}

async function closeWindow() {
  await appWindow.close()
}

onMounted(() => {
  loadImage()
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
})
</script>

<template>
  <div class="pinned-image-window">
    <div class="pinned-image-header" @mousedown="onDragStart">
      <span class="pinned-image-title">截图</span>
      <button class="pinned-image-close" @click="closeWindow">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
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
      </button>
    </div>
    <div class="pinned-image-body">
      <img v-if="imageSrc" :src="imageSrc" class="pinned-image-img" draggable="false" />
    </div>
  </div>
</template>

<style scoped>
.pinned-image-window {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(20, 20, 20, 0.95);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  user-select: none;
}

.pinned-image-header {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: rgba(40, 40, 40, 0.9);
  cursor: move;
  flex-shrink: 0;
}

.pinned-image-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.pinned-image-close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.pinned-image-close:hover {
  background: rgba(255, 80, 80, 0.8);
  color: white;
}

.pinned-image-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pinned-image-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}
</style>
