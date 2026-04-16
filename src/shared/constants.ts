// 전역 상수. UI 문자열은 i18n(_locales)에서 관리.

/** 티켓 텍스트 합산 최대 길이. 초과 시 truncate + 플래그 */
export const MAX_TICKET_CHARS = 4000

/** 분석 결과 캐시 유효시간 (ms) */
export const CACHE_TTL_MS = 60 * 60 * 1000  // 1시간

/** 캐시 최대 항목 수 (LRU) */
export const CACHE_MAX_ENTRIES = 50

/** storage schema 버전. 업데이트 시 마이그레이션 대상 */
export const CURRENT_SCHEMA_VERSION = 1

/** AI 프로바이더별 기본 모델 */
export const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
} as const

/** 지원하는 Jira 호스트 패턴 */
export const JIRA_HOST_PATTERN = /^https:\/\/[^/]+\.atlassian\.net\//

/** 티켓 URL 감지 (browse/ 또는 jira/ 경로) */
export function isJiraTicketUrl(url: string): boolean {
  return (
    JIRA_HOST_PATTERN.test(url) &&
    (url.includes('/browse/') || url.includes('/jira/'))
  )
}
