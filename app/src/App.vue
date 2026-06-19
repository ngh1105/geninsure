<template>
  <Suspense>
    <template #default>
      <InsuranceScreen />
    </template>
    <template #fallback>
      <div class="flex items-center justify-center h-screen bg-gray-950">
        <div class="text-white text-lg">Loading GenInsure...</div>
      </div>
    </template>
  </Suspense>
</template>

<script setup>
import InsuranceScreen from "./components/InsuranceScreen.vue";
</script>
