/**
 * Le rejeu de captures du stress test F9 (section 5.3 du plan) : D3, 30 cas, rejoue cinq sources sous six pannes, et D4, 5 cas, juge la
 * parité d'une prélecture promue avec une analyse froide. Les sources sont les captures d'Architect que `_local/` garde hors de Git :
 * trois fichiers `capture-architect-*.json` de `_local/vitesse-analyse/` et deux rapports `ucm-architect-rapport-*.json` de
 * `_local/recette-v2/`. Le code les lit à l'exécution, par leur chemin, et n'en garde ni nom, ni valeur, ni extrait : aucun fichier
 * suivi par Git n'en cite rien.
 *
 * Une source absente, ou qui n'est pas une capture rejouable (JSON illisible, version de capture inconnue, nœuds manquants), compte
 * « absente » : le cas ne juge rien, le rapport l'écrit à part, et il n'est jamais « réussi ». Le rejeu saute la source sans erreur.
 *
 * Le double de la capture (`tests/outils/capture.ts`) porte les lectures réelles de `LECTEURS_DE_FIGMA` : le relevé, le catalogue, le
 * moteur, les règles, le niveau et les ignorés lisent la capture. L'injecteur enveloppe ces lecteurs pour y poser une panne.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { ReleveDeComposant } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import { analyserLeComposant } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { LectureDeComposant } from '../../../src/composant';
import type { PluginMessage } from '../../../src/messages';
import type { DemandeDAnalyse } from '../../../src/messages/analyse';
import type { IdentiteDAnalyse } from '../../../src/messages/commun';
import { retenirLesModeles } from '../../../src/regles';
import { lireLeReleve } from '../../../src/releveDuComposant';
import {
  LECTEURS_DE_FIGMA, operationEnCours, pageDuNoeud, reinitialiserLAnalyse, releveDeLAnalyse, analyseCourante, sessionDesAnalyses, traiterAvec, type Lecteurs,
} from '../../../src/sandbox/analyse';
import { VERSION_DE_CAPTURE, type CaptureArchitect } from '../../../src/sandbox/capture';
import type { Contexte } from '../../../src/sandbox/contexte';
import { portDeLecture, selectionLue } from '../../../src/sandbox/lectureDeFigma';
import type { PortDuComposant } from '../../../src/lectureDuComposant';
import type { NoeudLu } from '../../../src/consommateurs';
import { doubleDepuisCapture } from '../../../tests/outils/capture';
import {
  agir, interfaceSeule, Jugement, lectureDuReleve, lireLEcran, lignesDeLEcran, resumeDesMessages, type CasDeChaine, type InterfaceSeule, type SorteDEcartDeChaine,
} from './chaine';
import { injecter, lever, type Injection, type Plan } from './injecteur';
import { coupeAttendue } from './operateursBudget';
import type { MessageFinal } from './scenarioDeBase';
import { DIT, JAMAIS_N_SUR_N } from './seance';

// ---------------------------------------------------------------------------------------------------------------------------
// Les sources

/** `UCM_STRESS_LOCAL` désigne un autre dossier que `_local/` (l'essai « sources absentes »). */
const LOCAL = process.env.UCM_STRESS_LOCAL ?? path.resolve(__dirname, '../../../../../_local');
const DOSSIERS = [
  { dossier: 'vitesse-analyse', motif: /^capture-architect-.*\.json$/, nombre: 3, genre: 'capture' },
  { dossier: 'recette-v2', motif: /^ucm-architect-rapport-.*\.json$/, nombre: 2, genre: 'rapport' },
] as const;

export const NOMBRE_DE_SOURCES = DOSSIERS.reduce((somme, entree) => somme + entree.nombre, 0);

export interface Source {
  /** 1 à 5 : les captures d'abord, puis les rapports, chacun dans l'ordre alphabétique de ses fichiers. */
  readonly rang: number;
  readonly genre: 'capture' | 'rapport';
  /** Le chemin du fichier, ou `null` quand la source n'existe pas. */
  readonly fichier: string | null;
  readonly capture: CaptureArchitect | null;
  readonly raison?: string;
}

const sources = new Map<number, Source>();

/** Cherche la source de ce rang. Un fichier absent ou illisible rend une source sans capture, avec sa raison. */
export function chargerLaSource(rang: number): Source {
  const connue = sources.get(rang);
  if (connue) return connue;
  let reste = rang;
  let source: Source = { rang, genre: 'capture', fichier: null, capture: null, raison: 'rang inconnu' };
  for (const { dossier, motif, nombre, genre } of DOSSIERS) {
    if (reste > nombre) { reste -= nombre; continue; }
    const chemin = path.join(LOCAL, dossier);
    const fichiers = existsSync(chemin) ? readdirSync(chemin).filter((nom) => motif.test(nom)).sort() : [];
    const fichier = fichiers[reste - 1];
    source = fichier ? lire(rang, genre, path.join(chemin, fichier)) : { rang, genre, fichier: null, capture: null, raison: 'fichier absent' };
    break;
  }
  sources.set(rang, source);
  return source;
}

function lire(rang: number, genre: Source['genre'], fichier: string): Source {
  try {
    const brut = JSON.parse(readFileSync(fichier, 'utf8')) as { capture?: Partial<CaptureArchitect> };
    const capture = brut.capture;
    if (!capture || capture.version !== VERSION_DE_CAPTURE || typeof capture.noeuds !== 'object' || typeof capture.pages !== 'object' || typeof capture.page !== 'string') {
      return { rang, genre, fichier, capture: null, raison: 'pas une capture rejouable' };
    }
    return { rang, genre, fichier, capture: capture as CaptureArchitect };
  } catch {
    return { rang, genre, fichier, capture: null, raison: 'fichier illisible' };
  }
}

/** Le décompte des sources trouvées et absentes, pour le rapport. */
export function etatDesSources(): { readonly trouvees: number; readonly absentes: number } {
  let trouvees = 0;
  for (let rang = 1; rang <= NOMBRE_DE_SOURCES; rang += 1) if (chargerLaSource(rang).capture) trouvees += 1;
  return { trouvees, absentes: NOMBRE_DE_SOURCES - trouvees };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Un banc sur le double d'une capture

interface Banc {
  readonly messages: PluginMessage[];
  readonly exceptions: string[];
  readonly injection: Injection;
  readonly ui: InterfaceSeule | null;
  /** Ce que la sonde de la capture a vu du moteur : sa couverture, quand elle est partielle. */
  readonly moteur: { partiel: boolean };
  demander(demande?: DemandeDAnalyse): Promise<void>;
  identite(): IdentiteDAnalyse | null;
  annuler(): Promise<void>;
  numero: number;
  fermer(): void;
}

interface OptionsDeBanc {
  readonly plan?: Plan | ((b: Banc) => Plan);
  readonly lecteurs?: (lecteurs: Lecteurs, b: Banc) => Lecteurs;
  /** La lecture du composant : avec elle, l'interface reçoit les messages et l'écran se lit. */
  readonly lecture?: LectureDeComposant;
}

const architectureDe = (double: ReturnType<typeof doubleDepuisCapture>): string => {
  try {
    return lireLArchitectureDuFichier((double.figma.root as unknown as { getSharedPluginData(espace: string, cle: string): string }).getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER));
  } catch {
    return 'illisible';
  }
};

async function ouvrirLeBanc(capture: CaptureArchitect, options: OptionsDeBanc = {}): Promise<Banc> {
  reinitialiserLAnalyse();
  retenirLesModeles(null);
  const double = doubleDepuisCapture(capture);
  (globalThis as { figma?: unknown }).figma = double.figma;
  const messages: PluginMessage[] = [];
  const exceptions: string[] = [];
  const ui = options.lecture ? await interfaceSeule(options.lecture, architectureDe(double)) : null;
  const contexte: Contexte = {
    figma: double.figma as unknown as PluginAPI,
    envoyer: (message) => { messages.push(message); ui?.recevoir(message); },
    surveillerLeDocument: () => [],
  };
  const moteur = { partiel: false };
  let banc!: Banc;
  const lecteurs = options.lecteurs ? options.lecteurs(LECTEURS_DE_FIGMA, { moteur } as Banc) : LECTEURS_DE_FIGMA;
  const plan = typeof options.plan === 'function' ? options.plan({ annuler: () => banc.annuler() } as Banc) : options.plan;
  const injection = injecter(lecteurs, plan);
  const traitement = traiterAvec(injection.lecteurs);
  banc = {
    messages, exceptions, injection, ui, moteur, numero: 0,
    async demander(demande) {
      try {
        await traitement(demande ?? { type: 'analyser', demande: ++banc.numero }, contexte);
      } catch (erreur) {
        exceptions.push(erreur instanceof Error ? `${erreur.name} : ${erreur.message}` : String(erreur));
      }
    },
    identite: () => [...messages].reverse().find((m): m is Extract<PluginMessage, { type: 'analyse-commencee' }> => m.type === 'analyse-commencee')?.analyse ?? null,
    async annuler() {
      const analyse = banc.identite();
      await banc.demander({ type: 'annuler-analyse', ...(analyse ? { analyse } : {}) });
    },
    fermer() {
      reinitialiserLAnalyse();
      retenirLesModeles(null);
      delete (globalThis as { figma?: unknown }).figma;
    },
  };
  return banc;
}

const finalDe = (messages: readonly PluginMessage[]): MessageFinal | undefined => [...messages].reverse().find((m): m is MessageFinal => m.type === 'analyse');

// ---------------------------------------------------------------------------------------------------------------------------
// La base de chaque source : l'analyse sans panne

export interface Reference {
  readonly final: MessageFinal;
  readonly lecture: LectureDeComposant;
  /** Les layers de chaque variant du relevé, dans l'ordre du relevé. */
  readonly comptes: readonly number[];
  readonly releve: ReleveDeComposant;
}

const references = new Map<number, Promise<Reference | null>>();

export function reference(source: Source): Promise<Reference | null> {
  let promesse = references.get(source.rang);
  if (!promesse) {
    promesse = (async () => {
      if (!source.capture) return null;
      const banc = await ouvrirLeBanc(source.capture);
      try {
        await banc.demander();
        const final = finalDe(banc.messages);
        const identite = analyseCourante();
        const releve = identite ? releveDeLAnalyse(identite) : null;
        if (!final || !releve) return null;
        return { final, releve, lecture: lectureDuReleve(releve), comptes: releve.variants.map((variant) => variant.layers.length) };
      } finally {
        banc.fermer();
      }
    })();
    references.set(source.rang, promesse);
  }
  return promesse;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les lecteurs d'un budget de 300 layers et d'un moteur partiel

const BUDGET_DE_L_ESSAI = 300;

function portDeLaCapture(figma: PluginAPI, inventaires?: Parameters<Lecteurs['releve']>[5]): PortDuComposant {
  const port: PortDuComposant = {
    selection: () => selectionLue(figma),
    getNodeByIdAsync: (id) => figma.getNodeByIdAsync(id) as unknown as Promise<NoeudLu | null>,
    getStyleByIdAsync: (id) => figma.getStyleByIdAsync(id) as never,
    variables: portDeLecture(figma),
    pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
  };
  return inventaires ? { ...port, getNodeByIdAsync: (id) => inventaires.noeudParIdentifiant(id, () => port.getNodeByIdAsync(id)) } : port;
}

/** Le relevé et le moteur lisent la capture avec un budget de 300 layers au lieu de 2 000 ; le moteur dit s'il a coupé. */
const avecUnBudgetDe300 = (lecteurs: Lecteurs, banc: Banc): Lecteurs => ({
  ...lecteurs,
  releve: (sujet, jeton, contexte, progresser, cooperation, inventaires) => lireLeReleve(portDeLaCapture(contexte.figma, inventaires), sujet.noeud, {
    budgetDeLayers: BUDGET_DE_L_ESSAI, jeton, cooperation, ressources: inventaires?.ressources, champs: inventaires?.champs, progresser,
    espaceDeCouleur: contexte.figma.root.documentColorProfile === 'DISPLAY_P3' ? 'display-p3' : 'srgb',
  }),
  moteur: async (sujet, jeton, { figma }, progresser, cooperation, inventaires) => {
    const resultat = await analyserLeComposant(async (texte) => { progresser?.(texte.includes('variables') ? 'structure' : 'imbriques'); }, {
      composant: sujet.noeud as unknown as ComponentSetNode, page: pageDuNoeud(sujet.noeud, figma.currentPage), budgetDeLayers: BUDGET_DE_L_ESSAI, jeton, cooperation, inventaires,
      respirer: () => new Promise((resolve) => setTimeout(resolve, 0)), publier: false,
    });
    if (resultat.etat === 'calculee') {
      progresser?.('structure');
      banc.moteur.partiel = (resultat.interne.couverture as { etat: string }).etat === 'partielle';
    }
    return resultat;
  },
});

const avecUnMoteurPartiel = (lecteurs: Lecteurs): Lecteurs => ({
  ...lecteurs,
  moteur: async (...args) => {
    const resultat = await lecteurs.moteur(...args);
    return resultat.etat === 'calculee' ? { ...resultat, interne: { ...resultat.interne, couverture: { etat: 'partielle', lus: 10, nonLus: 5 } } } as typeof resultat : resultat;
  },
});

// ---------------------------------------------------------------------------------------------------------------------------
// D3 : six pannes

interface Panne {
  readonly nom: string;
  readonly options: OptionsDeBanc;
  /** Le déroulé du banc. */
  readonly flux: (b: Banc) => Promise<void>;
}

const analyserUneFois = async (b: Banc): Promise<void> => { await b.demander(); };
const AUCUN_CONSTAT = /Aucun constat sur/;
const sansBlancs = (texte: string): string => texte.replace(/\s+/g, '');

const PANNES: readonly Panne[] = [
  { nom: 'les règles lèvent', options: { plan: lever('regles') }, flux: analyserUneFois },
  { nom: 'le niveau est illisible', options: { plan: lever('niveau') }, flux: analyserUneFois },
  { nom: 'les ignorés sont illisibles', options: { plan: lever('ignores') }, flux: analyserUneFois },
  { nom: `budget de ${BUDGET_DE_L_ESSAI} layers`, options: { lecteurs: avecUnBudgetDe300 }, flux: analyserUneFois },
  { nom: 'moteur partiel', options: { lecteurs: avecUnMoteurPartiel }, flux: analyserUneFois },
  {
    nom: 'annulation à mi-parcours', options: { plan: (b) => agir('moteur', 'avant', async () => { await b.annuler(); }) },
    flux: async (b) => { await b.demander(); },
  },
];

/** Les six pannes de D3, dans l'ordre des cas. */
export const NOMS_DES_PANNES: readonly string[] = PANNES.map((panne) => panne.nom);

const aVerifierSurLEcran = (j: Jugement, banc: Banc): ReturnType<typeof lireLEcran> | null => {
  if (!banc.ui) return null;
  try {
    const vue = lireLEcran(banc.ui.ecran);
    j.ecran.push(...lignesDeLEcran(vue));
    return vue;
  } catch (erreur) {
    j.ecarts.push({ propriete: 'P13', sorte: 'exception', detail: `lecture de l’écran : ${erreur instanceof Error ? erreur.message : String(erreur)}` });
    return null;
  }
};

/** Une source sous une panne : le statut, l'écran, la retenue et la place d'opération. */
async function jouerLaPanne(source: Source, panne: Panne): Promise<Jugement> {
  const j = new Jugement('P13');
  j.scenario.push(`Rejouer la source ${source.rang} (${source.genre}) sous la panne « ${panne.nom} »`);
  const base = source.capture ? await reference(source) : null;
  if (!source.capture || !base) {
    j.absent = true;
    j.scenario.push(`source absente : ${source.raison ?? 'capture non rejouable'}`);
    return j;
  }
  const banc = await ouvrirLeBanc(source.capture, { ...panne.options, lecture: base.lecture });
  try {
    await panne.flux(banc);
    const final = finalDe(banc.messages);
    const statut = final?.statut ?? 'aucun';
    const vue = aVerifierSurLEcran(j, banc);
    const alertes = vue ? vue.alertes.join(' | ') : '';
    const v = (tient: boolean, attendu: string, detail: string, sorte: SorteDEcartDeChaine, propriete = 'P13'): void => j.verifier(tient, attendu, detail, sorte, propriete);
    const dit = (motif: RegExp, quoi: string, propriete = 'P13'): void => v(motif.test(alertes), `l’écran dit ${quoi}`, `alertes : ${alertes || 'aucune'}`, 'muet', propriete);
    const sansCodes = (codes: readonly string[]): void => v(!(final?.constats ?? []).some((c) => codes.includes(c.code)), `aucun ${codes.join(' ni ')} dans le message final`, 'un constat de ces codes sort', 'faux-constat');

    if (panne.nom === 'annulation à mi-parcours') {
      v(JSON.stringify(banc.messages.filter((m) => m.type === 'analyse').map((m) => (m as MessageFinal).statut)) === '["annulee"]', 'un seul message final, annulee', `statuts : ${banc.messages.filter((m) => m.type === 'analyse').map((m) => (m as MessageFinal).statut).join(', ') || 'aucun'}`, 'fuite', 'P18');
      v((final?.constats.length ?? 0) === 0, 'l’annulation ne rend aucun constat', `${final?.constats.length ?? 0} constat(s)`, 'faux-constat', 'P18');
      const entree = sessionDesAnalyses().entree(final?.analyse.sujet ?? '');
      v(entree === null, 'aucune entrée de session retenue', 'une entrée de session est retenue', 'fuite', 'P18');
      v(operationEnCours() === null, 'la place d’opération est libre', `place : ${String(operationEnCours())}`, 'fuite', 'P18');
      if (vue) { dit(/L’analyse a été annulée/, 'que l’analyse a été annulée', 'P18'); v(!AUCUN_CONSTAT.test(alertes), 'l’écran ne dit pas « Aucun constat sur … »', alertes, 'accusation', 'P13'); }
      await banc.demander();
      v(finalDe(banc.messages)?.statut === base.final.statut, 'la demande suivante est servie', `statut ${String(finalDe(banc.messages)?.statut)}, attendu ${base.final.statut}`, 'fuite', 'P18');
    } else if (panne.nom.startsWith('budget')) {
      const coupe = coupeAttendue(base.comptes, BUDGET_DE_L_ESSAI);
      const lus = base.comptes.slice(0, coupe.gardes).reduce((somme, n) => somme + n, 0);
      const attendue = coupe.nonLus > 0 || banc.moteur.partiel ? 'partielle' : 'complete';
      v(statut === attendue, `le statut final est ${attendue} (relevé coupé : ${coupe.nonLus > 0}, moteur partiel : ${banc.moteur.partiel})`, `statut ${statut}`, 'accusation', 'P14');
      if (coupe.nonLus > 0) {
        v(final?.lecture?.layersNonLus === coupe.nonLus, `layersNonLus est la somme des layers laissés : ${coupe.nonLus}`, `layersNonLus ${String(final?.lecture?.layersNonLus)}`, 'accusation', 'P16');
        v(final?.variants.length === coupe.gardes, `le relevé garde ${coupe.gardes} variants`, `${final?.variants.length} variants gardés`, 'accusation', 'P16');
        v(sansBlancs(alertes).includes(`${lus}layerslussur${lus + coupe.nonLus}`), `la bannière donne les nombres lus : ${lus} layers lus sur ${lus + coupe.nonLus}`, `alertes : ${alertes || 'aucune'}`, 'accusation', 'P15');
      } else if (banc.moteur.partiel) dit(DIT.moteur, 'que le moteur n’a pas tout lu', 'P15');
      if (statut === 'partielle') {
        v(!AUCUN_CONSTAT.test(alertes), 'l’écran ne dit pas « Aucun constat sur … »', alertes, 'accusation', 'P13');
        v(!JAMAIS_N_SUR_N.test(alertes), 'la bannière ne dit pas « N lus sur N »', alertes, 'accusation', 'P15');
      }
    } else {
      v(statut === 'partielle', 'le statut final est partielle (table 2.5)', `statut ${statut}`, 'accusation', 'P14');
      v(!AUCUN_CONSTAT.test(alertes), 'l’écran ne dit pas « Aucun constat sur … »', alertes, 'accusation', 'P13');
      if (panne.nom === 'les règles lèvent') { dit(DIT.regles, 'que les règles n’ont pas été jugées'); sansCodes(['C43', 'C45']); }
      if (panne.nom === 'le niveau est illisible') dit(DIT.niveau, 'que le niveau AA est appliqué par défaut');
      if (panne.nom === 'les ignorés sont illisibles') dit(DIT.ignores, 'que les ignorés n’ont pas été lus');
      if (panne.nom === 'moteur partiel') {
        dit(DIT.moteur, 'que le moteur n’a pas tout lu', 'P15');
        v(!JAMAIS_N_SUR_N.test(alertes), 'la bannière ne dit pas « N lus sur N »', alertes, 'accusation', 'P15');
        sansCodes(['C43', 'C45']);
      }
    }
    v(banc.exceptions.length === 0, 'aucune exception ne sort de traiterAvec', banc.exceptions.join(' ; '), 'fuite', 'P28');
    v(operationEnCours() === null, 'la place d’opération est libre à la fin du cas', `place : ${String(operationEnCours())}`, 'fuite', 'P28');
    j.messages.push(...resumeDesMessages(banc.messages));
  } finally {
    banc.fermer();
  }
  return j;
}

// ---------------------------------------------------------------------------------------------------------------------------
// D4 : parité d'une prélecture promue

async function jouerLaParite(source: Source): Promise<Jugement> {
  const j = new Jugement('P23');
  j.scenario.push(`Comparer, sur la source ${source.rang} (${source.genre}), une analyse froide et une prélecture promue suivie d’un clic`);
  const base = source.capture ? await reference(source) : null;
  if (!source.capture || !base) {
    j.absent = true;
    j.scenario.push(`source absente : ${source.raison ?? 'capture non rejouable'}`);
    return j;
  }
  const froid = base.final;
  const banc = await ouvrirLeBanc(source.capture);
  try {
    await banc.demander({ type: 'analyser', origine: 'prelecture' });
    const parole = banc.messages.length;
    const place = operationEnCours();
    const entree = sessionDesAnalyses().entree(froid.analyse.sujet);
    j.verifier(parole === 0, 'la prélecture ne parle jamais à l’interface', `${parole} message(s) : ${banc.messages.map((m) => m.type).join(', ')}`, 'fuite');
    j.verifier(place === null && !banc.messages.some((m) => m.type === 'occupe'), 'la prélecture rend la place sans répondre occupe', `place : ${String(place)}`, 'fuite');
    // Une prélecture qui a évité un import par clé s'achève partielle et ne promeut rien : la parité se juge dans les deux cas.
    j.note(entree !== null ? 'la prélecture a promu son entrée de session' : 'la prélecture n’a rien promu (partielle ou import évité) : le clic relit comme à froid');
    banc.messages.length = 0;
    await banc.demander();
    const chaud = finalDe(banc.messages);
    j.verifier(chaud !== undefined, 'le clic qui suit rend un message final', 'aucun message final', 'manque');
    if (chaud) {
      j.verifier(chaud.statut === froid.statut, `le statut est celui de l’analyse froide : ${froid.statut}`, `statut ${chaud.statut}`, 'accusation');
      const cles = (constats: readonly { id: string; code: string }[]): string => JSON.stringify([...constats].map((c) => `${c.code}|${c.id}`).sort());
      j.verifier(cles(chaud.constats) === cles(froid.constats), `les ${froid.constats.length} constats sont ceux de l’analyse froide`, `${chaud.constats.length} constats, ${chaud.constats.filter((c) => !froid.constats.some((f) => f.id === c.id)).length} nouveaux et ${froid.constats.filter((f) => !chaud.constats.some((c) => c.id === f.id)).length} perdus`, 'faux-constat');
      j.verifier(JSON.stringify(chaud.constats) === JSON.stringify(froid.constats), 'les constats sont identiques champ par champ', 'les faits ou les corrections diffèrent', 'faux-constat');
      j.verifier(JSON.stringify(chaud.lecture) === JSON.stringify(froid.lecture) && JSON.stringify(chaud.variants) === JSON.stringify(froid.variants), 'la lecture et les variants sont ceux de l’analyse froide', 'la lecture ou les variants diffèrent', 'faux-constat');
    }
    j.verifier(banc.exceptions.length === 0, 'aucune exception ne sort de traiterAvec', banc.exceptions.join(' ; '), 'fuite', 'P28');
    j.messages.push(...resumeDesMessages(banc.messages));
  } finally {
    banc.fermer();
  }
  return j;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les cas

/** Les 35 cas du rejeu : D3 (30, source par source, six pannes chacune) puis D4 (5, une par source). */
export function casDuRejeu(): CasDeChaine[] {
  const cas: CasDeChaine[] = [];
  let rang = 0;
  for (let numero = 1; numero <= NOMBRE_DE_SOURCES; numero += 1) {
    for (const panne of PANNES) {
      rang += 1;
      cas.push({
        id: `F9-D3-${rang}`, famille: 'F9', operateur: 'D3', propriete: 'P13', verdict: 'attendu',
        description: `source ${numero} sous la panne « ${panne.nom} »`, executer: () => jouerLaPanne(chargerLaSource(numero), panne),
      });
    }
  }
  for (let numero = 1; numero <= NOMBRE_DE_SOURCES; numero += 1) {
    cas.push({
      id: `F9-D4-${numero}`, famille: 'F9', operateur: 'D4', propriete: 'P23', verdict: 'attendu',
      description: `source ${numero} : prélecture promue puis clic, contre une analyse froide`, executer: () => jouerLaParite(chargerLaSource(numero)),
    });
  }
  return cas;
}
