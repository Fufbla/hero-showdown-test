'use strict';
// Classic-script module: shares the original game bindings.
function frame(ms){const dt=last?Math.min(Math.max(0,(ms-last)/1000),.25):0;last=ms;pollPad();advanceEnvironment(dt,dt);if(!paused)update(dt);else simulationRemainder=0;draw();requestAnimationFrame(frame)}
