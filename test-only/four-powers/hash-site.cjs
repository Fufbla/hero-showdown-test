const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]),files=[];
function walk(dir){for(const name of fs.readdirSync(dir).sort()){if(dir===root&&name==='four-powers-test')continue;const p=path.join(dir,name),s=fs.statSync(p);if(s.isDirectory())walk(p);else files.push([path.relative(root,p),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]);}}
walk(root);process.stdout.write(JSON.stringify(files));
