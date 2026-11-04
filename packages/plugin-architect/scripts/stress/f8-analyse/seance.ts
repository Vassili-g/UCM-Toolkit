/**
 * Le banc commun des opérateurs F9 du stress test (sections 3.4 et 5.2 du plan). Une `Seance` monte une analyse de `traiterAvec` sur
 * les lecteurs doubles d'un profil d'analyse, enveloppés par l'injecteur, capte les messages du sandbox, simule les événements de Figma
 * comme `code.ts` les branche (`evenement`) et relit l'état du sandbox à la fin du cas (`observer`).
 *
 * Chaque cas repart d'un état neuf : `reinitialiserLAnalyse` vide l'opération, la session et le journal, mais pas le compteur de
 * génération des identités (N-75). Aucun cas ne compare une génération absolue : les identités se rangent par ordre d'apparition
 * (`Seance.rang`), si bien que le compteur ne fuit pas d'un cas à l'autre.
 *
 * Les cessions du budget de calcul sont des points de passage nommés. Avec `avecCessions`, l'horloge avance de 100 ms à chaque lecture,
 * si bien que chaque appel de `cederSiBesoin` rend la main ; le rang de la cession dans la phase annoncée par le dernier message de
 * progression nomme alors la frontière (`surCession`). Le kit n'est pas enveloppé : ses contrôles sont des fonctions que le sandbox
 * importe, et seules ces cessions les atteignent sans modifier `src/`.
 */
import type { CatalogueDeReference, Constat, ReleveDeComposant } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, CLES_D_ARCHITECT, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../../../src/messages';
import type { DemandeDAnalyse } from '../../../src/messages/analyse';
import type { IdentiteDAnalyse } from '../../../src/messages/commun';
import { modelesDeLAnalyse, retenirLesModeles } from '../../../src/regles';
import {
  analyseCourante, analyseFinalisee, analyseARelire, catalogueDeFigma, annulerLaPrelecture, correctionsDeLAnalyse, couvertureInterrompue, operationEnCours, perimerApresUneEcriture, reinitialiserLAnalyse,
  sessionDesAnalyses, surChangementDeStyle, surChangementDuDocument, surInterruptionDePage, surSelection, traiterAvec, type Lecteurs, type OptionsDeLAnalyse,
} from '../../../src/sandbox/analyse';
import type { Contexte, Traiter } from '../../../src/sandbox/contexte';
import { graineDe, melanger, mulberry32 } from '../../../../kit/tests/stress/commun/prng';
import type { ComposantDeBase } from '../../../../kit/tests/stress/f3-composant/composantDeBase';
import { messageDe, type DefinitionDeCas, type Registre, type Relation, type SortieDeCas, type Variante } from './cas';
import { lireLesIgnores } from '../../../src/ecriture/ignores';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';
import { injecter, lever, rendre, type Injection, type Plan } from './injecteur';
import { appliquerLaVariante, lireLaPage, type SpecDePage } from './pageDeRegles';
import { modeleDuJeu, reglesDuModele, sansLesReglesDe } from './profilsRegles';
import {
  banc, DECLARATIONS, moteurDouble, OPTIONS_SANS_ATTENTE, PROFIL_A0, PROFILS_D_ANALYSE, specConformeDe, type BancDAnalyse, type MessageFinal, type ProfilDAnalyse,
} from './scenarioDeBase';

export const CODES_DE_REGLES = ['C43', 'C45'] as const;

/** `button-36`, UCM, AAA, une library lue : A0 avec le niveau rangé qui compte. */
export const PROFIL_A0_AAA: ProfilDAnalyse = PROFILS_D_ANALYSE.find((p) => p.forme === 'button-36' && p.architecture === 'ucm' && p.libraries === 'une' && p.niveau === 'AAA')!;
export const profilDe = (forme: ProfilDAnalyse['forme'], architecture: ProfilDAnalyse['architecture'], libraries: ProfilDAnalyse['libraries'], niveau: ProfilDAnalyse['niveau'] = 'AA'): ProfilDAnalyse =>
  PROFILS_D_ANALYSE.find((p) => p.forme === forme && p.architecture === architecture && p.libraries === libraries && p.niveau === niveau)!;

export const DECLARATION_ILLISIBLE = '{';
export const DECLARATION_FUTURE = JSON.stringify({ version: 2, ucm: true });

export type NomDEvenement = 'noeud' | 'hors-inventaire' | 'style' | 'autre-jeu' | 'variant' | 'page' | 'ecriture' | 'annulation' | 'suppression';
export type Adaptateur = (b: BancDAnalyse, lecteurs: Lecteurs, s: Seance) => Lecteurs;

export interface OptionsDeSeance {
  readonly profil?: ProfilDAnalyse;
  readonly plan?: Plan | ((s: Seance) => Plan);
  readonly adaptateurs?: readonly Adaptateur[];
  /** Le texte que le fichier rend pour sa déclaration UCM, ou une fonction qui lève. */
  readonly declaration?: string | (() => string);
  readonly avecCessions?: boolean;
  /** La page de règles ne pose pas les règles de `Size` : l'analyse a un modèle de règles à retenir. */
  readonly avecUnModele?: boolean;
  readonly optionsAnalyse?: OptionsDeLAnalyse;
  readonly variante?: Variante;
}

interface CrochetDeCession { readonly phase: string; readonly rang: number; readonly faire: () => void | Promise<void> }

export interface Observation {
  types: string[];
  /** Les statuts des messages `analyse`, dans l'ordre. */
  finals: string[];
  /** Le statut du dernier message `analyse`, ou `aucun`. */
  statut: string;
  provisoires: number;
  occupes: number;
  perimes: string[];
  codes: string[];
  bloquants: number;
  final: MessageFinal | undefined;
  constats: Constat[];
  place: ReturnType<typeof operationEnCours>;
  finalisee: boolean;
  corrections: boolean;
  entree: boolean;
  modeles: number;
  niveau: string | undefined;
  architecture: boolean | undefined;
  familles: string[];
  passages: string[];
  exceptions: string[];
  rangs: number[];
  /** La génération de chaque message `analyse`, dans l'ordre. */
  generations: number[];
  /** Les constats de chaque message `analyse`. */
  constatsParFinal: number[];
  /** Les clés du dernier message `ignores`. */
  ignores: string[];
  /** Les identifiants de correction que l'analyse retient pour l'écriture. */
  correctionsRetenues: string[];
  sansTokens: boolean | undefined;
  /** Le nom de la library du catalogue retenu, `null` sans library. */
  libraryRetenue: string | null | undefined;
  aRelire: boolean;
  interrompue: boolean;
  signature: string;
}

export class Seance {
  readonly messages: PluginMessage[];
  contexte!: Contexte;
  injection!: Injection;
  private traitement!: Traiter<DemandeDAnalyse>;
  readonly exceptions: string[] = [];
  readonly surMessage: Array<(message: PluginMessage) => void> = [];
  readonly drapeaux: Record<string, boolean> = {};
  readonly photos: Record<string, Observation> = {};
  /** Ce qu'un cas veut relire après coup : identifiants, variants, résultats d'écriture. */
  readonly notes: Record<string, unknown> = {};
  readonly compteDeCessions = new Map<string, number>();
  private readonly cessions: CrochetDeCession[] = [];
  private readonly enVol: Promise<void>[] = [];
  private horloge = 0;
  /** La phase que le dernier message de progression a annoncée, avec `debut`, `apres-provisoire` et `fini`. */
  phase = 'debut';
  numero = 0;
  declaration: string | (() => string);
  /** La valeur brute des clés d'Ignorer rangées dans le document. */
  ignoresBruts = '';
  /** Le variant que le relevé gardait en premier avant tout mélange : les cas qui visent un layer le visent par lui. */
  variantDeReference!: ReleveDeComposant['variants'][number];
  /** Les variants du relevé dans l'ordre d'origine, avant le mélange de la relation « ordre ». */
  ordreInitial!: ReleveDeComposant['variants'];

  private constructor(readonly b: BancDAnalyse, readonly options: OptionsDeSeance) {
    this.messages = b.messages;
    this.declaration = options.declaration ?? DECLARATIONS[b.profil.architecture];
  }

  static async ouvrir(options: OptionsDeSeance = {}): Promise<Seance> {
    reinitialiserLAnalyse();
    retenirLesModeles(null);
    const b = await banc(options.profil ?? PROFIL_A0);
    const s = new Seance(b, options);
    await s.preparer();
    s.monter(typeof options.plan === 'function' ? options.plan(s) : options.plan);
    return s;
  }

  private async preparer(): Promise<void> {
    const { b, options } = this;
    const { variante } = options;
    this.variantDeReference = b.releve.variants[0];
    this.ordreInitial = [...b.releve.variants];
    if (variante?.melange !== undefined) (b.releve as { variants: unknown }).variants = melanger(mulberry32(graineDe(variante.melange, 'variants')), b.releve.variants);
    const conforme = specConforme(b.composant);
    const spec = options.avecUnModele ? { ...conforme, conteneurs: [{ ...conforme.conteneurs[0], regles: sansLesReglesDe(conforme.conteneurs[0].regles, 'size') }] } : conforme;
    const releveDesRegles = (await lireLaPage(variante ? appliquerLaVariante(spec, variante) : spec)).releve;
    // `lireLaPage` retient les modèles de ce relevé : seule l'analyse du cas doit en retenir.
    retenirLesModeles(null);
    b.lecteurs.regles = async () => releveDesRegles;
    const figma = {
      root: {
        getSharedPluginData: (_espace: string, cle: string): string => {
          if (cle === CLE_ARCHITECTURE_DU_FICHIER) return typeof this.declaration === 'function' ? this.declaration() : this.declaration;
          if (cle === CLES_D_ARCHITECT.ignorer) {
            if (this.drapeaux.ignoresIllisibles) throw new Error('Figma refuse la lecture des ignorés');
            return this.ignoresBruts;
          }
          return '';
        },
        setSharedPluginData: (_espace: string, cle: string, valeur: string) => {
          if (cle !== CLES_D_ARCHITECT.ignorer) return;
          if (this.drapeaux.ecritureDesIgnoresLeve) throw new Error('Figma refuse l’écriture des ignorés');
          this.ignoresBruts = valeur;
        },
      },
      currentPage: { id: 'page-1', backgrounds: [] },
      clientStorage: { getAsync: async () => undefined },
    } as unknown as PluginAPI;
    this.contexte = {
      figma,
      envoyer: (message) => {
        this.messages.push(message);
        this.suivre(message);
        for (const rappel of [...this.surMessage]) rappel(message);
      },
      surveillerLeDocument: () => [],
    };
  }

  /** Remonte les lecteurs enveloppés avec `plan` : chaque appel crée sa propre trace de passages. */
  monter(plan: Plan = {}): void {
    let lecteurs: Lecteurs = this.b.lecteurs;
    for (const adaptateur of this.options.adaptateurs ?? []) lecteurs = adaptateur(this.b, lecteurs, this);
    this.injection = injecter(lecteurs, plan);
    const base = { ...(this.options.optionsAnalyse ?? OPTIONS_SANS_ATTENTE), pauseDiscrete: async () => {} };
    this.traitement = traiterAvec(this.injection.lecteurs, this.options.avecCessions
      ? { ...base, horloge: () => (this.horloge += 100), respirer: async () => { await this.surRespirer(); } }
      : base);
  }

  private suivre(message: PluginMessage): void {
    if (message.type === 'analyse-commencee') this.phase = 'debut';
    else if (message.type === 'analyse-en-cours') this.phase = message.progression?.phase ?? this.phase;
    else if (message.type === 'analyse-provisoire') this.phase = 'apres-provisoire';
    else if (message.type === 'analyse') this.phase = 'fini';
  }

  private async surRespirer(): Promise<void> {
    const rang = (this.compteDeCessions.get(this.phase) ?? 0) + 1;
    this.compteDeCessions.set(this.phase, rang);
    for (const crochet of this.cessions.filter((c) => c.phase === this.phase && c.rang === rang)) await crochet.faire();
  }

  /** Une action au rang `rang` des cessions de la phase `phase` (1 : la première). */
  surCession(phase: string, rang: number, faire: () => void | Promise<void>): void {
    this.cessions.push({ phase, rang, faire });
  }

  // -- demandes -----------------------------------------------------------------------------------------------------------------

  async demander(demande?: DemandeDAnalyse, contexte: Contexte = this.contexte): Promise<void> {
    try {
      await this.traitement(demande ?? { type: 'analyser', demande: ++this.numero }, contexte);
    } catch (erreur) {
      this.exceptions.push(messageDe(erreur));
    }
  }

  /** Lance la demande sans l'attendre : la partie synchrone de l'analyse a couru, donc la place est prise. */
  lancer(demande?: DemandeDAnalyse): Promise<void> {
    const attente = this.demander(demande);
    this.enVol.push(attente);
    return attente;
  }

  /** Garde une promesse que `attendre` attend : une écriture ou une demande lancée par une action d'un point de passage. */
  garder(promesse: Promise<unknown>): void {
    this.enVol.push(promesse.then(() => undefined, (erreur) => { this.exceptions.push(messageDe(erreur)); }));
  }

  /** Retire les crochets de cession et d'écoute de messages : la demande suivante repart sans l'action de la première. */
  desarmer(): void {
    this.cessions.length = 0;
    this.surMessage.length = 0;
  }

  async attendre(): Promise<void> {
    for (let dernier = -1; dernier !== this.enVol.length;) {
      dernier = this.enVol.length;
      await Promise.all(this.enVol);
    }
  }

  identiteCourante(): IdentiteDAnalyse | undefined {
    return [...this.messages].reverse().find((m): m is Extract<PluginMessage, { type: 'analyse-commencee' }> => m.type === 'analyse-commencee')?.analyse;
  }

  /** `identite` : l'annulation vise l'identité reçue ; `demande` : le numéro de la demande, seul connu avant la fin de la lecture du sujet. */
  async annuler(par: 'identite' | 'demande', demande = 1): Promise<void> {
    const analyse = this.identiteCourante();
    await this.demander(par === 'identite' ? { type: 'annuler-analyse', ...(analyse ? { analyse } : {}) } : { type: 'annuler-analyse', demande });
  }

  /** Le rang (1, 2…) de l'identité parmi celles que les messages ont montrées. */
  rang(identite: IdentiteDAnalyse): number {
    const vues: number[] = [];
    for (const message of this.messages) {
      const analyse = (message as { analyse?: IdentiteDAnalyse }).analyse;
      if (analyse && !vues.includes(analyse.generation)) vues.push(analyse.generation);
    }
    return vues.indexOf(identite.generation) + 1;
  }

  // -- événements du document -----------------------------------------------------------------------------------------------------

  /** Les mêmes appels que `code.ts` : la prélecture s'arrête, puis le sandbox juge l'événement. */
  evenement(nom: NomDEvenement): void {
    const { releve } = this.b;
    const variant = this.variantDeReference;
    const idLayer = variant.layers[1]?.id ?? variant.id;
    const c = this.contexte;
    if (nom === 'ecriture') { perimerApresUneEcriture(c); return; }
    annulerLaPrelecture();
    switch (nom) {
      case 'noeud': surChangementDuDocument([idLayer], c); return;
      case 'hors-inventaire': surChangementDuDocument(['hors:inventaire'], c); return;
      case 'style': surChangementDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:1' }], c); return;
      case 'autre-jeu': surSelection('autre-jeu', 'figma', c); return;
      case 'variant': surSelection(variant.id, 'figma', c); return;
      case 'page': surInterruptionDePage('page-1', 'page-quittee', c); return;
      case 'annulation': surChangementDuDocument([variant.id, idLayer], c); return;
      case 'suppression': surChangementDuDocument([{ type: 'DELETE', id: releve.jeu.id, node: { id: releve.jeu.id, parent: null } } as never], c); return;
    }
  }

  /** `nombre` changements de propriété sur des nœuds hors de l'inventaire, un événement chacun. */
  evenementsHorsInventaire(nombre: number): void {
    for (let rang = 0; rang < nombre; rang += 1) surChangementDuDocument([`hors:${rang}`], this.contexte);
  }

  // -- observation ----------------------------------------------------------------------------------------------------------------

  observer(): Observation {
    const finals = this.messages.filter((m): m is MessageFinal => m.type === 'analyse');
    const final = finals[finals.length - 1];
    const identite = this.identiteCourante();
    const entree = sessionDesAnalyses().entree(this.b.releve.jeu.cle);
    const familles = entree ? Object.keys(entree.requetes).filter((nom) => nom.startsWith('controle-')) : [];
    const constats = final?.constats ? [...final.constats] : [];
    const courante = analyseCourante();
    return {
      types: this.messages.map((m) => m.type),
      finals: finals.map((m) => m.statut),
      statut: final?.statut ?? 'aucun',
      provisoires: this.messages.filter((m) => m.type === 'analyse-provisoire').length,
      occupes: this.messages.filter((m) => m.type === 'occupe').length,
      perimes: this.messages.flatMap((m) => (m.type === 'perime' ? [m.cause] : [])),
      codes: constats.map((c) => c.code),
      bloquants: constats.filter((c) => c.type === 'bloquant').length,
      final,
      constats,
      place: operationEnCours(),
      finalisee: identite ? analyseFinalisee(identite) : false,
      corrections: identite ? correctionsDeLAnalyse(identite) !== null : false,
      entree: entree !== null,
      modeles: modelesDeLAnalyse().size,
      niveau: entree ? String(entree.sorties.niveau) : undefined,
      architecture: entree ? entree.sorties.architectureUcm : undefined,
      familles,
      passages: [...this.injection.passages],
      exceptions: [...this.exceptions],
      rangs: finals.map((m) => this.rang(m.analyse)),
      generations: finals.map((m) => m.analyse.generation),
      constatsParFinal: finals.map((m) => m.constats.length),
      ignores: [...(([...this.messages].reverse().find((m): m is Extract<PluginMessage, { type: 'ignores' }> => m.type === 'ignores'))?.constats ?? [])],
      correctionsRetenues: identite ? [...(correctionsDeLAnalyse(identite)?.keys() ?? [])] : [],
      sansTokens: final?.sansTokens,
      libraryRetenue: entree ? (entree.sorties.catalogue as { library: { nom: string } | null }).library?.nom ?? null : undefined,
      aRelire: courante ? analyseARelire(courante) : false,
      interrompue: courante ? couvertureInterrompue(courante) : false,
      signature: this.messages.map((m) => (m.type === 'analyse' ? `analyse:${m.statut}` : m.type)).join(','),
    };
  }

  photo(nom: string): void {
    this.photos[nom] = this.observer();
  }

  nettoyer(): void {
    reinitialiserLAnalyse();
    retenirLesModeles(null);
  }
}

/** La page de règles qui porte toutes les règles que le modèle du composant demande. */
export function specConforme(composant: ComposantDeBase): SpecDePage {
  const base = specConformeDe(composant);
  const regles = reglesDuModele(modeleDuJeu(composant.spec.jeu, base.proprietes), { marquees: false, ecriture: 'exacte' });
  return { ...base, conteneurs: [{ ...base.conteneurs[0], regles }] };
}

export interface Ecran {
  /** Le texte de chaque alerte du panneau : c'est là qu'une analyse partielle dit ce qui manque. */
  readonly alertes: readonly string[];
  readonly texte: string;
  /** Les libellés des boutons du panneau. */
  readonly boutons: readonly string[];
  /** Le nombre de sections d'éléments (couleurs, tailles…) qui ont des points. */
  readonly sections: number;
  /** Le nombre de sections « tenues » : un élément que l'analyse dit contrôlé et sans point. */
  readonly tenues: number;
}

export interface SeanceJouee { readonly donnees: Record<string, unknown>; readonly constats: Constat[] }

/** Joue `flux` sur une séance neuve, puis relit l'état du sandbox (`obs`), les photos du cas et ce que `extra` ajoute. */
export async function jouerSeance(
  options: OptionsDeSeance, flux: (s: Seance) => Promise<void>, extra?: (s: Seance) => Record<string, unknown> | Promise<Record<string, unknown>>,
): Promise<SortieDeCas> {
  const s = await Seance.ouvrir(options);
  try {
    await flux(s);
    await s.attendre();
  } catch (erreur) {
    s.exceptions.push(`déroulé du cas : ${messageDe(erreur)}`);
  }
  const obs = s.observer();
  let ajout: Record<string, unknown> = {};
  try {
    ajout = extra ? await extra(s) : {};
  } catch (erreur) {
    s.exceptions.push(`lecture de l’écran : ${messageDe(erreur)}`);
    obs.exceptions = [...s.exceptions];
  }
  const donnees = { obs, photos: s.photos, notes: s.notes, signature: obs.signature, ...ajout };
  s.nettoyer();
  return { constats: obs.constats, donnees };
}

/** Une analyse, comme le clic du designer. */
export const analyserUneFois = async (s: Seance): Promise<void> => { await s.demander(); };

export const observationDe = (sortie: SortieDeCas): Observation => (sortie.donnees as { obs: Observation }).obs;
export const photoDe = (sortie: SortieDeCas, nom: string): Observation => (sortie.donnees as { photos: Record<string, Observation> }).photos[nom];
export const ecranDe = (sortie: SortieDeCas, nom = 'ecran'): Ecran | undefined => (sortie.donnees as Record<string, Ecran | undefined>)[nom];

// ---------------------------------------------------------------------------------------------------------------------------
// Oracle

export interface Attente {
  /** Les statuts des messages `analyse`, dans l'ordre. */
  readonly statuts?: readonly string[];
  /** Le statut du dernier message `analyse` (`aucun` : aucun message final). */
  readonly statut?: string;
  readonly provisoires?: number;
  readonly occupes?: number;
  readonly perimes?: readonly string[];
  readonly bloquant?: boolean;
  /** `false` : ni entrée de session, ni corrections, ni modèle retenus. `true` : l'entrée et les corrections de l'analyse sont retenues. */
  readonly retenue?: boolean;
  readonly modeles?: number;
  /** Vrai si l'entrée de session est retenue, faux sinon. */
  readonly entree?: boolean;
  /** Faux seulement quand le cas laisse volontairement la place prise. */
  readonly libre?: boolean;
  readonly sansException?: boolean;
  /** Aucun constat de ces codes dans le message final. */
  readonly sansCodes?: readonly string[];
  /** Au moins un constat de ces codes dans le message final. */
  readonly avecCodes?: readonly string[];
  /** Ce que l'écran (`ecran` des données) doit dire dans ses alertes, et ce qu'il ne doit pas dire. */
  readonly ecran?: { readonly dit?: ReadonlyArray<RegExp>; readonly nonDit?: ReadonlyArray<RegExp>; readonly dansLeTexte?: boolean; readonly sectionsAuMoins?: number; readonly boutons?: ReadonlyArray<RegExp>; readonly aucuneTenue?: boolean };
}

const egaux = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function juger(sortie: SortieDeCas, attente: Attente): string[] {
  const o = observationDe(sortie);
  const messages: string[] = [];
  const comparer = (nom: string, obtenu: unknown, voulu: unknown): void => {
    if (!egaux(obtenu, voulu)) messages.push(`${nom} : ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(voulu)}`);
  };
  if (attente.statuts) comparer('statuts des messages analyse', o.finals, attente.statuts);
  if (attente.statut !== undefined) comparer('statut final', o.statut, attente.statut);
  if (attente.provisoires !== undefined) comparer('messages analyse-provisoire', o.provisoires, attente.provisoires);
  if (attente.occupes !== undefined) comparer('messages occupe', o.occupes, attente.occupes);
  if (attente.perimes) comparer('causes de péremption', o.perimes, attente.perimes);
  if (attente.bloquant !== undefined && (o.bloquants > 0) !== attente.bloquant) messages.push(`${o.bloquants} constat(s) bloquant(s) dans le final, attendu ${attente.bloquant ? 'au moins un' : 'aucun'}`);
  if (attente.retenue === false && (o.entree || o.corrections || o.modeles > 0)) messages.push(`retenu malgré tout : entrée de session ${o.entree}, corrections ${o.corrections}, modèles ${o.modeles}`);
  if (attente.retenue === true && !(o.entree && o.corrections)) messages.push(`entrée de session ${o.entree}, corrections ${o.corrections} : attendu l’analyse retenue`);
  if (attente.entree !== undefined && o.entree !== attente.entree) messages.push(`entrée de session ${o.entree}, attendu ${attente.entree}`);
  if (attente.modeles !== undefined) comparer('modèles de règles retenus', o.modeles, attente.modeles);
  for (const code of attente.sansCodes ?? []) if (o.codes.includes(code)) messages.push(`le message final porte ${code}, attendu aucun`);
  for (const code of attente.avecCodes ?? []) if (!o.codes.includes(code)) messages.push(`le message final ne porte pas ${code}`);
  if ((attente.libre ?? true) && o.place !== null) messages.push(`la place d’opération reste prise (${String(o.place)})`);
  if (attente.sansException !== false) for (const exception of o.exceptions) messages.push(`exception sortie de traiterAvec : ${exception}`);
  if (attente.ecran) {
    const ecran = ecranDe(sortie);
    if (!ecran) messages.push('écran non rendu');
    else {
      const lu = attente.ecran.dansLeTexte ? ecran.texte : ecran.alertes.join(' | ');
      for (const motif of attente.ecran.dit ?? []) if (!motif.test(lu)) messages.push(`l’écran ne dit pas ${motif} (alertes : ${ecran.alertes.join(' | ') || 'aucune'})`);
      for (const motif of attente.ecran.nonDit ?? []) if (motif.test(lu)) messages.push(`l’écran dit ${motif} : « ${(lu.match(motif) ?? [''])[0]} »`);
      if (attente.ecran.sectionsAuMoins !== undefined && ecran.sections < attente.ecran.sectionsAuMoins) messages.push(`l’écran montre ${ecran.sections} section(s) de constats, attendu au moins ${attente.ecran.sectionsAuMoins}`);
      if (attente.ecran.aucuneTenue && ecran.tenues > 0) messages.push(`l’écran montre ${ecran.tenues} section(s) « tenue(s) » dans une analyse partielle : une coche dirait que l’élément a été contrôlé`);
      for (const motif of attente.ecran.boutons ?? []) if (!ecran.boutons.some((bouton) => motif.test(bouton))) messages.push(`l’écran n’a aucun bouton ${motif} (boutons : ${ecran.boutons.join(' | ') || 'aucun'})`);
    }
  }
  return messages;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Pannes

export type Partie = 'releve' | 'catalogue' | 'moteur' | 'regles' | 'niveau' | 'ignores' | 'declaration' | 'dependances';
export const PARTIES: readonly Partie[] = ['releve', 'catalogue', 'moteur', 'regles', 'niveau', 'ignores', 'declaration', 'dependances'];

/** Une couverture du moteur qui dit n'avoir lu qu'une partie des variants. */
export function moteurAvecCouverture(couverture: unknown): ResultatSansPublication {
  const resultat = moteurDouble();
  (resultat as unknown as { interne: { couverture: unknown } }).interne.couverture = couverture;
  return resultat;
}

export const manquees = (nombre: number, champ = 'paddingLeft'): ReleveDeComposant['lecture']['manquees'] =>
  Array.from({ length: nombre }, (_, rang) => ({ layer: `20:${(rang % 7) + 1}`, champ, motif: 'Figma refuse la lecture' }));

/** Pose une lecture dégradée sur le relevé que le lecteur du banc rend. */
export const degraderLaLecture = (lecture: Partial<ReleveDeComposant['lecture']>): Adaptateur => (b, lecteurs) => {
  (b.releve as { lecture: unknown }).lecture = { ...b.releve.lecture, ...lecture };
  return lecteurs;
};
export const avecCatalogue = (modifier: (catalogue: CatalogueDeReference) => void): Adaptateur => (b, lecteurs) => { modifier(b.catalogue); return lecteurs; };
export const avecLecteurs = (surcharge: Partial<Lecteurs> | ((b: BancDAnalyse, s: Seance) => Partial<Lecteurs>)): Adaptateur =>
  (b, lecteurs, s) => ({ ...lecteurs, ...(typeof surcharge === 'function' ? surcharge(b, s) : surcharge) });

export function fusionnerLesPlans(...plans: Plan[]): Plan {
  const fusion: Plan = {};
  for (const plan of plans) for (const [passage, actions] of Object.entries(plan)) fusion[passage as keyof Plan] = [...(fusion[passage as keyof Plan] ?? []), ...(actions ?? [])];
  return fusion;
}

const collectionInaccessible: Adaptateur = avecCatalogue((c) => { c.collections.push({ cle: 'c-inaccessible', nom: 'components', role: null, modes: [], etat: 'inaccessible' }); });
export const MOTEUR_PARTIEL = avecLecteurs({ moteur: async () => moteurAvecCouverture({ etat: 'partielle', lus: 100, nonLus: 20 }) });

/** Ce que le plan de pannes d'une séance pose pour que `partie` ne soit pas jugée. */
export function pannesDe(parties: readonly Partie[]): OptionsDeSeance {
  const plans: Plan[] = [];
  const adaptateurs: Adaptateur[] = [];
  let declaration: string | undefined;
  let profil: ProfilDAnalyse | undefined;
  for (const partie of parties) {
    if (partie === 'releve') adaptateurs.push(degraderLaLecture({ manquees: manquees(1) }));
    else if (partie === 'catalogue') adaptateurs.push(collectionInaccessible);
    else if (partie === 'moteur') adaptateurs.push(MOTEUR_PARTIEL);
    else if (partie === 'regles') plans.push(lever('regles'));
    else if (partie === 'niveau') { plans.push(lever('niveau')); profil = PROFIL_A0_AAA; }
    else if (partie === 'ignores') plans.push(lever('ignores'));
    else if (partie === 'declaration') declaration = DECLARATION_ILLISIBLE;
    else plans.push(lever('dependances'));
  }
  return { plan: fusionnerLesPlans(...plans), adaptateurs, ...(declaration !== undefined ? { declaration } : {}), ...(profil ? { profil } : {}) };
}

/** Table de vérité de la section 2.5 : une part non jugée rend `partielle`, sauf les dépendances (Q-F89-3). */
export const statutDesParties = (parties: readonly Partie[]): 'complete' | 'partielle' => (parties.some((partie) => partie !== 'dependances') ? 'partielle' : 'complete');

export { lever, rendre };

// ---------------------------------------------------------------------------------------------------------------------------
// Sonde des cessions

let sonde: Promise<{ controles: number; corrections: number }> | null = null;

/** Le nombre de cessions de la phase des contrôles et de celle des corrections sur A0 : « dernière famille » et « cession finale » en dépendent. */
export function sondeDesCessions(): Promise<{ controles: number; corrections: number }> {
  sonde ??= (async () => {
    const s = await Seance.ouvrir({ avecCessions: true });
    await s.demander();
    const bilan = { controles: s.compteDeCessions.get('controles') ?? 0, corrections: s.compteDeCessions.get('corrections') ?? 0 };
    s.nettoyer();
    return bilan;
  })();
  return sonde;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Interface (faux DOM), chargée à la demande

interface NoeudLisible { textContent: string; disabled?: boolean; hidden?: boolean; querySelector(s: string): NoeudLisible | null; querySelectorAll(s: string): NoeudLisible[] }
type EtatDeLInterface = Record<string, unknown> & { analyse: { statut: string; perimee: boolean; constats: readonly unknown[]; tous: readonly unknown[]; ignores: readonly string[] } | null; composant: Record<string, unknown>; reference: unknown; architecture: unknown; panneau: Record<string, unknown> };

export interface InterfaceChargee {
  readonly comme: (noeud: unknown) => NoeudLisible;
  readonly etatInitial: () => EtatDeLInterface;
  readonly recevoir: (etat: unknown, message: PluginMessage) => void;
  readonly creerBarre: (app: unknown) => { element: unknown; mettreAJour?: () => void };
  readonly monterLePanneau: (app: unknown, vue: unknown) => { element: unknown; mettreAJour(): void };
  readonly estHorsUcm: (architecture: string | null) => boolean;
  readonly noterLEnvoi: (etat: unknown, ids: readonly string[], liaisons: number) => void;
  readonly libraryAChoisir: (etat: unknown) => boolean;
  readonly analyseApplicable: (analyse: unknown) => boolean;
  readonly lectureDeLaGalerie: { sujet: { id: string; variants: Array<{ id: string; nom: string }> } };
}

let interfaceChargee: Promise<InterfaceChargee> | null = null;

/** Les modules de l'interface lisent `document` à l'appel : ils se chargent après `poserLeDom`, et seulement quand un cas les demande. */
export function chargerLInterface(): Promise<InterfaceChargee> {
  interfaceChargee ??= (async () => {
    const dom = await import('../../../tests/domDeTest');
    dom.poserLeDom();
    const [etat, analyse, barre, panneau, hors] = await Promise.all([
      import('../../../src/ui/etat'), import('../../../src/ui/composant/analyse'), import('../../../src/ui/barre'), import('../../../src/ui/analyse'), import('../../../src/ui/vues/horsUcm'),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const galerie = require('../../../galerie/etats/corrections.cjs') as { alertCorrections: InterfaceChargee['lectureDeLaGalerie'] };
    return {
      comme: dom.comme as never, etatInitial: etat.etatInitial as never, recevoir: analyse.recevoirUneAnalyse as never, creerBarre: barre.creerBarre as never,
      monterLePanneau: panneau.monterLePanneau as never, estHorsUcm: hors.estHorsUcm, analyseApplicable: analyse.analyseApplicable as never, noterLEnvoi: analyse.noterLEnvoi as never, libraryAChoisir: analyse.libraryAChoisir as never, lectureDeLaGalerie: galerie.alertCorrections,
    };
  })();
  return interfaceChargee;
}

const MESSAGES_DE_L_ANALYSE: ReadonlySet<string> = new Set(['analyse-commencee', 'analyse-en-cours', 'analyse-provisoire', 'analyse', 'perime', 'occupe', 'ignores']);

/**
 * L'état de l'interface après avoir reçu les messages de l'analyse, dans l'ordre. Le composant affiché est celui de la galerie, avec
 * les variants de l'analyse : le panneau ne montre une analyse que si l'un de ses variants est un variant du composant affiché.
 */
export async function etatApres(messages: readonly PluginMessage[], options: { architecture?: string | null; reference?: { library: string | null; nom: string | null; candidates: number } } = {}): Promise<EtatDeLInterface> {
  const ui = await chargerLInterface();
  const etat = ui.etatInitial();
  const porteurDeVariants = messages.find((m): m is Extract<PluginMessage, { type: 'analyse' | 'analyse-provisoire' }> => m.type === 'analyse' || m.type === 'analyse-provisoire');
  const galerie = ui.lectureDeLaGalerie;
  etat.composant.lecture = porteurDeVariants ? { ...galerie, sujet: { ...galerie.sujet, variants: porteurDeVariants.variants } } : galerie;
  etat.composant.selection = { id: galerie.sujet.id, nom: 'Alert' };
  etat.architecture = options.architecture ?? null;
  etat.reference = options.reference ?? null;
  for (const message of messages) if (MESSAGES_DE_L_ANALYSE.has(message.type)) ui.recevoir(etat, message);
  return etat;
}

const normaliser = (texte: string): string => texte.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** L'écran du mode Composant pour cet état : le panneau des constats (alertes, sections, boutons) monté sur le faux DOM. */
export async function ecranDe_(etat: EtatDeLInterface): Promise<Ecran> {
  const ui = await chargerLInterface();
  const app = {
    etat, appliquer() {}, selectionner() {}, ignorerLaProposition() {}, repondre() {}, ignorer() {}, nePlusIgnorer() {}, ouvrirLaConfiguration() {}, rendre() {}, annulerLaReponse() {}, annulerAnalyse() {},
  };
  const vue = { poserLaSelectionDuPlugin() {}, poserLesCorrections() {} };
  const panneau = ui.monterLePanneau(app, vue);
  panneau.mettreAJour();
  const racine = ui.comme(panneau.element);
  return {
    alertes: racine.querySelectorAll('.alerte').map((alerte) => normaliser(alerte.textContent)),
    texte: normaliser(racine.textContent),
    boutons: racine.querySelectorAll('button').map((bouton) => normaliser(bouton.textContent)),
    sections: racine.querySelectorAll('.section-element').length - racine.querySelectorAll('.bande-element.tenue').length,
    tenues: racine.querySelectorAll('.bande-element.tenue').length,
  };
}

/** L'écran que montre le panneau pour les messages que le sandbox vient d'envoyer. */
export async function ecranApres(messages: readonly PluginMessage[], options?: Parameters<typeof etatApres>[1]): Promise<Ecran> {
  return ecranDe_(await etatApres(messages, options));
}

export interface EtatDeLaBarre { readonly texte: string; readonly analyserInactif: boolean; readonly analyserCache: boolean }

/** Le bouton Analyser de la barre, en disposition étroite (mode Composant), pour cet état. */
export async function barreApres(etat: EtatDeLInterface): Promise<EtatDeLaBarre> {
  const ui = await chargerLInterface();
  etat.disposition = 'etroite';
  const barre = ui.creerBarre({ etat, configurationOuverte: () => false, analyser() {}, basculerLePanneau() {}, annulerAnalyse() {} });
  barre.mettreAJour?.();
  const analyser = ui.comme(barre.element).querySelector('.btn-compact');
  return { texte: normaliser(analyser?.textContent ?? ''), analyserInactif: analyser?.disabled === true, analyserCache: analyser?.hidden === true };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Enregistrement d'un cas de séance

export interface CasDeSeance {
  readonly description: string;
  readonly options?: OptionsDeSeance;
  readonly flux?: (s: Seance) => Promise<void>;
  readonly attente: Attente;
  readonly extra?: (s: Seance) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** Des vérifications propres au cas, sur la sortie. */
  readonly plus?: (sortie: SortieDeCas) => string[];
  readonly question?: string;
  readonly rattachement?: string;
  readonly relations?: readonly Relation[];
  readonly codesJuges?: readonly string[];
  /** La library de référence que la Configuration annonce à l'interface, pour l'écran. */
  readonly reference?: { readonly library: string | null; readonly nom: string | null; readonly candidates: number };
  /** L'architecture que l'écran suppose, quand elle diffère de la déclaration du fichier (un fichier sans déclaration n'a que l'alerte hors UCM à l'écran). */
  readonly architectureDeLEcran?: string;
}

const architectureDeLaSeance = (s: Seance): string => {
  try { return lireLArchitectureDuFichier(typeof s.declaration === 'function' ? s.declaration() : s.declaration); } catch { return 'illisible'; }
};

export function ajouterUneSeance(registre: Registre, operateur: string, cas: CasDeSeance): void {
  const definition: DefinitionDeCas = {
    description: cas.description, attendus: [], codesJuges: cas.codesJuges ?? [], relations: cas.relations ?? [], oracle: cas.attente,
    ...(cas.question ? { question: cas.question } : {}), ...(cas.rattachement ? { rattachement: cas.rattachement } : {}),
    jouer: (variante) => jouerSeance({ ...cas.options, variante }, cas.flux ?? analyserUneFois, async (s) => ({
      ...(cas.attente.ecran ? { ecran: await ecranApres(s.messages, { architecture: cas.architectureDeLEcran ?? architectureDeLaSeance(s), ...(cas.reference ? { reference: cas.reference } : {}) }) } : {}),
      ...(cas.extra ? await cas.extra(s) : {}),
    })),
    verifier: (sortie) => [...juger(sortie, cas.attente), ...(cas.plus?.(sortie) ?? [])],
  };
  registre.ajouter(operateur, definition);
}

/** Un cas qu'aucun double ne rend constructible : il reste dans le décompte, `mesure`, avec sa raison. */
export function ajouterUnCasNonConstructible(registre: Registre, operateur: string, description: string, raison: string): void {
  registre.ajouter(operateur, {
    description: `${description} (non constructible : ${raison})`, question: 'non constructible', relations: [],
    jouer: async () => ({ constats: [], donnees: { raison } }), verifier: () => [],
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Ce que l'écran doit dire d'une part non jugée, et catalogue du produit

/** Ce qu'une alerte du panneau doit nommer pour dire qu'une part n'a pas été jugée. */
export const DIT: Readonly<Record<Partie | 'budget' | 'manquees', RegExp>> = {
  releve: /lectures? (ont|a) échoué/i,
  catalogue: /catalogue|library|tokens? (du|dans le) fichier/i,
  moteur: /moteur|composants imbriqués/i,
  regles: /règles?/i,
  niveau: /\bAA\b/,
  ignores: /ignorés?/i,
  declaration: /déclaration/i,
  dependances: /dépendances?/i,
  budget: /a lu \d[\d  ]* (layers|variants) sur \d/i,
  manquees: /lectures? (ont|a) échoué/i,
};

/** Jamais « N variants lus sur N » ni « N layers lus sur N » : le nombre lu égal au total ment sur ce qui manque. */
export const JAMAIS_N_SUR_N = /a lu (\d[\d  ]*) (?:variants|layers) sur \1(?!\d)/;

/** Un `figma` assez complet pour que `catalogueDeFigma` lise les libraries et le fichier, sans variable locale. */
export function figmaDeCatalogue(contexte: Contexte): PluginAPI {
  const refus = async (): Promise<never> => { throw new Error('Clé absente de la bibliothèque'); };
  return {
    root: contexte.figma.root, currentPage: { id: 'page-1', backgrounds: [] }, clientStorage: { getAsync: async () => undefined },
    variables: {
      getLocalVariablesAsync: async () => [], getLocalVariableCollectionsAsync: async () => [], getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => null, importVariableByKeyAsync: refus,
    },
  } as unknown as PluginAPI;
}

/** Le lecteur de catalogue du produit : il décide seul du repli sur le fichier quand la library ne se lit pas. */
export const catalogueDuProduit: Adaptateur = (_b, lecteurs) => ({
  ...lecteurs,
  catalogue: (releve, jeton, contexte, cooperation, libraries, inventaires, options) =>
    catalogueDeFigma(releve, jeton, { ...contexte, figma: figmaDeCatalogue(contexte) }, cooperation, libraries, inventaires, options),
});

export const bibliothequesIllisibles = { etat: 'illisible', motif: 'Figma refuse de lire les libraries' };

// ---------------------------------------------------------------------------------------------------------------------------
// Moteur à points

/** Un moteur à couverture complète dont les phrases sont `points`, dans l'ordre : le sandbox en tire les points du moteur. */
export function moteurAvecPoints(points: ReadonlyArray<{ readonly point: PointACorriger; readonly noeuds: readonly string[] }>): ResultatSansPublication {
  const resultat = moteurDouble();
  const phrases = points.map((entree) => phraseDe(entree.point));
  const interne = (resultat as unknown as { interne: Record<string, unknown> }).interne;
  interne.warnings = phrases;
  interne.parties = new Map(points.map((entree, rang) => [phrases[rang], entree.point] as const));
  interne.localisations = new Map(points.map((entree, rang) => [phrases[rang], [...entree.noeuds]] as const));
  return resultat;
}

/** Un seul variant, sans layer, propriété ni token : les contrôles du kit ne trouvent rien à dire, il ne reste que les points du moteur. */
export const sansConstatsDuKit: Adaptateur = (b, lecteurs) => {
  (b.releve as { proprietes: unknown }).proprietes = [];
  (b.releve as { variants: unknown }).variants = [{ ...b.releve.variants[0], valeurs: {}, layers: [] }];
  b.catalogue.variables = [];
  b.catalogue.collections = [];
  return lecteurs;
};

/** Le lecteur des ignorés du produit : les clés rangées dans le document, lues par `lireLesIgnores`. */
export const ignoresDuProduit: Adaptateur = (_b, lecteurs) => ({ ...lecteurs, ignores: async (contexte) => lireLesIgnores(contexte.figma as never) });
