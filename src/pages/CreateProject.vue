<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged } from "firebase/auth"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { auth, db } from "../api/firebase"

const router = useRouter()

const currentUser = ref(null)
const projectName = ref("")
const projectMode = ref("solo")
const creatingProject = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

let unsubscribeAuth = null

const generateJoinCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "TM-"
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const resetForm = () => {
  projectName.value = ""
  projectMode.value = "solo"
}

const createProject = async () => {
  errorMessage.value = ""
  successMessage.value = ""

  if (!currentUser.value) {
    errorMessage.value = "You must be logged in to create a project."
    return
  }

  if (!projectName.value.trim()) {
    errorMessage.value = "Project name is required."
    return
  }

  creatingProject.value = true

  try {
    const isGroup = projectMode.value === "group"
    const joinCode = isGroup ? generateJoinCode() : null

    await addDoc(collection(db, "projects"), {
      name: projectName.value.trim(),
      ownerId: currentUser.value.uid,
      members: [currentUser.value.uid],
      projectType: projectMode.value,
      visibility: "private",
      joinCode,
      createdAt: serverTimestamp()
    })

    successMessage.value = isGroup
      ? "Group project created successfully."
      : "Project created successfully."

    resetForm()

    setTimeout(() => {
      router.push("/projects")
    }, 800)
  } catch (error) {
    console.error("Error creating project:", error)
    errorMessage.value = "Failed to create project."
  } finally {
    creatingProject.value = false
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
          <h2 class="fw-bold mb-1">Create Project</h2>
          <p class="text-muted mb-0 small">
            Create a solo or group project. Visibility can be changed later in settings.
          </p>
        </div>

        <div v-if="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <form @submit.prevent="createProject">
          <div class="mb-3">
            <label for="projectName" class="form-label">Project Name</label>
            <input
              id="projectName"
              v-model="projectName"
              type="text"
              class="form-control"
              placeholder="Enter project name"
              required
            />
          </div>

          <div class="mb-4">
            <label for="projectMode" class="form-label">Project Type</label>
            <select
              id="projectMode"
              v-model="projectMode"
              class="form-select"
            >
              <option value="solo">My Project</option>
              <option value="group">Group Project</option>
            </select>
            <small class="text-muted">
              Group projects generate a join code for other members.
            </small>
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
              class="btn btn-success w-50"
              :disabled="creatingProject"
            >
              {{ creatingProject ? "Creating..." : "Create Project" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>