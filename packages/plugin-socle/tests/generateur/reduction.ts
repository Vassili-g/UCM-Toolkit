import type {DocumentGenere} from './types';
import {copie,dresserCarte,actualiserInventaires} from './modele';
import {verifierDocument} from './oracle';
import type {Analyseur} from './double';
import {attendusDeStructure,informationsPrevues} from './generateur';

const criteres=(c:any)=>Object.fromEntries(Object.entries(c.faits??{}).filter(([k])=>['champ','indice','plageDebut','plageFin','motif','genre','role','attendu','cause','nature'].includes(k)||(['C30','C42'].includes(c.code)&&['titre','message'].includes(k))).map(([k,v])=>[k,typeof v==='string'&&k==='titre'?v.replace(/«[^»]*»/g,''):v]));
export const signatureEcart=(c:any)=>JSON.stringify([c.code,c.type,criteres(c)]);
const cibles=(c:any):string[]=>[...(c.layers??[]),...(typeof c.faits?.surcharge==='string'?[c.faits.surcharge]:[])];
const clesDeCandidats=(c:any):string[]=>(c.question?.candidats??[]).map((x:any)=>String(x.cle)).sort();
/**
 * Le même écart que le témoin : même signature, mêmes clés de candidats, et chaque calque visé l'était déjà. Un autre constat de même
 * code sur un autre calque, ou qui propose d'autres variables, n'en est pas un.
 */
export const memeEcart=(c:any,temoin:any)=>{
 if(signatureEcart(c)!==signatureEcart(temoin)||JSON.stringify(clesDeCandidats(c))!==JSON.stringify(clesDeCandidats(temoin)))return false;
 const voulues=cibles(temoin),lues=cibles(c);
 return voulues.length===0?lues.length===0:lues.length>0&&lues.every(x=>voulues.includes(x));
};
const compter=(d:DocumentGenere)=>({calques:d.noeuds.length,variants:d.noeuds.filter(n=>n.parent===d.selection[0]&&n.type==='COMPONENT').length,variables:d.variables.length,styles:d.styles.length});
export function retirerNoeuds(d:DocumentGenere,ids:Set<string>){
 let change=true;while(change){change=false;for(const n of d.noeuds)if(n.parent&&ids.has(n.parent)&&!ids.has(n.id)){ids.add(n.id);change=true;}}
 d.noeuds=d.noeuds.filter(n=>!ids.has(n.id));for(const n of d.noeuds){n.children=n.children.filter(id=>!ids.has(id));if(ids.has(n.props.defaultVariant))n.props.defaultVariant=n.children[0];}
 d.oracle.infos=informationsPrevues(d);d.oracle.attendus=[...d.oracle.attendus.filter(a=>a.code!=='C83'&&!(a.code==='C42'&&a.faits?.geste==='non-exportes')),...attendusDeStructure(d)];
}
function nettoyer(d:DocumentGenere){
 const utilisees=new Set<string>();const lire=(x:any)=>{if(!x||typeof x!=='object')return;if(x.type==='VARIABLE_ALIAS')utilisees.add(x.id);for(const y of Object.values(x))lire(y);};
 const styles=new Set(d.noeuds.flatMap(n=>[n.props.textStyleId,n.props.fillStyleId,n.props.strokeStyleId,...(n.props.segments??[]).map((s:any)=>s.textStyleId)]).filter(Boolean));
 d.styles=d.styles.filter(s=>styles.has(s.id));for(const n of d.noeuds)lire(n.props);for(const s of d.styles)lire(s.props);
 let change=true;while(change){const n=utilisees.size;for(const v of d.variables)if(utilisees.has(v.id))lire(v.valuesByMode);change=n!==utilisees.size;}
 d.variables=d.variables.filter(v=>utilisees.has(v.id));actualiserInventaires(d);d.oracle=dresserCarte(d,d.oracle.attendus,d.oracle.infos);
}
/**
 * La réduction, quel que soit le jugement : retire calques, sous-arbres et variables un à un tant que `juger` garde le candidat. Le
 * garde du document (`verifierDocument` par défaut) passe avant : un candidat incohérent ne se juge pas. `reduire` juge par l'analyse d'Architect,
 * `reductionDuBanc.ts` par la comparaison du banc.
 */
export async function reduireSelon(document:DocumentGenere,juger:(candidat:DocumentGenere)=>Promise<boolean>,garde:(candidat:DocumentGenere)=>readonly unknown[]=verifierDocument){
 let courant=copie(document),essais=0,refus=0,analyses=0,passes=0;
 const taillesAvant=compter(courant);
 const conserver=async(candidat:DocumentGenere)=>{
  essais++;try{actualiserInventaires(candidat);candidat.oracle=dresserCarte(candidat,candidat.oracle.attendus,candidat.oracle.infos);}catch{refus++;return false;}
  if(garde(candidat).length){refus++;return false;}
  analyses++;return juger(candidat);
 };
 let propre=copie(courant);nettoyer(propre);if(await conserver(propre))courant=propre;
 let change=true;
 while(change){
  passes++;change=false;
  for(const node of [...courant.noeuds].reverse()){
   if(node.type==='DOCUMENT'||node.type==='PAGE'||courant.selection.includes(node.id))continue;
   const c=copie(courant);retirerNoeuds(c,new Set([node.id]));
   if(await conserver(c)){courant=c;change=true;}
  }
  for(const variable of [...courant.variables]){
   const c=copie(courant);c.variables=c.variables.filter(v=>v.id!==variable.id);
   if(await conserver(c)){courant=c;change=true;}
  }
 }
 propre=copie(courant);nettoyer(propre);if(await conserver(propre))courant=propre;
 return {document:courant,avant:taillesAvant,apres:compter(courant),essais,refus,analyses,passes};
}
/** `analyserDocument` est la fonction de jugement du plugin : la réduction relit l'analyse sans la connaître. */
export async function reduire(document:DocumentGenere,temoin:any,analyserDocument:Analyseur){
 const r=await reduireSelon(document,async candidat=>{const a=await analyserDocument(candidat);return a.statut!=='arretee'&&a.constats.some((c:any)=>memeEcart(c,temoin));});
 return {document:r.document,signature:signatureEcart(temoin),avant:r.avant,apres:r.apres,essais:r.essais,refus:r.refus,analyses:r.analyses,passes:r.passes,minimum:'aucune suppression individuelle de calque, sous-arbre, variant ou variable ne conserve cette signature avec un document accepté par le garde'};
}
