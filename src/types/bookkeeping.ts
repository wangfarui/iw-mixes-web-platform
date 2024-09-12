
export type BookkeepingListData =  {
    id: number,
    recordTime: string,
    recordCategory?: number,
    recordSource: string,
    amount?: number,
}

export type BookkeepingPageDto = {
    currentPage: number,
    pageSize: number,
    recordStartDate?: Date,
    recordEndDate?: Date
}

export type BookkeepingAddDto = {
    mealDate: Date,
    mealTime?: number,
    diners?: number,
    remark?: string,
    mealMenuList?: Array<BookkeepingMenuAddDto>
}

export type BookkeepingMenuAddDto = {
    dishesId: number,
    dishesName: string
}

export type BookkeepingUpdateDto = BookkeepingAddDto & {
    id: number
}

export type BookkeepingDetailVo = {
    id: number,
    mealDate: Date,
    mealTimeStr?: number,
    diners?: number,
    remark?: string,
    mealMenuList?: Array<BookkeepingMenuDetailVo>
}

export type BookkeepingMenuDetailVo = {
    id: number,
    dishesId: number,
    dishesName: string
}