/**
 * Les opérateurs d'écriture des règles du stress test F8 : `creer` (E1), `ajouter` (E2), `retirer` refusé (E3), un lot mixte (E4), les
 * modèles que l'analyse retient (E5) et la phrase du résumé de lot (E6). 8 + 10 + 2 + 5 + 5 + 6 = 36 cas.
 *
 * L'écriture tourne par `ecrireLeLot` sur le double de Figma de `tests/figmaDeTest.ts`, avec un port d'écriture des règles dont les
 * méthodes lisent et modifient la `SpecDePage` du composant : `creer` pose un conteneur aux règles marquées, `ajouter` complète le
 * premier conteneur, et la relecture repasse par le scan réel. `creerLesRegles` et `ajouterLesRegles` du socle ne tournent pas (leur
 * écriture réelle se prouve en Figma). L'oracle vient de la SPEC (« Analyse et corrections »), de la section 2.2 du plan et de
 * `ecriture/regles.ts` pour les motifs : `objet-change` quand ce que l'analyse a lu n'est plus vrai, `erreur` quand Figma refuse,
 * `instance-remplie` pour `retirer`, `non-ucm` hors UCM. Après une écriture réussie, la relecture ne montre plus ni C43 ni C45
 * `sans-regle` ou `sans-valeur`.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import { nombreDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';

import { ecrireLeLot, type ApiDeLiaisons } from '../../../src/ecriture/liaisons';
import type { PortDEcritureDesRegles } from '../../../src/ecriture/regles';
import { ciblesPresentes, modelesDeLAnalyse, retenirLesModeles } from '../../../src/regles';
import { resumeDuLot } from '../../../src/sandbox/corrections';
import { analyseCourante, reinitialiserLAnalyse, traiterAvec, type Lecteurs } from '../../../src/sandbox/analyse';
import { atelierDEcriture, type VariableDEcriture } from '../../../tests/figmaDeTest';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import { graineDe, melanger, mulberry32 } from '../../../../kit/tests/stress/commun/prng';
import {
  attenduC43, attenduSansRegle, compacter, HYPOTHESES, Registre, type AttenduF8, type CasF8, type DefinitionDeCas, type SortieDeCas, type Variante,
} from './cas';
import { avecLesRegles, ciblesDe, cleDeLaPropriete, reglesDe, specDeLaForme, specR0 } from './operateursRegles';
import { construireLaPage, ID_DU_COMPOSANT, lireLaPage, type SpecDePage } from './pageDeRegles';
import { MARQUE, nombreDeReglesDuJeu, reglesDuModele, sansLesReglesDe } from './profilsRegles';
import { banc, OPTIONS_SANS_ATTENTE, PROFIL_A0 } from './scenarioDeBase';

// ---------------------------------------------------------------------------------------------------------------------------
// Le monde en écriture

interface Fautes {
  composantDisparu?: boolean;
  resoudreRefuse?: boolean;
  resoudreLeve?: boolean;
  creerLeve?: boolean;
  ajouterLeve?: boolean;
  commitUndoLeve?: boolean;
}

export class MondeEnEcriture {
  readonly appels: string[] = [];
  constructor(public spec: SpecDePage) {}
  get id(): string { return this.spec.id ?? ID_DU_COMPOSANT; }
  page() { return construireLaPage(this.spec); }
  aUnConteneur(): boolean { return this.spec.conteneurs.some((conteneur) => conteneur.emplacement !== 'autre-page' && compacter(conteneur.ecrit ?? '') === compacter(this.spec.nom)); }
  poser(regles: ReturnType<typeof reglesDuModele>, creation: boolean): void {
    if (creation) this.spec = { ...this.spec, conteneurs: [...this.spec.conteneurs, { ecrit: this.spec.nom, regles, emplacement: 'page' }] };
    else this.spec = avecLesRegles(this.spec, [...reglesDe(this.spec), ...regles]);
  }
}

function portDeMondes(mondes: readonly MondeEnEcriture[], fautes: Fautes): PortDEcritureDesRegles {
  const parId = (id: string): MondeEnEcriture | undefined => mondes.find((monde) => monde.id === id);
  const deNoeud = (noeud: unknown): MondeEnEcriture => parId((noeud as { id: string }).id)!;
  const port: PortDEcritureDesRegles = {
    async composant(id) {
      const monde = parId(id);
      return !monde || fautes.composantDisparu ? null : (monde.page().composant as never);
    },
    async releve(composant) {
      const { page, composant: noeud } = deNoeud(composant).page();
      return (await extractRules(noeud as never, page as never)).releve;
    },
    async resoudre() {
      if (fautes.resoudreLeve) throw new Error('Figma refuse de lire les sources');
      return fautes.resoudreRefuse ? { sources: null, refus: 'Le maître est introuvable.' } : { sources: { aRemplir: null } as never, refus: null };
    },
    async presentes(composant) {
      const { page, composant: noeud } = deNoeud(composant).page();
      return new Set(ciblesPresentes(await extractRules(noeud as never, page as never)));
    },
    async conteneur(composant) {
      const monde = deNoeud(composant);
      return monde.aUnConteneur() ? ({ id: monde.id } as never) : null;
    },
    async creer(composant, modele) {
      const monde = deNoeud(composant);
      monde.appels.push('creer');
      if (fautes.creerLeve) throw new Error('Figma refuse la création');
      monde.poser(reglesDuModele(modele, { marquees: true, ecriture: 'exacte' }), true);
      return { conteneur: {} as never, regles: nombreDeRegles(modele) } as never;
    },
    async ajouter(conteneur, manquantes) {
      const monde = deNoeud(conteneur);
      monde.appels.push('ajouter');
      if (fautes.ajouterLeve) throw new Error('Figma refuse l’ajout');
      monde.poser(reglesDuModele(manquantes, { marquees: true, ecriture: 'exacte' }), false);
      return { conteneur: {} as never, regles: nombreDeRegles(manquantes) } as never;
    },
  };
  return port;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Scénario

export interface Scenario {
  readonly mondes: readonly MondeEnEcriture[];
  readonly fautes?: Fautes;
  /** Remplace les corrections des analyses (E3). */
  readonly corrections?: readonly Correction[];
  /** Un changement du document entre l'analyse et l'écriture. */
  readonly muter?: () => void;
  readonly sansModeles?: boolean;
  readonly secondPassage?: boolean;
  /** Les corrections des analyses sont filtrées avant l'envoi. */
  readonly retenir?: (correction: Correction) => boolean;
}

export interface Attendu {
  /** Des identifiants de corrections. */
  readonly ecrites: readonly string[];
  readonly sautees: ReadonlyArray<readonly [string, string]>;
  readonly appels: readonly string[];
  readonly ecrites2?: readonly string[];
  readonly sautees2?: ReadonlyArray<readonly [string, string]>;
}

export const creer = (id = ID_DU_COMPOSANT): string => `regles:creer:${id}`;
export const ajouter = (propriete: string, id = ID_DU_COMPOSANT): string => `regles:ajouter:${id}:${propriete}`;
const trie = (liste: readonly string[]): string => [...liste].sort().join(' | ');
const paires = (liste: ReadonlyArray<readonly [string, string]> | ReadonlyArray<{ id: string; motif: string }>): string[] =>
  liste.map((entree) => (Array.isArray(entree) ? `${entree[0]}:${entree[1]}` : `${(entree as { id: string }).id}:${(entree as { motif: string }).motif}`));

function lotDe(corrections: readonly Correction[]) {
  return corrections;
}

export async function jouerEcriture(fabrique: () => Scenario, juger: boolean, variante: Variante): Promise<SortieDeCas> {
  const scenario = fabrique();
  const { mondes } = scenario;
  const analyses = scenario.corrections === undefined ? await Promise.all(mondes.map((monde) => lireLaPage(monde.spec))) : [];
  const modeles = new Map<string, ModeleDeRegles>(analyses.flatMap((lecture) => [...lecture.modeles]));
  const dAnalyse = analyses.flatMap((lecture) => lecture.constats.flatMap((constat) => (constat.correction?.sorte === 'regles' ? [constat.correction] : [])));
  let corrections = (scenario.corrections ?? dAnalyse).filter(scenario.retenir ?? (() => true));
  if (variante.melange !== undefined) corrections = melanger(mulberry32(graineDe(variante.melange, 'corrections')), corrections);
  scenario.muter?.();
  const atelier = atelierDEcriture({});
  const api = atelier.api as unknown as ApiDeLiaisons;
  if (scenario.fautes?.commitUndoLeve) {
    (api as unknown as { commitUndo(): void }).commitUndo = () => { atelier.journal.push('commitUndo'); throw new Error('Figma refuse le point d’annulation'); };
  }
  const options = { modeles: scenario.sansModeles ? new Map() : modeles, portDeRegles: portDeMondes(mondes, scenario.fautes ?? {}) };
  const rendu = await ecrireLeLot(lotDe(corrections), options, api);
  const rendu2 = scenario.secondPassage ? await ecrireLeLot(lotDe(corrections), options, api) : undefined;
  const apres = juger ? (await Promise.all(mondes.map((monde) => lireLaPage(monde.spec)))).flatMap((lecture) => lecture.constats) : [];
  return {
    constats: apres,
    donnees: {
      rendu, rendu2, appels: mondes.flatMap((monde) => monde.appels), undo: atelier.journal.filter((ligne) => ligne === 'commitUndo').length,
      envoyees: corrections.length,
    },
  };
}

export function verifierLEcriture(attendu: Attendu) {
  return (sortie: SortieDeCas): string[] => {
    const messages: string[] = [];
    const d = sortie.donnees as { rendu: { ecrites: string[]; sautees: { id: string; motif: string }[] }; rendu2?: { ecrites: string[]; sautees: { id: string; motif: string }[] }; appels: string[]; undo: number };
    const compare = (nom: string, obtenu: readonly string[], voulu: readonly string[]): void => {
      if (trie(obtenu) !== trie(voulu)) messages.push(`${nom} : [${obtenu.join(', ')}], attendu [${voulu.join(', ')}]`);
    };
    compare('écrites', d.rendu.ecrites, attendu.ecrites);
    compare('sautées', paires(d.rendu.sautees), paires(attendu.sautees));
    compare('appels d’écriture', d.appels, attendu.appels);
    const undoVoulu = (attendu.ecrites.length + (attendu.ecrites2?.length ?? 0)) > 0 ? 1 : 0;
    const undoObtenu = d.undo;
    const attendus = d.rendu2 ? (attendu.ecrites.length > 0 ? 1 : 0) : undoVoulu;
    if (undoObtenu !== attendus) messages.push(`${undoObtenu} point(s) d’annulation, attendu ${attendus}`);
    if (attendu.ecrites2 && d.rendu2) {
      compare('écrites au second passage', d.rendu2.ecrites, attendu.ecrites2);
      compare('sautées au second passage', paires(d.rendu2.sautees), paires(attendu.sautees2 ?? []));
    }
    return messages;
  };
}

function ecriture(registre: Registre, operateur: string, description: string, fabrique: () => Scenario, attendu: Attendu, apres: readonly AttenduF8[] | null, plus: Partial<DefinitionDeCas> = {}): void {
  registre.ajouter(operateur, {
    description, attendus: apres ?? [], codesJuges: ['C43', 'C45'], relations: ['ordre'],
    jouer: (variante) => jouerEcriture(fabrique, apres !== null, variante), verifier: verifierLEcriture(attendu), ...plus,
  });
}

export const sansConteneur = (): SpecDePage => ({ ...specR0(), conteneurs: [] });
export const monde = (spec: SpecDePage): MondeEnEcriture => new MondeEnEcriture(spec);
const nombreDeR0 = (): number => nombreDeReglesDuJeu(specR0().proprietes);

// ---------------------------------------------------------------------------------------------------------------------------
// E1 : creer

function operateursE1(registre: Registre): void {
  const n = nombreDeR0();
  const e1 = (description: string, fabrique: () => Scenario, attendu: Attendu, apres: readonly AttenduF8[], plus: Partial<DefinitionDeCas> = {}): void =>
    ecriture(registre, 'E1', description, fabrique, attendu, apres, plus);
  const saute = (motif: string, appels: string[] = []): Attendu => ({ ecrites: [], sautees: [[creer(), motif]], appels });
  e1('nominal', () => ({ mondes: [monde(sansConteneur())] }), { ecrites: [creer()], sautees: [], appels: ['creer'] }, []);
  e1('composant disparu', () => ({ mondes: [monde(sansConteneur())], fautes: { composantDisparu: true } }), saute('objet-change'), [attenduC43(n)]);
  e1('conteneur apparu depuis l’analyse', () => {
    const m = monde(sansConteneur());
    return { mondes: [m], muter: () => { m.spec = specR0(); } };
  }, saute('objet-change'), []);
  e1('modèle absent', () => ({ mondes: [monde(sansConteneur())], sansModeles: true }), saute('objet-change'), [attenduC43(n)], { rattachement: HYPOTHESES.H12 });
  e1('sources absentes', () => ({ mondes: [monde(sansConteneur())], fautes: { resoudreRefuse: true } }), saute('erreur'), [attenduC43(n)]);
  e1('`creer` lève', () => ({ mondes: [monde(sansConteneur())], fautes: { creerLeve: true } }), saute('erreur', ['creer']), [attenduC43(n)]);
  e1('`resoudre` lève', () => ({ mondes: [monde(sansConteneur())], fautes: { resoudreLeve: true } }), saute('erreur'), [attenduC43(n)]);
  e1('`commitUndo` lève', () => ({ mondes: [monde(sansConteneur())], fautes: { commitUndoLeve: true } }), { ecrites: [creer()], sautees: [], appels: ['creer'] }, []);
}

// ---------------------------------------------------------------------------------------------------------------------------
// E2 : ajouter

function operateursE2(registre: Registre): void {
  const base = specR0();
  const propriete = (nom: string) => base.proprietes.find((entree) => entree.nom === nom)!;
  const sans = (...noms: string[]): SpecDePage => avecLesRegles(base, noms.reduce((regles, nom) => sansLesReglesDe(regles, cleDeLaPropriete(propriete(nom))), reglesDe(base)));
  const cle = (nom: string): string => cleDeLaPropriete(propriete(nom));
  const restant = (nom: string): AttenduF8 => attenduSansRegle(cle(nom), ciblesDe(propriete(nom)).length);
  const e2 = (description: string, fabrique: () => Scenario, attendu: Attendu, apres: readonly AttenduF8[] | null, plus: Partial<DefinitionDeCas> = {}): void =>
    ecriture(registre, 'E2', description, fabrique, attendu, apres, plus);
  const un = (): MondeEnEcriture => monde(sans('Has Icon'));
  e2('une propriété', () => ({ mondes: [un()] }), { ecrites: [ajouter('hasIcon')], sautees: [], appels: ['ajouter'] }, []);
  e2('trois propriétés du même composant, un seul appel', () => ({ mondes: [monde(sans('Has Icon', 'Loading', 'Size'))] }), {
    ecrites: [ajouter('hasIcon'), ajouter('loading'), ajouter('size')], sautees: [], appels: ['ajouter'],
  }, []);
  e2('deux composants', () => ({
    mondes: [un(), monde({ ...avecLesRegles(specDeLaForme('switch-4'), sansLesReglesDe(reglesDe(specDeLaForme('switch-4')), 'checked')), id: '11:1' })],
  }), { ecrites: [ajouter('hasIcon'), ajouter('checked', '11:1')], sautees: [], appels: ['ajouter', 'ajouter'] }, []);
  e2('conteneur absent', () => {
    const m = un();
    return { mondes: [m], muter: () => { m.spec = { ...m.spec, conteneurs: [] }; } };
  }, { ecrites: [], sautees: [[ajouter('hasIcon'), 'objet-change']], appels: [] }, null);
  e2('second passage', () => ({ mondes: [un()], secondPassage: true }), {
    ecrites: [ajouter('hasIcon')], sautees: [], appels: ['ajouter'], ecrites2: [], sautees2: [[ajouter('hasIcon'), 'objet-change']],
  }, []);
  e2('une règle déjà posée et une à poser', () => {
    const m = monde(sans('Has Icon', 'Loading'));
    return { mondes: [m], muter: () => { m.poser([{ tag: 'boolean', cible: 'hasIcon', contenu: REDIGE_OU_MARQUE }], false); } };
  }, { ecrites: [ajouter('loading')], sautees: [[ajouter('hasIcon'), 'objet-change']], appels: ['ajouter'] }, []);
  e2('sources absentes', () => ({ mondes: [un()], fautes: { resoudreRefuse: true } }), { ecrites: [], sautees: [[ajouter('hasIcon'), 'erreur']], appels: [] }, [restant('Has Icon')]);
  e2('`ajouter` lève', () => ({ mondes: [un()], fautes: { ajouterLeve: true } }), { ecrites: [], sautees: [[ajouter('hasIcon'), 'erreur']], appels: ['ajouter'] }, [restant('Has Icon')]);
  e2('composant disparu', () => ({ mondes: [un()], fautes: { composantDisparu: true } }), { ecrites: [], sautees: [[ajouter('hasIcon'), 'objet-change']], appels: [] }, [restant('Has Icon')]);
  e2('cible présente marquée « [À compléter] »', () => {
    const m = un();
    return { mondes: [m], muter: () => { m.poser([{ tag: 'boolean', cible: 'hasIcon', contenu: MARQUE }], false); } };
  }, { ecrites: [], sautees: [[ajouter('hasIcon'), 'objet-change']], appels: [] }, []);
}

const REDIGE_OU_MARQUE = 'Règle posée entre l’analyse et l’écriture.';

// ---------------------------------------------------------------------------------------------------------------------------
// E3 : retirer

function operateursE3(registre: Registre): void {
  const retirer: Correction = { id: 'regles:retirer:10:1', sorte: 'regles', cible: { layer: ID_DU_COMPOSANT }, avant: null, apres: { nom: 'retirer' }, aRelire: { regle: 'regles', avant: null } };
  ecriture(registre, 'E3', '`retirer` sur une instance remplie', () => ({ mondes: [monde(specR0())], corrections: [retirer] }), { ecrites: [], sautees: [[retirer.id, 'instance-remplie']], appels: [] }, null);
  ecriture(registre, 'E3', '`retirer` sur un composant sans instance', () => ({ mondes: [monde(sansConteneur())], corrections: [retirer] }), { ecrites: [], sautees: [[retirer.id, 'objet-change']], appels: [] }, null);
}

// ---------------------------------------------------------------------------------------------------------------------------
// E4 : lot mixte

const CIBLE: VariableDEcriture = { id: 'V:1', key: 'k-cible', name: 'button/size/md/padding-x' };
const ANCIENNE: VariableDEcriture = { id: 'V:0', key: 'k-ancienne', name: 'button/size/sm/padding-x' };

const liaison: Correction = { id: 'liaison:1', sorte: 'liaison', cible: { layer: '1:1', champ: 'paddingLeft' }, avant: null, apres: { cle: CIBLE.key, nom: CIBLE.name }, aRelire: { regle: 'liaisons', avant: null } };
const renommage: Correction = { id: 'nom:1', sorte: 'nom-de-valeur', cible: { layer: 'jeu', champ: 'Size' }, avant: 'Medium', apres: { nom: 'md' }, aRelire: { regle: 'valeurs', avant: 'Medium' } };

interface LotMixte {
  readonly liaisons?: boolean;
  readonly regles?: 'ecrit' | 'saute' | 'aucune';
  readonly hors?: boolean;
  readonly vide?: boolean;
}

async function jouerLotMixte(lot: LotMixte, variante: Variante): Promise<SortieDeCas> {
  const a = atelierDEcriture({ importables: [CIBLE], lisibles: [ANCIENNE], ...(lot.hors ? { declaration: texteDeLArchitectureDuFichier(false) } : {}) });
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  a.jeuDeVariants('jeu', ['Size=Medium, State=default']);
  const m = monde(sansConteneur());
  const lecture = await lireLaPage(m.spec);
  const creerLa = lecture.constats.flatMap((constat) => (constat.correction ? [constat.correction] : []));
  const liaisonCorrection = lot.liaisons === false ? { ...liaison, cible: { layer: '9:9', champ: 'paddingLeft' } } : liaison;
  let corrections: Correction[] = lot.vide ? [] : [liaisonCorrection, ...creerLa, renommage];
  if (variante.melange !== undefined) corrections = melanger(mulberry32(graineDe(variante.melange, 'lot')), corrections);
  const port = portDeMondes([m], { composantDisparu: lot.regles === 'saute' });
  const rendu = await ecrireLeLot(corrections, { modeles: lecture.modeles, portDeRegles: port }, a.api as unknown as ApiDeLiaisons);
  const sorteDe = (id: string): 'liaison' | 'regles' | 'nom-de-valeur' => corrections.find((correction) => correction.id === id)!.sorte as never;
  const compte = { liaison: 0, regles: 0, 'nom-de-valeur': 0 };
  for (const id of rendu.ecrites) compte[sorteDe(id)] += 1;
  return {
    constats: [],
    donnees: { rendu, appels: m.appels, undo: a.journal.filter((ligne) => ligne === 'commitUndo').length, resume: resumeDuLot(compte.liaison, compte.regles, rendu.sautees, compte['nom-de-valeur']) },
  };
}

function operateursE4(registre: Registre): void {
  const e4 = (description: string, lot: LotMixte, attendu: { ecrites: readonly string[]; sautees: ReadonlyArray<readonly [string, string]>; undo: number; resume: string }): void => {
    registre.ajouter('E4', {
      description, attendus: [], relations: ['ordre'], jouer: (variante) => jouerLotMixte(lot, variante),
      verifier: (sortie) => {
        const d = sortie.donnees as { rendu: { ecrites: string[]; sautees: { id: string; motif: string }[] }; undo: number; resume: string };
        const messages: string[] = [];
        if (trie(d.rendu.ecrites) !== trie(attendu.ecrites)) messages.push(`écrites [${d.rendu.ecrites.join(', ')}], attendu [${attendu.ecrites.join(', ')}]`);
        if (trie(paires(d.rendu.sautees)) !== trie(paires(attendu.sautees))) messages.push(`sautées [${paires(d.rendu.sautees).join(', ')}], attendu [${paires(attendu.sautees).join(', ')}]`);
        if (d.undo !== attendu.undo) messages.push(`${d.undo} point(s) d’annulation, attendu ${attendu.undo}`);
        if (d.resume !== attendu.resume) messages.push(`résumé « ${d.resume} », attendu « ${attendu.resume} »`);
        return messages;
      },
    });
  };
  const tout = [liaison.id, creer(), renommage.id];
  e4('liaisons, règles et noms, tout passe', {}, { ecrites: tout, sautees: [], undo: 1, resume: '1 layer lié, 1 instance de règles créée, 1 valeur de variante renommée' });
  e4('les règles sautent', { regles: 'saute' }, {
    ecrites: [liaison.id, renommage.id], sautees: [[creer(), 'objet-change']], undo: 1,
    resume: '1 layer lié, 1 valeur de variante renommée. 1 correction sautée : 1 car le composant a changé depuis l’analyse.',
  });
  e4('les liaisons sautent', { liaisons: false }, {
    ecrites: [creer(), renommage.id], sautees: [[liaison.id, 'objet-change']], undo: 1,
    resume: '1 instance de règles créée, 1 valeur de variante renommée. 1 correction sautée : 1 car le composant a changé depuis l’analyse.',
  });
  e4('fichier hors UCM', { hors: true }, {
    ecrites: [], sautees: [[liaison.id, 'non-ucm'], [creer(), 'non-ucm'], [renommage.id, 'non-ucm']], undo: 0,
    resume: 'Aucune correction écrite. 3 corrections sautées : 3 car le fichier ne déclare plus UCM.',
  });
  e4('lot vide', { vide: true }, { ecrites: [], sautees: [], undo: 0, resume: 'Aucune correction écrite' });
}

// ---------------------------------------------------------------------------------------------------------------------------
// E5 : modèles retenus

type Etape = { releve: 'sans' | 'ajout' | 'conforme' | 'autre'; partiel?: boolean; annuler?: boolean; prelecture?: boolean };

async function jouerLesModeles(etapes: readonly Etape[]): Promise<SortieDeCas> {
  retenirLesModeles(null);
  reinitialiserLAnalyse();
  const releves = {
    sans: (await lireLaPage(sansConteneur())).releve,
    ajout: (await lireLaPage(avecLesRegles(specR0(), sansLesReglesDe(reglesDe(specR0()), 'hasIcon')))).releve,
    conforme: (await lireLaPage(specR0())).releve,
    autre: (await lireLaPage({ ...avecLesRegles(specDeLaForme('switch-4'), sansLesReglesDe(reglesDe(specDeLaForme('switch-4')), 'checked')), id: '11:1' })).releve,
  };
  const b = await banc(PROFIL_A0);
  const clesParEtape: string[][] = [];
  try {
    for (const etape of etapes) {
      const lecteurs: Lecteurs = {
        ...b.lecteurs,
        moteur: async () => {
          const moteur = await b.lecteurs.moteur({} as never, { leve: false }, b.contexte);
          return etape.partiel ? { etat: 'calculee', interne: { ...(moteur as { interne: object }).interne, couverture: { etat: 'partielle', lus: 1, nonLus: 1 } } as never } : moteur;
        },
        regles: async () => {
          if (etape.annuler) await traiterAvec(lecteurs, OPTIONS_SANS_ATTENTE)({ type: 'annuler-analyse', analyse: analyseCourante()! }, b.contexte);
          return releves[etape.releve];
        },
      };
      await traiterAvec(lecteurs, OPTIONS_SANS_ATTENTE)({ type: 'analyser', ...(etape.prelecture ? { origine: 'prelecture' as const } : {}) }, b.contexte);
      clesParEtape.push([...modelesDeLAnalyse().keys()]);
    }
  } finally {
    reinitialiserLAnalyse();
  }
  const cles = clesParEtape[clesParEtape.length - 1] ?? [];
  retenirLesModeles(null);
  return { constats: [], donnees: { cles, clesParEtape } };
}

function operateursE5(registre: Registre): void {
  const e5 = (description: string, etapes: readonly Etape[], attendues: readonly string[]): void => {
    registre.ajouter('E5', {
      description, attendus: [], relations: ['ordre'], jouer: () => jouerLesModeles(etapes),
      verifier: (sortie) => {
        const cles = (sortie.donnees?.cles ?? []) as string[];
        return trie(cles) === trie(attendues) ? [] : [`modèles retenus [${cles.join(', ')}], attendu [${attendues.join(', ')}]`];
      },
    });
  };
  e5('après une seconde analyse', [{ releve: 'sans' }, { releve: 'conforme' }], []);
  e5('après une prélecture annulée', [{ releve: 'ajout' }, { releve: 'sans', prelecture: true, annuler: true }], [ajouter('hasIcon')]);
  e5('après un moteur partiel', [{ releve: 'ajout' }, { releve: 'ajout', partiel: true }], []);
  e5('après une annulation en phase `regles`', [{ releve: 'ajout' }, { releve: 'sans', annuler: true }], [ajouter('hasIcon')]);
  e5('deux composants analysés l’un après l’autre', [{ releve: 'ajout' }, { releve: 'autre' }], [ajouter('checked', '11:1')]);
}

// ---------------------------------------------------------------------------------------------------------------------------
// E6 : phrase du résumé de lot

function operateursE6(registre: Registre): void {
  const MOTIFS_BRUTS = ['objet-change', 'instance-remplie', 'erreur', 'non-ucm', 'fait-faux', 'cible-introuvable'];
  const e6 = (description: string, appel: Parameters<typeof resumeDuLot>, motif: RegExp): void => {
    registre.ajouter('E6', {
      description, attendus: [], relations: [],
      jouer: async () => ({ constats: [], donnees: { resume: resumeDuLot(...appel) } }),
      verifier: (sortie) => {
        const resume = String(sortie.donnees?.resume);
        const messages: string[] = [];
        if (!motif.test(resume)) messages.push(`résumé « ${resume} » : la forme « N car <raison> » manque`);
        for (const brut of MOTIFS_BRUTS) if (resume.includes(brut)) messages.push(`résumé « ${resume} » : le motif brut « ${brut} » apparaît`);
        return messages;
      },
    });
  };
  const sautee = (motif: string) => ({ motif });
  e6('`objet-change`', [0, 0, [sautee('objet-change')]], /^Aucune correction écrite\. 1 correction sautée : 1 car [^.]+\.$/);
  e6('`instance-remplie`', [0, 0, [sautee('instance-remplie')]], /^Aucune correction écrite\. 1 correction sautée : 1 car [^.]+\.$/);
  e6('`erreur`', [0, 0, [sautee('erreur')]], /^Aucune correction écrite\. 1 correction sautée : 1 car [^.]+\.$/);
  e6('`non-ucm`', [0, 0, [sautee('non-ucm')]], /^Aucune correction écrite\. 1 correction sautée : 1 car [^.]+\.$/);
  e6('un mélange de motifs', [1, 0, [sautee('objet-change'), sautee('objet-change'), sautee('erreur')]], /^1 layer lié\. 3 corrections sautées : 2 car [^,]+, 1 car [^.]+\.$/);
  e6('le pluriel', [2, 2, [sautee('erreur'), sautee('erreur')], 0], /^2 layers liés, 2 instances de règles créées\. 2 corrections sautées : 2 car [^.]+\.$/);
}

export function operateursEcriture(): CasF8[] {
  const registre = new Registre('F8');
  operateursE1(registre);
  operateursE2(registre);
  operateursE3(registre);
  operateursE4(registre);
  operateursE5(registre);
  operateursE6(registre);
  return registre.cas;
}
