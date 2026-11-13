const status=require('./readiness.json');
if(status.productionReady!==true||status.blockers.length){
  console.error('Production release is on hold:\n'+status.blockers.map(x=>' - '+x).join('\n'));
  process.exit(1);
}
