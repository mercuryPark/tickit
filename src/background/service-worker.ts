// Phase 1 Day 2: 메시지 라우팅 기반만 마련.
// - Content Script의 TICKET_DATA_EXTRACTED 수신 → 로그만 남김 (AI 호출은 Day 3~4)
// - chrome.tabs.onUpdated로 Jira 티켓 URL 변경 감지 → Content Script에 재추출 신호
//
// ⚠️ Critical rules (CLAUDE.md / OPERATIONS_GUIDE §2):
//  - SW 글로벌 변수에 상태 저장 금지 (chrome.storage 사용)
//  - onMessage 비동기 핸들러는 반드시 `return true`
//  - onInstalled의 details.reason === 'update'일 때 기존 데이터 유지

import { isJiraTicketUrl } from '../shared/constants'
import type { MessageToCS, MessageToSW, TicketData } from '../shared/types'

// SW 최상위에서 호출 — SW가 깨어날 때마다 재설정.
// (unpacked 확장 reload 시 onInstalled이 발생하지 않는 경우에도 대비)
void chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => {
    console.error('[Tickit] setPanelBehavior failed:', err)
  })

// 첫 설치/업데이트 분기.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 첫 설치: 기본값 세팅 (Day 2에서 StorageData 스키마로 확장)
    void chrome.storage.local.set({
      schemaVersion: 1,
      aiConfig: null,
      analysisCache: {},
    })
  }
  // 업데이트 시 기존 aiConfig/cache는 유지. 마이그레이션 로직은 Day 8~9.
})

// ─────────────────────────────────────────────────────────────
// 메시지 라우팅 (Content Script / Side Panel → SW)
// ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  const message = raw as MessageToSW
  if (!message || typeof message !== 'object') return false

  if (message.type === 'TICKET_DATA_EXTRACTED') {
    // Day 2: 수신 로그만. Day 3에서 여기서 AI 분석 트리거 + 캐시 조회.
    handleTicketExtracted(message.payload, sender)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error('[Tickit/SW] handleTicketExtracted failed:', err)
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
      })
    return true // 비동기 응답 유지 (SW가 응답 전 죽지 않도록)
  }

  if (message.type === 'REQUEST_ANALYSIS') {
    // Day 3~4에서 실제 구현. 지금은 명시적 not-implemented.
    sendResponse({ ok: false, error: 'NOT_IMPLEMENTED' })
    return false
  }

  return false
})

async function handleTicketExtracted(
  data: TicketData,
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  console.log('[Tickit/SW] ticket received', {
    key: data.key,
    title: data.title,
    status: data.status,
    labels: data.labels.length,
    comments: data.comments.length,
    truncated: data.descriptionTruncated,
    tabId: sender.tab?.id,
  })
  // Day 3에서 이어서:
  //  1) analysisCache[key]가 있으면 Side Panel에 즉시 전송
  //  2) 없으면 AI 호출 (streaming) → Side Panel에 ANALYSIS_STREAMING 전송
}

// ─────────────────────────────────────────────────────────────
// 탭 URL 변경 감지 (Content Script SPA 감지 보조)
// ─────────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const url = changeInfo.url
  if (!url || !isJiraTicketUrl(url)) return

  const message: MessageToCS = { type: 'URL_CHANGED', url }
  // 아직 Content Script가 주입되지 않았거나 종료된 탭이면 실패할 수 있음 — 무해하게 삼킨다.
  chrome.tabs.sendMessage(tabId, message).catch((err) => {
    console.debug('[Tickit/SW] URL_CHANGED send skipped:', err?.message ?? err)
  })
})
