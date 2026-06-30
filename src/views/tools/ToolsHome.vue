<template>
  <main class="tools-home-page">
    <section class="tools-home-shell">
      <header class="tools-home-header">
        <div class="header-copy">
          <span class="header-kicker">IW Tools</span>
          <h1>工具箱</h1>
          <p>本地优先工具集合，默认不需要登录，打开后即可直接使用。</p>
        </div>
        <el-button type="primary" @click="openFirstTool">
          <el-icon><ArrowRight /></el-icon>
          打开常用工具
        </el-button>
      </header>

      <section class="tool-grid" aria-label="工具列表">
        <button
          v-for="tool in toolCatalog"
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
            <span class="tool-state">可用</span>
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
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { toolCatalog } from '@/router/toolCatalog'

const router = useRouter()

const openFirstTool = () => {
  const [firstTool] = toolCatalog
  if (firstTool) {
    router.push(firstTool.routePath)
  }
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

@media (max-width: 720px) {
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

  .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>
