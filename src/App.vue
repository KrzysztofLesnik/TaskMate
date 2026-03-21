<script setup>
import Nav from "./components/Nav.vue"
import GlobalChat from "./components/GlobalChat.vue"
</script>

<template>
  <div class="app-wrapper">
    <Nav />

    <main class="main-content">
      <router-view />
    </main>

    <GlobalChat />
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>