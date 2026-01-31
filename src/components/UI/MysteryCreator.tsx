import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ERAS = [
  { id: '1920s', label: '1920s Noir', icon: '🎷', color: '#c9a227', desc: 'Speakeasies, jazz, and shadows', gradient: 'linear-gradient(135deg, rgba(201,162,39,0.15) 0%, rgba(30,20,0,0.8) 100%)' },
  { id: '1940s', label: '1940s Hollywood', icon: '🎬', color: '#e5533d', desc: 'Glamour, scandal, and silver screens', gradient: 'linear-gradient(135deg, rgba(229,83,61,0.15) 0%, rgba(30,10,10,0.8) 100%)' },
  { id: '1970s', label: '1970s Disco', icon: '🪩', color: '#e879f9', desc: 'Glitter, secrets, and groove', gradient: 'linear-gradient(135deg, rgba(232,121,249,0.15) 0%, rgba(30,10,40,0.8) 100%)' },
  { id: 'victorian', label: 'Victorian Gothic', icon: '🕯️', color: '#94a3b8', desc: 'Fog, gaslight, and dark manors', gradient: 'linear-gradient(135deg, rgba(148,163,184,0.15) 0%, rgba(15,15,20,0.8) 100%)' },
  { id: '2050s', label: '2050s Space Station', icon: '🚀', color: '#38bdf8', desc: 'Isolation, tech, and zero gravity', gradient: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(5,10,30,0.8) 100%)' },
  { id: 'custom', label: 'Custom...', icon: '✏️', color: '#a78bfa', desc: 'Describe your own setting', gradient: 'linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(15,10,25,0.8) 100%)' },
]

const DIFFICULTIES = [
  { id: 'easy' as const, label: 'Easy', desc: 'Clear clues, obvious suspects. Great for beginners.', color: '#4ade80' },
  { id: 'medium' as const, label: 'Medium', desc: 'Red herrings and complex alibis. A proper challenge.', color: '#fbbf24' },
  { id: 'hard' as const, label: 'Hard', desc: 'Everyone lies. Nothing is as it seems. Good luck.', color: '#ef4444' },
]

interface MysteryCreatorProps {
  onGenerate: (config: { era: string; difficulty: 'easy' | 'medium' | 'hard'; theme?: string }) => void
  onBack: () => void
}

export function MysteryCreator({ onGenerate, onBack }: MysteryCreatorProps) {
  const [step, setStep] = useState(1)
  const [era, setEra] = useState('')
  const [customEra, setCustomEra] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [theme, setTheme] = useState('')

  const handleGenerate = () => {
    onGenerate({
      era: era === 'custom' ? customEra : era,
      difficulty,
      theme: theme || undefined,
    })
  }

  const canProceed = step === 1 ? (era && (era !== 'custom' || customEra.trim())) : true

  return (
    <div className="h-screen w-screen bg-noir-black flex flex-col relative overflow-hidden">
      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" />
      
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Corner decorations - responsive positioning */}
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-16 sm:h-16 border-l-2 border-t-2 border-noir-gold opacity-30" />
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 border-r-2 border-t-2 border-noir-gold opacity-30" />
      <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 w-12 h-12 sm:w-16 sm:h-16 border-l-2 border-b-2 border-noir-gold opacity-30" />
      <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 border-r-2 border-b-2 border-noir-gold opacity-30" />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center">
        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col items-center">
          
          {/* Step indicator */}
          <div className="relative z-10 flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs transition-all duration-300 ${
                    s === step
                      ? 'border-noir-gold text-noir-gold bg-noir-gold/10'
                      : s < step
                        ? 'border-noir-gold/50 text-noir-gold/50 bg-noir-gold/5'
                        : 'border-noir-slate text-noir-slate'
                  }`}
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {s}
                </div>
                {s < 3 && <div className={`w-8 sm:w-12 h-px ${s < step ? 'bg-noir-gold/50' : 'bg-noir-slate/30'}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Era */}
            {step === 1 && (
              <motion.div
                key="era"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 text-center w-full"
              >
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider mb-2 text-noir-gold"
                  style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 40px rgba(201,162,39,0.4)' }}
                >
                  CHOOSE YOUR ERA
                </h2>
                <p className="text-noir-smoke text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] mb-6 sm:mb-10" style={{ fontFamily: 'Georgia, serif' }}>
                  Every era has its own darkness
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {ERAS.map((e) => (
                    <motion.button
                      key={e.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEra(e.id)}
                      className={`group relative p-5 sm:p-6 border-2 transition-all duration-300 text-left min-h-[120px] sm:min-h-[140px] ${
                        era === e.id
                          ? 'border-noir-gold shadow-lg shadow-noir-gold/10'
                          : 'border-noir-slate/40 hover:border-noir-slate'
                      }`}
                      style={{ fontFamily: 'Georgia, serif', background: era === e.id ? e.gradient : 'rgba(10,10,10,0.7)' }}
                    >
                      <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{e.icon}</div>
                      <div className="text-base sm:text-lg font-bold mb-1" style={{ color: era === e.id ? e.color : '#f5f0e8' }}>
                        {e.label}
                      </div>
                      <div className="text-xs text-noir-smoke">{e.desc}</div>
                      {era === e.id && (
                        <motion.div
                          layoutId="era-selected"
                          className="absolute inset-0 border-2 border-noir-gold pointer-events-none"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Custom era input */}
                <AnimatePresence>
                  {era === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 sm:mb-8"
                    >
                      <input
                        type="text"
                        value={customEra}
                        onChange={(e) => setCustomEra(e.target.value)}
                        placeholder="e.g., 1890s Wild West, Medieval Castle..."
                        className="w-full bg-noir-black border-2 border-noir-slate/50 focus:border-noir-gold text-noir-cream px-4 py-3 text-sm outline-none transition-colors"
                        style={{ fontFamily: 'Georgia, serif' }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Step 2: Difficulty */}
            {step === 2 && (
              <motion.div
                key="difficulty"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 text-center w-full"
              >
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider mb-2 text-noir-gold"
                  style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 40px rgba(201,162,39,0.4)' }}
                >
                  HOW SHARP ARE YOU?
                </h2>
                <p className="text-noir-smoke text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] mb-6 sm:mb-10" style={{ fontFamily: 'Georgia, serif' }}>
                  Choose your level of deception
                </p>

                <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {DIFFICULTIES.map((d) => (
                    <motion.button
                      key={d.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setDifficulty(d.id)}
                      className={`relative p-5 sm:p-6 border-2 transition-all duration-300 text-left flex items-center gap-4 sm:gap-6 min-h-[80px] ${
                        difficulty === d.id
                          ? 'border-noir-gold bg-noir-gold/10'
                          : 'border-noir-slate/40 hover:border-noir-slate bg-noir-black/50'
                      }`}
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      <div
                        className="text-2xl sm:text-3xl font-bold w-12 sm:w-16 text-center flex-shrink-0"
                        style={{ color: d.color }}
                      >
                        {d.id === 'easy' ? 'I' : d.id === 'medium' ? 'II' : 'III'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base sm:text-lg font-bold text-noir-cream mb-1">{d.label}</div>
                        <div className="text-xs sm:text-sm text-noir-smoke">{d.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Theme */}
            {step === 3 && (
              <motion.div
                key="theme"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 text-center w-full"
              >
                <h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider mb-2 text-noir-gold"
                  style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 40px rgba(201,162,39,0.4)' }}
                >
                  ANY SPECIAL REQUESTS?
                </h2>
                <p className="text-noir-smoke text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] mb-6 sm:mb-10" style={{ fontFamily: 'Georgia, serif' }}>
                  Optional — guide the mystery architect
                </p>

                {/* Quick-select theme tags */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {[
                    'Love triangle', 'Secret society', 'Revenge plot', 'Locked room',
                    'Inheritance dispute', 'Double life', 'Blackmail', 'Forbidden affair',
                    'Political conspiracy', 'Old grudge',
                  ].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTheme(prev => prev ? `${prev}, ${tag.toLowerCase()}` : tag.toLowerCase())}
                      className="px-3 py-1.5 border border-noir-slate/50 text-noir-smoke text-xs tracking-wider hover:border-noir-gold hover:text-noir-gold hover:bg-noir-gold/5 transition-all duration-200"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder={`Or type your own request...\n"The victim was beloved by everyone"\n"Make it extra spooky"`}
                  rows={3}
                  className="w-full bg-noir-black border-2 border-noir-slate/50 focus:border-noir-gold text-noir-cream px-4 py-3 text-sm outline-none transition-colors resize-none mb-8 sm:mb-10"
                  style={{ fontFamily: 'Georgia, serif' }}
                />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGenerate}
                  className="w-full sm:w-auto px-8 sm:px-12 py-4 bg-noir-gold text-noir-black text-base sm:text-lg font-bold tracking-widest hover:bg-opacity-90 transition-all duration-300"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  ✨ GENERATE MYSTERY
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation - fixed at bottom */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4 px-4 py-4 sm:py-6 border-t border-noir-slate/20 bg-noir-black/80 backdrop-blur-sm">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : onBack())}
          className="px-5 sm:px-6 py-2.5 sm:py-3 border border-noir-slate text-noir-slate text-xs sm:text-sm tracking-wider hover:border-noir-gold hover:text-noir-gold transition-all duration-300 min-h-[48px]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          ← {step > 1 ? 'BACK' : 'CANCEL'}
        </button>

        {step < 3 && (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed}
            className="px-5 sm:px-6 py-2.5 sm:py-3 border border-noir-gold text-noir-gold text-xs sm:text-sm tracking-wider hover:bg-noir-gold hover:text-noir-black transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed min-h-[48px]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            NEXT →
          </button>
        )}
      </div>
    </div>
  )
}
