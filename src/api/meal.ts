import request from "@/api/request";
import type * as MealType from "@/types/meal";


// 用餐分页列表
export const queryMealPage = (mealListDto: MealType.MealPageDto) => {
    return request.post('/eat-service/meal/page', mealListDto);
}

// 新增用餐记录
export const addMeal = (mealAddDto: MealType.MealAddDto) => {
    return request.post('/eat-service/meal/add', mealAddDto)
}

// 修改用餐记录
export const updateMeal = (mealUpdateDto: MealType.MealUpdateDto) => {
    return request.put('/eat-service/meal/update', mealUpdateDto)
}

// 删除用餐记录
export const deleteMeal = (id: number) => {
    return request.delete('/eat-service/meal/delete?id=' + id)
}

// 查询用餐记录详情
export const queryMealDetail = (id: number) => {
    return request.get('/eat-service/meal/detail?id=' + id)
}