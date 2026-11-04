import { normalizeControls } from './controls.mjs';
// Every physical pointer owns its action. Releasing one finger never releases another.
export class Input {
  constructor(root, onPause, controls) {
    this.abort=new AbortController();const listen=(target,event,handler)=>target.addEventListener(event,handler,{signal:this.abort.signal});this.controls=normalizeControls(controls);this.padHeld=new Set();this.padPrevious=new Set();this.vertical=0;this.gamepadLabel='No controller connected';
    this.keys = new Set(); this.pointers = new Map(); this.edges = new Set(); this.axis = 0; this.stickPointer = null; this.enabled = false;
    this.tapCounts = new Map();
    this.interrupted = false;
    this.root = root; this.onPause = onPause;
    this.stick = root.querySelector('#stick'); this.knob = root.querySelector('#stick-knob');
    listen(window,'keydown', e => {
      if(this.interrupted || e.defaultPrevented) return;
      if(e.code==='Escape'&&!e.repeat){if(e.cancelable)e.preventDefault();this.onPause();return;}
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (['Space','Enter'].includes(e.code) && e.target.closest?.('button,a')) return;
      if (this.controls.keys.pause.includes(e.code) && !e.repeat) { if(e.cancelable)e.preventDefault(); this.onPause(); return; }
      if (!this.enabled) return;
      if (e.cancelable && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) for(const [action,codes] of Object.entries(this.controls.keys))if(codes.includes(e.code))this.edges.add(action);
      this.keys.add(e.code);
    });
    listen(window,'keyup', e => this.keys.delete(e.code));
    const interrupt = () => {
      this.interrupted = true;
      this.clear();
      this.padHeld.clear();
      this.padPrevious.clear();
      this.padX = this.padY = 0;
      this.waitForNeutralPad = true;
    };
    const restore = () => { this.interrupted = document.hidden; };
    listen(window,'blur',interrupt);
    listen(window,'pagehide',interrupt);
    listen(window,'focus',restore);
    listen(window,'pageshow',restore);
    listen(document,'visibilitychange',() => document.hidden ? interrupt() : restore());

    const consume = event => {
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
    };
    const surface = '#game, .touch-controls, #stick, #power-bar, #hud, #boss-hud, .topbar, .controls-footer, #toast, [data-control]';
    for (const name of ['contextmenu','selectstart','dragstart','dblclick','gesturestart','gesturechange']) {
      listen(root,name,event => {
        if (this.enabled && !event.target.closest?.('input,textarea,select,[contenteditable],dialog') && event.target.closest?.(surface)) consume(event);
      });
    }
    const capture = (target,id) => {
      try { target.setPointerCapture(id); } catch (error) {
        if (error.name !== 'NotFoundError') throw error;
      }
    };
    for (const b of root.querySelectorAll('[data-control]')) {
      listen(b,'pointerdown', e => {
        if (!this.enabled || this.interrupted || e.button !== 0 || this.pointers.has(e.pointerId)) return;
        consume(e);
        const action = b.dataset.control;
        capture(b,e.pointerId);
        this.pointers.set(e.pointerId,action);
        this.tapCounts.set(action,(this.tapCounts.get(action)||0)+1);
        b.classList.add('pressed');
      });
      listen(b,'click',e => {
        if (!this.enabled || this.interrupted) return;
        consume(e);
        // Keyboard and assistive technology send a click without a pointer.
        if (!e.detail && !e.pointerType) this.edges.add(b.dataset.control);
      });
      listen(b,'lostpointercapture',e => releaseAction(e.pointerId,b.dataset.control));
    }
    const releaseAction = (id,action=this.pointers.get(id)) => {
      if (!action || this.pointers.get(id)!==action) return;
      this.pointers.delete(id);
      if (![...this.pointers.values()].includes(action))
        root.querySelector('[data-control="'+action+'"]').classList.remove('pressed');
    };
    const moveStick = e => {
      if (e.pointerId !== this.stickPointer) return;
      const rect = this.stick.getBoundingClientRect(), radius = rect.width * .31;
      if (!radius) return;
      const dx = Math.max(-radius, Math.min(radius, e.clientX - rect.left - rect.width / 2));
      const dy = Math.max(-radius, Math.min(radius, e.clientY - rect.top - rect.height / 2));
      this.vertical = Math.abs(dy)<radius*.18?0:dy/radius;
      this.axis = Math.abs(dx) < radius * .14 ? 0 : dx / radius;
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    listen(this.stick,'pointerdown', e => {
      if (!this.enabled || this.interrupted || e.button!==0 || this.stickPointer!==null) return;
      consume(e);
      capture(this.stick,e.pointerId);
      this.stickPointer=e.pointerId;
      moveStick(e);
    });
    const releaseStick = id => {
      if (id!==this.stickPointer) return;
      this.stickPointer=null;
      this.axis=this.vertical=0;
      this.knob.style.transform='translate(-50%, -50%)';
    };
    listen(window,'pointermove',moveStick);
    listen(this.stick,'lostpointercapture',e => releaseStick(e.pointerId));
    for (const name of ['pointerup','pointercancel']) listen(window,name,e => {
      releaseStick(e.pointerId);
      releaseAction(e.pointerId);
    });
  }
  destroy(){this.enabled=false;this.destroyed=true;this.clear();this.padHeld.clear();this.padPrevious.clear();this.abort.abort();}
  clear() {
    for (const [id,action] of this.pointers) {
      const b=this.root.querySelector('[data-control="'+action+'"]');
      if (b?.hasPointerCapture?.(id)) b.releasePointerCapture(id);
    }
    if (this.stickPointer!==null && this.stick.hasPointerCapture?.(this.stickPointer))
      this.stick.releasePointerCapture(this.stickPointer);
    this.tapCounts.clear();
    this.keys.clear(); this.pointers.clear(); this.edges.clear(); this.axis = this.vertical = 0; this.stickPointer = null;
    this.root.querySelectorAll('.pressed').forEach(e => e.classList.remove('pressed'));
    this.knob.style.transform = 'translate(-50%, -50%)';
  }
  pollGamepad() {
    if(this.destroyed||this.interrupted)return;
    let pad;try{pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected&&p.mapping==='standard');}catch{}
    this.gamepadLabel=pad?'Standard controller connected':'No standard controller connected';
    this.padHeld.clear();this.padX=this.padY=0;
    if(pad){
      for(const [action,index] of Object.entries(this.controls.pad))if(pad.buttons[index]?.pressed)this.padHeld.add(action);
      this.padX=Math.abs(pad.axes[0]||0)>.18?pad.axes[0]:0;this.padY=Math.abs(pad.axes[1]||0)>.18?pad.axes[1]:0;
    }
    if (this.waitForNeutralPad) {
      this.waitForNeutralPad=!!(this.padHeld.size||this.padX||this.padY);
      this.padHeld.clear();
      this.padX=this.padY=0;
      return;
    }
    const edges=[];for(const action of this.padHeld)if(!this.padPrevious.has(action))edges.push(action);this.padPrevious.clear();for(const action of this.padHeld)this.padPrevious.add(action);
    if(edges.includes('pause'))this.onPause();
    if(this.enabled)for(const action of edges)this.edges.add(action);
  }
  sample() {
    if (!this.enabled) { this.clear(); return {}; }
    const held = action => {if(this.padHeld.has(action)||this.controls.keys[action]?.some(k=>this.keys.has(k)))return true;for(const value of this.pointers.values())if(value===action)return true;return false;};
    for (const [action,count] of this.tapCounts || []) {
      this.edges.add(action);
      if (count===1) this.tapCounts.delete(action);
      else this.tapCounts.set(action,count-1);
    }
    const left = held('left'), right = held('right');
    const result = { move: this.axis || this.padX || Number(right) - Number(left), run: Math.abs(this.axis) > .72 || Math.abs(this.padX)> .72 || held('run'),
      vertical:this.vertical||this.padY||(held('down')?1:held('up')?-1:0),powers:[0,1,2,3].map(i=>this.edges.has(`power${i}`)),heal:this.edges.has('heal'),tree:this.edges.has('tree'),
      portal:this.edges.has('portal'),nextTarget:this.edges.has('nextTarget'),jump: this.edges.has('jump'), punch: this.edges.has('punch'), kick: this.edges.has('kick'), interact: this.edges.has('interact'),
      punchHeld: held('punch'), kickHeld: held('kick') };
    this.edges.clear(); return result;
  }
}
