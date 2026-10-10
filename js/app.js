(() => {
  "use strict";
  const app = document.querySelector("#app");
  const exams = window.DEBRIEF50_EXAMS || {};
  const bank = window.DEBRIEF50_MOCK_BANK || {};
  const TARGET = {communications:20, "air-law":28, "operational-procedures":7, "aircraft-general-knowledge":20, "principles-of-flight":25};
  const STORAGE = 'debrief50-mock-v2';
  const HISTORY = 'debrief50-history-v2';
  let state = null, page = 'subjects', mockPool = null, timerHandle = null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeLoad = (key, fallback) => { try {return JSON.parse(localStorage.getItem(key)) || fallback;} catch {return fallback;} };
  const safeSave = (key, obj) => {try {localStorage.setItem(key,JSON.stringify(obj));}catch(e){console.warn('Local progress could not be saved',e);} };
  const shuffled = arr => {const result=[...arr];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
  const signature = q => String(q.question||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const copyQuestion = (q, subject) => ({...q,subject:subject||q.subject});
  const currentQ = () => state.questions[state.index];
  const selectedFor = q => state.answers[q.id];
  const named = key => exams[key]?.title || key;
  function shell(content) {
    app.innerHTML = `<div class="shell"><header class="topbar"><button class="brand brand-button" data-home>Debrief<span>50</span></button><nav class="top-tabs"><button data-home class="tab ${page==='subjects'?'active':''}">Subjects</button><button data-mock-tab class="tab ${page==='mock'?'active':''}">MockPrep</button></nav></header>${content}</div>`;
  }
  function subjects() {
    page='subjects'; state=null;stopTick();
    shell(`<section class="hero"><h1>Choose your subject.</h1></section><section class="subject-grid">${Object.values(exams).map(e=>`<article class="subject-card"><div class="subject-icon">${esc(e.icon||'✈️')}</div><h2>${esc(e.title)}</h2><p>${e.questions.length} questions · ${e.passMark}% pass mark</p><div class="card-actions"><button class="btn btn-secondary" data-practice="${esc(e.id)}">Practice</button><button class="btn btn-primary" data-exam="${esc(e.id)}">Exam</button></div></article>`).join('')}</section>`);
  }
  function mockSetup() {
    page='mock';state=null;stopTick();
    const saved=safeLoad(STORAGE,null);
    shell(`<section class="hero"><h1>MockPrep</h1><p>100 questions · 80% pass mark · Fully shuffled</p></section><section class="panel"><h2>Choose question bank</h2><div class="choice-grid"><button class="choice ${mockPool==='fixed'?'active':''}" data-pool="fixed"><strong>50s Only</strong><span>The five supplied 50-question papers</span></button><button class="choice ${mockPool==='all'?'active':''}" data-pool="all"><strong>All</strong><span>Fixed papers plus the original DebriefRoom question bank</span></button></div><h2>Time limit</h2><div class="choice-grid"><label class="radio-choice"><input type="radio" name="duration" value="0" checked> Untimed</label><label class="radio-choice"><input type="radio" name="duration" value="120"> 120 minutes</label></div><h2>Question distribution</h2><p class="muted-dark">Communications 20 · Air Law 28 · Operational Procedures 7 · AGK 20 · POF 25</p><button class="btn btn-primary" data-start-mock ${mockPool?'':'disabled'}>Start MockPrep</button>${saved&&saved.kind==='mock'&&!saved.finished?`<button class="btn btn-secondary" data-resume>Resume unfinished MockPrep (${esc(saved.pool==='all'?'All':'50s Only')})</button>`:''}</section>`);
  }
  function buildMock(pool) {
    const history=safeLoad(HISTORY,{}), recent=history['mock-'+pool]||[];
    const picked=[], usedText=new Set(),usedIds=new Set();
    const rank = q => {const i=recent.lastIndexOf(q.id);return i<0?-1:i;};
    // Shuffle before ranking to vary ties, but prefer unseen/least recently used items.
    function ordered(questions) {return shuffled(questions).sort((a,b)=>rank(a)-rank(b));}
    function take(candidates,number) {
      let taken=0;
      for(const q of ordered(candidates)) {
        if(taken>=number)break;
        const sig=signature(q);
        if(!sig||usedIds.has(q.id)||usedText.has(sig))continue;
        picked.push(q);usedIds.add(q.id);usedText.add(sig);taken++;
      }
      return taken;
    }
    for(const [subject,count] of Object.entries(TARGET)) {
      const fixed=(exams[subject]?.questions||[]).map(q=>({...copyQuestion(q,subject),sourceBank:'fixed'}));
      const original=pool==='all'?(bank[subject]||[]).map(q=>({...copyQuestion(q,subject),sourceBank:'original'})):[];
      if(pool==='all' && !original.length)throw new Error(`${named(subject)}: original bank not loaded. Check data/mock-bank.js and refresh the site.`);
      const before=picked.length;
      if(pool==='all') {
        // Deliberately include original-bank questions: approx. 70% per subject.
        const requestedOriginal=Math.ceil(count*0.70);
        take(original,requestedOriginal);
        take(fixed,count-(picked.length-before));
        // Fill any shortage from the combined pool while retaining per-subject quotas.
        take([...original,...fixed],count-(picked.length-before));
      } else take(fixed,count);
      if(picked.length-before!==count)throw new Error(`${named(subject)}: insufficient unique questions (${picked.length-before}/${count}).`);
    }
    return shuffled(picked);
  }
  function beginSubject(id,kind) {
    const e=exams[id];if(!e)return;
    page='subjects';state={kind,subject:id,questions:shuffled(e.questions.map(q=>copyQuestion(q,id))),index:0,answers:{},startedAt:Date.now(),finished:false};renderQuestion();
  }
  function beginMock() {
    if(!mockPool)return;
    const mins=Number(document.querySelector('input[name="duration"]:checked')?.value||0);
    try {state={kind:'mock',pool:mockPool,questions:buildMock(mockPool),index:0,answers:{},startedAt:Date.now(),endAt:mins?Date.now()+mins*60000:null,finished:false};}
    catch(err){alert(err.message);return;}
    persist();renderQuestion();
  }
  function persist(){if(state?.kind==='mock'&&!state.finished)safeSave(STORAGE,state);}
  function stopTick(){if(timerHandle)clearInterval(timerHandle);timerHandle=null;}
  function timeLeft(){return state?.endAt?Math.max(0,Math.ceil((state.endAt-Date.now())/1000)):null;}
  function tick(){const remain=timeLeft();if(remain===null)return;const el=document.querySelector('[data-clock]');if(el)el.textContent=`⏱ ${Math.floor(remain/60)}:${String(remain%60).padStart(2,'0')}`;if(remain<=0){stopTick();results(true);}}
  function renderQuestion(){
    if(!state)return;
    if(state.kind==='mock'&&timeLeft()===0){results(true);return;}
    page=state.kind==='mock'?'mock':'subjects';stopTick();const q=currentQ(),selected=selectedFor(q),practice=state.kind==='practice',total=state.questions.length;
    shell(`<section class="panel"><div class="exam-head"><div class="progress">Question ${state.index+1} of ${total}</div><div class="subject-pill">${esc(state.kind==='mock'?`MockPrep · ${named(q.subject)}`:named(state.subject))}</div></div>${state.kind==='mock'&&state.endAt?'<div class="clock" data-clock></div>':''}${q.image?`<img class="question-image" src="${esc(q.image)}" alt="Question illustration">`:''}<h1 class="question">${esc(q.question)}</h1><div class="options">${Object.entries(q.options).map(([letter,text])=>{
       const correct=practice&&selected!==undefined&&letter===q.correct;
       const wrong=practice&&selected===letter&&letter!==q.correct;
       const className=correct?'right':wrong?'wrong':selected===letter?'selected':'';
       return `<button class="option ${className}" data-answer="${letter}"><span class="letter">${letter}</span><span>${esc(text)}</span></button>`;
    }).join('')}</div>${practice&&selected!==undefined?`<p class="instant-feedback ${selected===q.correct?'success':'error'}">${selected===q.correct?'✓ Correct':'✕ Incorrect'} · Correct answer: ${esc(q.correct)}</p>`:''}<div class="nav"><button class="btn btn-secondary" data-prev ${state.index===0?'disabled':''}>Previous</button><button class="btn btn-primary" data-next>${state.index===total-1?(practice?'Finish Practice':'Review & Submit'):'Next'}</button></div><div class="exam-footer"><span>${practice?'Practice · No scoring':`${Object.keys(state.answers).length} of ${total} answered`}</span><button class="btn btn-return" data-leave>Exit</button></div></section>`);
    if(state.kind==='mock'&&state.endAt){tick();timerHandle=setInterval(tick,1000);}window.scrollTo({top:0,behavior:'instant'});
  }
  function confirmDialog(title,body,button,action){
    const el=document.createElement('div');el.className='dialog-backdrop';el.innerHTML=`<div class="dialog" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(body)}</p><div class="dialog-actions"><button class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-danger" data-confirm>${esc(button)}</button></div></div>`;
    document.body.appendChild(el);el.querySelector('[data-cancel]').onclick=()=>el.remove();el.querySelector('[data-confirm]').onclick=()=>{el.remove();action();};
  }
  function requestSubmit(){const missing=state.questions.length-Object.keys(state.answers).length;confirmDialog('Submit exam?',missing?`${missing} unanswered question(s) will count as incorrect. Return to your exam or submit anyway.`:'Submit this exam and display your results?','Submit anyway',()=>results(false));}
  function results(expired){
    if(!state||state.finished)return;stopTick();
    state.finished=true;const total=state.questions.length,bySubject={},wrong=[];let correct=0;
    state.questions.forEach((q,index)=>{
      const subject=q.subject,chosen=state.answers[q.id]||null,ok=chosen===q.correct;
      if(!bySubject[subject])bySubject[subject]={correct:0,total:0};
      bySubject[subject].total++;if(ok){correct++;bySubject[subject].correct++;}else wrong.push({q,index,chosen});
    });
    if(state.kind==='mock'){
      const k='mock-'+state.pool,history=safeLoad(HISTORY,{});const merged=[...(history[k]||[]),...state.questions.map(q=>q.id)];history[k]=merged.slice(-1600);safeSave(HISTORY,history);try{localStorage.removeItem(STORAGE);}catch{}
    }
    const passMark=state.kind==='mock'?80:exams[state.subject].passMark,percent=(correct*100/total),passed=percent>=passMark;
    const bankCounts=state.kind==='mock' ? state.questions.reduce((counts,q)=>{counts[q.sourceBank==='original'?'original':'fixed']++;return counts;},{original:0,fixed:0}) : null;
    const sourceDetails=state.kind==='mock'?`<p class="muted-dark"><strong>Question sources:</strong> Original bank ${bankCounts.original} · Fixed 50s ${bankCounts.fixed}</p>`:'';
    const breakdown=state.kind==='mock'?`<h2>Subject performance</h2><div class="subject-results">${Object.entries(TARGET).map(([key])=>{const v=bySubject[key]||{correct:0,total:0};return `<div><span>${esc(named(key))}</span><strong>${v.correct}/${v.total} · ${v.total?Math.round(v.correct/v.total*100):0}%</strong></div>`;}).join('')}</div>`:'';
    const ordered=Object.entries(bySubject).sort((a,b)=>a[1].correct/a[1].total-b[1].correct/b[1].total);
    const insights=state.kind==='mock'?`<p class="muted-dark"><strong>Improve first:</strong> ${esc(named(ordered[0][0]))} · <strong>Strongest:</strong> ${esc(named(ordered[ordered.length-1][0]))}</p>`:'';
    shell(`<section class="panel"><div class="result-hero"><div class="subject-pill" style="display:inline-block">${esc(state.kind==='mock'?'MockPrep':named(state.subject))}</div><h1 class="score ${passed?'pass':'fail'}">${correct}/${total}</h1><h2 class="${passed?'pass':'fail'}">${passed?'Pass':'Fail'} · ${percent.toFixed(1)}%</h2>${expired?'<p>Time expired — exam submitted automatically.</p>':''}</div><div class="stats"><div class="stat"><strong>${correct}</strong>Correct</div><div class="stat"><strong>${total-correct}</strong>Incorrect / unanswered</div><div class="stat"><strong>${passMark}%</strong>Pass mark</div></div>${sourceDetails}${breakdown}${insights}<h2>${wrong.length?'Questions to review':'Perfect score'}</h2><div class="review-list">${wrong.map(({q,index,chosen})=>`<article class="review"><h3>Q${index+1} · ${esc(named(q.subject))}: ${esc(q.question)}</h3>${q.image?`<img class="question-image" src="${esc(q.image)}" alt="Question illustration">`:''}<div class="answer-line wrong-answer"><strong>Your answer:</strong> ${chosen?esc(chosen+'. '+q.options[chosen]):'Unanswered'}</div><div class="answer-line right-answer"><strong>Correct answer:</strong> ${esc(q.correct+'. '+q.options[q.correct])}</div></article>`).join('')}</div><div class="actions"><button class="btn btn-primary" data-restart>Retake</button><button class="btn btn-secondary" data-home>Return to subjects</button></div></section>`);
  }
  app.addEventListener('click',ev=>{
    const b=ev.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-home'))subjects();
    else if(b.hasAttribute('data-mock-tab'))mockSetup();
    else if(b.dataset.practice)beginSubject(b.dataset.practice,'practice');
    else if(b.dataset.exam)beginSubject(b.dataset.exam,'exam');
    else if(b.dataset.pool){mockPool=b.dataset.pool;mockSetup();}
    else if(b.hasAttribute('data-start-mock'))beginMock();
    else if(b.hasAttribute('data-resume')){const saved=safeLoad(STORAGE,null);if(saved&&saved.kind==='mock'&&!saved.finished){state=saved;renderQuestion();}}
    else if(b.dataset.answer&&state){const q=currentQ();state.answers[q.id]=b.dataset.answer;persist();renderQuestion();}
    else if(b.hasAttribute('data-prev')&&state){state.index=Math.max(0,state.index-1);persist();renderQuestion();}
    else if(b.hasAttribute('data-next')&&state){if(state.index===state.questions.length-1){if(state.kind==='practice')subjects();else requestSubmit();}else{state.index++;persist();renderQuestion();}}
    else if(b.hasAttribute('data-leave')&&state){confirmDialog('Leave this session?',state.kind==='mock'?'Your MockPrep progress is saved and can be resumed.':'Leave and discard this attempt?','Leave',()=>state.kind==='mock'?mockSetup():subjects());}
    else if(b.hasAttribute('data-restart')&&state){if(state.kind==='mock'){mockPool=state.pool;mockSetup();}else beginSubject(state.subject,state.kind);}
  });
  subjects();
})();
