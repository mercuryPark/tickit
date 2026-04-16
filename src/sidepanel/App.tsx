// Phase 0 placeholder. 실제 App은 Day 5~6에 구현한다.
// - 분석 결과 / 설정 / 온보딩 전환 로직
// - 스트리밍 상태 관리
// - 다크 모드
export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans">
      <header className="mb-4">
        <h1 className="text-lg font-semibold">Tickit</h1>
        <p className="text-xs text-slate-400">
          Phase 0 — extension loaded. Side Panel placeholder.
        </p>
      </header>
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm leading-relaxed">
        <p>
          이 Side Panel은 Day 5~6에 구현됩니다. 지금은 확장이 chrome://extensions에서
          정상 로드되는지 확인하는 placeholder입니다.
        </p>
      </section>
    </div>
  )
}
