<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged } from "firebase/auth"
import {
  arrayUnion,
  collection,
  getDocs,
  query,
  updateDoc,
  where,
  doc
} from "firebase/firestore"
import { auth, db } from "../api/firebase"

const router = useRouter()

const currentUser = ref(null)
const joinCode = ref("")
const loading = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

let unsubscribeAuth = null

const joinProject = async () => {
  errorMessage.value = ""
  successMessage.value = ""

  if (!currentUser.value) {
    errorMessage.value = "You must be logged in to join a project."
    return
  }

  if (!joinCode.value.trim()) {
    errorMessage.value = "Join code is required."
    return
  }

  loading.value = true

  try {
    const projectsQuery = query(
      collection(db, "projects"),
      where("joinCode", "==", joinCode.value.trim().toUpperCase())
    )

    const querySnapshot = await getDocs(projectsQuery)

    if (querySnapshot.empty) {
      errorMessage.value = "No project found with that join code."
      loading.value = false
      return
    }

    const projectDoc = querySnapshot.docs[0]
    const projectData = projectDoc.data()

    if (projectData.members?.includes(currentUser.value.uid)) {
      errorMessage.value = "You are already a member of this project."
      loading.value = false
      return
    }

    await updateDoc(doc(db, "projects", projectDoc.id), {
      members: arrayUnion(currentUser.value.uid)
    })

    successMessage.value = "Joined project successfully."

    setTimeout(() => {
      router.push(`/tasks/${projectDoc.id}`)
    }, 800)
  } catch (error) {
    console.error("Join project error:", error)
    errorMessage.value = "Failed to join project."
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth()
  }
})
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-md">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <div class="mb-4">
          <h2 class="fw-bold mb-1">Join Project</h2>
          <p class="text-muted mb-0 small">
            Enter a group project join code
          </p>
        </div>

        <div v-if="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <form @submit.prevent="joinProject">
          <div class="mb-4">
            <label for="joinCode" class="form-label">Join Code</label>
            <input
              id="joinCode"
              v-model="joinCode"
              type="text"
              class="form-control text-uppercase"
              placeholder="Enter join code"
              required
            />
          </div>

          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary w-50"
              @click="router.push('/projects')"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="btn btn-primary w-50"
              :disabled="loading"
            >
              {{ loading ? "Joining..." : "Join Project" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>