import { createRouter, createWebHistory } from 'vue-router'
import FaultDetection from '../views/FaultDetection.vue'
import RoutePlanning from '../views/RoutePlanning.vue'
import CleaningStrategy from '../views/CleaningStrategy.vue'

const routes = [
  {
    path: '/',
    redirect: '/fault-detection'
  },
  {
    path: '/fault-detection',
    name: 'FaultDetection',
    component: FaultDetection
  },
  {
    path: '/route-planning',
    name: 'RoutePlanning',
    component: RoutePlanning
  },
  {
    path: '/cleaning-strategy',
    name: 'CleaningStrategy',
    component: CleaningStrategy
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router