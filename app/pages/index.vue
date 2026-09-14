<script setup lang="ts">
useHead({ title: 'Remont — 2D Builder' })
</script>

<template>
  <main class="page">
    <h1 class="page__title">
      Remont — 2D Builder
    </h1>
    <Builder />
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px;
  background: #f5f6f8;
  box-sizing: border-box;
}

.page__title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2430;
}
</style>
