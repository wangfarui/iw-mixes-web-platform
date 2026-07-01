import axios from 'axios'
import type {
    GeneralResponse,
    ToolAiGenerateDto,
    ToolAiGenerateVo
} from '@/types/textPlayground'

const VITE_BUILD_ENV = import.meta.env.VITE_BUILD_ENV

const toolAiRequest = axios.create({
    timeout: 30000,
    baseURL: VITE_BUILD_ENV === 'prod' ? '//api.itwray.com' : '',
    headers: {
        'Content-Type': 'application/json;charset=utf-8'
    }
})

export const TOOL_AI_LIMIT_CODES = [42901, 42902, 42903]
export const TOOL_AI_FALLBACK_CODES = [...TOOL_AI_LIMIT_CODES, 50301]
export const TOOL_AI_BLOCKED_CODE = 40021

export const generateToolAiContent = async (
    dto: ToolAiGenerateDto
): Promise<GeneralResponse<ToolAiGenerateVo>> => {
    const response = await toolAiRequest.post<GeneralResponse<ToolAiGenerateVo>>(
        '/external-service/api/tools/ai/generate',
        dto
    )
    return response.data
}
