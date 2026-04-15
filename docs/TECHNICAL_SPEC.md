# TECHNICAL_SPEC.md — Tickit

## 1. 기술 스택

- **Language:** TypeScript (strict mode)
- **UI Framework:** React 18+
- **Build Tool:** Vite + CRXJS (@crxjs/vite-plugin). 만약 CRXJS에 Vite 버전 호환 문제 발생 시 `vite-plugin-web-extension`으로 대체.
- **Chrome APIs:** Manifest V3, Side Panel API, Storage API, Tabs API
- **AI APIs:** OpenAI (GPT-4o), Anthropic (Claude Sonnet) — 둘 다 streaming 지원
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm

## 2. 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                    브라우저 (Chrome)                     │
│                                                        │
│  ┌──────────────┐   chrome.runtime    ┌─────────────┐ │
│  │Content Script │ ──── message ────> │  Service     │ │
│  │              │   (with retry on   │  Worker      │ │
│  │ Jira Cloud   │    SW idle)        │              │ │
│  │ DOM 읽기      │                    │ 프롬프트 구성 │ │
│  │ ~4000자 제한  │                    │ AI API 호출  │ │
│  └──────────────┘                    │ (streaming)  │ │
│                                      └──────┬──────┘ │
│                                             │         │
│                                             │ message │
│                                             ▼         │
│                                     ┌─────────────┐  │
│                                     │ Side Panel   │  │
│                                     │ (React)      │  │
│                                     │              │  │
│                                     │ 스트리밍 표시  │  │
│                                     │ 설정 관리     │  │
│                                     └─────────────┘  │
│                                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │              chrome.storage.local                  │ │
│  │  API 키, 언어 설정, 분석 캐시, 모델 선택            │ │
│  └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                          │
                          │ HTTPS (사용자 API 키)
                          ▼
           ┌──────────────────────────┐
           │  OpenAI API              │
           │  POST /v1/chat/completions│
           │  (stream: true)          │
           ├──────────────────────────┤
           │  Anthropic API           │
           │  POST /v1/messages       │
           │  (stream: true)          │
           │  + anthropic-dangerous-  │
           │    direct-browser-access │
           │    : true                │
           └──────────────────────────┘
```

**핵심 원칙: 서버 없음.** 모든 로직이 클라이언트(확장) 내에서 동작.

## 3. 디렉토리 구조

```
tickit/
├── CLAUDE.md                        # Claude Code 지시 파일 (프로젝트 루트)
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
│
├── src/
│   ├── content/
│   │   ├── jira-extractor.ts        # Jira Cloud 페이지에서 티켓 데이터 추출
│   │   ├── dom-selectors.ts         # Jira DOM 셀렉터 (fallback 포함)
│   │   ├── text-truncator.ts        # 텍스트 ~4000자 제한 + 알림
│   │   └── types.ts                 # TicketData 인터페이스
│   │
│   ├── background/
│   │   └── service-worker.ts        # 메시지 라우팅, AI API 호출, SW idle 처리
│   │
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx                 # React 진입점
│   │   ├── App.tsx                  # 메인 (분석 결과 / 설정)
│   │   ├── components/
│   │   │   ├── AnalysisResult.tsx   # 체크리스트 카드 UI
│   │   │   ├── StreamingResult.tsx  # 스트리밍 중 점진적 표시
│   │   │   ├── TaskItem.tsx         # 개별 작업 항목 (complexity 뱃지)
│   │   │   ├── QuestionList.tsx     # PM에게 확인할 질문 목록
│   │   │   ├── Disclaimer.tsx       # AI 분석 한계 안내
│   │   │   ├── Settings.tsx         # API 키 입력, 언어, 모델 선택
│   │   │   ├── OnboardingGuide.tsx  # 첫 사용 시 API 키 발급 가이드
│   │   │   ├── LoadingSkeleton.tsx  # 분석 중 스켈레톤 UI
│   │   │   └── ErrorState.tsx       # 에러 상태 (API 키 무효, 네트워크 등)
│   │   └── hooks/
│   │       ├── useTicketAnalysis.ts  # 분석 요청/결과/스트리밍 관리
│   │       └── useSettings.ts        # chrome.storage 연동
│   │
│   ├── shared/
│   │   ├── ai-client.ts             # OpenAI/Claude 통합 API 클라이언트 (streaming)
│   │   ├── ai-stream-parser.ts      # SSE 스트림 파싱 유틸리티
│   │   ├── prompts.ts               # 프롬프트 템플릿
│   │   ├── types.ts                 # 공유 타입 정의
│   │   ├── constants.ts             # 설정값 상수
│   │   ├── storage.ts               # chrome.storage 래퍼
│   │   └── message-retry.ts         # SW idle 대비 메시지 재시도 유틸
│   │
│   └── _no_popup/                   # popup 없음. 아이콘 클릭 = Side Panel 열기.
│
├── public/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── _locales/
│       ├── en/messages.json
│       └── ko/messages.json
│
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── TECHNICAL_SPEC.md
│   ├── DEVELOPMENT_PLAN.md
│   ├── SCENARIOS.md
│   └── KNOWN_RISKS.md
│
└── store/                           # Chrome Web Store 에셋
    ├── screenshots/
    ├── description-en.md
    ├── description-ko.md
    └── privacy-policy.md
```

## 4. manifest.json

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "version": "0.1.0",
  "default_locale": "en",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.atlassian.net/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "content_scripts": [
    {
      "matches": [
        "https://*.atlassian.net/browse/*",
        "https://*.atlassian.net/jira/*"
      ],
      "js": ["src/content/jira-extractor.ts"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_title": "Tickit — Analyze this ticket",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png"
    }
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**주의사항:**
- `action.default_popup`을 선언하지 않음. `setPanelBehavior({ openPanelOnActionClick: true })`를 Service Worker에서 설정하여 아이콘 클릭 시 Side Panel이 열리도록 함.
- `host_permissions`에 `linear.app`은 MVP에 포함하지 않음 (v1.1).
- Jira Data Center(자체 도메인)는 지원하지 않음. `*.atlassian.net/*`만 매칭.

## 5. 핵심 타입 정의

```typescript
// src/shared/types.ts

/** Content Script가 추출하는 티켓 원본 데이터 */
export interface TicketData {
  platform: 'jira';
  key: string;                // e.g. "PROJ-123"
  title: string;
  description: string;        // HTML → plain text, ~4000자 제한
  descriptionTruncated: boolean;  // true면 UI에 안내 표시
  comments: Comment[];        // 최근 5개
  labels: string[];
  priority: string;
  assignee: string;
  status: string;
  linkedUrls: string[];       // Figma, GitHub 등 외부 링크
  rawUrl: string;             // 현재 티켓 URL
}

export interface Comment {
  author: string;
  body: string;
  createdAt: string;
}

/** AI가 반환하는 분석 결과 */
export interface AnalysisResult {
  summary: string;
  components: string[];
  tasks: TaskItem[];
  apiChanges: string;
  questions: string[];
  estimatedEffort: string;
  disclaimer: string;         // "컴포넌트 이름은 추정입니다" 고정 문구
}

export interface TaskItem {
  task: string;
  complexity: 'low' | 'medium' | 'high';
  notes: string;
}

/** AI 클라이언트 설정 */
export interface AIConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  language: 'ko' | 'en';
}

/** chrome.storage에 저장되는 데이터 */
export interface StorageData {
  schemaVersion: number;      // 스키마 버전 (1, 2, 3...). 업데이트 시 마이그레이션에 사용.
  aiConfig: AIConfig | null;  // null = 미설정 (온보딩 필요)
  analysisCache: Record<string, CachedAnalysis>;  // key: ticketKey
}

export interface CachedAnalysis {
  result: AnalysisResult;
  analyzedAt: string;
  ticketTitle: string;
}

/** Content Script → Service Worker 메시지 */
export type MessageToSW =
  | { type: 'TICKET_DATA_EXTRACTED'; payload: TicketData }
  | { type: 'REQUEST_ANALYSIS'; payload: TicketData };

/** Service Worker → Side Panel 메시지 */
export type MessageToSP =
  | { type: 'ANALYSIS_STREAMING'; payload: { chunk: string } }
  | { type: 'ANALYSIS_COMPLETE'; payload: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; payload: { code: string; message: string } };
```

## 6. Content Script — Jira 데이터 추출

```typescript
// src/content/jira-extractor.ts
//
// ⚠️ 중요: 아래 셀렉터는 2025~2026 기준 추정값입니다.
// 개발 시작 전에 반드시 실제 Jira Cloud 페이지를 DevTools로 열어서
// 현재 DOM 구조를 직접 확인하고 셀렉터를 업데이트하세요.
//
// 추정 셀렉터 (확인 필요):
// - 제목: [data-testid="issue.views.issue-base.foundation.summary.heading"] 또는 h1
// - 설명: [data-testid="issue.views.field.rich-text.description"]
// - 댓글: [data-testid="issue-comment-base"]
// - 라벨: [data-testid="issue.views.field.label.wrapper"]
// - 우선순위: [data-testid="issue.views.field.priority.common.ui.inline-edit--read-view"]
// - 상태: [data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"]
//
// 구현 요구사항:
// 1. 각 필드에 대해 2~3개의 fallback 셀렉터 준비
// 2. 추출 실패 시 빈 문자열 반환 (throw하지 않음)
// 3. HTML → plain text 변환 시 코드 블록 내용은 보존
// 4. 총 텍스트 ~4000자 초과 시 자르고 descriptionTruncated=true 설정
//
// ===== SPA 네비게이션 감지 (치명적 — A3) =====
// Jira는 React SPA이므로 페이지 리로드 없이 URL이 변경됨.
// Content Script에서 아래 2가지를 조합:
//
// a) Navigation API (Chrome 102+, 대부분의 사용자 커버):
//    navigation.addEventListener('navigate', (e) => {
//      if (isJiraTicketUrl(e.destination.url)) extractAndSend();
//    });
//
// b) Fallback: URL 변경 polling (Navigation API 미지원 시):
//    let lastUrl = location.href;
//    setInterval(() => {
//      if (location.href !== lastUrl) {
//        lastUrl = location.href;
//        if (isJiraTicketUrl(lastUrl)) extractAndSend();
//      }
//    }, 1000);
//
// c) SW에서도 chrome.tabs.onUpdated로 URL 변경 감지 (Section 8 참고)
//
// ===== Jira 모달/드로어 감지 (중요 — A7) =====
// 보드 뷰에서 티켓 클릭 시 모달로 열림 (URL이 안 바뀔 수 있음).
// MutationObserver로 모달 컨테이너 출현 감지:
//   const modalObserver = new MutationObserver((mutations) => {
//     for (const m of mutations) {
//       for (const node of m.addedNodes) {
//         if (node instanceof Element && isTicketDetailPanel(node)) {
//           extractFromModal(node);
//         }
//       }
//     }
//   });
//   modalObserver.observe(document.body, { childList: true, subtree: true });
//
// ⚠️ MutationObserver는 성능 비용이 있음. subtree: true는 최소한으로.
//    티켓 상세 패널의 특징적 셀렉터가 감지되면 observer.disconnect()하고
//    데이터 추출 후 다시 observe() 시작.
//
// 메시지 전송 (SW idle 대비 재시도 포함):
// import { sendMessageWithRetry } from '../shared/message-retry';
// sendMessageWithRetry({ type: 'TICKET_DATA_EXTRACTED', payload: ticketData });
```

## 7. AI 클라이언트

```typescript
// src/shared/ai-client.ts
//
// OpenAI와 Anthropic API를 통합 호출하는 클라이언트.
// 두 API 모두 streaming 모드로 호출하여 Side Panel에 점진적 표시.
//
// OpenAI:
//   POST https://api.openai.com/v1/chat/completions
//   Headers: Authorization: Bearer {key}, Content-Type: application/json
//   Body: { stream: true, ... }
//   Response: SSE (Server-Sent Events)
//
// Anthropic:
//   POST https://api.anthropic.com/v1/messages
//   Headers:
//     x-api-key: {key}
//     anthropic-version: 2023-06-01
//     content-type: application/json
//     anthropic-dangerous-direct-browser-access: true  ← CORS 활성화 필수
//   Body: { stream: true, ... }
//   Response: SSE
//
// 스트리밍 파싱:
//   응답을 실시간으로 파싱하여 Side Panel에 청크 단위로 전달.
//   전체 응답 수신 후 JSON 파싱 시도.
//   파싱 실패 시 비스트리밍 모드로 재시도 (최대 2회).
//
// ===== 스트리밍 중단/실패 처리 (치명적 — A2) =====
// 스트리밍 중에는 raw 텍스트를 그대로 Side Panel에 표시 (JSON 포맷팅 없이).
// 스트리밍 완료 후:
//   1) JSON 파싱 시도 → 성공 시 구조화된 UI로 전환
//   2) 파싱 실패 → 비스트리밍으로 1회 재시도
//   3) 재시도도 실패 → raw 텍스트를 "구조화되지 않은 분석" 형태로 표시
// 네트워크 끊김 시:
//   수신된 부분까지 표시 + "분석이 중단되었습니다. 재시도하시겠습니까?" 안내
//   AbortController로 fetch 취소 처리하여 리소스 정리
//
// ===== AbortController 패턴 =====
// const controller = new AbortController();
// fetch(url, { signal: controller.signal, ... });
// // 사용자가 "취소" 또는 다른 티켓으로 이동 시:
// controller.abort();
//
// 에러 처리:
//   401 → "API 키가 유효하지 않습니다"
//   429 → "요청 한도 초과. 30초 후 자동 재시도"
//   500+ → "AI 서비스에 일시적 문제. 재시도 버튼"
//   네트워크 → "네트워크 연결 확인"
```

## 8. Service Worker 주의사항

```typescript
// src/background/service-worker.ts
//
// ===== 0. onInstalled (치명적 — A1) =====
// ⚠️ onInstalled은 설치(install)와 업데이트(update) 모두에서 발생.
// 업데이트 시 초기값을 덮어쓰면 사용자 API 키가 날아감.
//
// chrome.runtime.onInstalled.addListener((details) => {
//   if (details.reason === 'install') {
//     // 첫 설치: 기본값 세팅
//     chrome.storage.local.set({ 
//       schemaVersion: 1, 
//       aiConfig: null, 
//       analysisCache: {} 
//     });
//   }
//   if (details.reason === 'update') {
//     // 업데이트: 기존 데이터 유지, 스키마 마이그레이션만 수행
//     migrateStorageSchema(details.previousVersion);
//   }
//   // 항상 실행 (설치/업데이트 모두)
//   chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
// });
//
// async function migrateStorageSchema(previousVersion: string | undefined) {
//   const data = await chrome.storage.local.get('schemaVersion');
//   const currentSchema = data.schemaVersion || 0;
//   if (currentSchema < 2) {
//     // v0.1 → v0.2 마이그레이션 예시
//   }
//   await chrome.storage.local.set({ schemaVersion: CURRENT_SCHEMA_VERSION });
// }
//
// ===== 1. Side Panel 열기 =====
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
//
// ===== 2. Service Worker Idle 처리 =====
// MV3 SW는 비활동 시 30초~5분 후 종료됨.
// 해결:
//   a) message-retry.ts에서 에러 발생 시 재시도 (최대 3회)
//   b) 비동기 메시지 핸들러에서 반드시 return true
//   c) Side Panel과 long-lived port 연결 유지
//
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === 'REQUEST_ANALYSIS') {
//     handleAnalysis(message.payload).then(sendResponse);
//     return true; // ← 필수! 없으면 SW가 응답 전에 죽음
//   }
// });
//
// // Side Panel과 port 유지 (SW 생존 연장)
// chrome.runtime.onConnect.addListener((port) => {
//   if (port.name === 'sidepanel') {
//     port.onMessage.addListener(handleSidePanelMessage);
//   }
// });
//
// ===== 3. SPA 네비게이션 감지 (치명적 — A3) =====
// Jira는 React SPA이므로 URL이 바뀌어도 페이지가 리로드되지 않음.
// 3가지 감지 방법을 조합:
//
// 방법 1: chrome.tabs.onUpdated (SW에서 — 가장 안정적)
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.url && isJiraTicketUrl(changeInfo.url)) {
//     chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED', url: changeInfo.url });
//   }
// });
//
// 방법 2 (Content Script에서): Navigation API
// navigation.addEventListener('navigate', (event) => {
//   if (isJiraTicketUrl(event.destination.url)) {
//     extractAndSend();
//   }
// });
//
// 방법 3 (Content Script에서): Fallback interval
// let lastUrl = location.href;
// setInterval(() => {
//   if (location.href !== lastUrl) {
//     lastUrl = location.href;
//     if (isJiraTicketUrl(lastUrl)) extractAndSend();
//   }
// }, 1000);
//
// ===== 4. 탭 변경 감지 =====
// chrome.tabs.onUpdated 리스너로 Jira 티켓 URL 패턴 감지.
// URL 매칭 시 Side Panel 활성화:
// chrome.sidePanel.setOptions({ tabId, path: 'src/sidepanel/index.html', enabled: true });
//
// ===== 5. 분석 캐시 =====
// 같은 ticketKey에 대한 분석 결과를 chrome.storage.local에 캐시.
// 캐시 유효기간: 1시간. "재분석" 클릭 시 캐시 무시.
// 캐시 항목 최대 50개. LRU 삭제. 항목당 최대 10KB.
```

## 9. 프롬프트 설계

```typescript
// src/shared/prompts.ts

export const SYSTEM_PROMPT = `You are a senior frontend developer with 10 years of experience.
Your role is to analyze project management tickets and generate actionable technical checklists
that help developers start implementation immediately.

You understand: React, Next.js, Vue, component-based architecture, REST/GraphQL APIs,
state management, CSS/Tailwind, testing, accessibility, performance optimization.

IMPORTANT RULES:
1. Only analyze information PRESENT in the ticket. Do not invent features or requirements not mentioned.
2. If the ticket is vague, focus on generating clarifying QUESTIONS rather than guessing implementation details.
3. Component/file names are ESTIMATES based on common frontend patterns. Always note this.
4. Err on the side of asking questions rather than making assumptions.
5. If external links (Figma, docs) are mentioned but you cannot access them, flag this as a limitation.`;

export const ANALYSIS_PROMPT = (ticket: TicketData, language: 'ko' | 'en') => {
  const truncationNotice = ticket.descriptionTruncated
    ? '\n\nNOTE: The description was truncated due to length. Analysis may be incomplete.'
    : '';

  return `Analyze the following Jira ticket and generate a developer-ready technical checklist.

## Ticket Information
- Key: ${ticket.key}
- Title: ${ticket.title}
- Description: ${ticket.description}${truncationNotice}
- Recent Comments: ${ticket.comments.map(c => `[${c.author}]: ${c.body}`).join('\n') || 'None'}
- Labels: ${ticket.labels.join(', ') || 'None'}
- Priority: ${ticket.priority || 'Not set'}
- Status: ${ticket.status || 'Unknown'}
- External Links: ${ticket.linkedUrls.join(', ') || 'None'}

## Output Requirements
Respond in ${language === 'ko' ? 'Korean' : 'English'}.
Return ONLY valid JSON matching this exact schema (no markdown, no backticks):

{
  "summary": "1-line technical summary of what needs to be done",
  "components": ["estimated files/components that likely need modification"],
  "tasks": [
    {
      "task": "specific actionable task description",
      "complexity": "low | medium | high",
      "notes": "edge cases, gotchas, or implementation hints"
    }
  ],
  "apiChanges": "description of API changes needed, or 'None'",
  "questions": ["ambiguous points requiring PM/designer clarification — focus here if ticket is vague"],
  "estimatedEffort": "estimated total time in hours",
  "disclaimer": "Component names are estimates based on general frontend project structure. Actual filenames in your codebase may differ."
}`;
};
```

## 10. Side Panel UI 설계

### 화면 구성
1. **헤더:** 티켓 키 + 제목, "재분석" 버튼
2. **요약 카드:** 1줄 기술 요약
3. **컴포넌트 목록:** 수정 대상 파일/컴포넌트 (코드 폰트)
4. **작업 체크리스트:** complexity 뱃지 (low=green, medium=amber, high=red)
5. **API 변경:** 있을 경우만 표시
6. **질문 목록:** PM에게 확인할 사항 (개별 복사 + 전체 복사 버튼)
7. **예상 시간**
8. **면책 문구:** "컴포넌트 이름은 일반적인 프로젝트 구조 기반 추정입니다"
9. **잘림 안내:** (해당 시) "티켓 내용이 길어 일부가 생략되었습니다"
10. **푸터:** 설정 링크, "전체 복사" 버튼 (마크다운 포맷)

### UX 흐름
1. 사용자가 확장 아이콘 클릭 → Side Panel 열림
2. Jira 티켓 페이지면 → 자동 분석 시작
3. 스트리밍으로 결과가 점진적 표시 (3~10초)
4. 완료 후 결과 캐시 (1시간)
5. 다른 티켓으로 이동 → 새 분석 자동 시작
6. 같은 티켓 재방문 → 캐시에서 즉시 표시 (+ "재분석" 버튼)
7. Jira가 아닌 페이지 → "Jira 티켓 페이지에서 사용해주세요" 안내

### 첫 사용 온보딩
1. API 키 미설정 시 → OnboardingGuide 화면
2. "OpenAI API 키 발급하기" / "Anthropic API 키 발급하기" 바로가기 버튼
3. 3단계 가이드: 가입 → 키 생성 → 붙여넣기
4. 키 입력 후 즉시 유효성 검증 (간단한 테스트 API 호출)

## 11. 에러 처리

| 상황 | UI 표시 | 액션 |
|------|---------|------|
| API 키 미설정 | 온보딩 가이드 표시 | 키 발급 바로가기 버튼 |
| API 키 무효 (401) | "API 키가 유효하지 않습니다" | 설정 화면 링크 |
| 레이트 리밋 (429) | "요청 한도 초과" | 30초 후 자동 재시도 |
| 네트워크 에러 | "네트워크 연결 확인" | "재시도" 버튼 |
| JSON 파싱 실패 | 비스트리밍 1회 재시도 → 실패 시 raw 텍스트 표시 | "구조화되지 않은 분석" 모드 |
| DOM 추출 실패 | "일부 정보를 추출하지 못했습니다" | 가능한 데이터로 분석 진행 |
| 비 Jira 페이지 | "Jira 티켓 페이지에서 사용해주세요" | — |
| SW 메시지 유실 | 자동 재시도 (최대 3회, 50ms 간격) | 실패 시 "재시도" 버튼 |
| 토큰 한도 초과 | "티켓 내용이 길어 일부 생략됨" | 자른 텍스트로 분석 진행 |
| **스트리밍 중 네트워크 끊김** | 수신된 부분 유지 + "분석 중단됨" | "재시도" 버튼 (A2) |
| **스트리밍 중 다른 티켓 이동** | 기존 스트리밍 AbortController.abort() | 새 티켓 자동 분석 시작 |
| **설정↔결과 화면 전환** | 결과를 캐시에서 복원 (A8) | React state 아닌 storage 기반 |

## 12. 보안 고려사항

- API 키는 chrome.storage.local에 저장 (같은 확장 내에서만 접근 가능)
- ⚠️ chrome.storage.local은 암호화되지 않음. 공유 컴퓨터에서 사용 시 주의 필요.
- v2에서 chrome.storage.session(브라우저 세션 동안만 유지) 옵션 추가 고려
- AI API 호출은 Service Worker에서 수행 (Content Script에서 API 키에 접근하지 않음)
- 티켓 데이터는 AI API 호출에만 사용, 별도 서버 전송 없음
- **확장 코드에 API 키를 하드코딩하지 않음** (무료 체험 없음의 이유)
- Privacy Policy에 위 사항 전부 명시
