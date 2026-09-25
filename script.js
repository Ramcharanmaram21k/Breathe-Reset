/**
 * BREATHE RESET — script.js
 * Guided breathing with duration-synced visuals, focus mode,
 * settings, audio/haptics, keyboard shortcuts, and a11y live region.
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
      { id: 'inhale', label: 'Inhale',  duration: 4, instruction: 'Inhale slowly through your nose...',      state: 'state-inhale', phaseKey: 'inhale', size: 'full' },
      { id: 'hold',   label: 'Hold',    duration: 7, instruction: 'Hold your breath gently...',              state: 'state-hold',   phaseKey: 'hold',   size: 'full' },
      { id: 'exhale', label: 'Exhale',  duration: 8, instruction: 'Exhale completely through your mouth...', state: 'state-exhale', phaseKey: 'exhale', size: 'small' },
    ],
  },
  'box': {
    name:     'Box Breathing',
    subtitle: 'Used by Navy SEALs for calm under pressure',
    phases: [
      { id: 'inhale', label: 'Inhale',  duration: 4, instruction: 'Inhale slowly through your nose...',  state: 'state-inhale', phaseKey: 'inhale', size: 'full'  },
      { id: 'hold1',  label: 'Hold',    duration: 4, instruction: 'Hold at the top...',                  state: 'state-hold',   phaseKey: 'hold',   size: 'full'  },
      { id: 'exhale', label: 'Exhale',  duration: 4, instruction: 'Exhale fully through your mouth...', state: 'state-exhale', phaseKey: 'exhale', size: 'small' },
      { id: 'hold2',  label: 'Hold',    duration: 4, instruction: 'Hold at the bottom...',               state: 'state-hold',   phaseKey: 'hold',   size: 'small' },
    ],
  },
  'calm': {
    name:     'Calm Breathing',
    subtitle: 'Slow, even breath for deep relaxation',
    phases: [
      { id: 'inhale', label: 'Inhale',  duration: 5, instruction: 'Breathe in deeply and slowly...',       state: 'state-inhale', phaseKey: 'inhale', size: 'full'  },
      { id: 'exhale', label: 'Exhale',  duration: 5, instruction: 'Let the breath flow out completely...', state: 'state-exhale', phaseKey: 'exhale', size: 'small' },
    ],
  },
};

const EXERCISE_KEYS = ['478', 'box', 'calm'];
const STORAGE_KEY = 'breathe-reset-settings';

const PHASE_COLORS = {
  inhale: '#4f8174',
  hold:   '#a58c59',
  exhale: '#c7836d',
};

/* ════════════════════════════════════════
   DOM REFS
════════════════════════════════════════ */
const DOM = {
  exerciseBtns:     document.querySelectorAll('.exercise-btn'),
  chips:            document.querySelectorAll('.chip'),
  breathCircle:     document.getElementById('breathCircle'),
  phaseName:        document.getElementById('phaseName'),
  phaseTimer:       document.getElementById('phaseTimer'),
  instructionText:  document.getElementById('instructionText'),
  startBtn:         document.getElementById('startBtn'),
  startBtnLabel:    document.getElementById('startBtnLabel'),
  iconPlay:         document.querySelector('.icon-play'),
  iconPause:        document.querySelector('.icon-pause'),
  resetBtn:         document.getElementById('resetBtn'),
  skipBtn:          document.getElementById('skipBtn'),
  exerciseTitle:    document.getElementById('exerciseTitle'),
  exerciseSubtitle: document.getElementById('exerciseSubtitle'),
  roundDisplay:     document.getElementById('roundDisplay'),
  progressFill:     document.getElementById('progressFill'),
  phaseDots:        document.getElementById('phaseDots'),
  cycleCount:       document.getElementById('cycleCount'),
  sessionTime:      document.getElementById('sessionTime'),
  liveRegion:       document.getElementById('liveRegion'),
  targetRounds:     document.getElementById('targetRounds'),
  targetRoundsMobile: document.getElementById('targetRoundsMobile'),
  soundToggle:      document.getElementById('soundToggle'),
  hapticToggle:     document.getElementById('hapticToggle'),
  soundToggleMobile: document.getElementById('soundToggleMobile'),
  hapticToggleMobile: document.getElementById('hapticToggleMobile'),
  completeOverlay:  document.getElementById('completeOverlay'),
  completeTitle:    document.getElementById('completeTitle'),
  completeSub:      document.getElementById('completeSub'),
  completeDismiss:  document.getElementById('completeDismiss'),
  themeToggle:      document.getElementById('themeToggle'),
  themeToggleMobile: document.getElementById('themeToggleMobile'),
  sessionPresets:   document.getElementById('sessionPresets'),
};

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
const state = {
  exercise:       '478',
  running:        false,
  phaseIndex:     0,
  secondsLeft:    0,
  cycleCount:     0,
  sessionSeconds: 0,
  firstStart:     true,
  pausedRemaining: null,
  lastSize:       'idle',

  // settings
  targetRounds: 0,
  sessionMode: 'time',
  sessionMinutes: 3,
  sound: true,
  haptics: true,
  theme: 'light',
  reduceMotion: false,

  // timers
  phaseTimer:   null,
  sessionTimer: null,
  progressRaf:  null,
  phaseStartedAt: 0,
  phaseDurationMs: 0,
};

let audioCtx = null;

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function getExercise()  { return EXERCISES[state.exercise]; }
function getPhases()    { return getExercise().phases; }
function currentPhase() { return getPhases()[state.phaseIndex]; }

function clearTimers() {
  clearInterval(state.phaseTimer);
  clearInterval(state.sessionTimer);
  if (state.progressRaf) cancelAnimationFrame(state.progressRaf);
  state.phaseTimer    = null;
  state.sessionTimer  = null;
  state.progressRaf   = null;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.targetRounds === 'number') state.targetRounds = saved.targetRounds;
    if (typeof saved.sound === 'boolean') state.sound = saved.sound;
    if (typeof saved.haptics === 'boolean') state.haptics = saved.haptics;
    if (saved.theme === 'dark' || saved.theme === 'light') state.theme = saved.theme;
    if (saved.sessionMode === 'time' || saved.sessionMode === 'rounds') state.sessionMode = saved.sessionMode;
    if ([1, 3, 5].includes(saved.sessionMinutes)) state.sessionMinutes = saved.sessionMinutes;
    if (state.sessionMode === 'time') state.targetRounds = 0;
  } catch (_) { /* ignore */ }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      targetRounds: state.targetRounds,
      sound: state.sound,
      haptics: state.haptics,
      theme: state.theme,
      sessionMode: state.sessionMode,
      sessionMinutes: state.sessionMinutes,
    }));
  } catch (_) { /* ignore */ }
}

function syncSettingsUI() {
  const roundValue = state.sessionMode === 'time' ? '0' : String(state.targetRounds);
  DOM.targetRounds.value = roundValue;
  DOM.targetRoundsMobile.value = roundValue;
  DOM.soundToggle.checked = state.sound;
  DOM.hapticToggle.checked = state.haptics;
  DOM.soundToggleMobile.classList.toggle('active', state.sound);
  DOM.soundToggleMobile.setAttribute('aria-pressed', String(state.sound));
  DOM.hapticToggleMobile.classList.toggle('active', state.haptics);
  DOM.hapticToggleMobile.setAttribute('aria-pressed', String(state.haptics));
  DOM.sessionPresets.querySelectorAll('.session-preset').forEach(button => {
    const active = state.sessionMode === 'time' && Number(button.dataset.minutes) === state.sessionMinutes;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateRoundDisplay();
}

function applyTheme(theme) {
  state.theme = theme;
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  [DOM.themeToggle, DOM.themeToggleMobile].forEach(button => {
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Use light mode' : 'Use dark mode');
    button.title = dark ? 'Use light mode' : 'Use dark mode';
  });
}

/* ════════════════════════════════════════
   AUDIO & HAPTICS
════════════════════════════════════════ */
function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playChime(phaseKey) {
  if (!state.sound || state.reduceMotion) return;
  const ctx = ensureAudio();
  if (!ctx) return;

  const freqs = { inhale: 523.25, hold: 392.0, exhale: 329.63, complete: 659.25 };
  const freq = freqs[phaseKey] || 440;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

function vibrate(pattern) {
  if (!state.haptics || state.reduceMotion) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function cuePhase(phaseKey) {
  playChime(phaseKey);
  const patterns = { inhale: 20, hold: [15, 40, 15], exhale: 35, complete: [40, 60, 40, 60, 80] };
  vibrate(patterns[phaseKey] || 20);
}

/* ════════════════════════════════════════
   A11Y LIVE REGION
════════════════════════════════════════ */
function announce(text) {
  DOM.liveRegion.textContent = '';
  // Force reflow so repeated identical announcements still fire
  void DOM.liveRegion.offsetWidth;
  DOM.liveRegion.textContent = text;
}

/* ════════════════════════════════════════
   UI — EXERCISE META / ROUNDS
════════════════════════════════════════ */
function updateExerciseMeta() {
  const ex = getExercise();
  DOM.exerciseTitle.textContent    = ex.name;
  DOM.exerciseSubtitle.textContent = ex.subtitle;
}

function updateRoundDisplay() {
  const el = DOM.roundDisplay;
  if (!state.running && state.cycleCount === 0 && state.pausedRemaining == null) {
    el.textContent = state.targetRounds > 0 ? `0/${state.targetRounds}` : '—';
    el.classList.toggle('has-target', state.targetRounds > 0);
    return;
  }
  if (state.targetRounds > 0) {
    el.textContent = `${state.cycleCount}/${state.targetRounds}`;
    el.classList.add('has-target');
  } else {
    el.textContent = state.cycleCount;
    el.classList.remove('has-target');
  }
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
    dot.setAttribute('role', 'listitem');
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
const CIRCUMFERENCE = 2 * Math.PI * 148;

function setProgress(ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  DOM.progressFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - clamped);
}

function updateProgressColor(phaseKey) {
  DOM.progressFill.style.stroke = PHASE_COLORS[phaseKey] || PHASE_COLORS.inhale;
}

function startProgressAnimation(durationMs) {
  if (state.progressRaf) cancelAnimationFrame(state.progressRaf);
  state.phaseStartedAt = performance.now();
  state.phaseDurationMs = durationMs;

  const tick = (now) => {
    const elapsed = now - state.phaseStartedAt;
    const ratio = Math.min(1, elapsed / state.phaseDurationMs);
    setProgress(ratio);
    if (ratio < 1 && state.running) {
      state.progressRaf = requestAnimationFrame(tick);
    }
  };

  if (state.reduceMotion) {
    setProgress(0);
    return;
  }
  state.progressRaf = requestAnimationFrame(tick);
}

/* ════════════════════════════════════════
   UI — INSTRUCTION / CIRCLE / PHASE TINT
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

const ALL_STATES = ['state-inhale', 'state-hold', 'state-exhale', 'state-idle', 'size-full', 'size-small'];
const PHASE_BODY = ['phase-inhale', 'phase-hold', 'phase-exhale'];

function setCircleState(stateClass, durationSec, size) {
  ALL_STATES.forEach(s => DOM.breathCircle.classList.remove(s));
  if (stateClass) DOM.breathCircle.classList.add(stateClass);
  if (size === 'full') DOM.breathCircle.classList.add('size-full');
  if (size === 'small') DOM.breathCircle.classList.add('size-small');

  // If size isn't changing (e.g. hold after inhale), use a short color transition
  const sizeUnchanged = size && size === state.lastSize;
  let dur = durationSec;
  if (sizeUnchanged) dur = Math.min(durationSec || 0.8, 0.9);
  if (dur == null) dur = 0.5;

  if (!state.reduceMotion) {
    DOM.breathCircle.style.setProperty('--phase-duration', `${dur}s`);
  } else {
    DOM.breathCircle.style.setProperty('--phase-duration', '0.15s');
  }

  state.lastSize = size || 'idle';
}

function setPhaseAtmosphere(phaseKey) {
  PHASE_BODY.forEach(c => document.body.classList.remove(c));
  if (phaseKey) document.body.classList.add(`phase-${phaseKey}`);
}

function setFocusMode(on) {
  document.body.classList.toggle('focus-mode', on);
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
    if (state.sessionMode === 'time' && state.sessionSeconds >= state.sessionMinutes * 60) {
      completeSession();
    }
  }, 1000);
}

/* ════════════════════════════════════════
   UI — PLAY BUTTON
════════════════════════════════════════ */
function setPlayingUI(playing, label) {
  DOM.startBtn.classList.toggle('playing', playing);
  DOM.iconPlay.style.display  = playing ? 'none' : 'block';
  DOM.iconPause.style.display = playing ? 'block' : 'none';
  DOM.startBtnLabel.textContent = label;
  DOM.startBtn.setAttribute('aria-label', label === 'Pause' ? 'Pause session' : `${label} session`);
}

/* ════════════════════════════════════════
   CORE — START PHASE
════════════════════════════════════════ */
function startPhase(fromResume) {
  const phase = currentPhase();
  const total = fromResume && state.pausedRemaining != null
    ? state.pausedRemaining
    : phase.duration;

  state.secondsLeft = total;
  state.pausedRemaining = null;

  // Duration-synced circle expand/contract (hold keeps prior size)
  setCircleState(phase.state, total, phase.size);
  setPhaseAtmosphere(phase.phaseKey);
  updateProgressColor(phase.phaseKey);

  DOM.phaseName.textContent  = phase.label.toUpperCase();
  DOM.phaseTimer.textContent = `${state.secondsLeft} seconds`;

  if (!fromResume) {
    setInstruction(phase.instruction);
    cuePhase(phase.phaseKey);
    announce(`${phase.label}, ${total} seconds`);
  }

  setProgress(0);
  startProgressAnimation(total * 1000);
  updatePhaseDots(state.phaseIndex);
  updateRoundDisplay();

  state.phaseTimer = setInterval(() => {
    state.secondsLeft--;
    if (state.secondsLeft > 0) {
      DOM.phaseTimer.textContent = `${state.secondsLeft} seconds`;
    } else {
      DOM.phaseTimer.textContent = 'complete';
      clearInterval(state.phaseTimer);
      state.phaseTimer = null;
      nextPhase();
    }
  }, 1000);
}

/* ════════════════════════════════════════
   CORE — NEXT PHASE / COMPLETE
════════════════════════════════════════ */
function nextPhase() {
  const phases = getPhases();
  state.phaseIndex++;

  if (state.phaseIndex >= phases.length) {
    state.phaseIndex = 0;
    state.cycleCount++;
    DOM.cycleCount.textContent = state.cycleCount;
    updateRoundDisplay();

    if (state.targetRounds > 0 && state.cycleCount >= state.targetRounds) {
      completeSession();
      return;
    }
  }

  startPhase(false);
}

function completeSession() {
  clearTimers();
  state.running = false;
  setFocusMode(false);
  setPlayingUI(false, 'Begin');
  setCircleState('state-idle', 0.5);
  setPhaseAtmosphere(null);
  setProgress(1);
  setInstruction('Take a quiet moment before you move on');
  DOM.phaseName.textContent  = 'Done';
  DOM.phaseTimer.textContent = '✓';

  cuePhase('complete');
  announce(`Session complete. ${state.cycleCount} rounds finished.`);

  DOM.completeTitle.textContent = `${state.cycleCount} round${state.cycleCount === 1 ? '' : 's'} done`;
  DOM.completeSub.textContent = `You breathed for ${formatTime(state.sessionSeconds)}. Your nervous system thanks you.`;
  DOM.completeOverlay.hidden = false;
}

function dismissComplete() {
  DOM.completeOverlay.hidden = true;
  resetSession();
}

/* ════════════════════════════════════════
   CONTROLS — START / PAUSE / RESET / SKIP
════════════════════════════════════════ */
function startSession() {
  ensureAudio();
  state.running = true;
  setPlayingUI(true, 'Pause');
  setFocusMode(true);

  if (!state.sessionTimer) startSessionTimer();

  // Soft entrance on first start of a fresh session
  if (state.firstStart && state.phaseIndex === 0 && state.pausedRemaining == null) {
    DOM.breathCircle.classList.add('entering');
    setTimeout(() => DOM.breathCircle.classList.remove('entering'), 650);
    state.firstStart = false;
  }

  const resuming = state.pausedRemaining != null;
  startPhase(resuming);
}

function pauseSession() {
  state.running = false;
  state.pausedRemaining = state.secondsLeft > 0 ? state.secondsLeft : null;

  clearInterval(state.phaseTimer);
  clearInterval(state.sessionTimer);
  if (state.progressRaf) cancelAnimationFrame(state.progressRaf);
  state.phaseTimer = null;
  state.sessionTimer = null;
  state.progressRaf = null;

  setPlayingUI(false, 'Resume');
  setFocusMode(false);
  setCircleState('state-idle', 0.5);
  setPhaseAtmosphere(null);
  setInstruction('Paused — press Resume to continue');
  DOM.phaseName.textContent  = 'Paused';
  DOM.phaseTimer.textContent = state.pausedRemaining != null ? state.pausedRemaining : '—';
  announce('Session paused');
}

function resetSession() {
  clearTimers();
  state.running        = false;
  state.phaseIndex     = 0;
  state.secondsLeft    = 0;
  state.cycleCount     = 0;
  state.sessionSeconds = 0;
  state.firstStart     = true;
  state.pausedRemaining = null;
  state.lastSize       = 'idle';

  DOM.cycleCount.textContent  = '0';
  DOM.sessionTime.textContent = '0:00';
  updateRoundDisplay();

  setPlayingUI(false, 'Begin');
  setFocusMode(false);
  setCircleState('state-idle', 0.5);
  setPhaseAtmosphere(null);
  setProgress(0);
  setInstruction('Settle in when you are ready');
  DOM.phaseName.textContent  = 'Ready';
  DOM.phaseTimer.textContent = '—';
  updatePhaseDots(-1);
  DOM.completeOverlay.hidden = true;
}

function skipPhase() {
  if (!state.running) return;
  clearInterval(state.phaseTimer);
  if (state.progressRaf) cancelAnimationFrame(state.progressRaf);
  state.phaseTimer = null;
  state.progressRaf = null;
  nextPhase();
}

function selectExercise(ex) {
  if (ex === state.exercise) return;
  if (!EXERCISES[ex]) return;

  resetSession();
  state.exercise = ex;

  DOM.exerciseBtns.forEach(b => {
    const on = b.dataset.exercise === ex;
    b.classList.toggle('active', on);
  });
  DOM.chips.forEach(c => {
    const on = c.dataset.exercise === ex;
    c.classList.toggle('active', on);
    c.setAttribute('aria-selected', String(on));
  });

  updateExerciseMeta();
  buildPhaseDots();
  announce(`Selected ${getExercise().name}`);
}

/* ════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════ */
DOM.startBtn.addEventListener('click', () => {
  if (state.running) pauseSession();
  else               startSession();
});

DOM.resetBtn.addEventListener('click', resetSession);
DOM.skipBtn.addEventListener('click', skipPhase);
DOM.completeDismiss.addEventListener('click', dismissComplete);

DOM.exerciseBtns.forEach(btn => {
  btn.addEventListener('click', () => selectExercise(btn.dataset.exercise));
});

DOM.chips.forEach(chip => {
  chip.addEventListener('click', () => selectExercise(chip.dataset.exercise));
});

function onTargetChange(value) {
  state.targetRounds = parseInt(value, 10) || 0;
  state.sessionMode = 'rounds';
  DOM.targetRounds.value = String(state.targetRounds);
  DOM.targetRoundsMobile.value = String(state.targetRounds);
  syncSettingsUI();
  updateRoundDisplay();
  saveSettings();
}

DOM.targetRounds.addEventListener('change', e => onTargetChange(e.target.value));
DOM.targetRoundsMobile.addEventListener('change', e => onTargetChange(e.target.value));

function setSound(on) {
  state.sound = on;
  syncSettingsUI();
  saveSettings();
  if (on) {
    ensureAudio();
    playChime('inhale');
  }
}

function setHaptics(on) {
  state.haptics = on;
  syncSettingsUI();
  saveSettings();
  if (on) vibrate(25);
}

DOM.soundToggle.addEventListener('change', e => setSound(e.target.checked));
DOM.hapticToggle.addEventListener('change', e => setHaptics(e.target.checked));

DOM.soundToggleMobile.addEventListener('click', () => setSound(!state.sound));
DOM.hapticToggleMobile.addEventListener('click', () => setHaptics(!state.haptics));

DOM.sessionPresets.addEventListener('click', (event) => {
  const button = event.target.closest('.session-preset');
  if (!button || state.running) return;
  state.sessionMode = 'time';
  state.sessionMinutes = Number(button.dataset.minutes);
  state.targetRounds = 0;
  DOM.targetRounds.value = '0';
  DOM.targetRoundsMobile.value = '0';
  syncSettingsUI();
  saveSettings();
  announce(`${state.sessionMinutes} minute session selected`);
});

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  saveSettings();
}

DOM.themeToggle.addEventListener('click', toggleTheme);
DOM.themeToggleMobile.addEventListener('click', toggleTheme);

/* Keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (!DOM.completeOverlay.hidden) {
      dismissComplete();
      return;
    }
    if (state.running) pauseSession();
    else startSession();
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    resetSession();
    return;
  }

  if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
    if (state.running) {
      e.preventDefault();
      skipPhase();
    }
    return;
  }

  if (e.key >= '1' && e.key <= '3') {
    e.preventDefault();
    selectExercise(EXERCISE_KEYS[parseInt(e.key, 10) - 1]);
  }
});

/* Reduced motion */
function applyReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  state.reduceMotion = mq.matches;
  document.body.classList.toggle('reduce-motion', state.reduceMotion);
  mq.addEventListener('change', (ev) => {
    state.reduceMotion = ev.matches;
    document.body.classList.toggle('reduce-motion', state.reduceMotion);
  });
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
function init() {
  loadSettings();
  applyTheme(state.theme);
  applyReducedMotion();
  syncSettingsUI();
  updateExerciseMeta();
  buildPhaseDots();
  setCircleState('state-idle', 0.5);
  setProgress(0);

  DOM.progressFill.style.strokeDasharray  = CIRCUMFERENCE;
  DOM.progressFill.style.strokeDashoffset = CIRCUMFERENCE;
}

init();
