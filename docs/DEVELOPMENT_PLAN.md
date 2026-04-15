# DEVELOPMENT_PLAN.md — Tickit

## Phase 0: 프로젝트 세팅 (Day 0, 1시간)

- [ ] Chrome Web Store 개발자 계정 등록 ($5) → https://chrome.google.com/webstore/devconsole
- [ ] OpenAI API 키 발급 (테스트용) → https://platform.openai.com/api-keys
- [ ] Anthropic API 키 발급 (테스트용) → https://console.anthropic.com/
- [ ] GitHub 저장소 생성 (public, 이름: tickit)
- [ ] 프로젝트 초기화: `pnpm create vite tickit --template react-ts`
- [ ] CRXJS 설치: `pnpm add -D @crxjs/vite-plugin`
  - ⚠️ Vite 버전 호환 문제 시 `vite-plugin-web-extension`으로 즉시 대체
- [ ] Tailwind CSS 설치 및 설정
- [ ] manifest.json 작성 (TECHNICAL_SPEC.md Section 4)
- [ ] 디렉토리 구조 생성 (TECHNICAL_SPEC.md Section 3)
- [ ] chrome://extensions에서 개발 모드로 로드 확인

---

## Phase 1: MVP 개발 (Day 1~12)

### Day 1: DOM 구조 확인 + Content Script 기초 ⭐

**첫 번째 작업은 코드 작성이 아님.**

1. 실제 회사 Jira Cloud를 Chrome DevTools로 열기
2. 티켓 제목, 설명, 댓글, 라벨, 우선순위, 상태의 실제 DOM 셀렉터 기록
3. TECHNICAL_SPEC의 추정 셀렉터와 비교하여 차이점 문서화
4. `dom-selectors.ts`에 실제 확인된 셀렉터 + fallback 셀렉터 저장
5. 간단한 Content Script 작성하여 데이터 추출 테스트

**완료 기준:** 실제 Jira 페이지에서 console.log로 티켓 데이터가 정확히 출력됨

### Day 2: Content Script 완성 + Service Worker 기초

1. `jira-extractor.ts` 완성
   - HTML → plain text 변환 (코드 블록 보존)
   - `text-truncator.ts`: ~4000자 제한 + descriptionTruncated 플래그
   - SPA 네비게이션 감지 (URL 변경 시 재추출)
2. `service-worker.ts` 기초
   - `setPanelBehavior({ openPanelOnActionClick: true })` 설정
   - Content Script → SW 메시지 수신 확인
3. `message-retry.ts`: SW idle 대비 재시도 로직

**완료 기준:** Content Script → Service Worker 메시지가 안정적으로 전달됨 (SW idle 후에도)

### Day 3~4: AI API 호출 + 프롬프트

1. `ai-client.ts` 작성
   - OpenAI GPT-4o streaming 호출
   - Anthropic Claude Sonnet streaming 호출 (`anthropic-dangerous-direct-browser-access: true` 헤더 포함)
   - ⚠️ Day 3 첫 작업: 두 API 모두 Service Worker에서 호출 테스트. 하나라도 안 되면 즉시 해결.
   - `ai-stream-parser.ts`: SSE 파싱 유틸
   - 에러 처리 (401, 429, 500, 네트워크)
   - JSON 파싱 + 실패 시 비스트리밍 재시도 (최대 2회)
2. `prompts.ts` 작성 (TECHNICAL_SPEC Section 9)
   - ⚠️ 프롬프트 핵심 원칙: "티켓에 없는 정보를 만들어내지 마라. 모호하면 질문을 생성하라."
3. 실제 회사 Jira 티켓 5~10개로 프롬프트 품질 테스트

**프롬프트 튜닝 시 확인:**
- AI가 티켓에 없는 기능을 추측하지 않는지
- questions 배열이 실제로 유의미한 질문인지
- complexity 판단이 경험적으로 합리적인지
- temperature: 0.3 (일관된 출력)

**완료 기준:** 5개 이상 실제 티켓에서 "이 체크리스트가 도움이 된다"고 느껴짐

### Day 5~6: Side Panel UI

1. `App.tsx` — 분석 결과 / 설정 / 온보딩 전환
2. `StreamingResult.tsx` — 스트리밍 중 점진적 표시 (타이핑 효과)
3. `AnalysisResult.tsx` — 완성된 결과 카드
   - complexity 뱃지 (low=green, medium=amber, high=red)
   - "전체 복사" 버튼 (마크다운 포맷)
   - "재분석" 버튼
4. `Disclaimer.tsx` — "컴포넌트 이름은 추정입니다" 안내
5. `LoadingSkeleton.tsx`, `ErrorState.tsx`
6. `OnboardingGuide.tsx` — 첫 사용 시 API 키 발급 가이드
7. `Settings.tsx` — API 키 입력, 모델/언어 선택, 키 유효성 검증
8. 다크 모드 지원

**UI 원칙:**
- 사이드 패널 너비(~400px) 최적화
- 스트리밍으로 체감 대기 시간 최소화
- 정보 밀도 높게, 장식 최소

**완료 기준:** 스트리밍 결과가 실시간으로 표시되고, 복사/재분석이 동작함

### Day 7: 본인 실사용 테스트 ⭐

- [ ] 오늘 처리할 Jira 티켓마다 Tickit 사용
- [ ] 프롬프트 부족한 부분 메모
- [ ] UI 불편한 점 메모
- [ ] "이거 없으면 불편하다"고 느끼는지 정직하게 평가
- [ ] 분석 결과를 실제 작업에 활용했는지 기록
- [ ] AI가 티켓에 없는 정보를 지어내는 경우가 있는지 확인

### Day 8~9: 피드백 반영 + 설정 완성

1. Day 7 피드백 기반 프롬프트/UI 수정
2. Settings 화면 완성
   - API 키 유효성 즉시 검증
   - 모델 선택 (GPT-4o / Claude Sonnet)
   - 출력 언어 선택 (한국어 / 영어)
   - API 키 발급 가이드 링크
3. 분석 캐시 구현 (chrome.storage.local, 1시간 유효)
4. 엣지 케이스 처리:
   - 매우 짧은 티켓 (제목만 있고 설명 없음)
   - 매우 긴 티켓 (잘림 처리 확인)
   - Jira가 아닌 페이지에서의 동작

### Day 10~11: 배포 준비

**Chrome Web Store 심사 통과 체크리스트 (OPERATIONS_GUIDE.md 참고):**

_코드 품질:_
- [ ] 모든 fetch()에 .catch() 핸들러 존재
- [ ] 모든 chrome.runtime.onMessage에 비동기 시 return true 포함
- [ ] SW 글로벌 변수에 상태 저장 없음 (chrome.storage만 사용)
- [ ] 빌드 결과물에 sourcemap 미포함
- [ ] eval(), new Function() 등 동적 코드 실행 없음
- [ ] 난독화 코드 없음 (Vite minify는 OK, 별도 obfuscation은 NG)

_권한:_
- [ ] manifest에 사용하지 않는 권한 없음
- [ ] host_permissions가 필요한 도메인만 포함

_Privacy:_
- [ ] Privacy Policy 페이지 라이브 (GitHub Pages)
- [ ] Privacy Policy URL이 404가 아닌지 시크릿 모드에서 확인
- [ ] Dashboard의 Privacy Practices 탭 체크박스 정확히 기입
- [ ] 실제 데이터 수집과 Policy 내용 일치

_Store 리스팅:_
- [ ] 아이콘 128x128 PNG
- [ ] 스크린샷 최소 3장 (1280x800), 실제 동작 화면
- [ ] 설명문에 "무엇을 하는지", "필요 조건", "데이터 처리", "권한 설명" 포함
- [ ] "Jira"를 제품명이 아닌 "Works with Jira" 형태로 사용
- [ ] 근거 없는 최상급 표현 없음 (best, fastest, #1 등)
- [ ] 카테고리: Developer Tools

_기능 테스트 (심사관 관점):_
- [ ] 확장 제거 → 재설치 → 온보딩 가이드 정상 표시
- [ ] API 키 없이 Jira 열기 → 크래시 없이 온보딩 안내
- [ ] 잘못된 API 키 → 명확한 에러 메시지
- [ ] Jira 아닌 페이지 → 안내 메시지
- [ ] 확장 아이콘 클릭 → Side Panel 열림
- [ ] 정상 분석 → 결과 표시 + 복사 동작

### Day 12: 배포 🚀

- [ ] `pnpm build` → dist 폴더 zip
- [ ] Chrome Web Store 업로드 + 심사 제출 (1~3일)
- [ ] 동료 개발자 3~5명에게 직접 공유
- [ ] 본인 실제 업무에서 계속 사용

---

## Phase 2: 검증 (Week 3~4)

### Week 3: 피드백 수집
- [ ] 동료 3~5명 피드백
  - "가장 유용한 기능은?"
  - "빠졌으면 하는 기능은?"
  - "불편한 점은?"
  - "돈을 내고 쓸 의향이 있는지?"
- [ ] 본인 사용 패턴 분석
- [ ] 프롬프트 개선
- [ ] 치명적 버그 수정

### Week 4: 외부 공개
- [ ] Product Hunt 런칭: "Tickit — Turn vague Jira tickets into dev-ready checklists"
- [ ] Reddit: r/webdev, r/programming, r/jira
- [ ] Indie Hackers 빌드 스토리
- [ ] 한국 커뮤니티: 긱뉴스, 개발자 디스코드

---

## Phase 3: 판단 기준

### Go 신호
- 2주 후 본인이 매일 사용
- 동료 3명 중 2명 이상 계속 사용
- Chrome Web Store 별점 4.0+
- Product Hunt 50+ upvote

### Pivot 신호
- 2주 후 본인도 안 씀
- 동료들이 1~2회 후 중단
- → 실패 아님. 크롬 확장 개발 경험 + AI 프롬프트 설계 경험을 다음에 재활용

### Go일 때 다음 단계
- v1.1: Linear 지원 추가
- v1.2: 비개발자 번역 모드
- v1.3: 프로젝트 컨텍스트 설정 (사용자가 컴포넌트 목록/기술 스택 입력)
- v2.0: 유료 플랜 + 프록시 서버 도입
- v2.1: 팀 플랜
- v3.0: 웹 대시보드 + 멀티 플랫폼
