import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isViceTestContext,VICE_TEST_ENABLED} from '../scope.mjs';
import {VICE_ID,VICE_OUTFIT} from '../definitions.mjs';
import {COLLECTION,costumeById,catalogForContext} from '../catalog.mjs';
import {OUTFIT_POLICIES,policyForContext} from '../outfit-policy.mjs';
import * as productionCatalog from '../../../../royale/fashion/catalog.mjs?four-base=1';
import * as productionPolicy from '../../../../royale/fashion/outfit-policy.mjs?four-base=1';
import {CostumeEngine} from '../engine.mjs';

const allowed={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
test('Reserved profile detection still requires the exact code on the separate solo or co-op test route',()=>{
 for(const page of ['gameplay/','gameplay/index.html','local-coop/','local-coop/index.html'])
  assert.equal(isViceTestContext({...allowed,pathname:'/hero-showdown-test/four-powers-test/'+page}),true,page);
 assert.equal(isViceTestContext({...allowed,search:allowed.search+'&diagnostics=1'}),true);
 for(const pathname of ['/hero-showdown-test/royale/gameplay/','/hero-showdown-test/royale/local-coop/',
  '/hero-showdown-test/royale-v3-staging/kingjames/','/hero-showdown-test/four-powers-test/',
  '/hero-showdown-test/four-powers-test/gameplay/extra','/hero-showdown-test/four-powers-test/gameplay'])
  assert.equal(isViceTestContext({...allowed,pathname}),false,pathname);
 for(const search of ['','?testAccount=000000000','?testAccount=00000000000','?testAccount=0000000001','?testAccount=1234567890'])
  assert.equal(isViceTestContext({...allowed,search}),false,search);
 assert.equal(isViceTestContext(),false);assert.equal(VICE_TEST_ENABLED,false);
});

test('Live and reserved catalogs share one Vice entry at 700 alongside all other released outfits',()=>{
 assert.strictEqual(COLLECTION,productionCatalog.COLLECTION);assert.equal(COLLECTION.length,35);
 const entries=catalogForContext(allowed),vice=costumeById(VICE_ID);
 assert.strictEqual(entries,productionCatalog.COLLECTION);assert.equal(new Set(entries.map(row=>row.id)).size,35);
 assert.equal(entries.filter(row=>row.id!==VICE_ID).length,34);
 assert.equal(entries.filter(row=>row.id===VICE_ID).length,1);
 assert.equal(vice.id,'vice-costume');assert.equal(vice.name,'Vice Costume');assert.equal(vice.coinPrice,700);
 assert.equal(vice.unisex,true);assert.equal(vice.hideHair,false);assert.equal(vice.pieces[0].id,'vice-costume.fullbody');
 assert.match(vice.pieces[0].assetManifest,/\/royale\/fashion\/vice\/assets\/manifest\.json$/);
 assert.equal(costumeById('golden-puppy-costume').name,'Fancy Costume');
 assert.equal(costumeById('golden-puppy-costume').coinPrice,700);assert.equal(costumeById('robot-costume').coinPrice,0);
 for(const context of [{},allowed,{pathname:'/royale/',search:allowed.search},{...allowed,search:'?testAccount=1234567890'}])
  assert.strictEqual(catalogForContext(context),productionCatalog.COLLECTION);
 assert(Object.isFrozen(VICE_OUTFIT));assert(Object.isFrozen(entries));
});

test('The shared released Vice policy preserves every historical ownership record without a test-only duplicate',()=>{
 assert.strictEqual(OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);
 const allowedPolicy=policyForContext(allowed),ordinary=policyForContext({});
 assert.strictEqual(allowedPolicy,ordinary);
 assert.strictEqual(ordinary.OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);
 assert.equal(Object.keys(allowedPolicy.OUTFIT_POLICIES).length,Object.keys(productionPolicy.OUTFIT_POLICIES).length);
 for(const [id,policy]of Object.entries(productionPolicy.OUTFIT_POLICIES)){
  assert.strictEqual(allowedPolicy.OUTFIT_POLICIES[id],policy,id);
  for(const piece of policy.historicalPieces)assert.deepEqual(allowedPolicy.historicalPiece(piece.id),productionPolicy.historicalPiece(piece.id),piece.id);
 }
 const piece=allowedPolicy.historicalPiece(VICE_ID+'.fullbody');assert.equal(piece.coinPrice,700);assert.equal(piece.category,'fullbody');
 assert.equal(allowedPolicy.outfitForPiece(piece.id).id,VICE_ID);
 assert.strictEqual(ordinary.historicalPiece(piece.id),piece);
});

test('The Vice renderer requests canonical production artwork without requiring a reserved route',async()=>{
 const requests=[],engine=new CostumeEngine({jsonLoader:url=>{requests.push(url.pathname);throw Error('Deliberate production artwork fixture');}});
 assert.equal(await engine.preload(VICE_ID),false);
 assert.deepEqual(requests,[new URL('../../../../royale/fashion/vice/assets/manifest.json',import.meta.url).pathname]);
 assert.equal(engine.outfits.has(VICE_ID),false);assert.equal(engine.pending.has(VICE_ID),false);
 assert.equal(engine.error,'Deliberate production artwork fixture');
});

test('The built production artifact includes released Vice while excluding reserved profile and wallet code',()=>{
 const root=new URL('../../../../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('_site/royale/release-manifest.json',root)));
 assert.equal(manifest.costumes.count,35);assert.equal(manifest.costumes.ids.filter(id=>id===VICE_ID).length,1);
 assert.equal(Object.keys(manifest.sourceHashes).some(path=>path.startsWith('test-only/')),false);
 assert.equal(Object.keys(manifest.sourceHashes).some(path=>path.startsWith('royale/fashion/vice/')),true);
 let includesVice=false;
 for(const file of Object.keys(manifest.bundles)){
  const source=fs.readFileSync(new URL('_site/'+file,root),'utf8');
  assert.doesNotMatch(source,/puppyCoinGrant|applyPuppyTestCoins|VICE_TEST_CODE|My Test Heroes|reserved-test-profile/,file);
  if(source.includes('vice-costume'))includesVice=true;
 }
 assert.equal(includesVice,true);assert.equal(manifest.saveContract.databaseMigration,false);
});
