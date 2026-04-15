# KNOWN_RISKS.md — Tickit 기술 리스크 & 대응

> 개발 중 반드시 인지하고 있어야 할 리스크와 대응 전략.
> 이 문서는 2차례 심층 리뷰를 통해 도출된 15개 이슈를 정리한 것입니다.

---

## 심각도: 높음

### R1. Jira DOM 셀렉터 불안정
**리스크:** Jira Cloud는 data-testid를 자주 변경함. TECHNICAL_SPEC의 셀렉터는 추정값이며 실제와 다를 수 있음.
**대응:** Day 1에 실제 DOM 확인 우선. 각 필드에 2~3개 fallback 셀렉터. 추출 실패 시 graceful 처리 (빈 문자열 반환, 에러 아님).
**모니터링:** 매 Chrome/Jira 업데이트 후 셀렉터 동작 확인.

### R2. Anthropic 공식 "Claude in Chrome" 경쟁
**리스크:** Anthropic이 직접 브라우저 AI 에이전트 출시. Jira 포함 모든 웹페이지에서 동작.
**대응:** Tickit의 차별점을 명확히: ①원클릭 자동 분석(프롬프트 불필요) ②일관된 구조화 출력(JSON) ③무료(BYOK) ④Jira 특화 프롬프트.
**모니터링:** Claude in Chrome의 Jira 관련 기능 업데이트 추적.

### R3. API 키 하드코딩 금지
**리스크:** 무료 체험을 위해 확장에 API 키를 내장하면, 코드 분석으로 키 탈취 가능.
**결정:** MVP에서 무료 체험 없음. BYOK only. Phase 2에서 프록시 서버 도입 시 무료 체험/유료 플랜 제공.

---

## 심각도: 중간

### R4. Service Worker 비활성화 (Idle)
**리스크:** MV3 Service Worker는 30초~5분 비활동 후 종료. Content Script 메시지 유실 가능.
**대응:** `message-retry.ts` 구현. chrome.runtime.sendMessage 실패 시 50ms 후 재시도 (최대 3회). 에러 메시지에 수동 "재시도" 버튼.

### R5. Side Panel 자동 열림 제한
**리스크:** Chrome은 프로그래밍으로 Side Panel을 자동 열기 불가. 사용자 제스처(클릭) 필요.
**대응:** `setPanelBehavior({ openPanelOnActionClick: true })`로 확장 아이콘 클릭 = Side Panel 열기. 한 번 열면 유지됨. 열린 상태에서 Jira 티켓 이동 시 자동 재분석.

### R6. action.default_popup과 Side Panel 충돌
**리스크:** manifest에 popup과 side_panel을 동시 선언하면 아이콘 클릭 동작이 충돌.
**결정:** popup을 사용하지 않음. 아이콘 클릭 = Side Panel 열기로 통일.

### R7. Anthropic API CORS
**리스크 (해소됨):** Anthropic은 2024년 8월부터 CORS 공식 지원. `anthropic-dangerous-direct-browser-access: true` 헤더 추가로 브라우저 직접 호출 가능.
**주의:** 이 헤더명이 사용자에게 불안감을 줄 수 있음. Settings에서 별도 설명 불필요 (내부 구현 디테일).

### R8. CRXJS Vite 호환성
**리스크:** CRXJS가 특정 Vite 버전과 호환되지 않을 수 있음.
**대응:** Phase 0에서 CRXJS 세팅 실패 시 즉시 `vite-plugin-web-extension`으로 전환. 두 도구의 manifest 처리 방식이 다르므로 전환 시 설정 조정 필요.

### R9. 토큰 한도 초과
**리스크:** 매우 긴 티켓 설명 + 다수 댓글 = AI API 토큰 한도 초과.
**대응:** `text-truncator.ts`에서 합산 ~4000자 제한. `descriptionTruncated: true` 플래그로 UI에 안내. 댓글은 최근 5개만 포함.

---

## 심각도: 낮음

### R10. Jira Data Center 미지원
**리스크:** host_permissions가 *.atlassian.net만 매칭. 온프레미스 Jira(자체 도메인) 미지원으로 별점 1점 리뷰 가능.
**대응:** Chrome Web Store 설명과 설정 화면에 "Jira Cloud only" 명시. v1.1~v1.2에서 사용자 커스텀 도메인 입력 기능 추가 고려.

### R11. chrome.storage.local 보안 한계
**리스크:** API 키가 암호화 없이 저장됨. 공유 컴퓨터에서 DevTools로 읽을 수 있음.
**대응:** Privacy Policy에 경고 명시. v2에서 chrome.storage.session (브라우저 세션 동안만 유지) 옵션 추가.

### R12. 프롬프트 기반 컴포넌트 이름 정확도
**리스크:** AI가 프로젝트 코드에 접근하지 못하므로, 추천 컴포넌트 이름이 실제와 다를 수 있음.
**대응:** 모든 출력에 면책 문구 포함. v2에서 사용자가 "프로젝트 컨텍스트" (기술 스택, 주요 컴포넌트 목록)를 설정하는 기능 추가.

### R13. AI 응답 속도 UX
**리스크:** Claude Sonnet은 GPT-4o보다 응답이 느릴 수 있음. 10초 이상 대기 시 사용자 이탈.
**대응:** 두 API 모두 streaming 모드로 호출하여 결과를 점진적 표시. StreamingResult 컴포넌트로 타이핑 효과.

### R14. 시나리오 기대치 비현실성
**리스크:** 모호한 티켓에 대해 AI가 마법처럼 정확한 분석을 내놓을 것이라는 기대는 비현실적.
**대응:** SCENARIOS.md를 현실적으로 수정 완료. 핵심 원칙: "모호하면 tasks 대신 questions를 생성하라." 사용자에게도 이 도구가 "완벽한 분석"이 아니라 "시작점과 질문 목록"을 제공한다고 포지셔닝.

### R15. Atlassian 상표 사용
**리스크:** 제품명이나 설명에 "Jira"를 사용할 때 Atlassian 상표 정책 위반 가능.
**대응:** 제품명을 "Tickit"으로 설정 (Jira 미포함). 설명에서는 "Works with Jira" 형태로 사용 (Atlassian 가이드라인 준수). "Jira"는 Atlassian의 등록 상표임을 명시.
