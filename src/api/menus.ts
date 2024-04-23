import request from "@/utils/request";
import type {AxiosResponse} from "axios";

// 假设菜单数据的类型是 Menu
interface Menu {
    // 定义菜单的属性
}

export function loadMenus(): Promise<AxiosResponse<Menu[]>> {
    return request({
        url: '/api/menus',
        method: 'get'
    })
}
