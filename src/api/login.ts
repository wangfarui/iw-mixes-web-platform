import request from "@/utils/request";
import type {UserLoginVO} from "@/types/types";


// 登录
export const login = (user: UserLoginVO) => {
    return request.post('/iw-eat/login/doLogin', user);
}

export function logout() {
    return request({
        url: '/api/logout',
        method: 'get'
    })
}
