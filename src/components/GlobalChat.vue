<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue"
import { onAuthStateChanged } from "firebase/auth"
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore"
import { auth, db } from "../api/firebase"

const isOpen = ref(false)
const currentUser = ref(null)
const messages = ref([])
const newMessage = ref("")
const loading = ref(false)
const sending = ref(false)
const errorMessage = ref("")
const messagesBox = ref(null)

let unsubscribeAuth = null
let unsubscribeMessages = null

const scrollToBottom = async () => {
  await nextTick()

  if (messagesBox.value) {
    messagesBox.value.scrollTop = messagesBox.value.scrollHeight
  }
}

const startMessagesListener = () => {
  if (unsubscribeMessages) return

  loading.value = true
  errorMessage.value = ""

  const messagesRef = collection(db, "globalMessages")
  const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"))

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    async (snapshot) => {
      messages.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))

      loading.value = false
      await scrollToBottom()
    },
    (error) => {
      console.error("Error loading global chat:", error)
      errorMessage.value = "Failed to load global chat."
      loading.value = false
    }
  )
}

const stopMessagesListener = () => {
  if (unsubscribeMessages) {
    unsubscribeMessages()
    unsubscribeMessages = null
  }
}

const toggleChat = () => {
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    startMessagesListener()
    scrollToBottom()
  }
}

const closeChat = () => {
  isOpen.value = false
}

const sendMessage = async () => {
  errorMessage.value = ""

  if (!currentUser.value) {
    errorMessage.value = "You must be logged in to use global chat."
    return
  }

  if (!newMessage.value.trim()) {
    errorMessage.value = "Message cannot be empty."
    return
  }

  sending.value = true

  try {
    await addDoc(collection(db, "globalMessages"), {
      text: newMessage.value.trim(),
      senderId: currentUser.value.uid,
      senderEmail: currentUser.value.email || "Unknown user",
      createdAt: serverTimestamp()
    })

    newMessage.value = ""
    await scrollToBottom()
  } catch (error) {
    console.error("Error sending message:", error)
    errorMessage.value = "Failed to send message."
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user

    if (!user) {
      closeChat()
      stopMessagesListener()
      messages.value = []
    }
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth()
  }

  stopMessagesListener()
})
</script>

<template>
  <div v-if="currentUser" class="global-chat-wrapper">
    <button class="btn btn-primary global-chat-toggle shadow" @click="toggleChat">
      {{ isOpen ? "Close Chat" : "Global Chat" }}
    </button>

    <div v-if="isOpen" class="card global-chat-popup shadow-lg">
      <div class="card-header global-chat-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Global Chat</h5>
          <small class="text-white-50">Logged in as {{ currentUser.email }}</small>
        </div>

        <button class="btn btn-sm btn-light" @click="closeChat">
          ✕
        </button>
      </div>

      <div ref="messagesBox" class="card-body global-chat-messages">
        <div v-if="loading" class="text-center text-muted py-4">
          Loading messages...
        </div>

        <div v-else-if="messages.length === 0" class="text-center text-muted py-4">
          No messages yet. Start the conversation.
        </div>

        <div v-else>
          <div
            v-for="message in messages"
            :key="message.id"
            class="global-chat-message mb-3"
          >
            <div class="small fw-bold text-primary">
              {{ message.senderEmail }}
            </div>

            <div class="message-bubble">
              {{ message.text }}
            </div>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <div v-if="errorMessage" class="alert alert-danger py-2 mb-2">
          {{ errorMessage }}
        </div>

        <form class="d-flex gap-2" @submit.prevent="sendMessage">
          <input
            v-model="newMessage"
            type="text"
            class="form-control"
            placeholder="Type a message..."
            :disabled="sending"
          />

          <button type="submit" class="btn btn-success" :disabled="sending">
            {{ sending ? "Sending..." : "Send" }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.global-chat-wrapper {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2000;
}

.global-chat-toggle {
  border-radius: 999px;
  padding: 0.75rem 1rem;
  font-weight: 600;
}

.global-chat-popup {
  width: 360px;
  height: 500px;
  margin-top: 0.75rem;
  border: none;
  border-radius: 18px;
  overflow: hidden;
  background: #ffffff;
}

.global-chat-header {
  background: linear-gradient(90deg, #0d6efd, #198754);
  color: white;
}

.global-chat-messages {
  height: 340px;
  overflow-y: auto;
  background: #f8f9fa;
}

.global-chat-message {
  display: flex;
  flex-direction: column;
}

.message-bubble {
  display: inline-block;
  max-width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  word-break: break-word;
}

@media (max-width: 576px) {
  .global-chat-wrapper {
    right: 12px;
    left: 12px;
    bottom: 12px;
  }

  .global-chat-popup {
    width: 100%;
    height: 70vh;
  }
}
</style>