import type {
  EncodingCategory,
  EncodingConverterSettings,
  EncodingOperation,
  HashAlgorithm
} from '@/types/encodingConverter'

export const ENCODING_LIMITS = {
  autoRunCharacters: 20000,
  hugeInputCharacters: 180000,
  maxTextFileBytes: 2 * 1024 * 1024,
  maxCodePointRows: 1200
}

export const ENCODING_TEXT_FILE_EXTENSIONS = new Set([
  '.txt',
  '.log',
  '.json',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.ts',
  '.md',
  '.csv',
  '.properties',
  '.yml',
  '.yaml',
  '.sql',
  '.url',
  '.conf',
  '.env'
])

export const CATEGORY_LABELS: Record<EncodingCategory, string> = {
  url: 'URL',
  base64: 'Base64',
  unicode: 'Unicode / JSON',
  html: 'HTML',
  bytes: '字节 / Hex',
  hash: 'Hash'
}

export const HASH_ALGORITHM_LABELS: Record<HashAlgorithm, string> = {
  md5: 'MD5',
  'sha-1': 'SHA-1',
  'sha-256': 'SHA-256',
  'sha-384': 'SHA-384',
  'sha-512': 'SHA-512'
}

export interface EncodingOperationOption {
  value: EncodingOperation
  label: string
  description: string
}

export const OPERATION_GROUPS: Record<EncodingCategory, EncodingOperationOption[]> = {
  url: [
    {
      value: 'url-decode',
      label: 'URL 解码',
      description: '将 %E4%B8%AD%E6%96%87 这类百分号编码还原为文本'
    },
    {
      value: 'url-encode',
      label: 'URL 编码',
      description: '按 encodeURIComponent 规则编码文本'
    },
    {
      value: 'url-decode-layers',
      label: '多层 URL 解码',
      description: '最多按设置层数重复解码，适合处理被多次编码的参数'
    }
  ],
  base64: [
    {
      value: 'base64-decode',
      label: 'Base64 转文本',
      description: '按 UTF-8 解码 Base64 文本'
    },
    {
      value: 'base64-encode',
      label: '文本转 Base64',
      description: '将文本按 UTF-8 转为标准 Base64'
    },
    {
      value: 'base64url-decode',
      label: 'Base64URL 转文本',
      description: '解码 JWT、URL 参数中常见的 Base64URL 内容'
    },
    {
      value: 'base64url-encode',
      label: '文本转 Base64URL',
      description: '将文本转为无 + / = 的 URL 安全格式'
    },
    {
      value: 'base64-to-base64url',
      label: 'Base64 转 Base64URL',
      description: '只转换字符集和 padding，不改变原始字节'
    },
    {
      value: 'base64url-to-base64',
      label: 'Base64URL 转 Base64',
      description: '恢复标准 Base64 字符和 padding'
    }
  ],
  unicode: [
    {
      value: 'unicode-unescape',
      label: 'Unicode 反转义',
      description: '还原 \\u4e2d\\u6587、\\x41 等转义片段'
    },
    {
      value: 'unicode-escape',
      label: '转 Unicode 转义',
      description: '将文本转为 \\uXXXX 形式'
    },
    {
      value: 'json-unescape',
      label: 'JSON 字符串反转义',
      description: '还原 \\n、\\t、\\"、\\\\ 等 JSON 字符串转义'
    },
    {
      value: 'json-escape',
      label: 'JSON 字符串转义',
      description: '生成可放入 JSON 字符串值中的转义文本'
    }
  ],
  html: [
    {
      value: 'html-decode',
      label: 'HTML 实体解码',
      description: '还原 &amp;、&lt;、&#x4e2d; 等实体'
    },
    {
      value: 'html-encode',
      label: 'HTML 实体编码',
      description: '转义 HTML 特殊字符'
    }
  ],
  bytes: [
    {
      value: 'text-to-hex',
      label: '文本转 Hex',
      description: '查看文本的 UTF-8 字节十六进制'
    },
    {
      value: 'hex-to-text',
      label: 'Hex 转文本',
      description: '将十六进制字节按 UTF-8 还原为文本'
    },
    {
      value: 'text-to-binary',
      label: '文本转二进制',
      description: '查看 UTF-8 字节的 8 位二进制表示'
    },
    {
      value: 'code-points',
      label: '码位列表',
      description: '按字符列出 Unicode 码位、UTF-16 和 UTF-8 字节'
    }
  ],
  hash: [
    {
      value: 'hash',
      label: 'Hash 摘要',
      description: '计算 MD5、SHA-1、SHA-256、SHA-384 或 SHA-512'
    }
  ]
}

export const OPERATION_LABELS = Object.values(OPERATION_GROUPS)
  .flat()
  .reduce<Record<EncodingOperation, string>>((labels, operation) => {
    labels[operation.value] = operation.label
    return labels
  }, {} as Record<EncodingOperation, string>)

export const OPERATION_CATEGORY = Object.entries(OPERATION_GROUPS)
  .reduce<Record<EncodingOperation, EncodingCategory>>((mapping, [category, operations]) => {
    operations.forEach((operation) => {
      mapping[operation.value] = category as EncodingCategory
    })
    return mapping
  }, {} as Record<EncodingOperation, EncodingCategory>)

export const createDefaultEncodingSettings = (): EncodingConverterSettings => ({
  category: 'url',
  operation: 'url-decode',
  urlSpaceMode: 'percent',
  urlDecodeLayers: 2,
  uppercaseHex: false,
  bytesSeparator: ' ',
  hashAlgorithm: 'sha-256'
})
