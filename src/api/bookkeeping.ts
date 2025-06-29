import request from "@/api/request";
import type * as BookkeepingType from "@/types/bookkeeping";

// 记账记录分页列表
export const queryBookkeepingPage = (bookkeepingListDto: BookkeepingType.BookkeepingPageDto) => {
    return request.post('/bookkeeping-service/bookkeeping/records/page', bookkeepingListDto);
}

// 新增记账记录
export const addBookkeeping = (bookkeepingAddDto: BookkeepingType.BookkeepingAddDto) => {
    return request.post('/bookkeeping-service/bookkeeping/records/add', bookkeepingAddDto)
}

// 修改记账记录
export const updateBookkeeping = (bookkeepingUpdateDto: BookkeepingType.BookkeepingUpdateDto) => {
    return request.put('/bookkeeping-service/bookkeeping/records/update', bookkeepingUpdateDto)
}

// 删除记账记录
export const deleteBookkeeping = (id: number) => {
    return request.delete('/bookkeeping-service/bookkeeping/records/delete?id=' + id)
}

// 查询记账记录详情
export const queryBookkeepingDetail = (id: number) => {
    return request.get('/bookkeeping-service/bookkeeping/records/detail?id=' + id)
}