import request from "@/api/request";
import type * as WebsiteNavigationType from "@/types/websiteNavigation";

export const queryWebsiteNavigationPage = (pageDto: WebsiteNavigationType.WebsiteNavigationPageDto) => {
    return request.post('/auth-service/website/navigation/page', pageDto);
}

export const addWebsiteNavigation = (addDto: WebsiteNavigationType.WebsiteNavigationAddDto) => {
    return request.post('/auth-service/website/navigation/add', addDto)
}

export const updateWebsiteNavigation = (updateDto: WebsiteNavigationType.WebsiteNavigationUpdateDto) => {
    return request.put('/auth-service/website/navigation/update', updateDto)
}

export const deleteWebsiteNavigation = (id: number) => {
    return request.delete('/auth-service/website/navigation/delete?id=' + id)
}

export const queryWebsiteNavigationDetail = (id: number) => {
    return request.get('/auth-service/website/navigation/detail?id=' + id)
}
