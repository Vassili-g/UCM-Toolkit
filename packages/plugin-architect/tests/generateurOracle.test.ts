import assert from 'node:assert/strict';
import test from 'node:test';
import { comparerConstats, resoudreVariable, verifierDocument } from '../../plugin-socle/tests/generateur/oracle';
import type { DocumentGenere, Noeud } from '../../plugin-socle/tests/generateur/types';

const alias=(id:string)=>({type:'VARIABLE_ALIAS',id});
const bleu={r:0.13,g:0.38,b:0.79,a:1};
const paint=()=>({type:'SOLID',color:{...bleu},visible:true,opacity:1,boundVariables:{color:alias('fond')}});

function documentValide():DocumentGenere {
 const noeud=(id:string,type:string,name:string,parent:string|null,children:string[],props:Record<string,any>={}):Noeud=>({id,type,name,parent,children,props});
 const doc:DocumentGenere={
  version:1,id:'oracle-fixture',graine:1,famille:'juste',spec:{nom:'Button',anatomie:['conteneur','texte'],construction:[],dialecte:'ucm',axes:[{nom:'State',role:'etat',valeurs:['Default']}]},
  page:'page',selection:['jeu'],
  noeuds:[
   noeud('document','DOCUMENT','Fichier',null,['page']),
   noeud('page','PAGE','Composants','document',['jeu']),
   noeud('jeu','COMPONENT_SET','Button','page',['variant'],{componentPropertyDefinitions:{State:{type:'VARIANT',defaultValue:'Default',variantOptions:['Default']}}}),
   noeud('variant','COMPONENT','State=Default','jeu',['texte'],{fills:[paint()],paddingLeft:14,boundVariables:{paddingLeft:alias('taille')},resolvedVariableModes:{c:'m'}}),
   noeud('texte','TEXT','Label','variant',[],{characters:'Bonjour',textStyleId:'style',fontSize:14,fontWeight:400,fontName:{family:'Inter',style:'Regular'},segments:[{start:0,end:7,fontSize:14,fontWeight:400,fontName:{family:'Inter',style:'Regular'},textStyleId:'style',fills:[]}]}),
  ],
  variables:[
   {id:'fond',key:'fond-key',name:'Button/Color/Primary/Filled/Default/background',variableCollectionId:'c',resolvedType:'COLOR',scopes:['FRAME_FILL'],valuesByMode:{m:{...bleu}}},
   {id:'taille',key:'taille-key',name:'body/md/font-size',variableCollectionId:'c',resolvedType:'FLOAT',scopes:['FONT_SIZE'],valuesByMode:{m:14}},
  ],
  collections:[{id:'c',key:'c-key',name:'components',modes:[{modeId:'m',name:'Valeur'}],defaultModeId:'m',variableIds:['fond','taille']}],
  styles:[{id:'style',name:'Body/Medium',type:'TEXT',props:{fontName:{family:'Inter',style:'Regular'},fontSize:14,fontWeight:400,boundVariables:{fontSize:alias('taille')}}}],
  oracle:{couleurs:{fond:{m:{...bleu}},taille:{m:14}},scopes:{fond:['FRAME_FILL'],taille:['FONT_SIZE']},
   calques:{
    document:{chemin:['Fichier'],rang:0,proprietaire:'Button'},
    page:{chemin:['Fichier','Composants'],rang:0,proprietaire:'Button'},
    jeu:{chemin:['Fichier','Composants','Button'],rang:0,proprietaire:'Button'},
    variant:{chemin:['State=Default'],rang:0,proprietaire:'Button'},
    texte:{chemin:['State=Default','Label'],rang:0,proprietaire:'Button'},
   },
   liaisons:[
    {noeud:'variant',champ:'fills',indice:0,variable:'fond',origine:'propre',proprietaire:'Button',role:'background'},
    {noeud:'variant',champ:'paddingLeft',variable:'taille',origine:'propre',proprietaire:'Button'},
    {noeud:'texte',champ:'fontSize',variable:'taille',origine:'style',proprietaire:'Button'},
    {noeud:'texte',champ:'fontSize',plage:{debut:0,fin:7},variable:'taille',origine:'style',proprietaire:'Button'},
   ],axes:{State:'etat'},attendus:[],infos:[]},
 };
 return doc;
}
const codes=(d:DocumentGenere)=>verifierDocument(d).map(r=>r.code);

test('la carte indépendante accepte le document, ses scopes précis et ses liaisons de style',()=>{
 assert.deepEqual(verifierDocument(documentValide()),[]);
});
test('le garde refuse un paint différent de sa variable',()=>{
 const d=documentValide();d.noeuds.find(n=>n.id==='variant')!.props.fills[0].color.r=0.99;
 assert.ok(codes(d).includes('paint-incoherent'));
});
test('le garde refuse une variable liée absente du catalogue',()=>{
 const d=documentValide();d.variables=d.variables.filter(v=>v.id!=='fond');
 assert.ok(codes(d).includes('variable-liee-absente'));
});
test('le garde refuse un identifiant dupliqué',()=>{
 const d=documentValide();d.noeuds.push(structuredClone(d.noeuds[3]));
 assert.ok(codes(d).includes('identifiant-duplique'));
});
test('le garde refuse un maître sans parent',()=>{
 const d=documentValide();d.noeuds.push({id:'maitre',type:'COMPONENT',name:'Icon',parent:null,children:[],props:{}});
 d.noeuds.push({id:'icone',type:'INSTANCE',name:'Icône',parent:'variant',children:[],props:{},main:'maitre'});d.noeuds[3].children.push('icone');
 d.oracle.calques.maitre={chemin:['Icon'],rang:0,proprietaire:'Icon'};
 d.oracle.calques.icone={chemin:['State=Default','Icône'],rang:0,proprietaire:'Button'};
 assert.ok(codes(d).includes('parent-absent'));
});
test('le garde refuse une plage incompatible avec son style',()=>{
 const d=documentValide();d.noeuds[4].props.segments[0].fontWeight=700;
 assert.ok(codes(d).includes('style-plage-incoherent'));
});
test('le garde refuse un champ lié différent de la variable résolue',()=>{
 const d=documentValide();d.noeuds[3].props.paddingLeft=17;
 assert.ok(codes(d).includes('valeur-liee-incoherente'));
});
test('le garde refuse une variable omise de l’inventaire de sa collection',()=>{
 const d=documentValide();d.collections[0].variableIds=['fond'];
 assert.ok(codes(d).includes('variable-hors-inventaire'));
});
test('le garde refuse une origine et un chemin inventés par la carte',()=>{
 const d=documentValide();d.oracle.liaisons[2].origine='propre';d.oracle.calques.texte.chemin=['Autre'];
 assert.ok(codes(d).includes('origine-incoherente'));assert.ok(codes(d).includes('chemin-incoherent'));
});
test('une lecture refusée ne rend pas le document source incohérent',()=>{
 const d=documentValide();d.famille='abstention';d.refus={variables:['fond'],lectures:[{noeud:'texte',champ:'fontSize'}]};
 assert.deepEqual(verifierDocument(d),[]);
});
test('le garde vérifie les données sans opposer une règle de scope au défaut injecté',()=>{
 const d=documentValide();d.famille='defaut';d.variables[0].scopes=['TEXT_FILL'];d.oracle.scopes.fond=['TEXT_FILL'];
 d.oracle.attendus=[{code:'C18',cibles:['variant']}];
 assert.deepEqual(verifierDocument(d),[]);
});
test('la résolution suit les alias et choisit le mode de chaque collection',()=>{
 const d=documentValide();
 d.collections.push({id:'p',key:'p-key',name:'primitives',modes:[{modeId:'light',name:'Light'},{modeId:'dark',name:'Dark'}],defaultModeId:'light',variableIds:['primitive']});
 d.variables.push({id:'primitive',key:'primitive-key',name:'color/blue',variableCollectionId:'p',resolvedType:'COLOR',scopes:[],valuesByMode:{light:{...bleu},dark:{r:0.8,g:0.9,b:1,a:1}}});
 d.variables[0].valuesByMode.m=alias('primitive');
 assert.deepEqual(resoudreVariable(d,'fond',{p:'dark'}),{r:0.8,g:0.9,b:1,a:1});
 assert.deepEqual(resoudreVariable(d,'fond',{}),bleu);
});
test('la résolution refuse un cycle, un mode inconnu et une valeur manquante',()=>{
 const d=documentValide();d.variables[0].valuesByMode.m=alias('fond');
 assert.throws(()=>resoudreVariable(d,'fond',{}),/Cycle/);
 assert.throws(()=>resoudreVariable(documentValide(),'fond',{c:'inconnu'}),/Mode inconnu/);
 const absent=documentValide();absent.variables[0].valuesByMode={};
 assert.throws(()=>resoudreVariable(absent,'fond',{}),/Valeur absente/);
});
test('la comparaison exige le code et la cible et sépare les informations',()=>{
 const d=documentValide();d.oracle.attendus=[{code:'C24',type:'corriger',cibles:['variant'],faits:{champ:'fills'}}];d.oracle.infos=[{code:'C53',type:'info',cibles:['variant']}];
 const correct=[{code:'C24',type:'corriger',variants:['variant'],layers:['variant'],faits:{champ:'fills'}},{code:'C53',type:'info',variants:['State=Default'],layers:[],faits:{}}];
 assert.equal(comparerConstats(d,correct).conformes,true);
 const erreur=comparerConstats(d,[{...correct[0],layers:['texte'],variants:[]},correct[1]]);
 assert.equal(erreur.conformes,false);assert.equal(erreur.manquants.length,1);assert.equal(erreur.inattendus.length,1);
});
test('un constat dupliqué reste un écart et une info imprévue n’est pas dispensée',()=>{
 const d=documentValide();d.oracle.attendus=[{code:'C25',cibles:['texte']}];
 const c={code:'C25',type:'corriger',layers:['texte'],variants:[],faits:{}};
 const r=comparerConstats(d,[c,c,{code:'C49',type:'info',layers:[],variants:[],faits:{}}]);
 assert.equal(r.inattendus.length,2);assert.equal(r.manquants.length,0);
});
test('la cible d’une surcharge conserve son variant et son instance porteuse',()=>{
 const d=documentValide();d.oracle.attendus=[{code:'C24',cibles:['variant','texte','peint']}];
 const c={code:'C24',type:'corriger',variants:['variant'],layers:['texte'],faits:{surcharge:'peint'}};
 assert.equal(comparerConstats(d,[c]).conformes,true);
});
test('le garde refuse une valeur de carte inventée et des scopes omis',()=>{
 const d=documentValide();d.oracle.couleurs.fond.m={r:1,g:0,b:0,a:1};delete d.oracle.scopes.taille;
 assert.ok(codes(d).includes('valeur-incoherente'));assert.ok(codes(d).includes('scope-sans-carte'));
});
test('le garde compare le propriétaire et les rôles à la spec de conception',()=>{
 const d=documentValide();d.oracle.calques.texte.proprietaire='Autre';d.oracle.axes.State='palette';
 assert.ok(codes(d).includes('proprietaire-incoherent'));assert.ok(codes(d).includes('axes-incoherents'));
});
test('le garde compare les valeurs de variante à leur définition réelle',()=>{
 const d=documentValide();d.noeuds[2].props.componentPropertyDefinitions.State.variantOptions=['Autre'];
 assert.ok(codes(d).includes('axe-source-incoherent'));
});
test('le garde refuse un alias cyclique même si la carte en cache la valeur',()=>{
 const d=documentValide();d.variables[0].valuesByMode.m=alias('fond');
 assert.ok(codes(d).includes('resolution-impossible'));
});
test('la résolution du paint utilise le mode local du consommateur',()=>{
 const d=documentValide();d.collections[0].modes.push({modeId:'dark',name:'Dark'});
 const rouge={r:0.75,g:0.1,b:0.2,a:1};
 d.variables[0].valuesByMode.dark=rouge;d.variables[1].valuesByMode.dark=14;
 d.oracle.couleurs.fond.dark=rouge;d.oracle.couleurs.taille.dark=14;
 d.noeuds[3].props.explicitVariableModes={c:'dark'};d.noeuds[3].props.fills[0].color=rouge;
 assert.deepEqual(verifierDocument(d),[]);
 d.noeuds[3].props.fills[0].color=bleu;
 assert.ok(codes(d).includes('paint-incoherent'));
});
test('un nom de variant est résolu dans le jeu sélectionné avant les maîtres',()=>{
 const d=documentValide();d.oracle.infos=[{code:'C53',cibles:['variant']}];
 d.noeuds.push({id:'autre',type:'COMPONENT',name:'State=Default',parent:'page',children:[],props:{}});
 const r=comparerConstats(d,[{code:'C53',type:'info',variants:['State=Default'],layers:[],faits:{}}]);
 assert.equal(r.conformes,true);
});
test('le garde refuse deux ressources qui partagent une clé technique',()=>{
 const d=documentValide();d.variables[1].key=d.variables[0].key;
 assert.ok(codes(d).includes('cle-ressource-invalide'));
});
test('le garde refuse une valeur littérale du mauvais type même si la carte la recopie',()=>{
 const d=documentValide();d.variables[1].valuesByMode.m='14';d.oracle.couleurs.taille.m='14';
 assert.ok(codes(d).includes('type-variable-incoherent'));
});
test('le garde refuse un alias dont le type résolu contredit le type annoncé',()=>{
 const d=documentValide();d.variables[1].valuesByMode.m=alias('fond');d.oracle.couleurs.taille.m=bleu;
 assert.ok(codes(d).includes('type-variable-incoherent'));
});
test('le garde refuse une attente de constat qui cite un calque retiré',()=>{
 const d=documentValide();d.oracle.infos=[{code:'C67',cibles:['icone-retiree','variant']}];
 assert.ok(codes(d).includes('constat-cible-absente'));
});
