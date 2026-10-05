<script setup lang="ts">
// Единый круг-аватар мастера (Contractor Profile Photo v1) — заменяет
// повторявшийся в трёх местах inline-плейсхолдер "круг + UiIcon 'user'"
// (contractor.vue/contractors/[id].vue/PublicContractorCard.vue, см. их
// историю) одним компонентом, чтобы не было пяти реализаций avatar (см.
// задание, секция 13). Тот же визуальный стиль плейсхолдера, что и раньше
// (background: var(--color-primary-subtle), color: var(--color-primary)) —
// просто теперь поверх него показывается img, когда photoUrl не null.
// name — реальное имя контрактора (contractorDisplayName()), используется
// только как alt текста, ничего не выдумывается.
withDefaults(defineProps<{ photoUrl: string | null, name: string, size?: number, iconSize?: number }>(), {
  size: 64,
  iconSize: 28,
})
</script>

<template>
  <span class="contractor-avatar" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="photoUrl" :src="photoUrl" :alt="name" class="contractor-avatar__img">
    <UiIcon v-else name="user" :size="iconSize" />
  </span>
</template>

<style scoped>
.contractor-avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  overflow: hidden;
}

.contractor-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
