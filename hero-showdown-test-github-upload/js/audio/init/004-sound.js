'use strict';
// Initialization order preserved from the original single script.

// Original score: "Heroes Rise", 145 BPM, 16-bar through-arranged loop.
// Audio-clock scheduling is independent of rendering and never changes game state.
let score=null;

// Cached original percussion: body resonance, damped texture, tiny contact snap.
let combatBuffers=null,combatVoiceCount=0,fallSoundPlayed=false;

// iOS/Safari audio starts or resumes inside the user's interaction.
window.addEventListener('pointerdown',audio,{passive:true});
window.addEventListener('keydown',audio,{passive:true});
