/**
 * La chaîne du stress test F8 et F9 jusqu'à l'écran (section 5.2 du plan, étapes 5 et 6). Une `Seance` (`seance.ts`) monte l'analyse de
 * `traiterAvec` sur des lecteurs doubles enveloppés par l'injecteur ; chaque message qu'elle envoie entre, au fil de l'eau, dans
 * `recevoirUneAnalyse` de `ui/composant/analyse.ts` ; le vrai panneau (`monterLePanneau`) se monte sur le faux DOM de
 * `tests/domDeTest.ts`, par l'`Ecran` de F3 et F4. Le module lit l'écran (`lireLEcran`) : alertes, boutons, sections, sections tenues,
 * cases, pied, sommaire, pastille. Les gestes du designer (Ignorer, Ne plus ignorer, Appliquer) repassent par le sandbox, comme
 * l'application les envoie.
 *
 * Il ne contient aucun cas. Un `Jugement` tient les vérifications d'un cas : chaque `verifier` note la phrase de l'oracle, écrite
 * d'après le plan et la SPEC, et un écart quand elle ne tient pas. Le code mesuré n'est jamais relu pour écrire l'oracle.
 *
 * Le sandbox garde un état global (`reinitialiserLAnalyse`) : les chaînes se lancent l'une après l'autre, et `fermer` remet l'état à zéro.
 */
import type { Constat, Correction } from '@ucm-kit/core/controles';
import { lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import type { ReleveDeComposant } from '@ucm-kit/core/controles';
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import { localisationsDe, partiesDe, phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';
import { nombreDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';

import type { LectureDeComposant } from '../../../src/composant';
import { ecrireLeLot, type ApiDeLiaisons, type ResultatDUnLot } from '../../../src/ecriture/liaisons';
import type { PortDEcritureDesRegles } from '../../../src/ecriture/regles';
import type { PluginMessage } from '../../../src/messages';
import type { IdentiteDAnalyse } from '../../../src/messages/commun';
import { ciblesPresentes, lireLesRegles, modelesDeLAnalyse } from '../../../src/regles';
import { traiterAvec as traiterCorrections } from '../../../src/sandbox/corrections';
import { rangementDeFigma, traiterAvec as traiterIgnores } from '../../../src/sandbox/ignores';
import type { Etat } from '../../../src/ui/etat';
import { comme } from '../../../tests/domDeTest';
import { atelierDEcriture } from '../../../tests/figmaDeTest';
import { Ecran, texteDe } from '../f3-composant/chaine';
import { messageDe } from './cas';
import { MondeEnEcriture } from './operateursEcriture';
import { construireLaPage, type SpecDePage } from './pageDeRegles';
import { surfaceDe, reglesDuModele } from './profilsRegles';
import { moteurDouble, type MessageFinal } from './scenarioDeBase';
import type { Plan } from './injecteur';
import type { Verdict } from '../../../../kit/tests/stress/commun/types';
import {
  analyserUneFois, avecLecteurs, chargerLInterface, moteurAvecPoints, Seance, type Adaptateur, type EtatDeLaBarre, type OptionsDeSeance,
} from './seance';

// ---------------------------------------------------------------------------------------------------------------------------
// Jugement

/** Les sortes d'écart de la chaîne ; la colonne du rapport (section 5.4) est dite en face. */
export type SorteDEcartDeChaine =
  /** Faux constats */
  | 'faux-constat'
  /** Manqués */
  | 'manque'
  /** Corrections inexactes */
  | 'correction-inexacte'
  /** Non affichés : constat sans carte, carte en double, carte illisible */
  | 'non-affiche' | 'affiche-deux-fois' | 'illisible'
  /** Conclusions fausses */
  | 'accusation'
  /** Messages muets : refus, panne ou état sans message, geste sans effet */
  | 'muet' | 'geste-sans-effet'
  /** Fuites d'état */
  | 'fuite'
  /** Cochées : correction cochée à l'affichage, bouton manquant */
  | 'cochee' | 'bouton-manquant'
  /** Non écrites */
  | 'non-ecrite'
  /** Le cas lui-même (exception, source absente) */
  | 'exception';

export interface EcartDeChaine {
  readonly propriete: string;
  readonly sorte: SorteDEcartDeChaine;
  /** Ce que l'oracle attendait. */
  readonly attendu?: string;
  readonly detail: string;
}

/** Les vérifications d'un cas : l'oracle écrit, ce qui a tenu, ce qui ne tient pas. */
export class Jugement {
  verifiees = 0;
  /** Les vérifications qui ne tiennent pas. */
  echouees = 0;
  readonly ecarts: EcartDeChaine[] = [];
  /** Une ligne par vérification : « ✓ » ou « ✗ », puis ce que l'oracle attend. */
  readonly oracle: string[] = [];
  readonly notes: string[] = [];
  readonly scenario: string[] = [];
  readonly messages: string[] = [];
  readonly ecran: string[] = [];
  /** La source du cas n'existe pas : il n'a rien jugé. */
  absent = false;

  constructor(readonly propriete: string) {}

  verifier(tient: boolean, attendu: string, detail: string, sorte: SorteDEcartDeChaine = 'accusation', propriete: string = this.propriete): void {
    this.verifiees += 1;
    if (!tient) this.echouees += 1;
    this.oracle.push(`${tient ? '✓' : '✗'} ${propriete} ${attendu}${tient ? '' : ` — ${detail}`}`);
    if (!tient) this.ecarts.push({ propriete, sorte, attendu, detail });
  }

  /** Reprend les vérifications d'un contrôle de F3 et F4 (`controler…`), qui ne portent que l'écart. */
  reprendre(controle: { verifiees: number; ecarts: ReadonlyArray<{ propriete: string; sorte: string; detail: string; nombre?: number }> }, attendu: string): void {
    this.verifiees += controle.verifiees;
    this.echouees += controle.ecarts.reduce((somme, ecart) => somme + (ecart.nombre ?? 1), 0);
    this.oracle.push(`${controle.ecarts.length === 0 ? '✓' : '✗'} ${this.propriete} ${attendu} (${controle.verifiees} vérifiées)`);
    for (const ecart of controle.ecarts) this.ecarts.push({ propriete: this.propriete, sorte: ecart.sorte as SorteDEcartDeChaine, attendu, detail: ecart.detail });
  }

  note(texte: string): void {
    this.notes.push(texte);
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Messages et écran lus

export function resumeDesMessages(messages: readonly PluginMessage[]): string[] {
  // Le compteur de génération des identités survit à `reinitialiserLAnalyse` (N-75) : le rapport range les identités par ordre d'apparition.
  const vues: number[] = [];
  const rangDe = (identite: IdentiteDAnalyse): number => {
    if (!vues.includes(identite.generation)) vues.push(identite.generation);
    return vues.indexOf(identite.generation) + 1;
  };
  return messages.filter((m) => m.type !== 'analyse-en-cours').map((m) => {
    const identite = (m as { analyse?: IdentiteDAnalyse }).analyse;
    const rang = identite ? ` #${rangDe(identite)}` : '';
    if (m.type === 'analyse') return `analyse${rang} ${m.statut} (${m.constats.length} constats${m.lecture ? `, ${m.lecture.layersLus} layers lus, non lus ${String(m.lecture.layersNonLus)}, ${m.lecture.manquees.length} manquées` : ''})`;
    if (m.type === 'analyse-provisoire') return `analyse-provisoire${rang} (${m.constats.length} constats)`;
    if (m.type === 'perime') return `perime${rang} cause ${m.cause}`;
    if (m.type === 'ignores') return `ignores${rang} ${m.constats.length} constats`;
    if (m.type === 'corrections-appliquees') return `corrections-appliquees${rang} (${m.ecrites} écrites, ${m.sautees.length} sautées) « ${m.resume} »`;
    return `${m.type}${rang}`;
  });
}

export interface SectionLue { readonly element: string; readonly points: number }

export interface VueDeLEcran {
  readonly texte: string;
  readonly alertes: readonly string[];
  readonly boutons: readonly string[];
  /** Les sections qui portent des points, sans la section Informations. */
  readonly sections: readonly SectionLue[];
  /** Les éléments que le panneau dit tenus (coche « Tenu »). */
  readonly tenues: readonly string[];
  readonly puces: readonly SectionLue[];
  readonly cases: number;
  readonly cochees: number;
  readonly casesActives: number;
  readonly cartes: { readonly corrections: number; readonly questions: number; readonly aFaire: number };
  /** Le texte du pied des corrections, `null` s'il n'est pas dessiné. */
  readonly pied: string | null;
  readonly appliquerInactif: boolean | null;
  readonly ignores: number;
}

const nombreDe = (texte: string): number => Number(texte.replace(/\D/g, ''));

export function lireLEcran(ecran: Ecran): VueDeLEcran {
  ecran.mettreAJour();
  ecran.ouvrirToutes();
  const { racine } = ecran;
  const sectionsDuPanneau = racine.querySelectorAll('.section-element');
  const cases = ecran.casesDeLignes();
  const pied = ecran.pied();
  const bandeDe = (section: typeof sectionsDuPanneau[number]) => section.querySelector('.bande-element');
  return {
    texte: ecran.texte(),
    alertes: racine.querySelectorAll('.alerte').map(texteDe),
    boutons: racine.querySelectorAll('button').map(texteDe),
    sections: sectionsDuPanneau
      .filter((section) => section.dataset.element !== 'informations' && !bandeDe(section)?.classes.has('tenue'))
      .map((section) => ({ element: section.dataset.element ?? '-', points: nombreDe(texteDe(section.querySelector('.bande-element .nombre') ?? section)) })),
    tenues: sectionsDuPanneau.filter((section) => bandeDe(section)?.classes.has('tenue')).map((section) => section.dataset.element ?? '-'),
    puces: racine.querySelectorAll('.puce-element').map((puce) => ({ element: puce.dataset.element ?? '-', points: nombreDe(texteDe(puce.querySelector('.nombre') ?? puce)) })),
    cases: cases.length,
    cochees: cases.filter((c) => c.checked).length,
    casesActives: cases.filter((c) => !c.disabled).length,
    cartes: { corrections: ecran.cartesDeCorrections().length, questions: ecran.cartesDeQuestions().length, aFaire: ecran.cartesAFaire().length },
    pied: pied ? texteDe(pied) : null,
    appliquerInactif: pied ? ecran.boutonAppliquerTout()?.disabled === true : null,
    ignores: ecran.boutons(/^Ne plus ignorer/).length,
  };
}

export function lignesDeLEcran(vue: VueDeLEcran): string[] {
  return [
    `alertes : ${vue.alertes.length === 0 ? 'aucune' : vue.alertes.join(' | ')}`,
    `sections : ${vue.sections.map((s) => `${s.element} ${s.points}`).join(', ') || 'aucune'} ; tenues : ${vue.tenues.join(', ') || 'aucune'} ; sommaire : ${vue.puces.map((p) => `${p.element} ${p.points}`).join(', ') || 'aucun'}`,
    `cartes : ${vue.cartes.corrections} corrections, ${vue.cartes.questions} questions, ${vue.cartes.aFaire} à faire ; cases : ${vue.cases} dont ${vue.cochees} cochées ; pied : ${vue.pied ?? 'absent'}`,
    `boutons : ${vue.boutons.slice(0, 18).join(' | ')}${vue.boutons.length > 18 ? ` … (${vue.boutons.length})` : ''}`,
  ];
}

// ---------------------------------------------------------------------------------------------------------------------------
// La chaîne

const RECUS = new Set<string>(['analyse-commencee', 'analyse-en-cours', 'analyse-provisoire', 'analyse', 'perime', 'occupe', 'ignores', 'corrections-appliquees', 'modele-propose', 'question-repondue']);

/** La lecture du composant que la vue Composant donnerait : le jeu, ses variants et le nom de chaque layer du relevé. */
export function lectureDuReleve(releve: ReleveDeComposant): LectureDeComposant {
  const calques = new Map<string, string>();
  for (const variant of releve.variants) for (const layer of variant.layers) if (!calques.has(layer.id)) calques.set(layer.id, layer.nom);
  return {
    sujet: { id: releve.jeu.id, nom: releve.jeu.nom, type: 'COMPONENT_SET', variant: null, variants: releve.variants.map(({ id, nom }) => ({ id, nom })) },
    ancetres: [], calques: [...calques].map(([id, nom]) => ({ id, nom })), liaisons: [], styles: [], usagesDeStyle: [], directes: [],
    releve: { collections: [], variables: [] }, calquesNonLus: 0, erreurs: [],
  } as unknown as LectureDeComposant;
}

export interface OptionsDeChaine extends OptionsDeSeance {
  /** Le déroulé du sandbox ; une analyse par défaut. `() => {}` : aucun message. */
  readonly flux?: (s: Seance) => Promise<void>;
  /** L'architecture que l'écran suppose ; celle de la déclaration du fichier par défaut. */
  readonly architectureDeLEcran?: string | null;
  /** La library de référence que la Configuration annonce à l'interface. */
  readonly reference?: Etat['reference'];
  /** Après l'ouverture de la séance et avant le déroulé : pose des instantanés ou des crochets. */
  readonly avant?: (c: Chaine) => void;
  /** Aucune lecture du composant : l'écran « aucun composant ». */
  readonly sansComposant?: boolean;
}

export interface Instantane { readonly vue: VueDeLEcran; readonly barre: EtatDeLaBarre & { readonly pastille: number | null } }

export interface Chaine {
  readonly s: Seance;
  readonly etat: Etat;
  readonly ecran: Ecran;
  readonly lecture: LectureDeComposant;
  /** Les écrans lus pendant le déroulé, par nom. */
  readonly instantanes: Map<string, Instantane>;
  /** Lit l'écran et la barre maintenant et les garde sous ce nom. */
  photographier(nom: string): Promise<Instantane>;
  vue(): VueDeLEcran;
  recevoir(message: PluginMessage): void;
  identite(): IdentiteDAnalyse | null;
  final(): MessageFinal | undefined;
  constats(): readonly Constat[];
  barre(): Promise<EtatDeLaBarre & { readonly pastille: number | null }>;
  /** L'écran envoie une écriture : la demande est partie, la réponse n'est pas revenue. */
  poserLEcriture(ids: readonly string[]): Promise<void>;
  /** L'écran envoie Ignorer (`constat`) ou « Ne plus proposer » (`proposition`) ; le sandbox range la clé et répond. */
  ignorer(id: string, portee: 'constat' | 'proposition'): Promise<void>;
  nePlusIgnorer(id: string): Promise<void>;
  /** « Appliquer tout » ou Appliquer : le sandbox écrit les corrections sur ce double de Figma. */
  appliquer(ids: readonly string[], lot: (corrections: readonly Correction[]) => Promise<ResultatDUnLot>): Promise<void>;
  fermer(): void;
}

export async function monterLaChaine(options: OptionsDeChaine = {}): Promise<Chaine> {
  const s = await Seance.ouvrir(options);
  const ui = await chargerLInterface();
  const etat = ui.etatInitial() as unknown as Etat;
  const lecture = lectureDuReleve(s.b.releve);
  const declaration = typeof s.declaration === 'function' ? s.declaration : () => s.declaration as string;
  const architecture = (): string => { try { return lireLArchitectureDuFichier(declaration()); } catch { return 'illisible'; } };
  etat.composant = (options.sansComposant
    ? { ...etat.composant, selectionConnue: true }
    : { ...etat.composant, lecture, selection: { id: lecture.sujet.id, nom: lecture.sujet.nom } }) as unknown as Etat['composant'];
  etat.architecture = (options.architectureDeLEcran !== undefined ? options.architectureDeLEcran : architecture()) as Etat['architecture'];
  etat.reference = options.reference ?? null;
  const ecran = new Ecran(etat, lecture);
  const instantanes = new Map<string, Instantane>();
  // Comme l'application, l'écran se redessine à chaque message, hors les mesures de progression.
  s.surMessage.push((message) => { if (RECUS.has(message.type)) { ui.recevoir(etat, message); if (message.type !== 'analyse-en-cours') ecran.mettreAJour(); } });

  const chaine: Chaine = {
    s, etat, ecran, lecture, instantanes,
    async photographier(nom) {
      const instantane = { vue: lireLEcran(ecran), barre: await lireLaBarre(etat) };
      instantanes.set(nom, instantane);
      return instantane;
    },
    vue: () => lireLEcran(ecran),
    recevoir(message) {
      if (RECUS.has(message.type)) { ui.recevoir(etat, message); ecran.mettreAJour(); }
    },
    identite: () => (etat.analyse ? (etat.analyse as unknown as { identite: IdentiteDAnalyse }).identite : null),
    final: () => [...s.messages].reverse().find((m): m is MessageFinal => m.type === 'analyse'),
    constats: () => (etat.analyse ? (etat.analyse as unknown as { constats: readonly Constat[] }).constats : []),
    barre: () => lireLaBarre(etat),
    async poserLEcriture(ids) {
      const { noterLEnvoi } = await import('../../../src/ui/composant/analyse');
      noterLEnvoi(etat, ids, 0);
    },
    async ignorer(id, portee) {
      const identite = chaine.identite();
      if (!identite) return;
      await traiterIgnores((contexte) => rangementDeFigma(contexte.figma as never))({ type: 'ignorer', analyse: identite, constat: id, portee }, s.contexte);
      await s.attendre();
    },
    async nePlusIgnorer(id) {
      const identite = chaine.identite();
      if (!identite) return;
      await traiterIgnores((contexte) => rangementDeFigma(contexte.figma as never))({ type: 'ne-plus-ignorer', analyse: identite, constat: id }, s.contexte);
      await s.attendre();
    },
    async appliquer(ids, lot) {
      const identite = chaine.identite();
      if (!identite) return;
      const { noterLEnvoi } = await import('../../../src/ui/composant/analyse');
      noterLEnvoi(etat, ids, 0);
      await traiterCorrections({ lot: async (corrections) => lot(corrections), selectionner: async () => undefined })({ type: 'appliquer-corrections', analyse: identite, ids: [...ids] }, s.contexte);
      await s.attendre();
    },
    fermer() {
      s.nettoyer();
    },
  };
  options.avant?.(chaine);
  try {
    await (options.flux ?? analyserUneFois)(s);
    await s.attendre();
  } catch (erreur) {
    s.exceptions.push(`déroulé du cas : ${messageDe(erreur)}`);
  }
  return chaine;
}

/**
 * Monte la chaîne, la remet à `juger`, relève le scénario, les messages et l'écran dans le jugement, puis ferme. Une exception
 * du déroulé ou du jugement est un écart du cas, jamais un arrêt.
 */
export async function avecLaChaine(propriete: string, scenario: readonly string[], options: OptionsDeChaine, juger: (c: Chaine, j: Jugement) => Promise<void>): Promise<Jugement> {
  const j = new Jugement(propriete);
  j.scenario.push(...scenario);
  let chaine: Chaine | null = null;
  try {
    chaine = await monterLaChaine(options);
    await juger(chaine, j);
  } catch (erreur) {
    j.ecarts.push({ propriete, sorte: 'exception', detail: messageDe(erreur) });
  } finally {
    if (chaine) {
      j.messages.push(...resumeDesMessages(chaine.s.messages));
      try { j.ecran.push(...lignesDeLEcran(lireLEcran(chaine.ecran))); } catch (erreur) { j.ecran.push(`écran illisible : ${messageDe(erreur)}`); }
      for (const exception of chaine.s.exceptions) j.ecarts.push({ propriete, sorte: 'fuite', detail: `exception sortie de traiterAvec : ${exception}` });
      chaine.fermer();
    }
  }
  return j;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Pages de règles dans le sandbox

export interface PointDuMoteur { readonly point: PointACorriger; readonly noeuds: readonly string[] }

/**
 * Remplace les lecteurs de règles et de moteur du banc par la page d'une `SpecDePage` : le scan réel (`extractRules`, `lireLesRegles`)
 * lit la page fabriquée, et ses points (C44) passent par le moteur double, comme le moteur réel les rend. `points` ajoute des phrases
 * du moteur après celles du scan. `spec` se relit à chaque appel : une écriture qui la change se voit à l'analyse suivante.
 */
export function pageDuSandbox(spec: () => SpecDePage, points: readonly PointDuMoteur[] = []): Adaptateur {
  return (_b, lecteurs) => ({
    ...lecteurs,
    regles: async () => {
      const courante = spec();
      const { composant } = construireLaPage(courante);
      return lireLesRegles(composant as never, surfaceDe(courante.proprietes).surface);
    },
    moteur: async () => {
      const { page, composant } = construireLaPage(spec());
      const scan = await extractRules(composant as never, page as never);
      const resultat = moteurDouble();
      const interne = (resultat as unknown as { interne: Record<string, unknown> }).interne;
      const phrases = points.map((entree) => phraseDe(entree.point));
      interne.warnings = [...scan.warnings, ...phrases];
      interne.parties = new Map([...partiesDe(scan.warnings), ...points.map((entree, rang) => [phrases[rang], entree.point] as const)]);
      interne.localisations = new Map([...localisationsDe(scan.warnings), ...points.map((entree, rang) => [phrases[rang], [...entree.noeuds]] as const)]);
      return resultat;
    },
  });
}

/** Un moteur à couverture complète qui ne rend que ces points : aucune page de règles. */
export const moteurAvecLesPoints = (points: readonly PointDuMoteur[]): Adaptateur => avecLecteurs({ moteur: async () => moteurAvecPoints(points) });

/** Un port d'écriture des règles dont les méthodes lisent et modifient la page du monde, comme celui des opérateurs d'écriture. */
export function portDuMonde(monde: MondeEnEcriture): PortDEcritureDesRegles {
  return {
    async composant(id) { return id === monde.id ? (monde.page().composant as never) : null; },
    async releve() {
      const { page, composant } = monde.page();
      return (await extractRules(composant as never, page as never)).releve;
    },
    async resoudre() { return { sources: { aRemplir: null } as never, refus: null }; },
    async presentes() {
      const { page, composant } = monde.page();
      return new Set(ciblesPresentes(await extractRules(composant as never, page as never)));
    },
    async conteneur() { return monde.aUnConteneur() ? ({ id: monde.id } as never) : null; },
    async creer(_composant, modele) {
      monde.appels.push('creer');
      monde.poser(reglesDuModele(modele, { marquees: true, ecriture: 'exacte' }), true);
      return { conteneur: {} as never, regles: nombreDeRegles(modele) } as never;
    },
    async ajouter(_conteneur, manquantes) {
      monde.appels.push('ajouter');
      monde.poser(reglesDuModele(manquantes, { marquees: true, ecriture: 'exacte' }), false);
      return { conteneur: {} as never, regles: nombreDeRegles(manquantes) } as never;
    },
  };
}

/** L'écriture d'un lot de règles sur le monde : `ecrireLeLot` sur le double de Figma, avec les modèles que l'analyse a retenus. */
export function ecritureSurLeMonde(monde: MondeEnEcriture): { readonly lot: (corrections: readonly Correction[]) => Promise<ResultatDUnLot>; readonly atelier: ReturnType<typeof atelierDEcriture> } {
  const atelier = atelierDEcriture({});
  return {
    atelier,
    lot: (corrections) => ecrireLeLot(corrections, { modeles: new Map(modelesDeLAnalyse()), portDeRegles: portDuMonde(monde) }, atelier.api as unknown as ApiDeLiaisons),
  };
}

/**
 * Un seul variant, une racine sans contour ni valeur en dur, les tokens liés gardés : les contrôles du kit n'ont rien à juger. Il ne
 * reste que les constats des règles et du moteur, et le composant garde ses tokens, si bien que le panneau n'ajoute pas la carte
 * « sans tokens ».
 */
export const silenceDuKit: Adaptateur = (b, lecteurs) => {
  const premier = b.releve.variants[0];
  const racine = premier.layers[0];
  const liaisons = racine.liaisons.filter((l) => l.champ !== 'strokes');
  (b.releve as { proprietes: unknown }).proprietes = [];
  (b.releve as { variants: unknown }).variants = [{
    ...premier, valeurs: {}, layers: [{ ...racine, liaisons, peintures: racine.peintures.filter((p) => p.champ !== 'strokes'), valeursEnDur: [], texte: undefined }],
  }];
  const gardees = new Set(liaisons.map((l) => l.variable.cle));
  b.catalogue.variables = b.catalogue.variables.filter((v) => gardees.has(v.cle));
  return lecteurs;
};

/** Une action au passage nommé du sandbox. */
export const agir = (passage: keyof Plan, quand: 'avant' | 'apres', faire: () => void | Promise<void>, appel = 1): Plan => ({ [passage]: [{ quand, action: { action: 'appeler', faire }, appel }] });

/** La barre : le bouton Analyser en disposition étroite, et la pastille du bouton Constats. */
export async function lireLaBarre(etat: Etat): Promise<EtatDeLaBarre & { readonly pastille: number | null }> {
  const ui = await chargerLInterface();
  (etat as { disposition: string }).disposition = 'etroite';
  const barre = ui.creerBarre({ etat, configurationOuverte: () => false, analyser() {}, basculerLePanneau() {}, annulerAnalyse() {} });
  barre.mettreAJour?.();
  const racine = comme(barre.element);
  const analyser = racine.querySelector('.btn-compact');
  const pastille = racine.querySelector('.pastille-compte');
  return {
    texte: texteDe(analyser ?? racine), analyserInactif: analyser?.disabled === true, analyserCache: analyser?.hidden === true, pastille: pastille ? nombreDe(texteDe(pastille)) : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les cas

/** Un cas de la section D : le jugement qu'il rend dit ce que l'oracle attendait et ce que l'écran a montré. */
export interface CasDeChaine {
  readonly id: string;
  readonly famille: 'F8' | 'F9';
  readonly operateur: string;
  /** La propriété du plan que le cas juge. */
  readonly propriete: string;
  readonly verdict: Verdict;
  readonly question?: string;
  readonly description: string;
  /** L'hypothèse de la section 6.1 ou l'écart connu que le cas met à l'épreuve. */
  readonly rattachement?: string;
  executer(): Promise<Jugement>;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Une interface sans sandbox

export interface InterfaceSeule {
  readonly etat: Etat;
  readonly ecran: Ecran;
  readonly lecture: LectureDeComposant;
  recevoir(message: PluginMessage): void;
}

/** L'état de l'interface et son panneau pour une lecture donnée, qui reçoivent des messages sans sandbox derrière eux (rejeu d'une suite enregistrée, capture). */
export async function interfaceSeule(lecture: LectureDeComposant, architecture: string | null = 'ucm'): Promise<InterfaceSeule> {
  const ui = await chargerLInterface();
  const etat = ui.etatInitial() as unknown as Etat;
  etat.composant = { ...etat.composant, lecture, selection: { id: lecture.sujet.id, nom: lecture.sujet.nom } } as unknown as Etat['composant'];
  etat.architecture = architecture as Etat['architecture'];
  const ecran = new Ecran(etat, lecture);
  return { etat, ecran, lecture, recevoir: (message) => { if (RECUS.has(message.type)) ui.recevoir(etat, message); } };
}
