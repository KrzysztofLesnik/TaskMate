<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged } from "firebase/auth"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore"
import { auth, db } from "../api/firebase"

const router = useRouter()

const projects = ref([])
const tasks = ref([])
const newProjectName = ref("")
const newProjectDescription = ref("")
const loadingProjects = ref(true)
const loadingTasks = ref(true)
const saving = ref(false)
const errorMessage = ref("")
const currentUser = ref(null)

const editingProjectId = ref("")
const editProjectName = ref("")
const editProjectDescription = ref("")
const updatingProject = ref(false)

let unsubscribeAuth = null
let unsubscribeProjects = null
let unsubscribeTasks = null

const loading = computed(() => loadingProjects.value || loadingTasks.value)

const resetForm = () => {
  newProjectName.value = ""
  newProjectDescription.value = ""
}

const resetEditForm = () => {
  editingProjectId.value = ""
  editProjectName.value = ""
  editProjectDescription.value = ""
}

const loadProjectsForUser = (uid) => {
  if (unsubscribeProjects) {
    unsubscribeProjects()
  }

  const projectsRef = collection(db, "projects")
  const projectsQuery = query(projectsRef, where("uid", "==", uid))

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
      errorMessage.value = ""
    },
    (error) => {
      console.error("Error loading projects:", error)
      errorMessage.value = "Failed to load projects."
      loadingProjects.value = false
    }
  )
}

const loadTasksForUser = (uid) => {
  if (unsubscribeTasks) {
    unsubscribeTasks()
  }

  const tasksRef = collection(db, "tasks")
  const tasksQuery = query(tasksRef, where("uid", "==", uid))

  unsubscribeTasks = onSnapshot(
    tasksQuery,
    (snapshot) => {
      const loadedTasks = snapshot.docs.map((taskDoc) => ({
        id: taskDoc.id,
        ...taskDoc.data()
      }))

      loadedTasks.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0
        const bTime = b.createdAt?.seconds || 0
        return bTime - aTime
      })

      tasks.value = loadedTasks
      loadingTasks.value = false
      errorMessage.value = ""
    },
    (error) => {
      console.error("Error loading tasks:", error)
      errorMessage.value = "Failed to load project task summaries."
      loadingTasks.value = false
    }
  )
}

const addProject = async () => {
  errorMessage.value = ""

  if (!newProjectName.value.trim()) {
    errorMessage.value = "Project name is required."
    return
  }

  if (!currentUser.value) {
    errorMessage.value = "You must be logged in to create a project."
    return
  }

  saving.value = true

  try {
    await addDoc(collection(db, "projects"), {
      name: newProjectName.value.trim(),
      description: newProjectDescription.value.trim(),
      uid: currentUser.value.uid,
      createdAt: serverTimestamp()
    })

    resetForm()
  } catch (error) {
    console.error("Error adding project:", error)
    errorMessage.value = "Failed to create project."
  } finally {
    saving.value = false
  }
}

const startEditProject = (project) => {
  editingProjectId.value = project.id
  editProjectName.value = project.name || ""
  editProjectDescription.value = project.description || ""
}

const cancelEditProject = () => {
  resetEditForm()
}

const saveProjectEdit = async (projectId) => {
  errorMessage.value = ""

  if (!editProjectName.value.trim()) {
    errorMessage.value = "Project name is required."
    return
  }

  updatingProject.value = true

  try {
    await updateDoc(doc(db, "projects", projectId), {
      name: editProjectName.value.trim(),
      description: editProjectDescription.value.trim()
    })

    resetEditForm()
  } catch (error) {
    console.error("Error updating project:", error)
    errorMessage.value = "Failed to update project."
  } finally {
    updatingProject.value = false
  }
}

const openProject = (projectId) => {
  router.push(`/tasks/${projectId}`)
}

const deleteProject = async (projectId) => {
  errorMessage.value = ""

  try {
    await deleteDoc(doc(db, "projects", projectId))
  } catch (error) {
    console.error("Error deleting project:", error)
    errorMessage.value = "Failed to delete project."
  }
}

const getProjectTasks = (projectId) => {
  return tasks.value.filter((task) => task.projectId === projectId)
}

const getCompletedTaskCount = (projectId) => {
  return getProjectTasks(projectId).filter((task) => task.completed).length
}

const getTotalTaskCount = (projectId) => {
  return getProjectTasks(projectId).length
}

const getProjectProgress = (projectId) => {
  const total = getTotalTaskCount(projectId)
  const completed = getCompletedTaskCount(projectId)

  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user

    if (user) {
      loadingProjects.value = true
      loadingTasks.value = true
      loadProjectsForUser(user.uid)
      loadTasksForUser(user.uid)
    } else {
      projects.value = []
      tasks.value = []
      loadingProjects.value = false
      loadingTasks.value = false
    }
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
  if (unsubscribeProjects) unsubscribeProjects()
  if (unsubscribeTasks) unsubscribeTasks()
})
</script>

<template>
  <section class="container py-4">
    <div class="taskmate-card-lg">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <div class="mb-4 d-flex justify-content-between align-items-center">
          <div>
            <h2 class="fw-bold mb-1">My Projects</h2>
            <p class="text-muted mb-0 small">
              Manage your projects and tasks
            </p>
          </div>
        </div>

        <div class="card p-3 mb-4">
          <h5 class="fw-bold mb-3">Create New Project</h5>

          <div class="row g-2">
            <div class="col-md-4">
              <input
                v-model="newProjectName"
                type="text"
                class="form-control"
                placeholder="Project name"
              />
            </div>

            <div class="col-md-6">
              <input
                v-model="newProjectDescription"
                type="text"
                class="form-control"
                placeholder="Project description"
              />
            </div>

            <div class="col-md-2 d-grid">
              <button
                class="btn btn-primary"
                @click="addProject"
                :disabled="saving"
              >
                {{ saving ? "Saving..." : "Add Project" }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          {{ errorMessage }}
        </div>

        <div v-if="loading" class="text-center text-muted py-4">
          Loading projects...
        </div>

        <div v-else-if="projects.length === 0" class="text-muted text-center py-4">
          No projects yet.
        </div>

        <div v-else class="row g-3">
          <div
            v-for="project in projects"
            :key="project.id"
            class="col-12 col-md-6 col-lg-4"
          >
            <div class="card p-3 h-100">
              <template v-if="editingProjectId === project.id">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Project name</label>
                  <input
                    v-model="editProjectName"
                    type="text"
                    class="form-control"
                    placeholder="Project name"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold">Project description</label>
                  <input
                    v-model="editProjectDescription"
                    type="text"
                    class="form-control"
                    placeholder="Project description"
                  />
                </div>

                <div class="d-flex gap-2 mt-auto">
                  <button
                    class="btn btn-sm btn-primary"
                    @click="saveProjectEdit(project.id)"
                    :disabled="updatingProject"
                  >
                    {{ updatingProject ? "Saving..." : "Save" }}
                  </button>

                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="cancelEditProject"
                  >
                    Cancel
                  </button>
                </div>
              </template>

              <template v-else>
                <h5 class="fw-bold mb-2">{{ project.name }}</h5>

                <p class="text-muted small mb-3">
                  {{ project.description || "No description added." }}
                </p>

                <div class="mb-3">
                  <div class="d-flex justify-content-between small mb-1">
                    <span>Progress</span>
                    <span>{{ getProjectProgress(project.id) }}%</span>
                  </div>

                  <div class="progress mb-2">
                    <div
                      class="progress-bar bg-success"
                      role="progressbar"
                      :style="{ width: getProjectProgress(project.id) + '%' }"
                    >
                      {{ getProjectProgress(project.id) }}%
                    </div>
                  </div>

                  <p class="small text-muted mb-0">
                    {{ getCompletedTaskCount(project.id) }} of
                    {{ getTotalTaskCount(project.id) }} tasks completed
                  </p>
                </div>

                <div class="d-flex gap-2 mt-auto flex-wrap">
                  <button
                    class="btn btn-sm btn-success"
                    @click="openProject(project.id)"
                    type="button"
                  >
                    Open
                  </button>

                  <button
                    class="btn btn-sm btn-outline-primary"
                    @click="startEditProject(project)"
                    type="button"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteProject(project.id)"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>