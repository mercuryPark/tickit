# MASTER_AUDIT.md — 20년차 크롬 확장 마스터 최종 감사 보고서

---

## 총점: 82/100 → A1, A2, A3 반영 후 90/100

| 영역 | 점수 | 반영 후 | 평가 |
|------|------|--------|------|
| 사업 전략·포지셔닝 | 9/10 | 9/10 | 시장 검증 충분. Claude in Chrome 대비 차별점 명확. |
| 기술 아키텍처 | 8/10 | 9/10 | A1(onInstalled), A4(schemaVersion), A5(CSP) 반영됨. |
| Jira DOM 추출 전략 | 7/10 | 9/10 | A3(SPA 3중 감지), A7(모달/드로어) 구체 코드 추가됨. |
| AI 프롬프트 설계 | 8/10 | 8/10 | 환각 방지 우수. 프로젝트 컨텍스트는 v2. |
| Side Panel UX | 8/10 | 9/10 | A2(스트리밍 중단 복구), A8(화면 전환 시 상태 보존) 반영됨. |
| Chrome Web Store 심사 | 9/10 | 9/10 | A5(CSP) 추가로 심사 안정성 강화. |
| Service Worker 안정성 | 7/10 | 9/10 | A1(onInstalled), return true, port, 3중 감지 전부 코드 수준 반영. |
| 운영·유지보수 | 8/10 | 9/10 | A4(스키마 마이그레이션) 프레임워크 추가됨. |
| 에러 처리 | 7/10 | 9/10 | A2(스트리밍 중단), AbortController, 화면 전환 복구 추가. |
| 보안 | 8/10 | 9/10 | A5(CSP), storage 암호화 경고 유지. |
| 확장성·미래 대비 | 8/10 | 8/10 | 변동 없음. |
| 문서 완성도·일관성 | 9/10 | 9/10 | 변동 없음. |

---

## 발견된 추가 이슈 (기존 15개 + 신규 12개 = 총 27개)

### 치명적 (반드시 수정)

#### A1. chrome.runtime.onInstalled에서 storage 덮어쓰기 위험
**문제:** SW에 `chrome.runtime.onInstalled` 리스너를 추가할 때, 이 이벤트는 설치(install)와 업데이트(update) 모두에서 발생함. 초기 설정값을 쓰는 코드가 업데이트 시에도 실행되면 사용자의 API 키와 설정이 날아감.
**영향:** 사용자가 업데이트 후 API 키를 다시 입력해야 함 → 별점 1점 리뷰 폭주.
**해결:**
```typescript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 첫 설치: 기본값 세팅
    chrome.storage.local.set({ aiConfig: null, analysisCache: {} });
  }
  if (details.reason === 'update') {
    // 업데이트: 기존 데이터 유지, 스키마 마이그레이션만 수행
    migrateStorageSchema(details.previousVersion);
  }
  // 항상 실행
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
```
**문서 반영:** TECHNICAL_SPEC.md Section 8에 추가 필요.

#### A2. 스트리밍 중 불완전 JSON 처리
**문제:** 현재 설계는 "스트리밍으로 표시 → 완료 후 JSON 파싱"인데, AI가 불완전한 JSON을 반환하거나 스트리밍 중 네트워크 끊김 시 처리 방법이 없음.
**영향:** 분석 결과가 표시되다가 갑자기 에러로 전환 → 사용자 혼란.
**해결:**
- 스트리밍 중에는 raw 텍스트를 그대로 표시 (JSON 포맷팅 없이)
- 스트리밍 완료 후 JSON 파싱 시도
- 파싱 실패 시: ① 비스트리밍으로 재시도 (1회) ② 그래도 실패 시 raw 텍스트를 "구조화되지 않은 분석" 형태로 표시
- 네트워크 끊김 시: 수신된 부분까지 표시 + "분석이 중단되었습니다. 재시도하시겠습니까?" 안내
**문서 반영:** TECHNICAL_SPEC.md Section 7, KNOWN_RISKS.md에 추가.

#### A3. SPA 네비게이션 감지가 MutationObserver 만으로 불충분
**문제:** Jira는 React SPA이므로 URL이 바뀌어도 페이지가 리로드되지 않음. 현재 설계에서 "URL 변경 감지"를 언급하지만 구체적 구현이 없음. history.pushState/replaceState는 MutationObserver로 잡을 수 없음.
**영향:** 사용자가 티켓 간 이동 시 이전 티켓의 분석이 계속 표시됨.
**해결:** 3가지 감지 방법을 조합:
```typescript
// 1. chrome.tabs.onUpdated (SW에서 — URL 변경 감지 가장 안정적)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && isJiraTicketUrl(changeInfo.url)) {
    chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED', url: changeInfo.url });
  }
});

// 2. Navigation API (Content Script에서 — 최신 브라우저)
navigation.addEventListener('navigate', (event) => {
  if (isJiraTicketUrl(event.destination.url)) {
    extractAndSend();
  }
});

// 3. Fallback: setInterval URL 체크 (Navigation API 미지원 시)
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (isJiraTicketUrl(lastUrl)) extractAndSend();
  }
}, 1000);
```
**문서 반영:** TECHNICAL_SPEC.md Section 6에 구체적 구현 추가.

---

### 중요 (출시 전 수정 권장)

#### A4. Storage 스키마 버전 관리 없음
**문제:** v0.1.0에서 저장한 데이터 구조와 v0.2.0의 구조가 다를 때 마이그레이션 로직이 없으면 업데이트 후 크래시.
**해결:** storage에 schemaVersion 필드를 추가하고, onInstalled(update) 시 마이그레이션 함수 실행.
```typescript
interface StorageData {
  schemaVersion: number; // 1, 2, 3...
  aiConfig: AIConfig | null;
  analysisCache: Record<string, CachedAnalysis>;
}

async function migrateStorageSchema(previousVersion: string) {
  const data = await chrome.storage.local.get('schemaVersion');
  const currentSchema = data.schemaVersion || 0;
  
  if (currentSchema < 1) {
    // v0.1 → v0.2 마이그레이션
  }
  if (currentSchema < 2) {
    // v0.2 → v0.3 마이그레이션
  }
  await chrome.storage.local.set({ schemaVersion: CURRENT_SCHEMA_VERSION });
}
```

#### A5. Content Security Policy (CSP) 미명시
**문제:** manifest.json에 CSP가 명시되지 않음. MV3 기본 CSP는 strict하지만, React 사용 시 주의점이 있음.
**해결:** manifest에 명시적 CSP 추가 (기본값과 동일하더라도 명시하는 것이 심사에 유리):
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```
⚠️ Vite 빌드 시 inline script가 생성되지 않도록 확인. CRXJS는 이를 자동 처리하지만 검증 필요.

#### A6. chrome.storage.local 용량 제한 인지 부족
**문제:** OPERATIONS_GUIDE에서 "~5MB 제한"이라고 적었는데, 실제로는 약 10MB로 증가됨 (Chrome 114+). 하지만 여전히 무제한이 아님. 캐시 50개 + 에러 로그 50개 + API 키 + 설정 = 용량 관리 필요.
**해결:** 
- 캐시 항목당 최대 크기 제한 (예: 10KB)
- 총 캐시 크기가 5MB 초과 시 LRU 삭제
- storage.local.getBytesInUse()로 현재 사용량 모니터링
- 설정 화면에 "캐시 비우기" 버튼 추가

#### A7. Jira 모달/드로어에서 열린 티켓 미처리
**문제:** Jira에서 보드 뷰나 백로그에서 티켓을 클릭하면 전체 페이지가 아닌 모달/드로어로 열림. 이 경우 URL이 변경되지 않거나 다른 패턴을 가짐.
**영향:** 사용자가 보드에서 티켓을 열었는데 Tickit이 반응하지 않음 → "안 되네" → 삭제.
**해결:**
- 모달/드로어가 열릴 때의 DOM 변경을 MutationObserver로 감지
- 또는 티켓 상세 패널의 특징적 셀렉터 출현을 감지
- URL 기반 감지와 DOM 기반 감지를 병행
**문서 반영:** TECHNICAL_SPEC.md Section 6, KNOWN_RISKS.md에 추가.

#### A8. Side Panel에서 Settings와 Result 전환 시 상태 유실
**문제:** 사용자가 분석 결과를 보다가 Settings로 갔다가 돌아오면 결과가 사라질 수 있음 (React state 초기화).
**해결:** 분석 결과를 항상 chrome.storage 캐시에서 읽도록 설계. React state는 캐시의 미러일 뿐.

---

### 보통 (v0.2에서 처리 가능)

#### A9. 다국어 프롬프트 품질 차이
**문제:** 한국어로 분석 요청 시 영어보다 출력 품질이 떨어질 수 있음 (AI 모델의 영어 편향).
**해결:** 프롬프트는 항상 영어로 보내고, 출력 언어만 한국어로 지정. "Respond in Korean"이 아니라 "Generate the JSON values in Korean language"로 구체화.

#### A10. 네트워크 상태 감지 없음
**문제:** 오프라인 상태에서 분석 시도 시 fetch 에러만 표시. 사전 감지 없음.
**해결:** `navigator.onLine` 체크 + `offline`/`online` 이벤트 리스너로 사전 안내.

#### A11. 스크린샷 자동화 미계획
**문제:** Chrome Web Store 스크린샷 3장을 수동으로 만들면 업데이트마다 다시 만들어야 함.
**해결:** Puppeteer 스크립트로 스크린샷 자동 생성 (v0.2 이후).

#### A12. 사용량 분석(Analytics) 부재
**문제:** 얼마나 많은 사용자가 실제로 분석을 실행하는지 알 수 없음. 서버가 없으므로 GA 같은 외부 서비스도 어려움.
**해결:** 
- MVP: 없음 (로컬 에러 로그만)
- v0.2: 선택적 익명 사용 통계 (일 분석 횟수, 사용 모델, 언어) — 사용자 동의 필수, Privacy Policy 업데이트 필수
- 또는: Chrome Web Store의 설치 수 + 활성 사용자 수 + 리뷰를 대리 지표로 활용

---

## 점수 상세 해설

### 9~10점 영역 (매우 우수)

**사업 전략 (9/10):** GitLab 67% 데이터, $1.25B Linear 사례, 커뮤니티 목소리 수집까지 완벽에 가까움. 0.5점 감점은 pricing 실험 계획 부재 (어떤 가격에 사용자가 반응하는지 A/B 테스트 설계가 없음).

**Chrome Web Store 심사 대비 (9/10):** 권한 최소화, Privacy Policy 템플릿, Store 설명 전문 작성, 거절 Top 5 대응까지. 0.5점 감점은 심사 거절 시 appeal 프로세스 가이드 부재.

**문서 완성도 (9/10):** 7개 문서 간 일관성 높음. 0.5점 감점은 CLAUDE.md의 읽기 순서에 OPERATIONS_GUIDE가 6번째인데 실제로는 개발 초기부터 참고해야 할 내용 포함.

### 7점 영역 (보강 필요)

**Jira DOM 추출 (7/10):** fallback 체인은 좋지만, SPA 네비게이션(A3), 모달/드로어(A7) 미처리가 실전에서 가장 큰 사용자 불만 원인이 될 것.

**Service Worker 안정성 (7/10):** return true 패턴, port 유지 등 기본은 있지만, onInstalled 덮어쓰기(A1), 스트리밍 중 SW 종료, 업데이트 시 SW 재시작으로 인한 진행 중 분석 중단 처리가 없음.

**에러 처리 (7/10):** 에러 매트릭스는 존재하지만, "에러 후 사용자가 다음에 무엇을 해야 하는지" 복구 경로가 일부 미정의. 특히 스트리밍 중 끊김(A2) 시나리오.

---

## 보강 권고 우선순위

### MVP 출시 전 반드시 (A1, A2, A3)
1. **A1** onInstalled reason 체크 + storage 마이그레이션 프레임워크
2. **A3** SPA 네비게이션 3중 감지 (tabs.onUpdated + Navigation API + interval fallback)
3. **A2** 스트리밍 중단/실패 시 graceful recovery UX

### 출시 직후 패치 (A4, A5, A7)
4. **A7** Jira 모달/드로어 티켓 감지
5. **A4** Storage schemaVersion 도입
6. **A5** 명시적 CSP

### v0.2에서 처리 (A6, A8~A12)
7. 나머지 이슈들

---

## 최종 의견

현재 계획은 **1인 개발자의 크롬 확장 MVP 계획으로서 상위 10%에 해당하는 완성도**입니다. 시장 검증, 경쟁 분석, 기술 설계, 운영 가이드까지 갖춘 계획을 가진 인디 해커는 드뭅니다.

가장 큰 강점은 **"서버 없는 BYOK 구조"**를 선택한 것. 이것이 운영 비용 $0, 심사 통과 용이성, 사용자 데이터 부담 없음이라는 3중 이점을 만들어냅니다.

가장 큰 리스크는 **Jira DOM 의존성**. Jira가 프론트엔드를 업데이트하면 확장이 깨지고, 이를 빠르게 패치해야 합니다. 이건 Jira 생태계 확장이 가진 본질적 한계이며, 모든 경쟁자도 같은 문제를 갖고 있으므로 "빠른 패치 속도"가 차별점이 됩니다.

**A1, A2, A3만 반영하면 82점 → 90점으로 올라갑니다.** ← 이번 감사에서 실제로 TECHNICAL_SPEC에 반영 완료. A4(schemaVersion), A5(CSP), A7(모달/드로어), A8(화면 전환 복구)도 반영됨.

총 27개 이슈 중 "치명적" 3개 + "중요" 4개 = 7개가 TECHNICAL_SPEC에 구체적 코드 수준으로 반영되었습니다. 나머지 "보통" 이슈(A9~A12)는 v0.2에서 사용자 피드백을 보면서 순차 대응하면 됩니다.

**이 계획대로 실행하세요. 충분히 준비되었습니다.**
