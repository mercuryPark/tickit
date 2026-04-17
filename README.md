# Tickit

> **모호한 Jira 티켓을, 개발자가 바로 쓰는 기술 체크리스트로.**
> AI가 티켓을 읽고 _컴포넌트 추정, 작업 분해, 질문 목록_을 만들어 준다. 서버 없이 브라우저에서 끝.

<p align="left">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white">
  <img alt="Status" src="https://img.shields.io/badge/status-MVP%20in%20progress-yellow">
</p>

---

## 왜 만들었나

"로그인 안 됨 고쳐주세요" 같은 **한 줄짜리 티켓**을 받으면, 개발자는 매번 동일한 작업을 반복한다:

1. 뭘 만들어야 하는지 파악
2. 어떤 컴포넌트/파일을 건드려야 하는지 추정
3. PM한테 되물어야 할 것들 정리
4. 작업 분해 & 시간 추정

Tickit은 이 4단계를 **아이콘 한 번 클릭**으로 해치운다. 프롬프트를 쓸 필요도, 복사·붙여넣기를 할 필요도 없다.

---

## 무엇을 해주는가

| | |
|---|---|
| 🔎 **요약** | 티켓이 기술적으로 뭘 요구하는지 1줄로 |
| 🧩 **영향 컴포넌트 추정** | 일반적인 프론트엔드 구조 기준 — 파일명 힌트 |
| ✅ **작업 체크리스트** | complexity 뱃지(low/medium/high) 달린 할 일 목록 |
| 🔌 **API 변경 예상** | 필요한 엔드포인트·스키마 변경 |
| ❓ **PM에게 물어볼 질문** | 모호한 티켓일수록 이 섹션이 커진다 |
| ⏱️ **예상 작업 시간** | 거친 러프 에스티메이트 |

> 컴포넌트 이름과 파일명은 일반 프로젝트 구조 기반 **추정**이다. 실제 코드베이스와 다를 수 있다 (AI는 사용자 레포를 보지 않는다).

---

## 어떻게 동작하나

```
┌──────────────────────────── 브라우저 ─────────────────────────────┐
│                                                                  │
│  Jira 티켓 페이지                                                  │
│  ┌─────────────────┐    chrome.runtime    ┌──────────────────┐   │
│  │  Content Script │ ────── message ────▶ │  Service Worker  │   │
│  │  • DOM 추출      │    (SW idle 시       │  • 프롬프트 구성   │   │
│  │  • ~4000자 cap  │       자동 재시도)     │  • AI API 스트림  │   │
│  │  • SPA 내비 감지  │                     └─────────┬────────┘   │
│  └─────────────────┘                               │            │
│                                                    ▼            │
│                                           ┌──────────────────┐  │
│                                           │    Side Panel    │  │
│                                           │   (React 19)     │  │
│                                           └──────────────────┘  │
│                                                                  │
│  chrome.storage.local  ◀──  API 키 · 설정 · 1h 분석 캐시(LRU)       │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼  HTTPS (사용자 API 키로 직접 호출)
                   OpenAI  ·  Anthropic
```

**핵심 원칙 — 서버 없음.** 모든 로직이 브라우저 확장 안에서 돈다. 티켓 내용은 사용자가 고른 AI 서비스에만 전송되고, 제3자에게 저장·공유되지 않는다.

---

## BYOK — 내 API 키 사용

Tickit은 **무료 체험용 키를 내장하지 않는다.** 확장 코드는 누구나 뜯어볼 수 있어서, 내장 키는 즉시 탈취된다. 대신:

- OpenAI 또는 Anthropic API 키를 각자 발급받아 설정에 입력
- 키는 `chrome.storage.local`에만 저장 (자체 서버로 올리지 않음)
- Anthropic CORS 직접 호출 공식 지원 (`anthropic-dangerous-direct-browser-access: true`)

---

## 기술 스택

- **TypeScript** (strict) · **React 19** · **Vite 8 + vite-plugin-web-extension**
- **Manifest V3** — Side Panel API · Storage API · ActiveTab
- **Tailwind CSS v4** (`@tailwindcss/vite`, PostCSS 없이 CSS-first)
- **OpenAI** GPT-4o · **Anthropic** Claude Sonnet 4.6 (둘 다 streaming)
- **pnpm**

---

## 개발

### 요구 사항
- Node.js 20+ · pnpm 9+
- Chrome (최신)

### 셋업
```bash
pnpm install
pnpm dev     # CRXJS HMR 개발 빌드
# 또는
pnpm build   # 프로덕션 빌드 → dist/
```

### 확장 로드
1. `chrome://extensions` 열기
2. 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** → `dist/` 선택
4. 툴바 아이콘 클릭 → Side Panel 열림
5. `*.atlassian.net/browse/XXX-000` 같은 Jira 티켓 페이지로 이동 → 자동 분석 시작

### 디렉토리 구조
```
src/
├── content/          Jira DOM 추출 + SPA 네비게이션 감지
├── background/       Service Worker (메시지 라우팅, AI 호출, 캐시)
├── sidepanel/        React UI (분석 결과 / 설정 / 온보딩)
└── shared/           공유 타입 · AI 클라이언트 · 스토리지 래퍼
public/
├── icons/            확장 아이콘 (16/32/48/128)
└── _locales/         Chrome 확장 i18n (en, ko)
docs/                 프로젝트 문서 (PROGRESS.md 먼저 읽기)
```

---

## 지원 범위 & 한계

| | |
|---|---|
| ✅ Jira **Cloud** (`*.atlassian.net`) | 지원 |
| ❌ Jira Data Center / Server (자체 도메인) | v1 미지원 |
| ❌ Figma/외부 문서 내용 분석 | AI가 링크를 열지 못함 (언급만 반영) |
| ❌ 실제 코드베이스 참조 | 파일명/컴포넌트는 추정값 |
| ⚠️ 긴 티켓 (>4000자) | 잘림 + UI에 안내 표시 |

---

## 로드맵

- **v0.1 (MVP)** — Jira Cloud + OpenAI/Anthropic BYOK, Side Panel UI, 1h 캐시
- **v0.2** — Linear 지원
- **v0.3** — 비개발자 번역 모드
- **v2** — 사용자 지정 프로젝트 컨텍스트(실제 컴포넌트 목록)
- **v1.0** — 유료 플랜 + 프록시 기반 무료 체험

상세 진행 상황: [`docs/PROGRESS.md`](docs/PROGRESS.md)

---

## 문서

| 문서 | 목적 |
|---|---|
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | 매 세션 먼저 읽는 실제 진행 로그 |
| [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) | 비즈니스 맥락, 경쟁 분석 |
| [`docs/TECHNICAL_SPEC.md`](docs/TECHNICAL_SPEC.md) | 아키텍처·타입·프롬프트 설계 |
| [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) | Day-by-day 구현 계획 |
| [`docs/SCENARIOS.md`](docs/SCENARIOS.md) | 실제 사용 시나리오 |
| [`docs/KNOWN_RISKS.md`](docs/KNOWN_RISKS.md) | 기술 리스크 & 대응 |
| [`docs/OPERATIONS_GUIDE.md`](docs/OPERATIONS_GUIDE.md) | CWS 심사 / SW 수명주기 / DOM 유지보수 |

---

## 프라이버시

- 수집 데이터: 사용자가 입력한 **API 키**, 분석하려는 **Jira 티켓 텍스트**
- 전송 대상: 사용자가 선택한 AI 서비스(OpenAI 또는 Anthropic) **단 한 곳**
- 자체 서버 **없음**. 텔레메트리 **없음**. 제3자 공유 **없음**.
- API 키는 `chrome.storage.local`에 평문 저장 → **공유 컴퓨터에서 사용 지양**.
- 확장 제거 시 모든 로컬 데이터가 자동 삭제된다.

---

## 상표

"Jira"는 Atlassian의 등록 상표이며, Tickit은 Atlassian과 무관한 독립 프로젝트다.
