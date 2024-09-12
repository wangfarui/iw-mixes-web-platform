
export type DictListData =  {
    id: number,
    dictType: number,
    dictCode?: number,
    dictName: string,
    dictStatus?: number,
}

export type DictPageDto = {
    currentPage: number,
    pageSize: number,
    dictType?: number,
    dictCode?: number,
    dictName?: string,
    dictStatus?: number
}

export type DictAddDto = {
    parentId: number,
    dictType?: number,
    dictCode?: number,
    dictName?: string,
    sort?: number,
    dictStatus?: number
}

export type DictUpdateDto = DictAddDto & {
    id: number
}

export type DictDetailVo = {
    id: number,
    parentId: number,
    dictType: number,
    dictCode?: number,
    dictName: string,
    dictStatus?: number,
    sort?: number
}