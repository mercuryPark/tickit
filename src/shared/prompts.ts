// 프롬프트 템플릿. TECHNICAL_SPEC §9 기준.
// Day 3~4에 실제 회사 티켓으로 튜닝 예정.

import type { TicketData } from './types'

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
5. If external links (Figma, docs) are mentioned but you cannot access them, flag this as a limitation.`

export const buildAnalysisPrompt = (ticket: TicketData, language: 'ko' | 'en'): string => {
  const truncationNotice = ticket.descriptionTruncated
    ? '\n\nNOTE: The description was truncated due to length. Analysis may be incomplete.'
    : ''

  const commentsBlock = ticket.comments.length
    ? ticket.comments.map((c) => `[${c.author}]: ${c.body}`).join('\n')
    : 'None'

  return `Analyze the following Jira ticket and generate a developer-ready technical checklist.

## Ticket Information
- Key: ${ticket.key}
- Title: ${ticket.title}
- Description: ${ticket.description}${truncationNotice}
- Recent Comments: ${commentsBlock}
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
}`
}
