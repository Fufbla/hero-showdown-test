import {decodeSave} from '../core.mjs';
self.onmessage=({data:{id,value,validate}})=>{try{if(validate&&!decodeSave(JSON.stringify(value.snapshot)))throw Error('Checkpoint validation failed; previous cloud save retained.');self.postMessage({id,text:JSON.stringify(value)});}catch(e){self.postMessage({id,error:e.message});}};
