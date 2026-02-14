import { motion } from 'framer-motion'

interface LandingPageProps {
  onStartInvestigation: () => void
}

const howItWorksSteps = [
  {
    title: 'Interrogate',
    description: 'Ask suspects anything. They respond in character, with memory and motive.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-8 h-8">
        <path
          d="M4 21h16M12 3v6m-4 0h8m-8 4h8m-7 4h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    title: 'Investigate',
    description: 'Cross-reference statements. Find contradictions before the killer disappears.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-8 h-8">
        <path
          d="M9 3h6M9 21h6M4 7h16M4 17h16M7 3v18M17 3v18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M12 10l3 2-3 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
  },
  {
    title: 'Accuse',
    description: 'Build your case on witness threads. Name the killer before they lock their alibi.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-8 h-8">
        <path
          d="M12 3 4 7v8a8 8 0 0 0 16 0V7l-8-4zm0 3v9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path d="m9 14 2 2 6-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
]

const featureItems = [
  'AI suspects that actually lie and adapt',
  'Every playthrough is different',
  'Pressure system — push too hard, they clam up',
  '1920s noir setting',
  'No two investigations are the same',
  'Free to play',
]

const sectionVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export function LandingPage({ onStartInvestigation }: LandingPageProps) {
  return (
    <main className="h-screen w-screen overflow-y-auto bg-noir-black text-noir-cream">
      <div className="scroll-smooth">
        {/* Hero */}
        <section
          id="hero"
          className="min-h-screen relative flex flex-col justify-center px-4 py-14 sm:px-6"
          style={{
            backgroundImage: 'linear-gradient(rgba(10,10,10,0.85), rgba(10,10,10,0.65)), url(/ui/title-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-labelledby="landing-hero-title"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.75) 85%)' }} />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(201,162,39,0.12),rgba(0,0,0,0.05) 35%,rgba(114,47,55,0.18))]" />
          <div className="relative z-10 mx-auto w-full max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={sectionVariants}
              transition={{ duration: 0.7 }}
              className="max-w-3xl"
            >
              <p className="text-xs sm:text-sm tracking-[0.25em] text-noir-gold font-semibold mb-5" style={{ fontFamily: 'Georgia, serif' }}>
                ALL SUSPECTS // A NOIR INVESTIGATION
              </p>
              <h1
                id="landing-hero-title"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-tight mb-6"
                style={{
                  fontFamily: 'Georgia, "Playfair Display", serif',
                  textShadow: '0 2px 30px rgba(201, 162, 39, 0.45)',
                }}
              >
                Interrogate suspects. Uncover the truth.
              </h1>
              <p className="text-base sm:text-lg text-noir-cream/90 mb-8 leading-relaxed max-w-2xl" style={{ fontFamily: 'Georgia, serif' }}>
                AI-powered murder mystery where every suspect can think, lie, and crack under pressure.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <button
                  onClick={onStartInvestigation}
                  className="inline-flex items-center justify-center rounded px-8 py-4 w-full sm:w-auto bg-noir-gold text-noir-black font-semibold tracking-[0.12em] shadow-lg shadow-noir-gold/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noir-cream"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Start Investigation
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded border border-noir-gold/80 text-noir-gold px-8 py-4 tracking-[0.12em] hover:bg-noir-gold/10 transition w-full sm:w-auto"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  View How It Works
                </a>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={sectionVariants}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl"
            >
              {['Case file opened', 'No scripted dialog', 'High stakes pressure', 'Clues everywhere'].map((item) => (
                <div key={item} className="bg-noir-charcoal/70 border border-noir-slate/90 px-4 py-3 rounded-sm">
                  <p className="text-[10px] sm:text-xs tracking-[0.2em] text-noir-cream/70">{item}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-noir-charcoal/90 py-16 px-4 sm:px-6" aria-labelledby="landing-how-title">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={sectionVariants}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-noir-gold">The Procedure</p>
              <h2 id="landing-how-title" className="text-2xl sm:text-3xl md:text-4xl font-semibold mt-2" style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}>
                How It Works
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {howItWorksSteps.map((step, index) => (
                <motion.article
                  key={step.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.35 }}
                  variants={sectionVariants}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-noir-black/80 border border-noir-slate rounded-sm p-6"
                  aria-label={`${step.title} step`}
                >
                  <div className="mb-4 inline-flex items-center justify-center w-12 h-12 border border-noir-gold/60 text-noir-gold bg-noir-slate/30">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}>
                    {step.title}
                  </h3>
                  <p className="text-noir-cream/85 leading-relaxed">{step.description}</p>
                  <p className="mt-5 text-sm text-noir-gold/80">Step {index + 1}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-noir-black py-16 px-4 sm:px-6" aria-labelledby="landing-features-title">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={sectionVariants}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-noir-gold">Why It Bites</p>
              <h2 id="landing-features-title" className="text-2xl sm:text-3xl md:text-4xl font-semibold mt-2" style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}>
                Features
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featureItems.map((item, index) => (
                <motion.div
                  key={item}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.35 }}
                  variants={sectionVariants}
                  transition={{ duration: 0.55, delay: index * 0.05 }}
                  className="rounded-sm border border-noir-slate bg-noir-charcoal/50 p-5"
                >
                  <p className="text-noir-gold text-xs uppercase tracking-[0.14em] mb-3">Feature {index + 1}</p>
                  <p className="text-base sm:text-lg leading-relaxed">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="bg-noir-charcoal py-16 px-4 sm:px-6" aria-labelledby="landing-stats-title">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={sectionVariants}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-noir-gold">Proof on the File</p>
              <h2 id="landing-stats-title" className="text-2xl sm:text-3xl md:text-4xl font-semibold mt-2" style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}>
                Social Proof / Stats
              </h2>
            </motion.div>

            {/* TODO: Replace these placeholder numbers when analytics are available */}
            <div className="grid sm:grid-cols-2 gap-5">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={sectionVariants}
                transition={{ duration: 0.5 }}
                className="bg-noir-black border border-noir-slate p-6 text-center"
              >
                <p className="text-3xl sm:text-4xl text-noir-gold font-bold">X cases solved</p>
                <p className="mt-2 text-noir-cream/80">Placeholder milestone until analytics pipeline is wired.</p>
              </motion.div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={sectionVariants}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="bg-noir-black border border-noir-slate p-6 text-center"
              >
                <p className="text-3xl sm:text-4xl text-noir-gold font-bold">Y% solve rate</p>
                <p className="mt-2 text-noir-cream/80">Placeholder accuracy metric. Replace when tracking begins.</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section id="cta" className="relative py-20 px-4 sm:px-6 bg-noir-black/90" aria-labelledby="landing-cta-title">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at center, rgba(201,162,39,0.18) 0%, rgba(10,10,10,0.95) 65%)',
            }}
          />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionVariants}
            transition={{ duration: 0.6 }}
            className="relative max-w-4xl mx-auto text-center"
          >
            <h2 id="landing-cta-title" className="text-2xl sm:text-3xl md:text-4xl font-semibold" style={{ fontFamily: 'Georgia, "Playfair Display", serif' }}>
              Ready to solve the case?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-noir-cream/90" style={{ fontFamily: 'Georgia, serif' }}>
              The suspects are already waiting.
            </p>
            <button
              onClick={onStartInvestigation}
              className="mt-8 inline-flex items-center justify-center rounded px-10 py-4 border border-noir-gold bg-noir-gold text-noir-black font-semibold tracking-[0.16em] shadow-lg shadow-noir-gold/20 w-full sm:w-auto"
            >
              Play Now
            </button>
          </motion.div>
        </section>
      </div>
    </main>
  )
}
