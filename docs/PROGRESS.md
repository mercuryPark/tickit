# PROGRESS.md — Tickit 개발 진행 기록

> **매 세션 시작 시 이 파일을 먼저 읽어라.** 현재 어디까지 왔고, 다음 뭐 할지, 중간에 내린 결정이 뭔지 여기 적혀있다.
> 작업 끝낼 때마다 이 파일을 업데이트해라. DEVELOPMENT_PLAN.md는 "계획"이고, 이 파일은 "실제 진행"이다.

---

## 🎯 현재 위치

- **Phase:** 1 (MVP 개발)
- **다음 작업:** Day 2 — `jira-extractor.ts` 구현 (셀렉터는 검증 완료, 실제 추출 로직 미작성)
- **마지막 업데이트:** 2026-04-17

---

## ✅ Phase 0 — 프로젝트 세팅 (완료: 2026-04-16)

- [x] `pnpm create vite tickit --template react-ts` 스캐폴딩
- [x] CRXJS 2.4.0 설치 (Vite 8 공식 호환 확인 — fallback 불필요)
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
- [ ] GitHub 리모트 연결 (현재 로컬 git repo만 있음)

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

### ⏭️ Day 2 — Content Script 완성 + Service Worker 기초 (다음 작업)

- [ ] `src/content/jira-extractor.ts` 구현
  - [ ] 셀렉터 → TicketData 변환
  - [ ] HTML → plain text (코드 블록 보존)
  - [ ] 담당자 텍스트에서 "나에게 할당" 제거
  - [ ] `text-truncator.ts` 4000자 cap + `descriptionTruncated` 플래그
  - [ ] SPA 네비게이션 감지 (Navigation API + fallback interval)
  - [ ] 모달 뷰 MutationObserver (로드맵 drawer)
- [ ] `src/background/service-worker.ts` 확장
  - [ ] `chrome.runtime.onMessage`로 TICKET_DATA_EXTRACTED 수신
  - [ ] **`return true` 필수** (OPERATIONS_GUIDE §2.3)
  - [ ] `chrome.tabs.onUpdated`로 URL 변경 감지 → Content Script에 재추출 신호
- [ ] `src/shared/message-retry.ts` 통합 — Content Script에서 실제 사용
- [ ] 수동 테스트: Jira 티켓 열면 Content Script → SW 메시지 수신 로그 확인

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

---

## 📌 업데이트 규칙

작업 끝날 때마다 이 파일을 수정한다:

1. 해당 Day의 체크박스 완료 표시
2. 완료한 Day 섹션에 **완료 일자** 기입
3. 중간에 내린 설계 결정은 **주요 결정/발견 로그**에 1줄 추가
4. **현재 위치** 섹션의 "다음 작업"을 최신화
5. 변경을 git에 커밋 (다른 파일들과 묶어서 OK)

이 파일이 최신이면, 새 세션의 Claude가 맥락을 완벽히 복원할 수 있다.
