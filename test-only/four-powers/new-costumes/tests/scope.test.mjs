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

const allowed={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
test('Four new looks require the exact reserved code on a separate solo or co-op route',()=>{
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

test('Ordinary context exports the original collection; reserved catalog adds exactly four unisex looks at 700',()=>{
 assert.strictEqual(COLLECTION,productionCatalog.COLLECTION);assert.strictEqual(COSTUMES,productionCatalog.COSTUMES);
 const collection=catalogForContext(allowed);
 assert.equal(collection.length,productionCatalog.COLLECTION.length+4);
 assert.equal(new Set(collection.map(row=>row.id)).size,collection.length);
 assert.deepEqual(collection.slice(0,-4),productionCatalog.COLLECTION);
 assert.deepEqual(collection.slice(-4).map(row=>row.id),NEW_COSTUME_IDS);
 for(const row of NEW_COSTUMES){
  assert.equal(row.coinPrice,700);assert.equal(row.unisex,true);assert.equal(row.renderer,'new-costumes');
  assert.equal(row.pieces.length,1);assert.equal(row.pieces[0].id,row.id+'.fullbody');
  assert.match(row.thumbnail,new RegExp('/new-costumes/assets/'+row.id+'/preview\\.png$'));
  assert.match(row.pieces[0].assetManifest,new RegExp('/new-costumes/assets/'+row.id+'/manifest\\.json$'));
 }
 assert.deepEqual(NEW_COSTUMES.map(row=>row.fullTransform),[false,false,true,true]);
 assert(Object.isFrozen(NEW_OUTFITS));assert(Object.isFrozen(collection));
 for(const context of [{},{...allowed,search:'?testAccount=0000000001'},{...allowed,pathname:'/royale/gameplay/'}])
  assert.strictEqual(catalogForContext(context),productionCatalog.COLLECTION);
});

test('Reserved policy extends historical ownership without changing or aliasing any released record',()=>{
 assert.strictEqual(OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);
 const policy=policyForContext(allowed),ordinary=policyForContext({});
 assert.strictEqual(ordinary.OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);
 for(const [id,row]of Object.entries(productionPolicy.OUTFIT_POLICIES)){
  assert.strictEqual(policy.OUTFIT_POLICIES[id],row);
  for(const part of row.historicalPieces)assert.strictEqual(policy.historicalPiece(part.id),productionPolicy.historicalPiece(part.id));
 }
 for(const id of NEW_COSTUME_IDS){
  assert.equal(ordinary.OUTFIT_POLICIES[id],undefined);assert.equal(ordinary.historicalPiece(id+'.fullbody'),null);
  const part=policy.historicalPiece(id+'.fullbody');assert.equal(part.coinPrice,700);assert.equal(part.category,'fullbody');
  assert.equal(policy.outfitForPiece(part.id).id,id);
 }
});

test('The four new renderers do not request artwork outside the reserved route',async()=>{
 const requested=[],engine=new CostumeEngine({jsonLoader:url=>{requested.push(url.href);throw Error('Unexpected reserved asset load');},
  imageLoader:url=>{requested.push(url.href);throw Error('Unexpected reserved image load');}});
 for(const id of NEW_COSTUME_IDS){
  assert.equal(await engine.preload(id),false,id);assert.equal(engine.outfits.has(id),false,id);
 }
 assert.deepEqual(requested,[]);
});

test('Built new-costume assets and modules occur only in the reserved test artifact',()=>{
 const root=new URL('../../../../',import.meta.url),read=path=>fs.readFileSync(new URL('_site/'+path,root),'utf8');
 const production=JSON.parse(read('royale/release-manifest.json')),sandbox=JSON.parse(read('four-powers-test/release-manifest.json'));
 assert.equal(sandbox.production,false);assert.equal(sandbox.cloudWrites,false);assert.equal(sandbox.testAccount,'0000000000');
 assert.deepEqual(sandbox.testCostumes,NEW_COSTUME_IDS);
 assert.equal(sandbox.modules.some(path=>path.startsWith('test-only/four-powers/new-costumes/')),true);
 assert.equal(Object.keys(production.sourceHashes).some(path=>path.startsWith('test-only/')),false);
 for(const id of NEW_COSTUME_IDS){
  assert.equal(production.costumes.ids.includes(id),false);
  for(const file of Object.keys(production.bundles))assert.equal(read(file).includes(id),false,file);
  for(const file of ['body.webp','manifest.json','preview.png'])
   assert.ok(fs.statSync(new URL('_site/four-powers-test/new-costumes/assets/'+id+'/'+file,root)).size>0,id+'/'+file);
  assert.equal(fs.existsSync(new URL('_site/royale/fashion/new-costumes/assets/'+id,root)),false);
 }
 assert.equal(production.saveContract.databaseMigration,false);
});
