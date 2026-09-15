<script setup lang="ts">
// Тонкий роутер: сам не редактирует Building JSON, только выбирает, какой из
// пяти PropertiesRoom/Wall/Door/Window/Empty показать под текущий selectedObject
// (единый selection state из useBuilding — см. selectedObject computed).
const { selectedRoom, selectedWall, selectedOpening } = useBuilding()
</script>

<template>
  <BuilderPropertiesRoom v-if="selectedRoom && selectedRoom.geometry.type === 'rectangle'" :room="selectedRoom" />
  <BuilderPropertiesWall v-else-if="selectedWall" :wall="selectedWall" />
  <BuilderPropertiesDoor v-else-if="selectedOpening && selectedOpening.type === 'door'" :opening="selectedOpening" />
  <BuilderPropertiesWindow v-else-if="selectedOpening" :opening="selectedOpening" />
  <BuilderPropertiesEmpty v-else />
</template>
