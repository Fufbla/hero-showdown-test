const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
module.exports=async function serve(root){
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    try{
      const size=fs.statSync(file).size,types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json'};
      res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
      const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');let start=0,end=size-1;
      if(range){start=+range[1];end=range[2]?Math.min(+range[2],size-1):size-1;if(start>=size){res.writeHead(416);res.end();return;}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});}else res.setHeader('Content-Length',size);
      if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {url:'http://127.0.0.1:'+server.address().port+'/',close:()=>new Promise(resolve=>server.close(resolve))};
};
