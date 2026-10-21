'use strict';
// Initialization order preserved from the original single script.


let last=0;

Promise.all([atlas,dogAtlas,windFX,rockFX,dashSheet,pedestrianSheet,...animationSheets,finishAtlas,backdrop,sonicAtlas,sonicFX,venomAtlas,venomHD,styroAtlas,styroMotionSheet,wasteAtlas,wasteMotionSheet,...venueImages,atomImage,atomDebris,atomSmoke,spreeSheet,dogMotionSheet,sonicMotionSheet,bearMotionSheet,trainerMotionSheet].map(im=>im.complete&&im.width?Promise.resolve():new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject}))).then(()=>{loaded=true;showTitle();window.HealthiaIntro?.start()}).catch(()=>{window.HealthiaIntro?.dismiss();overlay.innerHTML='<div class="panel"><h2>Artwork could not load.</h2><p>Please reload.</p></div>'});
showTitle();
requestAnimationFrame(frame);
