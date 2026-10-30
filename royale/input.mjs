// Every physical pointer owns its action. Releasing one finger never releases another.
export class Input {
  constructor(root, onPause) {
    this.keys = new Set(); this.pointers = new Map(); this.edges = new Set(); this.axis = 0; this.stickPointer = null; this.enabled = false;
    this.root = root; this.onPause = onPause;
    this.stick = root.querySelector('#stick'); this.knob = root.querySelector('#stick-knob');
    this.keyAction = { Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyJ: 'punch', KeyZ: 'punch', KeyK: 'kick', KeyX: 'kick', KeyE: 'interact' };
    window.addEventListener('keydown', e => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { e.preventDefault(); this.onPause(); return; }
      if (!this.enabled) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat && this.keyAction[e.code]) this.edges.add(this.keyAction[e.code]);
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
      this.axis = Math.abs(dx) < radius * .14 ? 0 : dx / radius;
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), -50%)`;
    };
    this.stick.addEventListener('pointerdown', e => { if (!this.enabled || this.stickPointer !== null) return; e.preventDefault(); this.stickPointer = e.pointerId; this.stick.setPointerCapture(e.pointerId); moveStick(e); });
    this.stick.addEventListener('pointermove', moveStick);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.stick.addEventListener(event, e => {
      if (e.pointerId === this.stickPointer) { this.stickPointer = null; this.axis = 0; this.knob.style.transform = 'translate(-50%, -50%)'; }
    });
  }
  clear() {
    this.keys.clear(); this.pointers.clear(); this.edges.clear(); this.axis = 0; this.stickPointer = null;
    this.root.querySelectorAll('.pressed').forEach(e => e.classList.remove('pressed'));
    this.knob.style.transform = 'translate(-50%, -50%)';
  }
  sample() {
    if (!this.enabled) { this.clear(); return {}; }
    const held = action => [...this.pointers.values()].includes(action);
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft'), right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const result = { move: this.axis || Number(right) - Number(left), run: Math.abs(this.axis) > .72 || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      jump: this.edges.has('jump'), punch: this.edges.has('punch'), kick: this.edges.has('kick'), interact: this.edges.has('interact'),
      punchHeld: this.keys.has('KeyJ') || this.keys.has('KeyZ') || held('punch'), kickHeld: this.keys.has('KeyK') || this.keys.has('KeyX') || held('kick') };
    this.edges.clear(); return result;
  }
}
