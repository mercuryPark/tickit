// Jira Cloud 티켓 페이지에서 TicketData를 뽑아 Service Worker로 전달한다.
//
// 전제 (Day 1 DOM 검증):
//  - 셀렉터는 dom-selectors.ts에 검증값 + fallback 배열로 정리됨
//  - Jira는 React SPA → 페이지 리로드 없이 URL 변경 가능 → Navigation API + polling 조합
//  - 보드/로드맵에서 티켓을 "모달/드로어"로 열면 URL이 안 바뀔 수 있음 → MutationObserver 보조
//
// 설계:
//  - 추출은 디바운스 후 1회 (연속 DOM 변화에 불필요한 재추출 방지)
//  - 추출 실패 시 throw 하지 않는다 (빈 필드 허용 — SW/Side Panel이 graceful하게 처리)
//  - SW 메시지는 sendMessageWithRetry로 보낸다 (SW idle 대비)

import { SELECTORS, queryWithFallback, queryAllWithFallback, findCommentParts } from './dom-selectors'
import { truncateText } from './text-truncator'
import { sendMessageWithRetry } from '../shared/message-retry'
import { isJiraTicketUrl } from '../shared/constants'
import type { Comment, MessageToCS, MessageToSW, TicketData } from '../shared/types'

const URL_POLL_INTERVAL_MS = 1000
const EXTRACT_DEBOUNCE_MS = 300
const MAX_COMMENTS = 5
const URL_REGEX = /https?:\/\/[^\s<>"'()\]]+/g
const TICKET_KEY_REGEX = /\/(?:browse|jira\/[^/]+\/[^/]+\/[^/]+)\/([A-Z][A-Z0-9]+-\d+)(?=[/?#]|$)/

/** 중복 추출 방지용 (같은 URL 재추출 금지, 모달 토글 스팸 방어) */
let lastProcessedUrl = ''
let extractTimer: number | undefined

// ─────────────────────────────────────────────────────────────
// 필드 추출 헬퍼
// ─────────────────────────────────────────────────────────────

/** URL에서 티켓 키 (e.g. "OC-6167") 추출. 실패 시 빈 문자열. */
function extractKeyFromUrl(url: string): string {
  const m = url.match(TICKET_KEY_REGEX)
  return m?.[1] ?? ''
}

/**
 * 티켓 키 추출 — URL 우선, 안 되면 DOM fallback.
 * 보드/로드맵에서 모달로 티켓을 열 때 URL은 보드 URL 그대로라 DOM 필요.
 */
const KEY_SHAPE = /^[A-Z][A-Z0-9]+-\d+$/
function extractTicketKey(url: string): string {
  const urlKey = extractKeyFromUrl(url)
  if (urlKey) return urlKey

  // 1) 브레드크럼의 `/browse/KEY` 링크
  const browseLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="/browse/"]')
  for (const a of browseLinks) {
    const k = extractKeyFromUrl(a.href)
    if (k) return k
  }

  // 2) 키를 노출하는 data-testid (breadcrumb current item 등)
  const keyEl = document.querySelector(
    [
      '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]',
      '[data-testid*="issue-key"]',
      '[data-component-selector="jira-issue-view-issue-key"]',
    ].join(','),
  )
  const candidate = (keyEl?.textContent ?? '').trim()
  if (KEY_SHAPE.test(candidate)) return candidate

  return ''
}

/**
 * HTML 요소 → plain text.
 *  - `<pre>`/`<code>` 안의 텍스트는 원문 그대로 보존 (코드 블록 유지)
 *  - `<br>`, 블록 요소는 개행으로 치환
 *  - 과도한 공백/개행은 정돈
 */
function htmlToText(el: Element | null): string {
  if (!el) return ''
  const clone = el.cloneNode(true) as Element

  // 코드 블록은 textContent로 납작화 (구조 보존보다 텍스트 우선)
  clone.querySelectorAll('pre, code').forEach((code) => {
    const text = code.textContent ?? ''
    code.replaceWith(document.createTextNode(text))
  })
  clone.querySelectorAll('br').forEach((br) => {
    br.replaceWith(document.createTextNode('\n'))
  })
  // 블록 요소 끝에 개행 추가 (후처리에서 중복 제거)
  clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, tr').forEach((block) => {
    block.append(document.createTextNode('\n'))
  })

  const raw = (clone.textContent ?? '').replace(/\u00a0/g, ' ')
  return raw
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 담당자 텍스트에서 "나에게 할당" / "Assign to me" 버튼 문자열 제거 */
function cleanAssignee(text: string): string {
  return text
    .replace(/나에게\s*할당/g, '')
    .replace(/Assign\s*to\s*me/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Labels 컨테이너에서 개별 레이블 텍스트 리스트 추출.
 *
 * 설계: chip 전용 셀렉터로만 찾는다. 못 찾으면 빈 배열 반환.
 * 이유 — 일반 span/a fallback은 toolbar 버튼 ("레이블 보기 옵션") 같은 UI chrome을
 * 잡는다. 빈 label 티켓에서 쓰레기가 들어가느니 []가 낫다.
 *
 * 새로운 chip DOM 패턴 발견 시 selectors 배열에 추가.
 */
const LABEL_CHIP_SELECTORS = [
  // Atlassian 공통 Lozenge 컴포넌트
  '[data-smart-element="Lozenge"]',
  '[data-testid*="lozenge"]',
  // 라벨 필터 링크 — 일반적인 Jira label pill 형태 (/issues?...labels=foo)
  'a[href*="labels="]',
  'a[href*="labels%20%3D"]', // URL-encoded "labels ="
  'a[href*="jql="][href*="labels"]',
  // 개별 label 행 (sortable item)
  '[data-testid*="sortable-item"]:not([data-testid*="container"]) a',
  '[data-testid*="sortable-item"]:not([data-testid*="container"]) span[role]',
]

function extractLabels(el: Element | null): string[] {
  if (!el) return []

  const chipCandidates = Array.from(
    el.querySelectorAll<HTMLElement>(LABEL_CHIP_SELECTORS.join(',')),
  )

  const chipTexts = chipCandidates
    .map((n) => (n.textContent ?? '').trim())
    .filter((t) => t && t.length <= 80)

  return Array.from(new Set(chipTexts)).slice(0, 20)
}

/** 댓글 컨테이너에서 최근 N개 Comment[] */
function extractComments(): Comment[] {
  const container = queryWithFallback(SELECTORS.commentsContainer)
  if (!container) return []
  const items = queryAllWithFallback(SELECTORS.commentItem, container)
  const parsed: Comment[] = []

  for (const item of items) {
    const { header, body } = findCommentParts(item)
    const bodyText = htmlToText(body)
    if (!bodyText) continue

    const headerText = ((header?.textContent ?? '').trim()).replace(/\s+/g, ' ')
    // 헤더는 보통 "작성자 · N일 전" 형태. 간단히 가운뎃점/하이픈 기준 분할.
    const [authorPart, ...rest] = headerText.split(/\s[·•·-]\s/)
    parsed.push({
      author: (authorPart ?? '').trim(),
      body: bodyText,
      createdAt: rest.join(' ').trim(),
    })
  }
  // 최근 N개만
  return parsed.slice(-MAX_COMMENTS)
}

/** 설명/댓글에서 외부 링크(Figma, GitHub 등) 수집. Jira 자체 링크 제외. */
function extractLinkedUrls(description: string, comments: Comment[]): string[] {
  const haystack = [description, ...comments.map((c) => c.body)].join('\n')
  const found = new Set<string>()
  for (const match of haystack.matchAll(URL_REGEX)) {
    const url = match[0].replace(/[.,;:)\]]+$/, '')
    if (url.includes('atlassian.net')) continue
    found.add(url)
  }
  return Array.from(found).slice(0, 20)
}

// ─────────────────────────────────────────────────────────────
// TicketData 빌드 + 전송
// ─────────────────────────────────────────────────────────────

function buildTicketData(url: string): TicketData | null {
  const key = extractTicketKey(url)
  const title = (queryWithFallback(SELECTORS.title)?.textContent ?? '').trim()

  // 티켓 키가 없으면 티켓 상세 페이지가 아님 (보드/백로그/대시보드 등) → skip.
  // Jira 모달 뷰라도 브레드크럼에서 키를 찾으므로, 여기 도달 = 진짜 추출 실패.
  if (!key) return null
  // 제목이 아직 안 렌더된 상태 — DOM 준비 전. polling이 다음 tick에 재시도.
  if (!title) return null

  const descRaw = htmlToText(queryWithFallback(SELECTORS.description))
  const { text: description, truncated: descriptionTruncated } = truncateText(descRaw)

  const status = (queryWithFallback(SELECTORS.status)?.textContent ?? '').trim()
  const priority = (queryWithFallback(SELECTORS.priority)?.textContent ?? '').trim()
  const assignee = cleanAssignee(queryWithFallback(SELECTORS.assignee)?.textContent ?? '')
  const labels = extractLabels(queryWithFallback(SELECTORS.labels))
  const comments = extractComments()
  const linkedUrls = extractLinkedUrls(description, comments)

  return {
    platform: 'jira',
    key,
    title,
    description,
    descriptionTruncated,
    comments,
    labels,
    priority,
    assignee,
    status,
    linkedUrls,
    rawUrl: url,
  }
}

async function extractAndSend(reason: string): Promise<void> {
  const url = location.href
  if (!isJiraTicketUrl(url)) return

  const data = buildTicketData(url)
  if (!data) {
    // DOM이 아직 준비 안 됨. polling/observer가 다음 tick에 재시도한다.
    console.debug('[Tickit] no data yet (DOM still loading?)', { url, reason })
    return
  }

  // 기록은 성공 시점에만 갱신 — 추출 실패한 URL은 다음 polling에서 재시도 가능
  lastProcessedUrl = url

  const message: MessageToSW = { type: 'TICKET_DATA_EXTRACTED', payload: data }
  try {
    await sendMessageWithRetry(message)
    // 로그 스팸 방지용으로 본문은 앞 120자 프리뷰만. 전체 데이터는 SW 콘솔의
    // "ticket received" 객체를 펼쳐보면 확인 가능.
    console.log('[Tickit] extracted →', {
      key: data.key,
      title: data.title,
      reason,
      descChars: data.description.length,
      descPreview: data.description.slice(0, 120) + (data.description.length > 120 ? '…' : ''),
      truncated: data.descriptionTruncated,
      labels: data.labels,
      comments: data.comments.length,
      commentAuthors: data.comments.map((c) => c.author),
      linkedUrls: data.linkedUrls,
    })
  } catch (err) {
    console.warn('[Tickit] sendMessage failed after retries:', err)
  }
}

function scheduleExtract(reason: string): void {
  if (extractTimer !== undefined) clearTimeout(extractTimer)
  extractTimer = window.setTimeout(() => {
    extractTimer = undefined
    void extractAndSend(reason)
  }, EXTRACT_DEBOUNCE_MS)
}

// ─────────────────────────────────────────────────────────────
// SPA 네비게이션 감지
// ─────────────────────────────────────────────────────────────

interface NavigationLike {
  addEventListener: (type: 'navigate', fn: (e: { destination?: { url?: string } }) => void) => void
}

function installNavigationListener(): void {
  const nav = (globalThis as unknown as { navigation?: NavigationLike }).navigation
  if (nav?.addEventListener) {
    nav.addEventListener('navigate', (event) => {
      const dest = event.destination?.url
      if (dest && isJiraTicketUrl(dest)) scheduleExtract('navigation-api')
    })
  }

  // Navigation API 미지원 환경 + hash/replaceState 케이스 방어
  setInterval(() => {
    const here = location.href
    if (here !== lastProcessedUrl && isJiraTicketUrl(here)) {
      scheduleExtract('url-poll')
    }
  }, URL_POLL_INTERVAL_MS)
}

/**
 * 모달/드로어 뷰 감지 (보드·로드맵에서 티켓 클릭 시 URL 변경 없이 패널이 뜨는 경우).
 *
 * 성능 고려: subtree: true 사용하지만, heuristic에 매칭되는 노드가 추가될 때만 트리거.
 * 매칭 후엔 디바운스된 extractAndSend로 넘어가므로 폭주하지 않는다.
 */
function installModalObserver(): void {
  const looksLikeTicketPanel = (node: Element): boolean => {
    if (node.matches?.('[data-testid*="issue-view"], [data-testid*="issue.views"]')) return true
    return !!node.querySelector?.(SELECTORS.title[0])
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue
        if (looksLikeTicketPanel(node)) {
          scheduleExtract('modal-observer')
          return
        }
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

/** SW → CS 보조 신호 (tabs.onUpdated 기반 URL 변경 알림) */
function installSwMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: MessageToCS) => {
    if (!message || typeof message !== 'object') return
    if (message.type === 'URL_CHANGED' || message.type === 'FORCE_RE_EXTRACT') {
      scheduleExtract(`sw:${message.type}`)
    }
    // 동기 핸들러 → return 값 없음 (false 취급)
  })
}

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────

console.log('[Tickit] content script injected at', location.href)

installSwMessageListener()
installNavigationListener()
installModalObserver()

if (isJiraTicketUrl(location.href)) {
  scheduleExtract('initial-load')
}
