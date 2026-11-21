import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isNewCostumesTestContext,NEW_COSTUMES_TEST_ENABLED} from '../scope.mjs';
import {NEW_COSTUME_IDS,NEW_OUTFITS} from '../definitions.mjs';
import {COLLECTION,COSTUMES,NEW_COSTUMES,catalogForContext} from '../catalog.mjs';
import {OUTFIT_POLICIES,policyForContext} from '../outfit-policy.mjs';
import * as productionCatalog from '../../../../royale/fashion/catalog.mjs?four-base=1';
import * as productionPolicy from '../../../../royale/fashion/outfit-policy.mjs?four-base=1';
import {CostumeEngine} from '../engine.mjs';
import {requireTestAccount} from '../../review.mjs';

const allowed={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
test('Rejected codes return to the reserved entry using the page URL instead of the production asset base',()=>{
 const previous=globalThis.location;
 try{
  for(const suffix of ['gameplay/','gameplay/index.html','local-coop/','local-coop/index.html']){
   const redirects=[];
   globalThis.location={href:'https://fufbla.github.io/hero-showdown-test/four-powers-test/'+suffix+'?testAccount=0000000001',
    search:'?testAccount=0000000001',replace:url=>redirects.push(url)};
   assert.throws(()=>requireTestAccount(),/Enter the isolated test code/);
   assert.deepEqual(redirects,['https://fufbla.github.io/hero-showdown-test/four-powers-test/?blocked=1']);
  }
  const redirects=[];
  globalThis.location={href:'https://fufbla.github.io/hero-showdown-test/four-powers-test/gameplay/?testAccount=0000000000',
   search:'?testAccount=0000000000',replace:url=>redirects.push(url)};
  assert.doesNotThrow(()=>requireTestAccount());assert.deepEqual(redirects,[]);
 }finally{if(previous===undefined)delete globalThis.location;else globalThis.location=previous;}
});
test('Reserved profile detection still requires the exact code on a separate solo or co-op route',()=>{
 for(const suffix of ['gameplay/','gameplay/index.html','local-coop/','local-coop/index.html'])
  assert.equal(isNewCostumesTestContext({...allowed,pathname:'/hero-showdown-test/four-powers-test/'+suffix}),true);
 for(const pathname of ['/hero-showdown-test/royale/gameplay/','/hero-showdown-test/royale/local-coop/',
  '/hero-showdown-test/four-powers-test/','/hero-showdown-test/four-powers-test/gameplay/extra',
  '/hero-showdown-test/four-powers-test/gameplay','/hero-showdown-test/royale-v3-staging/kingjames/'])
  assert.equal(isNewCostumesTestContext({...allowed,pathname}),false,pathname);
 for(const search of ['','?testAccount=000000000','?testAccount=00000000000','?testAccount=1234567890','?code=0000000000'])
  assert.equal(isNewCostumesTestContext({...allowed,search}),false,search);
 assert.equal(isNewCostumesTestContext(),false);assert.equal(NEW_COSTUMES_TEST_ENABLED,false);
});

test('Live and reserved catalogs share the same four released looks without duplicate entries or special prices',()=>{
 assert.strictEqual(COLLECTION,productionCatalog.COLLECTION);assert.strictEqual(COSTUMES,productionCatalog.COSTUMES);
 assert.equal(COLLECTION.length,35);assert.equal(new Set(COLLECTION.map(row=>row.id)).size,35);
 assert.deepEqual(COLLECTION.slice(-4).map(row=>row.id),NEW_COSTUME_IDS);
 for(const row of NEW_COSTUMES){
  assert.equal(COLLECTION.filter(outfit=>outfit.id===row.id).length,1);
  assert.equal(row.coinPrice,700);assert.equal(row.unisex,true);assert.equal(row.renderer,'new-costumes');
  assert.equal(row.pieces.length,1);assert.equal(row.pieces[0].id,row.id+'.fullbody');
  assert.match(row.thumbnail,new RegExp('/royale/fashion/new-costumes/assets/'+row.id+'/preview\\.png$'));
  assert.match(row.pieces[0].assetManifest,new RegExp('/royale/fashion/new-costumes/assets/'+row.id+'/manifest\\.json$'));
 }
 assert.deepEqual(NEW_COSTUMES.map(row=>row.fullTransform),[false,false,true,true]);
 assert(Object.isFrozen(NEW_OUTFITS));assert(Object.isFrozen(COLLECTION));
 for(const context of [{},allowed,{...allowed,search:'?testAccount=0000000001'},{...allowed,pathname:'/royale/gameplay/'}])
  assert.strictEqual(catalogForContext(context),productionCatalog.COLLECTION);
});

test('The shared released policy retains all historical ownership without a reserved-only duplicate',()=>{
 assert.strictEqual(OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);
 const policy=policyForContext(allowed),ordinary=policyForContext({});
 assert.strictEqual(policy,ordinary);assert.strictEqual(ordinary.OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);
 for(const [id,row]of Object.entries(productionPolicy.OUTFIT_POLICIES)){
  assert.strictEqual(policy.OUTFIT_POLICIES[id],row);
  for(const part of row.historicalPieces)assert.strictEqual(policy.historicalPiece(part.id),productionPolicy.historicalPiece(part.id));
 }
 for(const id of NEW_COSTUME_IDS){
  const part=policy.historicalPiece(id+'.fullbody');assert.equal(part.coinPrice,700);assert.equal(part.category,'fullbody');
  assert.equal(policy.outfitForPiece(part.id).id,id);assert.strictEqual(ordinary.historicalPiece(part.id),part);
 }
});

test('Released renderers request canonical production artwork without a reserved code',async()=>{
 const requested=[],engine=new CostumeEngine({jsonLoader:url=>{requested.push(url.pathname);throw Error('Deliberate production artwork fixture');}});
 for(const id of NEW_COSTUME_IDS){
  assert.equal(await engine.preload(id),false,id);assert.equal(engine.outfits.has(id),false,id);assert.equal(engine.pending.has(id),false,id);
 }
 assert.deepEqual(requested,NEW_COSTUME_IDS.map(id=>new URL('../../../../royale/fashion/new-costumes/assets/'+id+'/manifest.json',import.meta.url).pathname));
 assert.equal(engine.error,'Deliberate production artwork fixture');
});

test('Published assets serve both catalogs while the reserved profile and wallet remain isolated',()=>{
 const root=new URL('../../../../',import.meta.url),read=path=>fs.readFileSync(new URL('_site/'+path,root),'utf8');
 const production=JSON.parse(read('royale/release-manifest.json')),sandbox=JSON.parse(read('four-powers-test/release-manifest.json'));
 assert.equal(sandbox.production,false);assert.equal(sandbox.cloudWrites,false);assert.equal(sandbox.testAccount,'0000000000');
 assert.deepEqual(sandbox.testCostumes,NEW_COSTUME_IDS);assert.equal(sandbox.storagePrefix,'royale-four-powers-0000000000-v1:');
 assert.equal(Object.keys(production.sourceHashes).some(path=>path.startsWith('test-only/')),false);
 assert(production.sourceHashes['royale/fashion/new-costumes/engine.mjs']);
 assert.equal(production.costumes.count,35);
 for(const id of NEW_COSTUME_IDS){
  assert.equal(production.costumes.ids.filter(value=>value===id).length,1);
  for(const file of ['body.webp','manifest.json','preview.png'])
   assert.ok(fs.statSync(new URL('_site/royale/fashion/new-costumes/assets/'+id+'/'+file,root)).size>0,id+'/'+file);
 }
 for(const file of Object.keys(production.bundles))assert.doesNotMatch(read(file),/puppyCoinGrant|applyPuppyTestCoins|NEW_COSTUMES_TEST_CODE|My Test Heroes|reserved-test-profile/,file);
 assert.equal(production.saveContract.databaseMigration,false);
});
