import { readFile } from 'node:fs/promises'

import { getLauncherPaths } from './constants.mjs'

export const resolveConfigPath = (args = process.argv.slice(2)) => {
  const configFlagIndex = args.indexOf('--config')
  if (configFlagIndex >= 0 && args[configFlagIndex + 1]) {
    return args[configFlagIndex + 1]
  }
  return getLauncherPaths().configPath
}

export const readLauncherConfig = async (configPath = resolveConfigPath()) => {
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  if (!config.token || typeof config.token !== 'string') {
    throw new Error('启动器配置缺少配对令牌')
  }
  return config
}
