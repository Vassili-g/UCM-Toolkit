import type {Attendu,CarteOracle,DocumentGenere,LiaisonOracle,Noeud,Variable} from './types';

export const alias=(id:string)=>({type:'VARIABLE_ALIAS',id});
export const copie=<T>(x:T):T=>structuredClone(x);
export function valeur(doc:DocumentGenere,id:string,modes:Record<string,string>={},vus=new Set<string>()):any {
 if(vus.has(id))throw new Error('cycle '+id);
 const v=doc.variables.find(v=>v.id===id);if(!v)throw new Error('variable absente '+id);
 const c=doc.collections.find(c=>c.id===v.variableCollectionId);if(!c)throw new Error('collection absente '+id);
 const mode=modes[c.id]??c.defaultModeId,entree=v.valuesByMode[mode];
 if(entree?.type==='VARIABLE_ALIAS')return valeur(doc,entree.id,modes,new Set([...vus,id]));
 return copie(entree);
}
export function modesDuNoeud(doc:DocumentGenere,n:Noeud):Record<string,string>{
 const chaine:Noeud[]=[];let x:Noeud|undefined=n;const vus=new Set<string>();
 while(x&&!vus.has(x.id)){vus.add(x.id);chaine.unshift(x);x=doc.noeuds.find(n=>n.id===x?.parent);}
 return Object.assign({},...chaine.map(n=>n.props.resolvedVariableModes??{}),...chaine.map(n=>n.props.explicitVariableModes??{}));
}
export function actualiserInventaires(doc:DocumentGenere){
 for(const c of doc.collections)c.variableIds=doc.variables.filter(v=>v.variableCollectionId===c.id).map(v=>v.id);
}
export function dresserCarte(doc:DocumentGenere,attendus:Attendu[]=doc.oracle?.attendus??[],infos:Attendu[]=doc.oracle?.infos??[]):CarteOracle{
 const carte:CarteOracle={couleurs:{},scopes:{},calques:{},liaisons:[],axes:Object.fromEntries(doc.spec.axes.map(a=>[a.nom,a.role])),attendus:copie(attendus),infos:copie(infos)};
 for(const v of doc.variables){
  const c=doc.collections.find(c=>c.id===v.variableCollectionId)!;carte.scopes[v.id]=[...v.scopes];carte.couleurs[v.id]={};
  for(const mode of c.modes)carte.couleurs[v.id][mode.modeId]=valeur(doc,v.id,{[c.id]:mode.modeId});
 }
 const parId=new Map(doc.noeuds.map(n=>[n.id,n]));
 for(const n of doc.noeuds){
  let x:Noeud|undefined=n;const noms:string[]=[];const vus=new Set<string>();
  while(x&&!vus.has(x.id)){vus.add(x.id);noms.unshift(x.name);if(x.type==='COMPONENT'&&x.parent===doc.selection[0])break;x=x.parent?parId.get(x.parent):undefined;}
  const freres=n.parent?parId.get(n.parent)?.children??[]:doc.noeuds.filter(x=>x.parent===null).map(x=>x.id);
  const rang=freres.slice(0,freres.indexOf(n.id)).filter(id=>parId.get(id)?.name===n.name).length;
  const proprietaire=doc.spec.proprietaires?.[n.id]??doc.spec.nom;
  carte.calques[n.id]={chemin:noms,rang,proprietaire};
  const ajouter=(champ:string,id:string,indice?:number,plage?:{debut:number;fin:number},origine:LiaisonOracle['origine']='propre')=>{
   carte.liaisons.push({noeud:n.id,champ,variable:id,...(indice===undefined?{}:{indice}),...(plage?{plage}:{}),proprietaire,origine,role:doc.variables.find(v=>v.id===id)?.name.split('/').at(-1)});
  };
  for(const [champ,a] of Object.entries(n.props.boundVariables??{}))if((a as any)?.type==='VARIABLE_ALIAS'){
   const style=doc.styles.find(s=>s.id===n.props.textStyleId);
   ajouter(champ,(a as any).id,undefined,undefined,style?.props.boundVariables?.[champ]?.id===(a as any).id?'style':doc.spec.origines?.[n.id]??'propre');
  }
  for(const champ of ['fills','strokes'])for(const [i,p]of (n.props[champ]??[]).entries())if(p.boundVariables?.color?.id)ajouter(champ,p.boundVariables.color.id,i,undefined,n.props.fillStyleId?'style':doc.spec.origines?.[n.id]??'propre');
  for(const p of n.props.segments??[]){
   const plage={debut:p.start,fin:p.end};
   for(const [champ,a]of Object.entries(p.boundVariables??{}))if((a as any)?.type==='VARIABLE_ALIAS')ajouter(champ,(a as any).id,undefined,plage,doc.styles.some(s=>s.id===p.textStyleId&&s.props.boundVariables?.[champ]?.id===(a as any).id)?'style':'propre');
   for(const [i,paint]of (p.fills??[]).entries())if(paint.boundVariables?.color?.id)ajouter('fills',paint.boundVariables.color.id,i,plage);
  }
 }
 return carte;
}
export function relier(doc:DocumentGenere,n:Noeud,champ:string,id:string,indice=0){
 if(champ==='fills'||champ==='strokes'){
  const couleur=valeur(doc,id,modesDuNoeud(doc,n));
  n.props[champ][indice].boundVariables={color:alias(id)};n.props[champ][indice].color={r:couleur.r,g:couleur.g,b:couleur.b};n.props[champ][indice].opacity=couleur.a??1;
  if(n.type==='TEXT')for(const p of n.props.segments??[]){p.fills=copie(n.props.fills);}
 }else n.props.boundVariables[champ]=alias(id);
 doc.oracle=dresserCarte(doc);
}
export function referenceVariable(doc:DocumentGenere,id:string):Variable {const v=doc.variables.find(v=>v.id===id);if(!v)throw new Error(id);return v;}
