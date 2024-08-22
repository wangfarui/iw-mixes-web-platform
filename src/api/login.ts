import request from "@/api/request";
import type {UserLoginVO} from "@/types/types";


// 登录
export const login = (user: UserLoginVO) => {
    return request.post('/auth-service/login/password', user);
}

export function logout() {
    return request({
        url: '/api/logout',
        method: 'get'
    })
}
