<template>
  <main class="zhaogang-page">
    <header class="page-header">
      <div class="brand">
        <span class="brand-mark">找钢</span>
        <div>
          <h1>找钢工作台</h1>
          <p>统一查看工时与跨项目发布</p>
        </div>
      </div>
      <div v-if="session" class="account-summary">
        <button
          v-if="releaseCheck"
          type="button"
          class="header-release-tag"
          :aria-label="`打开更新日志，当前版本 v${releaseCheck.currentRelease.version}${releaseCheck.receipt.read ? '' : '，有新版本更新'}`"
          @click="openReleaseHistory"
        >
          <span>v{{ releaseCheck.currentRelease.version }}</span>
          <span v-if="!releaseCheck.receipt.read" class="header-release-tag__dot" aria-label="有新版本更新" />
        </button>
        <el-avatar :size="34" :src="session.avatar">{{ session.userName?.slice(0, 1) }}</el-avatar>
        <span>{{ session.userName }}</span>
      </div>
    </header>

    <section v-if="sessionLoading" class="loading-shell">
      <el-skeleton :rows="9" animated />
    </section>

    <section v-else-if="!session" class="onboarding-shell">
      <div class="onboarding-copy">
        <el-tag type="primary" effect="plain">首次使用</el-tag>
        <h2>连接你的 CODING 工作台</h2>
        <p>令牌由你在 CODING 页面创建并完成密码验证；找钢工作台只在浏览器 Cookie 中保留加密后的绑定信息。</p>
      </div>

      <ZhaogangPermissionPrompt
        v-if="permissionPrompt"
        :prompt="permissionPrompt"
        @open="openTokenCreation"
        @dismiss="permissionPrompt = null"
      />

      <div class="steps-grid">
        <article class="step-card">
          <span>1</span>
          <h3>创建个人令牌</h3>
          <p>在 CODING 中完成密码验证后，新建一个访问令牌。</p>
          <el-button type="primary" plain @click="openTokenCreation">打开 CODING</el-button>
        </article>
        <article class="step-card permissions-card">
          <span>2</span>
          <h3>勾选最小权限</h3>
          <div class="permission-list">
            <el-tag v-for="permission in permissions" :key="permission" effect="plain">{{ permission }}</el-tag>
          </div>
        </article>
        <article class="step-card">
          <span>3</span>
          <h3>粘贴并检查</h3>
          <p>工作台会验证令牌和可访问项目，不会要求输入 CODING 密码。</p>
        </article>
      </div>

      <el-card class="bind-card" shadow="never">
        <template #header>
          <div class="bind-card-title">
            <div>
              <strong>绑定个人访问令牌</strong>
              <small>IP 白名单可先留空；后续如有固定服务出口 IP，再按需限制。</small>
            </div>
          </div>
        </template>
        <el-input
          v-model="tokenInput"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="粘贴刚刚创建的 CODING 个人令牌"
          @keyup.enter="bindToken"
        />
        <div class="bind-actions">
          <span v-if="bindError" class="bind-error">{{ bindError }}</span>
          <el-button type="primary" :loading="binding" :disabled="!tokenInput.trim()" @click="bindToken">检查并绑定</el-button>
        </div>
      </el-card>
    </section>

    <section v-else class="workspace-shell" :class="{ 'workspace-shell--nav-collapsed': navCollapsed }">
      <aside class="workspace-nav">
        <div class="workspace-nav-collapse">
          <button
            class="workspace-nav-toggle"
            type="button"
            :aria-label="navCollapsed ? '展开菜单' : '收起菜单'"
            :title="navCollapsed ? '展开菜单' : '收起菜单'"
            @click="navCollapsed = !navCollapsed"
          >
            <el-icon><Expand v-if="navCollapsed" /><Fold v-else /></el-icon>
          </button>
        </div>
        <button :class="{ active: activeTab === 'release' }" type="button" aria-label="发布" :title="navCollapsed ? '发布' : undefined" @click="navigateTab('release')">
          <el-icon><Promotion /></el-icon>
          <span class="workspace-nav-label">发布</span>
        </button>
        <button :class="{ active: activeTab === 'iteration' }" type="button" aria-label="迭代" :title="navCollapsed ? '迭代' : undefined" @click="navigateTab('iteration')">
          <el-icon><Tickets /></el-icon>
          <span class="workspace-nav-label">迭代</span>
        </button>
        <button :class="{ active: activeTab === 'worklog' }" type="button" aria-label="工时" :title="navCollapsed ? '工时' : undefined" @click="navigateTab('worklog')">
          <el-icon><Timer /></el-icon>
          <span class="workspace-nav-label">工时</span>
        </button>
        <button :class="{ active: activeTab === 'team' }" type="button" aria-label="团队" :title="navCollapsed ? '团队' : undefined" @click="navigateTab('team')">
          <el-icon><UserFilled /></el-icon>
          <span class="workspace-nav-label">团队</span>
        </button>
        <button :class="{ active: activeTab === 'calendar' }" type="button" aria-label="日历" :title="navCollapsed ? '日历' : undefined" @click="navigateTab('calendar')">
          <el-icon><Calendar /></el-icon>
          <span class="workspace-nav-label">日历</span>
        </button>
        <button :class="{ active: activeTab === 'services' }" type="button" aria-label="K8s" :title="navCollapsed ? 'K8s' : undefined" @click="navigateTab('services')">
          <el-icon><Monitor /></el-icon>
          <span class="workspace-nav-label">K8s</span>
        </button>
        <button :class="{ active: activeTab === 'settings' }" type="button" aria-label="设置" :title="navCollapsed ? '设置' : undefined" @click="navigateTab('settings')">
          <el-icon><Setting /></el-icon>
          <span class="workspace-nav-label">设置</span>
        </button>
        <button class="workspace-nav-tools" type="button" aria-label="工具" :title="navCollapsed ? '工具' : undefined" @click="openTools">
          <el-icon><ToolboxIcon /></el-icon>
          <span class="workspace-nav-label">工具</span>
        </button>
      </aside>

      <section class="workspace-content" :class="{
        'workspace-content--release': activeTab === 'release',
        'workspace-content--iteration-detail': route.name === '找钢团队迭代详情'
      }">
        <ZhaogangPermissionPrompt
          v-if="permissionPrompt"
          :prompt="permissionPrompt"
          @open="openTokenCreation"
          @dismiss="permissionPrompt = null"
        />
        <template v-if="activeTab === 'iteration' || activeTab === 'team' || activeTab === 'calendar' || activeTab === 'services' || route.name === '找钢 Agent 使用教程'">
          <router-view v-slot="{ Component }">
            <Suspense>
              <component :is="Component" />
              <template #fallback>
                <div class="route-loading-state" role="status" aria-live="polite">
                  <el-icon class="route-loading-icon" :size="28"><Loading /></el-icon>
                  <span>正在加载页面...</span>
                </div>
              </template>
            </Suspense>
          </router-view>
        </template>

        <template v-else-if="activeTab === 'release'">
          <div class="release-toolbar">
            <div class="toolbar-left">
              <el-button :type="favoriteOnly ? 'default' : 'primary'" text @click="changeReleaseTab('all')">全部计划 {{ buildPlans.length }}</el-button>
              <el-button :type="favoriteOnly ? 'primary' : 'default'" text @click="changeReleaseTab('favorites')">★ 收藏计划 {{ favorites.size }}</el-button>
              <el-input v-model="keyword" clearable class="service-search" :prefix-icon="Search" placeholder="按服务名称搜索" />
              <el-select v-model="projectFilter" class="project-filter" filterable placeholder="搜索项目">
                <el-option label="全部项目" value="all" />
                <el-option v-for="project in projects" :key="project.id" :label="project.displayName || project.name" :value="project.id" />
              </el-select>
              <el-select v-model="buildabilityFilter" class="buildability-filter" aria-label="构建能力筛选">
                <el-option label="可构建" value="buildable" />
                <el-option label="不可构建" value="unbuildable" />
                <el-option label="全部" value="all" />
              </el-select>
              <el-button :icon="Refresh" :loading="pageSyncLoading" @click="refreshCurrentPage">刷新</el-button>
            </div>
            <div class="toolbar-right">
              <span class="sync-time" :class="{ 'is-syncing': pageSyncLoading }">{{ syncStatusText }}</span>
              <el-radio-group v-model="viewMode" size="small" @change="changePlanView">
                <el-radio-button value="table">表格</el-radio-button>
                <el-radio-button value="card">卡片</el-radio-button>
              </el-radio-group>
            </div>
          </div>

          <el-alert v-if="catalogFailures.length" type="warning" :closable="false" show-icon class="partial-alert">
            <template #title>有 {{ catalogFailures.length }} 个项目暂未加载，其他计划仍可正常使用。</template>
          </el-alert>

          <div class="plan-list-viewport">
            <el-table
              v-if="viewMode === 'table' && (catalogLoading || filteredPlans.length)"
              :data="pagedPlans"
              v-loading="catalogLoading && !buildPlans.length"
              height="100%"
              border
              row-key="id"
              class="plan-table"
              @header-dragend="cachePlanColumnWidth"
              @row-click="openPlan"
            >
              <el-table-column width="58" align="center" :resizable="false">
                <template #default="scope">
                  <el-button text class="favorite-button" @click.stop="toggleFavorite(scope.row)">{{ isFavorite(scope.row) ? '★' : '☆' }}</el-button>
                </template>
              </el-table-column>
              <el-table-column column-key="service" label="服务 / 构建计划" :width="planColumnWidth('service')" min-width="250" resizable>
                <template #default="scope">
                  <div class="plan-name"><strong>{{ scope.row.name }}</strong><small>{{ scope.row.projectDisplayName || scope.row.projectName }}</small></div>
                </template>
              </el-table-column>
              <el-table-column column-key="status" label="最近状态" :width="planColumnWidth('status')" min-width="190" resizable>
                <template #default="scope">
                  <div class="build-status-cell">
                    <el-tag :type="buildTagType(scope.row.latestBuild?.status)" effect="light">{{ buildStatus(scope.row.latestBuild?.status) }}</el-tag>
                    <small v-if="scope.row.latestBuild?.statusDetail">{{ scope.row.latestBuild.statusDetail }}</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column column-key="branch" label="分支 / 版本" :width="planColumnWidth('branch')" min-width="150" resizable>
                <template #default="scope">{{ buildBranch(scope.row) }}</template>
              </el-table-column>
              <el-table-column column-key="builder" label="最近构建人" :width="planColumnWidth('builder')" min-width="120" resizable>
                <template #default="scope">{{ scope.row.latestBuild?.triggerUser || '—' }}</template>
              </el-table-column>
              <el-table-column column-key="duration" label="耗时" :width="planColumnWidth('duration')" min-width="110" resizable>
                <template #default="scope">{{ scope.row.latestBuild?.duration || '—' }}</template>
              </el-table-column>
              <el-table-column column-key="startedAt" label="开始时间" :width="planColumnWidth('startedAt')" min-width="145" resizable>
                <template #default="scope">{{ scope.row.latestBuild?.startedAt || '暂无记录' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="125" fixed="right" :resizable="false">
                <template #default="scope"><el-button link type="primary" @click.stop="openCoding(scope.row)">CODING 详情</el-button></template>
              </el-table-column>
            </el-table>

            <div v-else-if="viewMode === 'card' && (catalogLoading || filteredPlans.length)" v-loading="catalogLoading && !buildPlans.length" class="plan-cards">
              <button v-for="plan in pagedPlans" :key="planKey(plan)" type="button" class="plan-card" @click="openPlan(plan)">
                <div><strong>{{ plan.name }}</strong><span class="card-star" @click.stop="toggleFavorite(plan)">{{ isFavorite(plan) ? '★' : '☆' }}</span></div>
                <small>{{ plan.projectDisplayName || plan.projectName }}</small>
                <div class="build-status-cell">
                  <el-tag :type="buildTagType(plan.latestBuild?.status)" effect="light">{{ buildStatus(plan.latestBuild?.status) }}</el-tag>
                  <small v-if="plan.latestBuild?.statusDetail">{{ plan.latestBuild.statusDetail }}</small>
                </div>
                <p>
                  {{ buildBranch(plan) }} · {{ plan.latestBuild?.triggerUser || '暂无构建人' }}<template v-if="plan.latestBuild?.startedAt"> · {{ plan.latestBuild.startedAt }}</template>
                </p>
              </button>
            </div>

            <el-empty v-else class="plan-list-empty" description="没有符合条件的构建计划" />
          </div>

          <div class="pagination-row">
            <span>共 {{ filteredPlans.length }} 个计划</span>
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="pageSizeOptions"
              layout="sizes, prev, pager, next"
              :total="filteredPlans.length"
              @size-change="changePageSize"
            />
          </div>
        </template>

        <WorklogDashboard v-else-if="activeTab === 'worklog'" />

        <template v-else>
          <div class="settings-center">
            <nav class="settings-nav" aria-label="设置分类">
              <button
                v-for="item in settingsNavigation"
                :key="item.key"
                type="button"
                :class="{ active: settingsSection === item.key }"
                @click="changeSettingsSection(item.key)"
              >
                <span>{{ item.label }}</span>
                <el-tag :type="settingsNavigationTagType(item.key)" size="small" effect="light">
                  {{ settingsNavigationStatus(item.key) }}
                </el-tag>
              </button>
            </nav>

            <div class="settings-content-panel">
              <div v-if="settingsSection === 'general'" class="settings-layout">
                <section class="settings-section">
              <el-alert
                v-if="session.tokenRotationRequired"
                type="warning"
                :closable="false"
                show-icon
                class="token-rotation-alert"
                title="请更换 CODING 令牌"
              >
                <template #default>
                  <span>当前令牌需要重新登记，完成更换后才能参与团队工时统计。</span>
                  <el-button link type="warning" @click="replaceTokenVisible = true">立即更换</el-button>
                </template>
              </el-alert>
              <header class="settings-heading">
                <div><h3>CODING 连接</h3><p>当前工作台使用的账号与个人访问令牌。</p></div>
                <el-tag type="success" effect="light">连接正常</el-tag>
              </header>
              <div class="connection-profile">
                <el-avatar :size="46" :src="session.avatar">{{ session.userName?.slice(0, 1) }}</el-avatar>
                <div><strong>{{ session.userName }}</strong><span>{{ session.team }}</span></div>
              </div>
              <dl class="connection-details">
                <div><dt>绑定令牌</dt><dd><code>{{ session.tokenHint || '已安全绑定' }}</code></dd></div>
                <div><dt>用户 ID</dt><dd>{{ session.userId }}</dd></div>
              </dl>
              <div class="settings-actions">
                <el-button :icon="DocumentCopy" :loading="copyingToken" @click="copyBoundToken">复制令牌</el-button>
                <el-button :icon="Link" @click="openTokenCreation">令牌管理</el-button>
                <el-button :icon="RefreshRight" @click="replaceTokenVisible = true">更换令牌</el-button>
                <el-button :icon="SwitchButton" type="danger" plain @click="disconnect">解除绑定</el-button>
              </div>
                </section>

                <section class="settings-section">
                  <header class="settings-heading"><div><h3>工作台偏好</h3><p>设置仅保存在当前浏览器，并按 CODING 用户隔离。</p></div></header>
                  <el-form label-position="left" label-width="150px" class="preferences-form">
                    <el-form-item label="默认首页">
                      <el-radio-group v-model="preferences.defaultTab" @change="savePreferences">
                        <el-radio-button value="release">项目发布</el-radio-button>
                        <el-radio-button value="team">团队</el-radio-button>
                        <el-radio-button value="iteration">迭代</el-radio-button>
                        <el-radio-button value="calendar">日历</el-radio-button>
                        <el-radio-button value="worklog">工时</el-radio-button>
                        <el-radio-button value="services">K8s</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item label="计划默认视图">
                      <el-radio-group v-model="preferences.planView" @change="applyPlanViewPreference">
                        <el-radio-button value="table">表格</el-radio-button>
                        <el-radio-button value="card">卡片</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item label="当前 CODING 角色">
                      <el-select v-model="preferences.codingRole" clearable placeholder="请选择角色" @change="savePreferences">
                        <el-option label="产品" value="PRODUCT" />
                        <el-option label="后端开发" value="BACKEND" />
                        <el-option label="前端开发" value="FRONTEND" />
                        <el-option label="测试" value="QA" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="新增子事项">
                      <el-switch v-model="preferences.autoSyncCreatedChildIssue" active-text="默认同步 CODING" @change="savePreferences" />
                    </el-form-item>
                    <el-form-item label="记住项目筛选">
                      <el-switch v-model="preferences.rememberProjectFilter" @change="changeRememberProjectFilter" />
                    </el-form-item>
                  </el-form>
                  <div class="settings-actions">
                    <el-button :icon="RefreshLeft" @click="resetPreferences">恢复默认设置</el-button>
                  </div>
                </section>
              </div>

              <ZhaogangAgentSettings
                :active-section="agentSettingsSection"
                @summary-change="agentSettingsSummary = $event"
              />

              <section v-if="settingsSection === 'local-data'" class="settings-section">
                <header class="settings-heading"><div><h3>本地数据</h3><p>收藏保存在当前浏览器，不会同步到 CODING。</p></div></header>
                <div class="local-data-row">
                  <div><strong>{{ favorites.size }} 个收藏计划</strong><span>清理后不会影响 CODING 中的项目或构建计划。</span></div>
                  <el-button :icon="Delete" :disabled="!favorites.size" @click="clearFavorites">清空收藏</el-button>
                </div>
              </section>
            </div>
          </div>
        </template>
      </section>
    </section>

    <el-drawer v-model="detailVisible" size="min(780px, 100%)" :with-header="false" destroy-on-close>
      <div v-if="detailLoading" class="drawer-loading"><el-skeleton :rows="8" animated /></div>
      <template v-else-if="planDetail">
        <div class="drawer-heading">
          <div><h2>{{ planDetail.plan.name }}</h2><p>{{ planDetail.plan.projectDisplayName || planDetail.plan.projectName }}</p></div>
          <div class="drawer-heading-side">
            <div class="drawer-heading-actions">
              <el-tooltip :content="isFavorite(planDetail.plan) ? '取消收藏' : '收藏计划'">
                <el-button
                  text
                  circle
                  class="drawer-icon-button drawer-favorite-button"
                  :class="{ active: isFavorite(planDetail.plan) }"
                  :aria-label="isFavorite(planDetail.plan) ? '取消收藏' : '收藏计划'"
                  :aria-pressed="isFavorite(planDetail.plan)"
                  @click="toggleFavorite(planDetail.plan)"
                >
                  <el-icon><StarFilled v-if="isFavorite(planDetail.plan)" /><Star v-else /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="在 CODING 中查看">
                <el-button text circle type="primary" class="drawer-icon-button" aria-label="在 CODING 中查看" @click="openCoding(planDetail.plan)">
                  <el-icon><TopRight /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <div class="drawer-build-action">
              <el-button type="primary" :disabled="!planDetail.plan.quickBuildSupported" @click="openBuildDialog">立即构建</el-button>
              <el-tooltip v-if="!planDetail.plan.quickBuildSupported" content="未识别到该计划的代码仓库或 env 启动参数，请在 CODING 中发起构建。"><el-icon><WarningFilled /></el-icon></el-tooltip>
            </div>
          </div>
        </div>
        <section class="service-status-section">
          <div class="service-status-heading">
            <h3>服务状态</h3>
            <el-button text :icon="Refresh" :loading="detailK8sLoading" @click="refreshPlanK8sStatus">刷新服务状态</el-button>
          </div>
          <div class="service-status-table" role="table" aria-label="三个环境服务状态">
            <div class="service-status-row service-status-row--header" role="row">
              <span role="columnheader">环境</span>
              <span role="columnheader">Pods</span>
              <span role="columnheader">服务状态</span>
              <span role="columnheader">Pod创建时间</span>
              <span role="columnheader">K8s</span>
            </div>
            <div v-for="environment in releaseK8sEnvironments" :key="environment" class="service-status-row" role="row">
              <strong role="cell">{{ environment.toUpperCase() }}</strong>
              <span role="cell">{{ k8sPodsText(detailK8sStatuses?.statuses[environment]) }}</span>
              <span role="cell" class="service-status-value" :title="detailK8sStatuses?.statuses[environment]?.message || undefined">
                <el-tag :type="k8sStatusTagType(detailK8sStatuses?.statuses[environment], detailK8sLoading)" effect="light">
                  {{ k8sStatusText(detailK8sStatuses?.statuses[environment], detailK8sLoading) }}
                </el-tag>
              </span>
              <span role="cell">{{ k8sCreatedAt(detailK8sStatuses?.statuses[environment]) }}</span>
              <span role="cell">
                <el-button
                  text
                  circle
                  type="primary"
                  :icon="TopRight"
                  :disabled="!detailK8sStatuses?.statuses[environment]?.deployment"
                  :aria-label="`打开 ${environment.toUpperCase()} K8s`"
                  :title="`打开 ${environment.toUpperCase()} K8s`"
                  @click="openK8sDashboard(environment)"
                />
              </span>
            </div>
          </div>
        </section>
        <h3>最近构建记录</h3>
        <el-empty v-if="!planDetail.builds.length" description="暂无构建记录" :image-size="80" />
        <div v-else class="build-history">
          <div v-for="build in planDetail.builds" :key="build.id || build.number" class="build-row">
            <div class="build-status-cell">
              <el-tag :type="buildTagType(build.status)" effect="light">{{ buildStatus(build.status) }}</el-tag>
              <small v-if="build.statusDetail">{{ build.statusDetail }}</small>
            </div>
            <div>
              <span class="build-primary">{{ build.triggerUser || '—' }}</span>
              <span class="build-secondary">#{{ build.number }} | {{ build.branch || '—' }} | {{ build.commit || '—' }}</span>
            </div>
            <div>
              <span class="build-primary">{{ build.startedAt || '—' }}</span>
              <span class="build-secondary">{{ build.duration || '—' }}</span>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>

    <ZhaogangReleaseHistoryDrawer
      v-if="releaseCheck"
      v-model="releaseHistoryVisible"
      :releases="releaseCheck.manifest.releases"
      :current-release-id="releaseCheck.manifest.currentReleaseId"
    />

    <el-dialog v-model="buildDialogVisible" title="立即构建" width="min(480px, calc(100% - 32px))" :close-on-click-modal="false">
      <p v-if="planDetail" class="dialog-plan-name">{{ planDetail.plan.name }}</p>
      <el-form label-position="top">
        <el-form-item label="env">
          <el-select v-model="buildForm.environment" class="dialog-control" @change="changeEnvironment">
            <el-option v-for="environment in planDetail?.plan.environments || []" :key="environment" :label="environment" :value="environment" />
          </el-select>
        </el-form-item>
        <el-form-item label="构建目标（Git 分支）">
          <el-select v-model="buildForm.branch" class="dialog-control" filterable remote :remote-method="searchBranches" :loading="branchLoading" placeholder="搜索真实分支" @change="branchManuallySelected = true">
            <el-option v-if="buildForm.branch && !branchOptions.some(item => item.name === buildForm.branch)" :label="buildForm.branch" :value="buildForm.branch" />
            <el-option v-for="branch in branchOptions" :key="branch.name" :label="branch.name" :value="branch.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-alert type="info" :closable="false" title="分支始终从 CODING 关联仓库搜索；手动选择分支后，切换环境不会覆盖该选择。" />
      <template #footer>
        <el-button @click="buildDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="triggering" :disabled="!buildForm.branch || !buildForm.environment" @click="triggerBuild">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="replaceTokenVisible" title="更换 CODING 令牌" width="min(480px, calc(100% - 32px))" :close-on-click-modal="false" @closed="clearReplacementToken">
      <el-form label-position="top">
        <el-form-item label="新的个人访问令牌">
          <el-input v-model="replacementToken" type="password" show-password autocomplete="new-password" placeholder="粘贴新的 CODING 个人令牌" @keyup.enter="replaceToken" />
        </el-form-item>
      </el-form>
      <p v-if="replaceTokenError" class="bind-error">{{ replaceTokenError }}</p>
      <template #footer>
        <el-button @click="replaceTokenVisible = false">取消</el-button>
        <el-button type="primary" :loading="replacingToken" :disabled="!replacementToken.trim()" @click="replaceToken">检查并更换</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="rotationPromptVisible"
      title="需要更换 CODING 令牌"
      width="min(460px, calc(100% - 32px))"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <p class="rotation-prompt-copy">为启用团队工时汇总，请先在设置页复制当前令牌，再更换并重新登记一次。</p>
      <template #footer>
        <el-button type="primary" @click="goToTokenRotation">前往设置更换</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, Delete, DocumentCopy, Expand, Fold, Link, Loading, Monitor, Promotion, Refresh, RefreshLeft, RefreshRight, Search, Setting, Star, StarFilled, SwitchButton, Tickets, Timer, TopRight, UserFilled, WarningFilled } from '@element-plus/icons-vue'
import ToolboxIcon from '@/assets/icons/toolbox.svg'
import {
  bindZhaogangToken,
  clearZhaogangSession,
  getZhaogangPlanCatalog,
  getZhaogangPlanDetail,
  getZhaogangSession,
  getZhaogangToken,
  searchZhaogangBranches,
  syncZhaogangPlanPage,
  triggerZhaogangBuild
} from '@/api/zhaogang'
import { clearZhaogangFavorites, loadZhaogangFavorites, planFavoriteKey, toggleZhaogangFavorite } from '@/services/zhaogangFavorites'
import {
  ZHAOGANG_PERMISSION_EVENT,
  type ZhaogangPermissionPromptDetail
} from '@/services/zhaogangPermissionPrompt'
import { defaultZhaogangPreferences, loadZhaogangPreferences, resetZhaogangPreferences, saveZhaogangPreferences } from '@/services/zhaogangPreferences'
import { acknowledgeCurrentZhaogangRelease, loadCurrentZhaogangRelease, zhaogangReleaseLocalPrefix } from '@/services/zhaogangReleaseNotes'
import {
  queryPlanK8sStatuses,
  releaseK8sEnvironments,
  zhaogangK8sDashboardUrl,
  type PlanK8sStatuses,
  type ReleaseK8sStatus
} from '@/services/zhaogangReleaseK8s'
import type { ZhaogangBranch, ZhaogangBuildPlan, ZhaogangPlanDetail, ZhaogangPlanPageSize, ZhaogangPlanTableColumnKey, ZhaogangPreferences, ZhaogangProject, ZhaogangSessionStatus } from '@/types/zhaogang'
import type { ZgK8sEnvironment } from '@/types/zhaogangService'
import type { ZhaogangReleaseCheck } from '@/types/zhaogangRelease'
import WorklogDashboard from './components/worklog/WorklogDashboard.vue'
import ZhaogangPermissionPrompt from './components/ZhaogangPermissionPrompt.vue'
import ZhaogangReleaseHistoryDrawer from './components/ZhaogangReleaseHistoryDrawer.vue'
import ZhaogangAgentSettings from './settings/ZhaogangAgentSettings.vue'

type TabKey = 'release' | 'team' | 'iteration' | 'calendar' | 'worklog' | 'services' | 'settings'
type ViewMode = 'table' | 'card'
type BuildabilityFilter = 'buildable' | 'unbuildable' | 'all'
type PlanWithBuild = ZhaogangBuildPlan
type ResizedPlanTableColumn = { columnKey?: string }
type SettingsSection = 'general' | 'agent' | 'agent-k8s' | 'ai' | 'local-data'
type AgentSettingsSection = Exclude<SettingsSection, 'general' | 'local-data'> | null
type SettingsTagType = 'success' | 'warning' | 'info'
type AgentSettingsSummary = {
  agent: string
  agentType: SettingsTagType
  k8s: string
  k8sType: SettingsTagType
  ai: string
  aiType: SettingsTagType
}

const route = useRoute()
const router = useRouter()
const permissions = ['用户信息（只读）', '团队信息（只读）', '团队成员（只读）', '项目信息（只读）', '项目协同（读写）', '代码仓库（只读）', '持续集成任务（只读）', '持续集成构建（读写）']
const pageSizeOptions: ZhaogangPlanPageSize[] = [10, 15, 20, 50]
const planTableColumnMinimumWidths: Record<ZhaogangPlanTableColumnKey, number> = {
  service: 250,
  status: 140,
  branch: 120,
  builder: 100,
  duration: 90,
  startedAt: 120
}
const sessionLoading = ref(true)
const session = ref<ZhaogangSessionStatus | null>(null)
const tokenInput = ref('')
const binding = ref(false)
const bindError = ref('')
const activeTab = ref<TabKey>('release')
const navCollapsed = ref(false)
const preferences = ref<ZhaogangPreferences>(defaultZhaogangPreferences())
const projects = ref<ZhaogangProject[]>([])
const buildPlans = ref<PlanWithBuild[]>([])
const catalogLoading = ref(false)
const pageSyncLoading = ref(false)
const pageSyncRequestCount = ref(0)
const catalogFailures = ref<number[]>([])
const lastSyncedAt = ref('')
const keyword = ref('')
const projectFilter = ref<number | 'all'>('all')
const buildabilityFilter = ref<BuildabilityFilter>('buildable')
const favoriteOnly = ref(false)
const favorites = ref<Set<string>>(new Set())
const viewMode = ref<ViewMode>('table')
const currentPage = ref(1)
const pageSize = ref<ZhaogangPlanPageSize>(15)
const detailVisible = ref(false)
const detailLoading = ref(false)
const planDetail = ref<ZhaogangPlanDetail | null>(null)
const detailK8sLoading = ref(false)
const detailK8sStatuses = ref<PlanK8sStatuses | null>(null)
let detailK8sRequestSequence = 0
const buildDialogVisible = ref(false)
const buildForm = ref({ environment: '', branch: '' })
const branchOptions = ref<ZhaogangBranch[]>([])
const branchLoading = ref(false)
const branchManuallySelected = ref(false)
const triggering = ref(false)
const replaceTokenVisible = ref(false)
const replacementToken = ref('')
const replacingToken = ref(false)
const replaceTokenError = ref('')
const copyingToken = ref(false)
const rotationPromptVisible = ref(false)
const permissionPrompt = ref<ZhaogangPermissionPromptDetail | null>(null)
const releaseCheck = ref<ZhaogangReleaseCheck | null>(null)
const releaseHistoryVisible = ref(false)
const agentSettingsSummary = ref<AgentSettingsSummary>({
  agent: '检测中',
  agentType: 'info',
  k8s: '检测中',
  k8sType: 'info',
  ai: '检测中',
  aiType: 'info'
})
provide('zhaogangSession', session)
provide('zhaogangPreferences', preferences)

const settingsNavigation: Array<{ key: SettingsSection; label: string }> = [
  { key: 'general', label: '通用设置' },
  { key: 'agent', label: '本机 Agent' },
  { key: 'agent-k8s', label: 'K8s Token' },
  { key: 'ai', label: 'AI Agent' },
  { key: 'local-data', label: '本地数据' }
]

const settingsSection = computed<SettingsSection>(() => {
  const section = typeof route.query.section === 'string' ? route.query.section : 'general'
  const normalized = section === 'agent-ai' ? 'ai' : section
  return settingsNavigation.some(item => item.key === normalized) ? normalized as SettingsSection : 'general'
})

const agentSettingsSection = computed<AgentSettingsSection>(() =>
  settingsSection.value === 'agent' || settingsSection.value === 'agent-k8s' || settingsSection.value === 'ai'
    ? settingsSection.value
    : null)

const settingsNavigationStatus = (section: SettingsSection) => {
  if (section === 'general') return '已连接'
  if (section === 'agent') return agentSettingsSummary.value.agent
  if (section === 'agent-k8s') return agentSettingsSummary.value.k8s
  if (section === 'ai') return agentSettingsSummary.value.ai
  return `${favorites.value.size} 项`
}

const settingsNavigationTagType = (section: SettingsSection): SettingsTagType => {
  if (section === 'agent') return agentSettingsSummary.value.agentType
  if (section === 'agent-k8s') return agentSettingsSummary.value.k8sType
  if (section === 'ai') return agentSettingsSummary.value.aiType
  return section === 'general' ? 'success' : 'info'
}

const changeSettingsSection = async (section: SettingsSection) => {
  const query = section === 'agent-k8s' && typeof route.query.environment === 'string'
    ? { section, environment: route.query.environment }
    : { section }
  await router.push({ path: '/zhaogang/settings', query })
}

const showPermissionPrompt = (event: Event) => {
  const incoming = (event as CustomEvent<ZhaogangPermissionPromptDetail>).detail
  if (!incoming) return
  permissionPrompt.value = {
    permissions: [...new Set([...(permissionPrompt.value?.permissions || []), ...incoming.permissions])],
    message: incoming.message
  }
}

const routeTab = (): TabKey => {
  const view = route.meta.zhaogangView
  return view === 'team' || view === 'iteration' || view === 'calendar' || view === 'worklog' || view === 'services' || view === 'settings'
    ? view
    : 'release'
}

const navigateTab = async (tab: TabKey) => {
  if (session.value?.tokenRotationRequired && tab !== 'settings') {
    rotationPromptVisible.value = true
    return
  }
  activeTab.value = tab
  const path = tab === 'release'
    ? '/zhaogang'
    : tab === 'team'
      ? '/zhaogang/teams'
    : tab === 'iteration'
      ? '/zhaogang/iterations'
      : tab === 'calendar'
        ? '/zhaogang/calendar'
      : tab === 'services'
        ? '/zhaogang/services'
      : `/zhaogang/${tab === 'worklog' ? 'worklogs' : 'settings'}`
  if (route.path !== path) await router.push(path)
}

const openTools = () => {
  const toolsTab = window.open(router.resolve('/tools').href, '_blank')
  if (toolsTab) toolsTab.opener = null
}

const openReleaseHistory = () => {
  releaseHistoryVisible.value = true
  if (!session.value || !releaseCheck.value || releaseCheck.value.receipt.read) return
  const userId = session.value.userId
  const releaseId = releaseCheck.value.currentRelease.id
  const optimisticReceipt = { read: true, readAt: new Date().toISOString() }
  releaseCheck.value = { ...releaseCheck.value, receipt: optimisticReceipt }
  void acknowledgeCurrentZhaogangRelease(userId, releaseId).then((receipt) => {
    if (session.value?.userId !== userId || releaseCheck.value?.currentRelease.id !== releaseId) return
    releaseCheck.value = { ...releaseCheck.value, receipt }
  })
}

const checkRelease = async () => {
  if (!session.value) return
  const result = await loadCurrentZhaogangRelease(session.value.userId)
  if (!session.value || !result) return
  releaseCheck.value = result
}

const handleReleaseStorage = (event: StorageEvent) => {
  if (event.key?.startsWith(zhaogangReleaseLocalPrefix) && session.value) void checkRelease()
}

const formattedLastSyncedAt = computed(() => {
  if (!lastSyncedAt.value) return '尚未同步'
  const date = new Date(lastSyncedAt.value)
  if (Number.isNaN(date.getTime())) return lastSyncedAt.value
  return date.toLocaleString('zh-CN', { hour12: false })
})
const syncStatusText = computed(() => pageSyncLoading.value
  ? '当前页缓存正在同步'
  : `当前页同步：${formattedLastSyncedAt.value}`)
const planKey = (plan: Pick<ZhaogangBuildPlan, 'projectId' | 'id'>) => planFavoriteKey(plan.projectId, plan.id)
const filteredPlans = computed(() => buildPlans.value.filter((plan) => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  const matchesKeyword = !normalizedKeyword || plan.name.toLowerCase().includes(normalizedKeyword)
  const matchesProject = projectFilter.value === 'all' || plan.projectId === projectFilter.value
  const matchesBuildability = buildabilityFilter.value === 'all'
    || (buildabilityFilter.value === 'buildable' ? plan.quickBuildSupported : !plan.quickBuildSupported)
  const matchesFavorite = !favoriteOnly.value || favorites.value.has(planKey(plan))
  return matchesKeyword && matchesProject && matchesBuildability && matchesFavorite
}))
const pagedPlans = computed(() => filteredPlans.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
const currentPageSignature = computed(() => pagedPlans.value.map(planKey).join(','))

watch([keyword, projectFilter, buildabilityFilter, favoriteOnly], () => { currentPage.value = 1 })
watch(projectFilter, (value) => {
  if (!session.value || !preferences.value.rememberProjectFilter) return
  preferences.value.projectFilterId = typeof value === 'number' ? value : null
  saveZhaogangPreferences(session.value.userId, preferences.value)
})
watch(filteredPlans, () => {
  const maximumPage = Math.max(1, Math.ceil(filteredPlans.value.length / pageSize.value))
  if (currentPage.value > maximumPage) currentPage.value = maximumPage
})

const openTokenCreation = () => window.open('https://g-iijw5014.coding.net/user/account/setting/tokens', '_blank', 'noopener')

const writeClipboardText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  let copied = false
  try {
    textarea.select()
    copied = document.execCommand('copy')
  } finally {
    textarea.remove()
  }
  if (!copied) throw new Error('当前浏览器不支持自动复制')
}

const copyBoundToken = async () => {
  copyingToken.value = true
  try {
    const { token } = await getZhaogangToken()
    await writeClipboardText(token)
    ElMessage.success('当前绑定令牌已复制')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '令牌复制失败')
  } finally {
    copyingToken.value = false
  }
}

const applyUserPreferences = (userId: number, applyDefaultTab = true) => {
  preferences.value = loadZhaogangPreferences(userId)
  const explicitTab = routeTab()
  if (explicitTab !== 'release') {
    activeTab.value = explicitTab
  } else if (applyDefaultTab) {
    activeTab.value = preferences.value.defaultTab
    if (preferences.value.defaultTab !== 'release') void navigateTab(preferences.value.defaultTab)
  }
  favoriteOnly.value = preferences.value.releaseTab === 'favorites'
  viewMode.value = preferences.value.planView
  pageSize.value = preferences.value.planPageSize
  projectFilter.value = preferences.value.rememberProjectFilter && preferences.value.projectFilterId
    ? preferences.value.projectFilterId
    : 'all'
}

const savePreferences = () => {
  if (!session.value) return
  saveZhaogangPreferences(session.value.userId, preferences.value)
}

const changeReleaseTab = (value: ZhaogangPreferences['releaseTab']) => {
  favoriteOnly.value = value === 'favorites'
  preferences.value.releaseTab = value
  savePreferences()
}

const changePlanView = (value: string | number | boolean | undefined) => {
  if (value !== 'table' && value !== 'card') return
  preferences.value.planView = value
  savePreferences()
}

const changePageSize = (value: number) => {
  if (!pageSizeOptions.includes(value as ZhaogangPlanPageSize)) return
  pageSize.value = value as ZhaogangPlanPageSize
  currentPage.value = 1
  preferences.value.planPageSize = pageSize.value
  savePreferences()
}

const planColumnWidth = (key: ZhaogangPlanTableColumnKey) => {
  const width = preferences.value.planTableColumnWidths[key]
  return typeof width === 'number' ? Math.max(planTableColumnMinimumWidths[key], width) : undefined
}

const cachePlanColumnWidth = (newWidth: number, _oldWidth: number, column: ResizedPlanTableColumn) => {
  const key = column.columnKey as ZhaogangPlanTableColumnKey | undefined
  if (!key || !(key in planTableColumnMinimumWidths)) return
  const width = Math.min(1600, Math.max(planTableColumnMinimumWidths[key], Math.round(newWidth)))
  preferences.value.planTableColumnWidths = { ...preferences.value.planTableColumnWidths, [key]: width }
  savePreferences()
}

const applyPlanViewPreference = () => {
  viewMode.value = preferences.value.planView
  savePreferences()
}

const changeRememberProjectFilter = () => {
  preferences.value.projectFilterId = preferences.value.rememberProjectFilter && typeof projectFilter.value === 'number'
    ? projectFilter.value
    : null
  savePreferences()
}

const resetPreferences = () => {
  if (!session.value) return
  preferences.value = resetZhaogangPreferences(session.value.userId)
  favoriteOnly.value = false
  viewMode.value = preferences.value.planView
  pageSize.value = preferences.value.planPageSize
  projectFilter.value = 'all'
  ElMessage.success('工作台设置已恢复默认')
}

const bindToken = async () => {
  bindError.value = ''
  binding.value = true
  try {
    session.value = await bindZhaogangToken(tokenInput.value)
    rotationPromptVisible.value = false
    permissionPrompt.value = null
    tokenInput.value = ''
    favorites.value = loadZhaogangFavorites(session.value.userId)
    applyUserPreferences(session.value.userId)
    ElMessage.success('CODING 令牌已绑定')
    void checkRelease()
    await loadCatalog()
  } catch (error) {
    bindError.value = error instanceof Error ? error.message : '令牌检查失败，请重新创建后再试'
  } finally {
    binding.value = false
  }
}

const restoreSession = async () => {
  sessionLoading.value = true
  try {
    session.value = await getZhaogangSession()
    rotationPromptVisible.value = session.value.tokenRotationRequired
    favorites.value = loadZhaogangFavorites(session.value.userId)
    applyUserPreferences(session.value.userId)
    void checkRelease()
    await loadCatalog()
  } catch {
    session.value = null
  } finally {
    sessionLoading.value = false
  }
}

const goToTokenRotation = async () => {
  rotationPromptVisible.value = false
  await navigateTab('settings')
  replaceTokenVisible.value = true
}

const resetPlanK8sStatus = () => {
  detailK8sRequestSequence += 1
  detailK8sLoading.value = false
  detailK8sStatuses.value = null
}

const disconnect = async () => {
  await clearZhaogangSession().catch(() => undefined)
  session.value = null
  releaseCheck.value = null
  releaseHistoryVisible.value = false
  rotationPromptVisible.value = false
  projects.value = []
  buildPlans.value = []
  lastSyncedAt.value = ''
  pageSyncRequestCount.value = 0
  pageSyncLoading.value = false
  planDetail.value = null
  detailVisible.value = false
  activeTab.value = 'release'
  if (route.path !== '/zhaogang') await router.replace('/zhaogang')
}

const clearReplacementToken = () => {
  replacementToken.value = ''
  replaceTokenError.value = ''
}

const replaceToken = async () => {
  replaceTokenError.value = ''
  replacingToken.value = true
  try {
    const nextSession = await bindZhaogangToken(replacementToken.value)
    session.value = nextSession
    rotationPromptVisible.value = false
    permissionPrompt.value = null
    favorites.value = loadZhaogangFavorites(nextSession.userId)
    applyUserPreferences(nextSession.userId, false)
    replaceTokenVisible.value = false
    void checkRelease()
    await loadCatalog()
    ElMessage.success('CODING 令牌已更换')
  } catch (error) {
    replaceTokenError.value = error instanceof Error ? error.message : '令牌检查失败，请重新创建后再试'
  } finally {
    replacingToken.value = false
  }
}

const clearFavorites = async () => {
  if (!session.value || !favorites.value.size) return
  try {
    await ElMessageBox.confirm('确定清空当前浏览器中的全部收藏计划吗？', '清空收藏', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    favorites.value = clearZhaogangFavorites(session.value.userId)
    ElMessage.success('收藏已清空')
  } catch {
    // 用户取消时保持原状。
  }
}

const loadCatalog = async () => {
  if (!session.value) return
  catalogLoading.value = true
  try {
    const catalog = await getZhaogangPlanCatalog()
    projects.value = catalog.projects
    buildPlans.value = catalog.plans.map((plan) => ({ ...plan }))
    catalogFailures.value = catalog.failedProjectIds
    lastSyncedAt.value = ''
    if (typeof projectFilter.value === 'number' && !projects.value.some((project) => project.id === projectFilter.value)) {
      projectFilter.value = 'all'
    }
    const projectId = Number(route.query.projectId)
    const jobId = Number(route.query.jobId)
    if (Number.isInteger(projectId) && Number.isInteger(jobId)) {
      const plan = buildPlans.value.find((item) => item.projectId === projectId && item.id === jobId)
      if (plan) {
        projectFilter.value = projectId
        await openPlan(plan)
      }
      await router.replace('/zhaogang')
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '构建计划加载失败')
  } finally {
    catalogLoading.value = false
  }
}

interface SyncCurrentPageOptions {
  force?: boolean
  notify?: boolean
  silent?: boolean
}

const syncCurrentPage = async ({ force = false, notify = false, silent = false }: SyncCurrentPageOptions = {}) => {
  if (!session.value || activeTab.value !== 'release') return
  const plans = pagedPlans.value.map((plan) => ({ projectId: plan.projectId, jobId: plan.id }))
  if (!plans.length) {
    lastSyncedAt.value = ''
    return
  }

  const requestedSignature = currentPageSignature.value
  const requestedUserId = session.value.userId
  pageSyncRequestCount.value += 1
  pageSyncLoading.value = true
  try {
    const result = await syncZhaogangPlanPage({ plans, force })
    const updates = new Map(result.plans.map((plan) => [planKey(plan), plan]))
    buildPlans.value = buildPlans.value.map((plan) => updates.get(planKey(plan)) || plan)
    if (session.value?.userId === requestedUserId && currentPageSignature.value === requestedSignature) {
      catalogFailures.value = result.failedProjectIds
      lastSyncedAt.value = result.lastSyncedAt
    }
    if (notify) ElMessage.success('当前页构建计划已同步')
  } catch (error) {
    if (!silent) ElMessage.error(error instanceof Error ? error.message : '当前页构建计划同步失败')
  } finally {
    pageSyncRequestCount.value = Math.max(0, pageSyncRequestCount.value - 1)
    pageSyncLoading.value = pageSyncRequestCount.value > 0
  }
}

const refreshCurrentPage = () => syncCurrentPage({ force: true, notify: true })

let pageSyncDebounceTimer: number | undefined
const scheduleCurrentPageSync = () => {
  window.clearTimeout(pageSyncDebounceTimer)
  if (!session.value || activeTab.value !== 'release' || !currentPageSignature.value) return
  pageSyncDebounceTimer = window.setTimeout(() => { void syncCurrentPage({ silent: true }) }, 250)
}

watch(currentPageSignature, (signature, previous) => {
  if (signature === previous) return
  lastSyncedAt.value = ''
  scheduleCurrentPageSync()
}, { flush: 'post' })
watch(activeTab, (tab) => {
  if (tab === 'release') scheduleCurrentPageSync()
})
watch(() => route.fullPath, () => {
  const target = routeTab()
  if (session.value?.tokenRotationRequired && target !== 'settings') {
    activeTab.value = 'settings'
    rotationPromptVisible.value = true
    void router.replace('/zhaogang/settings')
    return
  }
  activeTab.value = target
})

const isFavorite = (plan: ZhaogangBuildPlan) => favorites.value.has(planKey(plan))
const toggleFavorite = (plan: ZhaogangBuildPlan) => {
  if (!session.value) return
  favorites.value = toggleZhaogangFavorite(session.value.userId, planKey(plan))
}

const openPlan = async (plan: ZhaogangBuildPlan) => {
  detailVisible.value = true
  detailLoading.value = true
  planDetail.value = null
  resetPlanK8sStatus()
  try {
    planDetail.value = await getZhaogangPlanDetail(plan.projectId, plan.id)
    const listPlan = buildPlans.value.find((item) => item.projectId === plan.projectId && item.id === plan.id)
    if (listPlan && planDetail.value.builds[0]) listPlan.latestBuild = planDetail.value.builds[0]
    void refreshPlanK8sStatus()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '构建详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const refreshPlanK8sStatus = async () => {
  const currentPlan = planDetail.value?.plan
  if (!currentPlan) return
  const requestSequence = ++detailK8sRequestSequence
  detailK8sLoading.value = true
  try {
    const statuses = await queryPlanK8sStatuses(currentPlan.name)
    if (requestSequence === detailK8sRequestSequence && planDetail.value?.plan.projectId === currentPlan.projectId && planDetail.value.plan.id === currentPlan.id) {
      detailK8sStatuses.value = statuses
    }
  } catch (error) {
    if (requestSequence === detailK8sRequestSequence) {
      detailK8sStatuses.value = {
        deploymentName: null,
        statuses: Object.fromEntries(
          releaseK8sEnvironments.map((environment) => [environment, {
            state: 'QUERY_FAILED',
            environment,
            message: error instanceof Error ? error.message : 'K8s 查询失败'
          }])
        ) as Record<ZgK8sEnvironment, ReleaseK8sStatus>
      }
    }
  } finally {
    if (requestSequence === detailK8sRequestSequence) detailK8sLoading.value = false
  }
}

const openCoding = (plan: ZhaogangBuildPlan) => {
  window.open(`https://g-iijw5014.coding.net/p/${encodeURIComponent(plan.projectName)}/ci/job?id=${plan.id}`, '_blank', 'noopener')
}

const openK8sDashboard = (environment: ZgK8sEnvironment) => {
  const status = detailK8sStatuses.value?.statuses[environment]
  if (!status?.deployment) return
  const url = zhaogangK8sDashboardUrl(environment, status.deployment.namespace, status.deployment.name)
  window.open(url, '_blank', 'noopener,noreferrer')
}

const defaultBranchFor = (environment: string, plan: ZhaogangBuildPlan) => {
  const mapping: Record<string, string> = { sit: 'test', uat: 'uat', prd: 'master' }
  return mapping[environment.toLowerCase()] || plan.defaultBranch || 'master'
}

const openBuildDialog = async () => {
  if (!planDetail.value) return
  const environments = planDetail.value.plan.environments
  const environment = environments.find((item) => item.toLowerCase() === 'sit') || environments[0] || ''
  buildForm.value = { environment, branch: defaultBranchFor(environment, planDetail.value.plan) }
  branchManuallySelected.value = false
  branchOptions.value = []
  buildDialogVisible.value = true
  await searchBranches(buildForm.value.branch)
}

const changeEnvironment = async (environment: string) => {
  if (!planDetail.value || branchManuallySelected.value) return
  buildForm.value.branch = defaultBranchFor(environment, planDetail.value.plan)
  await searchBranches(buildForm.value.branch)
}

let branchSearchTimer: number | undefined
const searchBranches = async (keyword: string) => {
  if (!planDetail.value) return
  window.clearTimeout(branchSearchTimer)
  await new Promise<void>((resolve) => { branchSearchTimer = window.setTimeout(resolve, 220) })
  branchLoading.value = true
  try {
    branchOptions.value = await searchZhaogangBranches(planDetail.value.plan.projectId, planDetail.value.plan.id, keyword)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '分支查询失败')
  } finally {
    branchLoading.value = false
  }
}

const triggerBuild = async () => {
  if (!planDetail.value) return
  triggering.value = true
  try {
    const build = await triggerZhaogangBuild(planDetail.value.plan.projectId, planDetail.value.plan.id, buildForm.value)
    planDetail.value.builds.unshift(build)
    const listPlan = buildPlans.value.find((item) => item.projectId === planDetail.value?.plan.projectId && item.id === planDetail.value?.plan.id)
    if (listPlan) listPlan.latestBuild = build
    buildDialogVisible.value = false
    ElMessage.success('已触发 CODING 构建')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '构建触发失败')
  } finally {
    triggering.value = false
  }
}

const buildStatus = (status?: string) => {
  if (!status) return '暂无记录'
  const normalized = status.toUpperCase()
  if (normalized.includes('SUCCESS') || normalized.includes('SUCCEED')) return '构建成功'
  if (normalized.includes('RUN') || normalized.includes('QUEUE') || normalized.includes('INIT')) return '构建中'
  if (normalized.includes('ABORT') || normalized.includes('CANCEL') || normalized.includes('STOP')) return '已终止'
  if (normalized.includes('FAIL') || normalized.includes('ERROR')) return '构建失败'
  return status
}
const buildTagType = (status?: string): 'success' | 'warning' | 'danger' | 'info' => {
  const text = buildStatus(status)
  if (text === '构建成功') return 'success'
  if (text === '构建失败') return 'danger'
  if (text === '构建中') return 'warning'
  return 'info'
}
const buildBranch = (plan: PlanWithBuild) => [plan.latestBuild?.branch || plan.defaultBranch || '—', plan.latestBuild?.commit].filter(Boolean).join(' · ')

const deploymentStatus = (deployment: { podCount: number; replicas: number }) =>
  deployment.podCount === deployment.replicas ? '正常' : deployment.podCount < deployment.replicas ? '异常' : '启动中'

const k8sStatusText = (status?: ReleaseK8sStatus, loading = false) => {
  if (loading && (!status || status.state === 'QUERYING')) return '正在查询'
  if (status?.state === 'READY' && status.deployment) return deploymentStatus(status.deployment)
  return {
    NO_BUILD: '暂无最近构建',
    UNKNOWN_ENVIRONMENT: '无法识别构建环境',
    UNKNOWN_SERVICE: '无法识别服务',
    NOT_FOUND: '未找到对应服务',
    AGENT_OFFLINE: 'Agent 未启动',
    TOKEN_MISSING: '对应环境 Token 未配置',
    QUERYING: '正在查询',
    QUERY_FAILED: 'K8s 查询失败',
    READY: '正常'
  }[status?.state || 'QUERY_FAILED'] || 'K8s 查询失败'
}

const k8sStatusTagType = (status?: ReleaseK8sStatus, loading = false): 'success' | 'warning' | 'danger' | 'info' => {
  if (loading && (!status || status.state === 'QUERYING')) return 'warning'
  if (status?.state === 'READY' && status.deployment) {
    const value = deploymentStatus(status.deployment)
    return value === '正常' ? 'success' : value === '启动中' ? 'warning' : 'danger'
  }
  if (status?.state === 'QUERYING') return 'warning'
  if (status?.state === 'NO_BUILD' || status?.state === 'NOT_FOUND') return 'info'
  return 'danger'
}

const k8sPodsText = (status?: ReleaseK8sStatus) => status?.deployment ? `${status.deployment.podCount} / ${status.deployment.replicas}` : '—'

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const k8sCreatedAt = (status?: ReleaseK8sStatus) => formatDate(status?.deployment?.lastPodCreatedAt)

let catalogPollTimer: number | undefined
onMounted(() => {
  window.addEventListener(ZHAOGANG_PERMISSION_EVENT, showPermissionPrompt)
  window.addEventListener('storage', handleReleaseStorage)
  void restoreSession()
  catalogPollTimer = window.setInterval(() => {
    if (session.value && activeTab.value === 'release' && document.visibilityState === 'visible' && !pageSyncLoading.value) {
      void syncCurrentPage({ silent: true })
    }
  }, 60_000)
})
onBeforeUnmount(() => {
  window.removeEventListener(ZHAOGANG_PERMISSION_EVENT, showPermissionPrompt)
  window.removeEventListener('storage', handleReleaseStorage)
  window.clearInterval(catalogPollTimer)
  window.clearTimeout(pageSyncDebounceTimer)
  window.clearTimeout(branchSearchTimer)
})
</script>

<style scoped>
.zhaogang-page { min-height: 100vh; color: #233047; background: #f5f7fb; }
.page-header { display: flex; box-sizing: border-box; height: 68px; min-height: 68px; align-items: center; justify-content: space-between; padding: 0 32px; background: #fff; border-bottom: 1px solid #e7ebf2; }
.brand, .account-summary, .release-toolbar, .toolbar-left, .toolbar-right, .pagination-row, .drawer-heading, .build-row, .bind-actions { display: flex; align-items: center; }
.route-loading-state { display: flex; min-height: 300px; align-items: center; justify-content: center; gap: 10px; color: #718097; font-size: 14px; }.route-loading-icon { color: #2878ed; animation: route-loading-spin 1s linear infinite; } @keyframes route-loading-spin { to { transform: rotate(360deg); } }
.brand { gap: 12px; }.brand-mark { display: grid; width: 38px; height: 38px; place-items: center; color: #fff; background: linear-gradient(135deg, #276de9, #5e94f1); border-radius: 11px; font-size: 13px; font-weight: 700; }.brand h1 { margin: 0; font-size: 19px; }.brand p { margin: 3px 0 0; color: #8490a4; font-size: 12px; }.account-summary { gap: 9px; color: #526078; font-size: 14px; }.header-release-tag { position: relative; display: inline-flex; height: 28px; align-items: center; padding: 0 10px; color: #31527e; background: #f1f5fb; border: 1px solid #d8e3f2; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; white-space: nowrap; }.header-release-tag:hover { color: #2468e8; border-color: #9bbcf7; background: #edf3ff; }.header-release-tag:focus-visible { outline: 2px solid #7aa7f5; outline-offset: 2px; }.header-release-tag__dot { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; background: #f04444; border: 2px solid #fff; border-radius: 50%; }
.loading-shell, .onboarding-shell { width: min(1480px, calc(100% - 48px)); margin: 0 auto; }.loading-shell { padding: 80px 25%; }.onboarding-shell { padding: 74px 0; }.onboarding-copy { width: min(100%, 660px); margin: 0 auto 32px; text-align: center; }.onboarding-copy h2 { margin: 13px 0 10px; overflow-wrap: anywhere; font-size: 32px; }.onboarding-copy p { margin: 0; color: #748198; line-height: 1.7; }
.steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }.step-card { position: relative; min-height: 184px; padding: 22px; background: #fff; border: 1px solid #e5eaf2; border-radius: 14px; box-shadow: 0 8px 22px rgba(43, 67, 105, .04); }.step-card > span { display: grid; width: 27px; height: 27px; place-items: center; color: #2468e8; background: #eaf1ff; border-radius: 50%; font-size: 13px; font-weight: 700; }.step-card h3 { margin: 16px 0 7px; }.step-card p { color: #718097; font-size: 13px; line-height: 1.6; }.permission-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }.permission-list :deep(.el-tag) { height: auto; padding: 4px 7px; font-size: 11px; white-space: normal; }
.bind-card { max-width: 780px; margin: 24px auto 0; border-color: #e5eaf2; }.bind-card-title strong, .bind-card-title small { display: block; }.bind-card-title small { margin-top: 5px; color: #8490a4; }.bind-actions { justify-content: space-between; gap: 12px; margin-top: 14px; }.bind-error { color: #dc4c4c; font-size: 13px; }
.workspace-shell { display: grid; box-sizing: border-box; width: 100%; height: calc(100vh - 68px); min-height: 0; margin: 0; overflow: hidden; grid-template-columns: 112px minmax(0, 1fr); background: #fff; border-right: 1px solid #e7ebf2; border-left: 1px solid #e7ebf2; transition: grid-template-columns .2s ease; }.workspace-nav { display: flex; min-height: 0; flex-direction: column; padding: 17px 12px; overflow-y: auto; background: #fff; border-right: 1px solid #e7ebf2; transition: padding .2s ease; }.workspace-nav-collapse { display: flex; height: 30px; align-items: center; justify-content: center; padding: 0 3px; margin-bottom: 8px; }.workspace-nav button { display: flex; width: 100%; align-items: center; gap: 9px; padding: 11px 12px; margin-bottom: 5px; color: #66748a; background: transparent; border: 0; border-radius: 8px; cursor: pointer; text-align: left; }.workspace-nav button > .el-icon { flex: 0 0 auto; font-size: 16px; }.workspace-nav button.active { color: #2468e8; background: #edf3ff; }.workspace-nav .workspace-nav-toggle { width: 30px; height: 30px; justify-content: center; gap: 0; padding: 0; margin: 0; color: #8490a4; background: transparent; border: 0; border-radius: 7px; }.workspace-nav .workspace-nav-toggle > .el-icon { font-size: 17px; }.workspace-nav .workspace-nav-toggle:hover { color: #2468e8; background: #edf3ff; }.workspace-nav .workspace-nav-tools { margin-top: auto; margin-bottom: 0; }.workspace-content { box-sizing: border-box; min-width: 0; min-height: 0; padding: 27px; overflow-y: auto; background: #f8faff; }.workspace-content.workspace-content--release { display: flex; flex-direction: column; padding: 0; overflow: hidden; }.workspace-content.workspace-content--iteration-detail { overflow: hidden; }
.release-toolbar { flex: 0 0 auto; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 11px; background: #fff; border: 1px solid #e5eaf2; border-bottom: 0; border-radius: 12px 12px 0 0; }.toolbar-left { gap: 6px; flex-wrap: wrap; }.toolbar-right { justify-content: flex-end; gap: 12px; flex-wrap: wrap; margin-left: auto; }.sync-time { color: #8490a4; font-size: 12px; white-space: nowrap; }.sync-time.is-syncing { color: #2468e8; }.service-search { width: 230px; }.project-filter { width: 150px; }.buildability-filter { width: 120px; }.partial-alert { flex: 0 0 auto; margin: 0; }.plan-list-viewport { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; background: #fff; }.plan-table { width: 100%; height: 100%; border: 1px solid #e5eaf2; border-radius: 0; }.plan-list-empty { height: 100%; margin: 0; border: 1px solid #e5eaf2; }.plan-name { display: grid; gap: 4px; }.plan-name strong { color: #26344a; font-weight: 600; }.plan-name small { color: #8b96a7; }.favorite-button { padding: 0; color: #e5a126; font-size: 20px; }.pagination-row { box-sizing: border-box; flex: 0 0 auto; justify-content: space-between; min-height: 64px; padding: 12px 16px; color: #7b879a; background: #f8faff; border-top: 1px solid #e5eaf2; font-size: 13px; }
.plan-cards { display: grid; box-sizing: border-box; height: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); align-content: start; gap: 12px; padding: 14px; overflow-y: auto; background: #fff; border: 1px solid #e5eaf2; border-radius: 0; }.plan-card { min-width: 0; padding: 16px; color: inherit; text-align: left; background: #fbfcff; border: 1px solid #e8edf5; border-radius: 10px; cursor: pointer; }.plan-card:hover { border-color: #9bbcf7; box-shadow: 0 8px 16px rgba(53, 96, 173, .09); }.plan-card > div { display: flex; justify-content: space-between; gap: 8px; }.plan-card > .build-status-cell { display: block; }.plan-card strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.card-star { color: #e5a126; font-size: 18px; }.plan-card small { display: block; margin: 7px 0 14px; color: #8b96a7; }.plan-card .build-status-cell small { margin: 4px 0 0; }.plan-card p { margin: 13px 0 0; color: #6e7c92; font-size: 12px; }
.settings-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }.settings-section { min-width: 0; padding: 20px; background: #fff; border: 1px solid #e4e9f1; border-radius: 8px; }.token-rotation-alert { margin-bottom: 16px; }.rotation-prompt-copy { margin: 0; color: #4f5e74; line-height: 1.7; }.settings-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #edf0f5; }.settings-heading h3 { margin: 0; font-size: 17px; }.settings-heading p { margin: 6px 0 0; color: #7d899c; font-size: 13px; line-height: 1.5; }.connection-profile { display: flex; align-items: center; gap: 12px; padding: 18px 0 14px; }.connection-profile strong, .connection-profile span { display: block; }.connection-profile span { margin-top: 4px; color: #8490a4; font-size: 13px; }.connection-details { margin: 0 0 18px; }.connection-details > div { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 11px 0; border-bottom: 1px solid #edf0f5; }.connection-details dt { color: #7c899c; font-size: 13px; }.connection-details dd { min-width: 0; margin: 0; color: #344158; font-weight: 600; text-align: right; }.connection-details code { display: inline-block; max-width: 100%; padding: 4px 7px; overflow: hidden; color: #31527e; background: #f1f5fb; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-overflow: ellipsis; vertical-align: middle; white-space: nowrap; }.settings-actions { display: flex; gap: 9px; flex-wrap: wrap; }.preferences-form { padding-top: 18px; }.preferences-form :deep(.el-form-item) { padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid #edf0f5; }.preferences-form :deep(.el-form-item__label) { color: #4f5e74; }.local-data-section { grid-column: 1 / -1; }.local-data-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-top: 17px; }.local-data-row strong, .local-data-row span { display: block; }.local-data-row span { margin-top: 5px; color: #8490a4; font-size: 13px; }
.settings-center { display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 12px; }
.settings-nav { position: sticky; z-index: 3; top: -1px; display: flex; gap: 5px; padding: 7px; overflow-x: auto; background: #fff; border: 1px solid #e4e9f1; border-radius: 8px; scrollbar-width: thin; }
.settings-nav button { display: flex; min-width: 140px; min-height: 44px; flex: 1 0 140px; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; color: #5f6e83; background: transparent; border: 0; border-radius: 6px; cursor: pointer; font: inherit; font-size: 13px; text-align: left; }
.settings-nav button:hover { color: #2468e8; background: #f5f8ff; }
.settings-nav button.active { color: #2468e8; background: #edf3ff; font-weight: 600; }
.settings-nav button > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.settings-nav :deep(.el-tag) { flex: 0 0 auto; max-width: 76px; }
.settings-content-panel { min-width: 0; }
.drawer-heading { justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 18px; border-bottom: 1px solid #e8edf4; }.drawer-heading > div:first-child { min-width: 0; }.drawer-heading h2 { max-width: 430px; margin: 0; overflow-wrap: anywhere; color: #233047; font-size: 20px; }.drawer-heading p { margin: 7px 0 0; color: #8290a5; font-size: 13px; }.drawer-heading-side { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: 14px; }.drawer-heading-actions, .drawer-build-action { display: flex; align-items: center; }.drawer-heading-actions { gap: 4px; }.drawer-build-action { gap: 8px; }.drawer-icon-button { width: 36px; height: 36px; margin: 0; font-size: 20px; }.drawer-favorite-button { color: #8793a6; }.drawer-favorite-button.active { color: #e5a126; }.service-status-section { margin: 20px 0 24px; }.service-status-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; }.service-status-heading h3 { margin: 0; }.service-status-table { overflow: hidden; border: 1px solid #e7ebf2; border-radius: 9px; }.service-status-row { display: grid; grid-template-columns: 90px 100px 190px minmax(180px, 1fr) 55px; gap: 12px; min-height: 52px; align-items: center; padding: 8px 13px; border-bottom: 1px solid #e8edf4; }.service-status-row:last-child { border-bottom: 0; }.service-status-row--header { min-height: 38px; color: #8490a4; background: #f8faff; font-size: 12px; }.service-status-row > span, .service-status-row > strong { min-width: 0; }.service-status-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.build-history { overflow: hidden; border: 1px solid #e7ebf2; border-radius: 9px; }.build-row { display: grid; grid-template-columns: 150px minmax(165px, 1fr) minmax(190px, 1.1fr); gap: 12px; align-items: center; padding: 13px; border-bottom: 1px solid #e8edf4; }.build-row > div { min-width: 0; }.build-row:last-child { border-bottom: 0; }.build-primary, .build-secondary, .build-status-cell small { display: block; }.build-primary, .build-secondary { overflow-wrap: anywhere; font-size: 14px; line-height: 1.4; }.build-primary { color: #233047; }.build-secondary { margin-top: 4px; color: #8a96a8; }.build-status-cell { min-width: 0; }.build-status-cell small { margin-top: 4px; color: #8a96a8; font-size: 12px; line-height: 1.4; white-space: normal; }.drawer-loading { padding: 10px; }.dialog-plan-name { margin: -8px 0 19px; color: #8390a4; font-size: 13px; }.dialog-control { width: 100%; }
@media (min-width: 901px) { .workspace-shell--nav-collapsed { grid-template-columns: 64px minmax(0, 1fr); }.workspace-shell--nav-collapsed .workspace-nav { padding-right: 8px; padding-left: 8px; }.workspace-shell--nav-collapsed .workspace-nav-collapse { justify-content: center; padding-right: 0; padding-left: 0; }.workspace-shell--nav-collapsed .workspace-nav-label { display: none; }.workspace-shell--nav-collapsed .workspace-nav button:not(.workspace-nav-toggle) { justify-content: center; gap: 0; padding-right: 0; padding-left: 0; } }
@media (max-width: 900px) { .steps-grid, .plan-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }.workspace-shell { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }.workspace-nav { flex-direction: row; gap: 7px; padding: 10px 14px; overflow-x: auto; overflow-y: hidden; border-right: 0; border-bottom: 1px solid #e7ebf2; }.workspace-nav-collapse { display: none; }.workspace-nav button { width: auto; margin: 0; white-space: nowrap; }.workspace-nav .workspace-nav-tools { margin-left: auto; }.settings-layout { grid-template-columns: 1fr; }.local-data-section { grid-column: auto; } }
@media (max-width: 640px) { .page-header { padding: 0 16px; }.account-summary > span:not(.el-tag), .account-summary :deep(.el-button) { display: none; }.loading-shell, .workspace-shell { width: 100%; }.onboarding-shell { width: calc(100% - 32px); padding: 38px 16px; }.steps-grid, .plan-cards { grid-template-columns: 1fr; }.workspace-content { padding: 17px 12px; }.content-heading { align-items: flex-start; }.content-heading h2 { font-size: 21px; }.release-toolbar { align-items: stretch; }.toolbar-left, .toolbar-right { width: 100%; }.toolbar-right { justify-content: flex-start; margin-left: 0; }.service-search { flex: 1; min-width: 160px; width: auto; }.project-filter, .buildability-filter { flex: 1; min-width: 120px; width: auto; }.pagination-row { align-items: flex-start; flex-direction: column; gap: 10px; }.build-row { grid-template-columns: 1fr; gap: 6px; }.service-status-heading { align-items: stretch; flex-direction: column; gap: 8px; }.service-status-row { grid-template-columns: 72px 84px minmax(120px, 1fr) 42px; gap: 8px; padding: 8px 9px; }.service-status-row > span:nth-child(4), .service-status-row--header > span:nth-child(4) { display: none; }.service-status-row > span:last-child { text-align: center; }.local-data-row { align-items: flex-start; flex-direction: column; gap: 7px; }.settings-section { padding: 16px; }.preferences-form :deep(.el-form-item) { display: block; }.preferences-form :deep(.el-form-item__label) { width: 100% !important; justify-content: flex-start; }.preferences-form :deep(.el-form-item__content) { margin-left: 0 !important; } }
@media (max-width: 900px) {
  .settings-nav button { min-width: 136px; flex-basis: 136px; }
  .settings-layout { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .settings-nav button { min-width: 126px; min-height: 40px; flex-basis: 126px; padding: 7px 9px; }
  .settings-layout { grid-template-columns: 1fr; }
}
.service-status-row { grid-template-columns: 30px 40px 180px 150px 50px; justify-content: space-between; column-gap: 0; }
.service-status-row:not(.service-status-row--header) { font-size: 14px; }
.service-status-value { font-size: 14px; }
.service-status-value :deep(.el-tag) { font-size: 14px; }
@media (max-width: 640px) { .service-status-row { grid-template-columns: 40px 50px minmax(120px, 1fr) 40px; justify-content: initial; column-gap: 8px; } }
</style>
