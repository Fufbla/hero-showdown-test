// Geometry is sampled for every move, so responsive grids and scrolling need no index map.
export function spatialTarget(current, candidates, direction, rect = el => el.getBoundingClientRect()) {
  if (!current || !['up','down','left','right'].includes(direction)) return null;
  const from=rect(current), vertical=direction==='up'||direction==='down', sign=direction==='up'||direction==='left'?-1:1;
  const center=r=>vertical?[(r.top+r.bottom)/2,(r.left+r.right)/2]:[(r.left+r.right)/2,(r.top+r.bottom)/2];
  const [a,b]=center(from);let best=null,score=Infinity;
  // A scrolled grid can sit behind a fixed tab bar. Prefer its directional
  // neighbors before leaving the grid, then reveal the chosen item by scrolling.
  const group=current.closest?.('[data-spatial-group],.hair-thumbnails,.skin-swatches,.entry-swatches,.virtual-keys,.entry-choices,#shop-items,#power-list,.region-cards,.legendary-cards,.equipment-list');
  for(const item of candidates){
    if(item===current)continue;
    const to=rect(item),[x,y]=center(to),forward=(x-a)*sign,side=Math.abs(y-b);
    const overlap=vertical?Math.min(from.right,to.right)-Math.max(from.left,to.left):Math.min(from.bottom,to.bottom)-Math.max(from.top,to.top);
    if(forward<=1 || overlap<=0&&forward<side*.25)continue;
    const edge=vertical?(sign>0?to.top-from.bottom:from.top-to.bottom):(sign>0?to.left-from.right:from.left-to.right);
    const rank=(group&&!group.contains(item)?1000000:0)+(overlap>1?0:100000)+Math.max(0,edge)*2+forward+side*1.5;
    if(rank<score){score=rank;best=item;}
  }
  return best;
}
export const focusableSelector='button,a[href],input:not([type="hidden"]),select,textarea,summary,[tabindex]';
export function isSelectable(el) {
  if(el.disabled||el.matches?.(':disabled')||el.closest('[hidden],[inert],[aria-hidden="true"],[aria-disabled="true"]')||!el.getClientRects().length)return false;
  if(el.tabIndex<0&&!el.matches('button,a[href],input,select,textarea,summary,[role="tab"]'))return false;
  const style=el.ownerDocument.defaultView.getComputedStyle(el);
  return style.visibility!=='hidden'&&style.visibility!=='collapse'&&style.display!=='none';
}
export const selectableItems=root=>[...root.querySelectorAll(focusableSelector)].filter(isSelectable);
export function focusControl(el,doc=el?.ownerDocument) {
  doc?.querySelectorAll('.controller-focus').forEach(n=>n.classList.remove('controller-focus'));
  if(!el)return;
  el.focus({preventScroll:true});el.classList.add('controller-focus');el.scrollIntoView({block:'nearest',inline:'nearest'});
}
