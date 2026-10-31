// Runs the three visible suites serially so they never compete for iframe focus or saves.
const run=document.getElementById('test-all'),report=document.getElementById('report'),archive=document.getElementById('suite-log');
run.onclick=async()=>{
  run.disabled=true;archive.textContent='';const results=[];
  try{
    for(const viewport of ['portrait','landscape','small','tablet','desktop']){
      document.getElementById(viewport).click();
      for(const [id,name] of [['test','Input'],['test-creator','Creator'],['test-powers','Powers'],['test-world','World']]){
        run.textContent=`Running ${viewport} · ${name}`;
        await document.getElementById(id).onclick();
        const text=report.textContent,passed=text.includes('COMPLETE')&&!text.includes('FAIL')&&!text.includes('STOPPED');
        const line=`${passed?'PASS':'FAIL'} · ${viewport} · ${name} · ${text.split('\n').filter(line=>line.startsWith('PASS')).length} checks`;
        results.push(line);archive.textContent+=`\n${line}\n${text}\n`;
        if(!passed)throw Error(line);
      }
    }
    report.textContent=`COMPLETE · all 20 viewport/suite runs passed.\n${results.join('\n')}\nFull results are in the Browser suite log below.`;
  }catch(error){report.textContent=`${report.textContent}\nSTOPPED · ${error.message}\n${results.join('\n')}`;}
  finally{run.disabled=false;run.textContent='Run all five viewports';}
};
