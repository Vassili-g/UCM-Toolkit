/**
 * La chaîne du stress test F3 et F4, de l'analyse du sandbox à l'écran : un composant fabriqué passe par `traiterAvec` de
 * `sandbox/analyse.ts` sur des lecteurs doubles, ses messages entrent dans l'état de l'interface par `recevoirUneAnalyse`, et le vrai
 * panneau (`monterLePanneau`) se monte sur le faux DOM de `tests/domDeTest.ts`. Le harnais lit ensuite les cartes, les cases, le pied
 * et les boutons, applique des gestes (cocher, ouvrir une section, appliquer) et lit les réponses du sandbox.
 *
 * Ce module ne contient aucun cas. Il fournit la chaîne (`lancerLaChaine`), l'écran (`Ecran`) et les contrôles des propriétés P11 à
 * P16, P18 et P19 du plan : un contrôle rend la liste de ses écarts (`EcartDEcran`), vide quand la propriété tient. Les résultats
 * attendus de l'écran viennent des réponses Q-03, Q-09 et Q-11 de l'inventaire : le code actuel ne les tient pas, et le harnais les
 * mesure comme des écarts sans les contourner. Le sandbox garde un état global (`reinitialiserLAnalyse`) : les chaînes se lancent
 * l'une après l'autre.
 */
import type { CatalogueDeReference, Constat, Correction, ReleveDeComposant } from '@ucm-kit/core/controles';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import type { LectureDeComposant } from '../../../src/composant';
import type { PluginMessage } from '../../../src/messages';
import type { IdentiteDAnalyse } from '../../../src/messages/commun';
import { reinitialiserLAnalyse, traiterAvec as traiterAnalyse, type Lecteurs } from '../../../src/sandbox/analyse';
import { traiterAvec as traiterCorrections } from '../../../src/sandbox/corrections';
import type { Contexte } from '../../../src/sandbox/contexte';
import { traiter as traiterQuestions } from '../../../src/sandbox/questions';
import type { AnalyseRecue } from '../../../src/ui/composant/analyse';
import { noterLEnvoi, recevoirUneAnalyse } from '../../../src/ui/composant/analyse';
import { etatInitial, type Etat } from '../../../src/ui/etat';
import { carteDAFaire } from '../../../src/ui/ignores/modele';
import { elementsDuPanneau, type PanneauParElements } from '../../../src/ui/panneau/elements';
import { TEXTES } from '../../../src/ui/textes';
import { comme, ElementDeTest, poserLeDom } from '../../../tests/domDeTest';
import { CODES_DE_LA_PORTEE } from '../../../../kit/tests/stress/f3-composant/composantDeBase';
import type { AtelierDuComposant } from './atelierDuComposant';

poserLeDom();

// L'interface lit `document` à l'appel : le panneau se charge après la pose du faux DOM.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { monterLePanneau } = require('../../../src/ui/analyse') as typeof import('../../../src/ui/analyse');

// ---------------------------------------------------------------------------------------------------------------------------
// La chaîne

export interface PointDuMoteur { readonly point: PointACorriger; readonly noeuds: readonly string[] }

export interface ParametresDeChaine {
  readonly releve: ReleveDeComposant;
  readonly catalogue: CatalogueDeReference;
  /** La déclaration du fichier ; UCM par défaut. */
  readonly declaration?: 'ucm' | 'libre' | 'absente';
  readonly moteur?: { readonly points?: readonly PointDuMoteur[]; readonly partiel?: boolean };
  /** `echec` : la lecture des ignorés lève, comme le refus de Figma. */
  readonly ignores?: 'echec' | readonly string[];
  /** La library que la Configuration annonce ; absente : aucune annonce. */
  readonly reference?: Etat['reference'];
}

type MessageRecuParLInterface = Parameters<typeof recevoirUneAnalyse>[1];
const TYPES_RECUS = new Set<string>(['analyse-commencee', 'analyse-en-cours', 'analyse-provisoire', 'analyse', 'perime', 'occupe', 'corrections-appliquees', 'ignores', 'question-repondue', 'modele-propose', 'liaisons-preparees']);

function moteurDouble(moteur: ParametresDeChaine['moteur']): ResultatSansPublication {
  const points = moteur?.points ?? [];
  const phrases = points.map(({ point }) => phraseDe(point));
  const interne = {
    warnings: phrases,
    parties: new Map(points.map(({ point }, rang) => [phrases[rang], point])),
    localisations: new Map(points.map(({ noeuds }, rang) => [phrases[rang], [...noeuds]])),
    couverture: { etat: moteur?.partiel ? 'partielle' : 'complete' },
  } as unknown as ResultatInterne;
  return { etat: 'calculee', interne };
}

export interface Chaine {
  readonly releve: ReleveDeComposant;
  readonly catalogue: CatalogueDeReference;
  readonly messages: PluginMessage[];
  readonly contexte: Contexte;
  readonly ecran: Ecran;
  /** L'identité de la dernière analyse. */
  identite(): IdentiteDAnalyse;
  /** Le dernier message `analyse` du sandbox. */
  final(): Extract<PluginMessage, { type: 'analyse' }>;
  provisoire(): Extract<PluginMessage, { type: 'analyse-provisoire' }> | undefined;
  /** Une nouvelle analyse du même composant : l'identité change, comme à la relecture. */
  relancer(): Promise<void>;
  repondre(question: string, reponse: string): Promise<void>;
  servirDeModele(variant: string): Promise<void>;
  /** Le sandbox écrit ces corrections sur le double de Figma, comme `appliquer-corrections`, et l'interface reçoit sa réponse. */
  appliquer(ids: readonly string[], atelier: AtelierDuComposant): Promise<void>;
  /** Un changement du document, comme Ctrl+Z : le sandbox périme l'analyse. */
  perimer(): void;
  /** Les identifiants des constats que le sandbox a rangés comme ignorés. */
  ignorer(ids: readonly string[]): void;
}

export async function lancerLaChaine(parametres: ParametresDeChaine): Promise<Chaine> {
  const releve = structuredClone(parametres.releve);
  const catalogue = structuredClone(parametres.catalogue);
  reinitialiserLAnalyse();
  const etat = etatInitial();
  const messages: PluginMessage[] = [];
  const declaration = parametres.declaration === 'absente' ? '' : texteDeLArchitectureDuFichier((parametres.declaration ?? 'ucm') === 'ucm');
  const contexte: Contexte = {
    figma: { root: { getSharedPluginData: () => declaration } } as unknown as PluginAPI,
    envoyer: (message) => {
      messages.push(message);
      if (TYPES_RECUS.has(message.type)) recevoirUneAnalyse(etat, message as MessageRecuParLInterface);
    },
    surveillerLeDocument() {},
  };
  etat.architecture = parametres.declaration === undefined ? 'ucm' : parametres.declaration;
  if (parametres.reference !== undefined) etat.reference = parametres.reference;
  const noeuds = [releve.jeu.id, ...releve.variants.flatMap((variant) => [variant.id, ...variant.layers.map((layer) => layer.id)])];
  const lecteurs: Lecteurs = {
    sujet: async () => ({ cle: releve.jeu.cle, noeud: { id: releve.jeu.id } as never, noeuds }),
    releve: async () => ({ statut: 'lu', releve }),
    catalogue: async () => catalogue,
    moteur: async () => moteurDouble(parametres.moteur),
    ignores: async () => {
      if (parametres.ignores === 'echec') throw new Error('Figma refuse');
      return parametres.ignores ?? [];
    },
  };
  const analyser = traiterAnalyse(lecteurs, { horloge: () => 0, respirer: async () => {} });
  const lectureDuComposant = lectureFabriquee(releve);
  etat.composant = { ...etat.composant, lecture: lectureDuComposant };
  const ecran = new Ecran(etat, lectureDuComposant);

  const chaine: Chaine = {
    releve, catalogue, messages, contexte, ecran,
    identite: () => (etat.analyse as AnalyseRecue).identite,
    final: () => [...messages].reverse().find((message) => message.type === 'analyse') as Extract<PluginMessage, { type: 'analyse' }>,
    provisoire: () => [...messages].reverse().find((message) => message.type === 'analyse-provisoire') as Extract<PluginMessage, { type: 'analyse-provisoire' }> | undefined,
    async relancer() {
      await analyser({ type: 'analyser' }, contexte);
      ecran.mettreAJour();
    },
    async repondre(question, reponse) {
      await traiterQuestions({ type: 'repondre', analyse: chaine.identite(), question, reponse }, contexte);
      ecran.mettreAJour();
    },
    async servirDeModele(variant) {
      await traiterCorrections({ lot: async () => ({ ecrites: [], sautees: [] }), selectionner: async () => undefined })({ type: 'servir-de-modele', analyse: chaine.identite(), variant }, contexte);
      ecran.mettreAJour();
    },
    async appliquer(ids, atelier) {
      noterLEnvoi(etat, ids, ids.length);
      await traiterCorrections({ lot: (corrections) => atelier.ecrire(corrections).then(({ resultat }) => resultat), selectionner: async () => undefined })({ type: 'appliquer-corrections', analyse: chaine.identite(), ids: [...ids] }, contexte);
      ecran.mettreAJour();
    },
    perimer() {
      contexte.envoyer({ type: 'perime', analyse: chaine.identite(), cause: 'document' });
      ecran.mettreAJour();
    },
    ignorer(ids) {
      contexte.envoyer({ type: 'ignores', analyse: chaine.identite(), constats: [...ids] });
      ecran.mettreAJour();
    },
  };
  await chaine.relancer();
  return chaine;
}

/** L'écran d'une interface neuve qui n'a reçu que les messages d'avant le résultat final : le provisoire. */
export function ecranDuProvisoire(chaine: Chaine): Ecran {
  const etat = etatInitial();
  etat.architecture = 'ucm';
  etat.composant = { ...etat.composant, lecture: chaine.ecran.lecture };
  for (const message of chaine.messages) {
    if (message.type === 'analyse') break;
    if (TYPES_RECUS.has(message.type)) recevoirUneAnalyse(etat, message as MessageRecuParLInterface);
  }
  return new Ecran(etat, chaine.ecran.lecture);
}

/** La lecture du composant que la vue Composant donnerait : le jeu, ses variants et le nom de chaque layer. */
function lectureFabriquee(releve: ReleveDeComposant): LectureDeComposant {
  const calques = new Map<string, string>();
  for (const variant of releve.variants) for (const layer of variant.layers) if (!calques.has(layer.id)) calques.set(layer.id, layer.nom);
  return {
    sujet: { id: releve.jeu.id, nom: releve.jeu.nom, type: 'COMPONENT_SET', variant: null, variants: releve.variants.map(({ id, nom }) => ({ id, nom })) },
    ancetres: [], calques: [...calques].map(([id, nom]) => ({ id, nom })), liaisons: [], styles: [], usagesDeStyle: [], directes: [],
    releve: { collections: [], variables: [] }, calquesNonLus: 0, erreurs: [],
  } as unknown as LectureDeComposant;
}

// ---------------------------------------------------------------------------------------------------------------------------
// L'écran

export interface EnvoisDeLEcran {
  readonly appliquer: Array<{ ids: readonly string[]; liaisons: number }>;
  readonly ignorees: string[];
  readonly propositionsIgnorees: string[];
  readonly nePlusIgnorees: string[];
  readonly reponses: Array<{ question: string; reponse: string }>;
  readonly annulees: string[];
  readonly selections: Array<readonly string[]>;
}

/** Le texte d'un nœud du faux DOM, sans les blancs doubles. */
export const texteDe = (element: ElementDeTest): string => element.textContent.replace(/\s+/g, ' ').trim();

export class Ecran {
  readonly envois: EnvoisDeLEcran = { appliquer: [], ignorees: [], propositionsIgnorees: [], nePlusIgnorees: [], reponses: [], annulees: [], selections: [] };
  readonly panneau: ReturnType<typeof monterLePanneau>;
  readonly racine: ElementDeTest;

  constructor(readonly etat: Etat, readonly lecture: LectureDeComposant) {
    const envois = this.envois;
    const app = {
      etat,
      appliquer: (ids: readonly string[], liaisons: number) => envois.appliquer.push({ ids, liaisons }),
      selectionner: (layers: readonly string[]) => envois.selections.push(layers),
      ignorerLaProposition: (constats: readonly Constat[]) => envois.propositionsIgnorees.push(...constats.map(({ id }) => id)),
      repondre: (question: string, reponse: string) => envois.reponses.push({ question, reponse }),
      annulerLaReponse: (question: string) => envois.annulees.push(question),
      ignorer: (constat: Constat) => envois.ignorees.push(constat.id),
      nePlusIgnorer: (constat: Constat) => envois.nePlusIgnorees.push(constat.id),
      servirDeModele() {}, annulerAnalyse() {}, preparerLeRapport() {}, ouvrirLaConfiguration() {}, rendre() {},
    };
    const vue = { poserLaSelectionDuPlugin() {}, poserLesCorrections() {} };
    this.panneau = monterLePanneau(app as never, vue as never);
    this.racine = comme(this.panneau.element);
  }

  get analyse(): AnalyseRecue { return this.etat.analyse as AnalyseRecue; }

  /** Redessine comme l'application le fait à chaque message. */
  mettreAJour(): void { this.panneau.mettreAJour(); }

  /** Clique chaque bande de section repliée jusqu'à ce que toutes soient ouvertes : les cartes d'une section repliée ne se dessinent pas. */
  ouvrirToutes(): void {
    for (let garde = 0; garde < 40; garde++) {
      const fermee = this.racine.querySelectorAll('.bande-element').find((bande) => bande.getAttribute('aria-expanded') === 'false');
      if (!fermee) return;
      fermee.clic();
    }
  }

  texte(): string { return texteDe(this.racine); }

  /** Les sections du panneau qui portent des points. */
  sections(): ElementDeTest[] { return this.racine.querySelectorAll('.section-element').filter((section) => section.querySelector('.bande-element[aria-expanded]') !== null); }

  /** Les cartes de corrections : celles dont une ligne de diff porte une case. La carte de modèle d'un C81 a un diff sans case : c'est une carte À faire. */
  cartesDeCorrections(racine: ElementDeTest = this.racine): ElementDeTest[] { return racine.querySelectorAll('.bloc').filter((carte) => this.casesDeLignes(carte).length > 0); }
  cartesDeQuestions(): ElementDeTest[] { return this.racine.querySelectorAll('.question'); }
  cartesAFaire(): ElementDeTest[] { return this.racine.querySelectorAll('.bloc').filter((carte) => this.casesDeLignes(carte).length === 0); }

  /** Les cases des lignes de diff d'un conteneur : une case par correction ou par ligne de taille. */
  casesDeLignes(racine: ElementDeTest = this.racine): ElementDeTest[] { return racine.querySelectorAll('.diff input').filter((element) => element.type === 'checkbox'); }
  casesCochees(racine: ElementDeTest = this.racine): ElementDeTest[] { return this.casesDeLignes(racine).filter((element) => element.checked); }

  pied(): ElementDeTest | null { return this.racine.querySelector('.corrections-pied'); }
  boutonAppliquerTout(): ElementDeTest | null { return this.pied()?.querySelector('.btn-primary') ?? null; }

  /** Les boutons de ce conteneur dont le libellé correspond. */
  boutons(motif: RegExp, racine: ElementDeTest = this.racine): ElementDeTest[] {
    return racine.querySelectorAll('button').filter((bouton) => motif.test(texteDe(bouton)));
  }

  /** Le modèle du panneau, calculé comme `preparer` le fait : une question répondue porte déjà sa correction, une correction écrite n'est plus un point. */
  modele(): PanneauParElements {
    const analyse = this.analyse;
    const ecrites = new Set(analyse.appliquees);
    const constats = analyse.constats
      .map((constat) => {
        const reponse = constat.question === undefined ? undefined : analyse.repondues[constat.question.id];
        return reponse === undefined ? constat : { ...constat, correction: reponse };
      })
      .filter((constat) => constat.correction === undefined || !ecrites.has(constat.correction.id));
    return elementsDuPanneau(constats, this.contexte(), { reponses: analyse.repondues });
  }

  contexte() {
    const analyse = this.analyse;
    return {
      composant: this.lecture.sujet.nom,
      variants: [...analyse.variants, ...this.lecture.sujet.variants.filter((variant) => !analyse.variants.some((lu) => lu.id === variant.id))],
      layers: new Map(this.lecture.calques.map((calque) => [calque.id, calque.nom] as const)),
      library: this.etat.reference?.nom ?? null,
      constats: analyse.constats,
    };
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les écarts de l'écran

export type SorteDEcartDEcran =
  /** P11 : une correction arrive cochée, ou le pied dit qu'une correction l'est. */
  | 'cochee'
  /** P11, P13 : « Tout cocher », « Tout décocher », Ignorer ou « Ne plus proposer » manque. */
  | 'bouton-manquant'
  /** P12, P14 : un constat visible n'a pas de carte, ou une carte de trop. */
  | 'non-affiche'
  /** P12, P14 : un constat visible a deux cartes. */
  | 'affiche-deux-fois'
  /** P15 : une carte sans phrase, sans layer ou sans token lisible. */
  | 'illisible'
  /** P16, P21 : une ligne cochable que l'écriture ne fait pas, ou saute sans motif lisible. */
  | 'non-ecrite'
  /** P18, P19 : une accusation sans lecture, ou « Aucun constat » sur une analyse partielle. */
  | 'accusation'
  /** Un geste de l'écran qui ne rend pas ce que sa propriété décrit. */
  | 'geste-sans-effet';

export interface EcartDEcran {
  readonly propriete: string;
  readonly sorte: SorteDEcartDEcran;
  readonly detail: string;
  /** Les vérifications que cet écart réunit ; 1 par défaut. */
  readonly nombre?: number;
}

/** Un contrôle compté : ses écarts, et le nombre de vérifications qu'il a faites. */
export interface Verification {
  verifiees: number;
  readonly ecarts: EcartDEcran[];
}

export const verification = (): Verification => ({ verifiees: 0, ecarts: [] });

/** Les vérifications échouées : la somme des vérifications que les écarts réunissent. */
export const echouees = (v: Verification): number => v.ecarts.reduce((somme, ecart) => somme + (ecart.nombre ?? 1), 0);

/** Ajoute les vérifications et les écarts de `autre` à `v`. */
export function ajouterLesVerifications(v: Verification, ...autres: readonly Verification[]): Verification {
  for (const autre of autres) {
    v.verifiees += autre.verifiees;
    v.ecarts.push(...autre.ecarts);
  }
  return v;
}

export function verifier(v: Verification, tient: boolean, ecart: EcartDEcran): void {
  v.verifiees++;
  if (!tient) v.ecarts.push(ecart);
}

const TEXTES_DE_CORRECTIONS = TEXTES.correctionsDuComposant;

/** Les codes que les contrôles P14 et P15 jugent : ceux de la portée, plus C30 du moteur. Les autres familles du kit comptent le bruit hors portée. */
export const CODES_DE_L_ECRAN: readonly string[] = [...CODES_DE_LA_PORTEE, 'C30'];
const dansLaPortee = (constat: Pick<Constat, 'code'>): boolean => CODES_DE_L_ECRAN.includes(constat.code);

// P11 -----------------------------------------------------------------------------------------------------------------------

/** P11 : aucune ligne n'est cochée. */
export function controlerLesCases(ecran: Ecran, quand: string): Verification {
  const v = verification();
  ecran.ouvrirToutes();
  const cases = ecran.casesDeLignes();
  const cochees = cases.filter((ligne) => ligne.checked);
  v.verifiees += cases.length;
  if (cochees.length > 0) {
    v.ecarts.push({
      propriete: 'P11', sorte: 'cochee', nombre: cochees.length,
      detail: `${quand} : ${cochees.length} lignes cochées sur ${cases.length} (${cochees.slice(0, 2).map((ligne) => ligne.getAttribute('aria-label') ?? '-').join(' ; ')}…)`,
    });
  }
  return v;
}

/** P11 : le pied dit qu'aucune correction n'est cochée et Appliquer est inactif. */
export function controlerLePied(ecran: Ecran, quand: string): Verification {
  const v = verification();
  const pied = ecran.pied();
  verifier(v, pied !== null, { propriete: 'P11', sorte: 'non-affiche', detail: `${quand} : le pied des corrections est absent` });
  if (pied) {
    const resume = texteDe(pied.querySelector('.corrections-resume') ?? pied);
    verifier(v, resume === TEXTES_DE_CORRECTIONS.aucuneCochee, { propriete: 'P11', sorte: 'cochee', detail: `${quand} : le pied dit « ${resume} », attendu « ${TEXTES_DE_CORRECTIONS.aucuneCochee} »` });
    verifier(v, ecran.boutonAppliquerTout()?.disabled === true, { propriete: 'P11', sorte: 'cochee', detail: `${quand} : Appliquer tout est actif` });
  }
  return v;
}

/** P11 : au premier affichage, à la relecture et après l'ajout d'une correction, aucune ligne n'est cochée, le pied le dit et Appliquer est inactif. */
export function controlerLesCasesDecochees(ecran: Ecran, quand: string): Verification {
  return ajouterLesVerifications(controlerLesCases(ecran, quand), controlerLePied(ecran, quand));
}

export const MOTIF_TOUT_COCHER = /^Tout cocher/;
export const MOTIF_TOUT_DECOCHER = /^Tout décocher/;

/** P11 : chaque section qui porte des corrections a « Tout cocher » et « Tout décocher », et le panneau les mêmes boutons pour toutes. */
export function controlerLesBoutonsDeCochage(ecran: Ecran): Verification {
  const v = verification();
  ecran.ouvrirToutes();
  for (const section of ecran.sections()) {
    if (ecran.cartesDeCorrections(section).length === 0) continue;
    const nom = section.dataset.element ?? '-';
    verifier(v, ecran.boutons(MOTIF_TOUT_COCHER, section).length > 0, { propriete: 'P11', sorte: 'bouton-manquant', detail: `la section ${nom} n'a pas « Tout cocher »` });
    verifier(v, ecran.boutons(MOTIF_TOUT_DECOCHER, section).length > 0, { propriete: 'P11', sorte: 'bouton-manquant', detail: `la section ${nom} n'a pas « Tout décocher »` });
  }
  const horsSection = (motif: RegExp): boolean => ecran.boutons(motif).some((bouton) => !ecran.sections().some((section) => section.contains(bouton)));
  verifier(v, horsSection(MOTIF_TOUT_COCHER), { propriete: 'P11', sorte: 'bouton-manquant', detail: 'le panneau n\'a pas « Tout cocher »' });
  verifier(v, horsSection(MOTIF_TOUT_DECOCHER), { propriete: 'P11', sorte: 'bouton-manquant', detail: 'le panneau n\'a pas « Tout décocher »' });
  return v;
}

/** Coche à la main toutes les lignes que l'écran laisse décochées : le geste du designer, avant Appliquer. */
export function cocherAMain(ecran: Ecran): number {
  let coches = 0;
  for (const ligne of ecran.casesDeLignes()) {
    if (ligne.checked) continue;
    ligne.clic();
    coches++;
  }
  return coches;
}

// P13 -----------------------------------------------------------------------------------------------------------------------

export const MOTIF_IGNORER = /^Ignorer$/;
export const MOTIF_NE_PLUS_PROPOSER = /^Ne plus proposer/;

/** P13 : chaque carte de question offre Ignorer et « Ne plus proposer » ; `facette` limite le contrôle à l'un des deux boutons. */
export function controlerLesBoutonsDeQuestion(ecran: Ecran, facette: 'ignorer' | 'ne-plus-proposer' | 'les-deux' = 'les-deux'): Verification {
  const v = verification();
  const cartes = ecran.cartesDeQuestions();
  verifier(v, cartes.length > 0, { propriete: 'P13', sorte: 'non-affiche', detail: 'aucune carte de question à l\'écran' });
  for (const [rang, carte] of cartes.entries()) {
    const titre = texteDe(carte.querySelector('.question-titre') ?? carte);
    if (facette !== 'ne-plus-proposer') verifier(v, ecran.boutons(MOTIF_IGNORER, carte).length > 0, { propriete: 'P13', sorte: 'bouton-manquant', detail: `la carte de question ${rang + 1} (« ${titre} ») n'a pas Ignorer` });
    if (facette !== 'ignorer') verifier(v, ecran.boutons(MOTIF_NE_PLUS_PROPOSER, carte).length > 0, { propriete: 'P13', sorte: 'bouton-manquant', detail: `la carte de question ${rang + 1} (« ${titre} ») n'a pas « Ne plus proposer »` });
  }
  return v;
}

/**
 * P13 : Ignorer range le constat sous Ignorés, et « Ne plus ignorer » le rend. Le geste se joue sur une carte qui offre Ignorer
 * (carte de question ou de constat à faire) : le clic envoie la demande, le sandbox répond par la liste des ignorés, l'écran
 * montre le constat sous Ignorés avec « Ne plus ignorer ».
 */
export function jouerIgnorerPuisRendre(chaine: Chaine, carte: ElementDeTest, constat: Constat): Verification {
  const v = verification();
  const { ecran } = chaine;
  const bouton = ecran.boutons(MOTIF_IGNORER, carte)[0];
  verifier(v, bouton !== undefined, { propriete: 'P13', sorte: 'bouton-manquant', detail: `la carte du constat ${constat.id} n'a pas Ignorer` });
  if (!bouton) return v;
  const avant = ecran.envois.ignorees.length;
  bouton.clic();
  verifier(v, ecran.envois.ignorees.length === avant + 1 && ecran.envois.ignorees.at(-1) === constat.id, { propriete: 'P13', sorte: 'geste-sans-effet', detail: `Ignorer n'envoie pas le constat ${constat.id}` });
  chaine.ignorer([...ecran.analyse.ignores, constat.id]);
  const visible = ecran.analyse.constats.some((candidat) => candidat.id === constat.id);
  verifier(v, !visible, { propriete: 'P13', sorte: 'geste-sans-effet', detail: `le constat ${constat.id} reste visible après Ignorer` });
  const rendre = ecran.boutons(/^Ne plus ignorer/)[0];
  verifier(v, rendre !== undefined, { propriete: 'P13', sorte: 'bouton-manquant', detail: `« Ne plus ignorer » manque sous Ignorés pour ${constat.id}` });
  if (rendre) {
    rendre.clic();
    verifier(v, ecran.envois.nePlusIgnorees.at(-1) === constat.id, { propriete: 'P13', sorte: 'geste-sans-effet', detail: `« Ne plus ignorer » n'envoie pas le constat ${constat.id}` });
    chaine.ignorer(ecran.analyse.ignores.filter((id) => id !== constat.id));
    verifier(v, ecran.analyse.constats.some((candidat) => candidat.id === constat.id), { propriete: 'P13', sorte: 'geste-sans-effet', detail: `le constat ${constat.id} ne revient pas après « Ne plus ignorer »` });
  }
  return v;
}

// P14 et P15 ----------------------------------------------------------------------------------------------------------------

/** Où le modèle range un constat visible : la liste de ses entrées dans les corrections, les questions et le À faire. */
export function rangementDesConstats(modele: PanneauParElements, constats: readonly Constat[]): Map<string, string[]> {
  const places = new Map<string, string[]>(constats.map((constat) => [constat.id, []]));
  const noter = (constat: Constat, lieu: string): void => { places.get(constat.id)?.push(lieu); };
  for (const element of modele.elements) {
    for (const carte of element.corrections) for (const constat of carte.constats) noter(constat, `correction:${carte.cle}`);
    for (const groupe of element.questions) for (const carte of groupe.cartes) noter(carte.constat, `question:${carte.id}`);
    for (const carte of element.aFaire) noter(carte.constat, `a-faire:${carte.constat.id}`);
  }
  for (const constat of modele.informations) noter(constat, `information:${constat.id}`);
  return places;
}

/**
 * P14 : tout constat visible (ni ignoré, ni `info`) apparaît une fois, en carte de corrections s'il porte une correction, en carte de
 * question s'il porte une question à candidats, sinon en À faire ; un constat `info` va dans Informations. Le nombre de cartes dessinées
 * est celui du modèle.
 */
export function controlerLAffichage(ecran: Ecran): Verification {
  const v = verification();
  ecran.ouvrirToutes();
  const modele = ecran.modele();
  const visibles = ecran.analyse.constats.filter(dansLaPortee);
  const places = rangementDesConstats(modele, visibles);
  for (const constat of visibles) {
    const lieux = places.get(constat.id) ?? [];
    const repondue = constat.question !== undefined && ecran.analyse.repondues[constat.question.id] !== undefined;
    const attendu = constat.type === 'info' ? 'information' : repondue || constat.correction ? 'correction' : constat.question && constat.question.candidats.length > 0 ? 'question' : 'a-faire';
    // Une question répondue garde sa ligne de réponse dans les questions, à côté de la carte de sa correction (en-tête d'`elements.ts`).
    const enTrop = lieux.filter((lieu) => !lieu.startsWith(attendu) && !(repondue && lieu.startsWith('question:')));
    verifier(v, lieux.length > 0, { propriete: 'P14', sorte: 'non-affiche', detail: `${constat.code} ${constat.id} n'a aucune carte` });
    verifier(v, (lieux.length <= 1 || repondue) && enTrop.length === 0, { propriete: 'P14', sorte: 'affiche-deux-fois', detail: `${constat.code} ${constat.id} apparaît en ${lieux.join(' et ')}, attendu une fois en ${attendu}` });
  }
  const dessinees = {
    corrections: ecran.cartesDeCorrections().length,
    questions: ecran.cartesDeQuestions().length,
    // Les constats ignorés se dessinent sous Ignorés, en cartes sans case, avec « Ne plus ignorer ».
    aFaire: ecran.cartesAFaire().length - ecran.boutons(/^Ne plus ignorer/).length,
  };
  const attendues = {
    corrections: modele.elements.reduce((somme, element) => somme + element.corrections.length, 0),
    questions: modele.elements.reduce((somme, element) => somme + element.questions.filter((groupe) => groupe.cartes.some((carte) => ecran.analyse.repondues[carte.id] === undefined)).length, 0),
    aFaire: modele.elements.reduce((somme, element) => somme + element.aFaire.length, 0),
  };
  for (const genre of ['corrections', 'questions', 'aFaire'] as const) {
    verifier(v, dessinees[genre] === attendues[genre], { propriete: 'P14', sorte: 'non-affiche', detail: `${dessinees[genre]} cartes de ${genre} dessinées, ${attendues[genre]} dans le modèle` });
  }
  return v;
}

const PHRASE_DE_REPLI = /^Constat C\d+\.?$/;

const dernierSegment = (nom: string): string => nom.split('/').at(-1) ?? nom;

/** Le nom du layer comme Figma le porte. */
function nomDuLayer(chaine: Chaine, id: string): string | undefined {
  for (const variant of chaine.releve.variants) {
    const layer = variant.layers.find((candidat) => candidat.id === id);
    if (layer) return layer.nom;
  }
  return undefined;
}

/**
 * P15 : la carte d'un constat a une phrase lisible, nomme le layer et les tokens d'avant et d'après, et n'emploie ni la phrase de repli de
 * `T.sansPhrase` ni « Constat C63. ». Une carte de corrections se cherche dans le DOM par ses fragments ; une carte de constat à faire se
 * lit dans le modèle (`carteDAFaire`), car le panneau n'en dessine que la phrase et le lieu.
 */
export function controlerLaLisibilite(chaine: Chaine): Verification {
  const v = verification();
  const { ecran } = chaine;
  ecran.ouvrirToutes();
  const modele = ecran.modele();
  const cartes = ecran.cartesDeCorrections().map(texteDe);
  const contexte = ecran.contexte();
  for (const element of modele.elements) {
    for (const carte of element.corrections) {
      for (const ligne of carte.lignes) {
        const { correction, constat } = ligne;
        if (constat && !dansLaPortee(constat)) continue;
        const layer = correction.cible.layer === undefined ? undefined : nomDuLayer(chaine, correction.cible.layer);
        const manques: string[] = [];
        const trouve = cartes.some((texte) => {
          manques.length = 0;
          if (layer !== undefined && !texte.includes(layer)) manques.push(`le layer ${layer}`);
          const apres = dernierSegment(correction.apres.nom);
          if (!texte.includes(apres)) manques.push(`le token d'après ${apres}`);
          if (correction.avant !== null) {
            const avant = correction.avant.split('/').filter((segment, rang) => segment !== correction.apres.nom.split('/')[rang]).at(-1);
            if (avant !== undefined && !texte.includes(avant)) manques.push(`le token d'avant ${avant}`);
          }
          return manques.length === 0;
        });
        verifier(v, trouve, { propriete: 'P15', sorte: 'illisible', detail: `la carte ${constat?.code ?? '-'} ${correction.id} ne nomme pas ${manques.join(', ') || 'son contenu'}` });
      }
    }
    for (const carte of element.aFaire) {
      if (!dansLaPortee(carte.constat)) continue;
      const dessin = carteDAFaire(carte.constat, contexte);
      verifier(v, !PHRASE_DE_REPLI.test(dessin.phrase) && dessin.phrase.trim() !== '', { propriete: 'P15', sorte: 'illisible', detail: `${carte.constat.code} ${carte.constat.id} : la carte dit « ${dessin.phrase} »` });
      if (carte.constat.layers.length === 1 && carte.constat.type !== 'info') {
        const layer = nomDuLayer(chaine, carte.constat.layers[0]);
        const dit = layer === undefined || dessin.phrase.includes(layer) || dessin.lieu.some((morceau) => typeof morceau === 'string' && morceau.includes(layer))
          || JSON.stringify(dessin.lieu).includes(layer) || JSON.stringify(dessin.modele ?? null).includes(layer);
        verifier(v, dit, { propriete: 'P15', sorte: 'illisible', detail: `${carte.constat.code} ${carte.constat.id} : la carte ne nomme pas le layer ${layer}` });
      }
    }
    for (const groupe of element.questions) {
      for (const carte of groupe.cartes) {
        if (!dansLaPortee(carte.constat)) continue;
        const texte = `${carte.titreEnTexte} ${carte.meta}`;
        const layer = carte.constat.layers.length === 1 ? nomDuLayer(chaine, carte.constat.layers[0]) : undefined;
        verifier(v, carte.titreEnTexte.trim() !== '' && (layer === undefined || texte.includes(layer) || (carte.lieu.length > 0) || carte.constat.code === 'C63'),
          { propriete: 'P15', sorte: 'illisible', detail: `${carte.constat.code} ${carte.id} : la question ne nomme pas le layer ${layer ?? '-'} (« ${carte.titreEnTexte} »)` });
      }
    }
  }
  return v;
}

// P16 -----------------------------------------------------------------------------------------------------------------------

export interface LigneCochable {
  readonly id: string;
  readonly correction: Correction;
  readonly carte: string;
}

/** Les lignes que l'écran propose de cocher : toutes les corrections de ses cartes. */
export function lignesCochables(ecran: Ecran): LigneCochable[] {
  return ecran.modele().elements.flatMap((element) => [...(element.preparee ? [element.preparee] : []), ...element.corrections])
    .flatMap((carte) => carte.lignes.map((ligne) => ({ id: ligne.id, correction: ligne.correction, carte: carte.cle })));
}

/** Les motifs que le sandbox peut rendre, et le mot qui les dit au designer : le résumé de l'écran ne cite jamais le code brut. */
const MOTIFS_BRUTS = ['analyse-perimee', 'correction-inconnue', 'non-pris-en-charge', 'objet-change', 'fait-faux', 'cible-introuvable', 'non-ucm', 'instance-remplie'];

/**
 * P16 : l'écran envoie les lignes cochées par « Appliquer tout » ; le sandbox les écrit sur le double de Figma ou les saute avec un motif
 * que le résumé de l'écran dit. Une ligne cochable que l'écran n'envoie pas (sorte `alias-de-mode`) est une ligne non écrite.
 */
export async function appliquerToutEtLire(chaine: Chaine, atelier: AtelierDuComposant): Promise<{ v: Verification; ecrites: string[]; sautees: ReadonlyArray<{ id: string; motif: string }>; envoyees: readonly string[] }> {
  const v = verification();
  const { ecran } = chaine;
  ecran.ouvrirToutes();
  cocherAMain(ecran);
  const cochables = lignesCochables(ecran);
  const avant = ecran.envois.appliquer.length;
  const bouton = ecran.boutonAppliquerTout();
  verifier(v, bouton !== undefined && bouton !== null && !bouton.disabled, { propriete: 'P16', sorte: 'non-ecrite', detail: 'Appliquer tout est inactif alors que toutes les lignes sont cochées' });
  bouton?.clic();
  const envoyees = ecran.envois.appliquer.at(-1)?.ids ?? [];
  if (ecran.envois.appliquer.length === avant) return { v, ecrites: [], sautees: [], envoyees: [] };
  for (const ligne of cochables) {
    verifier(v, envoyees.includes(ligne.id), {
      propriete: 'P16', sorte: 'non-ecrite',
      detail: `${ligne.correction.sorte} ${ligne.id} s'affiche avec une case mais l'écran ne l'envoie pas à l'écriture`,
    });
  }
  await chaine.appliquer(envoyees, atelier);
  const rendu = [...chaine.messages].reverse().find((message) => message.type === 'corrections-appliquees') as Extract<PluginMessage, { type: 'corrections-appliquees' }> | undefined;
  const ecrites = envoyees.filter((id) => !rendu?.sautees.some((sautee) => sautee.id === id));
  const sautees = rendu?.sautees ?? [];
  for (const sautee of sautees) {
    const dit = rendu?.resume ?? '';
    verifier(v, / car /.test(dit) && !MOTIFS_BRUTS.some((motif) => dit.includes(motif)), { propriete: 'P16', sorte: 'non-ecrite', detail: `la correction ${sautee.id} est sautée (${sautee.motif}) sans motif lisible : « ${dit} »` });
  }
  for (const id of ecrites) {
    const ligne = cochables.find((candidate) => candidate.id === id);
    if (!ligne || ligne.correction.sorte !== 'liaison' || !ligne.correction.apres.cle) continue;
    const lie = atelier.liaisonDeLaCible(ligne.correction.cible);
    verifier(v, lie === atelier.identifiantDeLaVariable(ligne.correction.apres.cle), {
      propriete: 'P16', sorte: 'non-ecrite', detail: `la correction ${id} écrite lie ${String(lie)} au lieu de ${ligne.correction.apres.nom}`,
    });
  }
  return { v, ecrites, sautees, envoyees };
}

// P18 et P19 ----------------------------------------------------------------------------------------------------------------

/** P18 : sur une analyse partielle, l'écran le dit et ne dit pas « Aucun constat ». */
export function controlerLAnalysePartielle(ecran: Ecran, attendue: 'partielle' | 'complete'): Verification {
  const v = verification();
  const texte = ecran.texte();
  const statut = ecran.analyse.statut;
  verifier(v, statut === attendue, { propriete: 'P18', sorte: 'accusation', detail: `le statut final est ${statut}, attendu ${attendue}` });
  if (attendue === 'partielle') {
    verifier(v, /Analyse partielle/.test(texte), { propriete: 'P18', sorte: 'accusation', detail: `l'écran ne dit pas que l'analyse est partielle : « ${texte.slice(0, 160)} »` });
    verifier(v, !/Aucun constat/.test(texte), { propriete: 'P18', sorte: 'accusation', detail: 'l\'écran dit « Aucun constat » sur une analyse partielle' });
    const egal = /(\d[\d  ]*) (?:variants|layers) lus sur (\d[\d  ]*)/.exec(texte);
    verifier(v, !egal || egal[1] !== egal[2], { propriete: 'P18', sorte: 'accusation', detail: `la bannière dit « ${egal?.[0]} » : rien n'est non lu, la limite vient d'ailleurs` });
  }
  return v;
}

/** P19 : hors UCM, ni C59 ni C63 ne sortent ; une collection sans rôle ne produit ni C20 ni C80. */
export function controlerHorsUcm(chaine: Chaine, quand: 'fichier déclaré libre' | 'collections sans rôle'): Verification {
  const interdits = quand === 'fichier déclaré libre' ? ['C59', 'C63'] : ['C20', 'C80'];
  const v = verification();
  for (const constat of chaine.final().constats) {
    verifier(v, !interdits.includes(constat.code), { propriete: 'P19', sorte: 'accusation', detail: `${constat.code} ${constat.id} sort (${quand})` });
  }
  return v;
}
