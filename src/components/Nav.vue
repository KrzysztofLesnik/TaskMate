<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../api/firebase"

const router = useRouter()
const currentUser = ref(null)

let unsubscribe = null

const logoRoute = computed(() => {
  return currentUser.value ? "/create-project" : "/"
})

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
    console.error("Logout failed:", error)
  }
}
</script>

<template>
  <nav class="taskmate-navbar">
    <div class="container taskmate-navbar-inner">
      <router-link :to="logoRoute" class="taskmate-brand">
        <img
          src="/taskmate-logo.png"
          alt="TaskMate logo"
          class="taskmate-logo"
        />
        <span>TaskMate</span>
      </router-link>

      <div class="taskmate-nav-links">
        <router-link to="/" class="taskmate-link">
          Home
        </router-link>

        <router-link v-if="currentUser" to="/projects" class="taskmate-link">
          My Projects
        </router-link>

        <router-link v-if="currentUser" to="/settings" class="taskmate-link">
          Settings
        </router-link>

        <router-link v-if="!currentUser" to="/login" class="taskmate-auth-btn taskmate-login-btn">
          Login
        </router-link>

        <router-link v-if="!currentUser" to="/register" class="taskmate-auth-btn taskmate-register-btn">
          Register
        </router-link>

        <button v-if="currentUser" class="taskmate-logout-btn" @click="logout">
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.taskmate-navbar {
  width: 100%;
  background: linear-gradient(90deg, #0d6efd, #198754);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.taskmate-navbar-inner {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.taskmate-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #ffffff;
  text-decoration: none;
  font-size: 1.8rem;
  font-weight: 700;
}

.taskmate-brand:hover {
  color: #ffffff;
}

.taskmate-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
  display: block;
}

.taskmate-nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.taskmate-link {
  color: #ffffff;
  text-decoration: none;
  font-weight: 500;
}

.taskmate-link:hover {
  color: #ffffff;
  text-decoration: underline;
}

.taskmate-auth-btn,
.taskmate-logout-btn {
  border: none;
  text-decoration: none;
  padding: 0.5rem 0.95rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.taskmate-login-btn {
  background: #ffffff;
  color: #212529;
}

.taskmate-login-btn:hover {
  background: #f1f3f5;
  color: #212529;
}

.taskmate-register-btn {
  background: #198754;
  color: #ffffff;
}

.taskmate-register-btn:hover {
  background: #157347;
  color: #ffffff;
}

.taskmate-logout-btn {
  background: #ffffff;
  color: #212529;
}

.taskmate-logout-btn:hover {
  background: #f1f3f5;
}

@media (max-width: 768px) {
  .taskmate-navbar-inner {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.85rem;
    padding-top: 0.9rem;
    padding-bottom: 0.9rem;
  }

  .taskmate-nav-links {
    flex-wrap: wrap;
  }

  .taskmate-brand {
    font-size: 1.5rem;
  }
}
</style>