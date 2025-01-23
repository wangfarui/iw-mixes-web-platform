import request from "@/api/request";
import type * as BookkeepingType from "@/types/bookkeeping";

// 记账记录分页列表
export const queryBookkeepingPage = (bookkeepingListDto: BookkeepingType.BookkeepingPageDto) => {
    return request.post('/bookkeeping-service/bookkeepingRecords/page', bookkeepingListDto);
}

// 新增记账记录
export const addBookkeeping = (bookkeepingAddDto: BookkeepingType.BookkeepingAddDto) => {
    return request.post('/bookkeeping-service/bookkeepingRecords/add', bookkeepingAddDto)
}

// 修改记账记录
export const updateBookkeeping = (bookkeepingUpdateDto: BookkeepingType.BookkeepingUpdateDto) => {
    return request.put('/bookkeeping-service/bookkeepingRecords/update', bookkeepingUpdateDto)
}

// 删除记账记录
export const deleteBookkeeping = (id: number) => {
    return request.delete('/bookkeeping-service/bookkeepingRecords/delete?id=' + id)
}

// 查询记账记录详情
export const queryBookkeepingDetail = (id: number) => {
    return request.get('/bookkeeping-service/bookkeepingRecords/detail?id=' + id)
}