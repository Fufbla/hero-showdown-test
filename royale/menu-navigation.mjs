// Pure routing rules shared by keyboard, controller, touch and on-screen menu controls.
// Never change a hero or any save data here; the game handles safe transitions.
export const PAUSE_NESTED_SCREENS = Object.freeze(['tree','controls','world','inventory','chest','creator','account']);
export function backRoute(screen,{pauseSubmenu=false,editing=false,gameStarted=false}={}){
  if(screen==='play')return 'pause';
  if(screen==='pause')return pauseSubmenu?'pause-home':'resume';
  if(screen==='powerPicker')return 'close-picker';
  if(screen==='delete')return 'close-delete';
  if(screen==='creator'&&!editing)return 'cancel-creator';
  if(screen==='account'&&!gameStarted)return 'close-account';
  if(screen==='mergeReward')return 'resolve-reward';
  return gameStarted&&PAUSE_NESTED_SCREENS.includes(screen)?'pause':'none';
}
export function hasResumeActions(screen,{gameStarted=false,editing=false,pauseSubmenu=false}={}){
  if(!gameStarted)return false;
  if(screen==='pause')return !!pauseSubmenu;
  if(screen==='creator')return !!editing;
  return PAUSE_NESTED_SCREENS.includes(screen);
}
