<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "../api/firebase"

const router = useRouter()

const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const errorMessage = ref("")
const successMessage = ref("")
const loading = ref(false)

const register = async () => {
  errorMessage.value = ""
  successMessage.value = ""

  if (!email.value.trim()) {
    errorMessage.value = "Email address is required."
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match."
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = "Password must be at least 6 characters long."
    return
  }

  loading.value = true

  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value)
    successMessage.value = "Registration successful."
    router.push("/")
  } catch (error) {
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage.value = "This email is already in use."
        break
      case "auth/invalid-email":
        errorMessage.value = "Please enter a valid email address."
        break
      case "auth/weak-password":
        errorMessage.value = "Password is too weak."
        break
      default:
        errorMessage.value = "Registration failed. Please try again."
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
        <h1 class="text-center fw-bold mb-4">Create Account</h1>

        <form @submit.prevent="register">
          <div class="mb-3">
            <label for="registerEmail" class="form-label">Email address</label>
            <input
              id="registerEmail"
              v-model="email"
              type="email"
              class="form-control"
              placeholder="Enter your email"
              autocomplete="email"
              required
            />
          </div>

          <div class="mb-3">
            <label for="registerPassword" class="form-label">Password</label>
            <input
              id="registerPassword"
              v-model="password"
              type="password"
              class="form-control"
              placeholder="Create a password"
              autocomplete="new-password"
              required
            />
          </div>

          <div class="mb-3">
            <label for="confirmPassword" class="form-label">Confirm password</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              class="form-control"
              placeholder="Confirm your password"
              autocomplete="new-password"
              required
            />
          </div>

          <div v-if="errorMessage" class="alert alert-danger" role="alert">
            {{ errorMessage }}
          </div>

          <div v-if="successMessage" class="alert alert-success" role="alert">
            {{ successMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-success w-100"
            :disabled="loading"
          >
            {{ loading ? "Creating account..." : "Register" }}
          </button>
        </form>

        <p class="text-center mt-4 mb-0">
          Already have an account?
          <router-link to="/login">Login here</router-link>
        </p>
      </div>
    </div>
  </section>
</template>