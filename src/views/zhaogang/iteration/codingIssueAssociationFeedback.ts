export interface CodingIssueAssociationFailure {
  url: string
  message: string
}

const issueReference = (url: string) => {
  const match = url.match(/\/issues\/(\d+)\/detail(?:$|[?#])/)
  return match ? `#${match[1]}` : url
}

export const formatCodingIssueAssociationResult = (
  failures: CodingIssueAssociationFailure[]
) => {
  const details = failures.map(item => {
    const reference = issueReference(item.url)
    const message = item.message.trim() || '关联失败'
    return message.includes(reference) ? message : `${reference} ${message}`
  })
  return details.length === 1 ? details[0] : details.map(item => `· ${item}`).join('\n')
}
