import {mulberry32,choisir,entier,echantillon} from '../../../kit/tests/stress/commun/prng';
import {ECHELLES_DE_REFERENCE,NOMS_D_AXES,NOMS_D_AXES_GENERIQUES,REGISTRE_ETATS,REGISTRE_PALETTES_COMPOSANT,REGISTRE_TAILLES} from '@ucm-kit/core/referentiel';
import {lireLesDialectes} from './dialectes';
import type {Attendu,DocumentGenere,Noeud,Spec,Rgba} from './types';
import {alias,copie,dresserCarte,actualiserInventaires,valeur,modesDuNoeud} from './modele';

/**
 * Les constructions que le tirage évite parce qu'elles provoquent un écart que le produit ne corrige pas encore (questions rendues au
 * mainteneur). `ecartsConnus` les rétablit : le grand tirage les retrouve alors, avec `--ecarts-connus`.
 */
export const reglages={ecartsConnus:false};
export const ANATOMIES=['texte','icone','indicateur','piste','curseur','separateur','anneau','image','dependance','piece-interne'] as const;
export const CONSTRUCTIONS=['direct','imbrication-2','imbrication-3','wrapper-expose','wrapper-cache','visibilite','swap','style-texte','style-couleur','mode-force','fond-frere','homonymes','fills-multiples','image','icone-bibliotheque'] as const;
export const COMPOSANTS=['Button','IconButton','Alert','Badge','Chip','Tag','Avatar','Checkbox','Radio','Switch','TextField','Select','Tabs','Tooltip','Card','Dialog','Toast','Progress','Slider','Link','Breadcrumb','Pagination'];
const ANATOMIE_PAR_NOM:Record<string,string[]>={Button:['texte','icone'],IconButton:['icone'],Alert:['texte','icone','dependance'],Badge:['texte','indicateur'],Chip:['texte','icone'],Tag:['texte'],Avatar:['texte','image'],Checkbox:['indicateur'],Radio:['indicateur'],Switch:['piste','curseur'],TextField:['texte','icone'],Select:['texte','icone'],Tabs:['texte','indicateur'],Tooltip:['texte','indicateur'],Card:['texte','separateur','image'],Dialog:['texte','icone'],Toast:['texte','icone'],Progress:['piste','curseur'],Slider:['piste','curseur'],Link:['texte'],Breadcrumb:['texte','icone'],Pagination:['texte','icone']};
const forme=(nom:string)=>nom.toLowerCase().replace(/[\s_]+/g,'-');
const PALETTES=new Set(REGISTRE_PALETTES_COMPOSANT.termes.map(t=>t.id));
const GENERIQUES=new Set(NOMS_D_AXES_GENERIQUES);
const TAILLES_ECRITES=new Set(['small','medium','large']);
const tailleDuRegistre=(v:string)=>REGISTRE_TAILLES.termes.find(t=>t.id===v.toLowerCase()||t.toleres?.includes(v.toLowerCase()))?.id;
const termeConnu=(v:string)=>PALETTES.has(v.toLowerCase())||tailleDuRegistre(v)!==undefined||REGISTRE_ETATS.termes.some(t=>t.id===v.toLowerCase()||t.toleres?.includes(v.toLowerCase()));
const ECRITURE_SURE=/^[A-Za-z][A-Za-z0-9-]*$/;
/** Les identifiants que le générateur donne à ses calques et à ses collections : une valeur d'axe qui s'écrit pareil serait renommée avec eux (copie du variant, transformation « identifiants »). */
const IDENTIFIANTS_RESERVES=new Set(['document','page','bibliotheque','jeu','v','surface','header','body','wrapper','mode-local','c','p','l','ty','t','u']);
const ecritureLibre=(v:string)=>ECRITURE_SURE.test(v)&&!IDENTIFIANTS_RESERVES.has(v.toLowerCase());
/** Le tirage d'un composant : sa forme, et pour chaque axe le nom et les valeurs qu'un design system publie, avec leur écriture. */
export function tirerSpec(graine:number,rang=0):Spec{
 const tirer=mulberry32(graine);const compose=rang%5===4;const nom=compose?'Compose'+entier(tirer,100,999):choisir(tirer,COMPOSANTS);
 let construction:string[]=rang===0?['direct']:echantillon(tirer,CONSTRUCTIONS,entier(tirer,1,2));
 if(!construction.length)construction=['direct'];
 let anatomie=ANATOMIE_PAR_NOM[nom]??echantillon(tirer,ANATOMIES,entier(tirer,1,4));
 if(construction[0]==='image'&&!anatomie.includes('image'))anatomie=[...anatomie,'image'];
 if(construction.some(c=>['icone-bibliotheque','visibilite','swap'].includes(c))&&!anatomie.includes('icone'))anatomie=[...anatomie,'icone'];
 let dialecte='ucm',axePalette='Color',style='Filled',axeStyle='Variant',axeTaille='Size',taille='Medium',palette='Primary',etat='Default';
 const valeursPubliees:Record<string,string>={};
 const entrees=lireLesDialectes().filter(e=>(compose||e.composant===nom)&&e.proprietes.some(p=>p.verifie));
 if(entrees.length){
  const d=choisir(tirer,entrees);dialecte=d.systeme;
  const dePalette=d.proprietes.find(p=>p.verifie&&[...NOMS_D_AXES.palette,...GENERIQUES].includes(forme(p.nom))&&p.valeurs.some(v=>PALETTES.has(v.toLowerCase())));
  if(dePalette){axePalette=dePalette.nom;palette=choisir(tirer,dePalette.valeurs.filter(v=>PALETTES.has(v.toLowerCase())&&ecritureLibre(v)));valeursPubliees[dePalette.nom]=palette;}
  const deStyle=d.proprietes.find(p=>p.verifie&&p!==dePalette&&[...NOMS_D_AXES.style,...GENERIQUES].includes(forme(p.nom))&&p.valeurs.some(v=>ecritureLibre(v)&&!termeConnu(v)));
  if(deStyle){axeStyle=deStyle.nom;style=choisir(tirer,deStyle.valeurs.filter(v=>ecritureLibre(v)&&!termeConnu(v)));valeursPubliees[deStyle.nom]=style;}
  const deTaille=d.proprietes.find(p=>p.verifie&&NOMS_D_AXES.taille.includes(forme(p.nom))&&p.valeurs.some(v=>TAILLES_ECRITES.has(v.toLowerCase())));
  if(deTaille){axeTaille=deTaille.nom;taille=choisir(tirer,deTaille.valeurs.filter(v=>TAILLES_ECRITES.has(v.toLowerCase())));valeursPubliees[deTaille.nom]=taille;}
 }
 etat=choisir(tirer,['Default','default']);
 // Le nom français de l'axe de palette ne vient d'aucun dialecte publié ; les autres axes gardent le nom et les valeurs du système tiré.
 if(rang%7===6){delete valeursPubliees[axePalette];axePalette='Couleur';dialecte='francais';}
 const wrapper=construction.some(c=>c==='wrapper-expose'||c==='wrapper-cache');
 // Un wrapper de taille porte l'axe de taille que l'hôte n'a pas ; l'hôte le garde parfois, et C83 ne dit alors rien.
 const axeCommun=wrapper&&tirer()<0.25;
 const axes:Spec['axes']=[{nom:axePalette,role:'palette',valeurs:[palette]},{nom:axeStyle,role:'style',valeurs:[style]}];
 if(!wrapper||axeCommun)axes.push({nom:axeTaille,role:'taille',valeurs:[taille]});
 axes.push({nom:'State',role:'etat',valeurs:[etat]});
 return {nom,anatomie,construction,dialecte,valeursPubliees,axes,wrapperTaille:wrapper?{nom:axeTaille,valeur:taille,commun:axeCommun}:undefined,tailleValeur:taille,variantes:rang%3===2?2:1,profondeur:construction.includes('imbrication-3')?3:construction.includes('imbrication-2')?2:1};
}
export function generer(graine:number,spec:Spec):DocumentGenere{
 spec=copie(spec);
 if(spec.variantes===2)spec.axes.push({nom:'Configuration',role:'libre',valeurs:['A','B']});
 const tirer=mulberry32(graine);let compteur=0;
 const doc:DocumentGenere={version:1,id:'cas-'+graine,graine,spec:copie(spec),noeuds:[],variables:[],collections:[],styles:[],page:'page',selection:['jeu'],oracle:{couleurs:{},scopes:{},calques:{},liaisons:[],axes:{},attendus:[],infos:[]},famille:'juste'};
 doc.spec.proprietaires={};doc.spec.origines={};doc.spec.roles={};
 const collection=(id:string,name:string,noms=['Valeur'])=>{doc.collections.push({id,key:'cle-'+id,name,modes:noms.map(n=>({modeId:id+':'+n,name:n})),defaultModeId:id+':'+noms[0],variableIds:[]});};
 collection('c','components');collection('p','primitives');collection('l','layout');collection('ty','typography');collection('t','theme',['Light','Dark']);collection('u','utility',['Light','Dark']);
 const variable=(id:string,col:string,name:string,type:string,val:any,scopes:string[],parMode?:Record<string,any>)=>{
  const c=doc.collections.find(c=>c.id===col)!;
  doc.variables.push({id,key:'cle-'+id,name,variableCollectionId:col,resolvedType:type,scopes,valuesByMode:parMode??Object.fromEntries(c.modes.map(m=>[m.modeId,copie(val)]))});return id;
 };
 const parChemin=new Map<string,string>();
 for(const [c,entrees] of Object.entries(ECHELLES_DE_REFERENCE))for(const e of entrees)parChemin.set(c+'/'+e.chemin,({primitives:'p',layout:'l',typography:'ty'} as any)[c]+'|'+e.chemin);
 for(const [c,entrees]of Object.entries(ECHELLES_DE_REFERENCE))for(const e of entrees){
  const col=({primitives:'p',layout:'l',typography:'ty'} as any)[c];const scope=c==='primitives'?[]:c==='layout'?(e.chemin.startsWith('radius')?['CORNER_RADIUS']:e.chemin.startsWith('stroke')?['STROKE_FLOAT']:['GAP','WIDTH_HEIGHT']):e.chemin.endsWith('font-size')?['FONT_SIZE']:e.chemin.endsWith('font-weight')?['FONT_WEIGHT']:e.chemin.endsWith('line-height')?['LINE_HEIGHT']:['LETTER_SPACING'];
  variable(col+'|'+e.chemin,col,e.chemin,typeof e.valeur==='string'?'STRING':'FLOAT',e.alias?alias(parChemin.get(e.alias)!):e.valeur,scope);
 }
 const sombre:Rgba={r:0.05+tirer()*0.12,g:0.08+tirer()*0.12,b:0.15+tirer()*0.17,a:1};
 const clair:Rgba={r:0.94+tirer()*0.05,g:0.94+tirer()*0.05,b:0.94+tirer()*0.05,a:1};
 variable('couleur-sombre','p','color/neutral/950','COLOR',sombre,[]);variable('couleur-claire','p','color/neutral/50','COLOR',clair,[]);
 variable('couleur-sombre-dark','p','color/neutral/dark/950','COLOR',{r:sombre.r+0.02,g:sombre.g+0.01,b:sombre.b+0.02,a:1},[]);variable('couleur-claire-dark','p','color/neutral/dark/50','COLOR',{r:clair.r-0.02,g:clair.g-0.02,b:clair.b-0.02,a:1},[]);
 variable('rampe-fond','u','neutral/solid/default','COLOR',alias('couleur-sombre'),[],{'u:Light':alias('couleur-sombre'),'u:Dark':alias('couleur-sombre')});
 variable('rampe-texte','u','neutral/solid/foreground','COLOR',alias('couleur-claire'),[],{'u:Light':alias('couleur-claire'),'u:Dark':alias('couleur-claire')});
 variable('rampe-fond-dark','u','neutral/dark/solid/default','COLOR',alias('couleur-sombre-dark'),[]);variable('rampe-texte-dark','u','neutral/dark/solid/foreground','COLOR',alias('couleur-claire-dark'),[]);
 const paletteId=(spec.axes.find(a=>a.role==='palette')?.valeurs[0]??'Primary').toLowerCase();
 const paletteEcrite=spec.axes.find(a=>a.role==='palette')?.valeurs[0]??'Primary',etatEcrit=spec.axes.find(a=>a.role==='etat')?.valeurs[0]??'Default';
 const tailleId=tailleDuRegistre(spec.axes.find(a=>a.role==='taille')?.valeurs[0]??spec.wrapperTaille?.valeur??'Medium')??'md';
 // Un dossier écrit la taille en toutes lettres, à la casse des autres dossiers (`Button/Size/Medium`).
 const motDeDossier=REGISTRE_TAILLES.termes.find(t=>t.id===tailleId)?.identifiantParCategorie?.groupes??tailleId;
 const tailleDuDossier=motDeDossier.charAt(0).toUpperCase()+motDeDossier.slice(1);
 const dossier=(spec.axes.find(a=>a.role==='style')?.valeurs[0]??'Filled').toLowerCase()==='subtle'?'surface':'solid';
 variable('theme-fond','t',paletteId+'/'+dossier+'/default','COLOR',alias('rampe-fond'),['ALL_FILLS'],{'t:Light':alias('rampe-fond'),'t:Dark':alias('rampe-fond-dark')});variable('theme-texte','t',paletteId+'/'+dossier+'/foreground','COLOR',alias('rampe-texte'),['ALL_FILLS'],{'t:Light':alias('rampe-texte'),'t:Dark':alias('rampe-texte-dark')});
 const couleurToken=(role:string,nom=spec.nom)=>{
  const id=nom+':'+role;if(doc.variables.some(v=>v.id===id))return id;
  const style=spec.axes.find(a=>a.role==='style')?.valeurs[0]??'Filled';
  variable(id,'c',`${nom}/Color/${paletteEcrite}/${style}/${etatEcrit}/${role}`,'COLOR',alias(role==='background'?'theme-fond':'theme-texte'),role==='border'||role==='ring'?['STROKE_COLOR']:role==='background'?['FRAME_FILL','SHAPE_FILL']:['TEXT_FILL','SHAPE_FILL','FRAME_FILL']);return id;
 };
 const taille=(prop:string,target:string)=>{const id='taille-'+prop;if(doc.variables.some(v=>v.id===id))return id;variable(id,'c',`${spec.nom}/Size/${tailleDuDossier}/${prop}`,'FLOAT',alias(parChemin.get('layout/'+target)!),prop==='radius'?['CORNER_RADIUS']:prop==='border-width'?['STROKE_FLOAT']:['width','height','icon-size'].includes(prop)?['WIDTH_HEIGHT']:['GAP']);return id;};
 /** Un calque de 16 px dont la largeur et la hauteur sont liées : sans cela C30 le relève, une fois que le moteur voit les calques imbriqués. */
 const dimensions=(prop='width',autre='height')=>({width:alias(taille(prop,'sizing/4')),height:alias(taille(autre,'sizing/4'))});
 const ajuste={layoutSizingHorizontal:'HUG',layoutSizingVertical:'HUG'};
 const longueurs={gap:taille('gap','sizing/2'),px:taille('padding-x','sizing/3'),py:taille('padding-y','sizing/2'),radius:taille('radius','radius/sm')};
 const fond=couleurToken('background');
 const n=(id:string,type:string,name:string,parent:string|null,props:Record<string,any>={}):Noeud=>{
  const x:Noeud={id,type,name,parent,children:[],props:{...(type==='TEXT'||type==='FRAME'?ajuste:{}),...(type==='FRAME'?{layoutMode:'HORIZONTAL',primaryAxisSizingMode:'AUTO',counterAxisSizingMode:'AUTO',itemSpacing:0,paddingLeft:0,paddingRight:0,paddingTop:0,paddingBottom:0}:{}),visible:true,opacity:1,blendMode:'NORMAL',fills:[],strokes:[],effects:[],boundVariables:{},x:0,y:0,width:200,height:64,absoluteBoundingBox:{x:0,y:0,width:200,height:64},resolvedVariableModes:{c:'c:Valeur',p:'p:Valeur',l:'l:Valeur',ty:'ty:Valeur',t:'t:Light',u:'u:Light'},explicitVariableModes:{},...props}};
  doc.noeuds.push(x);if(parent)doc.noeuds.find(x=>x.id===parent)!.children.push(id);return x;
 };
 n('document','DOCUMENT','Document généré',null);n('page','PAGE','Composants','document',{backgrounds:[{type:'SOLID',color:{r:1,g:1,b:1}}]});n('bibliotheque','PAGE','Bibliothèque','document');
 n('jeu','COMPONENT_SET',spec.nom,'page',{key:'cle-jeu',remote:false,componentPropertyDefinitions:Object.fromEntries(spec.axes.map(a=>[a.nom,{type:'VARIANT',defaultValue:a.valeurs[0],variantOptions:a.valeurs}]))});
 const paint=(id:string,modes?:Record<string,string>)=>{const c=valeur(doc,id,modes);return {type:'SOLID',visible:true,opacity:c.a??1,blendMode:'NORMAL',color:{r:c.r,g:c.g,b:c.b},boundVariables:{color:alias(id)}};};
 const variantId='v';const vals=Object.fromEntries(spec.axes.map(a=>[a.nom,a.valeurs[0]]));
 const root=n(variantId,'COMPONENT',Object.entries(vals).map(([k,v])=>k+'='+v).join(', '),'jeu',{key:'cle-variant',remote:false,variantProperties:vals,componentPropertyDefinitions:{},layoutMode:'HORIZONTAL',primaryAxisSizingMode:'AUTO',counterAxisSizingMode:'AUTO',primaryAxisAlignItems:'CENTER',counterAxisAlignItems:'CENTER',itemSpacing:8,paddingLeft:12,paddingRight:12,paddingTop:8,paddingBottom:8,cornerRadius:4,boundVariables:{itemSpacing:alias(longueurs.gap),paddingLeft:alias(longueurs.px),paddingRight:alias(longueurs.px),paddingTop:alias(longueurs.py),paddingBottom:alias(longueurs.py),cornerRadius:alias(longueurs.radius)},fills:[paint(fond)]});
 doc.noeuds.find(n=>n.id==='jeu')!.props.defaultVariant='v';
 let parent=variantId;
 for(let i=1;i<(spec.profondeur??1);i++){const frame=n('cadre-'+i,'FRAME','Enveloppe '+i,parent);parent=frame.id;}
 const styleBound={fontFamily:alias('p|font-family/base'),fontSize:alias('ty|body/md/font-size'),fontWeight:alias('ty|body/md/font-weight'),lineHeight:alias('ty|body/md/line-height'),letterSpacing:alias('ty|body/md/letter-spacing')};
 const styleProps={fontName:{family:'Open Sans',style:'Regular'},fontSize:16,fontWeight:400,lineHeight:{unit:'PIXELS',value:22},letterSpacing:{unit:'PIXELS',value:0},boundVariables:styleBound};
 const ajouterTexte=(nom:string,p:string)=>{
  const id='texte-'+compteur++;const token=couleurToken('foreground');const fills=[paint(token)];
  if(!doc.styles.some(s=>s.id==='style-body'))doc.styles.push({id:'style-body',name:'body/md',type:'TEXT',props:styleProps});
  return n(id,'TEXT',nom,p,{...styleProps,characters:'Exemple',textStyleId:'style-body',fills,absoluteBoundingBox:{x:48,y:20,width:120,height:24},width:120,height:24,segments:[{start:0,end:7,...styleProps,textStyleId:'style-body',fills:copie(fills)}]});
 };
 const formes=(nom:string,type:string,role:string,p=parent)=>n('forme-'+compteur++,type,nom,p,{fills:[paint(couleurToken(role))],width:16,height:16,absoluteBoundingBox:{x:20,y:24,width:16,height:16},boundVariables:dimensions()});
 for(const a of spec.anatomie){
  if(a==='texte')ajouterTexte('Label',parent);
  else if(a==='image')n('image-'+compteur++,'RECTANGLE','Photo',parent,{fills:[{type:'IMAGE',visible:true,opacity:1,scaleMode:'FILL',imageHash:'image-inventee'}],width:16,height:16,absoluteBoundingBox:{x:0,y:0,width:16,height:16},boundVariables:dimensions()});
  else if(a==='icone'||a==='piece-interne'||a==='dependance'){
   // Une icône de bibliothèque dont le composant ne s'appelle pas Icon reçoit C66 « autre composant » (question ouverte au mainteneur) : le tirage garde le nom Icon.
   const nomMain=a==='icone'?(reglages.ecartsConnus&&spec.construction.includes('icone-bibliotheque')?'arrow-right-long':'Icon'):a==='piece-interne'?'.Partie':spec.nom+'Action';
   const main=n('maitre-'+compteur++,'COMPONENT',nomMain,'bibliotheque',{key:'cle-'+nomMain,remote:false,componentPropertyDefinitions:{},variantProperties:{}});
   const idInstance='instance-'+compteur++;
   // Une icône se pose à l'écart des formes de l'anatomie (20, 24), qui peignent dessous et feraient du fond de son tracé un cas de recouvrement.
   const xDeLIcone=a==='icone'?100:20;
   const t=couleurToken(a==='icone'?'foreground':'background',a==='dependance'?nomMain:spec.nom);
   let dessin:Noeud|undefined;
   if(a==='icone'){doc.spec.roles[main.id]='maitre-icone';dessin=n('dessin-'+compteur++,'VECTOR','Vector',main.id,{fills:[paint(couleurToken('foreground',nomMain))],width:16,height:16,absoluteBoundingBox:{x:xDeLIcone,y:24,width:16,height:16}});}
   const instance=n(idInstance,'INSTANCE',a==='icone'?(spec.construction.includes('icone-bibliotheque')?'arrow-right-long':'chevron-down'):nomMain,parent,{componentPropertyReferences:{},componentProperties:{},variantProperties:{},overrides:[],fills:[paint(t)],width:16,height:16,absoluteBoundingBox:{x:xDeLIcone,y:24,width:16,height:16},isExposedInstance:true,...(a==='icone'?{boundVariables:dimensions('icon-size','icon-size')}:ajuste)});instance.main=main.id;
   doc.spec.origines[instance.id]='instance';
   if(dessin){instance.props.fills=[];const child=n('I'+instance.id+';'+dessin.id,'VECTOR','Vector',instance.id,{fills:[paint(t)],width:16,height:16,absoluteBoundingBox:{x:xDeLIcone,y:24,width:16,height:16}});instance.props.overrides=[{id:child.id,overriddenFields:['fills']}];doc.spec.origines[child.id]='instance';}
   if(a==='dependance'){main.props.fills=[paint(t)];doc.spec.proprietaires[instance.id]=nomMain;doc.spec.origines[instance.id]='composant-principal';}
   if(a==='icone'){
    doc.spec.roles[instance.id]='icone';
    if(spec.construction.includes('swap')){const prop='Icon type#1:0';doc.noeuds.find(n=>n.id==='jeu')!.props.componentPropertyDefinitions[prop]={type:'INSTANCE_SWAP',defaultValue:main.id};instance.props.componentPropertyReferences.mainComponent=prop;}
    if(spec.construction.includes('visibilite')){const prop='Icon#2:0';doc.noeuds.find(n=>n.id==='jeu')!.props.componentPropertyDefinitions[prop]={type:'BOOLEAN',defaultValue:true};instance.props.componentPropertyReferences.visible=prop;}
    doc.oracle.infos.push({code:'C67',type:'info',cibles:[variantId,instance.id]});
   }
  }
  else if(a==='separateur')formes('Divider','RECTANGLE','divider');
  else if(a==='anneau'){
   const ring=couleurToken('ring');const stroke=taille('border-width','stroke/ring-weight');n('anneau-'+compteur++,'RECTANGLE','Ring',parent,{width:16,height:16,absoluteBoundingBox:{x:0,y:0,width:16,height:16},strokes:[paint(ring)],strokeWeight:2,strokeAlign:'OUTSIDE',boundVariables:{strokeWeight:alias(stroke),...dimensions()}});
  }else formes(a==='piste'?'Track':a==='curseur'?'Thumb':'Indicator',a==='curseur'?'ELLIPSE':'RECTANGLE',a==='piste'?'background':'foreground');
 }
 if(spec.construction.includes('homonymes')){
  const header=n('header','FRAME','Header',variantId),body=n('body','FRAME','Body',variantId);ajouterTexte('Label',header.id);ajouterTexte('Label',body.id);
 }
 if(spec.construction.includes('fond-frere')){
  root.props.fills=[];const panel=n('surface','RECTANGLE','Surface',variantId,{fills:[paint(fond)],layoutSizingHorizontal:'FILL',layoutSizingVertical:'FILL'});root.children=[panel.id,...root.children.filter(x=>x!==panel.id)];
 }
 const supportFond=doc.noeuds.find(n=>n.id==='surface')??root;
 if(spec.construction.includes('style-couleur')){
  doc.styles.push({id:'style-fond',name:spec.nom+'/Fond',type:'PAINT',props:{paints:copie(supportFond.props.fills)}});supportFond.props.fillStyleId='style-fond';
 }
 if(spec.construction.includes('fills-multiples')){supportFond.props.fills.push({...paint(fond),opacity:1});const st=doc.styles.find(s=>s.id===supportFond.props.fillStyleId);if(st)st.props.paints=copie(supportFond.props.fills);}
 if(spec.construction.includes('mode-force')){
  const frame=doc.noeuds.find(n=>n.type==='FRAME'&&n.parent===variantId)??n('mode-local','FRAME','Mode local',variantId);
  const deplacer=doc.noeuds.find(n=>n.type==='TEXT'&&n.parent===variantId)??doc.noeuds.find(n=>n.parent===variantId&&n.id!==frame.id);
  if(deplacer){root.children=root.children.filter(id=>id!==deplacer.id);frame.children.push(deplacer.id);deplacer.parent=frame.id;}
  frame.props.explicitVariableModes={t:'t:Dark'};frame.props.resolvedVariableModes.t='t:Dark';
  for(const child of doc.noeuds.filter(n=>n.parent===frame.id))child.props.resolvedVariableModes.t='t:Dark';
 }
 if(spec.wrapperTaille){
  const {nom:axe,valeur}=spec.wrapperTaille;
  const set=n('wrapper-set','COMPONENT_SET','.sizeWrapper'+spec.nom,'bibliotheque',{key:'cle-wrapper-set',remote:false,componentPropertyDefinitions:{[axe]:{type:'VARIANT',defaultValue:valeur,variantOptions:[valeur]}}});
  const main=n('wrapper-main','COMPONENT',axe+'='+valeur,set.id,{key:'cle-wrapper-main',remote:false,variantProperties:{[axe]:valeur},boundVariables:{itemSpacing:alias(longueurs.gap)}});set.props.defaultVariant=main.id;
  const w=n('wrapper','INSTANCE','.sizeWrapper'+spec.nom,variantId,{isExposedInstance:spec.construction.includes('wrapper-expose'),variantProperties:{[axe]:valeur},componentProperties:{[axe]:{type:'VARIANT',value:valeur}},componentPropertyReferences:{},boundVariables:{itemSpacing:alias(longueurs.gap)},overrides:[],...ajuste});w.main=main.id;
  doc.spec.origines[w.id]='composant-principal';
 }
 const regles=(nom:string,host:string,axes:Spec['axes'],icones:{nom:string;strict:boolean}[]=[])=>{
  const master=n('rules-main-'+compteur++,'COMPONENT','.componentRules','bibliotheque',{key:'cle-rules-'+compteur,remote:false,componentPropertyDefinitions:{}});
  const ruleMaster=n('rule-main-'+compteur++,'COMPONENT','.ruleItem','bibliotheque',{key:'cle-rule-'+compteur,remote:false,componentPropertyDefinitions:{}});
  const container=n('rules-'+compteur++,'INSTANCE','.componentRules',host,{componentPropertyReferences:{},componentProperties:{},overrides:[]});container.main=master.id;
  n('component-name-'+compteur++,'TEXT','component-name',container.id,{characters:nom});
  const rule=(tag:string,cible='')=>{const r=n('rule-'+compteur++,'INSTANCE','.ruleItem',container.id);r.main=ruleMaster.id;n('tag-'+compteur++,'TEXT','@'+tag,r.id,{characters:'@'+tag});n('content-'+compteur++,'TEXT','content',r.id,{characters:'Comportement de '+nom});if(cible)n('prop-'+compteur++,'TEXT','prop',r.id,{characters:cible});};
  rule('usage');for(const axe of axes)for(const v of axe.valeurs)rule('prop',axe.nom.toLowerCase()+'.'+v.toLowerCase());
  for(const [name,d]of Object.entries(doc.noeuds.find(n=>n.id==='jeu')!.props.componentPropertyDefinitions))if((d as any).type==='BOOLEAN')rule('boolean',name.split('#')[0].toLowerCase());
  // Une icône de bibliothèque que seuls des tracés dessinent s'écrit dans une règle @icons : sans elle, C42 dit que le contrat ne publie aucun tracé.
  for(const icone of icones){const r=n('rule-'+compteur++,'INSTANCE','.ruleItem',container.id);r.main=ruleMaster.id;n('tag-'+compteur++,'TEXT','@icons',r.id,{characters:'@icons'});n('icon-'+compteur++,'TEXT','icon',r.id,{characters:icone.nom});n('strict-'+compteur++,'TEXT','strict',r.id,{characters:'strict',visible:icone.strict});n('modifiable-'+compteur++,'TEXT','modifiable',r.id,{characters:'modifiable',visible:!icone.strict});}
 };
 const nomsDIcones=[...new Map(doc.noeuds.filter(x=>doc.spec.roles[x.id]==='icone').map(x=>[x.name,{nom:x.name,strict:!x.props.componentPropertyReferences?.mainComponent}])).values()];
 regles(spec.nom,'page',spec.axes,nomsDIcones);
 for(const main of [...doc.noeuds.filter(n=>n.type==='COMPONENT'&&n.parent==='bibliotheque'&&!n.name.startsWith('.')&&doc.spec.roles[n.id]!=='maitre-icone')])regles(main.name,'bibliotheque',[]);
 if(spec.variantes===2){
  const desc=(id:string):string[]=>[id,...doc.noeuds.find(n=>n.id===id)!.children.flatMap(desc)];
  const ids=desc(variantId),renoms=new Map(ids.map(id=>[id,id+'-bis']));
  const changer=(v:any):any=>typeof v==='string'?(renoms.get(v)??v):Array.isArray(v)?v.map(changer):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,changer(x)])):v;
  for(const old of ids){const source=doc.noeuds.find(n=>n.id===old)!;const x=copie(source);x.id=renoms.get(old)!;x.parent=renoms.get(x.parent!)??x.parent;x.children=x.children.map(id=>renoms.get(id)!);x.props=changer(x.props);if(old===variantId){x.props.variantProperties.Configuration='B';x.name=Object.entries(x.props.variantProperties).map(([k,v])=>k+'='+v).join(', ');}x.props.absoluteBoundingBox.x+=250;doc.noeuds.push(x);if(doc.spec.proprietaires[old])doc.spec.proprietaires[x.id]=doc.spec.proprietaires[old];if(doc.spec.origines[old])doc.spec.origines[x.id]=doc.spec.origines[old];if(doc.spec.roles[old])doc.spec.roles[x.id]=doc.spec.roles[old];}
  doc.noeuds.find(n=>n.id==='jeu')!.children.push(renoms.get(variantId)!);
 }
 const resoudreModes=(id:string,parentModes:Record<string,string>)=>{const node=doc.noeuds.find(n=>n.id===id)!;node.props.resolvedVariableModes={...parentModes,...node.props.explicitVariableModes};for(const c of node.children)resoudreModes(c,node.props.resolvedVariableModes);};
 resoudreModes('document',Object.fromEntries(doc.collections.map(c=>[c.id,c.defaultModeId])));
 for(const node of doc.noeuds){const actualiser=(ps:any[])=>{for(const p of ps??[])if(p.boundVariables?.color?.id){const c=valeur(doc,p.boundVariables.color.id,node.props.resolvedVariableModes);p.color={r:c.r,g:c.g,b:c.b};p.opacity=c.a??1;}};actualiser(node.props.fills);actualiser(node.props.strokes);for(const seg of node.props.segments??[])actualiser(seg.fills);}
 doc.oracle.infos=informationsPrevues(doc);
 actualiserInventaires(doc);doc.oracle=dresserCarte(doc,attendusDeStructure(doc),doc.oracle.infos);
 return doc;
}
export function informationsPrevues(doc:DocumentGenere){
 const groupes=new Map<string,{code:string;type:string;cibles:string[];faits?:Record<string,string|number>}>();
 // Un anneau posé au-dessus d'une image du même cadre n'a pas de fond que le contraste sache mesurer : C50 le dit en information (D17).
 for(const anneau of doc.noeuds.filter(n=>n.type==='RECTANGLE'&&n.name==='Ring'&&n.props.strokes?.length)){
  const parent=doc.noeuds.find(n=>n.id===anneau.parent);if(!parent)continue;
  const dessous=parent.children.slice(0,parent.children.indexOf(anneau.id)).map(id=>doc.noeuds.find(n=>n.id===id)!);
  if(!dessous.some(n=>n.props.fills?.some((p:any)=>p.type==='IMAGE')))continue;
  let v=anneau;while(v.parent&&v.parent!==doc.selection[0])v=doc.noeuds.find(n=>n.id===v.parent)!;
  const groupe=groupes.get('anneau-image')??{code:'C50',type:'info',cibles:[],faits:{cause:'image',champ:'strokes',usage:'anneau'}};groupe.cibles.push(anneau.id,v.id);groupes.set('anneau-image',groupe);
 }
 for(const instance of doc.noeuds.filter(n=>doc.spec.roles?.[n.id]==='icone')){
  let anc=instance;while(anc.parent&&anc.parent!==doc.selection[0])anc=doc.noeuds.find(n=>n.id===anc.parent)!;
  const key=instance.name+':'+(instance.props.componentPropertyReferences?.mainComponent?'swap':'libre');const groupe=groupes.get(key)??{code:'C67',type:'info',cibles:[]};groupe.cibles.push(instance.id,anc.id);groupes.set(key,groupe);
 }
 return [...groupes.values()];
}
/** D8 : un wrapper non exposé qui porte l'axe de taille que l'hôte n'a pas donne un seul C83, sur les variants qui posent son instance. */
export function attendusDeStructure(doc:DocumentGenere):Attendu[]{
 const attendus:Attendu[]=[];
 // Une image dans un fill n'est pas exportée : un seul C42 « ce réglage n'est pas pris en charge », sur chaque calque d'image.
 const images=doc.noeuds.filter(n=>n.props.fills?.some((p:any)=>p.type==='IMAGE'));
 if(images.length)attendus.push({code:'C42',type:'verifier',cibles:images.map(n=>n.id),faits:{geste:'non-exportes',calque:images[0].name}});
 const wrapper=doc.spec.wrapperTaille;
 if(!wrapper||wrapper.commun)return attendus;
 const instances=doc.noeuds.filter(n=>n.type==='INSTANCE'&&n.name==='.sizeWrapper'+doc.spec.nom&&n.props.isExposedInstance===false);
 if(!instances.length)return attendus;
 const variants=new Set<string>();
 for(const i of instances){let a=i;while(a.parent&&a.parent!==doc.selection[0])a=doc.noeuds.find(n=>n.id===a.parent)!;variants.add(a.id);}
 return [...attendus,{code:'C83',type:'verifier',cibles:[...variants,...instances.map(i=>i.id)],faits:{wrapper:'.sizeWrapper'+doc.spec.nom,proprietes:wrapper.nom,composant:doc.spec.nom}}];
}
