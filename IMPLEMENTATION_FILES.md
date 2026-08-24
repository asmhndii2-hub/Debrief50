# Aircraft General Knowledge integration

## Created

- `data/aircraft-general-knowledge.js`

## Modified

- `index.html`
- `tests/validate.js`
- `README.md`
- `IMPLEMENTATION_FILES.md`

## Approved source repairs

- Q4: `self-contain` → `self-contained`
- Q7: `premier` → `primer`
- Q15: restored missing values to `40 amp/hr` and `4 amps`; correct answer remains C — 10 hours
- Q24: `pilot tube` → `pitot tube`
- Q37: `Old` → `Oil` in the two affected answer choices
- Q44: `Carburetor icings` → `Carburetor icing`

## Internal review markers

- Q27 — source answer retained as A
- Q43 — source answer retained as A
- Q49 — source answer retained as B

These review flags are stored in question metadata and are not shown during the exam attempt.

## Behaviour

- Aircraft General Knowledge appears as a fourth Debrief50 subject.
- Starting it launches the supplied 50-question fixed exam.
- Question order is shuffled at the start of every attempt.
- A question's wording, A/B/C/D choices, correct answer, explanation, review metadata, and visual reference remain one object and are never shuffled independently.
- Answer choices remain in the original A/B/C/D order.
