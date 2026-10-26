/* Run the existing chapter suite on the isolated entry, without editing its source. */
const fs=require('node:fs'),path=require('node:path'),serve=require('./competitive-server.cjs');
(async()=>{
  const output=process.env.COMPETITIVE_QA_DIR||path.join(__dirname,'../competitive-qa');fs.mkdirSync(output,{recursive:true});
  const server=await serve(path.resolve(__dirname,'..'));process.env.TEST_URL=server.url;
  let source=fs.readFileSync(path.join(__dirname,'story-chapters.browser.cjs'),'utf8');
  source=source.replaceAll('/workspace/scratch/46994d042163/',output+'/')
    .replace('await page.goto(url);',"await page.goto(url+'playable-villains-test.html');")
    .replace('(async()=>{','return (async()=>{');
  try{await new Function('require','__dirname',source)(require,__dirname);}finally{await server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
