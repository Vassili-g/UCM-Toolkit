/**
 * Les deux bases du stress test F8 et F9. Aucune n'écrit dans Figma.
 *
 * La base des règles (F8) est la page d'un profil de `profilsRegles.ts`, lue par `pageDeRegles.ts`. La base d'analyse (F9) est un jeu
 * de `Lecteurs` doubles pour `traiterAvec` de `sandbox/analyse.ts` : le sujet, le relevé et le catalogue viennent du composant de base
 * de F3 et F4 (`composantDuProfil`, profil P0 avec la forme du profil), le moteur double n'a aucun point et sa couverture est complète,
 * les règles sont celles d'une page conforme (lues par `lireLaPage`), les ignorés sont vides, le niveau est celui du profil, les
 * dépendances sont vides et les bibliothèques se lisent. Un `Contexte` capte les messages.
 *
 * Les 72 profils d'analyse (a01 à a72) croisent quatre formes, trois architectures, deux niveaux et trois états des libraries. La forme
 * varie le plus vite, puis le niveau, les libraries et l'architecture : a10 est A0 (`button-36`, `ucm`, AA, une library lue) et a55 est
 * `button-216` en AAA sans library, fichier sans déclaration.
 */
import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import type { LectureDesLibraries } from 'ucm-plugin-socle/src/bibliotheque';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';

import type { PluginMessage } from '../../../src/messages';
import { reinitialiserLAnalyse, traiterAvec, type DependancesDuMoteur, type Lecteurs, type OptionsDeLAnalyse } from '../../../src/sandbox/analyse';
import type { Contexte } from '../../../src/sandbox/contexte';
import { composantDuProfil } from '../../../../kit/tests/stress/f3-composant/profils';
import { PROFIL_P0 } from '../../../../kit/tests/stress/f3-composant/profils';
import type { ComposantDeBase } from '../../../../kit/tests/stress/f3-composant/composantDeBase';
import { lireLaPage, specDuProfil, type SpecDePage } from './pageDeRegles';
import type { ProfilDeRegles, ProprieteDuJeu } from './profilsRegles';

export { specDuProfil as baseDeRegles, lireLaPage as lireLaBase };

// ---------------------------------------------------------------------------------------------------------------------------
// Profils d'analyse

export type FormeDAnalyse = 'alert-11' | 'button-36' | 'button-216' | 'divider-1';
export type ArchitectureDuFichier = 'ucm' | 'libre' | 'absente';
export type EtatDesLibraries = 'aucune' | 'une' | 'plusieurs';

export interface ProfilDAnalyse {
  /** `a01` à `a72`. */
  readonly id: string;
  readonly forme: FormeDAnalyse;
  readonly architecture: ArchitectureDuFichier;
  readonly niveau: 'AA' | 'AAA';
  readonly libraries: EtatDesLibraries;
}

export const FORMES_D_ANALYSE: readonly FormeDAnalyse[] = ['alert-11', 'button-36', 'button-216', 'divider-1'];

export const PROFILS_D_ANALYSE: readonly ProfilDAnalyse[] = (['ucm', 'libre', 'absente'] as const).flatMap((architecture) =>
  (['aucune', 'une', 'plusieurs'] as const).flatMap((libraries) =>
    (['AA', 'AAA'] as const).flatMap((niveau) =>
      FORMES_D_ANALYSE.map((forme) => ({ forme, architecture, niveau, libraries }))))).map((profil, rang) => ({ id: `a${String(rang + 1).padStart(2, '0')}`, ...profil }));

const profilDAnalyse = (id: string): ProfilDAnalyse => PROFILS_D_ANALYSE.find((profil) => profil.id === id)!;

/** `button-36`, fichier UCM, AA, une library lue. */
export const PROFIL_A0: ProfilDAnalyse = profilDAnalyse('a10');
/** `button-216` en AAA. */
export const PROFIL_A55: ProfilDAnalyse = profilDAnalyse('a55');

// ---------------------------------------------------------------------------------------------------------------------------
// Lecteurs

const LIBRARY = (nom: string) => ({ cle: `c-${nom}`, nom: 'components', library: nom, variables: [{ cle: `v-${nom}`, nom: 'alert/color/info/background', type: 'COLOR' }] });

export function librairiesDe(etat: EtatDesLibraries): LectureDesLibraries {
  const collections = etat === 'aucune' ? [] : etat === 'une' ? [LIBRARY('Intencial')] : [LIBRARY('Intencial'), LIBRARY('Autre')];
  return { etat: 'lue', collections, illisibles: [] } as unknown as LectureDesLibraries;
}

export const composantDeLaForme = (forme: FormeDAnalyse): ComposantDeBase => composantDuProfil({ ...PROFIL_P0, forme });

/** La page de règles qui porte tout ce que le modèle du composant demande : ses propriétés Figma sont les axes du jeu. */
export function specConformeDe(composant: ComposantDeBase): SpecDePage {
  const proprietes: ProprieteDuJeu[] = composant.spec.axes.map((axe) => ({ nom: axe.nom, type: 'VARIANT', options: axe.valeurs }));
  const base = specDuProfil({ id: 'conforme', forme: 'divider-1', redigees: true, ecriture: 'exacte', composants: 1 } as ProfilDeRegles);
  return { ...base, nom: composant.spec.jeu, proprietes, conteneurs: [{ ...base.conteneurs[0], ecrit: composant.spec.jeu }] };
}

const dependancesVides: DependancesDuMoteur = { regles: null, collectionsLocales: [], variablesLocales: [], styles: [], instances: 0, maitres: [], imbriqueesNonLues: 0, calquesDesInstancesDistantes: [] };

/** Un moteur à couverture complète et sans point ; `points` ajoute des phrases du moteur. */
export function moteurDouble(options: { partiel?: boolean } = {}): ResultatSansPublication {
  const interne = { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: options.partiel ? 'partielle' : 'complete' }, props: {}, stateModel: null, imbriques: { auParent: [], sansRegles: [], sansPorteur: [] } } as unknown as ResultatInterne;
  return { etat: 'calculee', interne };
}

export interface BancDAnalyse {
  readonly profil: ProfilDAnalyse;
  readonly composant: ComposantDeBase;
  readonly releve: ReleveDeComposant;
  readonly catalogue: CatalogueDeReference;
  readonly lecteurs: Lecteurs;
  readonly contexte: Contexte;
  readonly messages: PluginMessage[];
}

export const DECLARATIONS: Readonly<Record<ArchitectureDuFichier, string>> = { ucm: texteDeLArchitectureDuFichier(true), libre: texteDeLArchitectureDuFichier(false), absente: '' };

/** Les cadences injectées : aucune attente de temps réel. */
export const OPTIONS_SANS_ATTENTE: OptionsDeLAnalyse = { horloge: () => 0, respirer: async () => {} };

export async function banc(profil: ProfilDAnalyse): Promise<BancDAnalyse> {
  const composant = structuredClone(composantDeLaForme(profil.forme));
  const { releve, catalogue } = composant;
  const releveDesRegles = (await lireLaPage(specConformeDe(composant))).releve;
  const messages: PluginMessage[] = [];
  const declaration = DECLARATIONS[profil.architecture];
  const contexte: Contexte = {
    figma: { root: { getSharedPluginData: () => declaration } } as unknown as PluginAPI,
    envoyer: (message) => { messages.push(message); },
    surveillerLeDocument() {},
  };
  const noeuds = [releve.jeu.id, ...releve.variants.flatMap((variant) => [variant.id, ...variant.layers.map((layer) => layer.id)])];
  const lecteurs: Lecteurs = {
    sujet: async () => ({ cle: releve.jeu.cle, noeud: { id: releve.jeu.id } as never, noeuds }),
    releve: async () => ({ statut: 'lu', releve }),
    catalogue: async () => catalogue,
    moteur: async () => moteurDouble(),
    regles: async () => releveDesRegles,
    dependances: async () => dependancesVides,
    niveau: async () => profil.niveau,
    ignores: async () => [],
    bibliotheques: async () => librairiesDe(profil.libraries),
  };
  return { profil, composant, releve, catalogue, lecteurs, contexte, messages };
}

export type MessageFinal = Extract<PluginMessage, { type: 'analyse' }>;

export const finalDe = (messages: readonly PluginMessage[]): MessageFinal | undefined => [...messages].reverse().find((message): message is MessageFinal => message.type === 'analyse');

/** Une analyse du profil sur ses lecteurs doubles, état du sandbox remis à zéro avant et après. */
export async function analyserLeProfil(profil: ProfilDAnalyse, adapter: (banc: BancDAnalyse) => Lecteurs = (b) => b.lecteurs): Promise<{ banc: BancDAnalyse; final: MessageFinal | undefined }> {
  reinitialiserLAnalyse();
  const b = await banc(profil);
  try {
    await traiterAvec(adapter(b), OPTIONS_SANS_ATTENTE)({ type: 'analyser' }, b.contexte);
    return { banc: b, final: finalDe(b.messages) };
  } finally {
    reinitialiserLAnalyse();
  }
}

/** Les 72 profils d'analyse : le statut du message final de chacun. */
export async function mesurerLesProfilsDAnalyse(): Promise<Array<{ profil: ProfilDAnalyse; statut: string; constats: number }>> {
  const mesures: Array<{ profil: ProfilDAnalyse; statut: string; constats: number }> = [];
  for (const profil of PROFILS_D_ANALYSE) {
    const { final } = await analyserLeProfil(profil);
    mesures.push({ profil, statut: final?.statut ?? 'aucun message final', constats: final?.constats.length ?? 0 });
  }
  return mesures;
}
