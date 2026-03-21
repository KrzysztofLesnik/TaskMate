<script setup>
import Nav from "./components/Nav.vue"
</script>

<template>
  <div class="taskmate-app-shell">
    <Nav />

    <main class="taskmate-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.taskmate-app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.taskmate-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}
</style>