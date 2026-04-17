# PROGRESS.md — Tickit 개발 진행 기록

> **매 세션 시작 시 이 파일을 먼저 읽어라.** 현재 어디까지 왔고, 다음 뭐 할지, 중간에 내린 결정이 뭔지 여기 적혀있다.
> 작업 끝낼 때마다 이 파일을 업데이트해라. DEVELOPMENT_PLAN.md는 "계획"이고, 이 파일은 "실제 진행"이다.

---

## 🎯 현재 위치

- **Phase:** 1 (MVP 개발)
- **다음 작업:** Day 2 최종 검증 — 레이블 있는 티켓 / 댓글 있는 티켓 / 외부 링크 포함 티켓 각각 추출 확인 → 통과 시 Day 3 AI 클라이언트
- **마지막 업데이트:** 2026-04-17

---

## ✅ Phase 0 — 프로젝트 세팅 (완료: 2026-04-16)

- [x] `pnpm create vite tickit --template react-ts` 스캐폴딩
- [x] CRXJS 2.4.0 설치 (Vite 8 공식 호환 확인) → Day 2에 isolated world 이슈로 `vite-plugin-web-extension`으로 피벗
- [x] Tailwind v4.2.2 + `@tailwindcss/vite` (PostCSS 없음, CSS-first)
- [x] TECHNICAL_SPEC §3 디렉토리 구조 생성 (src/{content,background,sidepanel,shared}, public/{icons,_locales}, store/)
- [x] TECHNICAL_SPEC §4 manifest.json 작성
- [x] `pnpm build` 성공 (dist/ 생성)
- [x] `pnpm dev` 동작 확인
- [x] `chrome://extensions`에 unpacked 로드 → Side Panel 열림 확인
- [x] Chrome Web Store 개발자 계정 생성 (⚠️ 비판매용 — Phase 2 유료화 시 판매용 업그레이드 필요)
- [x] 1x1 PNG placeholder 아이콘 4개 생성 (Day 10~11에 실제 디자인으로 교체)
- [x] `src/background/service-worker.ts`에서 `setPanelBehavior`를 SW top-level에서 호출 (onInstalled 안에서만 호출하면 unpacked reload 시 설정 유실 버그)

**남은 수동 작업:**
- [ ] OpenAI API 키 발급
- [ ] Anthropic API 키 발급
- [x] GitHub 리모트 연결 (`github.com/mercuryPark/tickit.git`)

---

## 🚧 Phase 1 — MVP 개발

### ✅ Day 1 — DOM 구조 확인 (완료: 2026-04-17)

- [x] 회사 Jira Cloud(OC-6167 티켓)에서 DevTools 덤프로 실제 data-testid 수집
- [x] 11개 필드 셀렉터 검증 완료: title, description, status, resolution, priority, assignee, reporter, labels, parent, fixVersions, components, dueDate
- [x] 댓글 구조 파악: `issue.activity.comments-list` → `custom-comment.container` 반복 → `-header` + `-body` 페어
- [x] `src/content/dom-selectors.ts`를 실제 검증값 기반으로 재작성 + `findCommentParts()` 헬퍼 추가

**Day 1 주요 발견:**
- 설명 본문 실제 셀렉터는 `issue.views.field.rich-text.description` (TECHNICAL_SPEC 추정과 정확히 일치)
- 상태는 button 요소(`issue-field-status.ui.status-view.status-button.status-button`)가 가장 정확
- 담당자 텍스트에 "나에게 할당" 버튼 문자열이 섞임 → 후처리 제거 필요
- `issue.views.issue-base.context.labels` testid는 **여러 필드가 공유**함 (Labels뿐 아니라 고객사, QC체크 등). primary 사용 금지
- 사용자가 티켓을 여는 주 경로는 **로드맵/보드에서 모달(drawer) 뷰** → MutationObserver 기반 감지 필수 (KNOWN_RISKS A7)
- 회사 Jira는 한국어 UI + 10개+ 커스텀 필드 (`customfield_10038`, `_10045` 등) → v2 "프로젝트 컨텍스트 설정"의 명확한 타겟

### 🚧 Day 2 — Content Script 완성 + Service Worker 기초 (대부분 검증 완료, 레이블/댓글/링크 최종 확인 중)

- [x] `src/content/jira-extractor.ts` 구현
  - [x] 셀렉터 → TicketData 변환
  - [x] **티켓 키 추출**: URL 우선 → DOM fallback (`a[href*="/browse/KEY"]` 브레드크럼, `data-testid*="issue-key"`) — 모달 뷰에서 URL이 보드 URL 그대로일 때 복구 성공
  - [x] **비티켓 페이지 가드**: 키 추출 실패 시 skip (스프린트 보드에서 "오피스웨이브 스프린트" 같은 쓰레기 추출 방지)
  - [x] HTML → plain text (코드 블록 보존, `<br>`/블록 요소 개행화, `&nbsp;` 정돈)
  - [x] 담당자 텍스트에서 "나에게 할당" / "Assign to me" 제거
  - [x] `text-truncator.ts` 4000자 cap + `descriptionTruncated` 플래그
  - [x] SPA 네비게이션 감지 (Navigation API + 1s polling fallback)
  - [x] 모달 뷰 MutationObserver (보드/로드맵 drawer) — heuristic: `issue-view`/`issue.views` testid 또는 summary heading 포함 노드
  - [x] 추출 디바운스 300ms (연속 DOM 변화 방어)
  - [x] **Labels 추출 v2**: chip 전용 셀렉터만 사용 (Atlassian Lozenge, `a[href*="labels="]`, sortable-item 자식 anchor). fallback으로 일반 span/a 긁는 건 폐기 → toolbar 버튼 "레이블 보기 옵션" 같은 UI chrome 오추출 차단. 레이블 없으면 `[]`.
- [x] `src/background/service-worker.ts` 확장
  - [x] `chrome.runtime.onMessage`로 TICKET_DATA_EXTRACTED 수신 + 로그
  - [x] **`return true`** 비동기 응답용 (REQUEST_ANALYSIS는 `false` 반환, Day 3에서 구현)
  - [x] `chrome.tabs.onUpdated`로 URL 변경 감지 → `MessageToCS.URL_CHANGED` 전송 (CS 미주입 시 graceful)
- [x] `src/shared/types.ts`에 `MessageToCS` 추가 (URL_CHANGED / FORCE_RE_EXTRACT)
- [x] `src/shared/message-retry.ts` 통합 — Content Script에서 실제 사용
- [x] `pnpm lint` / `pnpm build` 통과
- [x] **빌드 시스템 피벗**: CRXJS → `vite-plugin-web-extension` (상세는 결정 로그 참조)
- [x] 실제 Jira에서 isolated world 동작 확인 (`chrome.runtime.sendMessage` 접근 OK)
- [x] 실제 티켓(OC-6168)에서 key/title/description/truncated 플래그 정상 추출 확인
- [x] 모달 뷰(`reason: 'modal-observer'`) + URL polling(`reason: 'url-poll'`) 둘 다 트리거 확인
- [ ] **최종 검증 대기**:
  - [ ] 레이블이 실제로 달린 티켓 → chip 셀렉터가 실제 label 값 잡는지 (현재 chip 셀렉터가 mercury Jira 인스턴스 DOM과 맞는지 미검증)
  - [ ] 댓글이 있는 티켓 → `comments.length > 0` + author/body/createdAt 3필드 모두 채워짐
  - [ ] Figma/GitHub 외부링크 포함 티켓 → `linkedUrls`에 수집
  - [ ] 4000자 초과 설명 티켓 → `truncated: true`
  - [ ] SW idle(~30초 방치) 후 네비게이션 → `sendMessageWithRetry` 재시도 성공
  - [ ] 비 Jira 페이지 (`google.com`) → content script 미주입, 에러 없음

**검증 중 셀렉터 mismatch 발견 시 대응:** `src/content/dom-selectors.ts`의 해당 필드 배열 앞에 새 셀렉터 추가 + "🧠 주요 결정/발견 로그"에 1줄 기록. Labels chip 셀렉터는 `jira-extractor.ts`의 `LABEL_CHIP_SELECTORS` 배열에 추가.

### Day 3~4 — AI API 호출 + 프롬프트
### Day 5~6 — Side Panel UI
### Day 7 — 본인 실사용 테스트
### Day 8~9 — 피드백 반영 + 설정 완성
### Day 10~11 — 배포 준비
### Day 12 — 배포

---

## 🧠 주요 결정/발견 로그

| 일자 | 결정/발견 | 근거 |
|------|----------|------|
| 2026-04-16 | CRXJS 2.4.0 사용 (vite-plugin-web-extension 대체 불필요) | npm view로 Vite 8 공식 호환 확인 |
| 2026-04-16 | Tailwind v4 + `@tailwindcss/vite` (PostCSS 없이 CSS-first) | v4 최신 권장, `tailwind.config.ts` 생략 |
| 2026-04-16 | `setPanelBehavior`를 SW top-level에서 호출 | onInstalled 안에서만 호출 시 unpacked reload 후 설정 유실 |
| 2026-04-17 | 아이콘은 placeholder 1x1 PNG (Day 10~11 교체) | 초기 빌드/로드 검증이 목적, 디자인 작업 지연 |
| 2026-04-17 | `issue.views.issue-base.context.labels` testid를 labels primary에서 제외 | 여러 필드 공유 확인됨, 오추출 위험 |
| 2026-04-17 | `sortable-item-container-labels`를 Labels primary로 사용 | 필드 고유 식별자 |
| 2026-04-17 | ESLint `@typescript-eslint/no-unused-vars`에 `argsIgnorePattern: '^_'` 추가 + `require-yield` off | Phase 0 placeholder(ai-client, ai-stream-parser)의 시그니처 고정 관행 허용 |
| 2026-04-17 | Content Script 추출은 300ms 디바운스 | MutationObserver + Navigation API + URL polling이 동시 트리거될 수 있음. 디바운스로 1회로 수렴 |
| 2026-04-17 | `lastProcessedUrl`은 성공 추출 시점에만 갱신 | DOM 미로드로 실패한 URL도 다음 polling tick에서 재시도 가능해야 함 |
| 2026-04-17 | SW `chrome.tabs.onUpdated`가 CS에 `URL_CHANGED` 송신. CS 미주입 시 sendMessage 실패는 graceful 삼킴 | 탭 새로 열렸거나 비 Jira 페이지는 CS가 없음. 에러로 두면 SW 콘솔 오염 |
| 2026-04-17 | **빌드 시스템 CRXJS → `vite-plugin-web-extension` 피벗** | CRXJS 2.4.0이 content script를 loader + 동적 `import(chrome.runtime.getURL(...))` 패턴으로 주입하는데, 로드된 모듈이 isolated world를 잃고 page world에서 실행됨 → `chrome.runtime` undefined → 메시지 전송 불가. `vite-plugin-web-extension`은 각 엔트리를 IIFE로 사전 번들하여 content script 파일로 직접 주입, isolated world 유지. CLAUDE.md에 사전 허용된 fallback. |
| 2026-04-17 | `console.debug` 대신 `console.log` 사용 (테스트 필수 로그만) | Chrome DevTools 기본 "Log levels"가 debug(Verbose)를 숨김. 사용자 테스트 시 로그가 안 보인다는 혼동 발생. 핵심 로그는 log, 선택적 진단은 debug 유지. |
| 2026-04-17 | 티켓 키 추출 URL → DOM fallback 체인 | 보드/로드맵에서 모달로 티켓을 열면 URL은 보드 URL 그대로 유지 → URL 정규식이 빈 문자열 반환. 브레드크럼 `a[href*="/browse/KEY"]`에서 키를 복구. 그래도 못 찾으면 티켓 페이지 아님 → 추출 skip. |
| 2026-04-17 | Labels 추출을 chip 전용 셀렉터로 제한 + fallback 폐기 | 일반 span/a 긁기 fallback이 toolbar 버튼 "레이블 보기 옵션" 같은 UI chrome을 잡음. 블록리스트 regex(`^레이블$` 등)는 "레이블보기 옵션" 처럼 공백 없이 붙은 button aria-label 텍스트를 놓침. chip 전용 셀렉터(`[data-smart-element="Lozenge"]`, `a[href*="labels="]`)만 사용하고 fallback 제거 — 레이블 0개면 `[]`. 새 Jira 인스턴스마다 chip DOM 검증 필요. |

---

## 📌 업데이트 규칙

작업 끝날 때마다 이 파일을 수정한다:

1. 해당 Day의 체크박스 완료 표시
2. 완료한 Day 섹션에 **완료 일자** 기입
3. 중간에 내린 설계 결정은 **주요 결정/발견 로그**에 1줄 추가
4. **현재 위치** 섹션의 "다음 작업"을 최신화
5. 변경을 git에 커밋 (다른 파일들과 묶어서 OK)

이 파일이 최신이면, 새 세션의 Claude가 맥락을 완벽히 복원할 수 있다.
