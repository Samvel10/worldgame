# Graph Report - .  (2026-09-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 295 nodes · 538 edges · 25 communities (20 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7405fb83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `Setup and implementation audit` - 26 edges
2. `handle()` - 19 edges
3. `useI18n()` - 13 edges
4. `letters()` - 13 edges
5. `normalizeWord()` - 9 edges
6. `broadcast()` - 8 edges
7. `publish()` - 8 edges
8. `Բառիկ · Barrik` - 8 edges
9. `Բառիկ` - 8 edges
10. `answers` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Site()` --calls--> `useI18n()`  [INFERRED]
  src/Site.tsx → src/i18n/provider.tsx
- `makeRound()` --calls--> `letters()`  [INFERRED]
  src/hooks/useGame.ts → src/game/armenian.ts
- `useGame()` --calls--> `letters()`  [INFERRED]
  src/hooks/useGame.ts → src/game/armenian.ts
- `Board()` --calls--> `letters()`  [INFERRED]
  src/components/Board.tsx → src/game/armenian.ts
- `App()` --calls--> `useI18n()`  [INFERRED]
  src/App.tsx → src/i18n/provider.tsx

## Communities (25 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (37): icons, acceptedWords, answers, attemptsFor(), chooseWord(), countLetters(), emptyStats(), evaluateGuess() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (41): accountStore(), derive, accounts, add(), answerData, answers, broadcast(), chooseAnswer() (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (20): Account, AccountPage(), History, BattlePanel(), Board(), Help(), Keyboard(), rows (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (26): 2026-09-13 — Step 12: Battle scope and current repository audit, 2026-09-13 — Step 13: Battle protocol foundation, 2026-09-13 — Step 14: Battle client and installable shell, 2026-09-13 — Step 1: instructions and discovery, Audit verification and deployment design, Fresh audit, Release preparation, Setup and implementation audit (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (19): Battle-ի կանոնները, Battle ռեժիմ, code:bash (npm ci), code:bash (npm run build), code:bash (npm run typecheck), code:bash (npm run lint), Բառարանի աղբյուրը, Բառիկ (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (15): Guess, Message, Player, Round, deleteBackward(), isArmenian(), letters(), normalizeWord() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (13): a, answers, b, c, child, clients, d, health (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (11): initializeDictionary(), I18nContext, I18nContextType, I18nProviderProps, LanguageCode, TranslationKey, translations, getNestedValue() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (8): answers, errors, gate, missing, start, timings, usernames, warnings

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): code:block1 (Error: expect(received).toBe(expected) // Object.is equality), code:yaml (- generic [ref=e2]:), code:ts (76  |   for (let i = 0; i < 3; i++) await guess(page, other)), Error details, Instructions, Page snapshot, Test info, Test source

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): accepted, answers, counts, lengths, seen

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (4): code:mermaid (flowchart TD), Deployment, Remaining operating boundaries, Runtime map

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (4): Confirmed by source tracing, Implementation and verification sequence, Implemented repairs and evidence, Verified audit — 2026-09-13

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (4): Բառարանի աղբյուրը և մշակումը, Գաղտնի պատասխանները, Մշակման կանոնները, Սահմանները

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (4): copy, legacy, SHELL, url

## Knowledge Gaps
- **122 isolated node(s):** `root`, `defaultSettings`, `Player`, `Guess`, `Round` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useI18n()` connect `Community 2` to `Community 7`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `letters()` connect `Community 5` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `useI18n()` (e.g. with `Site()` and `App()`) actually correct?**
  _`useI18n()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `letters()` (e.g. with `makeRound()` and `useGame()`) actually correct?**
  _`letters()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `root`, `defaultSettings`, `Player` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._