// Phase 0 placeholder. Day 2에서 구현.
// 합산 텍스트 ~4000자 제한 + descriptionTruncated 플래그.

import { MAX_TICKET_CHARS } from '../shared/constants'

export function truncateText(input: string, limit = MAX_TICKET_CHARS): {
  text: string
  truncated: boolean
} {
  if (input.length <= limit) return { text: input, truncated: false }
  return { text: input.slice(0, limit), truncated: true }
}
