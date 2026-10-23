'use strict';

// Episode 1 reuses the original fighters, combat, controls and special movies.
const story = {active:false, playing:false, previous:null, releasePad:false, movie:null, cleanup:null, battle:1, totalBattles:6, waiting:false, endingPlayed:false};
window.HealthiaStory = story;
const storyStages = {
  harbor: {image:new Image(), source:'assets/images/story-toxic-harbor.webp', failed:false},
  rooftop: {image:new Image(), source:'assets/images/story-smog-rooftop.webp', failed:false}
};
function storyIsRooftop(battle=story.battle) { return battle >= 4 && battle <= 6; }
function storyOpponentRound(battle=story.battle) { return storyIsRooftop(battle) ? battle - 3 : battle; }
function currentStoryStage() { return storyIsRooftop() ? storyStages.rooftop : storyStages.harbor; }
function storyStageReady(stage) { return !stage.failed && stage.image.complete && stage.image.naturalWidth > 0; }
function reloadStoryStage(stage) {
  stage.failed=false;
  stage.image.removeAttribute('src');
  stage.image.src=stage.source;
}
for (const stage of Object.values(storyStages)) {
  stage.image.addEventListener('load', () => {stage.failed=false; updateStoryReady();});
  stage.image.addEventListener('error', () => {stage.failed=true; updateStoryReady();});
  stage.image.src=stage.source;
}

function updateStoryReady() {
  if (story.waiting && story.active) {
    if (storyStageReady(currentStoryStage())) {story.waiting=false; startStoryFight();}
    else {
      const status=document.getElementById('story-arena-status');
      if(status) status.textContent=currentStoryStage().failed ? 'Arena could not load. Retry to continue this battle.' : 'Loading the next arena…';
    }
  }
  const button = document.getElementById('story-begin');
  if (!button) return;
  const failed=Object.values(storyStages).some(stage=>stage.failed);
  button.disabled = !loaded || !Object.values(storyStages).every(storyStageReady);
  button.textContent = failed ? 'ARENA COULD NOT LOAD' : button.disabled ? 'LOADING ARENAS…' : 'BEGIN EPISODE 1 →';
  const retry = document.getElementById('story-reload');
  if (retry) retry.hidden = !failed;
}

function showStorySelect() {
  if (!story.active) {
    story.previous = {venue, opponent, versusDifficulty};
    story.active = true;
    story.battle = 1;
    coLeave();
  }
  story.cleanup?.();
  story.waiting=false;
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
  note.textContent = 'Defeat Wastelander in three battles, then face the Air Pollution Monster in three rooftop battles. All three heroes fight as a team. Tag with Q, the TAG button, or RT / R2. Each hero keeps her own health and special charge.';
  begin.closest('.row').before(note);
  const retry = document.createElement('button');
  retry.id = 'story-reload'; retry.textContent = 'RELOAD ARENA'; retry.hidden = true;
  retry.onclick = () => {Object.values(storyStages).filter(stage=>!storyStageReady(stage)).forEach(reloadStoryStage); updateStoryReady();};
  begin.closest('.row').append(retry);
  updateStoryReady();
  syncMenuFocus();
};

const storyOriginalModes = showModeSelect;
showModeSelect = function(...args) {
  story.cleanup?.();
  story.active = false;
  story.battle = 1;
  story.waiting = false;
  story.endingPlayed = false;
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
  if (!storyStageReady(currentStoryStage())) return showStoryArenaWait();
  story.waiting=false;
  story.endingPlayed=false;
  opponent = storyIsRooftop() ? 0 : 5; // Use the original Air Pollution Monster or Wastelander fighter.
  start();
  banner = ''; bannerTime = 0;
  scoreTick();
}

function showStoryArenaWait() {
  story.waiting=true; mode='story-loading'; paused=false; clearInput(); scoreTick();
  overlay.classList.remove('hidden');
  overlay.innerHTML='<section class="panel"><h2>GET READY</h2><p id="story-arena-status" role="status"></p><div class="row"><button id="story-arena-retry">RELOAD ARENA</button><button id="story-arena-exit">GAME MODES</button></div></section>';
  document.getElementById('story-arena-retry').onclick=()=>{reloadStoryStage(currentStoryStage()); updateStoryReady();};
  document.getElementById('story-arena-exit').onclick=showModeSelect;
  updateStoryReady(); syncMenuFocus();
}

const storyOriginalSky = sky;
sky = function(...args) {
  const stage=currentStoryStage();
  if (!story.active || !storyStageReady(stage)) return storyOriginalSky(...args);
  ctx.drawImage(stage.image, 0, 0, W, H);
};
const storyOriginalForeground = drawEnvironmentForeground;
drawEnvironmentForeground = function(...args) {
  if (!story.active) return storyOriginalForeground(...args);
};
const storyOriginalAmbience=updateAmbience;
updateAmbience=function(...args) {
  if(story.active && storyIsRooftop()) {
    if(ambience && ac) {ambience.bus.gain.setTargetAtTime(0,ac.currentTime,.12); ambience.state=-1;}
    return;
  }
  return storyOriginalAmbience(...args);
};

const storyOriginalResult = result;
result = function(...args) {
  if (!story.active) return storyOriginalResult(...args);
  if (story.playing) return;
  const win = mode === 'victory';
  if (win && story.battle < story.totalBattles) return playStoryRematch();
  if (win && story.battle === story.totalBattles && !story.endingPlayed) return playStoryEnding();
  clearInput(); menuFocusElement = null; menuFocus = 0;
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<section class="panel"><div class="eyebrow">STORY MODE / EPISODE 1 · BATTLE ${story.battle} OF ${story.totalBattles}</div>
    <h2>${win ? 'TO BE CONTINUED…' : 'THE FIGHT ISN’T OVER!'}</h2>
    <p>${win ? 'All six battles complete.' : storyIsRooftop() ? 'Watch the orange warnings. Jump clear of clouds and counter after a punch.' : 'Keep clear of acid pools. Block flying trash and jump before the mallet lands.'}</p>
    <p>${heroes[selected].name} · Best combo: ${best} hits · ${Math.floor(elapsed)} seconds</p>
    <div class="row"><button class="primary" id="story-retry">${win ? 'REPLAY EPISODE' : 'RETRY FIGHT'}</button>
    ${win ? '' : '<button id="story-replay">RESTART EPISODE</button>'}<button id="story-hero">CHOOSE HERO</button>
    <button id="story-exit">GAME MODES</button></div></section>`;
  document.getElementById('story-retry').onclick = win ? playStoryIntro : startStoryFight;
  const replay = document.getElementById('story-replay');
  if (replay) replay.onclick = playStoryIntro;
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
  story.battle = 1;
  story.waiting = false;
  story.endingPlayed = false;
  return playStoryMovie('videos/story-episode-1.mp4', 'EPISODE 1', 1, false);
}

function playStoryRematch() {
  if (!story.active || story.playing || story.battle >= story.totalBattles) return;
  const nextBattle = story.battle + 1;
  if (nextBattle === 4) return playStoryMovie('videos/smog-battle.mp4', 'AIR POLLUTION MONSTER · BATTLE 1 OF 3', nextBattle, true);
  if (storyIsRooftop(nextBattle)) return playStoryMovie('videos/reborn.mp4', `AIR POLLUTION MONSTER · BATTLE ${storyOpponentRound(nextBattle)} OF 3`, nextBattle, true);
  return playStoryMovie('videos/battle23.mp4', `WASTELANDER · BATTLE ${nextBattle} OF 3`, nextBattle, true);
}

function playStoryEnding() {
  if (!story.active || story.playing || mode !== 'victory' || story.battle !== story.totalBattles || story.endingPlayed) return;
  return playStoryMovie('videos/is-this-the-end.mp4', 'TO BE CONTINUED', null, true, () => {
    story.endingPlayed=true;
    mode='victory'; paused=false; ending=Math.max(ending,2.5);
    result(); scoreTick();
  });
}

function playStoryMovie(source, label, nextBattle, rematch, onComplete=null) {
  if (!story.active || story.playing) return;
  story.playing = true;
  mode = 'story-intro'; paused = false; clearInput();
  window.HealthiaMenuMusic?.stop(); stopScoreVoices(); scoreTick();
  const root = document.createElement('section');
  root.id = 'story-opening'; root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', label);
  root.innerHTML = `<video playsinline webkit-playsinline preload="auto" aria-label="${label} video"></video>
    <div class="story-movie-controls"><p class="story-movie-status" role="status">${label}</p><div>
    <button id="story-movie-back">${rematch ? '← GAME MODES' : '← HEROES'}</button><button id="story-movie-sound">SOUND ON</button>
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
  video.src = source; video.muted = muted; video.disablePictureInPicture = true;
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
  function leave(advance) {
    if (done) return;
    cleanup();
    if (advance && onComplete) onComplete();
    else if (advance) {story.battle = nextBattle; startStoryFight();}
    else if (rematch) showModeSelect();
    else showStorySelect();
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
  retry.onclick = () => {retry.hidden=true; status.textContent='LOADING '+label+'…'; video.load(); play();};
  video.addEventListener('ended', () => leave(true));
  video.addEventListener('playing', () => {if (!done) {status.textContent=label; retry.hidden=true; reflect();}});
  video.addEventListener('waiting', () => {if (!done) status.textContent='LOADING '+label+'…';});
  video.addEventListener('error', () => {
    if (done) return;
    status.textContent=onComplete ? 'Video could not load. Retry or skip to the ending.' : 'Video could not load. Retry or skip to the fight.';
    retry.hidden=false; reflect();
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
