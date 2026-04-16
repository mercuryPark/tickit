// Jira Cloud DOM 셀렉터 (2026-04-17, 실제 인스턴스에서 검증됨).
//
// 각 필드 배열은 우선순위 순서. 첫 번째가 실패하면 다음 fallback 시도.
// 새 셀렉터 발견 시 배열 앞에 추가, 구버전은 뒤에 유지 (OPERATIONS_GUIDE §3.2).
//
// ⚠️ Jira는 `data-testid`를 자주 변경함. 매 Chrome/Jira 업데이트 후 검증 필수.
// ⚠️ 일부 testid는 여러 필드가 공유함 (e.g. `issue.views.issue-base.context.labels`가
//    Labels/고객사/QC체크 등에 재사용됨). 공유 testid는 primary에서 제외.

export const SELECTORS = {
  /** 티켓 제목 — h1 요소라 가장 안정적 */
  title: [
    '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
    '[data-testid="issue-field-summary.ui.issue-field-summary-inline-edit--container"]',
    '[data-testid="issue-field-single-line-text-inline-edit-heading.ui.single-line-text-heading.read-view"]',
    'h1[data-testid*="summary"]',
    'h1',
  ],

  /** 설명 본문 (헤더 wrapper가 아닌 실제 텍스트 영역) */
  description: [
    '[data-testid="issue.views.field.rich-text.description"]',
    '#description-val',
    '.user-content-block',
  ],

  /** 환경 (optional 필드, 있을 때만) */
  environment: [
    '[data-testid="issue.views.field.rich-text.environment"]',
  ],

  /** 상태 뱃지 — button에 텍스트가 바로 들어있음 */
  status: [
    '[data-testid="issue-field-status.ui.status-view.status-button.status-button"]',
    '[data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"] button',
    '[data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"]',
  ],

  /** Resolution (해결 상태 — 닫힘일 때 세부 사유) */
  resolution: [
    '[data-testid="issue-field-resolution.ui.read.resolution-status-label"]',
    '[data-testid="issue.views.issue-base.foundation.status.resolution"]',
  ],

  /** 우선순위 값 (헤더 말고 값만) */
  priority: [
    '[data-testid="issue-field-priority-readview-full.ui.priority.wrapper"]',
    '[data-testid="issue.issue-view-layout.issue-view-priority-field.priority"]',
  ],

  /** 담당자 — 텍스트에 "나에게 할당" 버튼이 섞이므로 후처리 필요 */
  assignee: [
    '[data-testid="issue.views.field.user.assignee"]',
    '[data-testid="issue.issue-view-layout.issue-view-assignee-field.assignee"]',
  ],

  /** 보고자 */
  reporter: [
    '[data-testid="issue.views.field.user.reporter"]',
    '[data-testid="issue.issue-view-layout.issue-view-reporter-field.reporter"]',
  ],

  /**
   * 레이블.
   * ⚠️ `issue.views.issue-base.context.labels` testid는 여러 context 필드에 공유되므로
   *    primary로 사용 금지. sortable-item-container-labels가 고유함.
   */
  labels: [
    '[data-testid="issue-view-product-templates-item-list.ui.sortable-item-list.sortable-item-container-labels"]',
  ],

  /** 상위 항목 (epic/parent link) */
  parent: [
    '[data-testid="issue-field-parent.ui.view-link"]',
    '[data-testid="issue.issue-view-layout.issue-view-parent-field.parent"]',
  ],

  /** 수정 버전 */
  fixVersions: [
    '[data-testid="issue.views.field.select.common.select-inline-edit.fixVersions.field-inline-edit-state-less--container"]',
    '[data-testid="issue.views.field.select.common.select-inline-edit.fixVersions"]',
  ],

  /** 컴포넌트 */
  components: [
    '[data-testid="issue.views.field.select.common.select-inline-edit.components.field-inline-edit-state-less--container"]',
    '[data-testid="issue.issue-view-layout.issue-view-components-field.components"]',
  ],

  /** 기한 */
  dueDate: [
    '[data-testid="issue.views.field.date-inline-edit.duedate"] [data-testid="issue-field-date.ui.issue-field-date--container"]',
    '[data-testid="issue.issue-view-layout.issue-view-date-field.duedate"]',
  ],

  /** 댓글 컨테이너 (이 안에서 각 댓글 반복) */
  commentsContainer: [
    '[data-testid="issue.activity.comments-list"]',
  ],

  /** 개별 댓글 (컨테이너 기준 자식 순회) */
  commentItem: [
    '[data-testid="issue-comment-base.ui.comment.custom-comment.container"]',
  ],

  /** 댓글 내부의 헤더 (작성자 + 타임스탬프) */
  commentHeaderSuffix: '-header',

  /** 댓글 내부의 본문 */
  commentBodySuffix: '-body',
} as const

export function queryWithFallback(
  selectors: readonly string[],
  root: ParentNode = document,
): Element | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector)
    if (el) return el
  }
  return null
}

export function queryAllWithFallback(
  selectors: readonly string[],
  root: ParentNode = document,
): Element[] {
  for (const selector of selectors) {
    const els = Array.from(root.querySelectorAll(selector))
    if (els.length > 0) return els
  }
  return []
}

/**
 * 댓글 컨테이너 내부에서 `ak-comment.{id}-header` / `ak-comment.{id}-body` 페어 찾기.
 * data-testid suffix 매칭으로 견고하게 추출.
 */
export function findCommentParts(commentEl: Element): {
  header: Element | null
  body: Element | null
} {
  const header = commentEl.querySelector(
    `[data-testid$="${SELECTORS.commentHeaderSuffix}"]`,
  )
  const body = commentEl.querySelector(
    `[data-testid$="${SELECTORS.commentBodySuffix}"]`,
  )
  return { header, body }
}
