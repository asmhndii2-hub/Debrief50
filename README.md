# Debrief50 — Practice + MockPrep upgrade

Five fixed 50Q subjects, each with **Practice** (instant right/wrong feedback, can change answer, no scoring) and **Exam** (delayed scoring).

**MockPrep** pools: **50s Only** (250 fixed) or **All** (five original banks plus fixed). Each mock has exactly 100 fully shuffled questions: Communications 20, Air Law 28, Operational Procedures 7, AGK 20, POF 25. Pass: 80%. Optional 120-minute timer; timed attempts continue counting when browser is closed. Local-storage autosave, resume, per-pool repeat-minimization, detailed subject results and wrong-answer review.

All answer options retain their original A/B/C/D positions. Imported original question images are included. The original DebriefRoom project is untouched.

**Install:** Copy the contents of this Debrief50 folder over your **Debrief50** GitHub repository root, retaining the folder structure. Test with `node tests/validate.js` before deployment.

**Important:** Original banks in this patch are reconstructed from the available DebriefRoom v1.0 integration archive; if your current GitHub repository has more recent corrected bank files, have them audited and re-integrated before replacing this bank. The 50-question fixed papers are preserved from your previous local Debrief50 build. Browser history is device-specific, not cloud synchronized.
