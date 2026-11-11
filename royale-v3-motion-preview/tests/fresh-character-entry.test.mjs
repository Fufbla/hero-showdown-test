import test from 'node:test';
import assert from 'node:assert/strict';
import {startRoyaleEntry} from '../entry.mjs';

test('old test bookmarks redirect before any legacy game or artwork module loads',async()=>{
  const calls=[];
  const result=await startRoyaleEntry({
    href:'https://fufbla.github.io/hero-showdown-test/royale/?v2TestCharacter=0000000000',
    redirect:url=>calls.push(['redirect',url]),
    loadMotion:()=>assert.fail('Old motion system loaded'),
    loadCatalog:()=>assert.fail('Old outfit catalog loaded'),
    loadGame:()=>assert.fail('Old game loaded'),
  });
  assert.equal(result,'character-test');
  assert.equal(calls.length,1);
  const destination=new URL(calls[0][1]);
  assert.equal(destination.pathname,'/hero-showdown-test/royale-v3-staging/character-test/index.html');
});

test('ordinary game routes retain the original dependency startup order',async()=>{
  for(const query of ['', '?codePlay=v3', '?v2TestCharacter=1234567890']){
    const calls=[];
    const result=await startRoyaleEntry({
      href:'https://fufbla.github.io/hero-showdown-test/royale/'+query,
      redirect:()=>assert.fail('Ordinary player redirected'),
      loadMotion:async()=>calls.push('motion'),
      loadCatalog:async()=>calls.push('catalog'),
      loadGame:async()=>calls.push('game'),
    });
    assert.equal(result,'game');
    assert.deepEqual(calls,['motion','catalog','game']);
  }
});
