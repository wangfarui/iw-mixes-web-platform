import request from "@/api/request";
import type * as DishesType from "@/types/dishes";

// 菜品分页列表
export const queryDishesPage = (dishesListDto: DishesType.DishesPageDto) => {
    return request.post('/eat-service/eat/dishes/page', dishesListDto);
}

// 新增菜品记录
export const addDishes = (dishesAddDto: DishesType.DishesAddDto) => {
    return request.post('/eat-service/eat/dishes/add', dishesAddDto)
}

// 修改菜品记录
export const updateDishes = (dishesUpdateDto: DishesType.DishesUpdateDto) => {
    return request.put('/eat-service/eat/dishes/update', dishesUpdateDto)
}

// 删除菜品记录
export const deleteDishes = (id: number) => {
    return request.delete('/eat-service/eat/dishes/delete?id=' + id)
}

// 查询菜品记录详情
export const queryDishesDetail = (id: number) => {
    return request.get('/eat-service/eat/dishes/detail?id=' + id)
}