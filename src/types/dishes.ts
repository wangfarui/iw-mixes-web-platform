
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
    remark?: string,
    dishesMaterialList: Array<DishesMaterialAddDto>, // 菜品用料对象集合
    dishesCreationMethodList: Array<DishesCreationMethodAddDto> // 菜品制作方法步骤集合
}

export type DishesUpdateDto = DishesAddDto & {
    id: number
}

export type DishesMaterialAddDto = {
    materialName?: string, // 食材名称
    materialDosage?: string, // 食材用量
    isPurchase: boolean // 是否需要购买 0否 1是
}

export type DishesCreationMethodAddDto = {
    step: number, // 制作步骤
    stepImage: string, // 步骤图片
    stepContent: string // 步骤内容
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
