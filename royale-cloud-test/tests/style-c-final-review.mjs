import {drawHero} from '../hero-art.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {previewHero, PREVIEW_POSES} from '../hero-rig.mjs';
import {ART_VIEWS, PRESENTATIONS, KIT_LABELS, lookFor, outfitFor, title} from './style-c-final-fixtures.mjs';

const el = id => document.getElementById(id);
const canvas = el('preview'), ctx = canvas.getContext('2d');
const pose = el('pose'), view = el('view'), kit = el('kit');
const hold = el('hold'), step = el('step');
for (const id of PREVIEW_POSES) pose.add(new Option(title(id), id));
for (const [id, label] of ART_VIEWS) view.add(new Option(label, id));
for (const [id, label] of Object.entries(KIT_LABELS)) kit.add(new Option(label, id));
view.value = 'game';
let running = !matchMedia('(prefers-reduced-motion: reduce)').matches, time = 0, previous = null;
let looks, outfit, ready = false, frame = null;
const owners = [{}, {}];

function refreshOutfit() {
  looks = PRESENTATIONS.map(([sex]) => lookFor(sex, kit.value));
  outfit = outfitFor(kit.value);
}
function draw() {
  if (!ready) return;
  ctx.fillStyle = '#e8eadf'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#abbcaf'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24, 318.5); ctx.lineTo(896, 318.5); ctx.stroke();
  for (const [i, [, name]] of PRESENTATIONS.entries()) {
    const x = 228 + i * 464;
    const hero = previewHero(pose.value, time);
    drawHero(ctx, x, 317, looks[i], hero, time, 2.05, {view:view.value, outfit, artState:owners[i]});
    ctx.fillStyle = '#243e40'; ctx.textAlign = 'center'; ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(name, x, 355);
  }
}
function status() {
  hold.textContent = running ? 'Hold pose' : 'Play motion';
  hold.setAttribute('aria-pressed', String(!running));
  el('live-status').textContent = ready
    ? [title(pose.value), view.selectedOptions[0].textContent, kit.selectedOptions[0].textContent, running ? 'Playing' : 'Held'].join(' · ')
    : 'Loading hero artwork…';
}
function schedule() {
  if (frame === null && !document.hidden && ready && running) frame = requestAnimationFrame(tick);
}
function tick(now) {
  frame = null;
  if (!running || document.hidden) { previous = null; return; }
  const dt = previous === null ? 0 : Math.min(.1, (now - previous) / 1000);
  previous = now; time += dt; draw(); schedule();
}
function resetTime() { time = 0; previous = null; draw(); status(); }
pose.onchange = view.onchange = resetTime;
kit.onchange = () => { refreshOutfit(); resetTime(); };
hold.onclick = () => { running = !running; previous = null; status(); schedule(); };
step.onclick = () => { running = false; time += 1 / 24; previous = null; draw(); status(); };
document.addEventListener('visibilitychange', () => { previous = null; schedule(); });

async function showResults() {
  const target = el('results');
  try {
    const response = await fetch(new URL('../qa/style-c/system/final/verification.json', import.meta.url));
    if (!response.ok) throw Error('Missing verification record');
    const result = await response.json();
    const line = document.createElement('p');
    line.textContent = result.passed ? 'The recorded verification run passed.' : 'The recorded run contains open findings.';
    const list = document.createElement('ul');
    const summary = [
      result.coverage.hairstyles+' selectable hairstyles, '+result.coverage.presentations+' presentations and '+result.coverage.builds+' body builds.',
      result.coverage.poses+' motion states, '+result.coverage.authoredKeysPerPresentation+' authored keys per hero and '+result.coverage.catalogItems+' individual worn item definitions.',
      result.coverage.mergeAssignments+' combinations of an empty or occupied helmet, chest and boot slot drawn and checked for matching-set eligibility.',
      result.coverage.equipmentPairs.toLocaleString()+' legal pairs of equipment-slot choices, covering regional, legacy, and Merge equipment on both heroes.',
      'The test also checks saved appearances, the default standing artwork, draw bounds and gameplay-state preservation.'
    ];
    for (const text of summary) { const item = document.createElement('li'); item.textContent = text; list.append(item); }
    target.replaceChildren(line, list);
  } catch {
    target.textContent = 'The saved verification record could not be loaded.';
  }
}
void showResults();
refreshOutfit(); status();
try {
  ready = await prepareStyleCMaterials();
  if (!ready) throw Error('Artwork failed to load.');
  draw(); status(); schedule();
} catch (error) {
  hold.disabled = step.disabled = true;
  el('live-status').textContent = error.message+' Reload this page to retry.';
}
