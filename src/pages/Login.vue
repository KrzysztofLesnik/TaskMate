<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../api/firebase"

const router = useRouter()

const email = ref("")
const password = ref("")
const errorMessage = ref("")
const loading = ref(false)

const login = async () => {
  errorMessage.value = ""
  loading.value = true

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push("/")
  } catch (error) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        errorMessage.value = "Invalid email or password."
        break
      case "auth/invalid-email":
        errorMessage.value = "Please enter a valid email address."
        break
      case "auth/too-many-requests":
        errorMessage.value = "Too many attempts. Please try again later."
        break
      default:
        errorMessage.value = "Login failed. Please try again."
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-sm">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <h1 class="text-center fw-bold mb-4">Login</h1>

        <form @submit.prevent="login">
          <div class="mb-3">
            <label for="loginEmail" class="form-label">Email address</label>
            <input
              id="loginEmail"
              v-model="email"
              type="email"
              class="form-control"
              placeholder="Enter your email"
              autocomplete="email"
              required
            />
          </div>

          <div class="mb-3">
            <label for="loginPassword" class="form-label">Password</label>
            <input
              id="loginPassword"
              v-model="password"
              type="password"
              class="form-control"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
            />
          </div>

          <div v-if="errorMessage" class="alert alert-danger" role="alert">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            {{ loading ? "Logging in..." : "Login" }}
          </button>
        </form>

        <p class="text-center mt-4 mb-0">
          Don’t have an account?
          <router-link to="/register">Register here</router-link>
        </p>
      </div>
    </div>
  </section>
</template>