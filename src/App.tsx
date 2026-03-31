import { ChatPanel } from './components/Chat'
import { CharacterList, Header, LandingPage } from './components/UI'
import { useGameStore } from './game/state'

function InvestigationShell() {
  const resetInvestigation = useGameStore((state) => state.resetInvestigation)

  return (
    <div className="flex h-screen flex-col bg-noir-black text-noir-cream">
      <Header onReturnHome={resetInvestigation} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <CharacterList />
        <ChatPanel />
      </div>
    </div>
  )
}

export default function App() {
  const mode = useGameStore((state) => state.mode)
  const setMode = useGameStore((state) => state.setMode)

  if (mode === 'landing') {
    return <LandingPage onStartInvestigation={() => setMode('investigation')} />
  }

  return <InvestigationShell />
}
