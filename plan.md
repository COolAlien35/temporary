# QuantumLoop frontend completion plan

## Goal and scope

Complete the frontend described in [SIH26140.pdf](SIH26140.pdf), following the experiment-first approach in [the research draft](SIH_Quantum_Platform_Research.pdf). Use [pages.md](pages.md) as the inventory of existing routes.

Execute the numbered steps in order. Extend existing pages where the relevant experience already exists. Each step has a completion check; finish that check before moving on. This document plans frontend work only.

**Implementation status (September 2026):** Steps 2 through 12 are complete in frontend demo scope; step 13 has automated route, journey, and responsive checks, while a manual accessibility review remains. Step 1 still has broader styling review work. Shared route definitions, recovery screens, service contracts, and browser-local demo account screens are in place. A demo instructor can create a circuit study assignment with multiple quiz questions, target demo learners, publish an immutable version, review submissions, and send written feedback. Learners can save drafts, answer, retry, and see scores and feedback after refresh. The curriculum has shared-shell lesson and quiz pages, persistent resume/progress, a distinct beginner foundations → gates → entanglement sequence, contextual Studio links, quiz validation, results, retries and recorded attempts. The experiment loop uses local statevector results, persists lab progress, grades challenge outcomes against target distributions, and labels remote backends unavailable. Histogram, statevector, Bloch, Noise Lab and What Changed views use local run results; the demo tutor receives lesson, prediction, circuit, output and recent-action context and supports a reviewable reference-circuit apply/undo flow. Deutsch–Jozsa and Grover have distinct local simulator circuits; QAOA and VQE have parameterized local evaluation workbenches with iteration histories. Step 7 has a circuit-challenge catalog, filters, local workbench, grading, persisted reviews and retries. Quiz, circuit challenge and lab challenge submissions share a profile-scoped assessment history, with read compatibility for older browser records. A code practice screen uses a typed remote grading adapter and shows pending or error states; the demo does not execute or grade code. Instructor overview, roster, learner detail and question-pattern screens use browser-local profiles, assessments and assignment submissions rather than independent sample statistics. Instructors can preview curriculum content, save reusable quiz, code and debug templates, load them into fixed assignments, and review learner responses. Community pages now support one browser-local Bell-pair contest entry and result flow, filtered sample rankings with a separate local learner row, and persistent demo threads, replies and votes. QFT, Shor and QEC remain explicitly unavailable. Lesson content remains marked for faculty review. Browser-local learning and coursework data are shared only between profiles in one browser; backend roles, assignment delivery, durable storage, trusted grading, optimization services and external quantum execution remain open.

**Frontend complete** means every supported user journey has usable screens, working client interactions, consistent shared state, responsive layouts, accessible controls, and loading/empty/error/success states. Backend-dependent journeys must work through a clearly identified demo service and have typed contracts ready for integration. This does not mean real authentication, AI, external quantum execution, grading services, or cloud data storage are complete.

**Step 8 update:** The dashboard and Quantum Passport derive lesson progress, assessment results, local experiments, calibration, activity dates, streaks and badges from the same learner profile. The dashboard recommends a first or resumed lesson, a quiz, or a challenge retry with a reason and working link. Fresh profiles show empty states and no earned badges. Instructor cohort analytics in step 9 remain next.

## Build order at a glance

| Order | Priority | Pages to create | Existing pages to complete |
| --- | --- | --- | --- |
| 1 | P0 — foundation | Shared not-found/error/loading UI; no new feature route | Shared shell, navigation, tokens, client state and service contracts |
| 2 | P0 — entry and account | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/settings` | `/` and account controls in the shell |
| 3 | P0 — teaching loop | `/instructor/assignments`, `/instructor/assignments/[id]`, `/assignments`, `/assignments/[id]` | Instructor and learner entry points; shared assignment/submission model |
| 4 | P0 — learning path | No new route template | `/curriculum`, `/curriculum/[unitId]`, `/curriculum/[unitId]/[lessonId]`, `/curriculum/[unitId]/quiz` |
| 5 | P0 — experimentation | No new route template; add beginner lab configurations | `/studio`, `/lab/[algorithm]` |
| 6 | P1 — required algorithm coverage | Add `qaoa` and `vqe` configurations to the existing lab route | Algorithm lessons, lab stages, and roadmap links |
| 7 | P1 — assessment | `/challenges`, `/challenges/[id]`, `/challenges/[id]/attempts/[attemptId]` | `/curriculum/practice`, `/contests/practice`, quizzes and lab challenge stages |
| 8 | P1 — learner progress | No new route | `/home`, `/me`, recommendation sections |
| 9 | P1 — instructor analytics | `/instructor/students`, `/instructor/students/[studentId]`, `/instructor/misconceptions` | `/instructor` |
| 10 | P1 — advanced instructor workflows | `/instructor/curriculum`, `/instructor/assessments` | Instructor navigation and existing quick links |
| 11 | P2 — community completion | `/discussions/[threadId]` | `/contests`, `/contests/[id]`, `/leaderboard`, `/discussions` |
| 12 | P2 — hardware completion | No new route | `/hardware`, `/hardware/catalog`, `/hardware/studio`, `/hardware/checks` |
| 13 | P0 release gate | No new feature route | All routes: navigation, accessibility, responsiveness and journey verification |

P0 and P1 cover the core SIH frontend. P2 completes the additional surface already exposed by this product. Apply step 13's checks throughout development, then run the full release check after step 12.

## Consistency rules for every step

- Preserve the established dark QuantumLoop identity: navy background, translucent cards, cyan primary actions, amber accents, Inter body text and Space Grotesk headings. Consolidate existing color variants into shared tokens in `app/globals.css`; use semantic success, warning and error colors consistently.
- Reuse `components/ui` primitives and `components/shared/ui` elements for buttons, cards, forms, headers, tabs, tables, dialogs and empty states. Standardize spacing, radii, text sizes, container widths, focus rings and disabled states before building new pages.
- Use `AppShell` for normal app pages. Give lesson and quiz pages the same navigation and breadcrumb conventions. Keep a compact lab/workbench layout with a visible route back to the curriculum or dashboard. Ensure exactly one main landmark per page; several pages currently add a main element inside the shell's main element.
- Centralize route names and destinations so desktop navigation, mobile navigation, breadcrumbs and the command palette agree. Use the same terms everywhere: Curriculum, Circuit Studio, Challenges, Contests, Quantum Passport and Instructor.
- Put secondary destinations in section navigation or menus to avoid crowding the top bar. Instructor navigation belongs to the instructor experience; any demo role switch must be explicitly labeled.
- Use one learner identity and one progress source across the shell, home, profile, lessons, labs and assessments. Compute XP, completion, streaks and mastery from shared events instead of hardcoded values on each page.
- Use one circuit model and common results components for Studio, labs and challenges. Preserve drafts and the correct lesson/algorithm context when navigating between them.
- Every visible action must work, open an explanatory unavailable state, or be removed from the supported navigation. Replace `href="#"`, silent no-op buttons, misleading success messages and broken destinations.
- Keep demo data coherent across pages. Show a concise demo indicator where service results are simulated. Never present fixture output as a real framework run, real AI response, sent email, or production authentication.
- Make charts understandable through labels and text/table alternatives. Support keyboard controls, visible focus, reduced motion, accessible form errors and touch-friendly targets. The circuit builder needs an accessible alternative to dragging.

## Ordered implementation checklist

### 1. Establish shared layout, state and service boundaries

- [ ] Consolidate shared UI styles and shell behavior using the rules above; inspect `frontend/AGENTS.md` and the installed Next.js guides before implementation.
- [ ] Audit all routes and links, including the command palette, landing/footer links and instructor shortcuts. Create shared recovery screens for unknown records and routes.
- [ ] Define typed frontend interfaces for session/profile, curriculum, experiments, simulation runs, tutor messages, assessment attempts, learner progress and instructor summaries. Follow the existing `lib`, `store` and feature-component structure.
- [ ] Add interchangeable demo and future API service adapters. Include deterministic success, delay, empty and failure cases so pages can be completed without a backend.
- [ ] Establish stable IDs and shared fixtures. Separate sample-cohort data from the current learner's activity, and support resetting the demo without losing unrelated browser data.

**Done when:** the same UI components, route map and data contracts can support all later pages; identity and navigation behave consistently on desktop and mobile.

### 2. Complete entry, account and settings screens

- [x] Create login and signup pages using the existing landing auth-card styling and a shared form implementation. Add validation, password visibility, pending state, service error and success navigation.
- [x] Create forgot-password and reset-password screens, including expired/invalid token states. Demo mode must not claim an email was sent.
- [x] Connect landing actions to the correct entry flow and replace the About/Docs/Contact placeholder links with real sections or supported destinations.
- [x] Create `/settings` for profile display information, learning preferences and reduced-motion preference. Connect the shell's settings and logout controls.
- [x] Add frontend session-aware navigation and intended-destination return after login. Do not store passwords in browser persistence. Frontend role checks are navigation behavior, not a substitute for backend authorization.

**Done when:** a demo learner can enter the app, update profile information, refresh, log out and return; invalid input and service failures produce useful feedback.

### 3. Connect instructor assignments to learner responses

- [x] Use one typed assignment model for a curriculum unit, study instructions, a circuit snapshot/template, authored questions, answer keys, explanations, due date, draft/published state and stable ID. Keep assignment content separate from each learner's attempt; published work should be versioned instead of silently changing after submission.
- [x] Build `/instructor/assignments` to create, edit, preview and publish a circuit-study assignment with multiple quiz questions and a written response prompt. Let the instructor choose the relevant unit and circuit; show what learners will see before publishing.
- [x] Make the publish/assign action target a demo cohort or named learners and show the assignment in `/assignments` for eligible learners. Explain that browser-local demo assignments are shared only between profiles on this browser; server roles and delivery remain backend work.
- [x] Build `/assignments/[id]` so learners can read the circuit and instructions, save a draft, answer every question, write a response, submit, see scored question feedback, and retry according to the assignment policy. Keep the exact question/circuit version in each submission.
- [x] Build `/instructor/assignments/[id]` to inspect who responded, quiz scores, answer choices and written responses, then leave manual feedback and return it to the learner. Show no-submission and unknown-ID states.
- [x] Add real entry points from the instructor dashboard and learner curriculum/dashboard. Use shared assignment, attempt and progress records rather than independent mock counts; add a browser journey covering author → publish → learner response → instructor review → learner feedback.

**Done when:** an instructor can publish a circuit plus quiz, a learner can study and submit it, and the instructor can review and respond, with the result visible to the learner after refresh. This is a frontend demo; backend authorization, multi-user storage and trusted grading remain integration requirements.

### 4. Complete curriculum, lessons and quizzes

- [x] Bring unit, lesson and quiz pages into the shared layout; add breadcrumbs, previous/next lesson navigation and a working resume action.
- [x] Finish the beginner sequence first: qubits and measurement, gates and circuits, then entanglement. Replace repeated generic checkpoints with lesson-specific questions and explanations for this sequence.
- [x] Render related-tool links with contextual Studio templates; fix bare `/lab` links. Keep faculty-review status visible and remove unsupported capstone claims.
- [x] Keep all nine unit structures visible with honest faculty-review labels; authored content depth remains a faculty review dependency.
- [x] Add answer feedback, quiz submission validation, results review, retry behavior and consistent XP/completion rules. Award completion once and keep quiz attempt history.

**Done when:** a learner can move from a unit through lessons and a quiz, open the relevant experiment, and return without losing progress. Verified in the curriculum Playwright journey; quiz scores and attempts persist in the learner's browser profile.

### 5. Complete the experiment loop and shared workbench

- [x] Fix the lab's algorithm-data fallback: each algorithm must supply its own lesson, register, outcomes, reference circuit, debug scenario and challenge criteria. Unknown algorithms must show recovery UI; incomplete algorithms remain unavailable rather than borrowing data.
- [x] Add beginner configurations for superposition, gates and entanglement to `/lab/[algorithm]`; use the same nine-stage framework already present.
- [x] Reuse the existing Studio circuit model and local simulator. Lab run, debug and challenge results now derive from the circuit submitted; the five-qubit local simulator and simplified noise model are identified in the UI.
- [x] Complete Predict → Build → Run → Observe → Explain → Debug → Challenge → Master for the beginner tracks, including stage validation, retries, resume and saved progress. Challenge scoring checks outcome error and gate budget; entanglement is covered by a browser journey through mastery.
- [x] Synchronize the supported Qiskit-style code subset with visual gates and local simulation. Unsupported lines block apply/run and are reported; arbitrary Python is not executed.
- [x] Label local execution and external backend availability in the run stage. External services are explicitly unavailable and no remote jobs are sent; production adapter integration remains open.
- [x] Finish the tutor UI using circuit, lesson, prediction, run output and recent actions as context. Cover explanation, debugging, optimization, generation preview, apply/undo, loading and failure through the service adapter.
- [x] Finish Histogram, Statevector, Bloch, Noise Lab and What Changed integration. Results are tied to the last run and marked stale after circuit edits; Noise Lab is an explicitly approximate preview, and What Changed compares the last two saved simulation distributions.

**Done when:** one entanglement experiment works from start to finish; editing its gates changes the actual local results, and completion appears in shared learner progress after refresh. Verified with the entanglement mastery journey and experiment-context tests.

### 6. Fill required algorithm coverage

- [x] Complete distinct Deutsch–Jozsa and Grover experiences using the shared lab infrastructure; their circuits produce their own target distributions in the local simulator.
- [x] Add QAOA and VQE content/configurations to the existing dynamic lab route. Include problem setup, parameter controls, objective/energy results and an iteration-history display appropriate to each algorithm.
- [x] Where a required optimizer/backend is unavailable, make the frontend executable with labeled local statevector evaluations. Manual parameter sweeps are labeled as such; the VQE toy Hamiltonian is not represented as chemistry, and no optimization result is fabricated.
- [x] Audit QFT, Shor and QEC capability labels. Their placeholder configurations do not enter the nine-stage lab; routes provide an unavailable state instead of borrowing results.
- [x] Update curriculum links, roadmap ordering and prerequisites from the algorithm registry; workbench discovery labels supported and unavailable tracks.

**Done when:** required algorithms have distinct frontend flows, and unsupported tracks/execution are represented honestly. Verified with QAOA/VQE iteration and DJ/Grover circuit journeys. Domain review remains an explicit content dependency.

### 7. Build coding challenges and submission review

- [x] Create `/challenges` with topic, difficulty, status and challenge-type filters.
- [x] Create `/challenges/[id]` with the prompt, target behavior, constraints, starter circuit, local workbench, hints, run and submit actions.
- [x] Create `/challenges/[id]/attempts/[attemptId]` with the submitted snapshot, score, correctness checks, feedback, retry and open-in-Studio actions. Hint use is optional and not yet attached to attempt metadata.
- [x] Grade supported local circuit challenges against target outcomes and constraints; empty or incorrect circuits cannot pass on gate count alone.
- [x] Make practice tracks use relevant question pools. Keep `/contests/practice` as an intentional alias of the canonical practice experience.
- [x] Add a grading adapter for remote code challenges and pending/error states; connect quiz and lab challenge submissions to a unified assessment-attempt record. The demo adapter reports remote grading unavailable without running code; its pending state is available for integration testing.

**Done when:** a learner can discover, attempt, submit, review and retry a challenge; both incorrect and correct submissions yield meaningful feedback.

### 8. Connect the learner dashboard and Quantum Passport

- [x] Replace independent hardcoded learner values on `/home`, `/me` and the shell with shared learner records. Remaining example teaching content is labeled as sample content.
- [x] Show resume learning, recent experiments, quiz/challenge results, concept mastery, activity, streak and earned badges from actual demo activity.
- [x] Add next-step recommendations based on incomplete prerequisites and mistakes, with a short reason and working destination.
- [x] Give a new learner useful empty states and a first recommended lesson; remove sample achievements from a fresh account.

**Done when:** completing a lesson, experiment or assessment updates all relevant screens consistently and survives refresh.

### 9. Build instructor analytics and learner detail

- [x] Complete `/instructor` using shared cohort data rather than independent displayed numbers.
- [x] Create `/instructor/students` with search, concept/progress filters, attention indicators and links to individual learners.
- [x] Create `/instructor/students/[studentId]` with lesson progress, concept mastery, assessment history, attempts, hints and recommendations.
- [x] Create `/instructor/misconceptions` with concept-level error patterns and drill-down links to the related lesson, challenge and affected learners. Patterns are labeled as missed questions, not diagnosed beliefs.
- [x] Cover empty cohorts, no matching students, unknown student IDs and unavailable analytics. The instructor screens explicitly scope data to this browser; remote analytics are unavailable in demo mode. Independent sample statistics and misleading sync claims have been removed.

**Done when:** instructors can identify a learning difficulty, inspect supporting attempts and navigate to the relevant content using coherent demo data.

### 10. Finish advanced instructor actions already exposed by the UI

- [x] Create `/instructor/curriculum` to browse lesson content, review status and preview learner-facing pages.
- [x] Create `/instructor/assessments` with reusable quizzes, coding challenges and debug exercises that feed the existing assignment workflow; keep preview and demo assignment flows connected to shared assessment records. Code responses are saved as text for manual review and are never executed in the demo.
- [x] Consolidate old quiz, challenge and debug-set shortcut concepts into the assessment tabs. No links to the old routes remain, so compatibility redirects are unnecessary.
- [x] Resolve remaining shortcuts: recent assessment activity is in the dashboard; preferences link to `/settings`, and contests and discussions link to their implemented views. No notifications or moderation action is exposed.
- [x] Keep instructor editing and assignment actions within frontend demo scope, with typed assessment-template service contracts for future persistence.

**Done when:** every instructor shortcut reaches a useful implemented view, and no additional empty page is created solely to satisfy an old link.

### 11. Complete the existing community journey

- [x] Finish contest entry/results actions using the Bell-pair circuit challenge and its submitted attempt snapshots. Unknown contest IDs show recovery; unsupported contest grading is labeled unavailable.
- [x] Make leaderboard scope/time controls filter one coherent sample dataset, with browser-local learner results labeled separately.
- [x] Create `/discussions/[threadId]` with the original post, replies, voting and a reply composer. Add a new-thread dialog to `/discussions`.
- [x] Make discussion sorting work and persist demo posts, replies, votes and contest entries through a typed community adapter. Associate contest discussions and circuit submissions with the selected contest.

**Done when:** users can enter a demo contest, inspect their result and discuss it without dead-end buttons or inconsistent data.

### 12. Polish and integrate the hardware pages

- [x] Keep the existing four routes and shared styling. Verify diagram, 3D and list views show the same design and selection. Preset positions now use the shared coordinates expected by all views.
- [x] Complete component placement, port connections, signal-type selection, inspection, diagnostics and save/load flows; ensure controls match supported capabilities. List controls provide a keyboard path, invalid connections are rejected, and diagnostics clear after edits.
- [x] Provide useful empty states and a diagram/list fallback when 3D rendering is unavailable. Check smaller-screen access to the catalog, inspector and diagnostics.
- [x] Link hardware curriculum exercises to relevant presets and provide a route back to the lesson.

**Done when:** a learner can open an exercise, change a design, inspect resulting diagnostics and reload their saved work. Verified by hardware lesson/save/refresh, list port-routing, and narrow-screen browser journeys.

### 13. Run the frontend release check

- [x] Check every route template, dynamic ID recovery, aliases, navigation items, footer links and command-palette destinations. Unknown records have recovery actions.
- [ ] Verify narrow mobile, tablet and desktop layouts; editors and tables may scroll within their panels, while the page itself should remain usable. Representative viewport checks pass, and the tablet navigation overflow is fixed. A full manual keyboard, focus, contrast and 200% zoom review across every screen remains.
- [x] Exercise loading, empty, error, success and unavailable states for service-backed demo features. Browser journeys cover draft preservation, retry behavior, hydration and refresh persistence.
- [x] Extend the existing Playwright suite with meaningful journeys: entry/recovery, instructor author → learner submission → instructor feedback, lesson → quiz, experiment → progress, challenge → result, instructor drill-down, contest/discussion and hardware save/load. Include key failure paths and lazy 3D preview coverage.
- [x] From `frontend`, run `pnpm exec next typegen`, `pnpm exec tsc --noEmit`, `pnpm build` and `pnpm test:e2e`. The build now enforces TypeScript. Playwright runs one worker so cold development-route compilation does not cause unrelated timeouts.
- [x] Review the SIH frontend deliverable categories against the finished screens. `pages.md` lists all 39 route templates and states the remaining production service integrations; faculty review remains a content dependency.

**Done when:** all supported frontend journeys pass, visible features accurately represent their implementation, and backend handoff requirements are explicit. Automated route, journey and responsive checks pass; the manual accessibility review above remains before final release sign-off.

## Backend handoff checklist

| Service | Frontend to complete in this plan | Work still needed for the full platform |
| --- | --- | --- |
| Authentication | Entry/recovery forms, session states, account UI, navigation | Identity provider, secure sessions, recovery delivery, server authorization |
| Simulation | Circuit/code inputs, backend controls, run states, result rendering | Framework adapters, execution jobs, supported-code runtime and result validation |
| AI tutor | Context assembly, conversations, generated-circuit preview, loading/retry | Model integration, grounded responses, evaluation and operational limits |
| Assessment and assignments | Instructor authoring, audience selection, learner inbox, attempts, feedback, challenge editor and local supported checks | Server roles, cross-device delivery, trusted grading, execution isolation and durable assignment/assessment records |
| Progress and analytics | Shared learner/cohort models and complete dashboards | Database persistence, event processing and real cohort access |
| Community | Contest, ranking, thread and reply workflows | Multi-user storage, live rankings and permissions |

Hardware expansion, a standalone classical-versus-quantum lab, more advanced algorithms, and AI-generated personalized challenges can follow the core completion sequence. Noise Lab and What Changed already have frontend components and should be finished within the shared workbench instead of receiving duplicate pages.
