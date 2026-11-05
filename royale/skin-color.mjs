// One lighting transfer for skin in faces, exposed limbs and turnaround layers.
// The neutral look keeps its original RGB; only explicitly selected skin changes.
export const SKIN_REFERENCE=[185,115,67];
const luma=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
export function skinShade(source,target,reference=SKIN_REFERENCE){
  const shade=luma(source)/Math.max(1,luma(reference));
  return target.map(value=>Math.round(Math.max(0,Math.min(255,shade<=1?value*shade:value+(255-value)*Math.min(1,(shade-1)*.42)))));
}
