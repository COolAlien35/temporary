# QuantumLoop submission video script

**Target runtime:** 7–8 minutes, spoken at a natural pace.  
**Story:** A learner moves from curiosity to evidence-based understanding; an instructor uses that evidence to guide the next lesson.  
**Recording order:** Landing and login → Hardware Studio → Circuit Studio → learner roadmap and nine-stage loop → curriculum and quiz → contests and challenges → instructor workflow → learner passport and home.

## 0:00–0:35 · An invitation to learn by doing

**On screen:** Show the landing-page hero, scroll through the platform overview, return to the login form, and sign in with the prepared demo profile.

**Voiceover:**

> Quantum computing is often taught through equations and finished answers. But understanding grows when a student can ask, “What do I think will happen?” and then test it. QuantumLoop is a learning platform built around that moment. It connects lessons, predictions, circuit experiments, feedback, and instructor guidance in one journey. Let’s sign in and start with something that makes the subject tangible: the physical hardware behind a quantum computer.

## 0:35–2:35 · Hardware Studio: connect the circuit to the real machine

**On screen:** Open Hardware Studio immediately. Show the overview, then Component Catalog. Filter components; open a 3D preview and rotate it. Toggle ports, dimensions, and wireframe. Enter Builder Studio and show the 3D refrigerator before switching to the diagram view. Place a component on a stage, connect two ports, select the component to inspect it, then show Checks and Thermal. Briefly point to Save, Load, and Collaborate.

**Voiceover:**

> A quantum circuit is only the beginning. To control a superconducting qubit, signals must travel from room temperature through a dilution refrigerator to a stage measured in millikelvin. Along the way, engineers have to reduce thermal noise, preserve useful signals, and stay within strict cooling budgets. Hardware Studio lets students explore those decisions instead of treating the processor as a black box.
>
> The Component Catalog introduces the parts and their purpose. Attenuators reduce noise and signal power on incoming lines. Filters reject unwanted frequencies. Circulators help keep returning readout signals on the right path. Each entry shows specifications and compatible stages. The interactive 3D viewer lets us rotate a part and inspect its ports, dimensions, and wireframe, connecting the name in a textbook to a physical component.
>
> In Builder Studio, the six-stage refrigerator becomes a design space. The 3D model shows how the assembly fits together. In the diagram view, we can place components on stages and connect ports to route an XY drive, flux line, or readout path. Selecting an element reveals its details in the inspector. System checks identify invalid connections, while the thermal view shows whether the design respects each stage’s cooling budget. That gives learners a practical reason to think about both signal flow and heat. We can save a design, reopen it later, or collaborate on a shared hardware setup.

## 2:35–3:50 · Circuit Studio: build, inspect, run, and collaborate

**On screen:** Show the gate palette and a prepared visual circuit. Drag or add a gate and show the readable sequence. Switch to Code and OpenQASM, make a small edit, and apply it to the circuit. Run it. Show the histogram, statevector, Bloch, and amplitude views. Load a template; point out saved circuits. Open the collaboration-party dialog and show party size, join policy, edit access, and expiry.

**Voiceover:**

> Circuit Studio is the open workspace for testing quantum ideas. We can build a circuit visually by placing gates on qubit lines, then inspect the exact order of operations in the readable sequence. The Code view expresses the same circuit in OpenQASM. We can edit that representation and apply it back to the visual circuit, helping learners connect gate diagrams with quantum program syntax.
>
> When we run the circuit, the local statevector simulator evolves the state gate by gate and calculates its measurement probabilities. The histogram shows what outcomes to expect. The statevector and amplitude views expose the mathematical state behind those outcomes, while the Bloch view helps make a single qubit’s state easier to picture. Moving between these views helps answer both “What happened?” and “Why?”
>
> Templates provide a quick way to study examples such as Bell pairs, GHZ states, and algorithm circuits. Learners can save their own work and return to it later. They can also create a collaboration party, choose who may join, set editing access, and set a link expiry, making circuit exploration a group learning activity.

## 3:50–4:50 · The roadmap and the nine-stage learning loop

**On screen:** Open the learner roadmap. Pause on the recommended next lesson, track list, recent activity, assigned work, and daily practice. Open the Superposition lab. Move through all nine sidebar stages quickly, pausing on Predict and the prediction-versus-result experience if prepared.

**Voiceover:**

> Back on the learner roadmap, QuantumLoop turns a large subject into a clear next step. It can direct a student to resume an unfinished lesson, review a recent quiz that went poorly, retry a challenge, or continue through the curriculum. The learning experience brings together completed chapters, quiz mistakes, challenge outcomes, and a learner’s interests, including the topics they choose to explore in contests. That makes the next step feel relevant to the individual, not just the course sequence.
>
> The guided labs use a nine-stage loop: **Learn, Predict, Build, Run, Observe, Explain, Debug, Challenge, and Master**. First, the learner studies the idea and commits to an expected probability distribution. Then they build a circuit, run it, and compare the observed outcomes with that prediction. If the results disagree, the student has a precise question to investigate. Explanation and debugging turn the mismatch into learning; challenge and mastery ask whether the idea still holds in a new situation. This is the core of QuantumLoop: students practise scientific reasoning while learning quantum computing.

## 4:50–5:30 · Curriculum: concepts, checkpoints, and useful feedback

**On screen:** Open Quantum Foundations, enter the first lesson, show the explanation and checkpoint, then open the unit quiz. Submit prepared answers and show the per-question feedback.

**Voiceover:**

> The curriculum supplies the concepts learners need for those experiments. Units organize lessons in a clear sequence, while each lesson combines an explanation with checkpoints. In Quantum Foundations, students encounter qubit amplitudes, measurement, and phase before applying them in a circuit. A quiz tests more than recall. For example, a learner must know that the probability of measuring a basis state comes from the squared magnitude of its amplitude. After submission, the quiz explains each answer. A missed question becomes a specific topic to revisit, and the roadmap can bring that review back to the front of the learning path.

## 5:30–6:00 · Practice and contests: transfer the learning

**On screen:** Show Contests and its leaderboard or sample rankings, then Challenges. Open Make a balanced qubit; show its target, constraints, workbench, and feedback area.

**Voiceover:**

> Learning is stronger when students can apply a concept beyond the example in the lesson. The Challenges arena gives each task a measurable target and constraints. Here, the aim is a balanced qubit: measuring zero and one should each have probability one half, within the allowed gate budget. Students build, run, and submit a circuit for immediate feedback. Contests add a competitive setting: learners tackle quantum algorithm problems, submit their circuits, and compare results on a leaderboard. Their choices also reveal which topics motivate them to explore further.

## 6:00–6:55 · The instructor closes the feedback loop

**On screen:** Open the instructor overview. Show learner counts, needs-attention panel, frequently missed questions, and recent assessment activity. Open assignment creation; show the circuit selection, quiz and written-response fields, then the learner preview. Open assigned work as a learner and show the response form. If a prepared submission exists, show the instructor review and feedback screen.

**Voiceover:**

> For an instructor, the value of all these activities is the evidence they produce. The instructor dashboard brings together assessment results, learners who may need support, and questions that are repeatedly missed. Instead of seeing only a final grade, a teacher can spot a pattern—for example, confusion about a Hadamard gate or global phase—and decide what to revisit with the class.
>
> Instructors can then act on that insight. They can create an assignment around a saved circuit, add quiz questions, ask for written reasoning, and preview what learners will see before publishing. Students receive that work in their inbox, study the circuit, save a draft, and submit their response. The instructor can inspect the submission and give feedback. The workflow shows how assessment analysis can lead directly to targeted teaching.

## 6:55–7:35 · AI guidance and the learner passport

**On screen:** Briefly open the AI tutor on a circuit or lab result and ask a question about the observed outcome. Then open the Me page and show XP, streak, activity calendar, badges, mastery ledger, prediction calibration, state explorer, and recent activity. Return to Home to show assigned work and the daily question.

**Voiceover:**

> QuantumLoop also brings AI into the learning process as a guide. The AI tutor can use the current lesson, circuit, and run result to help a learner investigate an unexpected outcome, understand a gate, or decide what experiment to try next. It supports reasoning around evidence, giving students timely help while they are working through a problem.
>
> The learner passport makes growth visible over time. It brings together activity, XP, streaks, badges, concept mastery, and prediction calibration—how well a learner’s expectations align with results. Students can revisit earlier work and explore a qubit state directly. Back on the roadmap, assigned work stays visible, and a daily question encourages regular practice.

## 7:35–7:50 · Close

**On screen:** End with a clean montage: 3D refrigerator, locked prediction versus result, Circuit Studio output, instructor insight, and the QuantumLoop logo.

**Voiceover:**

> QuantumLoop brings the full learning journey together: understand the concept, predict the outcome, build the system, test it, and learn from the evidence—with an instructor able to guide what happens next.

## Recording notes

- Show the 3D refrigerator within the first minute, as requested, then demonstrate how the 2D diagram connects to it.
- Prepare a meaningful wrong quiz answer so the feedback and recommendation have a clear learning purpose.
- In the nine-stage lab, spend the most time on the prediction and the observed result. Move quickly through the other stage labels.
- In Circuit Studio, make one visible change before running so the result clearly follows an action.
- Use a prepared assignment and submission so the instructor analysis, learner response, and feedback can all be shown without lengthy typing.
- Prepare the AI tutor and one concise question about a circuit result so the response can be shown without waiting during the recording.
