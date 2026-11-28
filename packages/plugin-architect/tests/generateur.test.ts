import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generer,tirerSpec} from '../../plugin-socle/tests/generateur/generateur';
import {verifierDocument,comparerConstats} from '../../plugin-socle/tests/generateur/oracle';
import {analyserDocument} from './generateur/analyserDocument';
import {injecter,restaurer,transformer,rendreIllisible,signatureConstats,DEFAUTS,TRANSFORMATIONS,ABSTENTIONS} from '../../plugin-socle/tests/generateur/operateurs';
import {reduire,signatureEcart} from '../../plugin-socle/tests/generateur/reduction';

test('la graine reconstruit les mêmes données avant toute analyse',()=>{
 for(let i=0;i<15;i++)assert.deepEqual(generer(1729+i,tirerSpec(1729+i,i)),generer(1729+i,tirerSpec(1729+i,i)));
});

test('le port lit les valeurs RGB, les alias et le mode forcé de la sous-arborescence',async()=>{
 const spec=tirerSpec(87,1);spec.nom='Compose';spec.anatomie=['texte'];spec.construction=['mode-force'];
 const doc=generer(87,spec);assert.deepEqual(verifierDocument(doc),[]);
 const texte=doc.noeuds.find(n=>n.type==='TEXT')!,variable=doc.variables.find(v=>v.id==='theme-texte')!;
 assert.notDeepEqual(variable.valuesByMode['t:Light'],variable.valuesByMode['t:Dark']);
 assert.equal(texte.props.resolvedVariableModes.t,'t:Dark');
 const resultat=await analyserDocument(doc);assert.equal(resultat.statut,'complete');assert.ok(resultat.releve);
 assert.ok(resultat.catalogue);
});

test('les cinq gestes ont un inverse exact et les cinq transformations gardent les références',async()=>{
 const spec=tirerSpec(42,0);spec.nom='Compose';spec.anatomie=[];spec.construction=['direct'];
 const base=generer(42,spec),resultat=await analyserDocument(base);assert.equal(comparerConstats(base,resultat.constats).conformes,true);
 for(const operation of DEFAUTS){
  const doc=injecter(base,operation);assert.deepEqual(verifierDocument(doc),[]);assert.deepEqual(restaurer(doc),base);
  const r=await analyserDocument(doc);assert.ok(doc.oracle.attendus.some(a=>r.constats.some(c=>c.code===a.code)),operation);
 }
 for(const operation of TRANSFORMATIONS){
  const doc=transformer(base,operation,42);assert.deepEqual(verifierDocument(doc),[]);
  assert.equal(signatureConstats(doc,(await analyserDocument(doc)).constats),signatureConstats(base,resultat.constats),operation);
 }
 for(const operation of ABSTENTIONS){const d=rendreIllisible(base,operation);assert.deepEqual(verifierDocument(d),[]);assert.ok(d.refus);}
});

test('la réduction conserve son témoin après une nouvelle lecture complète',async()=>{
 const spec=tirerSpec(44,0);spec.nom='Compose';spec.anatomie=['texte'];spec.construction=['direct'];
 const doc=injecter(generer(44,spec),'U1-fill-nu'),constat=(await analyserDocument(doc)).constats.find(c=>c.code==='C25')!;
 assert.ok(constat);const reduction=await reduire(doc,constat,analyserDocument);
 assert.deepEqual(verifierDocument(reduction.document),[]);assert.ok(reduction.apres.calques<reduction.avant.calques);
 assert.ok(reduction.apres.variables<reduction.avant.variables);
 assert.ok((await analyserDocument(reduction.document)).constats.some(c=>signatureEcart(c)===signatureEcart(constat)));
});
