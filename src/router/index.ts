import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Meal from '@/views/meal/Meal.vue'
import Dishes from '@/views/dishes/Dishes.vue'
import Bookkeeping from '@/views/bookkeeping/Bookkeeping.vue'
import DictManagement from '@/views/dict/DictManagement.vue'
import Login from "@/views/Login.vue";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: Login
        },
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
                    name: '新增点餐',
                    component: () => import('@/views/meal/MealAdd.vue')
                },
                {
                    path: '/meal/edit',
                    name: '修改点餐',
                    component: () => import('@/views/meal/MealEdit.vue')
                },
                {
                    path: '/meal/detail',
                    name: '点餐详情',
                    component: () => import('@/views/meal/MealDetail.vue')
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
                },
                {
                    path: '/dishes/edit',
                    name: '修改菜品',
                    component: () => import('@/views/dishes/DishesEdit.vue')
                },
                {
                    path: '/dishes/detail',
                    name: '菜品详情',
                    component: () => import('@/views/dishes/DishesDetail.vue')
                },
                {
                    path: '/bookkeeping',
                    name: '记账记录',
                    component: Bookkeeping
                },
                {
                    path: '/dict',
                    name: '字典管理',
                    component: DictManagement
                }
            ]
        }
    ]
})

export default router
