<template>
  <main class="tools-home-page">
    <section class="tools-home-shell">
      <header class="tools-home-header">
        <div class="header-copy">
          <span class="header-kicker">IW Tools</span>
          <h1>工具箱</h1>
          <p>本地优先工具集合，默认不需要登录，打开后即可直接使用。</p>
        </div>
        <el-button type="primary" @click="returnToManagementPlatform">
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
            全部
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
            {{ summary.category.title }}
          </button>
        </div>
      </section>

      <el-empty
        v-if="!filteredTools.length"
        class="empty-state"
        description="没有匹配的工具"
      >
        <el-button type="primary" @click="clearFilters">查看全部工具</el-button>
      </el-empty>

      <section v-else class="tool-grid" aria-label="工具列表">
        <button
          v-for="tool in filteredTools"
          :key="tool.routePath"
          class="tool-card"
          data-testid="tool-card"
          :data-tool-path="tool.routePath"
          type="button"
          @click="router.push(tool.routePath)"
        >
          <div class="tool-card-head">
            <span class="tool-icon">
              <el-icon :size="24"><component :is="tool.icon" /></el-icon>
            </span>
            <span class="tool-state">{{ getToolCategoryTitle(tool) }}</span>
          </div>
          <h2>{{ tool.title }}</h2>
          <p>{{ tool.description }}</p>
          <div class="tool-tags">
            <el-tag
              v-for="tag in tool.tags"
              :key="tag"
              size="small"
              effect="plain"
              type="success"
            >
              {{ tag }}
            </el-tag>
          </div>
          <span class="tool-entry">
            进入工具
            <el-icon><ArrowRight /></el-icon>
          </span>
        </button>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Back, Search } from '@element-plus/icons-vue'
import {
  toolCatalog,
  toolCategories,
  type ToolCatalogItem,
  type ToolCategoryItem,
  type ToolCategoryKey
} from '@/router/toolCatalog'

type CategoryFilter = ToolCategoryKey | 'all'

interface CategorySummary {
  category: ToolCategoryItem
  count: number
}

const router = useRouter()
const searchKeyword = ref('')
const activeCategory = ref<CategoryFilter>('all')

const categoryMap = new Map(toolCategories.map((category) => [category.key, category]))

const visibleCategorySummaries = computed<CategorySummary[]>(() => {
  return toolCategories
    .map((category) => ({
      category,
      count: toolCatalog.filter((tool) => tool.category === category.key).length
    }))
    .filter((summary) => summary.count > 0)
})

const normalizedKeyword = computed(() => searchKeyword.value.trim().toLowerCase())

const getToolCategory = (tool: ToolCatalogItem): ToolCategoryItem | undefined => {
  return categoryMap.get(tool.category)
}

const getToolCategoryTitle = (tool: ToolCatalogItem): string => {
  return getToolCategory(tool)?.title || '未分类'
}

const matchesKeyword = (tool: ToolCatalogItem): boolean => {
  const keyword = normalizedKeyword.value
  if (!keyword) {
    return true
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

  return searchableText.includes(keyword)
}

const filteredTools = computed(() => {
  return toolCatalog.filter((tool) => {
    const matchesCategory = activeCategory.value === 'all' || tool.category === activeCategory.value
    return matchesCategory && matchesKeyword(tool)
  })
})

const clearFilters = () => {
  searchKeyword.value = ''
  activeCategory.value = 'all'
}

const returnToManagementPlatform = () => {
  router.push('/')
}
</script>

<style scoped>
.tools-home-page {
  min-height: 100vh;
  background: #f6f8fb;
  color: #1f2937;
}

.tools-home-shell {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0;
}

.tools-home-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 0 24px;
  border-bottom: 1px solid #dfe5ee;
}

.header-copy {
  min-width: 0;
}

.header-kicker {
  display: inline-flex;
  margin-bottom: 10px;
  color: #316f52;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.tools-home-header h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
}

.tools-home-header p {
  margin: 10px 0 0;
  color: #5b6472;
  font-size: 15px;
  line-height: 1.7;
}

.tool-filter {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding-top: 18px;
}

.tool-search {
  min-width: 0;
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.category-filter-button {
  min-height: 34px;
  padding: 0 12px;
  color: #334155;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  cursor: pointer;
}

.category-filter-button:hover,
.category-filter-button:focus-visible {
  border-color: #409eff;
  outline: none;
}

.category-filter-button.active {
  color: #ffffff;
  background: #1f7a55;
  border-color: #1f7a55;
}

.empty-state {
  margin-top: 24px;
  padding: 40px 0;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  padding-top: 24px;
}

.tool-card {
  display: flex;
  min-height: 236px;
  padding: 22px;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  text-align: left;
  color: inherit;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.06);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.tool-card:hover,
.tool-card:focus-visible {
  border-color: #409eff;
  box-shadow: 0 14px 30px rgba(31, 41, 55, 0.1);
  transform: translateY(-2px);
  outline: none;
}

.tool-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tool-icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  color: #1f7a55;
  background: #eaf7f1;
  border: 1px solid #c9ebdc;
  border-radius: 8px;
}

.tool-state {
  color: #409eff;
  font-size: 13px;
  font-weight: 600;
}

.tool-card h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: 0;
}

.tool-card p {
  margin: 0;
  flex: 1;
  color: #5b6472;
  font-size: 14px;
  line-height: 1.7;
}

.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #1f7a55;
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 760px) {
  .tools-home-shell {
    width: min(100% - 28px, 1120px);
    padding: 24px 0;
  }

  .tools-home-header {
    align-items: stretch;
    flex-direction: column;
  }

  .tools-home-header h1 {
    font-size: 28px;
  }

  .tool-filter {
    grid-template-columns: 1fr;
  }

  .category-filter {
    justify-content: flex-start;
  }

  .category-filter-button {
    flex: 1 1 84px;
  }

  .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>
