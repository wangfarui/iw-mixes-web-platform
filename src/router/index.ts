import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../views/HomeView.vue'
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
                    component: () => import('@/views/meal/Meal.vue')
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
                    component: () => import('@/views/dishes/Dishes.vue')
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
                    component: () => import('@/views/bookkeeping/Bookkeeping.vue')
                },
                {
                    path: '/task/list',
                    name: '任务列表',
                    component: () => import('@/views/task/TaskList.vue')
                },
                {
                    path: '/task/records',
                    name: '任务记录',
                    component: () => import('@/views/task/TaskRecords.vue')
                },
                {
                    path: '/points/records',
                    name: '积分记录',
                    component: () => import('@/views/points/PointsRecords.vue')
                },
                {
                    path: '/dict',
                    name: '字典管理',
                    component: () => import('@/views/dict/DictManagement.vue')
                },
                {
                    path: '/dict/add',
                    name: '新增字典',
                    component: () => import('@/views/dict/DictAdd.vue')
                },
                {
                    path: '/dict/edit/:id',
                    name: '修改字典',
                    component: () => import('@/views/dict/DictEdit.vue')
                },
                {
                    path: '/account',
                    name: '账号管理',
                    component: () => import('@/views/account/AccountManagement.vue')
                }
            ]
        }
    ]
})

export default router
