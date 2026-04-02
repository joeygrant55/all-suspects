# Study Mode

`study` is a second saint interaction mode alongside the default `counsel` mode.

- `counsel` keeps the existing conversational flow: direct, warm, practical, and spiritually present.
- `study` asks the saint to teach more explicitly from within his or her historical setting, method, and sources.

## Aquinas v1

The first strong vertical slice is for St. Thomas Aquinas.

- Aquinas study mode frames questions carefully before resolving them.
- It prefers ordered reasoning, explicit distinctions, and charitable engagement with modern thinkers like Nietzsche or Marx.
- It encourages first-hand reading recommendations and makes room for sections such as `Authorities`, `Primary texts`, `Read next`, and `Takeaway for study` when they help.
- It distinguishes between what Aquinas explicitly wrote and what is being inferred from Thomistic principles.

## Reading Guidance

The lightweight Aquinas reading guidance lives in [server/agents/studyMode.ts](/Users/joey/Desktop/Slateworks.io/all-suspects/server/agents/studyMode.ts).

- It uses a small manual topic map keyed by common study themes such as virtue, happiness, law, truth, evil, soul, education, and conscience.
- Each topic can surface likely Aquinas texts, companion authorities, and a short `read first` hint.
- There is no retrieval layer or citation engine in this v1.
