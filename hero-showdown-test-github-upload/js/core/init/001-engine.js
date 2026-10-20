'use strict';
// Initialization order preserved from the original single script.

'use strict';

const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),overlay=document.getElementById('overlay');

const W=1280,H=720,GROUND=604,ASSET='assets/images/artwork-01.webp';

const backdrop=new Image();
backdrop.src='assets/images/backdrop-02.webp';

const finishAtlas=new Image();
finishAtlas.src='assets/images/finish-atlas-03.webp';

const dogAtlas=new Image();
dogAtlas.src='assets/images/dog-atlas-04.webp';

let opponent=0,foamShots=[],shockwaves=[];

const sonicAtlas=new Image();
sonicAtlas.src='assets/images/sonic-atlas-05.webp';
const sonicFX=new Image();
sonicFX.src='assets/images/sonic-f-x-06.webp';
let soundWaves=[];

const venomAtlas=new Image();
venomAtlas.src='assets/images/venom-atlas-07.webp';
let plantShots=[],vines=[];

const atlas=new Image();
atlas.src=ASSET;
