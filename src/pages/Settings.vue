<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../api/firebase"

const router = useRouter()

const currentUser = ref(null)
const loading = ref(true)

let unsubscribe = null

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    loading.value = false
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
    router.push("/login")
  } catch (error) {
    console.error("Logout failed:", error.message)
  }
}
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-md">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <h1 class="fw-bold mb-4">Settings</h1>

        <div v-if="loading" class="text-muted">
          Loading account information...
        </div>

        <div v-else class="card p-4">
          <h5 class="fw-bold mb-3">Account Information</h5>

          <div class="mb-3">
            <label class="form-label fw-semibold">Email address</label>
            <input
              type="text"
              class="form-control"
              :value="currentUser?.email || ''"
              readonly
            />
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold">User ID</label>
            <input
              type="text"
              class="form-control"
              :value="currentUser?.uid || ''"
              readonly
            />
          </div>

          <div class="d-flex justify-content-start">
            <button class="btn btn-danger" @click="logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>