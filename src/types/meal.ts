
export type MealListData =  {
    id: number,
    mealDate: string,
    mealTime?: number,
    diners?: number,
    remark?: string
}

export type MealPageDto = {
    currentPage: number,
    pageSize: number,
    mealDate?: Date
}

export type MealAddDto = {
    mealDate: Date,
    mealTime?: number,
    diners?: number,
    remark?: string,
    mealMenuList?: Array<MealMenuAddDto>
}

export type MealMenuAddDto = {
    dishesId: number,
    dishesName: string
}

export type MealUpdateDto = MealAddDto & {
    id: number
}

export type MealDetailVo = {
    id: number,
    mealDate: Date,
    mealTimeStr?: number,
    diners?: number,
    remark?: string,
    mealMenuList?: Array<MealMenuDetailVo>
}

export type MealMenuDetailVo = {
    id: number,
    dishesId: number,
    dishesName: string
}