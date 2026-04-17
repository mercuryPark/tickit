# CLAUDE.md

## Project Overview
This is a Chrome Extension (Manifest V3) called "Tickit" that converts vague Jira tickets into developer-ready technical checklists using AI.

## Essential Context
Before starting any work, read these files in order:
1. **`docs/PROGRESS.md`** — Current progress, next task, key decisions log. **READ THIS FIRST every session.**
2. `docs/PROJECT_CONTEXT.md` — Business context, market analysis, competitive landscape, positioning
3. `docs/TECHNICAL_SPEC.md` — Architecture, directory structure, type definitions, prompt design
4. `docs/DEVELOPMENT_PLAN.md` — Day-by-day implementation plan with checkpoints
5. `docs/SCENARIOS.md` — Real usage scenarios for prompt tuning and UI validation
6. `docs/KNOWN_RISKS.md` — Technical risks, limitations, and mitigation strategies
7. `docs/OPERATIONS_GUIDE.md` — Chrome Web Store submission, SW lifecycle, DOM maintenance, error monitoring, i18n, legal

After completing any milestone, **update `docs/PROGRESS.md`** — check boxes, add decisions to the log, update "current position" section.

## Architecture
- **No server.** Everything runs in the browser extension.
- Content Script extracts ticket data from Jira Cloud DOM
- Service Worker orchestrates AI API calls using user's own API key
- Side Panel (React) displays analysis results
- chrome.storage.local stores API keys, settings, and history

## Tech Stack
- TypeScript (strict)
- React 18+
- Vite + `vite-plugin-web-extension` (CRXJS 2.4는 content script 동적 import가 page world에서 실행되어 `chrome.runtime` 접근 불가 → 피벗함. 상세는 `docs/PROGRESS.md` 결정 로그 참조)
- Manifest V3 (Side Panel API, Storage API)
- Tailwind CSS
- OpenAI / Anthropic API (user provides API key)

## Key Design Decisions
- **BYOK only** (Bring Your Own Key) — NO free trial with embedded API key in MVP. Extension code is inspectable; embedding keys is a security risk.
- AI calls happen in Service Worker (keeps API key away from content scripts)
- Anthropic CORS: officially supported since Aug 2024. Add header `anthropic-dangerous-direct-browser-access: true` to enable browser-direct calls.
- JSON output from AI, with retry on parse failure (max 2 retries)
- **Streaming responses** from both OpenAI and Anthropic for better perceived performance
- Cache results per ticket key in chrome.storage.local to avoid redundant API calls
- **Side Panel does NOT auto-open.** Use `setPanelBehavior({ openPanelOnActionClick: true })` so clicking the extension icon opens Side Panel. Once open, analysis auto-starts when user navigates to a Jira ticket.
- **No popup.** Do NOT declare `action.default_popup` — it conflicts with `openPanelOnActionClick`. Extension icon click = Side Panel open.
- **Service Worker idle handling**: SW can sleep after 30s~5min. Implement retry logic when Content Script sends messages. Use `chrome.runtime.sendMessage` with error catching and re-send.
- **Input truncation**: Cap combined ticket text at ~4000 chars to stay within token limits. Show "일부 내용이 생략되었습니다" notice if truncated.
- AI output includes disclaimer: "컴포넌트 이름은 일반적인 프론트엔드 프로젝트 구조 기반 추정입니다. 실제 파일명과 다를 수 있습니다."

## Code Style
- Functional React components with hooks
- Named exports preferred
- Error boundaries around AI-dependent components
- All user-facing strings support i18n (en, ko)
- Comprehensive error handling for every API call and DOM extraction

## Testing Priority (in order)
1. **Jira DOM selectors** — DO NOT trust selectors in TECHNICAL_SPEC. Open a real Jira Cloud page in DevTools and verify current DOM structure first. Jira changes data-testid frequently.
2. **Service Worker ↔ Content Script messaging** — Test SW wake-up from idle. Messages must not be lost.
3. **AI API calls from Service Worker** — Test both OpenAI and Anthropic. Verify Anthropic CORS header. Test streaming.
4. **Prompt quality** — Test with real tickets from SCENARIOS.md. AI cannot infer info not in the ticket.
5. **Side Panel rendering** — Dark mode, copy-to-clipboard, skeleton loading, error states.
6. **Settings flow** — API key input, validation, language/model selection.

## Known Limitations (must communicate to users)
- Jira Cloud only (*.atlassian.net). Jira Data Center / Server (custom domains) not supported in v1.
- AI analyzes ticket text only. Cannot access Figma files, linked docs, or your codebase.
- Long tickets (>4000 chars) are truncated.
- API key stored in chrome.storage.local (unencrypted). Use caution on shared computers.

## Chrome Extension Critical Rules (from 10+ years of operation experience)
1. **Every fetch() must have .catch()** — Unhandled promise rejection = review rejection.
2. **Never store state in SW global variables** — SW terminates when idle. Use chrome.storage.
3. **Always `return true` from onMessage listeners for async responses** — Without this, SW dies before response arrives. This causes the hardest-to-debug intermittent failures.
4. **Use chrome.runtime.connect() for long-lived Side Panel ↔ SW communication** — Port keeps SW alive while Side Panel is open.
5. **DOM selectors WILL break** — Use fallback chains (3+ selectors per field). Never assume a selector works forever.
6. **Test fresh install state before every submission** — Uninstall → reinstall → verify onboarding flow. Reviewers test this way.
7. **Minimize permissions** — Every extra permission increases review time from days to weeks.
8. **Never add permissions in updates without absolute necessity** — Permission changes trigger user re-approval prompts → mass uninstalls.
9. **No sourcemaps in production build** — Unnecessary size + exposes code structure.
10. **Cache management** — Cap at 50 entries, LRU eviction. chrome.storage.local has ~5MB limit.

## What NOT to build in MVP
- Server/backend
- Free trial with embedded API key
- User authentication/accounts
- Payment/subscription
- Popup (conflicts with Side Panel)
- Linear support (v1.1)
- Non-developer translation mode (v2)
- Project context settings — user-defined component list (v2)
- Team sharing features (v2.1)
- Web dashboard (v3)
