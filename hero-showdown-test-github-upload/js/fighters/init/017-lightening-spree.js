'use strict';
// Initialization order preserved from the original single script.


const spreeSheet=new Image();
spreeSheet.src="assets/images/spree-sheet-24.webp";

const spreeFrames={"referenceHeight":590,"frames":[{"rect":[3,10,370,604],"anchor":[195,595]},{"rect":[515,10,441,598],"anchor":[230,592]},{"rect":[1027,10,462,598],"anchor":[200,590]},{"rect":[3,650,385,560],"anchor":[195,545]},{"rect":[515,650,505,550],"anchor":[230,535]},{"rect":[1027,650,392,520],"anchor":[220,500]}]};

// Lightening Spree — light/prism opponent. Never walks; relocates only while hidden.
let spree=null;


let spreePortraitCache;
