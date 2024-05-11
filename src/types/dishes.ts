
export type DishesListData =  {
    id: number,
    dishesName: string,
    dishesType?: number,
    difficultyFactor?: number,
    useTime?: number,
    prices?:number,
    status:number
}

export type DishesPageDto = {
    currentPage: number,
    pageSize: number,
    dishesName?: string,
    dishesType?: number,
    status?: number
}

export type DishesAddDto = {
    dishesName: string,
    dishesImage?: string,
    dishesType?: number,
    difficultyFactor?: number,
    useTime?: number,
    prices?:number,
    status: number,
    remark?: string
}

export type DishesUpdateDto = DishesAddDto & {
    id: number
}

export type DishesDetailVo = {
    id: number,
    dishesName: string,
    dishesType: number,
    difficultyFactor: number,
    useTime: number,
    prices:number,
    status:number
}
