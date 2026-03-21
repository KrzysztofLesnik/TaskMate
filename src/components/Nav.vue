<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../api/firebase"

const router = useRouter()
const currentUser = ref(null)

let unsubscribe = null

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

const logout = async () => {
  try {
    await signOut(auth)
    router.push("/")
  } catch (error) {
    console.error("Logout failed:", error.message)
  }
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark taskmate-navbar shadow-sm">
    <div class="container">
      <router-link to="/" class="navbar-brand d-flex align-items-center gap-2 fw-bold">
        <img
          src="/taskmate-logo.png"
          alt="TaskMate logo"
          class="taskmate-logo"
        />
        <span>TaskMate</span>
      </router-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#taskmateNav"
        aria-controls="taskmateNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="taskmateNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
          <li class="nav-item">
            <router-link to="/" class="nav-link">Home</router-link>
          </li>

          <li v-if="currentUser" class="nav-item">
            <router-link to="/projects" class="nav-link">Projects</router-link>
          </li>

          <li v-if="currentUser" class="nav-item">
            <router-link to="/settings" class="nav-link">Settings</router-link>
          </li>

          <li class="nav-item">
            <router-link to="/about" class="nav-link">About</router-link>
          </li>

          <template v-if="!currentUser">
            <li class="nav-item ms-lg-2">
              <router-link to="/login" class="btn btn-light btn-sm me-lg-2 mb-2 mb-lg-0">
                Login
              </router-link>
            </li>

            <li class="nav-item">
              <router-link to="/register" class="btn btn-success btn-sm">
                Register
              </router-link>
            </li>
          </template>

          <template v-else>
            <li class="nav-item me-lg-3 text-white small">
              {{ currentUser.email }}
            </li>

            <li class="nav-item">
              <button class="btn btn-light btn-sm" @click="logout">
                Logout
              </button>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.taskmate-navbar {
  background: linear-gradient(90deg, #0d6efd, #198754);
}

.taskmate-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.nav-link.router-link-active {
  font-weight: 700;
  color: #ffffff !important;
}
</style>