<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../api/firebase"

const router = useRouter()

const currentUser = ref(null)
const saving = ref(false)
const savedMessage = ref("")

const darkMode = ref(false)
const showGlobalChat = ref(true)
const compactCards = ref(false)
const emailNotifications = ref(false)
const stickyNotesMode = ref(true)
const accentChoice = ref("blue")

let unsubscribe = null

const saveSettings = async () => {
  saving.value = true
  savedMessage.value = ""

  setTimeout(() => {
    saving.value = false
    savedMessage.value = "Settings saved locally for demo purposes."
  }, 500)
}

const logout = async () => {
  try {
    await signOut(auth)
    router.push("/")
  } catch (error) {
    console.error("Logout failed:", error)
  }
}

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
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-md">
      <div class="card yellow-sticker-card p-4 p-md-5">
        <div class="mb-4">
          <h2 class="fw-bold mb-1">Settings</h2>
          <p class="text-muted mb-0 small">
            Simple app preferences for your TaskMate workspace
          </p>
        </div>

        <div class="card p-4 border-0 shadow-sm">
          <h4 class="fw-bold mb-3">App Preferences</h4>

          <div class="row g-3">
            <div class="col-12">
              <div class="settings-row">
                <div>
                  <h6 class="mb-1">Dark Mode</h6>
                  <p class="text-muted small mb-0">Switch to a darker interface style later</p>
                </div>
                <input v-model="darkMode" type="checkbox" class="form-check-input settings-toggle" />
              </div>
            </div>

            <div class="col-12">
              <div class="settings-row">
                <div>
                  <h6 class="mb-1">Show Global Chat</h6>
                  <p class="text-muted small mb-0">Keep the global chat button visible</p>
                </div>
                <input v-model="showGlobalChat" type="checkbox" class="form-check-input settings-toggle" />
              </div>
            </div>

            <div class="col-12">
              <div class="settings-row">
                <div>
                  <h6 class="mb-1">Compact Cards</h6>
                  <p class="text-muted small mb-0">Use tighter cards on project pages</p>
                </div>
                <input v-model="compactCards" type="checkbox" class="form-check-input settings-toggle" />
              </div>
            </div>

            <div class="col-12">
              <div class="settings-row">
                <div>
                  <h6 class="mb-1">Email Notifications</h6>
                  <p class="text-muted small mb-0">Demo option for future reminders</p>
                </div>
                <input v-model="emailNotifications" type="checkbox" class="form-check-input settings-toggle" />
              </div>
            </div>

            <div class="col-12">
              <div class="settings-row">
                <div>
                  <h6 class="mb-1">Sticky Notes Mode</h6>
                  <p class="text-muted small mb-0">Keep the yellow card styling across pages</p>
                </div>
                <input v-model="stickyNotesMode" type="checkbox" class="form-check-input settings-toggle" />
              </div>
            </div>

            <div class="col-12">
              <label for="accentChoice" class="form-label fw-semibold">Accent Colour</label>
              <select id="accentChoice" v-model="accentChoice" class="form-select">
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
              </select>
            </div>
          </div>

          <div v-if="currentUser" class="mt-4">
            <label class="form-label fw-semibold">Account Email</label>
            <input
              type="text"
              class="form-control"
              :value="currentUser.email || 'No email available'"
              readonly
            />
          </div>

          <div v-if="savedMessage" class="alert alert-success mt-3 mb-0">
            {{ savedMessage }}
          </div>

          <div class="d-flex gap-2 mt-4">
            <button class="btn btn-success w-50" @click="saveSettings" :disabled="saving">
              {{ saving ? "Saving..." : "Save Settings" }}
            </button>

            <button class="btn btn-outline-danger w-50" @click="logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 14px;
}

.settings-toggle {
  width: 2.8rem;
  height: 1.4rem;
}
</style>