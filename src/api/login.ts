import request from "@/utils/request";
import type {UserLoginVO} from "@/api/types";


// 登录
export const login = (user: UserLoginVO) => {
    return request.post('/iw-auth/login/password', user);
}

export function logout() {
    return request({
        url: '/api/logout',
        method: 'get'
    })
}
