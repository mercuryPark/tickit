// Phase 0 placeholder. Day 3~4에서 구현.
//
// OpenAI/Anthropic 통합 클라이언트 (streaming).
// - Anthropic CORS: anthropic-dangerous-direct-browser-access: true 헤더 필수
// - AbortController로 중단 처리 (A2)
// - JSON 파싱 실패 시 비스트리밍 1회 재시도 (최대 2회)
// - 401/429/5xx/네트워크 에러 구분 처리

import type { AIConfig, AnalysisResult, TicketData } from './types'

export interface AnalyzeOptions {
  config: AIConfig
  ticket: TicketData
  signal?: AbortSignal
  onChunk?: (chunk: string) => void
}

export async function analyzeTicket(_opts: AnalyzeOptions): Promise<AnalysisResult> {
  throw new Error('[Tickit] ai-client.analyzeTicket not implemented yet (Day 3~4)')
}
