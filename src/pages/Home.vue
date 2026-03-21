<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../api/firebase"

const welcomeMessage = ref("")
const currentUser = ref(null)

let unsubscribe = null

onMounted(() => {
  welcomeMessage.value = "Helping You Stay on Track"

  unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-md">
      <div class="card yellow-sticker-card p-4 p-md-5 text-center">
        <div class="mb-2">
          <img
            src="/taskmate-logo.png"
            alt="TaskMate logo"
            class="home-logo img-fluid"
          />
        </div>

        <p class="lead text-dark mb-4">
          {{ welcomeMessage }}
        </p>

        <div class="d-flex flex-column flex-md-row justify-content-center gap-3">
          <template v-if="!currentUser">
            <router-link to="/register" class="btn btn-success btn-lg px-4">
              Get Started
            </router-link>

            <router-link to="/login" class="btn btn-primary btn-lg px-4">
              Login
            </router-link>
          </template>

          <template v-else>
            <router-link to="/projects" class="btn btn-success btn-lg px-4">
              My Projects
            </router-link>

            <router-link to="/settings" class="btn btn-primary btn-lg px-4">
              Settings
            </router-link>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-logo {
  width: 600px;
  max-width: 90%;
  height: auto;
  display: block;
  margin: 0 auto;
}
</style>