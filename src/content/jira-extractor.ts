// Phase 0 placeholder. Day 1에서 실제 Jira DOM 확인 후 추출 로직 구현.
// 현재는 Content Script가 Jira 페이지에서 정상적으로 주입되는지 확인만 한다.

// ⚠️ Day 1 최우선 작업:
// 1. 실제 Jira Cloud를 DevTools로 열어 현재 DOM 구조 확인
// 2. TECHNICAL_SPEC §6의 추정 셀렉터와 비교
// 3. dom-selectors.ts에 실제 확인된 셀렉터 + fallback 저장
// 4. 이 파일에서 extractAndSend() 구현

console.debug('[Tickit] content script injected at', location.href)

export {}
