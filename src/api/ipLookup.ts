import request from '@/api/request'
import type {
    GeneralResponse,
    IpLookupQueryDto,
    IpLookupResultVo
} from '@/types/ipLookup'

export const queryCurrentIpLookup = (): Promise<GeneralResponse<IpLookupResultVo>> => {
    return request.get('/external-service/api/ip-lookup/current') as Promise<GeneralResponse<IpLookupResultVo>>
}

export const queryIpLookup = (
    dto: IpLookupQueryDto
): Promise<GeneralResponse<IpLookupResultVo>> => {
    return request.post('/external-service/api/ip-lookup/query', dto) as Promise<GeneralResponse<IpLookupResultVo>>
}
