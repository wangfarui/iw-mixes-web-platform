export type AccountListData =  {
    id: number,
    type: string,
    name?: string,
    address?: string,
    account?: string,
    password?: string,
    remark?: string,
    updateTime?: string
}

export type AccountPageDto = {
    currentPage: number,
    pageSize: number,
    type?: any,
    name?: string,
    address?: string,
}

export type AccountAddDto = {
    type?: string,
    name?: string,
    address?: string,
    account?: string,
    password?: string,
    remark?: string,
    updatePassword?: boolean
}

export type AccountUpdateDto = AccountAddDto & {
    id?: number
}

