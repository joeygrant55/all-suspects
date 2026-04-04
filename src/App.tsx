import { SaintList } from './components/SaintList'
import { ChatPanel } from './components/Chat/ChatPanel'

export default function App() {
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] lg:flex-row">
      <aside className="w-full shrink-0 border-b border-[#1a1a1a] bg-[var(--bg-primary)] lg:flex lg:min-h-0 lg:w-[320px] lg:flex-col lg:border-r lg:border-b-0">
        <div className="border-b border-[#1a1a1a] px-4 py-3 sm:px-6 sm:py-5">
          <h1 className="font-serif text-lg font-bold tracking-wide text-[var(--accent)] sm:text-xl">
            All Saints
          </h1>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)] sm:text-xs">
            Conversations with the communion of saints
          </p>
        </div>
        <div className="max-h-[34vh] overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1">
          <SaintList />
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatPanel />
      </main>
    </div>
  )
}
