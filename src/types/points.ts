export type PageDto = {
    currentPage: number,
    pageSize: number
}

export type PointsRecordsPageDto = PageDto & {
    source?: string,
    transactionType?: number,
    createStartTime?: string,
    createEndTime?: string
}

export type PointsRecordsPageVo = {
    id: number,
    transactionType: number,
    points: number,
    source: string,
    remark?: string,
    createTime: string
}

export type PageVo<T> = {
    size: number,
    current: number,
    total: number,
    records: Array<T>
}

export type PointsRecordsPage = PageVo<PointsRecordsPageVo>

