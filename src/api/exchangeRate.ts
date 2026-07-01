import request from '@/api/request'
import type {
    GeneralResponse,
    GetExchangeRateDto,
    GetExchangeRateVo
} from '@/types/exchangeRate'

export const queryExchangeRate = (
    dto: GetExchangeRateDto
): Promise<GeneralResponse<GetExchangeRateVo>> => {
    return request.post('/external-service/api/exchange-rate/convert', dto) as Promise<GeneralResponse<GetExchangeRateVo>>
}
