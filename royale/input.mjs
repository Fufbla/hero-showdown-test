import { normalizeControls } from './controls.mjs';
// Every physical pointer owns its action. Releasing one finger never releases another.
export class Input {
  constructor(root, onPause, controls) {
    this.controls=normalizeControls(controls);this.padHeld=new Set();this.padPrevious=new Set();this.vertical=0;this.gamepadLabel='No controller connected';
    this.keys = new Set(); this.pointers = new Map(); this.edges = new Set(); this.axis = 0; this.stickPointer = null; this.enabled = false;
    this.root = root; this.onPause = onPause;
    this.stick = root.querySelector('#stick'); this.knob = root.querySelector('#stick-knob');
    window.addEventListener('keydown', e => {
      if(e.code==='Escape'&&!e.repeat){e.preventDefault();this.onPause();return;}
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (this.controls.keys.pause.includes(e.code) && !e.repeat) { e.preventDefault(); this.onPause(); return; }
      if (!this.enabled) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) for(const [action,codes] of Object.entries(this.controls.keys))if(codes.includes(e.code))this.edges.add(action);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    for (const b of root.querySelectorAll('[data-control]')) {
      b.addEventListener('contextmenu', e => e.preventDefault());
      b.addEventListener('pointerdown', e => {
        if (!this.enabled) return;
        e.preventDefault(); b.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, b.dataset.control);
        this.edges.add(b.dataset.control); b.classList.add('pressed');
      });
      const release = e => { this.pointers.delete(e.pointerId); if (![...this.pointers.values()].includes(b.dataset.control)) b.classList.remove('pressed'); };
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, release);
    }
    const moveStick = e => {
      if (e.pointerId !== this.stickPointer) return;
      const rect = this.stick.getBoundingClientRect(), radius = rect.width * .31;
      const dx = Math.max(-radius, Math.min(radius, e.clientX - rect.left - rect.width / 2));
      const dy = Math.max(-radius, Math.min(radius, e.clientY - rect.top - rect.height / 2));
      this.vertical = Math.abs(dy)<radius*.18?0:dy/radius;
      this.axis = Math.abs(dx) < radius * .14 ? 0 : dx / radius;
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    this.stick.addEventListener('pointerdown', e => { if (!this.enabled || this.stickPointer !== null) return; e.preventDefault(); this.stickPointer = e.pointerId; this.stick.setPointerCapture(e.pointerId); moveStick(e); });
    this.stick.addEventListener('pointermove', moveStick);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.stick.addEventListener(event, e => {
      if (e.pointerId === this.stickPointer) { this.stickPointer = null; this.axis = this.vertical = 0; this.knob.style.transform = 'translate(-50%, -50%)'; }
    });
  }
  clear() {
    this.keys.clear(); this.pointers.clear(); this.edges.clear(); this.axis = this.vertical = 0; this.stickPointer = null;
    this.root.querySelectorAll('.pressed').forEach(e => e.classList.remove('pressed'));
    this.knob.style.transform = 'translate(-50%, -50%)';
  }
  pollGamepad() {
    let pad;try{pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected&&p.mapping==='standard');}catch{}
    this.gamepadLabel=pad?'Standard controller connected':'No standard controller connected';
    this.padHeld=new Set();this.padX=this.padY=0;
    if(pad){
      for(const [action,index] of Object.entries(this.controls.pad))if(pad.buttons[index]?.pressed)this.padHeld.add(action);
      this.padX=Math.abs(pad.axes[0]||0)>.18?pad.axes[0]:0;this.padY=Math.abs(pad.axes[1]||0)>.18?pad.axes[1]:0;
    }
    const edges=[...this.padHeld].filter(a=>!this.padPrevious.has(a));this.padPrevious=new Set(this.padHeld);
    if(edges.includes('pause'))this.onPause();
    if(this.enabled)for(const action of edges)this.edges.add(action);
  }
  sample() {
    if (!this.enabled) { this.clear(); return {}; }
    const held = action => [...this.pointers.values()].includes(action)||this.controls.keys[action]?.some(k=>this.keys.has(k))||this.padHeld.has(action);
    const left = held('left'), right = held('right');
    const result = { move: this.axis || this.padX || Number(right) - Number(left), run: Math.abs(this.axis) > .72 || Math.abs(this.padX)> .72 || held('run'),
      vertical:this.vertical||this.padY||Number(held('down'))-Number(held('up')||held('jump')),powers:[0,1,2,3].map(i=>this.edges.has(`power${i}`)),heal:this.edges.has('heal'),tree:this.edges.has('tree'),
      jump: this.edges.has('jump'), punch: this.edges.has('punch'), kick: this.edges.has('kick'), interact: this.edges.has('interact'),
      punchHeld: held('punch'), kickHeld: held('kick') };
    this.edges.clear(); return result;
  }
}
