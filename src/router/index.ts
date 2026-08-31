import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Login from "@/views/Login.vue";
import toolRoutes from "@/router/tools";
import zhaogangRoute from "@/router/zhaogang";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: Login,
            meta: {
                title: '登录'
            }
        },
        toolRoutes,
        zhaogangRoute,
        {
            path: '/',
            name: 'home',
            component: HomeView,
            meta: {
                title: '首页'
            },
            children: [
                {
                    path: '/meal',
                    name: '点餐列表',
                    component: () => import('@/views/meal/Meal.vue'),
                    meta: {title: '点餐列表'}
                },
                {
                    path: '/meal/add',
                    name: '新增点餐',
                    component: () => import('@/views/meal/MealAdd.vue'),
                    meta: {title: '新增点餐'}
                },
                {
                    path: '/meal/edit',
                    name: '修改点餐',
                    component: () => import('@/views/meal/MealEdit.vue'),
                    meta: {title: '修改点餐'}
                },
                {
                    path: '/meal/detail',
                    name: '点餐详情',
                    component: () => import('@/views/meal/MealDetail.vue'),
                    meta: {title: '点餐详情'}
                },
                {
                    path: '/dishes',
                    name: '菜品列表',
                    component: () => import('@/views/dishes/Dishes.vue'),
                    meta: {title: '菜品列表'}
                },
                {
                    path: '/dishes/add',
                    name: '新增菜品',
                    component: () => import('@/views/dishes/DishesAdd.vue'),
                    meta: {title: '新增菜品'}
                },
                {
                    path: '/dishes/edit',
                    name: '修改菜品',
                    component: () => import('@/views/dishes/DishesEdit.vue'),
                    meta: {title: '修改菜品'}
                },
                {
                    path: '/dishes/detail',
                    name: '菜品详情',
                    component: () => import('@/views/dishes/DishesDetail.vue'),
                    meta: {title: '菜品详情'}
                },
                {
                    path: '/bookkeeping',
                    name: '记账记录',
                    component: () => import('@/views/bookkeeping/Bookkeeping.vue'),
                    meta: {title: '记账记录'}
                },
                {
                    path: '/task/list',
                    name: '任务列表',
                    component: () => import('@/views/task/TaskList.vue'),
                    meta: {title: '任务列表'}
                },
                {
                    path: '/task/records',
                    name: '任务记录',
                    component: () => import('@/views/task/TaskRecords.vue'),
                    meta: {title: '任务记录'}
                },
                {
                    path: '/ai/session-task',
                    name: 'AI会话任务',
                    component: () => import('@/views/ai-session/AiSessionHub.vue'),
                    meta: {title: 'AI会话任务'}
                },
                {
                    path: '/points/records',
                    name: '积分记录',
                    component: () => import('@/views/points/PointsRecords.vue'),
                    meta: {title: '积分记录'}
                },
                {
                    path: '/dict',
                    name: '字典管理',
                    component: () => import('@/views/dict/DictManagement.vue'),
                    meta: {title: '字典管理'}
                },
                {
                    path: '/dict/add',
                    name: '新增字典',
                    component: () => import('@/views/dict/DictAdd.vue'),
                    meta: {title: '新增字典'}
                },
                {
                    path: '/dict/edit/:id',
                    name: '修改字典',
                    component: () => import('@/views/dict/DictEdit.vue'),
                    meta: {title: '修改字典'}
                },
                {
                    path: '/account',
                    name: '账号管理',
                    component: () => import('@/views/account/AccountManagement.vue'),
                    meta: {title: '账号管理'}
                },
                {
                    path: '/secret',
                    name: '密钥管理',
                    component: () => import('@/views/secret/SecretManagement.vue'),
                    meta: {title: '密钥管理'}
                },
                {
                    path: '/website/navigation',
                    name: '网站管理',
                    component: () => import('@/views/website/WebsiteManagement.vue'),
                    meta: {title: '网站管理'}
                }
            ]
        }
    ]
})

export default router
