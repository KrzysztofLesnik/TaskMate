<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged } from "firebase/auth"
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where
} from "firebase/firestore"
import { auth, db } from "../api/firebase"

const router = useRouter()

const currentUser = ref(null)
const projects = ref([])
const loadingProjects = ref(true)
const errorMessage = ref("")
const searchTerm = ref("")

let unsubscribeAuth = null
let unsubscribeProjects = null

const loadProjectsForUser = (uid) => {
  if (unsubscribeProjects) {
    unsubscribeProjects()
    unsubscribeProjects = null
  }

  loadingProjects.value = true
  errorMessage.value = ""

  const projectsRef = collection(db, "projects")
  const projectsQuery = query(projectsRef, where("members", "array-contains", uid))

  unsubscribeProjects = onSnapshot(
    projectsQuery,
    (snapshot) => {
      const loadedProjects = snapshot.docs.map((projectDoc) => ({
        id: projectDoc.id,
        ...projectDoc.data()
      }))

      loadedProjects.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0
        const bTime = b.createdAt?.seconds || 0
        return bTime - aTime
      })

      projects.value = loadedProjects
      loadingProjects.value = false
    },
    (error) => {
      console.error("Error loading projects:", error)
      errorMessage.value = "Failed to load projects."
      loadingProjects.value = false
    }
  )
}

const filteredProjects = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()

  if (!term) {
    return projects.value
  }

  return projects.value.filter((project) =>
    (project.name || "").toLowerCase().includes(term)
  )
})

const openProject = (projectId) => {
  router.push(`/tasks/${projectId}`)
}

const removeProject = async (project) => {
  errorMessage.value = ""

  if (!currentUser.value || project.ownerId !== currentUser.value.uid) {
    errorMessage.value = "Only the project owner can remove this project."
    return
  }

  try {
    await deleteDoc(doc(db, "projects", project.id))
  } catch (error) {
    console.error("Error removing project:", error)
    errorMessage.value = "Failed to remove project."
  }
}

const memberCount = (project) => {
  return Array.isArray(project.members) ? project.members.length : 0
}

const projectTypeLabel = (project) => {
  return project.projectType === "group" ? "Group Project" : "My Project"
}

const isOwner = (project) => {
  return currentUser.value && project.ownerId === currentUser.value.uid
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user

    if (!user) {
      projects.value = []
      loadingProjects.value = false

      if (unsubscribeProjects) {
        unsubscribeProjects()
        unsubscribeProjects = null
      }

      return
    }

    loadProjectsForUser(user.uid)
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth()
  }

  if (unsubscribeProjects) {
    unsubscribeProjects()
  }
})
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-md">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
          <div>
            <h2 class="fw-bold mb-1">My Projects</h2>
            <p class="text-muted mb-0 small">
              Search and open the projects you belong to
            </p>
          </div>

          <router-link to="/create-project" class="btn btn-success btn-sm">
            Add Project
          </router-link>
        </div>

        <div v-if="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <div class="card p-4 border-0 shadow-sm">
          <div class="mb-3">
            <label for="searchTerm" class="form-label fw-semibold">Search Project</label>
            <input
              id="searchTerm"
              v-model="searchTerm"
              type="text"
              class="form-control"
              placeholder="Search by project name"
            />
          </div>

          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="fw-bold mb-0">Created Projects</h4>
            <span class="badge bg-primary rounded-pill">
              {{ filteredProjects.length }}
            </span>
          </div>

          <div v-if="loadingProjects" class="text-center py-4 text-muted">
            Loading projects...
          </div>

          <div v-else-if="filteredProjects.length === 0" class="text-center py-4 text-muted">
            No matching projects found.
          </div>

          <div v-else class="row g-3">
            <div
              v-for="project in filteredProjects"
              :key="project.id"
              class="col-12"
            >
              <div class="project-card">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap">
                  <div>
                    <h5 class="fw-bold mb-1">{{ project.name }}</h5>

                    <p class="text-muted small mb-1">
                      Visibility:
                      <strong class="text-capitalize">{{ project.visibility || "private" }}</strong>
                    </p>
                  </div>

                  <span
                    class="badge rounded-pill"
                    :class="project.projectType === 'group' ? 'bg-success' : 'bg-secondary'"
                  >
                    {{ projectTypeLabel(project) }}
                  </span>
                </div>

                <p class="text-muted small mb-3">
                  Members: {{ memberCount(project) }}
                </p>

                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm w-50" @click="openProject(project.id)">
                    Open Project
                  </button>

                  <button
                    v-if="isOwner(project)"
                    class="btn btn-outline-danger btn-sm w-50"
                    @click="removeProject(project)"
                  >
                    Remove Project
                  </button>

                  <button
                    v-else
                    class="btn btn-outline-secondary btn-sm w-50"
                    disabled
                  >
                    Owner Only
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.project-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 16px;
  padding: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
}
</style>