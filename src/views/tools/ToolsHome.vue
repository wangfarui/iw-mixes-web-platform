<template>
  <main class="tools-home-page">
    <section class="tools-hero">
      <div class="hero-orb hero-orb-left" aria-hidden="true"></div>
      <div class="hero-orb hero-orb-right" aria-hidden="true"></div>
      <div class="tools-home-shell hero-content">
        <header class="tools-home-header">
          <div class="header-copy">
            <span class="header-kicker">IW TOOLS</span>
            <h1>工具箱 <span aria-hidden="true">✦</span></h1>
            <p>本地优先工具集合，按分类快速查找；工具内容默认不上传。</p>
          </div>
          <el-button class="return-button" @click="returnToManagementPlatform">
            <el-icon><Back /></el-icon>
            返回管理平台
          </el-button>
        </header>

        <section class="tool-filter" aria-label="工具搜索和分类">
          <el-input
            v-model="searchKeyword"
            class="tool-search"
            clearable
            :prefix-icon="Search"
            placeholder="搜索工具名称、场景、标签或关键字"
            size="large"
          />
          <div class="category-filter" role="tablist" aria-label="工具分类">
            <button
              class="category-filter-button"
              :class="{ active: activeCategory === 'all' }"
              type="button"
              role="tab"
              :aria-selected="activeCategory === 'all'"
              @click="activeCategory = 'all'"
            >
              全部 <span>{{ toolCatalog.length }}</span>
            </button>
            <button
              v-for="summary in visibleCategorySummaries"
              :key="summary.category.key"
              class="category-filter-button"
              :class="{ active: activeCategory === summary.category.key }"
              type="button"
              role="tab"
              :aria-selected="activeCategory === summary.category.key"
              @click="activeCategory = summary.category.key"
            >
              {{ summary.category.title }} <span>{{ summary.count }}</span>
            </button>
          </div>
        </section>
      </div>
    </section>

    <section class="tools-home-shell tools-content">
      <div class="tools-dashboard">
        <aside class="overview-column" aria-label="工具使用概览">
          <section class="overview-card">
            <div class="overview-title-row">
              <h2>工具使用次数</h2>
              <span class="overview-icon"><el-icon><DataAnalysis /></el-icon></span>
            </div>
            <el-skeleton v-if="statsLoading" :rows="2" animated class="overview-skeleton" />
            <template v-else>
              <strong class="overview-count">{{ statsUnavailable ? '—' : formatCount(summary?.totalUsageCount ?? 0) }}</strong>
              <p class="overview-today">
                <span aria-hidden="true">↑</span>
                {{ statsUnavailable ? '统计服务暂不可用' : `今日 ${formatCount(summary?.todayUsageCount ?? 0)} 次使用` }}
              </p>
            </template>
          </section>

          <section class="new-tools-card" aria-label="新工具上架">
            <div class="new-tools-heading">
              <h2>新工具上架</h2>
              <span>最近上线</span>
            </div>
            <ol>
              <li v-for="tool in newestTools" :key="tool.toolKey">
                <button type="button" @click="router.push(tool.routePath)">
                  <span class="new-tool-icon"><el-icon :size="17"><component :is="tool.icon" /></el-icon></span>
                  <span>{{ tool.menuTitle }}</span>
                  <small>{{ getToolCategoryTitle(tool) }}</small>
                </button>
              </li>
            </ol>
          </section>
        </aside>

        <section class="catalog-column" aria-label="工具列表">
          <el-empty
            v-if="!filteredTools.length"
            class="empty-state"
            description="没有匹配的工具"
          >
            <el-button type="primary" @click="clearFilters">查看全部工具</el-button>
          </el-empty>

          <div v-else class="tool-grid">
            <button
              v-for="tool in filteredTools"
              :key="tool.toolKey"
              class="tool-card"
              data-testid="tool-card"
              :data-tool-path="tool.routePath"
              type="button"
              @click="router.push(tool.routePath)"
            >
              <span class="tool-icon">
                <el-icon :size="23"><component :is="tool.icon" /></el-icon>
              </span>
              <div class="tool-card-copy">
                <div class="tool-card-title-row">
                  <h3>{{ tool.title }}</h3>
                  <span class="tool-category">{{ getToolCategoryTitle(tool) }}</span>
                </div>
                <p>{{ tool.description }}</p>
                <div class="tool-card-footer">
                  <span class="tool-tag">{{ tool.tags[0] }}</span>
                  <span class="tool-usage">
                    <el-icon><TrendCharts /></el-icon>
                    <el-skeleton v-if="statsLoading" class="usage-skeleton" animated />
                    <template v-else>{{ statsUnavailable ? '—' : formatCount(usageCountFor(tool.toolKey)) }}</template>
                  </span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <aside class="popular-column" aria-label="热门工具排行">
          <section class="popular-card">
            <div class="popular-heading">
              <h2>热门工具</h2>
              <span class="popular-fire" aria-label="最近三十天排行">♨</span>
            </div>
            <p v-if="!statsLoading && !statsUnavailable" class="popular-period">近 {{ summary?.rankingPeriodDays ?? 30 }} 天使用次数</p>

            <el-skeleton v-if="statsLoading" :rows="8" animated />
            <el-empty
              v-else-if="statsUnavailable"
              class="popular-empty"
              description="暂无法加载排行"
              :image-size="72"
            />
            <el-empty
              v-else-if="!popularTools.length"
              class="popular-empty"
              description="暂无使用数据"
              :image-size="72"
            />
            <ol v-else class="popular-list">
              <li v-for="(item, index) in popularTools" :key="item.tool.toolKey">
                <button type="button" @click="router.push(item.tool.routePath)">
                  <span class="rank" :class="{ featured: index < 3 }">{{ index + 1 }}</span>
                  <span class="popular-tool-icon"><el-icon :size="20"><component :is="item.tool.icon" /></el-icon></span>
                  <span class="popular-copy">
                    <strong>{{ item.tool.menuTitle }}</strong>
                    <small>{{ getToolCategoryTitle(item.tool) }}</small>
                  </span>
                  <span class="popular-count">{{ formatCount(item.stat.periodUsageCount) }}</span>
                </button>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Back, DataAnalysis, Search, TrendCharts } from '@element-plus/icons-vue'
import { getToolUsageSummary } from '@/api/toolUsage'
import {
  toolCatalog,
  toolCategories,
  type ToolCatalogItem,
  type ToolCategoryItem,
  type ToolCategoryKey
} from '@/router/toolCatalog'
import type { ToolUsageStat, ToolUsageSummary } from '@/types/toolUsage'

type CategoryFilter = ToolCategoryKey | 'all'

interface CategorySummary {
  category: ToolCategoryItem
  count: number
}

interface PopularTool {
  tool: ToolCatalogItem
  stat: ToolUsageStat
}

const router = useRouter()
const searchKeyword = ref('')
const activeCategory = ref<CategoryFilter>('all')
const summary = ref<ToolUsageSummary | null>(null)
const statsLoading = ref(true)
const statsUnavailable = ref(false)

const categoryMap = new Map(toolCategories.map((category) => [category.key, category]))
const toolByKey = new Map(toolCatalog.map((tool) => [tool.toolKey, tool]))

const visibleCategorySummaries = computed<CategorySummary[]>(() => toolCategories
  .map((category) => ({
    category,
    count: toolCatalog.filter((tool) => tool.category === category.key).length
  }))
  .filter((item) => item.count > 0))

const newestTools = computed(() => [...toolCatalog]
  .sort((left, right) => right.releasedAt.localeCompare(left.releasedAt))
  .slice(0, 10))

const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase())

const filteredTools = computed(() => toolCatalog.filter((tool) => {
  const matchesCategory = activeCategory.value === 'all' || tool.category === activeCategory.value
  if (!matchesCategory || !normalizedKeyword.value) {
    return matchesCategory
  }
  const searchableText = [
    tool.title,
    tool.menuTitle,
    tool.routeName,
    tool.description,
    ...tool.scenarios,
    ...tool.tags,
    ...tool.keywords,
    getToolCategoryTitle(tool)
  ].join(' ').toLowerCase()
  return searchableText.includes(normalizedKeyword.value)
}))

const usageCountByToolKey = computed(() => new Map(
  (summary.value?.toolStats ?? []).map((item) => [item.toolKey, item.totalUsageCount])
))

const popularTools = computed<PopularTool[]>(() => (summary.value?.popularTools ?? [])
  .map((stat) => {
    const tool = toolByKey.get(stat.toolKey)
    return tool ? { tool, stat } : null
  })
  .filter((item): item is PopularTool => item !== null))

const getToolCategory = (tool: ToolCatalogItem): ToolCategoryItem | undefined => categoryMap.get(tool.category)
const getToolCategoryTitle = (tool: ToolCatalogItem): string => getToolCategory(tool)?.title || '未分类'
const usageCountFor = (toolKey: string): number => usageCountByToolKey.value.get(toolKey) ?? 0

const formatCount = (value: number): string => new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1
}).format(value)

const clearFilters = () => {
  searchKeyword.value = ''
  activeCategory.value = 'all'
}

const returnToManagementPlatform = () => router.push('/')

const loadSummary = async () => {
  statsLoading.value = true
  statsUnavailable.value = false
  try {
    summary.value = await getToolUsageSummary()
  } catch {
    statsUnavailable.value = true
  } finally {
    statsLoading.value = false
  }
}

onMounted(() => {
  void loadSummary()
})
</script>

<style scoped>
.tools-home-page { min-height: 100vh; color: #17233d; background: #f5f8ff; }
.tools-home-shell { width: min(1480px, calc(100% - 48px)); margin: 0 auto; }
.tools-hero { position: relative; overflow: hidden; padding: 28px 0 34px; background: linear-gradient(135deg, #dceaff 0%, #edf4ff 55%, #d9e8ff 100%); }
.hero-orb { position: absolute; border: 1px solid rgba(255, 255, 255, .72); border-radius: 26px; background: rgba(255, 255, 255, .28); box-shadow: 0 18px 30px rgba(76, 121, 184, .12); transform: rotate(18deg); }
.hero-orb-left { width: 142px; height: 142px; top: -52px; left: 7%; }
.hero-orb-right { width: 112px; height: 112px; right: 8%; top: 10px; }
.hero-content { position: relative; z-index: 1; }
.tools-home-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.header-kicker, .section-kicker { display: block; color: #4b7de8; font-size: 12px; font-weight: 800; letter-spacing: .12em; }
.tools-home-header h1 { margin: 7px 0 0; font-size: 38px; line-height: 1.15; letter-spacing: -.04em; }
.tools-home-header h1 span { color: #f5a500; font-size: .72em; }
.tools-home-header p { margin: 10px 0 0; color: #657797; font-size: 15px; }
.return-button { color: #355378; border-color: rgba(100, 135, 184, .36); background: rgba(255, 255, 255, .68); }
.tool-filter { display: grid; grid-template-columns: minmax(300px, 1fr) auto; gap: 18px; align-items: center; margin-top: 28px; padding: 10px; background: rgba(255, 255, 255, .84); border: 1px solid rgba(255, 255, 255, .92); border-radius: 18px; box-shadow: 0 14px 30px rgba(44, 80, 136, .1); }
.tool-search :deep(.el-input__wrapper) { min-height: 46px; padding-inline: 15px; border-radius: 12px; box-shadow: none; }
.category-filter { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.category-filter-button { min-height: 38px; padding: 0 12px; color: #536784; font: inherit; font-size: 14px; font-weight: 650; background: transparent; border: 0; border-radius: 9px; cursor: pointer; }
.category-filter-button span { margin-left: 3px; opacity: .64; font-size: 12px; }
.category-filter-button:hover, .category-filter-button:focus-visible { color: #1f66e5; background: #edf4ff; outline: none; }
.category-filter-button.active { color: #fff; background: #2468eb; box-shadow: 0 6px 12px rgba(36, 104, 235, .24); }
.tools-content { padding: 30px 0 48px; }
.tools-dashboard { display: grid; grid-template-columns: 240px minmax(0, 1fr) 278px; gap: 22px; align-items: start; }
.overview-column, .popular-column { position: sticky; top: 18px; }
.overview-card, .new-tools-card, .catalog-column, .popular-card { background: #fff; border: 1px solid #edf0f7; border-radius: 16px; box-shadow: 0 10px 28px rgba(37, 70, 124, .055); }
.overview-card { padding: 22px; }
.overview-title-row, .popular-heading, .catalog-heading, .tool-card-title-row, .tool-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.overview-title-row h2, .popular-heading h2, .catalog-heading h2 { margin: 5px 0 0; font-size: 20px; letter-spacing: -.02em; }
.overview-icon { display: grid; width: 36px; height: 36px; place-items: center; color: #2872f0; background: #eaf2ff; border-radius: 10px; }
.overview-count { display: block; margin-top: 30px; color: #1e68ee; font-size: 43px; line-height: 1; letter-spacing: -.06em; }
.overview-today { margin: 15px 0 0; color: #7b8ca8; font-size: 13px; font-weight: 600; }
.overview-today span { margin-right: 4px; color: #10b981; font-size: 18px; vertical-align: -1px; }
.overview-skeleton { margin-top: 26px; }
.new-tools-card { margin-top: 14px; padding: 18px 14px 12px; }
.new-tools-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 5px 10px; }
.new-tools-heading h2 { margin: 0; color: #253754; font-size: 16px; }
.new-tools-heading span { color: #94a0b4; font-size: 11px; }
.new-tools-card ol { display: grid; padding: 0; margin: 0; gap: 3px; list-style: none; }
.new-tools-card button { display: flex; width: 100%; align-items: center; gap: 8px; padding: 7px 5px; color: #41516a; font: inherit; font-size: 12px; font-weight: 650; text-align: left; background: transparent; border: 0; border-radius: 8px; cursor: pointer; }
.new-tools-card button:hover, .new-tools-card button:focus-visible { background: #f4f8ff; outline: none; }
.new-tool-icon { display: grid; flex: 0 0 27px; height: 27px; place-items: center; color: #3675e7; background: #edf4ff; border-radius: 8px; }
.new-tools-card button > span:nth-child(2) { overflow: hidden; flex: 1; text-overflow: ellipsis; white-space: nowrap; }
.new-tools-card small { color: #4b87e9; font-size: 11px; font-weight: 600; }
.catalog-column { min-height: 620px; padding: 24px; }
.tool-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px; }
.tool-card { position: relative; display: flex; min-width: 0; min-height: 142px; padding: 16px; gap: 12px; color: inherit; text-align: left; background: #fff; border: 1px solid #edf0f6; border-radius: 12px; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.tool-card:hover, .tool-card:focus-visible { border-color: #8eb6ff; outline: none; box-shadow: 0 11px 20px rgba(46, 103, 199, .13); transform: translateY(-2px); }
.tool-icon { display: grid; flex: 0 0 42px; height: 42px; place-items: center; color: #276ce8; background: linear-gradient(145deg, #edf5ff, #dbeaff); border-radius: 11px; }
.tool-card-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.tool-card h3 { overflow: hidden; margin: 0; color: #253754; font-size: 15px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.tool-category { flex: none; padding: 3px 6px; color: #4b87e9; font-size: 11px; background: #eff6ff; border-radius: 5px; }
.tool-card p { display: -webkit-box; overflow: hidden; margin: 6px 0 0; color: #8490a4; font-size: 12px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.tool-card-footer { margin-top: auto; padding-top: 10px; }
.tool-tag { max-width: 95px; overflow: hidden; padding: 3px 6px; color: #31a673; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; background: #edfaf4; border-radius: 5px; }
.tool-usage { display: inline-flex; align-items: center; gap: 3px; color: #f28b36; font-size: 12px; font-weight: 650; }
.usage-skeleton { width: 25px; }
.empty-state { padding: 80px 0; }
.popular-card { padding: 21px 17px; }
.popular-fire { color: #ff7a23; font-size: 25px; }
.popular-period { margin: 5px 0 15px; color: #94a0b4; font-size: 12px; }
.popular-list { display: grid; padding: 0; margin: 5px 0 0; gap: 4px; list-style: none; }
.popular-list button { display: flex; width: 100%; align-items: center; gap: 8px; padding: 8px 3px; color: inherit; text-align: left; background: transparent; border: 0; border-radius: 9px; cursor: pointer; }
.popular-list button:hover, .popular-list button:focus-visible { background: #f4f8ff; outline: none; }
.rank { display: grid; flex: 0 0 21px; height: 21px; place-items: center; color: #8b99ac; font-size: 11px; font-weight: 800; background: #edf1f7; border-radius: 6px; }
.rank.featured { color: #fff; background: linear-gradient(135deg, #ffac00, #ff7b20); }
.popular-tool-icon { display: grid; flex: 0 0 31px; height: 31px; place-items: center; color: #3675e7; background: #edf4ff; border-radius: 8px; }
.popular-copy { display: grid; min-width: 0; flex: 1; gap: 2px; }
.popular-copy strong { overflow: hidden; color: #35445e; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.popular-copy small { color: #77a3ef; font-size: 11px; }
.popular-count { color: #f28632; font-size: 12px; font-weight: 700; }
.popular-empty { min-height: 190px; }
@media (max-width: 1260px) { .tools-dashboard { grid-template-columns: 218px minmax(0, 1fr); } .popular-column { grid-column: 1 / -1; position: static; } .popular-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 940px) { .tool-filter { grid-template-columns: 1fr; } .category-filter { justify-content: flex-start; } .tools-dashboard { grid-template-columns: 1fr; } .overview-column { position: static; display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; } .new-tools-card { margin-top: 0; } .tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .tools-home-shell { width: min(100% - 28px, 1480px); } .tools-hero { padding-top: 22px; } .tools-home-header { flex-direction: column; } .tools-home-header h1 { font-size: 31px; } .return-button { align-self: stretch; } .tool-filter { gap: 10px; } .category-filter { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; } .category-filter-button { flex: 0 0 auto; } .tools-content { padding-top: 18px; } .overview-column { display: block; } .new-tools-card { margin-top: 12px; } .catalog-column { padding: 17px; } .tool-grid, .popular-list { grid-template-columns: 1fr; } .tool-card { min-height: 126px; } .popular-column { position: static; } }
</style>
