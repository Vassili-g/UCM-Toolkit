/**
 * Le double de Figma d'un document généré, neutre : il ne connaît aucune analyse. Le raccord à l'analyse d'un plugin reste dans ce
 * plugin (`plugin-architect/tests/generateur/analyserDocument.ts`) et se passe au tirage et à la réduction comme fonction de jugement.
 *
 * Les calques sortent de `atelierDeCalques({ recherches: true, permises: ['getSharedPluginData', 'getSharedPluginDataKeys', 'loadAsync', 'on', 'off'] })` : les enfants, les parents, `findAll`, `findOne`, `findChildren` et
 * `findAllWithCriteria` viennent de l'atelier, et `'findAll' in calque` répond vrai pour un calque à enfants. Le double n'ajoute que ce
 * que le document décrit : une lecture refusée lève à la lecture du champ, `defaultVariant` rend un calque, le maître d'une instance
 * se rend par `getMainComponentAsync`, et un maître absent du document donne `null`.
 *
 * Une prop du modèle qui contient une référence `{ ref: id }` (`ref` de `modele.ts`) se lit comme le ou les calques désignés, les mêmes
 * objets que `calque(id)` : `exposedInstances` s'écrit ainsi. La conversion est paresseuse, une référence peut viser un calque
 * qui n'est pas encore construit. `figma.skipInvisibleInstanceChildren` gouverne les recherches de l'atelier. Chaque `loadAsync` et
 * chaque `on` ou `off` se range dans `chargements` et `ecouteurs`, dans l'ordre des appels.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- les doubles de Figma dépassent les types du plugin */
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { atelierDeCalques, collectionFigma, enLectureSeule, portDeTest, variableFigma } from './atelierDeCalques';
import type { DocumentGenere } from './types';

const estUneReference = (v: any): v is { ref: string } => !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.ref === 'string' && Object.keys(v).length === 1;
const contientUneReference = (v: any): boolean => estUneReference(v) || (Array.isArray(v) ? v.some(contientUneReference) : !!v && typeof v === 'object' && Object.values(v).some(contientUneReference));

export function doubleDuDocument(doc: DocumentGenere) {
  const atelier = atelierDeCalques({ recherches: true, permises: ['getSharedPluginData', 'getSharedPluginDataKeys', 'loadAsync', 'on', 'off'], ignorerLesInvisibles: () => figma.skipInvisibleInstanceChildren === true });
  const chargements: string[] = [];
  const ecouteurs: { noeud: string; evenement: string; action: 'on' | 'off' }[] = [];
  const actifs: { noeud: string; evenement: string; action: (...a: any[]) => void }[] = [];
  const donnees = new Map(doc.noeuds.map((n) => [n.id, n]));
  const construits = new Map<string, any>();
  const refusee = (id: string, champ: string) => doc.refus?.lectures?.some((x) => x.noeud === id && x.champ === champ) ?? false;
  const calque = (id: string): any => {
    const connu = construits.get(id);
    if (connu) return connu;
    const n = donnees.get(id);
    if (!n) throw new Error(`noeud absent ${id}`);
    const enfants = n.children.map(calque);
    const champs: Record<string, any> = { ...n.props, name: n.name };
    delete champs.segments;
    if (n.type === 'TEXT') {
      champs.getStyledTextSegments = (demandes: string[]) => (n.props.segments ?? []).map((p: any) => Object.fromEntries(['start', 'end', ...demandes].map((k) => [k, structuredClone(p[k])])));
    }
    if (n.main) champs.getMainComponentAsync = async () => (donnees.has(n.main!) ? calque(n.main!) : null);
    if (n.type === 'DOCUMENT') Object.assign(champs, { documentColorProfile: 'SRGB', fileKey: 'prototype' });
    Object.assign(champs, {
      getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : ''),
      getSharedPluginDataKeys: () => [],
      loadAsync: async () => { chargements.push(id); },
      on: (evenement: string, action: (...a: any[]) => void) => { ecouteurs.push({ noeud: id, evenement, action: 'on' }); actifs.push({ noeud: id, evenement, action }); },
      off: (evenement: string, action: (...a: any[]) => void) => {
        ecouteurs.push({ noeud: id, evenement, action: 'off' });
        const rang = actifs.findIndex((x) => x.noeud === id && x.evenement === evenement && x.action === action);
        if (rang >= 0) actifs.splice(rang, 1);
      },
    });
    for (const [cle, valeur] of Object.entries(n.props)) {
      if (!contientUneReference(valeur)) continue;
      const resoudre = (v: any): any => (estUneReference(v) ? calque(v.ref) : Array.isArray(v) ? v.map(resoudre) : !!v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resoudre(x)])) : v);
      let rendu: any;
      Object.defineProperty(champs, cle, { enumerable: true, configurable: true, get: () => (rendu ??= resoudre(valeur)) });
    }
    if (typeof n.props.defaultVariant === 'string') Object.defineProperty(champs, 'defaultVariant', { enumerable: true, configurable: true, get: () => calque(n.props.defaultVariant) });
    if (n.type === 'PAGE') Object.defineProperty(champs, 'selection', { enumerable: true, configurable: true, get: () => doc.selection.map(calque) });
    for (const champ of Object.keys(champs)) {
      if (refusee(id, champ)) Object.defineProperty(champs, champ, { enumerable: true, configurable: true, get: () => { throw new Error(`Lecture refusée ${id}.${champ}`); } });
    }
    const construit = atelier.calque(id, n.type, champs, enfants);
    construits.set(id, construit);
    return construit;
  };
  for (const n of doc.noeuds.filter((x) => x.parent === null)) calque(n.id);
  for (const s of doc.styles) atelier.styleDeTexte(s.id, s.name, s.props.boundVariables ?? {}, { type: s.type, ...s.props });

  const collections = doc.collections.map((c) => ({ ...collectionFigma(c.id, c.name, [], c.variableIds, c.remote), ...c }));
  const variables = doc.variables.map((v) => ({ ...variableFigma(v.id, v.variableCollectionId, v.name, v.resolvedType, v.valuesByMode, v.remote), ...v }));
  const { port } = portDeTest(collections.filter((c) => !c.remote), variables.filter((v) => !v.remote), variables.filter((v) => v.remote), collections.filter((c) => c.remote), { refusees: new Set(doc.refus?.variables ?? []) });
  // Les délais artificiels du port de test ne font pas partie du coût d'Architect.
  const lecteurs = {
    ...port,
    getVariableByIdAsync: async (id: string) => {
      if (doc.refus?.variables?.includes(id)) throw new Error(`Variable refusée ${id}`);
      const v = variables.find((x) => x.id === id);
      return v ? enLectureSeule(v) : null;
    },
    getVariableCollectionByIdAsync: async (id: string) => {
      if (doc.refus?.collections?.includes(id)) throw new Error(`Collection refusée ${id}`);
      const c = collections.find((x) => x.id === id);
      return c ? enLectureSeule(c) : null;
    },
  };
  const p = atelier.port(lecteurs as any, doc.selection.map(calque));
  const figma: any = {
    root: calque(doc.noeuds.find((n) => n.type === 'DOCUMENT')!.id),
    currentPage: calque(doc.page),
    mixed: Symbol('mixed'),
    skipInvisibleInstanceChildren: false,
    variables: lecteurs,
    fileKey: 'prototype',
    getNodeByIdAsync: async (id: string) => (donnees.has(id) ? calque(id) : null),
    getStyleByIdAsync: p.getStyleByIdAsync,
    clientStorage: { getAsync: async () => undefined },
    teamLibrary: { getAvailableLibraryVariableCollectionsAsync: async () => [] },
  };
  /** Rend les écouteurs que le code a posés et pas retirés, comme Figma le ferait à un changement : `emettre('page', 'nodechange')`. */
  const emettre = (noeud: string, evenement: string) => { for (const x of [...actifs]) if (x.noeud === noeud && x.evenement === evenement) x.action({}); };
  return { figma, journal: atelier.journal, calque, chargements, ecouteurs, emettre };
}

export interface ResultatDAnalyse {
  statut: string;
  constats: any[];
  releve: any;
  catalogue: any;
  lecture: any;
  causes: any;
  dureeMs: number;
  journal: string[];
}

/** La fonction de jugement qu'un plugin fournit : l'analyse complète d'un document généré. */
export type Analyseur = (doc: DocumentGenere) => Promise<ResultatDAnalyse>;
