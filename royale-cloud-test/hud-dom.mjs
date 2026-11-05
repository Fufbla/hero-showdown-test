// Avoid replacing unchanged HUD nodes/attributes during the 10 Hz status refresh.
export const text=(node,value)=>{value=String(value);if(node.textContent!==value)node.textContent=value;};
export const html=(node,value)=>{if(node.innerHTML!==value)node.innerHTML=value;};
export const attr=(node,key,value)=>{value=String(value);if(node.getAttribute(key)!==value)node.setAttribute(key,value);};
