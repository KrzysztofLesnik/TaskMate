<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import {
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut
} from "firebase/auth"

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore"

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "firebase/storage"

import { auth, db, storage } from "../api/firebase"

const router = useRouter()

const currentUser = ref(null)
const displayName = ref("")
const avatarUrl = ref("")
const avatarFile = ref(null)

const deletePassword = ref("")
const loadingProfile = ref(true)
const savingName = ref(false)
const uploadingAvatar = ref(false)
const deletingAccount = ref(false)

const errorMessage = ref("")
const successMessage = ref("")

let unsubscribeAuth = null

const clearMessages = () => {
  errorMessage.value = ""
  successMessage.value = ""
}

const loadUserProfile = async (user) => {
  loadingProfile.value = true
  clearMessages()

  try {
    const userRef = doc(db, "users", user.uid)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const data = userSnap.data()
      displayName.value = data.displayName || user.displayName || ""
      avatarUrl.value = data.avatarUrl || ""
    } else {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        avatarUrl: "",
        friends: []
      })
    }
  } catch (error) {
    errorMessage.value = "Failed to load profile."
  } finally {
    loadingProfile.value = false
  }
}

const saveName = async () => {
  clearMessages()

  if (!displayName.value.trim()) {
    errorMessage.value = "Display name cannot be empty."
    return
  }

  savingName.value = true

  try {
    await updateProfile(currentUser.value, {
      displayName: displayName.value
    })

    await updateDoc(doc(db, "users", currentUser.value.uid), {
      displayName: displayName.value
    })

    successMessage.value = "Name updated"
  } catch {
    errorMessage.value = "Failed to update name"
  } finally {
    savingName.value = false
  }
}

const onFileChange = (e) => {
  avatarFile.value = e.target.files[0]
}

const uploadAvatar = async () => {
  if (!avatarFile.value) return

  uploadingAvatar.value = true
  clearMessages()

  try {
    const fileRef = storageRef(storage, `avatars/${currentUser.value.uid}`)

    await uploadBytes(fileRef, avatarFile.value)
    const url = await getDownloadURL(fileRef)

    await updateProfile(currentUser.value, {
      photoURL: url
    })

    await updateDoc(doc(db, "users", currentUser.value.uid), {
      avatarUrl: url
    })

    avatarUrl.value = url
    successMessage.value = "Avatar updated"
  } catch (err) {
    console.error(err)
    errorMessage.value = "Failed to upload avatar"
  } finally {
    uploadingAvatar.value = false
  }
}

const removeAccount = async () => {
  clearMessages()

  if (!deletePassword.value) {
    errorMessage.value = "Enter password"
    return
  }

  deletingAccount.value = true

  try {
    const user = auth.currentUser

    const credential = EmailAuthProvider.credential(
      user.email,
      deletePassword.value
    )

    await reauthenticateWithCredential(user, credential)

    await deleteDoc(doc(db, "users", user.uid))
    await deleteUser(user)

    await signOut(auth)
    router.push("/register")
  } catch (error) {
    errorMessage.value = "Failed to remove account"
  } finally {
    deletingAccount.value = false
  }
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    currentUser.value = user

    if (user) {
      await loadUserProfile(user)
    } else {
      router.push("/login")
    }
  })
})

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
})
</script>

<template>
  <section class="taskmate-page container">
    <div class="taskmate-card-md">
      <div class="card yellow-sticker-card p-4">

        <h2>Settings</h2>

        <div v-if="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <!-- ✅ AVATAR -->
        <div class="mb-4 text-center">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            class="avatar"
          />

          <div v-else class="avatar placeholder">
            ?
          </div>

          <input type="file" @change="onFileChange" class="mt-2" />
          <button class="btn btn-primary mt-2" @click="uploadAvatar">
            Upload Avatar
          </button>
        </div>

        <!-- NAME -->
        <div class="mb-4">
          <input v-model="displayName" class="form-control" />
          <button class="btn btn-primary mt-2" @click="saveName">
            Save Name
          </button>
        </div>

        <!-- DELETE -->
        <div class="mt-4">
          <input
            v-model="deletePassword"
            type="password"
            placeholder="Password"
            class="form-control"
          />

          <button class="btn btn-danger mt-2" @click="removeAccount">
            Delete Account
          </button>
        </div>

      </div>
    </div>
  </section>
</template>

<style scoped>
.avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
}

.placeholder {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>