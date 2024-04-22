import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Meal from '@/views/meal/Meal.vue'
import Dishes from '@/views/dishes/Dishes.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      children: [
        {
          path: '/meal',
          name: '点餐',
          component: Meal
        },
        {
          path: '/dishes',
          name: '菜品',
          component: Dishes
        }
      ]
    }
  ]
})

export default router
