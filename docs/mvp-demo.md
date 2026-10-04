# QuantumLoop connected learner demo

Use this script after the hosted API, Aer worker, dispatcher, and frontend pass [deployment smoke](deployment.md). Keep two confirmed Supabase learner accounts ready. Run the demo from a clean browser profile so no prior local draft affects the circuit editor.

## Five-minute path

1. Open the frontend `/login`, select **Supabase account**, and sign in as learner A. The connected home should say **Welcome, ...** and offer **Open Superposition lab**.
2. Open the lab. In **Learn**, show the server-supplied Superposition lesson, then choose **Formulate Hypothesis**.
3. In **Predict**, adjust a probability slider with the arrow keys and save the prediction. The app locks it before moving to **Build**.
4. In **Build**, place **H** on qubit 0 at step 0 with the keyboard, save the circuit, and proceed to **Run**. Note the saved circuit revision.
5. Choose **Run saved prediction on Aer**. Wait for the durable job to finish. In **Observe**, show the saved prediction, sampled actual distribution, signed difference by outcome, agreement, backend, shot count, and revision in the numeric table.
6. Copy the `?stage=5&run=<UUID>` URL and reload it. The same server-derived comparison should return. Open **Explain** and ask the Lab Partner to explain the saved run; reload to show the run-bound reply persists.
7. In a separate browser profile, sign in as learner B and open learner A's run URL. It must say the run is unavailable for this account. Return to learner A's profile and confirm the run still opens.

## Before presenting

- Run the manual **Hosted learner smoke** workflow on the deployed commit with two disposable accounts. It checks real Supabase login, Aer completion, tutor reply, reload, and owner isolation. Keep its passing run URL with the presentation notes.
- Confirm the account has remaining daily Aer and tutor quota, the tutor provider key is configured, and the worker and dispatcher are healthy. The API smoke uses one run and one tutor request; the browser smoke uses another of each.
- Keep the demo focused on the connected Superposition path. Other frontend areas are labeled demo, and connected Debug/Challenge/Master grading is unavailable.
- If a live provider is temporarily unavailable, show a previously saved owner-scoped run and explain the interruption accurately. Do not present browser demo results as server-run evidence.

The current automated browser journey also checks WCAG 2.1 A/AA issues at Learn, Build, Observe, and Explain, keyboard stage focus, slider operation, gate placement, and circuit saving. A human keyboard and screen-reader pass on the hosted build is still required before claiming accessibility conformance.
