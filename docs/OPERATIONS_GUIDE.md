# OPERATIONS_GUIDE.md — Tickit 운영·유지보수·심사 가이드

> 크롬 확장 10년 이상 운영 경험 기반.
> 이 문서는 "개발 후"에 읽는 것이 아니라, 개발 중에 반드시 참고해야 할 운영 설계 가이드입니다.

---

## 1. Chrome Web Store 심사 통과 전략

### 1.1 심사 거절 Top 5 원인과 Tickit 대응

| 거절 원인 | 비중 | Tickit 해당 여부 | 대응 |
|----------|------|----------------|------|
| 과도한 권한 요청 | ~30% | ⚠️ 중간 리스크 | 아래 1.2 참고 |
| 설명과 실제 기능 불일치 | ~25% | ✅ 대응 필요 | 아래 1.3 참고 |
| Privacy Policy 미비 | ~20% | ✅ 대응 필요 | 아래 1.4 참고 |
| 난독화 코드 | ~15% | ❌ 해당 없음 | Vite 빌드는 난독화 아님 |
| 깨진 기능 | ~10% | ⚠️ 주의 | 아래 1.5 참고 |

### 1.2 권한 최소화 (심사에서 가장 많이 보는 부분)

**현재 manifest 권한 리뷰:**
```json
"permissions": ["sidePanel", "storage", "activeTab"]
```
- `sidePanel`: Side Panel 사용에 필수. ✅ 정당화됨.
- `storage`: API 키/설정 저장에 필수. ✅ 정당화됨.
- `activeTab`: 사용자가 아이콘을 클릭했을 때만 현재 탭에 접근. ✅ 가장 좁은 권한.

**host_permissions 리뷰:**
```json
"host_permissions": [
  "https://*.atlassian.net/*",
  "https://api.openai.com/*",
  "https://api.anthropic.com/*"
]
```
- `*.atlassian.net`: Jira Cloud DOM 접근에 필수. ✅ 정당화됨.
- `api.openai.com`, `api.anthropic.com`: AI API 호출에 필수. ✅ 정당화됨.

⚠️ **주의:** `*.atlassian.net/*`은 광범위해 보일 수 있음. 심사에서 "왜 모든 atlassian.net 하위 도메인이 필요한가?"라고 물으면:
→ "Each Jira Cloud instance uses a unique subdomain (e.g., company.atlassian.net). The extension needs access to read ticket content from any user's Jira Cloud instance." 이 문구를 Store 설명의 "Why these permissions?" 섹션에 포함.

⚠️ **절대 하지 말 것:** `<all_urls>`, `tabs` (activeTab이 아닌), `webRequest` 등 불필요한 권한 추가. 심사 시간이 3일→3주로 늘어남.

### 1.3 Store 설명 작성 규칙

**필수 포함 사항 (누락 시 거절):**
- 확장이 정확히 무엇을 하는지 구체적으로 (1~2문장)
- 어떤 데이터를 수집하는지 (API 키, 티켓 텍스트)
- 데이터가 어디로 전송되는지 (OpenAI/Anthropic API에만)
- 서버에 저장하지 않는다는 명시

**금지 표현:**
- "best", "fastest", "#1" 등 근거 없는 최상급 표현
- "Jira"를 제품명처럼 사용 (OK: "Works with Jira" / NG: "Jira AI Tool")
- 실제로 없는 기능 언급

**추천 구조:**
```
Tickit analyzes your Jira Cloud tickets and generates developer-ready technical checklists using AI.

HOW IT WORKS:
1. Open any Jira Cloud ticket
2. Click the Tickit icon to open the side panel  
3. AI instantly generates: task breakdown, affected components, clarifying questions

REQUIREMENTS:
- Jira Cloud account (*.atlassian.net)
- Your own OpenAI or Anthropic API key
- Jira Data Center / Server is NOT supported

PRIVACY:
- Your API key is stored locally and never sent to our servers
- Ticket content is sent only to OpenAI/Anthropic for analysis
- No data is collected, stored, or shared by Tickit
- Full privacy policy: [URL]

PERMISSIONS EXPLAINED:
- sidePanel: Display analysis results in the browser side panel
- storage: Save your API key and preferences locally
- activeTab: Read ticket content only when you click the Tickit icon
- *.atlassian.net: Access your Jira Cloud instance to read tickets
- api.openai.com / api.anthropic.com: Send ticket text for AI analysis
```

### 1.4 Privacy Policy 작성 가이드

**GitHub Pages에 호스팅 (무료). 반드시 포함할 내용:**

1. **수집하는 데이터:** 사용자가 입력한 API 키, Jira 티켓의 텍스트 내용 (분석 목적)
2. **데이터 전송:** 티켓 텍스트는 사용자가 선택한 AI 서비스(OpenAI 또는 Anthropic)에만 전송
3. **로컬 저장:** API 키와 설정은 chrome.storage.local에만 저장. 암호화되지 않음.
4. **서버 없음:** Tickit은 자체 서버를 운영하지 않음. 사용자 데이터를 수집·저장·공유하지 않음.
5. **제3자 공유:** 없음 (AI API 호출 외)
6. **삭제 방법:** 확장 제거 시 모든 로컬 데이터 자동 삭제. 설정에서 수동 삭제 가능.
7. **문의:** 이메일 주소

⚠️ Chrome Web Store Dashboard의 "Privacy Practices" 탭에서 체크박스도 정확히 맞춰야 함:
- "Does your extension handle personal or sensitive user data?" → Yes (API keys, ticket content)
- 해당하는 데이터 유형 모두 체크
- Privacy Policy URL 입력

### 1.5 깨진 기능 방지

심사관은 **fresh install 상태에서 테스트**합니다. 체크리스트:
- [ ] 확장 제거 → 재설치 → 첫 화면이 온보딩 가이드인지 확인
- [ ] API 키 없는 상태에서 Jira 페이지 열기 → 크래시 없이 온보딩 안내 표시
- [ ] 잘못된 API 키 입력 → 명확한 에러 메시지
- [ ] Jira가 아닌 페이지에서 → "Jira 티켓 페이지에서 사용해주세요" 안내
- [ ] 확장 아이콘 클릭 → Side Panel이 열리는지 확인
- [ ] **모든 fetch()에 .catch() 핸들러** (unhandled promise rejection은 심사 거절 사유)

---

## 2. Service Worker 생존 전략 (가장 흔한 운영 버그)

### 2.1 핵심 원칙
**"Service Worker에 상태를 저장하지 마라."**

```typescript
// ❌ 절대 하지 말 것
let currentAnalysis: AnalysisResult | null = null;

// ✅ 항상 storage 사용
async function getCurrentAnalysis(ticketKey: string) {
  const data = await chrome.storage.local.get(`cache_${ticketKey}`);
  return data[`cache_${ticketKey}`] || null;
}
```

### 2.2 메시지 패싱 안정화

```typescript
// src/shared/message-retry.ts
//
// chrome.runtime.sendMessage는 SW가 죽어있으면 
// "Could not establish connection. Receiving end does not exist." 에러 발생.
// 이 에러 시 SW가 자동으로 깨어나므로 짧은 딜레이 후 재시도하면 성공함.

export async function sendMessageWithRetry<T>(
  message: any,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      return response as T;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
  throw new Error('Message send failed after retries');
}
```

### 2.3 AI API 호출 중 SW 종료 방지

AI API 호출은 5~15초 걸릴 수 있음. 이 동안 SW가 "idle"로 판정되어 종료될 수 있음.

**해결책: chrome.runtime.onMessage 핸들러에서 return true 사용**
```typescript
// service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REQUEST_ANALYSIS') {
    // 비동기 처리임을 Chrome에 알림 → SW가 응답 전까지 살아있음
    handleAnalysis(message.payload).then(sendResponse);
    return true; // ← 이것이 핵심. 없으면 SW가 응답 전에 죽을 수 있음
  }
});
```

⚠️ **return true를 빼먹으면 가장 흔한 "간헐적 분석 실패" 버그 발생.** 재현이 어려워 디버깅에 시간을 많이 쓰게 됨.

### 2.4 Side Panel ↔ Service Worker 연결 유지

Side Panel이 열려있으면 chrome.runtime.connect()로 long-lived port를 유지할 수 있음.
```typescript
// sidepanel에서
const port = chrome.runtime.connect({ name: 'sidepanel' });
port.onDisconnect.addListener(() => {
  // SW가 재시작됨. 재연결.
  reconnect();
});

// service-worker에서
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    // port가 살아있는 동안 SW도 살아있음
    port.onMessage.addListener(handleSidePanelMessage);
  }
});
```

---

## 3. Jira DOM 셀렉터 유지보수 전략

### 3.1 왜 이것이 가장 큰 운영 리스크인가

Jira Cloud는 프론트엔드를 자주 업데이트함. data-testid가 변경되면 확장이 즉시 깨짐.
사용자 입장에서는 "어제까지 되던 게 안 된다" → 별점 1점 + 리뷰.

### 3.2 방어적 추출 아키텍처

```typescript
// src/content/dom-selectors.ts
//
// 우선순위가 있는 셀렉터 체인. 첫 번째가 실패하면 다음 시도.
// 새 셀렉터를 발견하면 배열 앞에 추가하고, 구버전은 뒤에 유지.

export const SELECTORS = {
  title: [
    '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
    '[data-testid="issue-field-summary"]',
    'h1[data-testid*="summary"]',
    'h1',  // 최후의 fallback
  ],
  description: [
    '[data-testid="issue.views.field.rich-text.description"]',
    '[data-testid="issue-field-description"]',
    '#description-val',
    '.user-content-block',
  ],
  // ... 각 필드별 3~4개 셀렉터
} as const;

export function queryWithFallback(selectors: readonly string[]): Element | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}
```

### 3.3 셀렉터 깨짐 감지 + 자동 보고

```typescript
// 추출 결과를 검증하여, 핵심 필드가 비어있으면 경고
function validateExtraction(data: TicketData): string[] {
  const warnings: string[] = [];
  if (!data.title) warnings.push('title_extraction_failed');
  if (!data.description) warnings.push('description_extraction_failed');
  // ...
  return warnings;
}

// warnings가 있으면 Side Panel에 표시 + 사용자에게 보고 요청
// "일부 데이터를 추출하지 못했습니다. 이 문제를 개발자에게 알려주시겠어요?"
// → GitHub Issue 자동 생성 링크 제공
```

### 3.4 업데이트 대응 프로세스

1. 매주 1회: 실제 Jira Cloud에서 확장 동작 확인 (본인 업무 중 자동으로 됨)
2. 추출 실패 감지 시: 새 DOM 구조 확인 → 셀렉터 업데이트 → 버전 패치 릴리즈
3. 핫픽스 릴리즈: 셀렉터만 수정한 패치는 심사 1일 이내 통과 (코드 변경 최소)
4. 셀렉터 변경 로그를 CHANGELOG에 기록 (사용자 신뢰)

---

## 4. 버전 관리 및 업데이트 전략

### 4.1 시맨틱 버저닝
```
0.1.0  MVP 출시 (Jira Cloud + OpenAI/Anthropic)
0.1.x  셀렉터 핫픽스, 버그 수정
0.2.0  Linear 지원 추가
0.3.0  비개발자 번역 모드
1.0.0  유료 플랜 도입 (안정 버전)
```

### 4.2 업데이트 릴리즈 체크리스트
- [ ] 변경사항이 새 권한을 요구하는지 확인 (권한 추가 시 사용자에게 재승인 요청됨 → 이탈 위험)
- [ ] 빌드 결과물에 소스맵이 포함되지 않았는지 확인 (불필요한 코드 크기 + 보안)
- [ ] manifest.json의 version 번호 올렸는지 확인
- [ ] fresh install 테스트
- [ ] 기존 사용자 데이터(API 키, 캐시) 마이그레이션 확인
- [ ] Chrome Web Store 설명/스크린샷이 새 기능을 반영하는지 확인

### 4.3 자동 업데이트 주의사항
Chrome은 확장을 자동 업데이트함 (보통 몇 시간 내). 문제:
- 새 버전에 치명적 버그가 있으면 전체 사용자에게 배포됨
- 롤백이 불가능 (이전 버전을 다시 올려야 함)

**대응:** 매 업데이트 전 beta 테스터 3~5명에게 먼저 테스트. 초기에는 동료 활용.

---

## 5. 에러 모니터링 (서버 없이)

### 5.1 로컬 에러 로그
```typescript
// src/shared/error-logger.ts
//
// 서버가 없으므로 에러를 chrome.storage.local에 기록.
// 설정 화면에서 "에러 로그 보기" + "복사" 기능 제공.
// 사용자가 GitHub Issue에 붙여넣을 수 있도록.

export async function logError(context: string, error: unknown) {
  const log = await chrome.storage.local.get('errorLog');
  const errors: ErrorEntry[] = log.errorLog || [];
  errors.push({
    timestamp: new Date().toISOString(),
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  // 최근 50개만 유지
  if (errors.length > 50) errors.splice(0, errors.length - 50);
  await chrome.storage.local.set({ errorLog: errors });
}
```

### 5.2 사용자 피드백 채널
- Settings 화면에 "문제 신고" 버튼 → GitHub Issues 템플릿 링크
- 에러 발생 시 "이 에러를 개발자에게 알리기" 버튼 → 에러 로그 클립보드 복사 + Issue 링크

### 5.3 Phase 2에서의 개선
유료 플랜 도입 시 선택적 에러 리포팅 (사용자 동의 하에 Sentry 같은 서비스 연동).
Privacy Policy 업데이트 필수.

---

## 6. 성능 최적화

### 6.1 Content Script 성능
- `run_at: "document_idle"` 사용 (페이지 로딩 차단 안 함)
- DOM 추출은 한 번만 실행. MutationObserver는 URL 변경 감지에만 사용.
- 추출된 데이터를 바로 SW에 전송 후 Content Script는 더 이상 동작 안 함

### 6.2 Side Panel 번들 크기
- React + Tailwind 기본: ~150KB gzipped
- AI 클라이언트 코드: ~5KB
- 총 목표: **200KB 이하**
- code splitting은 Side Panel 특성상 불필요 (단일 페이지)
- tree shaking 확인: 사용하지 않는 Tailwind 클래스 제거 (purge 설정)

### 6.3 API 응답 캐시
- 동일 ticketKey에 대해 1시간 캐시 (chrome.storage.local)
- 캐시 키: `cache_${ticketKey}`
- 캐시 히트 시 즉시 표시 + "재분석" 버튼으로 갱신 가능
- 캐시 사이즈 관리: 최대 50개 티켓 캐시. 오래된 것부터 삭제.

---

## 7. 국제화 (i18n) 가이드

### 7.1 Chrome 확장 i18n 기본
```json
// public/_locales/en/messages.json
{
  "extName": { "message": "Tickit — AI Ticket Analyzer" },
  "extDescription": { "message": "Turn vague Jira tickets into developer-ready checklists using AI" }
}

// public/_locales/ko/messages.json
{
  "extName": { "message": "Tickit — AI 티켓 분석기" },
  "extDescription": { "message": "모호한 Jira 티켓을 AI로 개발자용 체크리스트로 변환합니다" }
}
```

### 7.2 UI 문자열
Side Panel 내부 문자열은 `useSettings`의 language 설정에 따라 한/영 전환.
manifest의 이름/설명은 Chrome 브라우저 언어에 따라 자동 선택.

---

## 8. 법적 고려사항

### 8.1 Atlassian 상표
- "Jira"는 Atlassian의 등록 상표
- 제품명에 "Jira" 사용 ❌ (현재 "Tickit"으로 OK)
- Store 설명에서 "Works with Jira", "for Jira users" 형태로 사용 ✅
- Jira 로고/아이콘 사용 ❌

### 8.2 AI API 사용 약관
- OpenAI: API output을 서비스에 사용 가능 (Terms of Use 확인)
- Anthropic: 마찬가지 (Acceptable Use Policy 확인)
- 두 API 모두 "사용자가 자기 키로 자기 용도로 사용"하는 BYOK 모델은 약관 위반 아님

### 8.3 사용자 데이터
- Jira 티켓 내용은 회사 기밀일 수 있음
- "데이터는 사용자가 선택한 AI 서비스에만 전송되며 Tickit은 데이터를 저장하지 않습니다" 명시
- 사용자의 회사가 AI 서비스 사용을 금지하는 경우도 있으므로, 면책 문구 필요
