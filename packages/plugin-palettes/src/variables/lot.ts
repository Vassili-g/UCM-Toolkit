/**
 * Le plan d'un lot de palettes ([VAR-07], [VAR-08], [VAR-13]) : ce que
 * l'écriture fera de chaque palette demandée, sur le fichier tel que les
 * palettes précédentes du lot le laissent. Gestion annonce ce plan et
 * l'écriture l'exécute : les deux voient les mêmes noms, les mêmes refus, les
 * mêmes créations, remplacements et renommages. Pur : ni Figma, ni DOM.
 *
 * Le plan garde une copie de l'inventaire et y applique, après chaque palette
 * écrite, ce que l'écriture fera : les variables créées, les noms pris ou
 * changés, la collection et les modes créés, le suivi. Les identifiants de ce
 * qui n'existe pas encore sont inventés (`estSimule`) ; l'écriture les
 * remplace par ceux de Figma. Une palette qui échoue au moment d'écrire fausse
 * l'hypothèse des suivantes, et le geste suivant replanifie.
 */
import { aUneIntensite, profilPorteur, type Palette, type Recette } from 'ucm-couleur';

import type { VariablesDuFichier } from '../lectureDesVariables';
import type { Destination } from './destination';
import { etatDesTokens, type EtatDesTokensDUnePalette, type RenommageExecute } from './etat';
import { COLLECTION_A_CREER, nommeurDuFichier, planDeLaPalette, type CollectionVisee, type DonneesDeNommage, type VariableNommee } from './nommeur';
import { cheminDeLaReprise, type EntreeDuPlan, type ModeDuPlan, type NomReserve } from './plan';
import type { VariableLue } from './releve';
import { cheminCommun, origineDeLaReprise, variableDeLEntree, type OrigineDeLaReprise } from './reprise';
import { sansLesVariables, variablesProtegees, type PaletteSuivie, type VariableSuivie } from './suivi';

/** Ce que le plan d'un lot lit du fichier : le relevé, le suivi et les données de nommage, tels que la lecture les rend. */
export type InventaireDuLot = Pick<VariablesDuFichier, 'collections' | 'variables' | 'suivi' | 'nommage'>;

export interface DemandeDuLot {
  /** Les palettes demandées. Le lot suit l'ordre de la recette, puis celles qu'elle ne porte pas. */
  readonly palettes: readonly string[];
  /** Les palettes « Modifiés dans Figma » dont le designer remet les couleurs ([VAR-06]). */
  readonly remettre: readonly string[];
  /** Les palettes qui prennent les variables tiers de même nom ([VAR-08]). */
  readonly remplacer: readonly string[];
}

/** Ce qui porte déjà un nom que la palette veut prendre. */
export type OccupantDuNom =
  /** Une variable qu'aucune palette de la recette ne suit : remplaçable sur confirmation ([VAR-08]). */
  | { readonly par: 'tiers'; readonly id: string; readonly nom: string }
  /** Une variable d'une autre palette de la recette : jamais remplaçable. `dansLeLot` : elle la crée, la garde, la prend ou la renomme plus tôt dans le même lot. */
  | { readonly par: 'palette'; readonly palette: string; readonly id: string; readonly nom: string; readonly dansLeLot: boolean };

/** La variable qu'une entrée du plan écrit. */
export type CibleDeLEntree =
  /** Une variable du fichier, suivie, reprise ou remplacée ; `ecrire` : sa couleur diffère dans le mode visé, ou ce mode reste à créer. */
  | { readonly cible: 'presente'; readonly id: string; readonly ecrire: boolean }
  /** La variable de rang `rang` dans `creations`. */
  | { readonly cible: 'creee'; readonly rang: number }
  /** Aucune : entrée sans nom d'une palette figée, ou mode suivi sorti de la collection. L'entrée quitte le suivi. */
  | { readonly cible: 'aucune' };

/** Le mode qu'une entrée écrit. `creer` : l'écriture ajoute ce mode, ou renomme le mode par défaut de la collection, avant d'écrire. */
export interface ModeVise {
  readonly id: string;
  readonly creer?: { readonly nom: string; readonly renommer: boolean };
}

export type ModesVises = { readonly [M in ModeDuPlan]?: ModeVise };

/** Ce que l'écriture fera d'une palette. */
export interface EcritureDUnePalette {
  readonly liaison: 'destination' | 'reprise';
  /** La collection où la palette écrit : une collection du fichier, ou celle que le lot crée sous ce nom. */
  readonly collection: CollectionVisee;
  /** Le plan sous ses noms finaux. */
  readonly plan: readonly EntreeDuPlan[];
  /** L'état des tokens et ses trois listes. */
  readonly etat: EtatDesTokensDUnePalette;
  /** La cible de chaque entrée, dans l'ordre du plan. */
  readonly cibles: readonly CibleDeLEntree[];
  /** Une variable à créer par nom, dans l'ordre du plan ; `cle` est celle de sa première entrée, rangée dans son marqueur. */
  readonly creations: readonly { readonly nom: string; readonly cle: string }[];
  /** Les variables tiers prises sur confirmation : elles prennent le nom du plan, à la casse près, et gardent leur portée. */
  readonly remplacements: readonly { readonly id: string; readonly de: string; readonly vers: string }[];
  /** Les renommages que l'écriture fait : ceux d'une reprise. Vide pour une destination (D2). */
  readonly renommages: readonly RenommageExecute[];
  /** Les noms que la palette tient dans sa collection après l'écriture. */
  readonly reserves: readonly string[];
  /** Reprise : les noms du plan qu'une variable hors du lot occupe ; ces entrées sortent du plan ([VAR-13]). */
  readonly nomsOccupes: readonly string[];
  /** Le nombre de variables déjà écrites dont au moins un thème change ; une variable aux thèmes en modes compte une fois. */
  readonly aRemplacer: number;
  /** Les modes que l'écriture trouve, ajoute ou renomme, par mode du plan. */
  readonly modes: ModesVises;
  /** Destination : la palette garde le suivi de sa dernière écriture, sa collection et ses variables comprises. */
  readonly garde: boolean;
  /** Le groupe que le suivi range après l'écriture. */
  readonly groupe: string;
  /** Reprise : le chemin d'origine que le suivi range après l'écriture, quand il en a un. */
  readonly chemin?: string;
  /** Reprise : l'intensité que portent les variables d'origine. */
  readonly intensite?: PaletteSuivie['intensite'];
  /** Reprise : le chemin commun des variables d'origine, tel que Gestion le montre ; `null` pour une destination. */
  readonly origine: string | null;
}

export type DecisionDuLot =
  | { readonly palette: string; readonly decision: 'absente' }
  | { readonly palette: string; readonly decision: 'modifiee'; readonly etat: EtatDesTokensDUnePalette }
  /** `ecriture` dit ce que la palette ferait si la collection existait : Gestion en tire son annonce. */
  | { readonly palette: string; readonly decision: 'collection-introuvable'; readonly ecriture: EcritureDUnePalette }
  | { readonly palette: string; readonly decision: 'mode-introuvable'; readonly mode: ModeDuPlan; readonly ecriture: EcritureDUnePalette }
  /** Refus avant toute mutation ; `ecriture` dit ce que la palette aurait fait, pour l'annonce. */
  | { readonly palette: string; readonly decision: 'nom-pris'; readonly nom: string; readonly occupant: OccupantDuNom; readonly ecriture: EcritureDUnePalette }
  | ({ readonly palette: string; readonly decision: 'ecrire' } & EcritureDUnePalette);

export interface PlanDuLot {
  /** Une décision par palette demandée, dans l'ordre d'écriture. */
  readonly palettes: readonly DecisionDuLot[];
  /** La destination après le lot ; une collection `{ nom }` le reste, et l'écriture y range l'identifiant de la collection créée. */
  readonly destination: Destination;
  /** L'inventaire que le plan suppose après l'écriture du lot : les tests le comparent au fichier. */
  readonly inventaireApres: InventaireDuLot;
}

const PREFIXE_SIMULE = 'ucm-palettes:';

/** L'identifiant du mode par défaut de la collection que le lot crée. */
export const MODE_PAR_DEFAUT_A_CREER = `${COLLECTION_A_CREER}:mode-par-defaut`;

/** Vrai pour un identifiant que le plan invente : l'écriture le remplace par celui que Figma donne. */
export function estSimule(id: string): boolean {
  return id.startsWith(PREFIXE_SIMULE);
}

/** L'identifiant inventé de la variable de rang `rang` dans les `creations` d'une palette. */
export function idSimuleDeLaVariable(palette: string, rang: number): string {
  return `${PREFIXE_SIMULE}lot:${palette}:${rang}`;
}

/** Une collection de l'inventaire simulé : ses modes et le nombre de ses variables, tous types confondus, évoluent avec le lot. */
interface CollectionSimulee {
  readonly id: string;
  readonly nom: string;
  modes: { id: string; nom: string }[];
  variables: number;
}

interface Simule {
  readonly collections: Map<string, CollectionSimulee>;
  readonly variables: Map<string, VariableLue>;
  donnees: DonneesDeNommage | undefined;
  suivies: { [id: string]: PaletteSuivie };
  destination: Destination;
  /** Les variables qu'une palette du lot a créées, gardées, prises ou renommées, vers cette palette. */
  readonly appartenance: Map<string, string>;
  /** Par collection, les noms en minuscules que les palettes écrites du lot tiennent, vers la palette. */
  readonly reserves: Map<string, Map<string, string>>;
  modesInventes: number;
}

function simulerLeDepart(fichier: InventaireDuLot): Simule {
  return {
    collections: new Map(fichier.collections.map((collection) => [collection.id, { id: collection.id, nom: collection.nom, modes: collection.modes.map((mode) => ({ ...mode })), variables: collection.variables }])),
    variables: new Map(fichier.variables.map((variable) => [variable.id, variable])),
    donnees: fichier.nommage,
    suivies: { ...fichier.suivi.palettes },
    destination: fichier.suivi.destination,
    appartenance: new Map(),
    reserves: new Map(),
    modesInventes: 0,
  };
}

/** Le mode d'une collection qui porte ce nom, sans casse ni espaces autour. */
function modeNomme(collection: CollectionSimulee, nom: string, exclu?: string): string | undefined {
  return collection.modes.find((mode) => mode.id !== exclu && mode.nom.trim().toLowerCase() === nom.toLowerCase())?.id;
}

/** Les modes qu'une palette de la destination écrit ([VAR-10]), trouvés dans la collection ou à créer. */
function modesDeLaDestination(collection: CollectionSimulee, garde: PaletteSuivie | undefined, themes: Destination['themes'], inventer: () => string): ModesVises {
  const existe = (mode: string | undefined): mode is string => mode !== undefined && collection.modes.some((candidat) => candidat.id === mode);
  const parDefaut = collection.modes[0].id;
  if (themes === 'chemin') return { unique: { id: existe(garde?.modes.unique) ? garde!.modes.unique! : parDefaut } };
  // Une collection sans variable et à un seul mode est neuve : son mode se renomme, plutôt que d'en ajouter un.
  const neuve = collection.variables === 0 && collection.modes.length === 1;
  const lightTrouve = existe(garde?.modes.light) ? garde!.modes.light : modeNomme(collection, 'Light');
  const light: ModeVise = lightTrouve !== undefined
    ? { id: lightTrouve }
    : neuve ? { id: parDefaut, creer: { nom: 'Light', renommer: true } } : { id: inventer(), creer: { nom: 'Light', renommer: false } };
  const darkTrouve = existe(garde?.modes.dark) ? garde!.modes.dark : modeNomme(collection, 'Dark', light.creer?.renommer ? parDefaut : undefined);
  const dark: ModeVise = darkTrouve !== undefined ? { id: darkTrouve } : { id: inventer(), creer: { nom: 'Dark', renommer: false } };
  return { light, dark };
}

/**
 * Les modes qu'une palette reprise écrit ([VAR-13]) : ceux de son suivi, le
 * mode Light de la collection quand ses variables d'origine ont disparu, et un
 * mode Dark trouvé ou à créer quand le plan écrit ce thème en mode. `disparu`
 * nomme le thème dont le mode suivi a quitté la collection.
 */
function modesDeLaReprise(
  collection: CollectionSimulee | undefined,
  suivie: PaletteSuivie,
  plan: readonly EntreeDuPlan[],
  origine: OrigineDeLaReprise | null,
  inventer: () => string,
): { readonly modes: ModesVises; readonly disparu: ModeDuPlan | undefined } {
  const ids: { [M in ModeDuPlan]?: string } = { ...suivie.modes };
  const vises = (): { [M in ModeDuPlan]?: ModeVise } => Object.fromEntries(Object.entries(ids).map(([mode, id]) => [mode, { id }])) as ModesVises;
  if (!collection) return { modes: vises(), disparu: undefined };
  const existe = (mode: string | undefined): boolean => mode !== undefined && collection.modes.some((candidat) => candidat.id === mode);
  const disparu = plan.find((entree) => ids[entree.mode] !== undefined && !existe(ids[entree.mode]));
  if (disparu) return { modes: vises(), disparu: disparu.mode };
  const ecritDark = plan.some((entree) => entree.mode === 'dark');
  if (origine?.suivies.size === 0 && plan.length > 0) {
    if (!ecritDark) delete ids.dark;
    if (!existe(ids.light)) ids.light = collection.modes[0].id;
  }
  const modes: { [M in ModeDuPlan]?: ModeVise } = vises();
  if (ids.dark === undefined && ecritDark) {
    const nomme = modeNomme(collection, 'Dark');
    modes.dark = nomme !== undefined && nomme !== ids.light ? { id: nomme } : { id: inventer(), creer: { nom: 'Dark', renommer: false } };
  }
  return { modes, disparu: undefined };
}

/** Une variable que la palette écrit : celle du fichier, ou la création de ce rang. */
type Reference = { readonly id: string } | { readonly rang: number };

/** Ce qu'une palette planifiée demande à l'inventaire simulé quand elle s'écrit. */
interface Effet {
  readonly collectionId: string;
  /** Le nom de la collection que cette palette crée ; absent quand la collection existe déjà, dans le fichier ou dans le lot. */
  readonly collectionACreer?: string;
}

/**
 * Le plan d'un lot entier : chaque palette se planifie sur le fichier tel que
 * les palettes précédentes du lot le laissent.
 */
export function planDuLot(recette: Recette, fichier: InventaireDuLot, demande: DemandeDuLot): PlanDuLot {
  const etat = simulerLeDepart(fichier);
  const remettre = new Set(demande.remettre);
  const remplacer = new Set(demande.remplacer);
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  const demandees = new Set(demande.palettes);
  const ordre = [...recette.palettes.map((palette) => palette.id).filter((id) => demandees.has(id)), ...new Set(demande.palettes.filter((id) => !presentes.has(id)))];
  const inventer = (): string => `${PREFIXE_SIMULE}mode:${(etat.modesInventes += 1)}`;

  function planifier(id: string): DecisionDuLot {
    const palette = recette.palettes.find((candidate) => candidate.id === id);
    if (!palette) return { palette: id, decision: 'absente' };
    const suivie = etat.suivies[id];
    const origine = suivie?.liaison === 'reprise' ? origineDeLaReprise(suivie, [...etat.variables.values()]) : null;
    const nomsOccupes: string[] = [];
    const nomsReserves: NomReserve[] = [];
    // Les noms du plan sont les noms finaux des règles de nommage du fichier, quand il en a ; sinon les noms bruts.
    const plan = planDeLaPalette(
      nommeurDuFichier({ nommage: etat.donnees }), recette, palette, etat.destination, suivie, origine, etat.variables, etat.collections,
      nomsOccupes, suivie?.liaison === 'reprise' ? etat.reserves.get(suivie.collection) : undefined, nomsReserves,
    );
    const tokens = etatDesTokens(plan, suivie, etat.variables, etat.destination);
    if (tokens.modifiees.length > 0 && !remettre.has(id)) return { palette: id, decision: 'modifiee', etat: tokens };
    return suivie?.liaison === 'reprise'
      ? planifierLaReprise(id, palette, suivie, plan, origine, tokens, nomsOccupes, nomsReserves)
      : planifierLaDestination(id, plan, suivie, tokens, nomsOccupes);
  }

  /** Une palette reprise écrit dans la collection d'origine de ses variables ([VAR-13]). */
  function planifierLaReprise(
    id: string,
    palette: Palette,
    suivie: PaletteSuivie,
    plan: readonly EntreeDuPlan[],
    origine: OrigineDeLaReprise | null,
    tokens: EtatDesTokensDUnePalette,
    nomsOccupes: readonly string[],
    nomsReserves: readonly NomReserve[],
  ): DecisionDuLot {
    const collection = etat.collections.get(suivie.collection);
    const { modes, disparu } = modesDeLaReprise(collection, suivie, plan, origine, inventer);
    // Sans collection ou avec un mode disparu, la palette est refusée : le parcours ne sert qu'à l'annonce de Gestion, qui ne regarde pas les modes.
    const permissif = collection === undefined || disparu !== undefined;
    const lues = etat.variables;
    const intensite = suivie.intensite ?? (aUneIntensite(palette) ? undefined : profilPorteur(recette, palette));
    const noms = new Map<string, string>();
    const nomActuel = (id: string): string => noms.get(id) ?? lues.get(id)!.nom;
    const creations: { nom: string; cle: string }[] = [];
    const cibles: CibleDeLEntree[] = [];
    const renommages = new Map<string, RenommageExecute>();
    const variableDuNom = new Map<string, Reference>();
    const variablesARemplacer = new Set<string>();
    for (const entree of plan) {
      const vise = modes[entree.mode];
      if (!permissif && (vise === undefined || (!vise.creer && !collection!.modes.some((mode) => mode.id === vise.id)))) {
        cibles.push({ cible: 'aucune' });
        continue;
      }
      const propre = suivie.variables[entree.cle]?.id;
      const presente = variableDeLEntree(entree, suivie, origine);
      let reference: Reference | undefined = propre !== undefined && lues.has(propre) ? { id: propre } : undefined;
      reference ??= presente && lues.has(presente.id) ? { id: presente.id } : variableDuNom.get(entree.nom);
      if (!reference) {
        if (entree.nom === '') {
          cibles.push({ cible: 'aucune' });
          continue;
        }
        reference = { rang: creations.length };
        creations.push({ nom: entree.nom, cle: entree.cle });
        cibles.push({ cible: 'creee', rang: reference.rang });
      } else if ('rang' in reference) {
        cibles.push({ cible: 'creee', rang: reference.rang });
      } else {
        const actuel = nomActuel(reference.id);
        if (entree.nom !== '' && actuel !== entree.nom) {
          const deja = renommages.get(reference.id);
          renommages.set(reference.id, deja ? { ...deja, vers: entree.nom } : { id: reference.id, de: actuel, vers: entree.nom, cause: actuel === entree.brut ? 'regles' : 'forme' });
          noms.set(reference.id, entree.nom);
        }
        const ecrire = vise === undefined || vise.creer !== undefined || lues.get(reference.id)!.valeurs[vise.id] !== entree.hexa;
        if (ecrire) variablesARemplacer.add(reference.id);
        cibles.push({ cible: 'presente', id: reference.id, ecrire });
      }
      if (entree.nom !== '') variableDuNom.set(entree.nom, reference);
    }

    const presentes = new Set(cibles.flatMap((cible) => (cible.cible === 'presente' ? [cible.id] : [])));
    const reserves = [...[...presentes].map(nomActuel), ...creations.map((creation) => creation.nom)];
    const ecriture: EcritureDUnePalette = {
      liaison: 'reprise',
      collection: { id: suivie.collection },
      plan,
      etat: tokens,
      cibles,
      creations,
      remplacements: [],
      renommages: [...renommages.values()],
      reserves,
      nomsOccupes,
      aRemplacer: variablesARemplacer.size,
      modes,
      garde: false,
      groupe: etat.destination.groupe,
      ...(origine ? { chemin: cheminDeLaReprise(etat.destination, suivie, recette, palette, origine) } : suivie.chemin !== undefined ? { chemin: suivie.chemin } : {}),
      ...(intensite ? { intensite } : {}),
      origine: origine?.chemin ?? cheminCommun([...presentes].map((idDeLaVariable) => lues.get(idDeLaVariable)!.nom)),
    };
    if (!collection) return { palette: id, decision: 'collection-introuvable', ecriture };
    if (disparu) return { palette: id, decision: 'mode-introuvable', mode: disparu, ecriture };
    const reserve = nomsReserves[0];
    if (reserve) {
      const occupant = origine?.parNom.get(reserve.nom.toLowerCase());
      return { palette: id, decision: 'nom-pris', nom: reserve.nom, occupant: { par: 'palette', palette: reserve.palette, id: occupant?.id ?? '', nom: occupant?.nom ?? reserve.nom, dansLeLot: true }, ecriture };
    }
    appliquer(id, ecriture, { collectionId: suivie.collection });
    return { palette: id, decision: 'ecrire', ...ecriture };
  }

  /** Une palette de la destination garde ses variables suivies et crée les autres ([VAR-07], [VAR-08]). */
  function planifierLaDestination(
    id: string,
    plan: readonly EntreeDuPlan[],
    suivie: PaletteSuivie | undefined,
    tokens: EtatDesTokensDUnePalette,
    nomsOccupes: readonly string[],
  ): DecisionDuLot {
    const destination = etat.destination;
    const lues = etat.variables;
    // La collection du suivi, tant que la destination n'a pas changé ; sinon celle de la destination ([VAR-09]).
    const garde = suivie && !tokens.destinationChangee && etat.collections.has(suivie.collection) ? suivie : undefined;
    const nomACreer = !garde && !('id' in destination.collection) ? destination.collection.nom : undefined;
    const collectionId = garde ? garde.collection : 'id' in destination.collection ? destination.collection.id : COLLECTION_A_CREER;
    const existante = etat.collections.get(collectionId);
    const introuvable = existante === undefined && nomACreer === undefined;
    // Une collection absente ou à créer n'a ni variable ni mode : le mode par défaut d'une collection neuve sert d'appui.
    const collection = existante ?? { id: collectionId, nom: nomACreer ?? '', modes: [{ id: MODE_PAR_DEFAUT_A_CREER, nom: 'Mode 1' }], variables: 0 };
    const modes = modesDeLaDestination(collection, garde, destination.themes, inventer);

    const variableDuNom = new Map<string, string>();
    for (const entree of plan) {
      const connue = garde?.variables[entree.cle];
      if (connue && lues.has(connue.id) && !variableDuNom.has(entree.nom)) variableDuNom.set(entree.nom, connue.id);
    }
    const sansVariable = [...new Set(plan.map((entree) => entree.nom))].filter((nom) => !variableDuNom.has(nom));
    // Les noms que la collection porte déjà, sans casse. Une variable d'une palette du lot, ou qu'une autre palette de la recette suit, n'est jamais remplacée ([VAR-08]).
    const dansLaCollection = new Map<string, VariableLue>();
    for (const variable of lues.values()) {
      const cle = variable.nom.toLowerCase();
      if (variable.collection === collectionId && !dansLaCollection.has(cle)) dansLaCollection.set(cle, variable);
    }
    const protegees = variablesProtegees({ palettes: etat.suivies }, new Set(recette.palettes.map((palette) => palette.id)), id);
    const remplacements: { id: string; de: string; vers: string }[] = [];
    let refus: { nom: string; occupant: OccupantDuNom } | undefined;
    for (const nom of sansVariable) {
      const occupante = dansLaCollection.get(nom.toLowerCase());
      if (!occupante) continue;
      const duLot = etat.appartenance.get(occupante.id);
      const proprietaire = duLot === undefined && protegees.has(occupante.id) ? proprietaireDe(occupante.id, id) : undefined;
      if (duLot !== undefined) refus ??= { nom, occupant: { par: 'palette', palette: duLot, id: occupante.id, nom: occupante.nom, dansLeLot: true } };
      else if (proprietaire !== undefined) refus ??= { nom, occupant: { par: 'palette', palette: proprietaire, id: occupante.id, nom: occupante.nom, dansLeLot: false } };
      else if (!remplacer.has(id)) refus ??= { nom, occupant: { par: 'tiers', id: occupante.id, nom: occupante.nom } };
      else remplacements.push({ id: occupante.id, de: occupante.nom, vers: nom });
    }
    const remplacees = new Map(remplacements.map((remplacement) => [remplacement.vers, remplacement.id]));
    // Un nom refusé compte parmi les créations : c'est ce que la palette ferait sans le refus.
    const creations = sansVariable.filter((nom) => !remplacees.has(nom)).map((nom) => ({ nom, cle: plan.find((entree) => entree.nom === nom)!.cle }));
    const rangs = new Map(creations.map((creation, rang) => [creation.nom, rang]));

    const cibles: CibleDeLEntree[] = plan.map((entree) => {
      const rang = rangs.get(entree.nom);
      if (rang !== undefined) return { cible: 'creee', rang };
      const idDeLaVariable = variableDuNom.get(entree.nom) ?? remplacees.get(entree.nom)!;
      const valeurs = lues.get(idDeLaVariable)?.valeurs;
      const vise = modes[entree.mode];
      const ecrire = entree.mode === 'unique' || vise === undefined
        ? collection.modes.some((mode) => valeurs?.[mode.id] !== entree.hexa)
        : vise.creer !== undefined || valeurs?.[vise.id] !== entree.hexa;
      return { cible: 'presente', id: idDeLaVariable, ecrire };
    });
    const idsRemplaces = new Set(remplacements.map((remplacement) => remplacement.id));
    const aRemplacer = new Set(cibles.flatMap((cible) => (cible.cible === 'presente' && cible.ecrire && !idsRemplaces.has(cible.id) ? [cible.id] : []))).size;
    const idsPresents = new Set(cibles.flatMap((cible) => (cible.cible === 'presente' ? [cible.id] : [])));
    const nomPris = new Map(remplacements.map((remplacement) => [remplacement.id, remplacement.vers]));
    const reserves = [...[...idsPresents].map((idDeLaVariable) => nomPris.get(idDeLaVariable) ?? lues.get(idDeLaVariable)!.nom), ...creations.map((creation) => creation.nom)];

    const ecriture: EcritureDUnePalette = {
      liaison: 'destination',
      collection: nomACreer !== undefined ? { nom: nomACreer } : collectionId === COLLECTION_A_CREER ? { nom: collection.nom } : { id: collectionId },
      plan,
      etat: tokens,
      cibles,
      creations,
      remplacements,
      renommages: [],
      reserves,
      nomsOccupes,
      aRemplacer,
      modes,
      garde: garde !== undefined,
      groupe: destination.groupe,
      origine: null,
    };
    if (introuvable) return { palette: id, decision: 'collection-introuvable', ecriture };
    if (refus) return { palette: id, decision: 'nom-pris', ...refus, ecriture };
    appliquer(id, ecriture, { collectionId, ...(nomACreer !== undefined ? { collectionACreer: nomACreer } : {}) });
    return { palette: id, decision: 'ecrire', ...ecriture };
  }

  /** La palette de la recette qui suit cette variable, à qui l'écriture de `palette` ne peut pas la prendre. */
  function proprietaireDe(variable: string, palette: string): string | undefined {
    for (const [cle, suivie] of Object.entries(etat.suivies)) {
      const proprietaire = suivie.sortieAnterieureDe ?? cle;
      if (proprietaire !== palette && presentes.has(proprietaire) && Object.values(suivie.variables).some((suivi) => suivi.id === variable)) return proprietaire;
    }
    return undefined;
  }

  /** Ce que l'écriture d'une palette change à l'inventaire que la palette suivante lit. */
  function appliquer(palette: string, ecriture: EcritureDUnePalette, effet: Effet): void {
    const { collectionId } = effet;
    if (effet.collectionACreer !== undefined) {
      etat.collections.set(COLLECTION_A_CREER, { id: COLLECTION_A_CREER, nom: effet.collectionACreer, modes: [{ id: MODE_PAR_DEFAUT_A_CREER, nom: 'Mode 1' }], variables: 0 });
      // La collection créée devient la destination : la palette suivante la rejoint au lieu d'en créer une autre.
      etat.destination = { ...etat.destination, collection: { id: COLLECTION_A_CREER } };
    }
    const collection = etat.collections.get(collectionId)!;
    for (const vise of Object.values(ecriture.modes)) {
      if (!vise?.creer) continue;
      if (vise.creer.renommer) collection.modes = collection.modes.map((mode) => (mode.id === vise.id ? { id: mode.id, nom: vise.creer!.nom } : mode));
      else collection.modes = [...collection.modes, { id: vise.id, nom: vise.creer.nom }];
    }

    const nouvelles = ecriture.creations.map((creation, rang) => ({ id: idSimuleDeLaVariable(palette, rang), nom: creation.nom }));
    const renomees = new Map<string, string>([...ecriture.remplacements.map((remplacement) => [remplacement.id, remplacement.vers] as const), ...ecriture.renommages.map((renommage) => [renommage.id, renommage.vers] as const)]);
    const prises = new Set(ecriture.remplacements.map((remplacement) => remplacement.id));
    for (const [idDeLaVariable, nom] of renomees) etat.variables.set(idDeLaVariable, { ...etat.variables.get(idDeLaVariable)!, nom });
    for (const nouvelle of nouvelles) etat.variables.set(nouvelle.id, { id: nouvelle.id, nom: nouvelle.nom, collection: collectionId, valeurs: {} });
    collection.variables += nouvelles.length;
    if (etat.donnees) {
      const creees: VariableNommee[] = nouvelles.map((nouvelle) => ({ id: nouvelle.id, nom: nouvelle.nom, collection: collectionId, palette }));
      const collections = effet.collectionACreer !== undefined ? [...etat.donnees.collections, { id: COLLECTION_A_CREER, nom: effet.collectionACreer }] : etat.donnees.collections;
      if (creees.length > 0 || renomees.size > 0 || collections !== etat.donnees.collections) {
        etat.donnees = {
          ...etat.donnees,
          collections,
          variables: [...etat.donnees.variables.map((variable) => (renomees.has(variable.id) ? { ...variable, nom: renomees.get(variable.id)!, ...(prises.has(variable.id) ? { palette } : {}) } : variable)), ...creees],
        };
      }
    }

    const ids = ecriture.cibles.flatMap((cible) => (cible.cible === 'presente' ? [cible.id] : []));
    for (const idDeLaVariable of [...ids, ...renomees.keys(), ...nouvelles.map((nouvelle) => nouvelle.id)]) etat.appartenance.set(idDeLaVariable, palette);
    const tenus = etat.reserves.get(collectionId) ?? new Map<string, string>();
    for (const nom of ecriture.reserves) tenus.set(nom.toLowerCase(), palette);
    etat.reserves.set(collectionId, tenus);

    const modes = Object.fromEntries(Object.entries(ecriture.modes).map(([mode, vise]) => [mode, vise.id])) as PaletteSuivie['modes'];
    etat.suivies = suiviApresLEcriture(etat.suivies, palette, ecriture, collectionId, modes, (cible) => (cible.cible === 'creee' ? idSimuleDeLaVariable(palette, cible.rang) : cible.id), (idDeLaVariable) => etat.variables.has(idDeLaVariable));
  }

  const palettes = ordre.map(planifier);
  return {
    palettes,
    destination: fichier.suivi.destination,
    inventaireApres: {
      collections: [...etat.collections.values()].map((collection) => ({ id: collection.id, nom: collection.nom, modes: collection.modes, variables: collection.variables })),
      variables: [...etat.variables.values()],
      suivi: { ...fichier.suivi, palettes: etat.suivies },
      ...(etat.donnees ? { nommage: etat.donnees } : {}),
    },
  };
}

/**
 * Le suivi après l'écriture d'une palette, sous les identifiants que `idDe`
 * donne aux cibles : les inventés par le plan, ou ceux de Figma pour
 * l'écriture. `modes` porte les identifiants des modes écrits, et `existe` dit
 * si le fichier porte encore une variable du suivi d'avant.
 *
 * Une palette de la destination garde les clés de son suivi d'avant tant que
 * la destination n'a pas changé ; sinon ses variables d'avant deviennent une
 * sortie ancienne. Une variable remplacée quitte la palette supprimée ou la
 * sortie ancienne qui la suivait. Une palette reprise garde les clés d'un plan
 * plus ancien dont la variable existe encore, et retire celles dont le mode a
 * quitté la collection ([VAR-08], [VAR-13]).
 */
export function suiviApresLEcriture(
  suivies: { readonly [id: string]: PaletteSuivie },
  palette: string,
  ecriture: EcritureDUnePalette,
  collectionId: string,
  modes: PaletteSuivie['modes'],
  idDe: (cible: Exclude<CibleDeLEntree, { cible: 'aucune' }>) => string,
  existe: (id: string) => boolean,
): { [id: string]: PaletteSuivie } {
  const resultat: { [id: string]: PaletteSuivie } = { ...suivies };
  const suivie = suivies[palette];
  const ecrites: { [cle: string]: VariableSuivie } = {};
  const sansMode = new Set<string>();
  ecriture.plan.forEach((entree, rang) => {
    const cible = ecriture.cibles[rang];
    if (cible.cible === 'aucune') sansMode.add(entree.cle);
    else ecrites[entree.cle] = { id: idDe(cible), ecrite: entree.hexa };
  });

  if (ecriture.liaison === 'reprise') {
    // Le suivi d'après : les clés écrites, celles d'un plan plus ancien dont la variable existe encore, et le chemin d'origine, que les noms ne rendent plus après un renommage.
    resultat[palette] = {
      ...suivie,
      groupe: ecriture.groupe,
      modes,
      ...(ecriture.chemin !== undefined ? { chemin: ecriture.chemin } : {}),
      ...(ecriture.intensite ? { intensite: ecriture.intensite } : {}),
      variables: {
        ...Object.fromEntries(Object.entries(suivie.variables).filter(([cle, variable]) => !sansMode.has(cle) && existe(variable.id))),
        ...ecrites,
      },
    };
    return resultat;
  }

  const gardee = ecriture.garde ? suivie : undefined;
  if (suivie?.liaison === 'destination' && !gardee) {
    const actuelles = new Set(Object.values(ecrites).map((variable) => variable.id));
    const anciennes = Object.fromEntries(Object.entries(suivie.variables).filter(([, variable]) => existe(variable.id) && !actuelles.has(variable.id)));
    if (Object.keys(anciennes).length > 0) {
      let rang = 1;
      while (resultat[`ancienne:${palette}:${rang}`]) rang += 1;
      resultat[`ancienne:${palette}:${rang}`] = { ...suivie, variables: anciennes, sortieAnterieureDe: palette };
    }
  }
  if (ecriture.remplacements.length > 0) {
    const restantes = sansLesVariables(resultat, new Set(ecriture.remplacements.map((remplacement) => remplacement.id)));
    for (const cle of Object.keys(resultat)) if (!(cle in restantes)) delete resultat[cle];
    Object.assign(resultat, restantes);
  }
  resultat[palette] = { collection: collectionId, groupe: ecriture.groupe, modes, variables: { ...(gardee?.variables ?? {}), ...ecrites }, liaison: 'destination' };
  return resultat;
}
