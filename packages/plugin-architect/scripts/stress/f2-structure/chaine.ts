/**
 * La chaîne du stress test F2, du sandbox à l'écran : un catalogue fabriqué passe par `traiterAvec` de `sandbox/structure.ts` sur un
 * double d'`Acces`, ses messages `structure` entrent dans `monterStructure` (le vrai domaine de l'interface), et les constats et les
 * corrections se montent dans les conteneurs de l'onglet Constats, sur le faux DOM de `tests/domDeTest.ts`. Le harnais lit ensuite les cartes, les cases, le
 * pied et les boutons, applique des gestes (Appliquer, Ignorer, « Ne plus ignorer ») et lit les réponses du sandbox.
 *
 * Ce module ne contient aucun cas. Il fournit la chaîne (`lancerLaChaine`), l'écran (`Ecran`) et les contrôles des propriétés P9 à
 * P14 du plan : un contrôle rend ses écarts (`EcartDEcran`), vide quand la propriété tient. L'oracle de l'écran vient des
 * réponses Q-03 (toute correction arrive décochée) et de la section 2.3 du plan ; le code actuel ne les tient pas, et le harnais les
 * mesure comme des écarts sans les contourner.
 *
 * `monterStructure` demande une coquille de Nomenclature que le harnais ne monte pas. Le harnais lui donne le double de `tests/rapport.test.ts`
 * (`tokens` : `hote`, `ignores`, `haut`, `pied`, `poserLaStructure`) et les conteneurs qu'il lit : tous sont rangés sous une même racine. Un geste d'Ignorer qui n'a pas de bouton à
 * l'écran remplace la prochaine demande de l'interface par la demande du geste, sous le même numéro, comme `demanderAvec` de
 * `ui/structure/index.ts`. Le sandbox garde un état global (`reinitialiserLAnalyse`) : les chaînes se lancent l'une après l'autre.
 */
import type { CatalogueDeReference, Constat, Correction } from '@ucm-kit/core/controles';
import type { EcritureChoisie } from '@ucm-kit/core/protocoles';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import type { PluginMessage } from '../../../src/messages';
import type { DemandeDeStructure, MessageDeStructure } from '../../../src/messages/structure';
import { reinitialiserLAnalyse } from '../../../src/sandbox/analyse';
import type { Contexte } from '../../../src/sandbox/contexte';
import { traiterAvec, type Acces } from '../../../src/sandbox/structure';
import { GROUPES, lireLesConstats, lireLesCorrections, type Noms } from '../../../src/ui/structure/lecture';
import { TEXTES } from '../../../src/ui/textes';
import { comme, ElementDeTest, poserLeDom } from '../../../tests/domDeTest';

poserLeDom();

// L'interface lit `document` à l'appel : le domaine se charge après la pose du faux DOM.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { monterStructure } = require('../../../src/ui/structure') as typeof import('../../../src/ui/structure');

// ---------------------------------------------------------------------------------------------------------------------------
// La chaîne

/** Une lecture ou une écriture de l'accès qui lève, comme le refus de Figma. */
export const LEVE = Symbol('leve');

export interface EtatDesAcces {
  /** `null` : hors UCM ou lecture sans aboutissement ; `LEVE` : l'accès lève. */
  catalogue: CatalogueDeReference | null | typeof LEVE;
  reglages: { ecriture: EcritureChoisie | null; cles: string[] } | typeof LEVE;
  ecrire: Acces['ecrire'];
  /** Remplace `acces.catalogue` : D1-4 y met la vraie lecture de Figma sur un double qui refuse. */
  lecture?: Acces['catalogue'];
}

export interface ParametresDeChaine {
  readonly catalogue: CatalogueDeReference | null | typeof LEVE;
  readonly ecriture?: EcritureChoisie | null;
  readonly cles?: readonly string[];
  readonly ecrire?: Acces['ecrire'];
  readonly lecture?: Acces['catalogue'];
}

export type MessageDeStructureRecu = Extract<PluginMessage, { type: 'structure' }>;

export interface Chaine {
  readonly etat: EtatDesAcces;
  readonly messages: PluginMessage[];
  readonly ecran: Ecran;
  /** Les corrections que le sandbox a reçues à écrire, un lot par `appliquer-structure`. */
  readonly ecritures: Correction[][];
  /** Remplace le catalogue que l'accès rend, pour la lecture suivante. */
  poserLeCatalogue(catalogue: CatalogueDeReference): void;
  /** Le dernier message `structure` du sandbox. */
  derniere(): MessageDeStructureRecu;
  /** La lecture que le mode Tokens demande à l'ouverture et à chaque relecture. */
  lire(): Promise<void>;
  /** Un geste d'Ignorer ou de rétablissement, sous le numéro de la prochaine demande de l'interface. */
  demanderAvec(construire: (numero: number) => DemandeDeStructure): Promise<void>;
  /** Un clic de l'interface, puis la fin de ce que le sandbox en fait. */
  apres(geste: () => void): Promise<void>;
  /** Les ignorés que le fichier a rangés. */
  cles(): readonly string[];
}

const DECLARATION_UCM = texteDeLArchitectureDuFichier(true);

/** Ce que l'écran sait du relevé : le nom entier d'une variable (collection, puis nom), comme `ui/index.ts`. */
function nomsDe(catalogue: () => CatalogueDeReference | null | typeof LEVE): Noms {
  const lire = (): CatalogueDeReference | null => {
    const courant = catalogue();
    return courant === LEVE ? null : courant;
  };
  const nom = (cle: string): string | null => {
    const courant = lire();
    const variable = courant?.variables.find((candidate) => candidate.cle === cle);
    if (!courant || !variable) return null;
    const collection = courant.collections.find((candidate) => candidate.cle === variable.collection);
    return collection ? `${collection.nom}/${variable.nom}` : variable.nom;
  };
  return {
    nom,
    cle: (entier) => lire()?.variables.find((variable) => nom(variable.cle) === entier)?.cle ?? null,
  };
}

export async function lancerLaChaine(parametres: ParametresDeChaine): Promise<Chaine> {
  reinitialiserLAnalyse();
  const etat: EtatDesAcces = {
    catalogue: parametres.catalogue === null || parametres.catalogue === LEVE ? parametres.catalogue : structuredClone(parametres.catalogue),
    reglages: { ecriture: parametres.ecriture ?? null, cles: [...(parametres.cles ?? [])] },
    ecrire: parametres.ecrire ?? (async (corrections) => ({ ecrites: corrections.map(({ id }) => id), sautees: [], sansAnnulation: [] })),
    ...(parametres.lecture ? { lecture: parametres.lecture } : {}),
  };
  const ecritures: Correction[][] = [];
  const messages: PluginMessage[] = [];
  const pendants: Promise<void>[] = [];
  let remplacement: ((numero: number) => DemandeDeStructure) | null = null;

  const reglages = (): { ecriture: EcritureChoisie | null; cles: string[] } => {
    if (etat.reglages === LEVE) throw new Error('Figma refuse la lecture des réglages');
    return etat.reglages;
  };
  const rangement = (): ReturnType<Acces['rangement']> => {
    const cles = (): string[] => reglages().cles;
    const rendre = () => ({ ecrit: true as const, cles: [...cles()] });
    return {
      ignorerUnConstat: (constat) => { cles().push(constat.id); return rendre(); },
      nePlusIgnorer: (id) => { cles().splice(0, cles().length, ...cles().filter((cle) => cle !== id)); return rendre(); },
      ignorerUnRole: (role) => { cles().push(`role-ucm:${role}`); return rendre(); },
      retablirUnRole: (role) => { cles().splice(0, cles().length, ...cles().filter((cle) => cle !== `role-ucm:${role}`)); return rendre(); },
    };
  };
  const acces: Acces = {
    catalogue: async (contexte) => {
      if (etat.lecture) return etat.lecture(contexte);
      if (etat.catalogue === LEVE) throw new Error('Figma refuse la lecture des variables');
      return etat.catalogue === null ? null : structuredClone(etat.catalogue);
    },
    reglages: async () => reglages(),
    ecrire: async (corrections) => { ecritures.push([...corrections]); return etat.ecrire(corrections); },
    rangement,
  };
  const traiter = traiterAvec(acces);
  const contexte: Contexte = {
    figma: { root: { getSharedPluginData: () => DECLARATION_UCM } } as unknown as PluginAPI,
    envoyer: (message) => {
      messages.push(message);
      if (message.type === 'structure' || message.type === 'structure-appliquee') structure.recevoir(message as MessageDeStructure);
    },
    surveillerLeDocument() {},
  };

  const racine = new ElementDeTest('DIV');
  const conteneur = (): ElementDeTest => { const element = new ElementDeTest('DIV'); racine.append(element); return element; };
  const haut = conteneur();
  const hotes = new Map<string, ElementDeTest>();
  const hote = (categorie: string): ElementDeTest => {
    const existant = hotes.get(categorie);
    if (existant) return existant;
    const cree = conteneur();
    hotes.set(categorie, cree);
    return cree;
  };
  const ignores = conteneur();
  const pied = conteneur();
  const coquille = {
    tokens: { hote, ignores, haut, pied, poserLaStructure() {} },
    pied: new ElementDeTest('DIV'),
    toutDecocher() {},
  };
  const structure = monterStructure(coquille as never, {
    envoyer: (demande) => {
      const reelle = remplacement ? remplacement(demande.demande) : demande;
      remplacement = null;
      pendants.push(traiter(reelle, contexte));
    },
    noms: nomsDe(() => etat.catalogue),
    ouvrirLaFiche() {},
  });
  const attendre = async (): Promise<void> => {
    while (pendants.length > 0) await Promise.all(pendants.splice(0));
  };

  const chaine: Chaine = {
    etat, messages, ecritures,
    ecran: new Ecran(racine, racine),
    poserLeCatalogue(catalogue) { etat.catalogue = structuredClone(catalogue); },
    derniere: () => [...messages].reverse().find((message) => message.type === 'structure') as MessageDeStructureRecu,
    async lire() {
      structure.demander();
      await attendre();
    },
    async demanderAvec(construire) {
      remplacement = construire;
      structure.demander();
      await attendre();
    },
    async apres(geste) {
      geste();
      await attendre();
    },
    cles: () => (etat.reglages === LEVE ? [] : etat.reglages.cles),
  };
  await chaine.lire();
  return chaine;
}

/** Le `Noms` de l'écran sur un catalogue, pour les lectures qui ne passent pas par le DOM. */
export const nomsDuCatalogue = (catalogue: CatalogueDeReference): Noms => nomsDe(() => catalogue);

// ---------------------------------------------------------------------------------------------------------------------------
// L'écran

/** Le texte d'un nœud du faux DOM, sans les blancs doubles. */
export const texteDe = (element: ElementDeTest): string => element.textContent.replace(/\s+/g, ' ').trim();

export class Ecran {
  readonly racineAFaire: ElementDeTest;
  readonly racineCorrections: ElementDeTest;

  constructor(aFaire: unknown, corrections: unknown) {
    this.racineAFaire = comme(aFaire);
    this.racineCorrections = comme(corrections);
  }

  texteAFaire(): string { return texteDe(this.racineAFaire); }
  texteDesCorrections(): string { return texteDe(this.racineCorrections); }

  /** Les cartes de constats à régler dans Figma, sans les cartes muettes de Ignorés. */
  cartesAFaire(): ElementDeTest[] { return this.racineAFaire.querySelectorAll('.bloc-constat').filter((carte) => !carte.classes.has('muette')); }
  /** Les cartes muettes sous Ignorés : un constat ignoré pour sa palette, ou un rôle ignoré dans tout le fichier. */
  cartesIgnorees(): ElementDeTest[] { return this.racineAFaire.querySelectorAll('.bloc-constat').filter((carte) => carte.classes.has('muette')); }

  /** Les cases des lignes de diff des cartes de corrections : une par correction. */
  lignes(): ElementDeTest[] { return this.racineCorrections.querySelectorAll('.diff input').filter((element) => element.type === 'checkbox'); }
  lignesCochees(): ElementDeTest[] { return this.lignes().filter((element) => element.checked); }
  /** Les cases d'en-tête des cartes de corrections. */
  casesDeCartes(): ElementDeTest[] { return this.racineCorrections.querySelectorAll('.bloc-tete input').filter((element) => element.type === 'checkbox'); }
  cartesDeCorrections(): ElementDeTest[] { return this.racineCorrections.querySelectorAll('.bloc'); }

  pied(): ElementDeTest | null { return this.racineCorrections.querySelector('.structure-pied'); }
  boutonAppliquer(): ElementDeTest | null { return this.pied()?.querySelector('button') ?? null; }
  /** La ligne verte que l'application d'un lot laisse, vide tant qu'aucun lot n'est revenu. */
  resultat(): string {
    const zone = this.racineCorrections.querySelector('.page-stack')?.children.find((enfant) => !enfant.classes.has('structure-liste'));
    return zone && !zone.hidden ? texteDe(zone) : '';
  }

  boutons(motif: RegExp, racine: ElementDeTest = this.racineCorrections): ElementDeTest[] {
    return racine.querySelectorAll('button').filter((bouton) => motif.test(texteDe(bouton)));
  }

  /** Les intertitres de la liste des corrections, chacun avec les éléments qui le suivent jusqu'au suivant. */
  sectionsDeCorrections(): { readonly titre: string; readonly elements: ElementDeTest[] }[] {
    const liste = this.racineCorrections.querySelector('.structure-liste');
    const sections: { titre: string; elements: ElementDeTest[] }[] = [];
    for (const enfant of liste?.children ?? []) {
      if (enfant.classes.has('intertitre-structure')) sections.push({ titre: texteDe(enfant), elements: [] });
      else sections.at(-1)?.elements.push(enfant);
    }
    return sections;
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les écarts de l'écran

export type SorteDEcartDEcran =
  /** P12 : une correction arrive cochée, ou le pied dit qu'une correction l'est. */
  | 'cochee'
  /** P12 : « Tout cocher » ou « Tout décocher » manque. */
  | 'bouton-manquant'
  /** P9, P11 : un constat ou une correction n'a pas de carte, ou une carte de trop. */
  | 'non-affiche'
  /** P10 : un genre émis n'est pas déclaré à l'écran. */
  | 'genre-non-declare'
  /** P13 : l'écran dit « Rien à régler » après une lecture qui a échoué, ou il perd ce que la lecture précédente montrait. */
  | 'echec-tu'
  /** P14 : un motif de saut sans texte lisible. */
  | 'motif-sans-texte'
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

// P9 et P10 -----------------------------------------------------------------------------------------------------------------

/** Le code et le genre d'un constat, tels que l'écran les lit : `doublons` et `valeur-vide` n'ont pas de fait `genre`, `sans genre` sinon. */
export function genreDuConstat(constat: Constat): string {
  const { genre, doublons, soeurs } = constat.faits;
  const dit = typeof genre === 'string' ? genre : typeof doublons === 'number' ? 'doublons' : typeof soeurs === 'number' ? 'valeur-vide' : 'sans genre';
  return `${constat.code} ${dit}`;
}

const sansCorrection = (constat: Constat): Constat => ({ ...constat, correction: undefined });

/** Les identifiants des lignes de correction que l'écran dessine pour ces corrections. */
function lignesLues(message: MessageDeStructureRecu, noms: Noms): string[] {
  const lues = lireLesCorrections(message.corrections, noms, message.constats);
  return [...lues.variables, ...lues.crans, ...lues.modes, ...lues.scopes].flatMap((carte) => carte.lignes.map(({ id }) => id));
}

/**
 * P9 : tout constat émis et non ignoré se lit à l'écran, dans `lireLesConstats` s'il n'a pas de correction, par la ligne de sa correction
 * dans `lireLesCorrections` sinon. Le DOM confirme les comptes : une carte « À faire » par constat lu, une case par ligne de correction.
 */
export function controlerLAffichage(chaine: Chaine, noms: Noms): Verification {
  const v = verification();
  const message = chaine.derniere();
  const lus = new Set(lireLesConstats(message.constats, noms).map(({ id }) => id));
  const lignes = new Set(lignesLues(message, noms));
  for (const constat of message.constats) {
    const vu = constat.correction ? lignes.has(constat.correction.id) : lus.has(constat.id);
    verifier(v, vu, {
      propriete: 'P9', sorte: 'non-affiche',
      detail: `${genreDuConstat(constat)} ${constat.id} ${constat.correction ? 'a une correction sans ligne' : 'sans correction n\'a pas de carte'} à l'écran`,
    });
  }
  for (const correction of message.corrections) {
    verifier(v, lignes.has(correction.id), { propriete: 'P9', sorte: 'non-affiche', detail: `la correction ${correction.id} (${correction.sorte}) n'a pas de ligne à l'écran` });
  }
  verifier(v, chaine.ecran.cartesAFaire().length === lus.size, {
    propriete: 'P9', sorte: 'non-affiche', detail: `${chaine.ecran.cartesAFaire().length} cartes À faire dessinées, ${lus.size} constats lus`,
  });
  verifier(v, chaine.ecran.lignes().length === lignes.size, {
    propriete: 'P9', sorte: 'non-affiche', detail: `${chaine.ecran.lignes().length} lignes de correction dessinées, ${lignes.size} lues`,
  });
  return v;
}

/**
 * P10 : tout genre émis appartient à `GENRES_DECLARES` et à `GROUPE_DU_GENRE`. Ces deux tables ne sont pas exportées : la sonde passe
 * un constat sans sa correction dans `lireLesConstats`, comme l'écran le fait pour une proposition ignorée, et attend une entrée rangée
 * sous un intertitre de `GROUPES`. Un constat de C60 ou de C63 `scopes` n'a pas de genre, donc la sonde ne le trouve pas.
 */
export function controlerLesGenres(constats: readonly Constat[], noms: Noms): Verification {
  const v = verification();
  const vus = new Set<string>();
  for (const constat of constats) {
    const genre = genreDuConstat(constat);
    if (vus.has(genre)) continue;
    vus.add(genre);
    const lus = lireLesConstats([sansCorrection(constat)], noms);
    verifier(v, lus.length === 1 && GROUPES.includes(lus[0].groupe), {
      propriete: 'P10', sorte: 'genre-non-declare',
      detail: `${genre} (${constat.id}) n'a ni genre déclaré ni groupe : sans correction, l'écran ne l'affiche pas`,
    });
  }
  return v;
}

// P11 -----------------------------------------------------------------------------------------------------------------------

export const MOTIF_NE_PLUS_IGNORER = /^Ne plus ignorer/;

/** Le constat d'après son identifiant dans le dernier message, avec sa correction éventuelle. */
const constatDe = (chaine: Chaine, id: string): Constat | undefined => chaine.derniere().constats.find((constat) => constat.id === id);

/**
 * P11 : ignorer la proposition d'un constat retire la correction et laisse le constat visible, avec une phrase et un statut non vides.
 * Ignorer le constat le range sous Ignorés, et « Ne plus ignorer » le rend. La clé `proposition:<id>` est celle que `ignores.ts` range.
 */
export async function jouerIgnorerLaPropositionPuisLeConstat(chaine: Chaine, noms: Noms, constat: Constat): Promise<Verification> {
  const v = verification();
  const genre = genreDuConstat(constat);
  const idDeLaCorrection = constat.correction?.id;
  if (chaine.etat.reglages === LEVE) throw new Error('les réglages du fichier ne se lisent pas');
  chaine.etat.reglages.cles.push(`proposition:${constat.id}`);
  await chaine.lire();

  const restant = constatDe(chaine, constat.id);
  verifier(v, restant !== undefined && restant.correction === undefined, {
    propriete: 'P11', sorte: 'geste-sans-effet', detail: `${genre} ${constat.id} : le sandbox ne garde pas le constat sans sa correction`,
  });
  verifier(v, idDeLaCorrection === undefined || !chaine.derniere().corrections.some(({ id }) => id === idDeLaCorrection), {
    propriete: 'P11', sorte: 'geste-sans-effet', detail: `${genre} ${constat.id} : la correction reste dans le message après « Ne plus proposer »`,
  });
  const lu = lireLesConstats(chaine.derniere().constats, noms).find(({ id }) => id === constat.id);
  verifier(v, lu !== undefined, {
    propriete: 'P11', sorte: 'non-affiche',
    detail: `${genre} ${constat.id} : une fois sa proposition ignorée, le constat n'a plus aucune carte à l'écran`,
  });
  if (lu) {
    const phrase = lu.phrase.map((morceau) => (typeof morceau === 'string' ? morceau : morceau.chemin)).join('').trim();
    verifier(v, phrase !== '' && lu.statut !== null && lu.statut.trim() !== '', {
      propriete: 'P11', sorte: 'non-affiche', detail: `${genre} ${constat.id} : la carte n'a pas de phrase (« ${phrase} ») ou pas de statut (${JSON.stringify(lu.statut)})`,
    });
  }

  // Ignorer le constat : il se range sous Ignorés avec « Ne plus ignorer », puis revient.
  await chaine.demanderAvec((numero) => ({ type: 'ignorer-constat-de-structure', demande: numero, constat: constat.id }));
  verifier(v, constatDe(chaine, constat.id) === undefined, {
    propriete: 'P11', sorte: 'geste-sans-effet', detail: `${genre} ${constat.id} : le constat ignoré reste dans les constats visibles`,
  });
  const rendre = chaine.ecran.boutons(MOTIF_NE_PLUS_IGNORER, chaine.ecran.racineAFaire)[0];
  verifier(v, rendre !== undefined, {
    propriete: 'P11', sorte: 'non-affiche', detail: `${genre} ${constat.id} : une fois ignoré, le constat n'a pas de carte sous Ignorés avec « Ne plus ignorer »`,
  });
  if (rendre) {
    await chaine.apres(() => rendre.clic());
    verifier(v, constatDe(chaine, constat.id) !== undefined, {
      propriete: 'P11', sorte: 'geste-sans-effet', detail: `${genre} ${constat.id} : « Ne plus ignorer » ne rend pas le constat`,
    });
  } else {
    await chaine.demanderAvec((numero) => ({ type: 'retablir-constat-de-structure', demande: numero, constat: constat.id }));
  }
  return v;
}

// P12 -----------------------------------------------------------------------------------------------------------------------

export const MOTIF_TOUT_COCHER = /^Tout cocher/;
export const MOTIF_TOUT_DECOCHER = /^Tout décocher/;

/** P12 : aucune ligne ni aucune carte n'est cochée, le pied dit qu'aucune correction ne l'est et Appliquer est inactif. */
export function controlerLesCasesDecochees(ecran: Ecran, quand: string): Verification {
  const v = verification();
  const cases = [...ecran.lignes(), ...ecran.casesDeCartes()];
  const cochees = ecran.lignesCochees();
  v.verifiees += cases.length;
  if (cochees.length > 0) {
    v.ecarts.push({
      propriete: 'P12', sorte: 'cochee', nombre: cochees.length,
      detail: `${quand} : ${cochees.length} lignes cochées sur ${ecran.lignes().length} (${cochees.slice(0, 2).map((ligne) => ligne.getAttribute('aria-label') ?? '-').join(' ; ')}…)`,
    });
  }
  const pied = ecran.pied();
  verifier(v, pied !== null, { propriete: 'P12', sorte: 'non-affiche', detail: `${quand} : le pied des corrections est absent` });
  if (pied) {
    const resume = texteDe(pied.querySelector('.structure-resume') ?? pied);
    verifier(v, resume === TEXTES.aucuneCorrectionCochee, { propriete: 'P12', sorte: 'cochee', detail: `${quand} : le pied dit « ${resume} », attendu « ${TEXTES.aucuneCorrectionCochee} »` });
    verifier(v, ecran.boutonAppliquer()?.disabled === true, { propriete: 'P12', sorte: 'cochee', detail: `${quand} : Appliquer est actif` });
  }
  return v;
}

/** P12 : chaque section de corrections porte « Tout cocher » et « Tout décocher ». */
export function controlerLesBoutonsDeCochage(ecran: Ecran): Verification {
  const v = verification();
  for (const { titre, elements } of ecran.sectionsDeCorrections()) {
    const boutons = elements.flatMap((element) => ecran.boutons(/./, element));
    verifier(v, boutons.some((bouton) => MOTIF_TOUT_COCHER.test(texteDe(bouton))), { propriete: 'P12', sorte: 'bouton-manquant', detail: `la section « ${titre} » n'a pas « Tout cocher »` });
    verifier(v, boutons.some((bouton) => MOTIF_TOUT_DECOCHER.test(texteDe(bouton))), { propriete: 'P12', sorte: 'bouton-manquant', detail: `la section « ${titre} » n'a pas « Tout décocher »` });
  }
  return v;
}

/**
 * Le geste du designer avant Appliquer : la première ligne de correction est cochée à la main. Une ligne que l'écran coche déjà ne
 * bouge pas. Rend le nom accessible de la case, ou `null` quand l'écran n'a aucune ligne.
 */
export function cocherUneLigneAMain(ecran: Ecran): string | null {
  const ligne = ecran.lignes()[0];
  if (!ligne) return null;
  if (!ligne.checked) ligne.clic();
  return ligne.getAttribute('aria-label') ?? '-';
}

// P13 -----------------------------------------------------------------------------------------------------------------------

/** P13 : après une lecture qui échoue, l'écran dit que la lecture n'a pas abouti et n'affiche pas « Rien à régler ». */
export function controlerLEchecDeLecture(ecran: Ecran, quand: string): Verification {
  const v = verification();
  verifier(v, !ecran.texteAFaire().includes(TEXTES.rienAFaireDansFigma), {
    propriete: 'P13', sorte: 'echec-tu', detail: `${quand} : l'onglet dit « ${TEXTES.rienAFaireDansFigma} » alors que la lecture n'a pas abouti`,
  });
  return v;
}

// P14 -----------------------------------------------------------------------------------------------------------------------

/**
 * P14 : après l'écriture d'une création sautée pour un motif, l'écran dit le motif en mots. Le texte du motif est `TEXTES.motifDeSaut`,
 * et la ligne verte du résultat le porte, à côté du nom de la variable.
 */
export function controlerLeTexteDuMotif(chaine: Chaine, motif: string, nomDeLaCreation: string): Verification {
  const v = verification();
  const phrase = TEXTES.motifDeSaut[motif];
  verifier(v, phrase !== undefined && phrase.trim() !== '', {
    propriete: 'P14', sorte: 'motif-sans-texte', detail: `le motif ${motif} n'a pas de texte dans TEXTES.motifDeSaut`,
  });
  const resultat = chaine.ecran.resultat();
  verifier(v, phrase !== undefined && resultat.includes(phrase) && resultat.includes(nomDeLaCreation), {
    propriete: 'P14', sorte: 'motif-sans-texte', detail: `après un saut ${motif}, l'écran dit « ${resultat.replace(/^✓\s*/, '')} » : ni ${nomDeLaCreation} ni sa raison`,
  });
  return v;
}
