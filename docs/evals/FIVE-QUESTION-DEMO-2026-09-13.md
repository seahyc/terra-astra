# Five-question deployed demo review

Baseline: public v0.8.3, 1500×894 browser viewport, typed questions in the requested order, separate signed-in QA tab. No console warnings/errors captured. Times below are upper-bound observation times, not instrumented benchmarks.

| Question | Observed baseline | Repair |
| --- | --- | --- |
| Show me Angkor Wat | Temple and part controls visible by 16s, readable framing. | Preserve model and framing. |
| Now show me the data centers in the US | Four US clusters named by 23s, but Inside AI model stayed over Cambodia. Caption ended at “U.S.” | Map-intent requests fit the returned locations; named controls visit each. Model placement never inherits the last question’s location. |
| How deep is the Java trench? | Model visible, answer only supplied the −5,361m transect sample minimum. | Supply the separately surveyed 7,187 ±13m maximum with NERC source and explicit measurement scope. Retain accurate transect provenance. |
| Show me the ports of Singapore and how it moves so many shipping containers | First answer throttled while model appeared; retry produced explanation with unsupported rail freight. | Busy retries do not spend inference allowance. Relevant PSA/MOT evidence grounds cranes, yard vehicles, transshipment and trucks. |
| And what's the geometry of the streets in New York? | Correct prose by 23s, but only regional night lights; reverse-word-order phrase missed prepared model. | Match streets before or after New York. Preserve model versus surveyed-street distinction. |

The same release includes the separately requested full-paragraph voice/transcript treatment. Grounded result delivery is guarded against cancelled or superseded turns and precedes camera/model completion. Actual grouped speech text is retained; paragraphs wrap and scroll rather than disappear behind an ellipsis. Model answers with known anchors avoid a redundant catalogue-city journey.

Evidence packets are retrieval context for the generic answer router, not fixed answers. Unit checks cannot prove live model compliance. Public post-deployment rerun and physical microphone/audio audition must be reported separately.


## Public v0.8.4 rerun

All five exact questions returned the expected answer and map/model controls. Q1 and Q2 had screenshot and DOM evidence. Browser screenshot tooling reset its session afterward; Q3–Q5 used DOM evidence from fresh authenticated QA tabs. This was not an uninterrupted same-tab sequence, and typed input does not establish physical microphone/audio behavior.

- Angkor Wat: temple, named parts and complete paragraph.
- US data centers: continental US overview and Virginia/Dallas/Phoenix/Atlanta location buttons; no Cambodia model.
- Java Trench: surveyed 7,187 ±13m maximum with source and distinct 5,361m profile sample; elevation model ready.
- Singapore ports: coherent cranes, automated guided vehicles, yard operations, transshipment and trucks; terminal and generated diagram loaded, no unsupported rail assertion.
- New York streets: full explanation, street geometry diagram, planned blocks/older pattern/diagonal avenue model controls; Manhattan grid model ready.

No repeat 429 was observed. Confirmed remaining polish addressed by v0.8.5: production integration CSS omitted by tree shaking, large pending-image frame, and raw source URLs in prose/narration. The semantic conversation/article split is included from the parallel user-requested repair. Post-deployment acceptance remains separate from these observations.


## Public v0.8.5 final acceptance

Published source/tag: `a5a5ff30e7ec8dcc22bdd298d0ca490dd9d555ed` / `v0.8.5`; native deployment succeeded at 15:39:05 SGT. The primary coordinator completed all five exact typed questions in one uninterrupted, authenticated Chrome tab after the independent QA task's browser connection failed. No physical microphone/audio audition was performed in this run.

| Ordered question | Final observed result | Question to answer | Model ready |
| --- | --- | --- | --- |
| Angkor Wat | Complete paragraph; temple, moat, causeway, galleries, terraces and five towers. | 6.1s | 13.2s |
| US data centers | National location overview; Northern Virginia, Dallas–Fort Worth, Phoenix and Atlanta controls; no stale Cambodia model. Generated market-pattern graphic completed. | 13.7s | Map turn 20.6s |
| Java Trench | Surveyed 7,187 ±13m maximum explicitly separated from 5,361m transect; elevation model and generated comparison graphic completed. | 7.2s | 10.0s |
| Singapore ports | Pasir Panjang/Tuas, quay cranes, yard stacks, automated guided vehicles, transshipment and truck distribution; descriptive PSA/MOT links, no bare URLs in article or transcript. | 13.2s | 12.3s |
| New York street geometry | Full paragraph explaining Manhattan grid and older/borough patterns; planned blocks, older street pattern and diagonal avenue model controls. | 3.6s | 11.0s |

Timing uses monotonic elapsed-time differences from local exported telemetry for this single run, not a general latency benchmark. The wall clock moved backward during the second question; monotonic timing avoids understating that response. The report contains 52 metadata events across exactly five completed turns, zero evictions, successful answer HTTP responses, successful navigation commands, and no recorded error/retry events. Browser console warning/error capture was empty. Two generated image requests completed successfully; four prepared models were cached. These ordinary questions selected quick/standard answer routes with zero newly delegated subagents; this run does not establish native Agents API delegation or voice playback.

Actual final-view checks:
- Desktop 1500×894: answer bottom 637.99px, dock top 674.17px, 36.18px clearance. Opening computed display is `none`.
- Phone viewport 390×844: answer bottom 537.99px, dock top 600px, 62.01px clearance; input bottom 820px within viewport; no horizontal page overflow. Answer area scrolls (268px client / 637px content). Native screenshots show the starlight model above the editorial card and separate transcript below.
- Temporary phone override was reset to the original 1500×894; the coordinator's temporary QA tabs were closed. User tabs were preserved.
- Debug report downloaded through the visible Diagnostics → Export debug report control. It contains build/timing/route/navigation/error metadata, excluding conversation text, coordinates, URLs, audio and credentials. The local artifact remains outside the repository.
