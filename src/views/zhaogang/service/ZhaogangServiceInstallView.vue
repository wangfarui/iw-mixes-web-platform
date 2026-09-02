<template>
  <section class="install-page">
    <header class="install-header">
      <div>
        <p class="eyebrow">zg-k8s-agent</p>
        <h2>Agent 使用教程</h2>
        <p class="intro">安装本机 Agent 后，工作台才能从你的办公网络查询 K8s Pod。</p>
      </div>
      <el-button :icon="Back" @click="backToService">返回服务</el-button>
    </header>

    <el-tabs v-model="activeSystem" type="border-card" class="system-tabs">
      <el-tab-pane name="windows">
        <template #label><span class="tab-label">Windows</span></template>
        <el-tabs v-model="activeGuide" type="card" class="guide-tabs">
          <el-tab-pane label="安装教程" name="install">
            <div class="guide-panel">
              <div class="guide-title-row">
                <div><h3>Windows 安装</h3><p>适用于 Windows x64 和 Windows ARM64。</p></div>
                <el-button type="primary" :icon="Download" @click="downloadAgent('windows')">下载 Windows Agent</el-button>
              </div>
              <ol class="step-list">
                <li><strong>下载程序</strong><span>点击右上角下载按钮，工作台会根据当前 Windows 架构自动选择 EXE。</span></li>
                <li><strong>安装并启动 Agent</strong><span>双击下载的 <code>zg-k8s-agent-windows-*.exe</code> 安装程序。Agent 会安装到 <code>%LOCALAPPDATA%\\zg-k8s-agent</code> 并在后台启动，安装完成后可以删除下载文件。</span></li>
                <li><strong>处理安全提示</strong><span>如果 Windows SmartScreen 显示“未知发布者”，点击“更多信息 → 仍要运行”。这是未购买 Windows 代码签名证书时的正常提示。</span></li>
                <li><strong>回到服务页面</strong><span>回到工作台“服务”页面，页面会自动检测并显示 Agent 在线状态。</span></li>
                <li><strong>配置 Dashboard Token</strong><span>在工作台“服务”页面选择 test、uat 或 prd 环境，粘贴对应的 K8s Dashboard Token 并保存。Token 按环境保存到当前工作台账号，Agent 只在本机内存中使用。</span></li>
                <li><strong>设置开机自启</strong><span>在服务页点击“设置开机自启”。安装程序已注册 <code>zg-k8s-agent://</code> 协议；开机自启配置会指向安装目录中的 Agent。</span></li>
              </ol>
              <el-alert type="warning" :closable="false" show-icon title="Windows 防火墙提示" description="首次运行如果出现防火墙提示，仅允许专用网络访问即可；Agent 只监听 127.0.0.1，不接受局域网远程访问。" />
            </div>
          </el-tab-pane>
          <el-tab-pane label="卸载教程" name="uninstall">
            <div class="guide-panel compact-panel">
              <div class="guide-title-row"><div><h3>Windows 卸载</h3><p>卸载会停止 Agent、删除开机自启和协议注册。</p></div></div>
              <ol class="step-list">
                <li><strong>退出 Agent</strong><span>在任务管理器中找到 <code>zg-k8s-agent.exe</code> 并结束任务。</span></li>
                <li><strong>运行卸载程序</strong><span>打开安装目录 <code>%LOCALAPPDATA%\\zg-k8s-agent</code>，双击其中的 <code>uninstall.exe</code>；也可以在“设置 → 应用 → 已安装的应用”中找到 zg-k8s-agent 并卸载。</span></li>
                <li><strong>确认卸载结果</strong><span>卸载程序会删除 Agent、安装目录、开机自启项和 <code>zg-k8s-agent://</code> 协议注册。</span></li>
              </ol>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>

      <el-tab-pane name="macos">
        <template #label><span class="tab-label">macOS</span></template>
        <el-tabs v-model="activeGuide" type="card" class="guide-tabs">
          <el-tab-pane label="安装教程" name="install">
            <div class="guide-panel">
              <div class="guide-title-row">
                <div><h3>macOS 安装</h3><p>Apple Silicon 选择 arm64，Intel Mac 选择 amd64。</p></div>
                <el-button type="primary" :icon="Download" @click="downloadAgent('macos')">下载 macOS Agent</el-button>
              </div>
              <ol class="step-list">
                <li><strong>下载压缩包</strong><span>点击右上角下载按钮，工作台会自动选择 Apple Silicon 或 Intel 版本。</span></li>
                <li><strong>解压文件</strong><span>双击下载的 <code>zg-k8s-agent-darwin-*.zip</code>，得到 Agent 文件、<code>install-macos.sh</code> 和 <code>uninstall-macos.sh</code>。</span></li>
                <li><strong>执行安装脚本</strong><span>打开“终端”，进入解压目录并执行：</span><pre>chmod +x install-macos.sh zg-k8s-agent
./install-macos.sh</pre></li>
                <li><strong>处理 macOS 安全提示</strong><span>如果系统提示无法验证开发者，请在“系统设置 → 隐私与安全性”中允许，或在终端执行：</span><pre>xattr -dr com.apple.quarantine ~/Applications/zg-k8s-agent.app</pre></li>
                <li><strong>回到服务页面</strong><span>页面会自动检测 Agent 在线状态，确认在线后，在需要使用的环境中配置 K8s Dashboard Token。</span></li>
                <li><strong>设置开机自启</strong><span>在服务页点击“设置开机自启”。之后每次开机 Agent 会自动在后台启动。</span></li>
              </ol>
            </div>
          </el-tab-pane>
          <el-tab-pane label="卸载教程" name="uninstall">
            <div class="guide-panel compact-panel">
              <div class="guide-title-row"><div><h3>macOS 卸载</h3><p>卸载会停止 Agent、删除应用包和开机自启配置。</p></div></div>
              <ol class="step-list">
                <li><strong>停止 Agent</strong><span>打开“终端”执行：</span><pre>pkill -f zg-k8s-agent</pre></li>
                <li><strong>运行卸载脚本</strong><span>在解压后的 ZIP 目录执行：</span><pre>chmod +x uninstall-macos.sh
./uninstall-macos.sh</pre></li>
                <li><strong>确认卸载结果</strong><span>脚本会删除 <code>~/Applications/zg-k8s-agent.app</code> 和对应的开机自启配置。</span></li>
              </ol>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
    </el-tabs>

    <section class="help-section">
      <h3>连接不上时检查</h3>
      <div class="help-grid">
        <div><strong>Agent 未检测到</strong><span>确认程序仍在运行，并检查端口输入是否为 28731。</span></div>
        <div><strong>Token 连接失败</strong><span>确认使用的是 K8s Dashboard Token，而不是 CODING Token。</span></div>
        <div><strong>Pod 查询失败</strong><span>确认当前电脑已连接公司内网，并且 Token 具备 Dashboard 只读权限。</span></div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Back, Download } from '@element-plus/icons-vue'
import { resolveZgK8sAgentDownloadUrl, type ZgK8sAgentSystem } from '@/services/zgK8sAgentClient'

const router = useRouter()
const activeSystem = ref<'windows' | 'macos'>(navigator.userAgent.toLowerCase().includes('mac') ? 'macos' : 'windows')
const activeGuide = ref<'install' | 'uninstall'>('install')

const backToService = () => router.push('/zhaogang/services')
const downloadAgent = async (system: ZgK8sAgentSystem) => {
  const url = await resolveZgK8sAgentDownloadUrl(system)
  const link = document.createElement('a')
  link.href = url
  if (!url.endsWith('/index.html')) link.download = ''
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
</script>

<style scoped>
.install-page { display: flex; min-height: 100%; flex-direction: column; gap: 18px; }
.install-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.eyebrow { margin: 0 0 6px; color: #2878ed; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.install-header h2 { margin: 0; color: #26344a; font-size: 26px; }
.intro { margin: 8px 0 0; color: #7c899c; font-size: 13px; }
.step-list code { padding: 2px 5px; color: #31527e; background: #f1f5fb; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; }
.system-tabs { border: 0; box-shadow: none; }.system-tabs :deep(.el-tabs__content) { padding: 22px; background: #fff; border: 1px solid #e3e9f2; border-top: 0; }.tab-label { min-width: 90px; text-align: center; }
.guide-tabs :deep(.el-tabs__content) { padding: 20px 0 0; }.compact-panel { min-height: 300px; }
.guide-panel { display: flex; flex-direction: column; gap: 20px; }.guide-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }.guide-title-row h3, .help-section h3 { margin: 0; color: #26344a; font-size: 19px; }.guide-title-row p { margin: 6px 0 0; color: #8490a4; font-size: 13px; }
.step-list { display: grid; gap: 14px; padding-left: 24px; margin: 0; }.step-list li { padding-left: 7px; color: #344158; line-height: 1.6; }.step-list li::marker { color: #2878ed; font-weight: 700; }.step-list strong, .step-list span { display: block; }.step-list strong { margin-bottom: 3px; }.step-list span { color: #718097; font-size: 13px; }.step-list pre { padding: 11px 13px; margin: 9px 0 0; overflow-x: auto; color: #dbeafe; background: #1f2937; border-radius: 6px; font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.help-section { padding: 20px 22px; background: #fff; border: 1px solid #e3e9f2; }.help-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 15px; }.help-grid div { display: grid; gap: 5px; padding: 14px; background: #f8faff; border: 1px solid #e7edf6; border-radius: 6px; }.help-grid span { color: #718097; font-size: 13px; line-height: 1.5; }
@media (max-width: 720px) { .install-header, .guide-title-row { flex-direction: column; }.guide-title-row .el-button { align-self: flex-start; }.system-tabs :deep(.el-tabs__item) { padding: 0 12px; }.help-grid { grid-template-columns: 1fr; } }
</style>
