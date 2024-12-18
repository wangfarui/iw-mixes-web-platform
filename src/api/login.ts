import request from "@/api/request";
import type {UserLoginVO} from "@/types/types";


// 账号密码登录
export const loginByPasswordApi = (user: UserLoginVO) => {
    return request.post('/auth-service/login/password', user);
}

// 账号密码登录
export const loginByVerificationCodeApi = (user: UserLoginVO) => {
    return request.post('/auth-service/login/verificationCode', user);
}

// 查询字典类型集合
export const getDictTypeList = () => {
    return request.get('/auth-service/dict/getDictTypeList');
}

// 查询所有数据字典集合
export const getAllDictList = () => {
    return request.get('/auth-service/dict/getAllDictList');
}

// 获取验证码
export const getVerificationCodeApi = (phoneNumber: string) => {
    return request.get('/auth-service/register/getVerificationCode?phoneNumber=' + phoneNumber);
}

export function logout() {
    return request({
        url: '/api/logout',
        method: 'get'
    })
}
