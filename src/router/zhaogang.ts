import type { RouteRecordRaw } from 'vue-router'

const zhaogangRoute: RouteRecordRaw = {
  path: '/zhaogang',
  name: '找钢工作台',
  component: () => import('@/views/zhaogang/ZhaogangWorkbench.vue'),
  meta: {
    public: true,
    title: '找钢工作台'
  },
  children: [
    {
      path: 'teams',
      name: '找钢团队',
      component: () => import('@/views/zhaogang/team/ZhaogangTeamView.vue'),
      meta: { public: true, title: '团队', zhaogangView: 'team' }
    },
    {
      path: 'invitations/:inviteCode',
      name: '找钢团队邀请',
      component: () => import('@/views/zhaogang/team/ZhaogangInvitationView.vue'),
      meta: { public: true, title: '团队邀请', zhaogangView: 'team' }
    },
    {
      path: 'iterations',
      name: '找钢团队迭代',
      component: () => import('@/views/zhaogang/iteration/ZhaogangIterationListView.vue'),
      meta: { public: true, title: '团队迭代', zhaogangView: 'iteration' }
    },
    {
      path: 'iterations/:iterationId',
      name: '找钢团队迭代详情',
      component: () => import('@/views/zhaogang/iteration/ZhaogangIterationDetailView.vue'),
      meta: { public: true, title: '迭代详情', zhaogangView: 'iteration' }
    },
    {
      path: 'worklogs',
      name: '找钢工时',
      component: () => import('@/views/zhaogang/ZhaogangEmptyRoute.vue'),
      meta: { public: true, title: '工时', zhaogangView: 'worklog' }
    },
    {
      path: 'calendar',
      name: '找钢日历',
      component: () => import('@/views/zhaogang/calendar/ZhaogangCalendarView.vue'),
      meta: { public: true, title: '日历', zhaogangView: 'calendar' }
    },
    {
      path: 'services',
      name: '找钢 K8s',
      component: () => import('@/views/zhaogang/service/ZhaogangServiceView.vue'),
      meta: { public: true, title: 'K8s', zhaogangView: 'services' }
    },
    {
      path: 'services/install',
      name: '找钢服务使用教程',
      component: () => import('@/views/zhaogang/service/ZhaogangServiceInstallView.vue'),
      meta: { public: true, title: 'Agent 使用教程', zhaogangView: 'services' }
    },
    {
      path: 'settings',
      name: '找钢工作台设置',
      component: () => import('@/views/zhaogang/ZhaogangEmptyRoute.vue'),
      meta: { public: true, title: '设置', zhaogangView: 'settings' }
    }
  ]
}

export default zhaogangRoute
