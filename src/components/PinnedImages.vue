<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useI18n } from '../i18n'

const { t } = useI18n()

interface PinnedImage {
  id: number
  src: string
  x: number
  y: number
  width: number
  height: number
  scale: number
}

const images = ref<PinnedImage[]>([])
let nextId = 1

const isDragging = ref(false)
const dragImageId = ref<number | null>(null)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)

function addImage(src: string) {
  const img = new Image()
  img.onload = () => {
    const maxWidth = 400
    const maxHeight = 300

    let width = img.width
    let height = img.height

    if (width > maxWidth) {
      const ratio = maxWidth / width
      width = maxWidth
      height = height * ratio
    }
    if (height > maxHeight) {
      const ratio = maxHeight / height
      height = maxHeight
      width = width * ratio
    }

    const newImage: PinnedImage = {
      id: nextId++,
      src,
      x: 50 + (images.value.length % 3) * 100,
      y: 50 + Math.floor(images.value.length / 3) * 100,
      width,
      height,
      scale: 1,
    }

    images.value.push(newImage)
  }
  img.src = src
}

function removeImage(id: number) {
  const index = images.value.findIndex((img) => img.id === id)
  if (index !== -1) {
    images.value.splice(index, 1)
  }
}

function handleMouseDown(e: MouseEvent, id: number) {
  const image = images.value.find((img) => img.id === id)
  if (!image) return

  isDragging.value = true
  dragImageId.value = id
  dragOffsetX.value = e.clientX - image.x
  dragOffsetY.value = e.clientY - image.y

  const index = images.value.indexOf(image)
  if (index !== -1 && index !== images.value.length - 1) {
    images.value.splice(index, 1)
    images.value.push(image)
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value || dragImageId.value === null) return

  const image = images.value.find((img) => img.id === dragImageId.value)
  if (!image) return

  image.x = e.clientX - dragOffsetX.value
  image.y = e.clientY - dragOffsetY.value
}

function handleMouseUp() {
  isDragging.value = false
  dragImageId.value = null
}

function handleWheel(e: WheelEvent, id: number) {
  e.preventDefault()

  const image = images.value.find((img) => img.id === id)
  if (!image) return

  const delta = e.deltaY > 0 ? -0.1 : 0.1
  image.scale = Math.max(0.5, Math.min(2, image.scale + delta))
}

async function handlePinImage(event: { payload: { image: string } }) {
  addImage(event.payload.image)
}

let unlisten: UnlistenFn | null = null

onMounted(async () => {
  unlisten = await listen('pin-image', handlePinImage)
})

onUnmounted(() => {
  if (unlisten) {
    unlisten()
  }
})
</script>

<template>
  <div
    class="fixed inset-0 w-screen h-screen pointer-events-none overflow-hidden"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
  >
    <div
      v-for="image in images"
      :key="image.id"
      class="absolute pointer-events-auto group"
      :style="{
        left: `${image.x}px`,
        top: `${image.y}px`,
        transform: `scale(${image.scale})`,
        transformOrigin: 'top left',
      }"
      @mousedown="handleMouseDown($event, image.id)"
      @wheel="handleWheel($event, image.id)"
    >
      <div class="relative bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
        <img :src="image.src" :width="image.width" :height="image.height" class="block" draggable="false" />
        <button
          class="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="removeImage(image.id)"
        >
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
    </div>
  </div>
</template>
