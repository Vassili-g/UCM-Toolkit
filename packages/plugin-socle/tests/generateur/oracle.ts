import type { Attendu, DocumentGenere, LiaisonOracle, Noeud, RefusOracle } from './types';

type Objet = Record<string, any>;
const objet = (v: unknown): v is Objet => !!v && typeof v === 'object' && !Array.isArray(v);
const aliasId = (v: unknown): string | undefined => objet(v) && v.type === 'VARIABLE_ALIAS' && typeof v.id === 'string' ? v.id : undefined;
const unique = (ids: string[]) => [...new Set(ids)].sort();

/** Cette égalité compare les données attendues, sans les tolérances des contrôles exercés. */
function egales(a: any, b: any): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-7;
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => egales(v, b[i]));
  if (objet(a) && objet(b)) {
    const ka = Object.keys(a).filter(k => a[k] !== undefined).sort();
    const kb = Object.keys(b).filter(k => b[k] !== undefined).sort();
    return egales(ka, kb) && ka.every(k => egales(a[k], b[k]));
  }
  return false;
}

export function resoudreVariable(doc: DocumentGenere, id: string, modes: Record<string, string> = {}): any {
  const variables = new Map(doc.variables.map(v => [v.id, v]));
  const collections = new Map(doc.collections.map(c => [c.id, c]));
  const visites = new Set<string>();
  function lire(cle: string): any {
    const variable = variables.get(cle);
    if (!variable) throw new Error(`Variable absente ${cle}`);
    const collection = collections.get(variable.variableCollectionId);
    if (!collection) throw new Error(`Collection absente ${variable.variableCollectionId}`);
    const mode = modes[collection.id] ?? modes[collection.name] ?? collection.defaultModeId;
    if (!collection.modes.some(m => m.modeId === mode)) throw new Error(`Mode inconnu ${collection.id}/${mode}`);
    const pas = cle + '\0' + mode;
    if (visites.has(pas)) throw new Error(`Cycle d’alias ${cle}/${mode}`);
    if (!Object.prototype.hasOwnProperty.call(variable.valuesByMode, mode)) throw new Error(`Valeur absente ${cle}/${mode}`);
    visites.add(pas);
    const brute = variable.valuesByMode[mode];
    const alias = aliasId(brute);
    const valeur = alias ? lire(alias) : brute;
    visites.delete(pas);
    return valeur;
  }
  return lire(id);
}

function ancetres(doc: DocumentGenere, id: string): Noeud[] {
  const nodes = new Map(doc.noeuds.map(n => [n.id, n]));
  const vus = new Set<string>();
  const chaine: Noeud[] = [];
  let node = nodes.get(id);
  while (node && !vus.has(node.id)) {
    vus.add(node.id); chaine.push(node); node = node.parent ? nodes.get(node.parent) : undefined;
  }
  return chaine.reverse();
}

export function cheminEtRang(doc: DocumentGenere, id: string): { chemin: string[]; rang: number } {
  const chaine = ancetres(doc, id);
  const selected = new Set(doc.selection);
  const jeu = chaine.findIndex(n => n.type === 'COMPONENT_SET' && selected.has(n.id));
  let debut = 0;
  if (jeu >= 0 && chaine[jeu + 1]?.type === 'COMPONENT') debut = jeu + 1;
  else {
    const racine = chaine.findIndex(n => n.type === 'COMPONENT' && selected.has(n.id));
    if (racine >= 0) debut = racine;
  }
  const node = chaine.at(-1);
  const parent = chaine.at(-2);
  const parId = new Map(doc.noeuds.map(n => [n.id, n]));
  const homonymes = parent?.children.filter(s => parId.get(s)?.name === node?.name) ?? [];
  return { chemin: chaine.slice(debut).map(n => n.name), rang: Math.max(0, node ? homonymes.indexOf(node.id) : 0) };
}

function modesDuNoeud(doc: DocumentGenere, id: string): Record<string, string> {
  const modes: Record<string, string> = {};
  for (const n of ancetres(doc, id)) Object.assign(modes, n.props.resolvedVariableModes ?? {}, n.props.explicitVariableModes ?? {});
  return modes;
}

interface LiaisonTrouvee { noeud: string; champ: string; variable: string; indice?: number; plage?: { debut: number; fin: number }; peinture?: Objet; style?: string; }
const cleLiaison = (l: Pick<LiaisonOracle, 'noeud'|'champ'|'indice'|'plage'>) => JSON.stringify([l.noeud,l.champ,l.indice??null,l.plage?.debut??null,l.plage?.fin??null]);

function peintures(noeud: string, champ: string, liste: any, plage?: { debut: number; fin: number }, style?: string): LiaisonTrouvee[] {
  if (!Array.isArray(liste)) return [];
  const trouvees: LiaisonTrouvee[] = [];
  liste.forEach((p, indice) => {
    if (!objet(p)) return;
    const id = aliasId(p.boundVariables?.color);
    if (id) trouvees.push({ noeud, champ, variable:id, indice, ...(plage ? {plage}:{}), peinture:p, ...(style ? {style}:{}) });
    if (Array.isArray(p.gradientStops)) p.gradientStops.forEach((stop: Objet, rang: number) => {
      const variable = aliasId(stop.boundVariables?.color);
      if (variable) trouvees.push({noeud,champ:`${champ}.gradientStops[${rang}].color`,variable,indice,...(plage?{plage}:{}),peinture:{...p,color:stop.color},...(style?{style}:{})});
    });
  });
  return trouvees;
}

function directes(node: Noeud, props = node.props, plage?: {debut:number;fin:number}): LiaisonTrouvee[] {
  const ls: LiaisonTrouvee[] = [];
  for (const [champ, value] of Object.entries(props.boundVariables ?? {})) {
    const id = aliasId(value);
    if (id) ls.push({noeud:node.id,champ,variable:id,...(plage?{plage}:{})});
    if (Array.isArray(value)) value.forEach((a,indice) => {const variable=aliasId(a); if(variable)ls.push({noeud:node.id,champ,variable,indice,...(plage?{plage}:{})});});
  }
  ls.push(...peintures(node.id,'fills',props.fills,plage),...peintures(node.id,'strokes',props.strokes,plage));
  return ls;
}

function liaisonsDuDocument(doc: DocumentGenere): LiaisonTrouvee[] {
  const all: LiaisonTrouvee[] = [];
  const styles = new Map(doc.styles.map(s=>[s.id,s]));
  for (const node of doc.noeuds) {
    const propres = directes(node);
    const style = styles.get(node.props.textStyleId);
    if (style) for (const liaison of directes(node, style.props)) {
      const existante = propres.find(l=>cleLiaison(l)===cleLiaison(liaison));
      if (!existante) propres.push({...liaison,style:style.id});
      else if (existante.variable===liaison.variable) existante.style=style.id;
    }
    for (const [champ, sid] of [['fills',node.props.fillStyleId],['strokes',node.props.strokeStyleId]] as const) {
      const s = styles.get(sid);
      if (!s) continue;
      for (const l of peintures(node.id,champ,s.props.paints,undefined,s.id)) {
        const p = propres.find(x=>cleLiaison(x)===cleLiaison(l));
        if (!p) propres.push(l); else if(p.variable===l.variable)p.style=s.id;
      }
    }
    all.push(...propres);
    for (const segment of node.props.segments ?? []) {
      const plage = {debut:segment.start,fin:segment.end};
      const segs = directes(node,segment,plage);
      const s = styles.get(segment.textStyleId ?? node.props.textStyleId);
      if(s)for(const l of directes(node,s.props,plage)) {
        const existante=segs.find(x=>cleLiaison(x)===cleLiaison(l));
        if(!existante)segs.push({...l,style:s.id});else if(existante.variable===l.variable)existante.style=s.id;
      }
      all.push(...segs);
    }
  }
  const dedoublonnees = new Map<string,LiaisonTrouvee>();
  for(const l of all)dedoublonnees.set(cleLiaison(l)+'\0'+l.variable,l);
  return [...dedoublonnees.values()];
}

function origineDe(doc:DocumentGenere, liaison:LiaisonTrouvee):LiaisonOracle['origine'] {
  if(liaison.style)return 'style';
  const parId=new Map(doc.noeuds.map(n=>[n.id,n]));
  const chaine=ancetres(doc,liaison.noeud);
  for(let i=chaine.length-1;i>=0;i--) {
    const instance=chaine[i];if(instance.type!=='INSTANCE')continue;
    let homologue=instance.main?parId.get(instance.main):undefined;
    for(let j=i+1;homologue&&j<chaine.length;j++) {
      const parent=chaine[j-1];
      const index=parent.children.indexOf(chaine[j].id);
      homologue=parId.get(homologue.children[index]);
    }
    if(homologue) {
      const l=directes(homologue).find(l=>l.champ===liaison.champ&&l.indice===liaison.indice&&l.variable===liaison.variable);
      if(l)return 'composant-principal';
    }
    return 'instance';
  }
  return 'propre';
}

function couleur(p:Objet):Objet|undefined {
  return objet(p)&&typeof p.r==='number'&&typeof p.g==='number'&&typeof p.b==='number'?{r:p.r,g:p.g,b:p.b,a:p.a??1}:undefined;
}

export function verifierDocument(doc: DocumentGenere): RefusOracle[] {
  const refus: RefusOracle[]=[];
  const signaler=(code:string,message:string,cible?:string)=>refus.push({code,message,...(cible?{cible}:{})});
  const ids=new Set<string>();
  for(const [genre,elements]of [['noeud',doc.noeuds],['variable',doc.variables],['collection',doc.collections],['style',doc.styles]] as const)for(const e of elements) {
    if(ids.has(e.id))signaler('identifiant-duplique',`Identifiant partagé ${e.id}`,e.id);
    ids.add(e.id);
  }
  for(const [genre,elements]of [['variable',doc.variables],['collection',doc.collections]] as const) {
    const cles=new Set<string>();
    for(const e of elements){if(!e.key||cles.has(e.key))signaler('cle-ressource-invalide',`Clé ${genre} vide ou dupliquée.`,e.id);cles.add(e.key);}
  }
  const nodes=new Map(doc.noeuds.map(n=>[n.id,n]));
  const variables=new Map(doc.variables.map(v=>[v.id,v]));
  const collections=new Map(doc.collections.map(c=>[c.id,c]));
  const styles=new Map(doc.styles.map(s=>[s.id,s]));
  for(const n of doc.noeuds) {
    if(n.type==='DOCUMENT') {if(n.parent!==null)signaler('parent-document','Le document porte un parent.',n.id);}
    else if(!n.parent||!nodes.has(n.parent))signaler('parent-absent',`Parent absent de ${n.id}`,n.id);
    else if(!nodes.get(n.parent)!.children.includes(n.id))signaler('enfant-non-reference',`Le parent ne référence pas ${n.id}`,n.id);
    if(new Set(n.children).size!==n.children.length)signaler('enfant-duplique','Un enfant est présent plusieurs fois.',n.id);
    for(const id of n.children)if(!nodes.has(id)||nodes.get(id)!.parent!==n.id)signaler('enfant-incoherent',`Enfant incohérent ${id}`,n.id);
    let courant:Noeud|undefined=n;const vus=new Set<string>();
    while(courant){if(vus.has(courant.id)){signaler('cycle-parent','Cycle des parents.',n.id);break;}vus.add(courant.id);courant=courant.parent?nodes.get(courant.parent):undefined;}
    if(n.type==='INSTANCE'&&(!n.main||!nodes.has(n.main)))signaler('maitre-absent','Une instance n’a pas de maître.',n.id);
    if(n.main&&nodes.get(n.main)?.type!=='COMPONENT')signaler('maitre-invalide','Le maître n’est pas COMPONENT.',n.id);
    for(const champ of ['textStyleId','fillStyleId','strokeStyleId'])if(n.props[champ]&&typeof n.props[champ]==='string'&&!styles.has(n.props[champ]))signaler('style-absent',`Style absent ${n.props[champ]}`,n.id);
    const carte=doc.oracle.calques[n.id];
    if(!carte)signaler('calque-sans-carte','Le calque manque à la carte.',n.id);
    else {
      const attendu=cheminEtRang(doc,n.id);
      if(!egales(attendu.chemin,carte.chemin)||attendu.rang!==carte.rang)signaler('chemin-incoherent','Le chemin ou le rang diffère de la carte.',n.id);
      if(!carte.proprietaire)signaler('proprietaire-absent','Le propriétaire manque à la carte.',n.id);
      const proprietaire=doc.spec.proprietaires?.[n.id]??doc.spec.nom;
      if(carte.proprietaire!==proprietaire)signaler('proprietaire-incoherent','Le propriétaire du calque diffère de la spec.',n.id);
    }
    const segments=n.props.segments??[];
    let fin=0;
    for(const s of segments) {
      if(!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<fin||s.end<s.start||s.end>String(n.props.characters??'').length)signaler('plage-invalide','Indices de plage invalides.',n.id);
      fin=s.end;
      const sid=s.textStyleId??n.props.textStyleId;
      const style=styles.get(sid);
      if(sid&&!style)signaler('style-absent',`Style de plage absent ${sid}`,n.id);
      if(style)for(const champ of ['fontName','fontSize','fontWeight','lineHeight','letterSpacing']) {
        const v=style.props[champ];
        if(v!==undefined&&s[champ]!==undefined&&!egales(v,s[champ])&&!aliasId(s.boundVariables?.[champ]))signaler('style-plage-incoherent',`${champ} diffère du style appliqué.`,n.id);
      }
    }
    if(typeof n.props.characters==='string'&&segments.length&&fin!==n.props.characters.length)signaler('plage-incomplete','Les plages ne couvrent pas le texte.',n.id);
    for(const [collection,mode]of Object.entries(modesDuNoeud(doc,n.id))) {
      const c=collections.get(collection)??doc.collections.find(c=>c.name===collection);
      if(!c||!c.modes.some(m=>m.modeId===mode))signaler('mode-inconnu',`Mode inconnu ${collection}/${mode}`,n.id);
    }
  }
  for(const id of Object.keys(doc.oracle.calques))if(!nodes.has(id))signaler('carte-calque-absent','La carte cite un calque absent.',id);
  if(nodes.get(doc.page)?.type!=='PAGE')signaler('page-absente','La page analysée manque.',doc.page);
  for(const id of doc.selection)if(!nodes.has(id))signaler('selection-absente','La sélection cite un nœud absent.',id);
  for(const c of doc.collections) {
    if(!c.modes.some(m=>m.modeId===c.defaultModeId))signaler('mode-defaut-absent','Le mode par défaut est absent.',c.id);
    if(new Set(c.modes.map(m=>m.modeId)).size!==c.modes.length)signaler('mode-duplique','Identifiant de mode dupliqué.',c.id);
    if(new Set(c.variableIds).size!==c.variableIds.length)signaler('inventaire-duplique','Variable répétée dans l’inventaire.',c.id);
    for(const id of c.variableIds)if(variables.get(id)?.variableCollectionId!==c.id)signaler('inventaire-incoherent',`Variable hors de la collection ${id}`,c.id);
  }
  for(const v of doc.variables) {
    const c=collections.get(v.variableCollectionId);
    if(!c)signaler('collection-absente',`Collection absente ${v.variableCollectionId}`,v.id);
    else if(!c.variableIds.includes(v.id))signaler('variable-hors-inventaire','La variable manque à l’inventaire de sa collection.',v.id);
    if(!egales(unique(v.scopes),unique(doc.oracle.scopes[v.id]??[])))signaler('scope-incoherent','Les scopes diffèrent de la carte.',v.id);
    if(!Object.prototype.hasOwnProperty.call(doc.oracle.scopes,v.id))signaler('scope-sans-carte','Les scopes manquent à la carte.',v.id);
    for(const [mode,brute]of Object.entries(v.valuesByMode)) {
      if(!c?.modes.some(m=>m.modeId===mode))signaler('mode-variable-inconnu',`Le mode de variable est inconnu ${mode}`,v.id);
      const cible=aliasId(brute);if(cible&&!variables.has(cible))signaler('alias-absent',`Cible d’alias absente ${cible}`,v.id);
    }
    for(const mode of c?.modes??[]) {
      try {
        const value=resoudreVariable(doc,v.id,{[c!.id]:mode.modeId});
        const typeCorrect=v.resolvedType==='COLOR'?!!couleur(value)&&['r','g','b','a'].every(k=>value[k]===undefined||Number.isFinite(value[k])):v.resolvedType==='FLOAT'?typeof value==='number'&&Number.isFinite(value):v.resolvedType==='STRING'?typeof value==='string':v.resolvedType==='BOOLEAN'?typeof value==='boolean':false;
        if(!typeCorrect)signaler('type-variable-incoherent',`La valeur ${mode.modeId} ne suit pas le type ${v.resolvedType}.`,v.id);
        const prevue=doc.oracle.couleurs[v.id];
        if(!prevue||!Object.prototype.hasOwnProperty.call(prevue,mode.modeId))signaler('valeur-sans-carte',`La valeur ${mode.modeId} manque à la carte.`,v.id);
        else if(!egales(value,prevue[mode.modeId]))signaler('valeur-incoherente',`La valeur ${mode.modeId} diffère de la carte.`,v.id);
      }catch(e){signaler('resolution-impossible',(e as Error).message,v.id);}
    }
  }
  for(const id of Object.keys(doc.oracle.couleurs))if(!variables.has(id))signaler('carte-variable-absente','La carte cite une variable absente.',id);
  const lues=liaisonsDuDocument(doc);
  const carte=new Map<string,LiaisonOracle[]>();
  for(const l of doc.oracle.liaisons){const cle=cleLiaison(l);const liste=carte.get(cle)??[];liste.push(l);carte.set(cle,liste);}
  for(const l of lues) {
    if(!variables.has(l.variable))signaler('variable-liee-absente',`Variable liée absente ${l.variable}`,l.noeud);
    const candidate=carte.get(cleLiaison(l))?.find(c=>c.variable===l.variable);
    if(!candidate)signaler('liaison-sans-carte',`La liaison ${l.champ} manque à la carte.`,l.noeud);
    else {
      if(candidate.proprietaire!==doc.oracle.calques[l.noeud]?.proprietaire)signaler('proprietaire-incoherent','Le propriétaire de la liaison diffère de celui du calque.',l.noeud);
      const origine=origineDe(doc,l);
      if(candidate.origine!==origine)signaler('origine-incoherente',`Origine attendue ${candidate.origine}, lue ${origine}.`,l.noeud);
    }
    if(l.peinture)try {
      const resolved=couleur(resoudreVariable(doc,l.variable,modesDuNoeud(doc,l.noeud)));
      const peinte=couleur(l.peinture.color);
      if(!resolved||!peinte||!egales(resolved,peinte))signaler('paint-incoherent',`Le paint ${l.champ} diffère de sa variable.`,l.noeud);
    }catch(e){signaler('paint-non-resolu',(e as Error).message,l.noeud);}
    else if(variables.has(l.variable))try {
      const node=nodes.get(l.noeud)!;
      const segment=l.plage?(node.props.segments??[]).find((s:Objet)=>s.start===l.plage!.debut&&s.end===l.plage!.fin):undefined;
      const valeurs=segment??node.props;
      const style=styles.get(valeurs.textStyleId??node.props.textStyleId);
      const propres=valeurs[l.champ]??(l.champ==='fontFamily'?valeurs.fontName?.family:l.champ==='fontStyle'?valeurs.fontName?.style:undefined);
      const brute=propres??style?.props[l.champ]??(l.champ==='fontFamily'?style?.props.fontName?.family:l.champ==='fontStyle'?style?.props.fontName?.style:undefined);
      const effective=objet(brute)&&'value'in brute?brute.value:brute;
      const resolved=resoudreVariable(doc,l.variable,modesDuNoeud(doc,l.noeud));
      if(effective!==undefined&&!egales(effective,resolved))signaler('valeur-liee-incoherente',`Le champ ${l.champ} diffère de sa variable.`,l.noeud);
    }catch(e){signaler('liaison-non-resolue',(e as Error).message,l.noeud);}
  }
  for(const l of doc.oracle.liaisons)if(!lues.some(t=>cleLiaison(t)===cleLiaison(l)&&t.variable===l.variable))signaler('carte-liaison-absente',`La carte cite une liaison absente ${l.champ}.`,l.noeud);
  const axes=Object.fromEntries(doc.spec.axes.map(a=>[a.nom,a.role]));
  if(!egales(axes,doc.oracle.axes))signaler('axes-incoherents','Les rôles d’axe diffèrent de la spec.');
  const jeu=nodes.get(doc.selection[0]);
  if(jeu&&(jeu.type==='COMPONENT_SET'||jeu.type==='COMPONENT')) {
    const definitions=jeu.props.componentPropertyDefinitions??{};
    for(const axe of doc.spec.axes)if(definitions[axe.nom]?.type!=='VARIANT'||!egales(definitions[axe.nom].variantOptions,axe.valeurs))signaler('axe-source-incoherent',`La définition de ${axe.nom} diffère de la spec.`,jeu.id);
    for(const [nom,definition]of Object.entries(definitions))if((definition as Objet)?.type==='VARIANT'&&!doc.spec.axes.some(a=>a.nom===nom))signaler('axe-source-sans-spec',`L’axe ${nom} manque à la spec.`,jeu.id);
  }
  for(const a of [...doc.oracle.attendus,...doc.oracle.infos])for(const cible of a.cibles)if(!nodes.has(cible))signaler('constat-cible-absente',`L’attente ${a.code} cite un calque absent.`,cible);
  return refus;
}

function ciblesDuConstat(doc:DocumentGenere,c:any):string[] {
  const parNom=new Map<string,string[]>();
  for(const n of doc.noeuds)if(n.type==='COMPONENT'){const ids=parNom.get(n.name)??[];ids.push(n.id);parNom.set(n.name,ids);}
  const selection=doc.noeuds.find(n=>n.id===doc.selection[0]);
  const variantes=selection?.type==='COMPONENT_SET'?doc.noeuds.filter(n=>n.parent===selection.id&&n.type==='COMPONENT'):selection?.type==='COMPONENT'?[selection]:[];
  const ramener=(id:string):string=>{
    if(doc.noeuds.some(n=>n.id===id))return id;
    const locales=variantes.filter(n=>n.name===id);
    if(locales.length===1)return locales[0].id;
    return parNom.get(id)?.length===1?parNom.get(id)![0]:id;
  };
  return unique([...(c.variants??[]),...(c.layers??[]),...(typeof c.faits?.surcharge==='string'?[c.faits.surcharge]:[])].map(ramener));
}

export interface ComparaisonOracle { conformes:boolean; manquants:Attendu[]; inattendus:any[]; correspondances:{attendu:Attendu;constat:any}[]; }
export function comparerConstats(doc:DocumentGenere,constats:any[]):ComparaisonOracle {
  const attendus=[...doc.oracle.attendus.map(a=>({...a,info:false})),...doc.oracle.infos.map(a=>({...a,info:true}))];
  const disponibles=constats.map((c,i)=>({c,i,cibles:ciblesDuConstat(doc,c)}));
  const pris=new Set<number>();const manquants:Attendu[]=[];const correspondances:ComparaisonOracle['correspondances']=[];
  for(const a of attendus) {
    const trouve=disponibles.find(({c,i,cibles})=>!pris.has(i)&&c.code===a.code&&(c.type==='info')===a.info&&(!a.type||a.type===c.type)&&egales(unique(a.cibles),cibles)&&Object.entries(a.faits??{}).every(([k,v])=>egales(c.faits?.[k],v))&&(!a.candidats||egales(unique(a.candidats),unique((c.question?.candidats??[]).map((x:any)=>String(x.cle))))));
    if(trouve){pris.add(trouve.i);correspondances.push({attendu:a,constat:trouve.c});}else manquants.push(a);
  }
  const inattendus=disponibles.filter(e=>!pris.has(e.i)).map(e=>e.c);
  return {conformes:!manquants.length&&!inattendus.length,manquants,inattendus,correspondances};
}
