<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"
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

const route = useRoute()
const projectId = route.params.id

const tasks = ref([])
const newTitle = ref("")
const newDescription = ref("")
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref("")
const currentUser = ref(null)

const editingTaskId = ref("")
const editTaskTitle = ref("")
const editTaskDescription = ref("")
const updatingTask = ref(false)

let unsubscribeAuth = null
let unsubscribeTasks = null

const totalTasks = computed(() => tasks.value.length)

const completedTasks = computed(() =>
  tasks.value.filter((task) => task.completed).length
)

const progress = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasks.value / totalTasks.value) * 100)
})

const resetForm = () => {
  newTitle.value = ""
  newDescription.value = ""
}

const resetEditForm = () => {
  editingTaskId.value = ""
  editTaskTitle.value = ""
  editTaskDescription.value = ""
}

const loadTasksForProject = (uid) => {
  if (unsubscribeTasks) {
    unsubscribeTasks()
  }

  const tasksRef = collection(db, "tasks")
  const tasksQuery = query(
    tasksRef,
    where("uid", "==", uid),
    where("projectId", "==", projectId)
  )

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
      errorMessage.value = ""
      loading.value = false
    },
    (error) => {
      console.error("Error loading tasks:", error)
      errorMessage.value = "Failed to load tasks."
      loading.value = false
    }
  )
}

const addTask = async () => {
  errorMessage.value = ""

  if (!newTitle.value.trim()) {
    errorMessage.value = "Task title is required."
    return
  }

  if (!currentUser.value) {
    errorMessage.value = "You must be logged in to create a task."
    return
  }

  saving.value = true

  try {
    await addDoc(collection(db, "tasks"), {
      title: newTitle.value.trim(),
      description: newDescription.value.trim(),
      completed: false,
      projectId,
      uid: currentUser.value.uid,
      createdAt: serverTimestamp()
    })

    resetForm()
  } catch (error) {
    console.error("Error adding task:", error)
    errorMessage.value = "Failed to create task."
  } finally {
    saving.value = false
  }
}

const startEditTask = (task) => {
  editingTaskId.value = task.id
  editTaskTitle.value = task.title || ""
  editTaskDescription.value = task.description || ""
}

const cancelEditTask = () => {
  resetEditForm()
}

const saveTaskEdit = async (taskId) => {
  errorMessage.value = ""

  if (!editTaskTitle.value.trim()) {
    errorMessage.value = "Task title is required."
    return
  }

  updatingTask.value = true

  try {
    await updateDoc(doc(db, "tasks", taskId), {
      title: editTaskTitle.value.trim(),
      description: editTaskDescription.value.trim()
    })

    resetEditForm()
  } catch (error) {
    console.error("Error updating task:", error)
    errorMessage.value = "Failed to update task."
  } finally {
    updatingTask.value = false
  }
}

const toggleTask = async (task) => {
  errorMessage.value = ""

  try {
    await updateDoc(doc(db, "tasks", task.id), {
      completed: !task.completed
    })
  } catch (error) {
    console.error("Error updating task:", error)
    errorMessage.value = "Failed to update task."
  }
}

const deleteTask = async (taskId) => {
  errorMessage.value = ""

  try {
    await deleteDoc(doc(db, "tasks", taskId))
  } catch (error) {
    console.error("Error deleting task:", error)
    errorMessage.value = "Failed to delete task."
  }
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user

    if (user) {
      loading.value = true
      loadTasksForProject(user.uid)
    } else {
      tasks.value = []
      loading.value = false
    }
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
  if (unsubscribeTasks) unsubscribeTasks()
})
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-lg">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <div class="mb-4">
          <h2 class="fw-bold mb-1">Project Tasks</h2>
          <p class="text-muted mb-0 small">
            Manage tasks for this project and track progress
          </p>
        </div>

        <div class="mb-4">
          <h5 class="fw-bold mb-2">Project Progress</h5>

          <div class="progress">
            <div
              class="progress-bar bg-success"
              role="progressbar"
              :style="{ width: progress + '%' }"
            >
              {{ progress }}%
            </div>
          </div>

          <p class="small text-muted mt-2 mb-0">
            {{ completedTasks }} of {{ totalTasks }} tasks completed
          </p>
        </div>

        <div class="card p-3 mb-4">
          <h5 class="fw-bold mb-3">Create New Task</h5>

          <div class="row g-2">
            <div class="col-md-4">
              <input
                v-model="newTitle"
                type="text"
                class="form-control"
                placeholder="Task title"
              />
            </div>

            <div class="col-md-6">
              <input
                v-model="newDescription"
                type="text"
                class="form-control"
                placeholder="Task description"
              />
            </div>

            <div class="col-md-2 d-grid">
              <button
                class="btn btn-primary"
                @click="addTask"
                :disabled="saving"
                type="button"
              >
                {{ saving ? "Saving..." : "Add Task" }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          {{ errorMessage }}
        </div>

        <div v-if="loading" class="text-center text-muted py-4">
          Loading tasks...
        </div>

        <div v-else-if="tasks.length === 0" class="text-muted text-center py-4">
          No tasks yet.
        </div>

        <div v-else class="row g-3">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="col-12 col-md-6 col-lg-4"
          >
            <div class="card p-3 h-100">
              <template v-if="editingTaskId === task.id">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Task title</label>
                  <input
                    v-model="editTaskTitle"
                    type="text"
                    class="form-control"
                    placeholder="Task title"
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold">Task description</label>
                  <input
                    v-model="editTaskDescription"
                    type="text"
                    class="form-control"
                    placeholder="Task description"
                  />
                </div>

                <div class="d-flex gap-2 mt-auto">
                  <button
                    class="btn btn-sm btn-primary"
                    @click="saveTaskEdit(task.id)"
                    :disabled="updatingTask"
                    type="button"
                  >
                    {{ updatingTask ? "Saving..." : "Save" }}
                  </button>

                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="cancelEditTask"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </template>

              <template v-else>
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5
                    class="fw-bold mb-0"
                    :class="{ 'text-decoration-line-through': task.completed }"
                  >
                    {{ task.title }}
                  </h5>

                  <input
                    type="checkbox"
                    :checked="task.completed"
                    @change="toggleTask(task)"
                  />
                </div>

                <p class="text-muted small mb-4">
                  {{ task.description || "No description added." }}
                </p>

                <div class="d-flex gap-2 mt-auto flex-wrap">
                  <button
                    class="btn btn-sm btn-outline-success"
                    @click="toggleTask(task)"
                    type="button"
                  >
                    {{ task.completed ? "Mark Incomplete" : "Mark Complete" }}
                  </button>

                  <button
                    class="btn btn-sm btn-outline-primary"
                    @click="startEditTask(task)"
                    type="button"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteTask(task.id)"
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

<style scoped>
.progress {
  height: 24px;
  border-radius: 12px;
  overflow: hidden;
}

.progress-bar {
  font-weight: 600;
}
</style>