<script setup lang="ts">
import { onMounted, provide, computed } from 'vue'
import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
import { useTheme } from '@/hooks/useTheme';
import { mainStore } from '@/store';
import Loading from '@/components/Loading.vue';

useTheme();

const store = mainStore();
const isLoading = computed(() => store.isLoading);

const [serverTransport, clientTransport] = createMessageChannelPairTransport()
provide('serverTransport', serverTransport)
const client = new WebMcpClient()

onMounted(async () => {
  await client.connect(clientTransport)
  const { sessionId } = await client.connect({
    agent: true,
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp',
    sessionId: '5f8edea7-e3ae-4852-a334-1bb6b3a1cfa9'
  })
  console.log('sessionId:', sessionId)
})

</script>

<template>
  <div class="wrapper w-full h-full">
    <router-view />
  </div>
  <Loading :show="isLoading" />
  <tiny-remoter session-id="5f8edea7-e3ae-4852-a334-1bb6b3a1cfa9" />
</template>

<style scoped>
.wrapper {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}
</style>
