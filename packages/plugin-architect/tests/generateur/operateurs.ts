import type {DocumentGenere,Attendu,Noeud} from './types';
import {reglages} from './generateur';
import {copie,dresserCarte,relier,actualiserInventaires,alias} from './modele';
import {mulberry32,melanger,choisir} from '../../../kit/tests/stress/commun/prng';
import {CIBLES} from '../../../kit/tests/stress/f3-composant/operateursAxes';

export const DEFAUTS=['U1-fill-nu','R1-role','K1-autre-composant','S1-scope','Z1-padding-nu'] as const;
export const TRANSFORMATIONS=['ordre-variables','ordre-variants','identifiants','nom-libre','cadre-neutre'] as const;
export const ABSTENTIONS=['variable-refusee','collection-refusee','paint-refuse'] as const;
const variantes=(d:DocumentGenere)=>d.noeuds.filter(n=>n.type==='COMPONENT'&&n.parent===d.selection[0]);
const etatsAvant=new WeakMap<DocumentGenere,DocumentGenere>();
export function restaurer(document:DocumentGenere):DocumentGenere{const avant=etatsAvant.get(document);if(!avant)throw new Error('Aucun inverse conservé pour cet opérateur.');return copie(avant);}
function groupesDeTextes(d:DocumentGenere,code:string,type:string,faits:Record<string,string|number>,seulVariant?:string){
 const groupes=new Map<string,Attendu>();
 for(const n of d.noeuds.filter(n=>n.type==='TEXT'&&n.props.segments)){
  let v=n;while(v.parent&&v.parent!==d.selection[0])v=d.noeuds.find(x=>x.id===v.parent)!;if(v.parent!==d.selection[0]||(seulVariant&&v.id!==seulVariant))continue;
  const a=groupes.get(n.name)??{code,type,cibles:[],faits};a.cibles.push(n.id,v.id);groupes.set(n.name,a);
 }
 return [...groupes.values()];
}
/**
 * Le tracé d'une icône de bibliothèque se lit sous la frontière de son instance (D31) : C49 le mesure comme un texte, sur le fond que
 * les ancêtres de l'hôte peignent. Un constat par nom de tracé, qui nomme chaque tracé et le variant qui le porte.
 */
function groupesDIcones(d:DocumentGenere,code:string,type:string,faits:Record<string,string|number>,seulVariant?:string){
 const groupes=new Map<string,Attendu>();
 for(const n of d.noeuds.filter(n=>n.type==='VECTOR'&&d.spec.roles?.[n.parent??'']==='icone')){
  let v=n;while(v.parent&&v.parent!==d.selection[0])v=d.noeuds.find(x=>x.id===v.parent)!;if(v.parent!==d.selection[0]||(seulVariant&&v.id!==seulVariant))continue;
  const a=groupes.get(n.name)??{code,type,cibles:[],faits};a.cibles.push(n.id,v.id);groupes.set(n.name,a);
 }
 return [...groupes.values()];
}
/**
 * C59 : un texte ou une icône lié au foreground du dossier `surface` du thème attend une surface posée dessous. Quand le défaut injecté
 * ôte la liaison de fond du variant (U1) ou la remplace par un foreground (R1), chacun de ses calques liés au foreground reçoit une
 * question sans candidat.
 */
/** Un constat par nom d'anneau (un `Ring` à contour), qui nomme chaque anneau et le variant qui le porte. */
/** Un anneau au-dessus d'une image de son cadre : C50 le dit en limite « image », jamais en mode illisible. */
const sousUneImage=(d:DocumentGenere,anneau:Noeud)=>{const parent=d.noeuds.find(n=>n.id===anneau.parent);return !!parent&&parent.children.slice(0,parent.children.indexOf(anneau.id)).some(id=>d.noeuds.find(n=>n.id===id)?.props.fills?.some((p:any)=>p.type==='IMAGE'));};
function groupesDAnneaux(d:DocumentGenere,code:string,type:string,faits:Record<string,string|number>){
 const groupes=new Map<string,Attendu>();
 for(const n of d.noeuds.filter(n=>n.type==='RECTANGLE'&&n.name==='Ring'&&n.props.strokes?.length&&!sousUneImage(d,n))){
  let v=n;while(v.parent&&v.parent!==d.selection[0])v=d.noeuds.find(x=>x.id===v.parent)!;if(v.parent!==d.selection[0])continue;
  const a=groupes.get(n.name)??{code,type,cibles:[],faits};a.cibles.push(n.id,v.id);groupes.set(n.name,a);
 }
 return [...groupes.values()];
}
/** C81 : un layer délié dans un variant que le variant copié garde lié se dit « lié ailleurs, en dur ici » (propagation). La racine d'un variant n'est pas un layer. */
function liaisonsDesAutresVariants(d:DocumentGenere,cible:Noeud):Attendu[]{
 if(cible.type==='COMPONENT')return [];
 const attendus:Attendu[]=[];
 for(const copie of d.noeuds.filter(n=>n.type==='COMPONENT'&&n.parent===d.selection[0]&&n.id.endsWith('-bis'))){
  const layer=d.noeuds.find(n=>n.id===cible.id+'-bis');
  if(layer&&layer.props.fills?.some((p:any)=>p.boundVariables?.color?.id))attendus.push({code:'C81',type:'corriger',cibles:[copie.id,layer.id],faits:{modele:copie.id}});
 }
 return attendus;
}
function surfacesManquantes(d:DocumentGenere,variant:string,support:Noeud):Attendu[]{
 if(support.props.fills.some((p:any)=>p.boundVariables?.color?.id?.endsWith(':background')))return [];
 if(d.variables.find(v=>v.id==='theme-texte')?.name.split('/')[1]!=='surface')return [];
 const dans=(id:string):boolean=>{let n=d.noeuds.find(x=>x.id===id);while(n){if(n.id===variant)return true;n=n.parent?d.noeuds.find(x=>x.id===n!.parent):undefined;}return false;};
 const attendus:Attendu[]=[];
 for(const n of d.noeuds.filter(x=>dans(x.id)&&x.id!==variant)){
  const lie=(n.props.fills??[]).some((p:any)=>p.boundVariables?.color?.id?.endsWith(':foreground'));
  if(!lie)continue;
  const parent=d.noeuds.find(x=>x.id===n.parent);
  const surcharge=parent?.type==='INSTANCE'&&n.id.startsWith('I');
  attendus.push({code:'C59',type:'corriger',cibles:surcharge?[variant,parent!.id,n.id]:[variant,n.id],faits:{champ:'fills'},candidats:[]});
 }
 return attendus;
}
export function injecter(base:DocumentGenere,operation:string):DocumentGenere{
 const d=copie(base),root=variantes(d)[0];d.famille='defaut';d.operation=operation;
 const target=root.props.fills?.length?root:d.noeuds.find(n=>n.props.fills?.some((p:any)=>p.boundVariables?.color?.id===d.spec.nom+':background'))!;
 // Deux fills liés à deux variables donnent C42 « l'ordre n'est pas exporté » : question G8 du plan, au mainteneur. R1 et K1 changent la
 // variable d'un seul fill ; le défaut injecté ne garde donc qu'un fill, pour ne pas fabriquer cette limite d'export.
 if(!reglages.ecartsConnus&&['R1-role','K1-autre-composant'].includes(operation)&&target.props.fills.length>1){target.props.fills.length=1;delete target.props.fillStyleId;}
 const cible=(n:Noeud)=>{let p=n;while(p.parent&&p.parent!==d.selection[0])p=d.noeuds.find(x=>x.id===p.parent)!;return [...new Set([p.id,n.id])];};
 const attendus:Attendu[]=copie(base.oracle.attendus);
 if(operation==='U1-fill-nu'){
  delete target.props.fills[0].boundVariables;delete target.props.fillStyleId;attendus.push({code:'C25',type:'corriger',cibles:cible(target),faits:{champ:'fills',indice:0}},...surfacesManquantes(d,root.id,target),...liaisonsDesAutresVariants(d,target));
 }else if(operation==='R1-role'){
  const role=target.type==='RECTANGLE'?'border':'foreground';
  let v=d.variables.find(v=>v.id===d.spec.nom+':'+role);if(!v){v=copie(d.variables.find(v=>v.id===d.spec.nom+':background')!);v.id='role-injecte';v.key='cle-role-injecte';v.name=v.name.replace(/background$/,role);v.scopes=['FRAME_FILL','SHAPE_FILL'];d.variables.push(v);}
  delete target.props.fillStyleId;relier(d,target,'fills',v.id);attendus.push({code:'C24',type:'corriger',cibles:cible(target),faits:{champ:'fills',role,attendu:CIBLES.fond.role}},...(target.type==='RECTANGLE'?[]:surfacesManquantes(d,root.id,target)));
 }else if(operation==='K1-autre-composant'){
  const v=copie(d.variables.find(v=>v.id===d.spec.nom+':background')!);v.id='etranger';v.key='cle-etranger';v.name=v.name.replace(d.spec.nom+'/','AutreComposant/');d.variables.push(v);delete target.props.fillStyleId;relier(d,target,'fills',v.id);
  attendus.push({code:'C19',type:'corriger',cibles:cible(target)});
 }else if(operation==='S1-scope'){
  const v=d.variables.find(v=>v.id===d.spec.nom+':background')!;v.scopes=['TEXT_FILL'];
  for(const l of d.oracle.liaisons.filter(l=>l.variable===v.id&&l.champ==='fills'&&!l.plage)){
   const n=d.noeuds.find(n=>n.id===l.noeud)!;if(n.type==='TEXT')continue;
   attendus.push({code:'C18',type:'verifier',cibles:cible(n),faits:{champ:'fills',portee:['RECTANGLE','ELLIPSE','VECTOR'].includes(n.type)?'SHAPE_FILL':'FRAME_FILL'}});
  }
 }else if(operation==='Z1-padding-nu'){
  delete root.props.boundVariables.paddingLeft;attendus.push({code:'C29',type:'corriger',cibles:[root.id],faits:{champ:'paddingLeft',valeur:root.props.paddingLeft}});
 }else throw new Error(operation);
 // U1 reprend le geste « délier la peinture » de F3, R1 sa cible et son rôle attendu (`CIBLES`).
 actualiserInventaires(d);d.oracle=dresserCarte(d,attendus,d.oracle.infos);
 if(operation==='R1-role'&&target.type!=='RECTANGLE'&&d.variables.some(v=>v.id===base.spec.nom+':foreground'))attendus.push(...groupesDeTextes(d,'C49','corriger',{usage:'texte',champ:'fills',rapport:1,seuil:4.5},root.id),...groupesDIcones(d,'C49','corriger',{usage:'icone',champ:'fills',rapport:1,seuil:4.5},root.id));
 const lies=new Set(d.oracle.liaisons.map(l=>l.variable));
 if(d.variables.some(v=>v.resolvedType==='COLOR'&&v.name.startsWith(d.spec.nom+'/')&&lies.has(v.id)))for(const v of base.variables.filter(v=>v.resolvedType==='COLOR'&&v.name.startsWith(base.spec.nom+'/')))if(!lies.has(v.id))attendus.push({code:'C32',type:'verifier',cibles:[],faits:{token:v.name,motif:'inutilise'}});
 d.oracle.attendus=copie(attendus);etatsAvant.set(d,copie(base));return d;
}
export function transformer(base:DocumentGenere,operation:string,graine:number):DocumentGenere{
 const d=copie(base),tirer=mulberry32(graine);d.famille='transformation';d.operation=operation;
 if(operation==='ordre-variables')d.variables=melanger(tirer,d.variables);
 else if(operation==='ordre-variants'){
  // Dans Figma, le variant par défaut est le premier du jeu : l'ordre inversé change aussi `defaultVariant`, jamais l'un sans l'autre.
  const set=d.noeuds.find(n=>n.id===d.selection[0])!;set.children=[...set.children].reverse();set.props.defaultVariant=set.children[0];
 }else if(operation==='nom-libre'){
  const n=d.noeuds.find(n=>n.type==='FRAME'&&n.parent==='v')??d.noeuds.find(n=>n.type==='TEXT'&&n.parent==='v');
  if(n)n.name='Contenu '+graine;else d.operation='nom-libre-sans-cible';
 }else if(operation==='cadre-neutre'){
  // Chaque variant reçoit son cadre : une structure qui diffère d'un variant à l'autre n'est plus une transformation neutre.
  for(const root of variantes(d)){
   const enfants=[...root.children];const id='cadre-neutre'+(root.id==='v'?'':'-'+root.id);
   const frame:Noeud={id,type:'FRAME',name:'Enveloppe neutre',parent:root.id,children:enfants,props:{...copie(root.props),layoutMode:'HORIZONTAL',layoutSizingHorizontal:'HUG',layoutSizingVertical:'HUG',primaryAxisSizingMode:'AUTO',counterAxisSizingMode:'AUTO',itemSpacing:0,paddingLeft:0,paddingRight:0,paddingTop:0,paddingBottom:0,fills:[],strokes:[],boundVariables:{},cornerRadius:0}};
   delete frame.props.variantProperties;delete frame.props.componentPropertyDefinitions;
   delete frame.props.fillStyleId;delete frame.props.textStyleId;
   for(const child of enfants)d.noeuds.find(n=>n.id===child)!.parent=id;root.children=[id];d.noeuds.push(frame);
  }
 }else if(operation==='identifiants'){
  const ids=[...d.noeuds.map(n=>n.id),...d.variables.map(v=>v.id),...d.collections.map(c=>c.id),...d.styles.map(s=>s.id),...d.collections.flatMap(c=>c.modes.map(m=>m.modeId))];
  const noms=new Map(ids.map((id,i)=>[id,'x'+graine+'-'+i]));
  for(const n of d.noeuds){const p=d.noeuds.find(p=>p.id===n.parent);if(p?.type==='INSTANCE'&&p.main&&n.id.includes(';')){const source=d.noeuds.find(x=>x.id===p.main);const homologue=source?.children[p.children.indexOf(n.id)];if(homologue)noms.set(n.id,'I'+noms.get(p.id)+';'+noms.get(homologue));}}
  const dictionnaires=new Set(['resolvedVariableModes','explicitVariableModes','valuesByMode','proprietaires','origines','roles','calques','couleurs','scopes']);
  const changer=(v:any,champ=''):any=>typeof v==='string'?(noms.get(v)??v):Array.isArray(v)?v.map(x=>changer(x)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[dictionnaires.has(champ)?noms.get(k)??k:k,changer(x,k)])):v;
  const spec=d.spec;const remplace=changer(d) as DocumentGenere;Object.assign(d,remplace);d.spec=changer(spec);d.spec.idsCanoniques=Object.fromEntries([...noms].map(([a,b])=>[b,a]));
 }else throw new Error(operation);
 actualiserInventaires(d);d.oracle=dresserCarte(d,d.oracle.attendus,d.oracle.infos);return d;
}
export function rendreIllisible(base:DocumentGenere,operation:string):DocumentGenere{
 const d=copie(base),root=variantes(d)[0];d.famille='abstention';d.operation=operation;
 if(operation==='variable-refusee')d.refus={variables:[d.spec.nom+':background']};
 else if(operation==='collection-refusee')d.refus={collections:['t']};
 else if(operation==='paint-refuse')d.refus={lectures:[{noeud:root.id,champ:'fills'}]};
 else throw new Error(operation);
 if(operation==='paint-refuse'){d.oracle.attendus=[{code:'C42',type:'bloquant',cibles:[],faits:{message:'Lecture refusée '+root.id+'.fills'}}];d.oracle.infos=[];}
 if(operation==='collection-refusee'||operation==='variable-refusee')d.oracle.infos.push(...groupesDeTextes(d,'C49','info',{cause:'mode-illisible',champ:'fills',usage:'texte'}),...groupesDIcones(d,'C49','info',{cause:'mode-illisible',champ:'fills',usage:'icone'}));
 if(operation==='collection-refusee'||operation==='variable-refusee')d.oracle.infos.push(...groupesDAnneaux(d,'C50','info',{cause:'mode-illisible',champ:'strokes',usage:'anneau'}));
 return d;
}
export function signatureConstats(doc:DocumentGenere,constats:any[]):string{
 const ids=doc.spec.idsCanoniques??{};
 const id=(s:string)=>ids[s]??s;
 const nodes=new Map(doc.noeuds.map(n=>[n.name,n.id]));
 const cible=(x:any)=>x?{...x,layer:x.layer?id(x.layer):undefined}:undefined;
 return JSON.stringify(constats.map(c=>({code:c.code,type:c.type,cibles:[...new Set([...(c.variants??[]).map((x:string)=>id(nodes.get(x)??x)),...(c.layers??[]).map(id),...(c.faits?.surcharge?[id(c.faits.surcharge)]:[])])].sort(),faits:Object.fromEntries(Object.entries(c.faits??{}).filter(([k])=>['champ','indice','plageDebut','plageFin','motif','genre','role','attendu','cause','portee','valeur'].includes(k))),candidats:(c.question?.candidats??[]).map((x:any)=>({nom:x.nom,cle:x.cle? id(x.cle):undefined,valeur:x.valeur})).sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),proposition:c.correction?{cle:c.correction.apres.cle,nom:c.correction.apres.nom,cible:cible(c.correction.cible)}:undefined})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
