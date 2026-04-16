// 공유 타입 정의 (TECHNICAL_SPEC §5 기준).

/** Content Script가 추출하는 티켓 원본 데이터 */
export interface TicketData {
  platform: 'jira'
  key: string                      // e.g. "PROJ-123"
  title: string
  description: string              // HTML → plain text, ~4000자 제한
  descriptionTruncated: boolean    // true면 UI에 안내 표시
  comments: Comment[]              // 최근 5개
  labels: string[]
  priority: string
  assignee: string
  status: string
  linkedUrls: string[]             // Figma, GitHub 등 외부 링크
  rawUrl: string                   // 현재 티켓 URL
}

export interface Comment {
  author: string
  body: string
  createdAt: string
}

/** AI가 반환하는 분석 결과 */
export interface AnalysisResult {
  summary: string
  components: string[]
  tasks: TaskItem[]
  apiChanges: string
  questions: string[]
  estimatedEffort: string
  disclaimer: string               // "컴포넌트 이름은 추정입니다" 고정 문구
}

export interface TaskItem {
  task: string
  complexity: 'low' | 'medium' | 'high'
  notes: string
}

/** AI 클라이언트 설정 */
export interface AIConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model: string
  language: 'ko' | 'en'
}

/** chrome.storage에 저장되는 데이터 */
export interface StorageData {
  schemaVersion: number
  aiConfig: AIConfig | null        // null = 미설정 (온보딩 필요)
  analysisCache: Record<string, CachedAnalysis>  // key: ticketKey
}

export interface CachedAnalysis {
  result: AnalysisResult
  analyzedAt: string
  ticketTitle: string
}

/** Content Script → Service Worker 메시지 */
export type MessageToSW =
  | { type: 'TICKET_DATA_EXTRACTED'; payload: TicketData }
  | { type: 'REQUEST_ANALYSIS'; payload: TicketData }

/** Service Worker → Side Panel 메시지 */
export type MessageToSP =
  | { type: 'ANALYSIS_STREAMING'; payload: { chunk: string } }
  | { type: 'ANALYSIS_COMPLETE'; payload: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; payload: { code: string; message: string } }
