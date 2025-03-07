
export type AccountListData =  {
    id: number,
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
    name?: string,
    address?: string,
}

export type AccountAddDto = {
    name?: string,
    address?: string,
    account?: string,
    password?: string,
    remark?: string
}

export type AccountUpdateDto = AccountAddDto & {
    id?: number
}

