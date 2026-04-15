# PROJECT_CONTEXT.md — Tickit

## 1. 프로젝트 개요

**제품명:** Tickit
**형태:** Chrome Extension (Manifest V3)
**한 줄 설명:** PM/디자이너가 작성한 모호한 Jira 티켓을 개발자용 기술 체크리스트로 자동 변환하는 크롬 확장

## 2. 창업자 프로필

- AI를 잘 활용하는 프론트엔드 전문 개발자
- 풀스택 가능 (백엔드 Node/Python, React Native, 노코드/자동화, AI/ML API)
- 현재 웹앱/서비스 개발 본업
- 하루 2~3시간 부업에 투자 가능
- 가장 귀찮은 반복 업무: 디자이너/PM과의 소통 (피그마, 슬랙, 지라)

## 3. 우선순위

1. 시간 투자 최소화 (자동화 수익)
2. 빠른 첫 수익 (1~3개월 내)
3. 장기적 규모 (느려도 큰 수익)
4. 전문성 브랜딩에도 도움

## 4. 왜 이 아이템인가

### 시장 데이터
- GitLab 2024 DevSecOps Survey: 개발자의 67%가 "불명확한 요구사항"을 지연의 최대 원인으로 꼽음
- IDC 2024: 개발자가 실제 코드 개발에 쓰는 시간은 전체의 16%
- Atlassian 2024 State of Teams: 잘 정의된 티켓 사용 팀이 스프린트당 25% 더 많은 기능 출시
- Bitmovin 해커톤: AI로 티켓 분석하여 엔지니어 왕복 대화 제거 솔루션 실험

### 커뮤니티 목소리
- Atlassian Community: "Jira 티켓을 열었는데 답보다 질문이 더 많았던 적 있나요?"
- Atlassian 서비스 관리 리드: "개발자들이 기술 용어와 약어를 너무 많이 써서 리뷰 과정의 왕복 대화가 시간을 잡아먹는다"
- HackerNews: "매니저들이 워크플로우와 커스텀 필드를 만지작거려서 모든 개발자를 화나게 한다"
- DEV Community: "PM이 에픽을 만든다. 두 문장, 모호한 인수 조건, 피그마 링크 하나."
- Linear CEO Karri Saarinen: Airbnb에서 Jira를 단순화하는 크롬 확장을 직접 만들었고, 그 수요로 Linear($1.25B)를 창업

## 5. 경쟁 분석

### 직접 경쟁자 (Jira + AI)
| 이름 | 형태 | 한계 |
|------|------|------|
| JIRA AI Assistant (Chrome) | 확장 | Gemini로 단순 요약만. 기술 체크리스트 없음 |
| AI Ticket Assistant (Marketplace) | Jira 앱 | 유료, 크롬 확장 아님 |
| Atlassian Rovo | 내장 AI | 엔터프라이즈 유료 고객 전용 |
| Jira MCP + Claude Code | CLI 도구 | Node.js/Docker 세팅 필요. 상위 10~20% 파워유저만 |
| **Claude in Chrome (Anthropic 공식)** | 브라우저 에이전트 | **범용 도구라 매번 프롬프트 입력 필요. Jira 특화 분석 없음. 유료 구독 필수 ($20+/월).** |

### Tickit의 차별점 vs Claude in Chrome
Claude in Chrome은 범용 브라우저 AI 에이전트. "이 티켓 분석해줘"라고 매번 타이핑해야 하고, 출력 형식이 일관되지 않음. Tickit은:
- **원클릭 자동 분석**: 티켓 페이지 열면 자동 실행 (프롬프트 입력 불필요)
- **일관된 구조화 출력**: 항상 같은 JSON 스키마 (components, tasks, questions, effort)
- **개발자 특화 프롬프트**: 시니어 프론트엔드 개발자 관점으로 고정 튜닝
- **무료 사용 가능**: 본인 API 키만 있으면 무료 (Claude in Chrome은 $20+/월 구독 필수)

### 간접 경쟁자 (웹페이지 요약)
Monica, Sider, Briefy 등 범용 AI 요약 확장 다수 존재 + Chrome 내장 Summarizer API 출시.
→ 범용 요약은 레드오션. Tickit은 "Jira 티켓 → 개발자 체크리스트" 니치에 집중.

## 6. 왜 크롬 확장인가

- Chrome Web Store가 배포+마케팅 채널 (별도 영업 불필요)
- 등록비 $5 일회성
- 서버 불필요 (사용자 API 키로 직접 호출)
- 프론트엔드 기술만으로 개발 가능
- 사용 맥락이 "브라우저에서 Jira를 열어놓은 상태"이므로 가장 자연스러운 형태

## 7. 수익 모델 (Phase 2 이후 적용)

| 플랜 | 포함 기능 | 가격 |
|------|----------|------|
| Free | 본인 API 키 입력, 무제한 분석, 기본 체크리스트 | $0 |
| Pro | API 키 불필요 (서버 제공), 비개발자 번역, 히스토리 검색, 프로젝트 컨텍스트 설정 | $7~12/월 |
| Team | Pro 전체 + 팀 공유 프리셋, 관리자 대시보드 | $15~25/월/인 |

주의: Pro 플랜에서 "API 키 불필요"를 제공하려면 프록시 서버가 필요. Phase 2에서 서버 도입 시점.

## 8. 성장 경로

1. Phase 1 (Month 1~2): MVP — Jira Cloud + BYOK + 1기능, problem-fit 검증
2. Phase 2 (Month 3~6): Premium + multi-role + 서버 도입, revenue-fit
3. Phase 3 (Month 6~12): Multi-platform + web dashboard, scale-fit
4. Phase 4 (Year 2+): AI dev workflow platform, market leader

## 9. 홍보 전략

### 무비용 채널
1. Chrome Web Store SEO (키워드: Jira, AI, developer, ticket, checklist, productivity)
2. Product Hunt 런칭
3. Reddit r/webdev, r/programming, r/jira, Indie Hackers
4. 빌드 인 퍼블릭 (블로그/X)
5. 한국 커뮤니티: 긱뉴스, 개발자 디스코드
