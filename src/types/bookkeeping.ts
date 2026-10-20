
export type BookkeepingListData =  {
    id: number,
    recordTime: string,
    recordCategory?: number,
    recordSource: string,
    amount?: number,
    recordTypeId?: number | null,
    recordTypeName?: string | null,
    dictionarySnapshotStatus?: number,
    recordTagSnapshots?: Array<{ id: number, type: number, name: string }>,
}

export type BookkeepingPageDto = {
    currentPage: number,
    pageSize: number,
    recordStartDate?: string,
    recordEndDate?: string,
    recordSource?: string,
    categoryNames?: string[],
    categoryState?: 'UNCATEGORIZED' | 'PENDING',
    tagNames?: string[],
    recordCategory?: number
}

export type BookkeepingAddDto = {
    recordDate?: string,
    recordCategory: 1 | 2,
    recordSource?: string,
    amount: number,
    recordTypeId?: number | null,
    recordTags?: number[],
    remark?: string,
    isStatistics?: number,
    shared?: number,
    expenseUserId?: number,
}

export type BookkeepingUpdateDto = Omit<BookkeepingAddDto, 'recordTypeId' | 'recordTags'> & {
    id: number,
    dictionaryChanges?: { categoryId?: number | null, tagIds?: number[] },
}

export type BookkeepingDetailVo = BookkeepingListData & {
    remark?: string,
    recordDate?: string,
}

export type BookkeepingFilterOptions = { categories: Array<{ name: string }>, expenseTags: Array<{ name: string }>, incomeTags: Array<{ name: string }> }
