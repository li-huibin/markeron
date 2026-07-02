<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useUpdater } from './composables/useUpdater'

const DrawingOverlay = defineAsyncComponent(() => import('./components/DrawingOverlay.vue'))
const SettingsView = defineAsyncComponent(() => import('./components/SettingsView.vue'))
const ToolbarWindow = defineAsyncComponent(() => import('./components/ToolbarWindow.vue'))

type AppMode = 'overlay' | 'settings' | 'toolbar'

const mode = ref<AppMode>('overlay')

onMounted(() => {
  if (window.location.hash.startsWith('#settings')) {
    mode.value = 'settings'
    document.documentElement.classList.add('settings')

    const { checkForUpdate } = useUpdater()
    checkForUpdate(true)
  } else if (window.location.hash.startsWith('#toolbar')) {
    mode.value = 'toolbar'
  }
})
</script>

<template>
  <SettingsView v-if="mode === 'settings'" />
  <ToolbarWindow v-else-if="mode === 'toolbar'" />
  <DrawingOverlay v-else />
</template>
