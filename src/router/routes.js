import { createRouter, createWebHistory } from "vue-router"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../api/firebase"

import Home from "../pages/Home.vue"
import Login from "../pages/Login.vue"
import Register from "../pages/Register.vue"
import Projects from "../pages/Projects.vue"
import Tasks from "../pages/Tasks.vue"
import Settings from "../pages/Settings.vue"
import About from "../pages/About.vue"

function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe()
        resolve(user)
      },
      (error) => {
        unsubscribe()
        reject(error)
      }
    )
  })
}

const routes = [
  {
    path: "/",
    name: "home",
    component: Home
  },
  {
    path: "/login",
    name: "login",
    component: Login,
    beforeEnter: async (to, from, next) => {
      try {
        const user = await getCurrentUser()

        if (user) {
          next("/")
        } else {
          next()
        }
      } catch (error) {
        console.error("Login route guard error:", error)
        next()
      }
    }
  },
  {
    path: "/register",
    name: "register",
    component: Register,
    beforeEnter: async (to, from, next) => {
      try {
        const user = await getCurrentUser()

        if (user) {
          next("/")
        } else {
          next()
        }
      } catch (error) {
        console.error("Register route guard error:", error)
        next()
      }
    }
  },
  {
    path: "/projects",
    name: "projects",
    component: Projects,
    meta: { requiresAuth: true }
  },
  {
    path: "/tasks/:id",
    name: "tasks",
    component: Tasks,
    meta: { requiresAuth: true }
  },
  {
    path: "/settings",
    name: "settings",
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: "/about",
    name: "about",
    component: About
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      const user = await getCurrentUser()

      if (user) {
        next()
      } else {
        next("/login")
      }
    } catch (error) {
      console.error("Protected route guard error:", error)
      next("/login")
    }
  } else {
    next()
  }
})

export default router