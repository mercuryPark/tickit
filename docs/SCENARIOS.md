# SCENARIOS.md — Tickit 실제 사용 시나리오

> 프롬프트 튜닝과 UI 검증 기준으로 활용합니다.
> ⚠️ AI는 티켓에 없는 정보를 추론하지 않습니다. 기대 출력은 "티켓에 적힌 내용 기반"입니다.

---

## 시나리오 1: PM의 모호한 티켓 (MVP 핵심)

**입력 티켓:**
- 제목: "로그인 화면 개선"
- 설명: "사용자 피드백 반영해서 로그인 화면 개선해주세요. 디자인은 피그마에 있습니다."
- 첨부 링크: Figma URL 1개

**현실적 AI 출력:**
```json
{
  "summary": "로그인 화면 UI 개선 (구체적 변경 범위는 Figma 확인 필요)",
  "components": ["LoginForm 관련 컴포넌트 (정확한 파일명은 프로젝트 구조에 따라 다름)"],
  "tasks": [
    {
      "task": "Figma 디자인 확인하여 현재 대비 변경 사항 목록 작성",
      "complexity": "low",
      "notes": "이 단계가 선행되어야 구체적 작업 범위 확정 가능"
    },
    {
      "task": "변경 사항에 따른 컴포넌트 수정/추가",
      "complexity": "medium",
      "notes": "Figma 확인 전까지 정확한 복잡도 판단 어려움"
    }
  ],
  "apiChanges": "Figma 디자인 확인 전까지 판단 불가",
  "questions": [
    "'사용자 피드백'이 구체적으로 어떤 피드백인지? (예: 소셜 로그인 추가, UI 변경, 성능 등)",
    "디자인 변경 범위가 로그인 폼만인지, 회원가입/비밀번호 찾기까지 포함하는지?",
    "Figma에 명시되지 않은 기능 변경(API, 로직)도 있는지?",
    "기존 로그인 로직(유효성 검사 등)은 유지하는지?"
  ],
  "estimatedEffort": "Figma 확인 후 판단 가능. UI만 변경 시 4~8시간, 기능 추가 시 8~16시간 예상",
  "disclaimer": "컴포넌트 이름은 일반적인 프론트엔드 프로젝트 구조 기반 추정입니다."
}
```

**핵심 포인트:** 이 시나리오에서 AI가 "소셜 로그인 추가"를 추측하면 안 됨. 티켓에 그런 정보가 없으므로 질문으로 확인해야 함.

**절약 시간:** PM에게 물어볼 질문이 즉시 정리됨 → 15~25분

---

## 시나리오 2: 구체적인 버그 티켓

**입력 티켓:**
- 제목: "결제 페이지에서 쿠폰 적용 시 총액이 잘못 표시됨"
- 설명: "쿠폰 코드를 입력하면 할인 금액은 표시되지만, 최종 결제 금액에 반영이 안 됩니다. 결제 버튼을 누르면 실제로는 할인된 금액으로 결제됩니다. 즉 표시만 잘못된 상태입니다."

**현실적 AI 출력:**
```json
{
  "summary": "결제 페이지 쿠폰 적용 시 최종 금액 UI 표시 오류 (실제 결제는 정상)",
  "components": ["결제 페이지 컴포넌트 (금액 표시 영역)", "쿠폰 적용 관련 상태 관리 로직"],
  "tasks": [
    {
      "task": "쿠폰 적용 후 최종 금액 계산/표시 로직 디버깅",
      "complexity": "medium",
      "notes": "할인 금액은 정상 표시되므로, 최종 금액 합산 부분에서 상태 반영이 누락된 것으로 추정"
    },
    {
      "task": "쿠폰 적용/제거/변경 시 금액 표시 업데이트 확인",
      "complexity": "low",
      "notes": "edge case: 복수 쿠폰, 100% 할인, 최소 결제 금액"
    },
    {
      "task": "수정 후 결제 테스트 (표시 금액과 실제 결제 금액 일치 확인)",
      "complexity": "low",
      "notes": ""
    }
  ],
  "apiChanges": "None (표시 문제이며 실제 결제는 정상 작동)",
  "questions": [
    "특정 쿠폰 유형에서만 발생하는지, 모든 쿠폰에서 발생하는지?",
    "재현 가능한 특정 쿠폰 코드가 있는지?"
  ],
  "estimatedEffort": "3~5시간",
  "disclaimer": "컴포넌트 이름은 일반적인 프론트엔드 프로젝트 구조 기반 추정입니다."
}
```

**핵심 포인트:** 구체적 티켓에서는 questions가 적고 tasks가 actionable함.

**절약 시간:** 30~45분

---

## 시나리오 3: 기술 이슈의 비개발자 번역 (v2 기능, MVP 아님)

**입력 티켓:**
- 제목: "useEffect cleanup 누락으로 메모리 릭"
- 설명: "StrictMode에서 double mount 시 race condition으로 stale closure 참조. AbortController로 fetch 취소 처리 필요."

**MVP에서의 AI 출력 (개발자 모드만):**
```json
{
  "summary": "useEffect에서 fetch cleanup 누락으로 인한 race condition 및 메모리 릭 수정",
  "components": ["해당 useEffect가 있는 컴포넌트 (티켓에서 특정되지 않음)"],
  "tasks": [
    {
      "task": "문제의 useEffect에 AbortController 기반 cleanup 추가",
      "complexity": "medium",
      "notes": "StrictMode double mount에서 테스트 필요"
    },
    {
      "task": "동일 패턴 사용하는 다른 useEffect도 점검",
      "complexity": "low",
      "notes": "프로젝트 전체 grep: useEffect + fetch"
    }
  ],
  "apiChanges": "None",
  "questions": [
    "어떤 페이지/컴포넌트에서 발생하는지 특정할 수 있는지?",
    "재현 조건이 StrictMode에서만인지, production에서도 발생하는지?"
  ],
  "estimatedEffort": "2~4시간",
  "disclaimer": "컴포넌트 이름은 일반적인 프론트엔드 프로젝트 구조 기반 추정입니다."
}
```

---

## 시나리오 4: 신규 입사자가 받은 맥락 부족 티켓

**입력 티켓:**
- 제목: "FE-892 관련 regression fix"
- 설명: "기존 PR #1247 참고. OrderSummary에서 discountApplied 플래그 처리 로직 재확인 필요."

**현실적 AI 출력:**
```json
{
  "summary": "이전 이슈 FE-892의 수정이 회귀(regression)한 것으로 보임. OrderSummary의 할인 플래그 처리 확인 필요",
  "components": ["OrderSummary 관련 컴포넌트"],
  "tasks": [
    {
      "task": "PR #1247의 변경 내용 확인 (FE-892 원본 수정 이해)",
      "complexity": "medium",
      "notes": "이 AI는 PR이나 코드에 접근할 수 없음. 직접 확인 필요."
    },
    {
      "task": "OrderSummary에서 discountApplied 플래그가 어떻게 전달/사용되는지 추적",
      "complexity": "medium",
      "notes": "최근 리팩토링으로 props 전달 경로가 변경되었을 가능성"
    },
    {
      "task": "할인 적용/미적용 케이스 모두 수동 테스트",
      "complexity": "low",
      "notes": "edge case: 100% 할인, 복합 쿠폰, 할인 만료"
    }
  ],
  "apiChanges": "None (UI 표시 관련 regression으로 추정)",
  "questions": [
    "FE-892가 정확히 어떤 버그였는지 요약해줄 수 있는지?",
    "regression이 언제부터 발생했는지? (특정 배포/커밋 이후?)",
    "PR #1247 이후에 OrderSummary 관련 변경이 있었는지?"
  ],
  "estimatedEffort": "3~6시간 (맥락 파악 시간 포함)",
  "disclaimer": "컴포넌트 이름은 일반적인 프론트엔드 프로젝트 구조 기반 추정입니다."
}
```

**핵심 포인트:** AI가 PR이나 코드를 볼 수 없다는 한계를 명시적으로 알려줌.

---

## 시나리오 5: 피그마 링크만 있는 디자인 변경 티켓

**입력 티켓:**
- 제목: "마이페이지 리디자인"
- 설명: "피그마 링크: [URL]. 디자인대로 수정 부탁드립니다 🙏"

**현실적 AI 출력:**
```json
{
  "summary": "마이페이지 리디자인 (구체적 변경 범위는 Figma 확인 필요)",
  "components": ["마이페이지 관련 컴포넌트 (정확한 파일명은 프로젝트 구조에 따라 다름)"],
  "tasks": [
    {
      "task": "Figma 디자인 확인하여 현재 대비 변경 사항 목록 작성",
      "complexity": "low",
      "notes": "가장 먼저 해야 할 작업"
    },
    {
      "task": "변경 사항 기반으로 컴포넌트별 작업 분해",
      "complexity": "medium",
      "notes": "Figma 확인 전까지 구체적 분해 불가"
    }
  ],
  "apiChanges": "Figma 확인 전까지 판단 불가",
  "questions": [
    "⚠️ 이 AI는 Figma 파일에 접근할 수 없습니다. 주요 변경 사항을 텍스트로 설명해주실 수 있나요?",
    "리디자인 범위가 레이아웃만인지, 기능 변경도 포함하는지?",
    "반응형 breakpoint 기준이 있는지?",
    "새로운 컴포넌트가 필요한지, 기존 컴포넌트 수정만으로 충분한지?",
    "디자인 시스템에 없는 새 요소가 있는지?"
  ],
  "estimatedEffort": "Figma 확인 후 판단 가능",
  "disclaimer": "컴포넌트 이름은 일반적인 프론트엔드 프로젝트 구조 기반 추정입니다."
}
```

**핵심 포인트:** Figma에 접근할 수 없다는 한계를 첫 번째 질문으로 명확히 안내.

---

## 프롬프트 튜닝 체크리스트

각 시나리오 테스트 시:

1. **환각 검사:** AI가 티켓에 없는 기능/요구사항을 만들어내지 않는지
2. **질문 품질:** 모호한 티켓에서는 tasks보다 questions가 더 많아야 함
3. **한계 인정:** Figma, 코드, PR에 접근할 수 없다는 것을 적절히 알리는지
4. **complexity 합리성:** 경험적으로 맞는지
5. **면책 문구:** 컴포넌트 이름이 추정이라는 것을 항상 포함하는지
6. **구체적 티켓 vs 모호한 티켓:** 구체적 티켓에서는 tasks가 상세하고, 모호한 티켓에서는 questions가 많은지
