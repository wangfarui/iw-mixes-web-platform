/*在这个文件中我们对请求和响应进行封装*/
import axios from "axios";
import {ElMessage} from "element-plus";
import router from "@/router";

axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'

const VITE_BUILD_ENV = import.meta.env.VITE_BUILD_ENV;

const service = axios.create({
    timeout: 30000,
    baseURL: VITE_BUILD_ENV == 'prod' ? '//api.itwray.com' : ''
})

//这个是请求拦截器，如果是使用 JWT 或者其他令牌登录的话，那么可以在请求拦截器中统一添加令牌
service.interceptors.request.use(
    (config) => {
        // 从sessionStorage中获取iwtoken的值
        const iwtoken = window.sessionStorage.getItem("iwtoken");
        if (iwtoken) {
            // 设置默认的header参数
            config.headers["iwtoken"] = iwtoken;
        }
        return config;
    },
    (error) => {
        Promise.reject(error);
    }
);

service.interceptors.response.use(success => {
    //获取服务端返回的状态码，如果服务端没有设置状态码，默认就是 200
    const code = success.data.status || 200;
    if (code == 200) {
        // 未授权
        if (success.data.code == 401) {
            window.sessionStorage.removeItem('iwtoken')
            router.replace('/login');
            return Promise.reject(success.data.message);
        }
        //说明请求成功
        if (success.data.code != 200) {
            ElMessage.error(success.data.message)
            return Promise.reject(success.data.message);
        }
        //返回服务端返回的 JSON
        return success.data;
    } else {
        ElMessage.error(success.data.message)
        return Promise.reject(success.data.message);
    }
}, error => {
    if (error.response.status == 401) {
        window.sessionStorage.removeItem('iwtoken')
        //说明未登录
        router.replace('/login');
    }
    //HTTP 状态码不是 200，就会进入到这个回调中
    ElMessage.error(error);
    return Promise.reject(error);
})

export default service;
