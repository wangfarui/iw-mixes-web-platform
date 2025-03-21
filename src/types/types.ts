export type UserLoginVO = {
    account?: string
    password?: string
    phoneNumber?: string
    verificationCode?: string
}

export type UserInfoVo = {
    name: string
}

export type UserPasswordEditDto = {
    verificationCode: string,
    oldPassword: string
    newPassword: string
    twoPassword: string
}

// 任务清单相关类型
export interface TaskGroup {
  id: string;
  name: string;
  icon?: string;
  count?: number;
  sort?: number;
  isTop?: number;
}

export interface Task {
  id: string;
  name: string;
  completed: boolean;
  notes?: string;
  groupId: string;
}

export interface TaskGroupWithTasks extends TaskGroup {
  tasks: Task[];
}
