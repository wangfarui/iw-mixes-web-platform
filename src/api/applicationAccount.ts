// 应用账号信息 api
import request from "@/api/request";
import type * as AccountType from "@/types/applicationAccount";

// 分页查询应用账号信息
export const queryApplicationAccountPage = (accountListDto: AccountType.AccountPageDto) => {
    return request.post('/auth-service/application/account/page', accountListDto);
}

// 新增应用账号记录
export const addApplicationAccount = (dictAddDto: AccountType.AccountAddDto) => {
    return request.post('/auth-service/application/account/add', dictAddDto)
}

// 修改应用账号记录
export const updateApplicationAccount = (dictUpdateDto: AccountType.AccountUpdateDto) => {
    return request.put('/auth-service/application/account/update', dictUpdateDto)
}

// 删除应用账号记录
export const deleteApplicationAccount = (id: number) => {
    return request.delete('/auth-service/application/account/delete?id=' + id)
}

// 查询应用账号详情
export const queryApplicationAccountDetail = (id: number) => {
    return request.get('/auth-service/application/account/detail?id=' + id)
}

// 查询应用账号密码
export const viewPasswordById = (id: number) => {
    return request.get('/auth-service/application/account/viewPassword?id=' + id)
}
