import { Game, STEP, SAVE_KEY, DEFAULT_LOOK, sanitizeLook, decodeSave, xpForLevel, LEVEL_CAP } from './core.mjs';
import { regionAt } from './world.mjs';
import { Input } from './input.mjs';
import { Renderer, drawHero } from './renderer.mjs';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.has('touch')) document.body.classList.add('force-touch');
let saved = null, storageAvailable = true;
try { saved = decodeSave(localStorage.getItem(SAVE_KEY)); } catch { storageAvailable = false; }
let game = new Game({ look: saved?.look || DEFAULT_LOOK });
let screen = 'creator', editing = false, look = game.look, audioContext, soundEnabled = false, toastUntil = 0, saveAge = 0, regionName = '', lastHud = '', fps = 60, drawMs = 0, qaClock = 0;
const input = new Input(document, () => { if (screen === 'play') pause(); else if (screen === 'pause') resume(); });
const renderer = new Renderer($('game'));
const preview = $('hero-preview').getContext('2d');
const previewHero = { face: 1, grounded: true, pose: 'idle', cycle: 0, vx: 0, invulnerable: 0 };
const editingFields = ['name', 'height', 'legs', 'hair', 'skin', 'suit', 'trim', 'capeColor'];
function fillCreator(value) {
  look = sanitizeLook(value);
  for (const field of editingFields) $(field).value = look[field];
  $('cape').checked = look.cape;
  document.querySelector(`input[name="build"][value="${look.build}"]`).checked = true;
}
function readCreator() {
  const values = Object.fromEntries(editingFields.map(key => [key, $(key).value]));
  values.cape = $('cape').checked; values.build = document.querySelector('input[name="build"]:checked').value;
  look = sanitizeLook(values); return look;
}
function say(message, seconds = 3) { $('toast').textContent = message; $('toast').classList.add('visible'); toastUntil = performance.now() + seconds * 1000; }
function persist() {
  if (!game.started) return;
  try { localStorage.setItem(SAVE_KEY, game.save()); storageAvailable = true; }
  catch { storageAvailable = false; $('save-note').textContent = 'Browser storage is unavailable. This patrol lasts until the page closes.'; }
}
function setScreen(next) {
  screen = next; input.enabled = next === 'play'; input.clear(); game.paused = next !== 'play';
  $('creator').hidden = next !== 'creator'; $('pause-menu').hidden = next !== 'pause'; $('reset-dialog').hidden = next !== 'reset';
  $('hud').hidden = !game.started; $('mission').hidden = !game.started; $('pause').disabled = !game.started;
  $('pause').setAttribute('aria-label', next === 'play' ? 'Pause game' : 'Resume game');
  $('pause').textContent = next === 'play' ? 'Ⅱ' : '▷';
  document.body.classList.toggle('playing', next === 'play');
}
function begin(fromSave = false) {
  if (editing) { game.look = readCreator(); persist(); editing = false; resume(); say('Your hero, your style.'); return; }
  // Existing progress is kept while changing the initial appearance; only the explicit reset deletes it.
  game = new Game({ look: fromSave && saved ? saved.look : readCreator(), save: saved });
  game.started = true; regionName = ''; renderer.camera = Math.max(0, game.hero.x - renderer.width * .37); setScreen('play');
  say(saved ? 'Welcome back, hero. Your patrol continues.' : 'Welcome to the coast! Move right to find your first Bottle Critter.', 5);
  persist(); updateHud();
}
function pause() { if (!game.started || screen === 'creator' || screen === 'reset') return; setScreen('pause'); persist(); $('resume').focus(); }
function resume() { setScreen('play'); $('pause').blur(); }
function openCreator() {
  editing = true; fillCreator(game.look); $('begin').innerHTML = 'SAVE YOUR LOOK <span>→</span>'; $('continue').hidden = true; $('cancel-look').hidden = false;
  setScreen('creator'); $('name').focus();
}
function tone(type) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const o = audioContext.createOscillator(), g = audioContext.createGain(), now = audioContext.currentTime;
    const pitches = { jump: 330, hit: 150, swing: 95, reward: 660, level: 880, hurt: 85, camp: 520 };
    o.type = ['hit', 'hurt', 'swing'].includes(type) ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(pitches[type] || 220, now); o.frequency.exponentialRampToValueAtTime(type === 'jump' ? 600 : (pitches[type] || 220) * .65, now + .1);
    g.gain.setValueAtTime(.035, now); g.gain.exponentialRampToValueAtTime(.0001, now + .13);
    o.connect(g); g.connect(audioContext.destination); o.start(now); o.stop(now + .15); o.onended = () => { o.disconnect(); g.disconnect(); };
  } catch { soundEnabled = false; $('sound').setAttribute('aria-pressed', 'false'); }
}
function handleEvents() {
  const events = game.drain(), leveled = events.some(e => e.type === 'level');
  for (const event of events) {
    renderer.event(event.type === 'level' ? { ...event, x: game.hero.x, y: game.hero.y - 45 } : event); tone(event.type);
    if (event.type === 'level') say(`Level ${event.level}! Health restored. Keep going, hero.`, 4);
    if (event.type === 'reward' && !leveled) say(`${event.enemy} cleared · +${event.xp} XP · +${event.coins} coins`, 2.3);
    if (event.type === 'camp') { persist(); say(`${event.name} set as your checkpoint. Health restored.`); }
    if (event.type === 'respawn') { input.clear(); say(`Back at ${event.name}. Your XP and coins are safe.`); }
    if (event.type === 'destination') { persist(); say('You reached Lighthouse Point! Explore, train, or head back along the coast.', 6); }
  }
}
function updateHud() {
  const h = game.hero, region = regionAt(h.x);
  if (region.name !== regionName) { regionName = region.name; $('region').textContent = region.name; }
  const snapshot = `${h.hp}|${h.maxHp}|${h.level}|${h.xp}|${h.coins}|${game.look.name}|${game.kills}|${game.species.size}|${game.reachedEnd}`;
  if (snapshot !== lastHud) {
    lastHud = snapshot; $('hero-name').textContent = game.look.name; $('level').textContent = h.level; $('coins').textContent = h.coins.toLocaleString();
    $('hp-fill').style.width = `${100 * h.hp / h.maxHp}%`; $('hp-text').textContent = `${h.hp} / ${h.maxHp}`;
    $('xp-fill').style.width = h.level === LEVEL_CAP ? '100%' : `${100 * h.xp / xpForLevel(h.level)}%`;
    $('xp-text').textContent = h.level === LEVEL_CAP ? 'PHASE 1 MAX' : `${h.xp} / ${xpForLevel(h.level)} XP`;
    const cleared = game.kills >= 6 && game.species.size === 3;
    $('mission-title').textContent = cleared ? (game.reachedEnd ? 'A hero on the horizon' : 'Follow the coast to the lighthouse') : "Meet the coast's troublemakers";
    $('mission-progress').textContent = cleared ? (game.reachedEnd ? 'Patrol complete · Keep exploring and training' : 'Reach Lighthouse Point at the end of the trail') : `${Math.min(6, game.kills)} / 6 monsters · ${game.species.size} / 3 types discovered`;
    $('mission-count').textContent = cleared ? (game.reachedEnd ? '✓' : '→') : `${Math.min(6, game.kills)}/6`;
  }
  $('rest').hidden = screen !== 'play' || game.nearCamp() < 0 || h.dead;
  $('death').hidden = !h.dead; $('diagnostics').hidden = !params.has('qa');
  if (params.has('qa')) $('diagnostics').textContent = `FPS ${fps.toFixed(0)} · draw ${drawMs.toFixed(2)}ms · ${screen} · t ${game.time.toFixed(2)}\nx ${h.x.toFixed(1)} y ${h.y.toFixed(1)} · ${h.pose}\nvx ${h.vx.toFixed(1)} vy ${h.vy.toFixed(1)} · jumps ${h.jumps}\nmonsters ${game.enemies.filter(e => e.state !== 'dead').length} · kills ${game.kills}\nviewport ${innerWidth}×${innerHeight} · save ${storageAvailable ? 'ready' : 'unavailable'}`;
}
$('creator-form').addEventListener('input', readCreator);
$('creator-form').addEventListener('submit', e => { e.preventDefault(); begin(); });
$('continue').addEventListener('click', () => begin(true));
$('cancel-look').addEventListener('click', () => { editing = false; resume(); });
$('pause').addEventListener('click', () => { if (screen === 'play') pause(); else if (screen === 'pause') resume(); });
$('resume').addEventListener('click', resume); $('edit-look').addEventListener('click', openCreator);
$('return-camp').addEventListener('click', () => { game.respawn(); handleEvents(); persist(); resume(); });
$('new-patrol').addEventListener('click', () => { setScreen('reset'); $('cancel-reset').focus(); });
$('cancel-reset').addEventListener('click', () => { setScreen('pause'); $('resume').focus(); });
$('confirm-reset').addEventListener('click', () => {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  saved = null; editing = false; game = new Game({ look: game.look }); game.started = false; fillCreator(game.look);
  $('begin').innerHTML = 'BEGIN YOUR ADVENTURE <span>→</span>'; $('continue').hidden = true; $('cancel-look').hidden = true; setScreen('creator');
});
$('sound').addEventListener('click', () => { soundEnabled = !soundEnabled; $('sound').setAttribute('aria-pressed', String(soundEnabled)); $('sound').setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Enable sound'); tone('camp'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (screen === 'play') pause(); persist(); } });
window.addEventListener('blur', () => { if (screen === 'play') pause(); });
window.addEventListener('pagehide', persist);
// Keep keyboard focus inside open dialogs; Escape is handled by the input controller.
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || screen === 'play') return;
  const panel = screen === 'creator' ? $('creator') : screen === 'reset' ? $('reset-dialog') : $('pause-menu');
  const nodes = [...panel.querySelectorAll('a[href],button,input,select')].filter(n => !n.disabled && n.getClientRects().length);
  if (!nodes.length) return;
  if (e.shiftKey && (document.activeElement === nodes[0] || !panel.contains(document.activeElement))) { e.preventDefault(); nodes.at(-1).focus(); }
  if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0].focus(); }
});
fillCreator(look); $('continue').hidden = !saved;
if (saved) $('begin').innerHTML = 'CONTINUE WITH THIS LOOK <span>→</span>';
if (!storageAvailable) $('save-note').textContent = 'Browser storage is unavailable. Progress lasts until this page closes.';
setScreen('creator');
let last = performance.now(), accumulator = 0;
function frame(now) {
  const elapsed = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
  if (elapsed > 0) fps = fps * .95 + .05 / elapsed;
  if (screen === 'play') {
    accumulator += elapsed;
    while (accumulator >= STEP) { game.step(STEP, input.sample()); accumulator -= STEP; }
    handleEvents(); saveAge += elapsed;
    if (saveAge > 5) { persist(); saveAge = 0; }
  } else accumulator = 0;
  const drawStart = performance.now();
  renderer.draw(game, screen === 'play' ? accumulator / STEP : 1, elapsed);
  drawMs = drawMs * .95 + (performance.now() - drawStart) * .05;
  qaClock += elapsed; if (qaClock >= .1) { updateHud(); qaClock = 0; }
  if (screen === 'creator') {
    preview.clearRect(0, 0, 560, 620); preview.save(); preview.translate(280, 525);
    preview.fillStyle = '#112f3933'; preview.beginPath(); preview.ellipse(0, 0, 85, 13, 0, 0, Math.PI * 2); preview.fill();
    drawHero(preview, 0, 0, look, previewHero, now / 1000, 4.1); preview.restore();
  }
  if (toastUntil && now > toastUntil) { $('toast').classList.remove('visible'); toastUntil = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
