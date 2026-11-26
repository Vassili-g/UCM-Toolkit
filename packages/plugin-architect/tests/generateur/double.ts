/**
 * Le double de Figma d'un document généré, et son analyse complète.
 *
 * Les calques sortent de `atelierDeCalques({ recherches: true, permises: ['getSharedPluginData', 'getSharedPluginDataKeys', 'loadAsync', 'on', 'off'] })` : les enfants, les parents, `findAll`, `findOne`, `findChildren` et
 * `findAllWithCriteria` viennent de l'atelier, et `'findAll' in calque` répond vrai pour un calque à enfants. Le double n'ajoute que ce
 * que le document décrit : une lecture refusée lève à la lecture du champ, `defaultVariant` rend un calque, le maître d'une instance
 * se rend par `getMainComponentAsync`. L'analyse est celle du plugin (`traiterAvec` et `LECTEURS_DE_FIGMA`), relevé et catalogue compris.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- les doubles de Figma dépassent les types du plugin */
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import { LECTEURS_DE_FIGMA, reinitialiserLAnalyse, traiterAvec } from '../../src/sandbox/analyse';
import { atelierDeCalques, collectionFigma, enLectureSeule, portDeTest, variableFigma } from '../figmaDeTest';
import type { DocumentGenere } from './types';

export function doubleDuDocument(doc: DocumentGenere) {
  const atelier = atelierDeCalques({ recherches: true, permises: ['getSharedPluginData', 'getSharedPluginDataKeys', 'loadAsync', 'on', 'off'] });
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
    if (n.main) champs.getMainComponentAsync = async () => calque(n.main!);
    if (n.type === 'DOCUMENT') Object.assign(champs, { documentColorProfile: 'SRGB', fileKey: 'prototype' });
    Object.assign(champs, {
      getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : ''),
      getSharedPluginDataKeys: () => [],
      loadAsync: async () => {},
      on: () => {},
      off: () => {},
    });
    if (typeof n.props.defaultVariant === 'string') Object.defineProperty(champs, 'defaultVariant', { enumerable: true, get: () => calque(n.props.defaultVariant) });
    if (n.type === 'PAGE') Object.defineProperty(champs, 'selection', { enumerable: true, get: () => doc.selection.map(calque) });
    for (const champ of Object.keys(champs)) {
      if (refusee(id, champ)) Object.defineProperty(champs, champ, { enumerable: true, get: () => { throw new Error(`Lecture refusée ${id}.${champ}`); } });
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
  return { figma, journal: atelier.journal, calque };
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

/** L'analyse complète du document : le dernier message `analyse`, avec le relevé et le catalogue que les lecteurs ont lus. */
export async function analyserDocument(doc: DocumentGenere): Promise<ResultatDAnalyse> {
  const { figma, journal } = doubleDuDocument(doc);
  const globale = globalThis as { figma?: unknown };
  const precedent = globale.figma;
  globale.figma = figma;
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
  const messages: any[] = [];
  let releve: any;
  let catalogue: any;
  try {
    const traiter = traiterAvec({
      ...LECTEURS_DE_FIGMA,
      releve: async (...args: Parameters<typeof LECTEURS_DE_FIGMA.releve>) => {
        const r = await LECTEURS_DE_FIGMA.releve(...args);
        if (r.statut === 'lu') releve = r.releve;
        return r;
      },
      catalogue: async (...args: Parameters<typeof LECTEURS_DE_FIGMA.catalogue>) => {
        catalogue = await LECTEURS_DE_FIGMA.catalogue(...args);
        return catalogue;
      },
    });
    const debut = performance.now();
    await traiter({ type: 'analyser', demande: 1 }, { figma, envoyer: (m: any) => messages.push(m), surveillerLeDocument: () => [] } as any);
    const final = messages.find((m) => m.type === 'analyse');
    if (!final) throw new Error(`Analyse sans final ${JSON.stringify(messages)}`);
    return { statut: final.statut, constats: final.constats, releve, catalogue, lecture: final.lecture, causes: final.causes, dureeMs: performance.now() - debut, journal };
  } finally {
    globale.figma = precedent;
  }
}
