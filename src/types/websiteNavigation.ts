export type WebsiteNavigationListData = {
    id: number
    name?: string
    url?: string
    description?: string
    icon?: string
    category?: string
    tags?: Array<string>
    status?: number
    shared?: number
    createTime?: string
    updateTime?: string
}

export type WebsiteNavigationPageDto = {
    currentPage: number
    pageSize: number
    name?: string
    category?: string
    tag?: string
    status?: number
    shared?: number
}

export type WebsiteNavigationAddDto = {
    name?: string
    url?: string
    description?: string
    icon?: string
    category?: string
    tags?: Array<string>
    status?: number
    shared?: number
}

export type WebsiteNavigationUpdateDto = WebsiteNavigationAddDto & {
    id?: number
}

export type WebsiteNavigationDetailVo = WebsiteNavigationListData
