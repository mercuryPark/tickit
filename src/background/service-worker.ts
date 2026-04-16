// Phase 0: Side Panel을 아이콘 클릭으로 열 수 있게 설정.
// Day 2~4에서 메시지 라우팅, AI API 호출, SW idle 처리, 캐시 등을 추가한다.
//
// ⚠️ Critical rules (CLAUDE.md / OPERATIONS_GUIDE §2):
//  - SW 글로벌 변수에 상태 저장 금지 (chrome.storage 사용)
//  - onMessage 비동기 핸들러는 반드시 `return true`
//  - onInstalled의 details.reason === 'update'일 때 기존 데이터 유지

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
