// 应用账号信息 api
import request from "@/api/request";
import type * as AccountType from "@/types/applicationAccount";

// 分页查询应用账号信息
export const queryApplicationAccountPage = (accountListDto: AccountType.AccountPageDto) => {
    return request.post('/auth-service/applicationAccount/page', accountListDto);
}

// 新增应用账号记录
export const addApplicationAccount = (dictAddDto: AccountType.AccountAddDto) => {
    return request.post('/auth-service/applicationAccount/add', dictAddDto)
}

// 修改应用账号记录
export const updateApplicationAccount = (dictUpdateDto: AccountType.AccountUpdateDto) => {
    return request.put('/auth-service/applicationAccount/update', dictUpdateDto)
}

// 删除应用账号记录
export const deleteApplicationAccount = (id: number) => {
    return request.delete('/auth-service/applicationAccount/delete?id=' + id)
}

// 查询应用账号详情
export const queryApplicationAccountDetail = (id: number) => {
    return request.get('/auth-service/applicationAccount/detail?id=' + id)
}

// 查询应用账号密码
export const viewPasswordById = (id: number) => {
    return request.get('/auth-service/applicationAccount/viewPassword?id=' + id)
}
