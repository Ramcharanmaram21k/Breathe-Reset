/**
 * BREATHE RESET — script.js
 * Guided breathing exercises with animated visual feedback
 */

'use strict';

/* ════════════════════════════════════════
   EXERCISE DEFINITIONS
════════════════════════════════════════ */
const EXERCISES = {
  '478': {
    name:     '4-7-8 Breathing',
    subtitle: 'Activates the parasympathetic nervous system',
    phases: [
      { id: 'inhale', label: 'Inhale',  duration: 4, instruction: 'Inhale slowly through your nose...',    state: 'state-inhale' },
      { id: 'hold',   label: 'Hold',    duration: 7, instruction: 'Hold your breath gently...',            state: 'state-hold'   },
      { id: 'exhale', label: 'Exhale',  duration: 8, instruction: 'Exhale completely through your mouth...', state: 'state-exhale' },
    ],
  },
  'box': {
    name:     'Box Breathing',
    subtitle: 'Used by Navy SEALs for calm under pressure',
    phases: [
      { id: 'inhale', label: 'Inhale',  duration: 4, instruction: 'Inhale slowly through your nose...',    state: 'state-inhale' },
      { id: 'hold1',  label: 'Hold',    duration: 4, instruction: 'Hold at the top...',                    state: 'state-hold'   },
      { id: 'exhale', label: 'Exhale',  duration: 4, instruction: 'Exhale fully through your mouth...',   state: 'state-exhale' },
      { id: 'hold2',  label: 'Hold',    duration: 4, instruction: 'Hold at the bottom...',                 state: 'state-hold'   },
    ],
  },
  'calm': {
    name:     'Calm Breathing',
    subtitle: 'Slow, even breath for deep relaxation',
    phases: [
      { id: 'inhale', label: 'Inhale',  duration: 5, instruction: 'Breathe in deeply and slowly...',       state: 'state-inhale' },
      { id: 'exhale', label: 'Exhale',  duration: 5, instruction: 'Let the breath flow out completely...', state: 'state-exhale' },
    ],
  },
};

/* ════════════════════════════════════════
   DOM REFS
════════════════════════════════════════ */
const DOM = {
  exerciseBtns:   document.querySelectorAll('.exercise-btn'),
  breathCircle:   document.getElementById('breathCircle'),
  phaseName:      document.getElementById('phaseName'),
  phaseTimer:     document.getElementById('phaseTimer'),
  instructionText:document.getElementById('instructionText'),
  startBtn:       document.getElementById('startBtn'),
  startBtnLabel:  document.getElementById('startBtnLabel'),
  iconPlay:       document.querySelector('.icon-play'),
  iconPause:      document.querySelector('.icon-pause'),
  resetBtn:       document.getElementById('resetBtn'),
  skipBtn:        document.getElementById('skipBtn'),
  exerciseTitle:  document.getElementById('exerciseTitle'),
  exerciseSubtitle:document.getElementById('exerciseSubtitle'),
  roundDisplay:   document.getElementById('roundDisplay'),
  progressFill:   document.getElementById('progressFill'),
  phaseDots:      document.getElementById('phaseDots'),
  cycleCount:     document.getElementById('cycleCount'),
  sessionTime:    document.getElementById('sessionTime'),
};

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
const state = {
  exercise:      '478',
  running:       false,
  phaseIndex:    0,
  secondsLeft:   0,
  cycleCount:    0,
  sessionSeconds:0,

  // timers
  phaseTimer:    null,
  sessionTimer:  null,
};

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function getExercise()  { return EXERCISES[state.exercise]; }
function getPhases()    { return getExercise().phases; }
function currentPhase() { return getPhases()[state.phaseIndex]; }

function clearTimers() {
  clearInterval(state.phaseTimer);
  clearInterval(state.sessionTimer);
  state.phaseTimer    = null;
  state.sessionTimer  = null;
}

/* ════════════════════════════════════════
   UI — EXERCISE TITLE
════════════════════════════════════════ */
function updateExerciseMeta() {
  const ex = getExercise();
  DOM.exerciseTitle.textContent    = ex.name;
  DOM.exerciseSubtitle.textContent = ex.subtitle;
}

/* ════════════════════════════════════════
   UI — PHASE DOTS
════════════════════════════════════════ */
function buildPhaseDots() {
  DOM.phaseDots.innerHTML = '';
  getPhases().forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'phase-dot';
    dot.dataset.index = i;
    DOM.phaseDots.appendChild(dot);
  });
}

function updatePhaseDots(activeIndex) {
  DOM.phaseDots.querySelectorAll('.phase-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i === activeIndex)  dot.classList.add('active');
    else if (i < activeIndex) dot.classList.add('done');
  });
}

/* ════════════════════════════════════════
   UI — PROGRESS ARC
════════════════════════════════════════ */
const CIRCUMFERENCE = 2 * Math.PI * 148; // r=148

function setProgress(ratio) {
  // ratio 0 = empty, 1 = full
  const offset = CIRCUMFERENCE * (1 - ratio);
  DOM.progressFill.style.strokeDashoffset = offset;
}

function updateProgressColor(phaseId) {
  const colorMap = {
    inhale: '#4a9eff',
    hold:   '#38c9c9',
    hold1:  '#38c9c9',
    hold2:  '#a78bfa',
    exhale: '#a78bfa',
  };
  DOM.progressFill.style.stroke = colorMap[phaseId] || '#4a9eff';
}

/* ════════════════════════════════════════
   UI — INSTRUCTION TEXT (fade transition)
════════════════════════════════════════ */
function setInstruction(text) {
  const el = DOM.instructionText;
  el.classList.add('fade-out');
  setTimeout(() => {
    el.textContent = text;
    el.classList.remove('fade-out');
    el.classList.add('fade-in');
    setTimeout(() => el.classList.remove('fade-in'), 400);
  }, 200);
}

/* ════════════════════════════════════════
   UI — CIRCLE STATE
════════════════════════════════════════ */
const ALL_STATES = ['state-inhale', 'state-hold', 'state-exhale', 'state-idle'];

function setCircleState(stateClass) {
  ALL_STATES.forEach(s => DOM.breathCircle.classList.remove(s));
  if (stateClass) DOM.breathCircle.classList.add(stateClass);
}

/* ════════════════════════════════════════
   UI — SESSION TIMER
════════════════════════════════════════ */
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function startSessionTimer() {
  state.sessionTimer = setInterval(() => {
    state.sessionSeconds++;
    DOM.sessionTime.textContent = formatTime(state.sessionSeconds);
  }, 1000);
}

/* ════════════════════════════════════════
   CORE — START PHASE
════════════════════════════════════════ */
function startPhase() {
  const phase = currentPhase();
  const total = phase.duration;

  state.secondsLeft = total;

  // Update circle
  setCircleState(phase.state);

  // Update inner text
  DOM.phaseName.textContent  = phase.label.toUpperCase();
  DOM.phaseTimer.textContent = state.secondsLeft;

  // Update instruction
  setInstruction(phase.instruction);

  // Progress & dots
  updateProgressColor(phase.id);
  setProgress(0); // reset arc to 0 immediately
  setTimeout(() => setProgress(1), 50); // this triggers a smooth 0→1 over duration via CSS transition (we manage manually)

  // Progress is driven manually per-second
  updateProgressColor(phase.id);
  setProgress((total - state.secondsLeft) / total);

  updatePhaseDots(state.phaseIndex);

  // Tick
  state.phaseTimer = setInterval(() => {
    state.secondsLeft--;
    DOM.phaseTimer.textContent = state.secondsLeft;
    setProgress(1 - state.secondsLeft / total);

    if (state.secondsLeft <= 0) {
      clearInterval(state.phaseTimer);
      nextPhase();
    }
  }, 1000);
}

/* ════════════════════════════════════════
   CORE — NEXT PHASE
════════════════════════════════════════ */
function nextPhase() {
  const phases = getPhases();
  state.phaseIndex++;

  if (state.phaseIndex >= phases.length) {
    // Completed one full cycle
    state.phaseIndex = 0;
    state.cycleCount++;
    DOM.cycleCount.textContent  = state.cycleCount;
    DOM.roundDisplay.textContent = state.cycleCount;
  }

  startPhase();
}

/* ════════════════════════════════════════
   CONTROLS — START / PAUSE
════════════════════════════════════════ */
function startSession() {
  state.running = true;
  DOM.startBtn.classList.add('playing');
  DOM.iconPlay.style.display  = 'none';
  DOM.iconPause.style.display = 'block';
  DOM.startBtnLabel.textContent = 'Pause';

  if (!state.sessionTimer) {
    startSessionTimer();
  }

  startPhase();
}

function pauseSession() {
  state.running = false;
  clearInterval(state.phaseTimer);
  clearInterval(state.sessionTimer);
  state.sessionTimer = null;

  DOM.startBtn.classList.remove('playing');
  DOM.iconPlay.style.display  = 'block';
  DOM.iconPause.style.display = 'none';
  DOM.startBtnLabel.textContent = 'Resume';

  setCircleState('state-idle');
  setInstruction('Paused — press Resume to continue');
  DOM.phaseName.textContent  = 'Paused';
  DOM.phaseTimer.textContent = '—';
}

function resetSession() {
  clearTimers();
  state.running       = false;
  state.phaseIndex    = 0;
  state.secondsLeft   = 0;
  state.cycleCount    = 0;
  state.sessionSeconds= 0;

  DOM.cycleCount.textContent    = '0';
  DOM.sessionTime.textContent   = '0:00';
  DOM.roundDisplay.textContent  = '—';

  DOM.startBtn.classList.remove('playing');
  DOM.iconPlay.style.display  = 'block';
  DOM.iconPause.style.display = 'none';
  DOM.startBtnLabel.textContent = 'Start';

  setCircleState('state-idle');
  setProgress(0);
  setInstruction('Choose an exercise and press Start');
  DOM.phaseName.textContent  = 'Ready';
  DOM.phaseTimer.textContent = '—';

  updatePhaseDots(-1);
}

function skipPhase() {
  if (!state.running) return;
  clearInterval(state.phaseTimer);
  nextPhase();
}

/* ════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════ */
DOM.startBtn.addEventListener('click', () => {
  if (state.running) pauseSession();
  else               startSession();
});

DOM.resetBtn.addEventListener('click', () => {
  resetSession();
});

DOM.skipBtn.addEventListener('click', () => {
  skipPhase();
});

DOM.exerciseBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const ex = btn.dataset.exercise;
    if (ex === state.exercise) return;

    // Switch exercise — reset first
    resetSession();
    state.exercise = ex;

    // Update active sidebar item
    DOM.exerciseBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update metadata
    updateExerciseMeta();
    buildPhaseDots();
  });
});

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
function init() {
  updateExerciseMeta();
  buildPhaseDots();
  setCircleState('state-idle');
  setProgress(0);

  // Init progress stroke-dasharray
  DOM.progressFill.style.strokeDasharray  = CIRCUMFERENCE;
  DOM.progressFill.style.strokeDashoffset = CIRCUMFERENCE;

  // Smooth progress transition driven by interval (1s steps)
  // No CSS transition on stroke-dashoffset; we update every second in startPhase tick
}

init();
