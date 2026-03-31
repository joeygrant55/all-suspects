import { SaintList } from './components/SaintList'
import { ChatPanel } from './components/Chat/ChatPanel'

export default function App() {
  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sidebar */}
      <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-r border-[#1a1a1a] bg-[var(--bg-primary)] lg:block">
        <div className="border-b border-[#1a1a1a] px-6 py-5">
          <h1 className="font-serif text-xl font-bold tracking-wide text-[var(--accent)]">
            All Saints
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Conversations with the communion of saints
          </p>
        </div>
        <SaintList />
      </aside>

      {/* Main chat area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="border-b border-[#1a1a1a] px-4 py-3 lg:hidden">
          <h1 className="font-serif text-lg font-bold text-[var(--accent)]">All Saints</h1>
        </div>
        <ChatPanel />
      </main>
    </div>
  )
}
