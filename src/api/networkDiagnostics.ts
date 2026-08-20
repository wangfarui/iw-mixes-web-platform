import axios from 'axios'
import type {
    GeneralResponse,
    NetworkDiagnosticsCheckDto,
    NetworkDiagnosticsResultVo
} from '@/types/networkDiagnostics'
import authSession from '@/services/authSession'

const VITE_BUILD_ENV = import.meta.env.VITE_BUILD_ENV

const networkDiagnosticsRequest = axios.create({
    timeout: 30000,
    baseURL: VITE_BUILD_ENV === 'prod' ? '//api.itwray.com' : '',
    headers: {
        'Content-Type': 'application/json;charset=utf-8'
    }
})

networkDiagnosticsRequest.interceptors.request.use((config) => {
    const iwtoken = authSession.getToken()
    if (iwtoken) {
        config.headers.iwtoken = iwtoken
    }
    return config
})

export const NETWORK_DIAGNOSTICS_LOGIN_CODES = [42911, 42912]

export const checkNetworkDiagnostics = async (
    dto: NetworkDiagnosticsCheckDto
): Promise<GeneralResponse<NetworkDiagnosticsResultVo>> => {
    const response = await networkDiagnosticsRequest.post<GeneralResponse<NetworkDiagnosticsResultVo>>(
        '/external-service/api/network-diagnostics/check',
        dto
    )
    return response.data
}
