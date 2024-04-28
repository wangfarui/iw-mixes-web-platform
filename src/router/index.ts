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
          name: '点餐列表',
          component: Meal
        },
        {
          path: '/meal/add',
          name: '点餐',
          component: () => import('@/views/meal/MealAdd.vue')
        },
        {
          path: '/dishes',
          name: '菜品列表',
          component: Dishes
        },
        {
          path: '/dishes/add',
          name: '新增菜品',
          component: () => import('@/views/dishes/DishesAdd.vue')
        }
      ]
    }
  ]
})

export default router
