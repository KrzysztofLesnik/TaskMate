<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRoute } from "vue-router"
import { onAuthStateChanged } from "firebase/auth"
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore"
import { auth, db } from "../api/firebase"

const route = useRoute()
const projectId = route.params.id

const currentUser = ref(null)
const project = ref(null)
const tasks = ref([])
const steps = ref([])
const messages = ref([])

const loadingProject = ref(true)
const loadingTasks = ref(true)
const loadingSteps = ref(true)
const loadingMessages = ref(true)

const taskTitle = ref("")
const taskDescription = ref("")
const newMessage = ref("")

const selectedTask = ref(null)
const stepTitle = ref("")
const stepDescription = ref("")
const stepError = ref("")

const settingsVisibility = ref("private")

const showAddMemberModal = ref(false)
const invitedEmail = ref("")

const projectError = ref("")
const taskError = ref("")
const chatError = ref("")
const successMessage = ref("")
const inviteError = ref("")
const inviteSuccess = ref("")

let unsubscribeTasks = null
let unsubscribeSteps = null
let unsubscribeMessages = null
let unsubscribeAuth = null

const memberCount = computed(() => {
  return Array.isArray(project.value?.members) ? project.value.members.length : 0
})

const isGroupProject = computed(() => {
  return project.value?.projectType === "group"
})

const isOwner = computed(() => {
  return currentUser.value && project.value && currentUser.value.uid === project.value.ownerId
})

const completedTasks = computed(() => {
  return tasks.value.filter((task) => task.completed === true).length
})

const totalTasks = computed(() => {
  return tasks.value.length
})

const progressPercent = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasks.value / totalTasks.value) * 100)
})

const loadProject = async () => {
  loadingProject.value = true
  projectError.value = ""

  try {
    const projectRef = doc(db, "projects", projectId)
    const projectSnap = await getDoc(projectRef)

    if (!projectSnap.exists()) {
      projectError.value = "Project not found."
      project.value = null
      loadingProject.value = false
      return
    }

    project.value = {
      id: projectSnap.id,
      ...projectSnap.data()
    }

    settingsVisibility.value = project.value.visibility || "private"
  } catch (error) {
    console.error("Error loading project:", error)
    projectError.value = "Failed to load project."
  } finally {
    loadingProject.value = false
  }
}

const loadTasks = () => {
  loadingTasks.value = true
  taskError.value = ""

  const tasksRef = collection(db, "tasks")
  const tasksQuery = query(tasksRef, where("projectId", "==", projectId))

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
    },
    (error) => {
      console.error("Error loading tasks:", error)
      taskError.value = "Failed to load tasks."
      loadingTasks.value = false
    }
  )
}

const loadSteps = () => {
  loadingSteps.value = true
  stepError.value = ""

  const stepsRef = collection(db, "steps")
  const stepsQuery = query(stepsRef, where("projectId", "==", projectId))

  unsubscribeSteps = onSnapshot(
    stepsQuery,
    (snapshot) => {
      const loadedSteps = snapshot.docs.map((stepDoc) => ({
        id: stepDoc.id,
        ...stepDoc.data()
      }))

      loadedSteps.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0
        const bTime = b.createdAt?.seconds || 0
        return bTime - aTime
      })

      steps.value = loadedSteps
      loadingSteps.value = false
    },
    (error) => {
      console.error("Error loading steps:", error)
      stepError.value = "Failed to load steps."
      loadingSteps.value = false
    }
  )
}

const loadMessages = () => {
  loadingMessages.value = true
  chatError.value = ""

  const messagesRef = collection(db, "projects", projectId, "messages")
  const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"))

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      messages.value = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data()
      }))
      loadingMessages.value = false
    },
    (error) => {
      console.error("Error loading messages:", error)
      chatError.value = "Failed to load project chat."
      loadingMessages.value = false
    }
  )
}

const getStepsForTask = (taskId) => {
  return steps.value.filter((step) => step.taskId === taskId)
}

const openTaskModal = (task) => {
  selectedTask.value = task
  stepTitle.value = ""
  stepDescription.value = ""
  stepError.value = ""
}

const closeTaskModal = () => {
  selectedTask.value = null
  stepTitle.value = ""
  stepDescription.value = ""
  stepError.value = ""
}

const openAddMemberModal = () => {
  invitedEmail.value = ""
  inviteError.value = ""
  inviteSuccess.value = ""
  showAddMemberModal.value = true
}

const closeAddMemberModal = () => {
  invitedEmail.value = ""
  inviteError.value = ""
  inviteSuccess.value = ""
  showAddMemberModal.value = false
}

const sendInvitation = async () => {
  inviteError.value = ""
  inviteSuccess.value = ""

  if (!isOwner.value) {
    inviteError.value = "Only the project owner can send invitations."
    return
  }

  if (!invitedEmail.value.trim()) {
    inviteError.value = "Enter an email address."
    return
  }

  const cleanEmail = invitedEmail.value.trim().toLowerCase()

  if (!cleanEmail.includes("@")) {
    inviteError.value = "Enter a valid email address."
    return
  }

  if (cleanEmail === (currentUser.value?.email || "").toLowerCase()) {
    inviteError.value = "You are already the owner of this project."
    return
  }

  try {
    const invitationsRef = collection(db, "invitations")
    const duplicateQuery = query(
      invitationsRef,
      where("projectId", "==", projectId),
      where("invitedEmail", "==", cleanEmail),
      where("status", "==", "pending")
    )

    const existingInvites = await getDocs(duplicateQuery)

    if (!existingInvites.empty) {
      inviteError.value = "A pending invitation already exists for this email."
      return
    }

    await addDoc(invitationsRef, {
      projectId,
      projectName: project.value?.name || "Group Project",
      ownerId: currentUser.value.uid,
      ownerEmail: currentUser.value.email || "",
      invitedEmail: cleanEmail,
      status: "pending",
      createdAt: serverTimestamp()
    })

    inviteSuccess.value = "Invitation sent successfully."
    invitedEmail.value = ""
  } catch (error) {
    console.error("Error sending invitation:", error)
    inviteError.value = "Failed to send invitation."
  }
}

const addTask = async () => {
  taskError.value = ""
  successMessage.value = ""

  if (!currentUser.value) {
    taskError.value = "You must be logged in to add a task."
    return
  }

  if (!taskTitle.value.trim()) {
    taskError.value = "Task title is required."
    return
  }

  try {
    await addDoc(collection(db, "tasks"), {
      projectId,
      title: taskTitle.value.trim(),
      description: taskDescription.value.trim(),
      completed: false,
      ownerId: currentUser.value.uid,
      createdBy: currentUser.value.uid,
      createdAt: serverTimestamp()
    })

    taskTitle.value = ""
    taskDescription.value = ""
    successMessage.value = "Task added successfully."
  } catch (error) {
    console.error("Error adding task:", error)
    taskError.value = "Failed to add task."
  }
}

const toggleTaskComplete = async (task) => {
  taskError.value = ""

  try {
    await updateDoc(doc(db, "tasks", task.id), {
      completed: !task.completed
    })
  } catch (error) {
    console.error("Error updating task:", error)
    taskError.value = "Failed to update task."
  }
}

const removeTask = async (task) => {
  taskError.value = ""

  if (!currentUser.value || task.ownerId !== currentUser.value.uid) {
    taskError.value = "Only the task owner can remove this task."
    return
  }

  try {
    const taskSteps = getStepsForTask(task.id)

    for (const step of taskSteps) {
      await deleteDoc(doc(db, "steps", step.id))
    }

    await deleteDoc(doc(db, "tasks", task.id))

    if (selectedTask.value?.id === task.id) {
      closeTaskModal()
    }
  } catch (error) {
    console.error("Error removing task:", error)
    taskError.value = "Failed to remove task."
  }
}

const addStep = async () => {
  stepError.value = ""
  successMessage.value = ""

  if (!currentUser.value) {
    stepError.value = "You must be logged in to add a step."
    return
  }

  if (!selectedTask.value) {
    stepError.value = "No task selected."
    return
  }

  if (!stepTitle.value.trim()) {
    stepError.value = "Step title is required."
    return
  }

  try {
    await addDoc(collection(db, "steps"), {
      projectId,
      taskId: selectedTask.value.id,
      title: stepTitle.value.trim(),
      description: stepDescription.value.trim(),
      completed: false,
      ownerId: currentUser.value.uid,
      createdAt: serverTimestamp()
    })

    stepTitle.value = ""
    stepDescription.value = ""
    successMessage.value = "Step added successfully."
  } catch (error) {
    console.error("Error adding step:", error)
    stepError.value = "Failed to add step."
  }
}

const toggleStepComplete = async (step) => {
  stepError.value = ""

  try {
    await updateDoc(doc(db, "steps", step.id), {
      completed: !step.completed
    })
  } catch (error) {
    console.error("Error updating step:", error)
    stepError.value = "Failed to update step."
  }
}

const removeStep = async (step) => {
  stepError.value = ""

  if (!currentUser.value || step.ownerId !== currentUser.value.uid) {
    stepError.value = "Only the step owner can remove this step."
    return
  }

  try {
    await deleteDoc(doc(db, "steps", step.id))
  } catch (error) {
    console.error("Error removing step:", error)
    stepError.value = "Failed to remove step."
  }
}

const updateProjectVisibility = async () => {
  projectError.value = ""
  successMessage.value = ""

  if (!isOwner.value) {
    projectError.value = "Only the project owner can change visibility."
    return
  }

  try {
    await updateDoc(doc(db, "projects", projectId), {
      visibility: settingsVisibility.value
    })

    await loadProject()
    successMessage.value = "Project visibility updated successfully."
  } catch (error) {
    console.error("Error updating project visibility:", error)
    projectError.value = "Failed to update project visibility."
  }
}

const removeMember = async (memberId) => {
  chatError.value = ""
  successMessage.value = ""

  if (!isOwner.value) {
    chatError.value = "Only the project owner can remove members."
    return
  }

  if (!project.value?.members?.includes(memberId)) {
    return
  }

  if (memberId === project.value.ownerId) {
    chatError.value = "Owner cannot be removed from the project."
    return
  }

  try {
    await updateDoc(doc(db, "projects", projectId), {
      members: arrayRemove(memberId)
    })

    await loadProject()
    successMessage.value = "Member removed successfully."
  } catch (error) {
    console.error("Error removing member:", error)
    chatError.value = "Failed to remove member."
  }
}

const sendMessage = async () => {
  chatError.value = ""

  if (!currentUser.value) {
    chatError.value = "You must be logged in to send a message."
    return
  }

  if (!newMessage.value.trim()) {
    chatError.value = "Message cannot be empty."
    return
  }

  if (!project.value?.members?.includes(currentUser.value.uid)) {
    chatError.value = "You must be a member of this group project before chatting."
    return
  }

  try {
    await addDoc(collection(db, "projects", projectId, "messages"), {
      text: newMessage.value.trim(),
      senderId: currentUser.value.uid,
      senderEmail: currentUser.value.email || "Unknown user",
      createdAt: serverTimestamp()
    })

    newMessage.value = ""
  } catch (error) {
    console.error("Error sending message:", error)
    chatError.value = "Failed to send message."
  }
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    await loadProject()
    loadTasks()
    loadSteps()
    loadMessages()
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
  if (unsubscribeTasks) unsubscribeTasks()
  if (unsubscribeSteps) unsubscribeSteps()
  if (unsubscribeMessages) unsubscribeMessages()
})
</script>

<template>
  <section class="container py-4">
    <div class="taskmate-card-lg">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <div v-if="loadingProject" class="text-center py-5 text-muted">
          Loading project...
        </div>

        <div v-else-if="projectError" class="alert alert-danger">
          {{ projectError }}
        </div>

        <div v-else-if="project">
          <div class="mb-4">
            <h2 class="fw-bold mb-1">{{ project.name }}</h2>
            <p class="text-muted mb-1">Members: {{ memberCount }}</p>
            <p class="text-muted small mb-1">
              {{ isGroupProject ? "Group Project" : "My Project" }}
            </p>
            <p class="text-muted small mb-0">
              Visibility: <strong class="text-capitalize">{{ project.visibility || "private" }}</strong>
            </p>
          </div>

          <div v-if="successMessage" class="alert alert-success">
            {{ successMessage }}
          </div>

          <div class="card p-4 border-0 shadow-sm mb-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
              <h4 class="fw-bold mb-0">Project Progress</h4>
              <span class="badge bg-primary rounded-pill">
                {{ completedTasks }}/{{ totalTasks }} completed
              </span>
            </div>

            <div class="progress mb-2">
              <div
                class="progress-bar bg-success"
                role="progressbar"
                :style="{ width: progressPercent + '%' }"
                :aria-valuenow="progressPercent"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {{ progressPercent }}%
              </div>
            </div>

            <small class="text-muted">
              Progress is based on completed tasks.
            </small>
          </div>

          <div class="card p-4 border-0 shadow-sm mb-4">
            <h4 class="fw-bold mb-3">Project Settings</h4>

            <div class="row g-3 align-items-end">
              <div class="col-md-8">
                <label for="settingsVisibility" class="form-label">Visibility</label>
                <select
                  id="settingsVisibility"
                  v-model="settingsVisibility"
                  class="form-select"
                  :disabled="!isOwner"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div class="col-md-4">
                <button
                  class="btn btn-primary w-100"
                  @click="updateProjectVisibility"
                  :disabled="!isOwner"
                >
                  {{ isOwner ? "Save Visibility" : "Owner Only" }}
                </button>
              </div>
            </div>

            <small class="text-muted d-block mt-2">
              Only the project owner can change visibility.
            </small>
          </div>

          <div class="card p-4 border-0 shadow-sm mb-4">
            <h4 class="fw-bold mb-3">Add Task</h4>

            <div v-if="taskError" class="alert alert-danger">
              {{ taskError }}
            </div>

            <div class="mb-3">
              <label for="taskTitle" class="form-label">Task Title</label>
              <input
                id="taskTitle"
                v-model="taskTitle"
                type="text"
                class="form-control"
                placeholder="Enter task title"
              />
            </div>

            <div class="mb-3">
              <label for="taskDescription" class="form-label">Task Description</label>
              <textarea
                id="taskDescription"
                v-model="taskDescription"
                class="form-control"
                rows="3"
                placeholder="Enter short task description"
              ></textarea>
            </div>

            <button class="btn btn-success w-100" @click="addTask">
              Add Task
            </button>
          </div>

          <div class="card p-4 border-0 shadow-sm mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h4 class="fw-bold mb-0">Tasks</h4>
              <span class="badge bg-secondary rounded-pill">
                {{ totalTasks }}
              </span>
            </div>

            <div v-if="loadingTasks" class="text-center py-4 text-muted">
              Loading tasks...
            </div>

            <div v-else-if="tasks.length === 0" class="text-center py-4 text-muted">
              No tasks yet. Add your first task above.
            </div>

            <div v-else class="row g-3">
              <div
                v-for="task in tasks"
                :key="task.id"
                class="col-12"
              >
                <div class="task-card">
                  <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    <div>
                      <h5 class="fw-bold mb-1">{{ task.title }}</h5>
                      <p class="text-muted small mb-1">
                        {{ task.description || "No description provided." }}
                      </p>
                      <p class="text-muted small mb-0">
                        Steps: {{ getStepsForTask(task.id).length }}
                      </p>
                    </div>

                    <span
                      class="badge rounded-pill"
                      :class="task.completed ? 'bg-success' : 'bg-warning text-dark'"
                    >
                      {{ task.completed ? "Completed" : "Pending" }}
                    </span>
                  </div>

                  <div class="d-flex gap-2 mt-3 flex-wrap">
                    <button
                      class="btn btn-outline-primary btn-sm flex-fill"
                      @click="toggleTaskComplete(task)"
                    >
                      {{ task.completed ? "Mark as Pending" : "Mark as Completed" }}
                    </button>

                    <button
                      class="btn btn-outline-secondary btn-sm flex-fill"
                      @click="openTaskModal(task)"
                    >
                      View Task
                    </button>

                    <button
                      class="btn btn-outline-danger btn-sm flex-fill"
                      @click="removeTask(task)"
                    >
                      Remove Task
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isGroupProject" class="card p-4 border-0 shadow-sm">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
              <h4 class="fw-bold mb-0">Group Project</h4>
              <div class="d-flex gap-2 align-items-center">
                <span class="badge bg-success rounded-pill">
                  Members: {{ memberCount }}
                </span>
                <button
                  v-if="isOwner"
                  class="btn btn-primary btn-sm"
                  @click="openAddMemberModal"
                >
                  Add Member
                </button>
              </div>
            </div>

            <div v-if="chatError" class="alert alert-danger">
              {{ chatError }}
            </div>

            <div class="mb-3">
              <h6 class="fw-bold mb-2">Members</h6>
              <ul class="member-list">
                <li
                  v-for="member in project.members"
                  :key="member"
                  class="member-row"
                >
                  <span>{{ member }}</span>

                  <button
                    v-if="isOwner && member !== project.ownerId"
                    class="btn btn-outline-danger btn-sm"
                    @click="removeMember(member)"
                  >
                    Remove Member
                  </button>
                </li>
              </ul>
            </div>

            <div class="chat-box mb-3">
              <div v-if="loadingMessages" class="text-center text-muted py-4">
                Loading messages...
              </div>

              <div v-else-if="messages.length === 0" class="text-center text-muted py-4">
                No messages yet. Start the conversation.
              </div>

              <div v-else>
                <div v-for="message in messages" :key="message.id" class="chat-message">
                  <strong>{{ message.senderEmail }}:</strong> {{ message.text }}
                </div>
              </div>
            </div>

            <div class="d-flex gap-2">
              <input
                v-model="newMessage"
                class="form-control"
                placeholder="Type message..."
              />
              <button class="btn btn-success" @click="sendMessage">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedTask" class="task-modal-backdrop" @click.self="closeTaskModal">
      <div class="task-modal-card">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h4 class="fw-bold mb-1">{{ selectedTask.title }}</h4>
            <p class="text-muted small mb-0">
              {{ selectedTask.description || "No description provided." }}
            </p>
          </div>

          <button class="btn-close" @click="closeTaskModal"></button>
        </div>

        <div v-if="stepError" class="alert alert-danger">
          {{ stepError }}
        </div>

        <div class="card p-3 border-0 shadow-sm mb-3">
          <h5 class="fw-bold mb-3">Add Step</h5>

          <div class="mb-3">
            <label for="stepTitle" class="form-label">Step Title</label>
            <input
              id="stepTitle"
              v-model="stepTitle"
              type="text"
              class="form-control"
              placeholder="Enter step title"
            />
          </div>

          <div class="mb-3">
            <label for="stepDescription" class="form-label">Step Description</label>
            <textarea
              id="stepDescription"
              v-model="stepDescription"
              class="form-control"
              rows="2"
              placeholder="Enter short step description"
            ></textarea>
          </div>

          <button class="btn btn-success w-100" @click="addStep">
            Add Step
          </button>
        </div>

        <div class="card p-3 border-0 shadow-sm">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0">Task Steps</h5>
            <span class="badge bg-secondary rounded-pill">
              {{ getStepsForTask(selectedTask.id).length }}
            </span>
          </div>

          <div v-if="loadingSteps" class="text-center py-3 text-muted">
            Loading steps...
          </div>

          <div
            v-else-if="getStepsForTask(selectedTask.id).length === 0"
            class="text-center py-3 text-muted"
          >
            No steps yet for this task.
          </div>

          <div v-else class="d-grid gap-2">
            <div
              v-for="step in getStepsForTask(selectedTask.id)"
              :key="step.id"
              class="step-card"
            >
              <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <h6 class="fw-bold mb-1">{{ step.title }}</h6>
                  <p class="text-muted small mb-0">
                    {{ step.description || "No description provided." }}
                  </p>
                </div>

                <span
                  class="badge rounded-pill"
                  :class="step.completed ? 'bg-success' : 'bg-warning text-dark'"
                >
                  {{ step.completed ? "Completed" : "Pending" }}
                </span>
              </div>

              <div class="d-flex gap-2 mt-3 flex-wrap">
                <button
                  class="btn btn-outline-primary btn-sm flex-fill"
                  @click="toggleStepComplete(step)"
                >
                  {{ step.completed ? "Mark as Pending" : "Mark as Completed" }}
                </button>

                <button
                  class="btn btn-outline-danger btn-sm flex-fill"
                  @click="removeStep(step)"
                >
                  Remove Step
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddMemberModal" class="task-modal-backdrop" @click.self="closeAddMemberModal">
      <div class="task-modal-card">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h4 class="fw-bold mb-1">Add Member</h4>
            <p class="text-muted small mb-0">
              Send an in-app invitation by email.
            </p>
          </div>

          <button class="btn-close" @click="closeAddMemberModal"></button>
        </div>

        <div v-if="inviteError" class="alert alert-danger">
          {{ inviteError }}
        </div>

        <div v-if="inviteSuccess" class="alert alert-success">
          {{ inviteSuccess }}
        </div>

        <div class="mb-3">
          <label for="invitedEmail" class="form-label">Member Email</label>
          <input
            id="invitedEmail"
            v-model="invitedEmail"
            type="email"
            class="form-control"
            placeholder="Enter member email"
          />
        </div>

        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary w-50" @click="closeAddMemberModal">
            Cancel
          </button>
          <button class="btn btn-success w-50" @click="sendInvitation">
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.task-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 16px;
  padding: 1rem;
}

.step-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  padding: 0.9rem;
}

.chat-box {
  height: 280px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 14px;
  padding: 1rem;
  background: #ffffff;
}

.chat-message {
  margin-bottom: 0.75rem;
}

.member-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid #e9ecef;
}

.member-row:last-child {
  border-bottom: none;
}

.task-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1050;
}

.task-modal-card {
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  overflow-y: auto;
  background: #fff3b0;
  border: 2px solid #f4d35e;
  border-radius: 22px;
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.2);
  padding: 1.25rem;
}
</style>