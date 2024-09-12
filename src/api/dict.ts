import request from "@/api/request";
import type * as DictType from "@/types/dict";

// 字典记录分页列表
export const queryDictPage = (dictListDto: DictType.DictPageDto) => {
    return request.post('/auth-service/dict/page', dictListDto);
}

// 新增字典记录
export const addDict = (dictAddDto: DictType.DictAddDto) => {
    return request.post('/auth-service/dict/add', dictAddDto)
}

// 修改字典记录
export const updateDict = (dictUpdateDto: DictType.DictUpdateDto) => {
    return request.put('/auth-service/dict/update', dictUpdateDto)
}

// 删除字典记录
export const deleteDict = (id: number) => {
    return request.delete('/auth-service/dict/delete?id=' + id)
}

// 查询字典记录详情
export const queryDictDetail = (id: string) => {
    return request.get('/auth-service/dict/detail?id=' + id)
}