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
test('Vice requires the exact reserved code on the separate solo or co-op test route',()=>{
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

test('Only the reserved test catalog adds Vice at 700 and preserves the existing thirty outfits',()=>{
 assert.strictEqual(COLLECTION,productionCatalog.COLLECTION);assert.equal(COLLECTION.length,30);assert.equal(costumeById(VICE_ID),null);
 const entries=catalogForContext(allowed),vice=entries.at(-1);
 assert.equal(entries.length,31);assert.equal(new Set(entries.map(row=>row.id)).size,31);
 assert.deepEqual(entries.slice(0,30),productionCatalog.COLLECTION);
 assert.equal(vice.id,'vice-costume');assert.equal(vice.name,'Vice Costume');assert.equal(vice.coinPrice,700);
 assert.equal(vice.unisex,true);assert.equal(vice.hideHair,false);assert.equal(vice.pieces[0].id,'vice-costume.fullbody');
 assert.match(vice.pieces[0].assetManifest,/\/vice\/assets\/manifest\.json$/);
 assert.strictEqual(catalogForContext({pathname:'/royale/',search:allowed.search}),productionCatalog.COLLECTION);
 assert(Object.isFrozen(VICE_OUTFIT));assert(Object.isFrozen(entries));
});

test('Vice test policy preserves every prior historical ownership record and is inert outside the test route',()=>{
 assert.strictEqual(OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);assert.equal(OUTFIT_POLICIES[VICE_ID],undefined);
 const allowedPolicy=policyForContext(allowed),ordinary=policyForContext({});
 assert.strictEqual(ordinary.OUTFIT_POLICIES,productionPolicy.OUTFIT_POLICIES);
 assert.equal(Object.keys(allowedPolicy.OUTFIT_POLICIES).length,Object.keys(productionPolicy.OUTFIT_POLICIES).length+1);
 for(const [id,policy]of Object.entries(productionPolicy.OUTFIT_POLICIES)){
  assert.strictEqual(allowedPolicy.OUTFIT_POLICIES[id],policy,id);
  for(const piece of policy.historicalPieces)assert.deepEqual(allowedPolicy.historicalPiece(piece.id),productionPolicy.historicalPiece(piece.id),piece.id);
 }
 const piece=allowedPolicy.historicalPiece(VICE_ID+'.fullbody');assert.equal(piece.coinPrice,700);assert.equal(piece.category,'fullbody');
 assert.equal(allowedPolicy.outfitForPiece(piece.id).id,VICE_ID);
 assert.equal(ordinary.historicalPiece(piece.id),null);
});

test('A directly imported Vice renderer refuses assets outside the reserved context',async()=>{
 let requests=0;const unexpected=()=>{requests++;throw Error('An unscoped renderer requested Vice assets');};
 const engine=new CostumeEngine({imageLoader:unexpected,jsonLoader:unexpected});
 assert.equal(await engine.preload(VICE_ID),false);assert.equal(requests,0);
 assert.equal(engine.outfits.has(VICE_ID),false);assert.equal(engine.pending.has(VICE_ID),false);
 assert.match(engine.error,/reserved test account/);
});

test('The built production artifact excludes Vice and test wallet code while retaining thirty released outfits',()=>{
 const root=new URL('../../../../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('_site/royale/release-manifest.json',root)));
 assert.equal(manifest.costumes.count,30);assert.equal(manifest.costumes.ids.includes(VICE_ID),false);
 assert.equal(Object.keys(manifest.sourceHashes).some(path=>path.startsWith('test-only/')||path.includes('/vice/')),false);
 for(const file of Object.keys(manifest.bundles)){
  const source=fs.readFileSync(new URL('_site/'+file,root),'utf8');
  assert.doesNotMatch(source,/vice-costume|Vice Costume|puppyCoinGrant|applyPuppyTestCoins|VICE_TEST_CODE/,file);
 }
 assert.equal(manifest.saveContract.databaseMigration,false);
});
