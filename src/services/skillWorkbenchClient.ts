import type {
  SkillAgentStatus,
  SkillDirectoryListing,
  SkillScanJob,
  SkillSource,
} from "../types/skillWorkbench";
export const createSkillWorkbenchClient = (port: number, token: string) => {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("本机端口无效");
  const request = async <T>(
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> => {
    const response = await fetch(`http://127.0.0.1:${port}/v1${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "X-IW-Launcher-Token": token.trim(),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal || AbortSignal.timeout(8000),
    });
    const data = await response.json();
    if (
      response.status === 404 &&
      ["/skills/choose-directory", "/skills/directories"].includes(path)
    )
      throw new Error("本机助手版本较旧，请重新执行安装命令升级后再选择目录");
    if (!response.ok)
      throw new Error(data.message || `本机助手请求失败（${response.status}）`);
    return data as T;
  };
  return {
    status: () => request<SkillAgentStatus>("/status"),
    discover: () => request<{ sources: SkillSource[] }>("/skills/discover"),
    scan: (sources: SkillSource[]) =>
      request<{ id: string }>("/skills/scan", { sources }),
    job: (id: string) => request<SkillScanJob>(`/skills/jobs/${id}`),
    cancel: (id: string) => request(`/skills/jobs/${id}/cancel`, {}),
    changes: () =>
      request<{
        revision: number;
        watchActive: boolean;
        watchedPaths: string[];
      }>("/skills/changes"),
    open: (id: string, path: string) => request("/skills/open", { id, path }),
    directories: (path = "", showHidden = false) =>
      request<SkillDirectoryListing>("/skills/directories", {
        path,
        showHidden,
      }),
    chooseDirectory: () =>
      request<{ cancelled: boolean; path: string }>(
        "/skills/choose-directory",
        {},
        AbortSignal.timeout(310000),
      ),
    clear: () => request("/skills/clear", {}),
  };
};
