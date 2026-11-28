export type Rgba = { r:number; g:number; b:number; a?:number };
export type RoleAxe = 'palette'|'style'|'taille'|'etat'|'libre';
export interface Noeud { id:string; type:string; name:string; parent:string|null; children:string[]; props:Record<string,any>; main?:string; }
export interface Variable { id:string; key:string; name:string; variableCollectionId:string; resolvedType:string; scopes:string[]; valuesByMode:Record<string,any>; remote?:boolean; }
export interface Collection { id:string; key:string; name:string; modes:{modeId:string;name:string}[]; defaultModeId:string; variableIds:string[]; remote?:boolean; }
export interface Style { id:string; name:string; type:string; props:Record<string,any>; }
/** `candidats` : les clés des variables que la question propose, quand l'attente les exige (une liste vide dit « aucune réponse cochée »). */
export interface Attendu { code:string; type?:string; cibles:string[]; faits?:Record<string,string|number>; candidats?:string[]; }
export interface LiaisonOracle { noeud:string; champ:string; variable:string; indice?:number; plage?:{debut:number;fin:number}; proprietaire:string; origine:'propre'|'style'|'composant-principal'|'instance'; role?:string; }
export interface CarteOracle {
  couleurs:Record<string,Record<string,any>>;
  scopes:Record<string,string[]>;
  calques:Record<string,{chemin:string[];rang:number;proprietaire:string}>;
  liaisons:LiaisonOracle[];
  axes:Record<string,RoleAxe>;
  attendus:Attendu[];
  infos:Attendu[];
}
export interface Spec {
 nom:string; anatomie:string[]; construction:string[]; dialecte:string;
 axes:{nom:string;role:RoleAxe;valeurs:string[]}[];
 [cle:string]:any;
}
export interface DocumentGenere {
 version:1; id:string; graine:number; spec:Spec; noeuds:Noeud[]; variables:Variable[]; collections:Collection[]; styles:Style[];
 page:string; selection:string[]; oracle:CarteOracle;
 refus?:{variables?:string[];collections?:string[];lectures?:{noeud:string;champ:string}[]};
 famille?:'juste'|'defaut'|'transformation'|'abstention';
 operation?:string;
}
export interface RefusOracle { code:string; message:string; cible?:string; }
