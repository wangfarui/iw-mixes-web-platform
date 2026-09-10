<template>
  <section class="agent-guide-page">
    <header class="guide-header">
      <div>
        <p class="guide-kicker">zg-workbench-agent</p>
        <h2>Agent 使用教程</h2>
        <p>安装本机 Agent 后，工作台可以从当前电脑访问 K8s Dashboard 和内网 AI。</p>
      </div>
      <el-button :icon="Back" @click="backToSettings">返回设置</el-button>
    </header>

    <el-tabs v-model="activeSystem" class="system-tabs">
      <el-tab-pane label="Windows" name="windows">
        <el-tabs v-model="activeGuide" class="guide-tabs">
          <el-tab-pane label="安装与升级" name="install">
            <div class="guide-title-row">
              <div><h3>Windows 安装</h3><p>适用于 Windows x64 和 Windows ARM64，安装过程不需要管理员权限。</p></div>
              <el-button type="primary" :icon="Download" :loading="downloading" @click="downloadAgent('windows')">下载 Windows 安装程序</el-button>
            </div>
            <ol class="step-list">
              <li><strong>下载安装程序</strong><span>工作台会根据当前 Windows 架构选择安装程序；从其它系统打开时默认下载 x64 版本。</span></li>
              <li><strong>运行安装</strong><span>双击 <code>zg-workbench-agent-windows-*.exe</code>。程序安装到 <code>%LOCALAPPDATA%\zg-workbench-agent</code> 并自动启动。</span></li>
              <li><strong>处理安全提示</strong><span>如果 SmartScreen 显示未知发布者，选择“更多信息”后确认运行。</span></li>
              <li><strong>完成旧版迁移</strong><span>检测到 zg-k8s-agent 时会迁移配置、开机自启和协议；新 Agent 健康后再清理旧安装。</span></li>
              <li><strong>返回设置验证</strong><span>在设置页刷新 Agent 状态，然后配置 K8s Token 或 AI 连接。</span></li>
            </ol>
            <el-alert type="info" :closable="false" show-icon title="Agent 只监听 127.0.0.1，首次出现防火墙提示时仅需允许专用网络访问。" />
          </el-tab-pane>
          <el-tab-pane label="卸载" name="uninstall">
            <div class="guide-title-row"><div><h3>Windows 卸载</h3><p>卸载会清理新旧协议、启动项和当前用户安装目录。</p></div></div>
            <ol class="step-list">
              <li><strong>打开已安装的应用</strong><span>在 Windows 设置中找到 zg-workbench-agent。</span></li>
              <li><strong>执行卸载</strong><span>选择卸载；也可以运行安装目录中的 <code>uninstall.exe</code>。</span></li>
              <li><strong>确认状态</strong><span>回到工作台设置页刷新状态，确认 Agent 已停止。</span></li>
            </ol>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>

      <el-tab-pane label="macOS" name="macos">
        <el-tabs v-model="activeGuide" class="guide-tabs">
          <el-tab-pane label="安装与升级" name="install">
            <div class="guide-title-row">
              <div><h3>macOS 安装</h3><p>Apple Silicon 使用 arm64，Intel Mac 使用 amd64。</p></div>
              <el-button type="primary" :icon="Download" :loading="downloading" @click="downloadAgent('macos')">下载 macOS 安装包</el-button>
            </div>
            <ol class="step-list">
              <li><strong>下载并解压 ZIP</strong><span>压缩包包含 Agent、安装脚本和卸载脚本。</span></li>
              <li><strong>赋予执行权限</strong><span>在解压目录打开终端并执行：</span><pre>chmod +x install-macos.sh zg-workbench-agent</pre></li>
              <li><strong>执行安装</strong><span>运行安装脚本，应用将安装到 <code>~/Applications/zg-workbench-agent.app</code>。</span><pre>./install-macos.sh</pre></li>
              <li><strong>处理安全提示</strong><span>系统阻止运行时，在“隐私与安全性”中允许，或移除下载隔离标记：</span><pre>xattr -dr com.apple.quarantine ~/Applications/zg-workbench-agent.app</pre></li>
              <li><strong>完成旧版迁移</strong><span>安装脚本会迁移旧配置和开机自启状态，并兼容新旧 URL Scheme。</span></li>
            </ol>
          </el-tab-pane>
          <el-tab-pane label="卸载" name="uninstall">
            <div class="guide-title-row"><div><h3>macOS 卸载</h3><p>使用下载包中的脚本停止 Agent 并清理应用与 LaunchAgent。</p></div></div>
            <ol class="step-list">
              <li><strong>进入解压目录</strong><span>确认目录中存在 <code>uninstall-macos.sh</code>。</span></li>
              <li><strong>执行卸载脚本</strong><pre>chmod +x uninstall-macos.sh
./uninstall-macos.sh</pre></li>
              <li><strong>确认状态</strong><span>回到工作台设置页刷新状态，确认 Agent 已停止。</span></li>
            </ol>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
    </el-tabs>

    <section class="troubleshooting-section">
      <h3>连接不上时检查</h3>
      <dl>
        <div><dt>Agent 未检测到</dt><dd>确认程序正在运行，并检查设置页端口是否为 28731。</dd></div>
        <div><dt>K8s Token 失败</dt><dd>确认使用 K8s Dashboard Token，并且电脑已连接公司内网。</dd></div>
        <div><dt>AI 连接失败</dt><dd>确认 AI URL、模型和 Key 正确；内网地址需要选择 LOCAL_AGENT。</dd></div>
      </dl>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Download } from '@element-plus/icons-vue'
import { resolveZgWorkbenchAgentDownloadUrl, type ZgWorkbenchAgentSystem } from '@/services/zgWorkbenchAgentClient'

const router = useRouter()
const activeSystem = ref<ZgWorkbenchAgentSystem>(navigator.userAgent.toLowerCase().includes('mac') ? 'macos' : 'windows')
const activeGuide = ref<'install' | 'uninstall'>('install')
const downloading = ref(false)

const backToSettings = () => router.push({ path: '/zhaogang/settings', query: { section: 'agent' } })
const downloadAgent = async (system: ZgWorkbenchAgentSystem) => {
  downloading.value = true
  try {
    const url = await resolveZgWorkbenchAgentDownloadUrl(system)
    if (url.endsWith('/index.html')) {
      window.open(url, '_blank', 'noopener')
      return
    }
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Agent 下载地址获取失败')
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.agent-guide-page { display: flex; min-height: 100%; flex-direction: column; gap: 18px; }
.guide-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid #e3e9f2; }
.guide-kicker { margin: 0 0 6px; color: #2878ed; font-size: 12px; font-weight: 700; }
.guide-header h2 { margin: 0; color: #26344a; font-size: 25px; }
.guide-header p:not(.guide-kicker) { margin: 8px 0 0; color: #718097; font-size: 13px; line-height: 1.6; }
.system-tabs { min-width: 0; padding: 0 20px 20px; background: #fff; border: 1px solid #e3e9f2; }
.system-tabs :deep(.el-tabs__header) { margin-bottom: 0; }
.system-tabs :deep(.el-tabs__item) { min-width: 100px; }
.guide-tabs { padding-top: 8px; }
.guide-tabs :deep(.el-tabs__content) { padding-top: 18px; }
.guide-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.guide-title-row h3, .troubleshooting-section h3 { margin: 0; color: #26344a; font-size: 18px; }
.guide-title-row p { margin: 6px 0 0; color: #8490a4; font-size: 13px; line-height: 1.5; }
.step-list { display: grid; gap: 14px; padding-left: 24px; margin: 20px 0; }
.step-list li { padding-left: 6px; color: #344158; line-height: 1.6; }
.step-list li::marker { color: #2878ed; font-weight: 700; }
.step-list strong, .step-list span { display: block; }
.step-list span { margin-top: 3px; color: #718097; font-size: 13px; }
.step-list code { padding: 2px 5px; color: #31527e; background: #f1f5fb; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; }
.step-list pre { padding: 11px 13px; margin: 9px 0 0; overflow-x: auto; color: #dbeafe; background: #1f2937; border-radius: 6px; font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.troubleshooting-section { padding: 20px; background: #fff; border: 1px solid #e3e9f2; }
.troubleshooting-section dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 15px 0 0; }
.troubleshooting-section dl > div { min-width: 0; padding: 14px; background: #f8faff; border: 1px solid #e7edf6; border-radius: 6px; }
.troubleshooting-section dt { color: #344158; font-weight: 600; }
.troubleshooting-section dd { margin: 5px 0 0; color: #718097; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
@media (max-width: 720px) {
  .guide-header, .guide-title-row { flex-direction: column; }
  .guide-title-row .el-button { align-self: flex-start; }
  .system-tabs { padding-right: 14px; padding-left: 14px; }
  .troubleshooting-section dl { grid-template-columns: 1fr; }
}
</style>
