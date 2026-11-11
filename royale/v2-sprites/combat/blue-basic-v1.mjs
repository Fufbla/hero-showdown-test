// Approved blue-cape test hero. Source rectangles preserve the original artwork.
// Fixed 0.4 scale and per-frame foot anchors match idle_run.webp; never size by bounds.
export const BASIC_COMBAT_SCALE = 0.4;
const frames = rows => Object.freeze(rows.map(([x,y,width,height,anchorX,anchorY]) =>
  Object.freeze({x,y,width,height,anchorX,anchorY})));
export const BASIC_COMBAT_ART = Object.freeze({
  punch: Object.freeze({
    file: "combat/test-hero-basic-punch-blue-v1.webp", width: 1254, height: 1254,
    right: frames([
      [0,0,314,314,132.203,299],
      [314,0,313,314,131.703,297],
      [627,0,314,314,131.703,297],
      [941,0,313,314,130.703,297],
      [0,314,314,313,131.703,296],
      [314,314,313,313,131.203,296],
      [627,314,314,313,132.203,297],
      [941,314,313,313,132.203,297],
    ]),
    left: frames([
      [0,627,314,314,191.781,296],
      [314,627,313,314,189.281,296],
      [627,627,314,314,190.781,296],
      [941,627,313,314,189.281,296],
      [0,941,314,313,190.781,296],
      [314,941,313,313,194.281,295],
      [627,941,314,313,195.281,296],
      [941,941,313,313,193.281,296],
    ]),
  }),
  kick: Object.freeze({
    file: "combat/test-hero-basic-kick-blue-v1.webp", width: 1254, height: 1254,
    right: frames([
      [0,0,314,314,132.203,296],
      [314,0,313,314,132.203,296],
      [627,0,314,314,133.203,296],
      [941,0,313,314,131.703,295],
      [0,314,314,313,133.203,295],
      [314,314,313,313,132.703,295],
      [627,314,314,313,134.203,295],
      [941,314,313,313,131.203,296],
    ]),
    left: frames([
      [0,627,314,314,196.781,296],
      [314,627,313,314,192.281,296],
      [627,627,314,314,178.781,296],
      [941,627,313,314,182.281,295],
      [0,941,314,313,184.781,295],
      [314,941,313,313,184.281,295],
      [627,941,314,313,187.281,295],
      [941,941,313,313,196.281,295],
    ]),
  }),
});
