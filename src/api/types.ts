export type UserLoginVO = {
    username: string
    password: string
}

export type MealListData =  {
    id: number,
    mealDate: string,
    mealTimeStr?: string,
    diners?: number,
    remark?: string
}