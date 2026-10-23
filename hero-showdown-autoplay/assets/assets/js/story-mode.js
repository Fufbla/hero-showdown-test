'use strict';

// Episode 1 reuses the original fighters, combat, controls and special movies.
const story = {active:false, playing:false, previous:null, releasePad:false, movie:null, cleanup:null};
window.HealthiaStory = story;
const storyArena = new Image();
storyArena.src = 'assets/images/story-toxic-harbor.webp';
let storyArenaFailed = false;
storyArena.addEventListener('load', () => {storyArenaFailed=false; updateStoryReady();});
storyArena.addEventListener('error', () => {storyArenaFailed=true; updateStoryReady();});

function updateStoryReady() {
  const button = document.getElementById('story-begin');
  if (!button) return;
  button.disabled = !loaded || !(storyArena.complete && storyArena.naturalWidth) || storyArenaFailed;
  button.textContent = storyArenaFailed ? 'ARENA COULD NOT LOAD' : button.disabled ? 'LOADING ARENA…' : 'BEGIN EPISODE 1 →';
  const retry = document.getElementById('story-reload');
  if (retry) retry.hidden = !storyArenaFailed;
}

function showStorySelect() {
  if (!story.active) {
    story.previous = {venue, opponent, versusDifficulty};
    story.active = true;
    coLeave();
  }
  story.cleanup?.();
  audio();
  showSelect();
}

const storyOriginalSelect = showSelect;
showSelect = function(...args) {
  storyOriginalSelect(...args);
  if (!story.active) return;
  overlay.querySelector('.eyebrow').textContent = 'STORY MODE / EPISODE 1';
  overlay.querySelector('h2').textContent = 'Choose your starting hero.';
  const begin = document.getElementById('fight');
  begin.id = 'story-begin';
  begin.onclick = playStoryIntro;
  const back = document.getElementById('back-difficulty');
  back.textContent = '← GAME MODES';
  back.onclick = showModeSelect;
  const note = document.createElement('p');
  note.textContent = 'All three heroes fight as a team. Tag with Q, the TAG button, or RT / R2. Each hero keeps her own health and special charge.';
  begin.closest('.row').before(note);
  const retry = document.createElement('button');
  retry.id = 'story-reload'; retry.textContent = 'RELOAD ARENA'; retry.hidden = true;
  retry.onclick = () => {storyArenaFailed=false; storyArena.src='assets/images/story-toxic-harbor.webp?retry='+Date.now(); updateStoryReady();};
  begin.closest('.row').append(retry);
  updateStoryReady();
  syncMenuFocus();
};

const storyOriginalModes = showModeSelect;
showModeSelect = function(...args) {
  story.cleanup?.();
  story.active = false;
  if (story.previous) {
    ({venue, opponent, versusDifficulty} = story.previous);
    story.previous = null;
  }
  return storyOriginalModes(...args);
};

// The existing controller Back action on the hero screen stays in the story flow.
const storyOriginalDifficulty = showDifficulty;
showDifficulty = function(...args) {
  if (story.active) return showModeSelect();
  return storyOriginalDifficulty(...args);
};

function startStoryFight() {
  if (!story.active) return;
  if (!storyArena.complete || !storyArena.naturalWidth || storyArenaFailed) return showStorySelect();
  opponent = 5; // Wastelander's original fighter and attacks.
  start();
  banner = ''; bannerTime = 0;
  scoreTick();
}

const storyOriginalSky = sky;
sky = function(...args) {
  if (!story.active || !storyArena.complete || !storyArena.naturalWidth) return storyOriginalSky(...args);
  ctx.drawImage(storyArena, 0, 0, W, H);
};
const storyOriginalForeground = drawEnvironmentForeground;
drawEnvironmentForeground = function(...args) {
  if (!story.active) return storyOriginalForeground(...args);
};

const storyOriginalResult = result;
result = function(...args) {
  if (!story.active) return storyOriginalResult(...args);
  const win = mode === 'victory';
  clearInput(); menuFocusElement = null; menuFocus = 0;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<section class="panel"><div class="eyebrow">STORY MODE / EPISODE 1</div>
    <h2>${win ? 'WASTELANDER DEFEATED!' : 'THE FIGHT ISN’T OVER!'}</h2>
    <p>${win ? 'To be continued…' : 'Keep clear of acid pools. Block flying trash and jump before the mallet lands.'}</p>
    <p>${heroes[selected].name} · Best combo: ${best} hits · ${Math.floor(elapsed)} seconds</p>
    <div class="row"><button class="primary" id="story-retry">${win ? 'FIGHT AGAIN' : 'RETRY FIGHT'}</button>
    <button id="story-replay">REPLAY STORY VIDEO</button><button id="story-hero">CHOOSE HERO</button>
    <button id="story-exit">GAME MODES</button></div></section>`;
  document.getElementById('story-retry').onclick = startStoryFight;
  document.getElementById('story-replay').onclick = playStoryIntro;
  document.getElementById('story-hero').onclick = showStorySelect;
  document.getElementById('story-exit').onclick = showModeSelect;
  story.releasePad = true;
  syncMenuFocus(document.getElementById('story-retry'));
};

const storyOriginalPause = pauseGame;
pauseGame = function(...args) {
  if (story.playing) return;
  const value = storyOriginalPause(...args);
  if (story.active && paused && document.getElementById('resume') && !document.getElementById('story-pause-exit')) {
    const exit = document.createElement('button');
    exit.id = 'story-pause-exit'; exit.textContent = 'GAME MODES'; exit.onclick = showModeSelect;
    document.getElementById('resume').closest('.row').append(exit);
  }
  return value;
};
document.getElementById('pause').onclick = () => pauseGame();

function storyPads() {
  try { return Array.from(navigator.getGamepads?.() || []).filter(Boolean); } catch (_) { return []; }
}
function storyPadNeutral() {
  return storyPads().every(p => p.buttons.every(b => !b.pressed && !(b.value > .5)) && p.axes.every(a => Math.abs(a) < .35));
}
const storyOriginalPoll = pollPad;
pollPad = function(...args) {
  if (story.playing) return;
  if (story.releasePad) {
    if (!storyPadNeutral()) return;
    story.releasePad = false; gamepadPrev = {}; clearInput();
  }
  return storyOriginalPoll(...args);
};

function playStoryIntro() {
  if (!story.active || story.playing) return;
  if (!storyArena.complete || !storyArena.naturalWidth || storyArenaFailed) return showStorySelect();
  story.playing = true;
  mode = 'story-intro'; paused = false; clearInput();
  window.HealthiaMenuMusic?.stop(); stopScoreVoices(); scoreTick();
  const root = document.createElement('section');
  root.id = 'story-opening'; root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Story Mode Episode 1');
  root.innerHTML = `<video playsinline webkit-playsinline preload="auto" aria-label="Episode 1 opening video"></video>
    <div class="story-movie-controls"><p class="story-movie-status" role="status">EPISODE 1</p><div>
    <button id="story-movie-back">← HEROES</button><button id="story-movie-sound">SOUND ON</button>
    <button id="story-movie-retry" hidden>RETRY VIDEO</button><button id="story-movie-skip">SKIP VIDEO <span>ESC / A / START</span></button>
    </div></div>`;
  const movieParent = document.fullscreenElement || document.webkitFullscreenElement || document.body;
  movieParent.append(root);
  const background = [...movieParent.children].filter(el => el !== root).map(el => [el, el.inert]);
  for (const [el] of background) el.inert = true;
  const video = root.querySelector('video'), sound = root.querySelector('#story-movie-sound');
  const retry = root.querySelector('#story-movie-retry'), status = root.querySelector('.story-movie-status');
  const skip = root.querySelector('#story-movie-skip'), back = root.querySelector('#story-movie-back');
  story.movie = video;
  video.src = 'videos/story-episode-1.mp4'; video.muted = muted; video.disablePictureInPicture = true;
  let done = false, attempt = 0, raf = 0, padArmed = false, padPrev = {}, resumeOnVisible = false;

  function reflect() {
    if (done) return;
    sound.textContent = video.paused ? 'PLAY VIDEO' : video.muted ? 'ENABLE SOUND' : 'SOUND ON';
  }
  async function play() {
    if (done || document.hidden) return;
    const token = ++attempt;
    try { await video.play(); }
    catch (_) {
      if (done || token !== attempt) return;
      video.muted = true;
      try { await video.play(); } catch (_) { /* Play and skip remain available. */ }
    }
    if (!done && token === attempt) reflect();
  }
  function toggleSound() {
    if (video.paused || video.muted) {
      if (muted) document.getElementById('sound').click();
      video.muted = false; play();
    } else {
      if (!muted) document.getElementById('sound').click();
      video.muted = true; reflect();
    }
  }
  function cleanup() {
    if (done) return;
    done = true; ++attempt; cancelAnimationFrame(raf);
    video.pause(); video.removeAttribute('src'); video.load(); root.remove();
    for (const [el, wasInert] of background) el.inert = wasInert;
    window.removeEventListener('keydown', key, true);
    window.removeEventListener('keyup', stopKey, true);
    document.removeEventListener('visibilitychange', visibility);
    story.playing = false; story.movie = null; story.cleanup = null; story.releasePad = true;
    clearInput(); last = 0; simulationRemainder = 0;
  }
  function leave(toFight) {
    if (done) return;
    cleanup();
    if (toFight) startStoryFight(); else showStorySelect();
  }
  function buttons() { return [...root.querySelectorAll('button')].filter(b => !b.hidden); }
  function moveFocus(step) {
    const all = buttons(), index = all.indexOf(document.activeElement);
    all[(index + step + all.length) % all.length].focus();
  }
  function stopKey(e) { if (!done) {e.preventDefault(); e.stopImmediatePropagation();} }
  function key(e) {
    stopKey(e);
    if (e.repeat) return;
    if (e.key === 'Escape') leave(true);
    else if (e.key === 'Tab') moveFocus(e.shiftKey ? -1 : 1);
    else if (['ArrowLeft','ArrowUp'].includes(e.key)) moveFocus(-1);
    else if (['ArrowRight','ArrowDown'].includes(e.key)) moveFocus(1);
    else if (e.key === 'Enter' || e.key === ' ') (buttons().includes(document.activeElement) ? document.activeElement : skip).click();
  }
  function visibility() {
    if (document.hidden) {resumeOnVisible = !video.paused; ++attempt; video.pause();}
    else if (resumeOnVisible) play();
  }
  function pollMovie() {
    if (done) return;
    if (!padArmed) padArmed = storyPadNeutral();
    else {
      const pads = storyPads(), down = i => pads.some(p => p.buttons[i]?.pressed || p.buttons[i]?.value > .5);
      const now = {skip:down(0)||down(9), back:down(1)||down(8), sound:down(2)};
      if (now.skip && !padPrev.skip) leave(true);
      else if (now.back && !padPrev.back) leave(false);
      else if (now.sound && !padPrev.sound) toggleSound();
      padPrev = now;
    }
    if (!done) raf = requestAnimationFrame(pollMovie);
  }
  story.cleanup = cleanup;
  skip.onclick = () => leave(true); back.onclick = () => leave(false); sound.onclick = toggleSound;
  retry.onclick = () => {retry.hidden=true; status.textContent='LOADING EPISODE 1…'; video.load(); play();};
  video.addEventListener('ended', () => leave(true));
  video.addEventListener('playing', () => {status.textContent='EPISODE 1'; retry.hidden=true; reflect();});
  video.addEventListener('waiting', () => {if (!done) status.textContent='LOADING EPISODE 1…';});
  video.addEventListener('error', () => {
    if (done) return;
    status.textContent='Video could not load. Retry or skip to the fight.'; retry.hidden=false; reflect();
  });
  window.addEventListener('keydown', key, true); window.addEventListener('keyup', stopKey, true);
  document.addEventListener('visibilitychange', visibility);
  skip.focus({preventScroll:true}); play(); raf = requestAnimationFrame(pollMovie);
}

// Direction keys navigate story selection/results; combat keeps the existing key map.
window.addEventListener('keydown', e => {
  if (!story.active || story.playing || window.HealthiaIntro?.active || (mode === 'fight' && !paused)) return;
  const dir = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];
  if (dir) {e.preventDefault(); e.stopImmediatePropagation(); menuNavigate(dir);}
  else if (e.key === 'Escape' && mode === 'select') {e.preventDefault(); e.stopImmediatePropagation(); showModeSelect();}
}, true);
