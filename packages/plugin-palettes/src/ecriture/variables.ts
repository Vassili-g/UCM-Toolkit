/**
 * Écrit les palettes dans les variables de couleur du fichier ([VAR-07] à
 * [VAR-11], [VAR-16]), range la destination des tokens, et retire les
 * variables d'une palette supprimée. Avec `src/lectureDesVariables.ts`,
 * c'est le seul fichier qui appelle `figma.variables` ([ARC-13]).
 *
 * L'écriture part de la recette rangée, jamais de couleurs envoyées par
 * l'interface. Le plugin reconnaît ses variables par l'identifiant que le
 * suivi garde, jamais par leur nom. Il ne retire une variable que sur
 * « Supprimer les variables… ». Une palette reprise du fichier s'écrit dans
 * sa collection d'origine, sous le groupe configuré s'il diffère de son
 * groupe de référence, puis sous le dernier segment de son chemin d'origine.
 * Elle seule renomme des variables ([VAR-13]).
 *
 * Quand le fichier porte les règles de nommage d'UCM Nomenclature, chaque
 * palette s'écrit sous les noms que ces règles donnent (`variables/nommeur.ts`),
 * calculés sur les variables du fichier telles qu'elles sont au moment de
 * cette palette. Sans règles, les noms restent ceux du plan.
 */
import { aUneIntensite, jsonCanonique, profilPorteur, validerRecette, type Recette, type Refus } from 'ucm-couleur';
import { CLE_ARCHITECTURE_DU_FICHIER, CLES_PARTAGEES_DE_PALETTES, COUCHES_SANS_PALETTES, ESPACE_ARCHITECT, SEUIL_DE_PALETTE, collectionUcmReconnue, lireLArchitectureDuFichier, type ArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { CLE_RECETTE, ESPACE_PARTAGE, empreinteDuTexte, lireEtat } from '../lecture';
import { ajouter, nouvellePalette, reprendreDuFichier } from '../edition';
import { collectionLue, inventaireLu, lireLeSuiviRange, lireLesDonneesDeNommage, variableLue, variablesDeLaBibliotheque, type FigmaDesBibliotheques } from '../lectureDesVariables';
import { variablesDeLaRampe } from '../variables/bibliotheques';
import { conversionDeLaReprise } from '../variables/conversion';
import { COLLECTION_A_CREER, creerNommeur } from '../variables/nommeur';
import { MODE_PAR_DEFAUT_A_CREER, idSimuleDeLaVariable, planDuLot, suiviApresLEcriture, type DecisionDuLot } from '../variables/lot';
import { etatDAvant, journalDesVariables, type EtatDAvant, type Reste } from './restaurationDesVariables';
export type { Reste } from './restaurationDesVariables';
import { validerLaDestination, type Destination, type RefusDeDestination } from '../variables/destination';
import { nuanceDeReference, palettesDuFichier, retrouverLaPaletteGroupee, type PaletteDuFichier, type SourceGroupee } from '../variables/detection';
import { etatDesTokens } from '../variables/etat';
import { origineDeLaReprise, suiviDeLaReprise, suiviDeLaRepriseGroupee, variableDeLEntree, type OrigineDeLaReprise } from '../variables/reprise';
import { cheminDeLaReprise, type EntreeDuPlan, type ModeDuPlan } from '../variables/plan';
import { couleurPourFigma, type VariableLue } from '../variables/releve';
import { sansLesVariables, suiviFutur, texteDuSuivi, variablesProtegees, variablesSuivies, type PaletteSuivie, type SuiviDesVariables, type VariableSuivie } from '../variables/suivi';

/** L'API que l'écriture des variables emploie. */
export interface FigmaDesVariablesEcrites {
  readonly root: {
    getSharedPluginDataKeys(espace: string): string[];
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
    readonly documentColorProfile: DocumentNode['documentColorProfile'];
  };
  readonly variables: Pick<VariablesAPI, 'getLocalVariableCollectionsAsync' | 'getLocalVariablesAsync' | 'createVariableCollection' | 'createVariable'>;
  commitUndo(): void;
}

/** Ce que l'interface demande : des identifiants de palette, l'empreinte lue, et les palettes dont le designer remet les couleurs. */
export interface DemandeDEcriture {
  readonly palettes: readonly string[];
  readonly empreinteLue: string | null;
  /** Les palettes « Modifiés dans Figma » dont le designer a choisi « Remettre les couleurs du plugin » ([VAR-06]). */
  readonly remettre: readonly string[];
  /** Les palettes dont le designer remplace les variables du même nom qu'aucune autre palette ne suit ([VAR-08]). */
  readonly remplacer?: readonly string[];
}

/** Ce que l'écriture a fait d'une palette. */
export type IssueDeLaPalette =
  /** `creees` variables sont nées, `ecrites` valeurs ont changé ; zéro et zéro pour une palette déjà à jour. */
  | { readonly palette: string; readonly issue: 'ecrite'; readonly creees: number; readonly ecrites: number }
  /** Des couleurs ont été changées dans Figma, et le designer n'a pas choisi de les remettre : rien n'est écrit ([VAR-06]). */
  | { readonly palette: string; readonly issue: 'modifiee'; readonly couleurs: number }
  /** Une variable de ce nom existe dans la collection, et le designer n'a pas choisi de la remplacer, ou une autre palette la suit : rien n'est créé ([VAR-08]). */
  | { readonly palette: string; readonly issue: 'nom-pris'; readonly nom: string; readonly occupant?: { readonly palette: string; readonly dansLeLot: boolean } }
  /** La collection que la destination désigne n'est plus dans le fichier. */
  | { readonly palette: string; readonly issue: 'collection-introuvable' }
  | { readonly palette: string; readonly issue: 'couche-interdite'; readonly nom: string }
  | { readonly palette: string; readonly issue: 'mode-introuvable'; readonly mode: ModeDuPlan }
  /** Figma a refusé un mode Light ou Dark, selon l'offre du fichier ([VAR-10]). */
  | { readonly palette: string; readonly issue: 'modes-refuses'; readonly message: string }
  /** Figma a levé au milieu de la palette : les variables que cette écriture venait de créer pour elle sont retirées. */
  | { readonly palette: string; readonly issue: 'interrompue'; readonly message: string; readonly restes?: readonly Reste[] }
  /** La recette rangée ne contient pas cette palette. */
  | { readonly palette: string; readonly issue: 'absente' };

export type ResultatDeLEcriture =
  | { readonly issue: 'defaite'; readonly message: string; readonly restes: readonly Reste[] }
  | { readonly issue: 'interrompue'; readonly message: string }
  | { readonly issue: 'ecrites'; readonly palettes: readonly IssueDeLaPalette[] }
  /** La recette rangée n'est plus celle que l'interface a lue : rien n'est écrit. */
  | { readonly issue: 'recette-changee' }
  | { readonly issue: 'sans-recette' }
  /** Le suivi vient d'une version plus récente du plugin : rien n'est écrit. */
  | { readonly issue: 'suivi-futur' };

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

function architectureDuFichier(root: FigmaDesVariablesEcrites['root']): ArchitectureDuFichier {
  try {
    return lireLArchitectureDuFichier(root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER));
  } catch {
    return 'illisible';
  }
}

function coucheInterdite(nom: string, architecture: ArchitectureDuFichier): boolean {
  return architecture === 'ucm' && COUCHES_SANS_PALETTES.some((couche) => couche === collectionUcmReconnue(nom));
}

/** Le mode d'une collection qui porte ce nom, sans casse ni espaces autour. */
function modeNomme(collection: VariableCollection, nom: string): string | undefined {
  return collection.modes.find((mode) => mode.name.trim().toLowerCase() === nom.toLowerCase())?.modeId;
}

/**
 * Écrit les palettes demandées, dans l'ordre de la recette ([VAR-07]).
 * Chaque palette réussit ou échoue seule : une palette arrêtée n'empêche pas
 * les suivantes. Le suivi se range après les valeurs, et un seul
 * `commitUndo` clôt l'écriture.
 */
export async function ecrireLesVariables(figma: FigmaDesVariablesEcrites, demande: DemandeDEcriture): Promise<ResultatDeLEcriture> {
  const journal = journalDesVariables({
    ecrireLaValeur: (variable, mode, valeur) => variable.setValueForMode(mode, valeur),
    renommerLeMode: (collection, mode, nom) => collection.renameMode(mode, nom),
  });
  try {
    const etat = lireEtat(figma.root);
    if (etat.classement.etat !== 'courante') return { issue: 'sans-recette' };
    if (etat.empreinte !== demande.empreinteLue) return { issue: 'recette-changee' };
    const recette = etat.classement.recette;
    const rangee = lireLeSuiviRange(figma.root);
    if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
    const [collectionsLocales, toutesLesVariables] = await Promise.all([
      figma.variables.getLocalVariableCollectionsAsync(),
      figma.variables.getLocalVariablesAsync(),
    ]);
    if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return { issue: 'recette-changee' };
    const inventaire = inventaireLu(figma.root, collectionsLocales, toutesLesVariables);
    if (suiviFutur(inventaire.suivi)) return { issue: 'suivi-futur' };
    const architecture = architectureDuFichier(figma.root);
    const lot = planDuLot(recette, inventaire, { ...demande, remplacer: demande.remplacer ?? [] });
    const profil = figma.root.documentColorProfile;
    const collections = new Map(collectionsLocales.map((collection) => [collection.id, collection]));
    const locales = new Map(toutesLesVariables.filter((variable) => variable.resolvedType === 'COLOR').map((variable) => [variable.id, variable]));
    const identifiants = new Map<string, string>();
    const modesFaits = new Set<string>();
    const idReel = (id: string): string => identifiants.get(id) ?? id;
    let destination = inventaire.suivi.destination;
    let suivies = { ...inventaire.suivi.palettes };
    let unEchec = false;

    // Toutes les lectures nécessaires à une restauration précèdent la première mutation du lot.
    const avant = new Map<string, EtatDAvant>();
    for (const decision of lot.palettes) {
      if (decision.decision !== 'ecrire') continue;
      const touches = [...decision.renommages.map(({ id }) => id), ...decision.remplacements.map(({ id }) => id), ...decision.cibles.flatMap((cible) => cible.cible === 'presente' && cible.ecrire ? [cible.id] : [])];
      for (const id of touches) {
        const variable = locales.get(id);
        if (variable && !avant.has(id)) avant.set(id, etatDAvant(variable));
      }
    }

    function executer(decision: Extract<DecisionDuLot, { decision: 'ecrire' }>): IssueDeLaPalette {
      const id = decision.palette;
      const nomDeCollection = 'nom' in decision.collection ? decision.collection.nom : collections.get(idReel(decision.collection.id))?.name;
      if (decision.liaison === 'destination' && nomDeCollection !== undefined && coucheInterdite(nomDeCollection, architecture)) return { palette: id, issue: 'couche-interdite', nom: nomDeCollection };
      let collection = 'id' in decision.collection ? collections.get(idReel(decision.collection.id)) : collections.get(idReel(COLLECTION_A_CREER));
      if (unEchec && collection) {
        const aPrendre = [...decision.creations.map((creation) => ({ nom: creation.nom, id: '' })), ...decision.renommages.map((renommage) => ({ nom: renommage.vers, id: idReel(renommage.id) })), ...decision.remplacements.map((remplacement) => ({ nom: remplacement.vers, id: idReel(remplacement.id) }))];
        const prise = aPrendre.find((cible) => [...locales.values()].some((variable) => variable.variableCollectionId === collection!.id && variable.id !== cible.id && variable.name.toLowerCase() === cible.nom.toLowerCase()));
        if (prise) return { palette: id, issue: 'nom-pris', nom: prise.nom };
      }
      if (!collection) {
        if ('id' in decision.collection) return { palette: id, issue: 'collection-introuvable' };
        try {
          collection = figma.variables.createVariableCollection(decision.collection.nom);
        } catch (erreur) {
          unEchec = true;
          return { palette: id, issue: 'interrompue', message: messageDe(erreur) };
        }
        journal.ajouter({ faite: 'collection', collection });
        collections.set(collection.id, collection);
        identifiants.set(COLLECTION_A_CREER, collection.id);
        identifiants.set(MODE_PAR_DEFAUT_A_CREER, collection.defaultModeId);
        destination = { ...destination, collection: { id: collection.id } };
      }
      const modes: { [M in ModeDuPlan]?: string } = {};
      try {
        for (const [mode, vise] of Object.entries(decision.modes)) {
          let reel = idReel(vise.id);
          if (vise.creer && !modesFaits.has(vise.id)) {
            if (vise.creer.renommer) {
              const avant = collection.modes.find((mode) => mode.modeId === reel)!.name;
              journal.ajouter({ faite: 'mode-renomme', collection, mode: reel, avant });
              collection.renameMode(reel, vise.creer.nom);
            } else {
              reel = collection.addMode(vise.creer.nom);
              journal.ajouter({ faite: 'mode-ajoute', collection, mode: reel });
            }
            identifiants.set(vise.id, reel);
            modesFaits.add(vise.id);
          }
          modes[mode as ModeDuPlan] = reel;
        }
      } catch (erreur) {
        unEchec = true;
        return { palette: id, issue: 'modes-refuses', message: messageDe(erreur) };
      }
      const suivieAvant = inventaire.suivi.palettes[id];
      const idsSuivis = new Set(Object.values(suivieAvant?.variables ?? {}).map((variable) => variable.id));
      const preparees = new Set<string>();
      const creees: Variable[] = [];
      const ecrites: { [cle: string]: VariableSuivie } = {};
      let valeurs = 0;
      const preparer = (variable: Variable): void => {
        if (preparees.has(variable.id) || creees.includes(variable)) return;
        const etatAvant = avant.get(variable.id);
        if (!etatAvant) throw new Error(`État de restauration absent : ${variable.id}`);
        journal.ajouter({ faite: 'modification', variable, avant: etatAvant, palette: id, suivieAvant: idsSuivis.has(variable.id) });
        preparees.add(variable.id);
      };
      try {
        for (const changement of [...decision.remplacements, ...decision.renommages]) {
          const variable = locales.get(idReel(changement.id))!;
          preparer(variable);
          if (variable.name !== changement.vers) variable.name = changement.vers;
        }
        for (const [rang, creation] of decision.creations.entries()) {
          const variable = figma.variables.createVariable(creation.nom, collection, 'COLOR');
          journal.ajouter({ faite: 'creation', variable, palette: id });
          creees.push(variable);
          locales.set(variable.id, variable);
          identifiants.set(idSimuleDeLaVariable(id, rang), variable.id);
          variable.scopes = [];
          if (decision.liaison === 'reprise') {
            const entree = decision.plan.find((entree, index) => decision.cibles[index].cible === 'creee' && (decision.cibles[index] as { rang: number }).rang === rang)!;
            for (const mode of collection.modes) variable.setValueForMode(mode.modeId, couleurPourFigma(entree.hexa, profil));
          }
        }
        for (const [rang, entree] of decision.plan.entries()) {
          const cible = decision.cibles[rang];
          if (cible.cible === 'aucune') continue;
          const variable = locales.get(cible.cible === 'creee' ? idReel(idSimuleDeLaVariable(id, cible.rang)) : idReel(cible.id))!;
          if (cible.cible === 'creee' || cible.ecrire) {
            preparer(variable);
            const couleur = couleurPourFigma(entree.hexa, profil);
            for (const mode of entree.mode === 'unique' ? collection.modes.map((mode) => mode.modeId) : [modes[entree.mode]!]) variable.setValueForMode(mode, couleur);
            valeurs += 1;
          }
          ecrites[entree.cle] = { id: variable.id, ecrite: entree.hexa };
        }
        for (const variable of [...decision.remplacements.map(({ id }) => locales.get(idReel(id))!), ...creees]) {
          preparer(variable);
          const cle = decision.plan.find((_, rang) => {
            const cible = decision.cibles[rang];
            return cible.cible !== 'aucune' && variable.id === (cible.cible === 'creee' ? idReel(idSimuleDeLaVariable(id, cible.rang)) : idReel(cible.id));
          })!.cle;
          variable.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.palette, id);
          variable.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.cle, cle);
        }
        suivies = suiviApresLEcriture(suivies, id, decision, collection.id, modes, (cible) => cible.cible === 'creee' ? idReel(idSimuleDeLaVariable(id, cible.rang)) : idReel(cible.id), (id) => locales.has(id));
        return { palette: id, issue: 'ecrite', creees: creees.length, ecrites: valeurs };
      } catch (erreur) {
        unEchec = true;
        const restes = journal.defaire(id);
        const restees = new Set(restes.filter((reste) => reste.reste === 'variable-creee').map((reste) => 'id' in reste ? reste.id : ''));
        for (const variable of creees) if (!restees.has(variable.id)) locales.delete(variable.id);
        // Les valeurs conservées sur les variables suivies restent suivies, même si la palette s'est arrêtée.
        const gardees = Object.fromEntries(Object.entries(ecrites).filter(([, variable]) => idsSuivis.has(variable.id)));
        if (suivieAvant && (Object.keys(gardees).length > 0 || decision.liaison === 'reprise')) suivies[id] = { ...suivieAvant, modes, variables: { ...suivieAvant.variables, ...gardees } };
        return { palette: id, issue: 'interrompue', message: messageDe(erreur), ...(restes.length > 0 ? { restes } : {}) };
      }
    }

    const palettes: IssueDeLaPalette[] = lot.palettes.map((decision) => {
      switch (decision.decision) {
        case 'absente': return { palette: decision.palette, issue: 'absente' };
        case 'modifiee': return { palette: decision.palette, issue: 'modifiee', couleurs: decision.etat.modifiees.length };
        case 'collection-introuvable': return { palette: decision.palette, issue: 'collection-introuvable' };
        case 'mode-introuvable': return { palette: decision.palette, issue: 'mode-introuvable', mode: decision.mode };
        case 'nom-pris': return { palette: decision.palette, issue: 'nom-pris', nom: decision.nom, ...(decision.occupant.par === 'palette' ? { occupant: { palette: decision.occupant.palette, dansLeLot: decision.occupant.dansLeLot } } : {}) };
        case 'ecrire': return executer(decision);
      }
    });
    const suivant: SuiviDesVariables = { ...inventaire.suivi, destination, palettes: suivies };
    const suiviChange = texteDuSuivi(suivant) !== texteDuSuivi(inventaire.suivi);
    if (journal.aDesMutations() || suiviChange) {
      figma.root.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables, texteDuSuivi(suivant));
      figma.commitUndo();
    }
    return { issue: 'ecrites', palettes };
  } catch (erreur) {
    if (!journal.aDesMutations()) return { issue: 'interrompue', message: messageDe(erreur) };
    const restes = journal.defaire();
    if (restes.length > 0) figma.commitUndo();
    return { issue: 'defaite', message: messageDe(erreur), restes };
  }
}

/** L'issue de « Enregistrer », dans la carte « Destination des tokens » ([VAR-16]). */
export type IssueDeLaDestination =
  | { readonly issue: 'interrompue'; readonly message: string }
  | { readonly issue: 'rangee'; readonly destination: Destination }
  | { readonly issue: 'invalide'; readonly refus: Exclude<RefusDeDestination, 'couche'> }
  | { readonly issue: 'invalide'; readonly refus: 'couche'; readonly nom: string }
  | { readonly issue: 'suivi-futur' };

/**
 * Valide la destination, la range dans le suivi et la marque confirmée
 * ([VAR-16]). Une collection désignée par son identifiant doit être une
 * collection locale du fichier. Aucune variable ne bouge ([VAR-02]).
 */
export async function rangerLaDestination(figma: FigmaDesVariablesEcrites, valeur: unknown): Promise<IssueDeLaDestination> {
  try {
    const rangee = lireLeSuiviRange(figma.root);
    if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
    const validee = validerLaDestination(valeur);
    if ('refus' in validee) return { issue: 'invalide', refus: validee.refus };
    const { destination } = validee;
    let nom: string;
    if ('id' in destination.collection) {
      const visee = destination.collection.id;
      const locales = await figma.variables.getLocalVariableCollectionsAsync();
      const collection = locales.find((collection) => collection.id === visee);
      if (!collection) return { issue: 'invalide', refus: 'collection' };
      nom = collection.name;
    } else nom = destination.collection.nom;
    if (coucheInterdite(nom, architectureDuFichier(figma.root))) return { issue: 'invalide', refus: 'couche', nom };
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables, texteDuSuivi({ ...rangee, destination, confirmee: true }));
    figma.commitUndo();
    return { issue: 'rangee', destination };
  } catch (erreur) {
    return { issue: 'interrompue', message: messageDe(erreur) };
  }
}

/** L'issue de « Supprimer les variables… », sur la carte d'une palette supprimée ([VAR-11]). */
export type IssueDuRetraitDesVariables =
  | { readonly issue: 'interrompue'; readonly retirees: number; readonly message: string }
  /** `retirees` variables ont quitté le fichier, et la palette a quitté le suivi. */
  | { readonly issue: 'retirees'; readonly retirees: number }
  /** Rien n'est écrit : la recette ne se lit pas, ou contient de nouveau la palette. */
  | { readonly issue: 'refuse' }
  | { readonly issue: 'suivi-futur' };

/**
 * Retire du fichier les variables que le suivi garde pour une palette
 * supprimée, et la palette du suivi, dans une seule écriture close par un
 * seul `commitUndo` ([VAR-11]). Le sandbox relit tout : il ne retire rien
 * quand la recette rangée contient encore la palette. Une palette reprise du
 * fichier garde ses variables d'origine : seul son suivi est oublié.
 */
export async function retirerLesVariables(figma: FigmaDesVariablesEcrites, demande: { readonly palette: string }): Promise<IssueDuRetraitDesVariables> {
  let retirees = 0;
  try {
    const rangee = lireLeSuiviRange(figma.root);
    if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
    const { classement } = lireEtat(figma.root);
    if (classement.etat !== 'courante') return { issue: 'refuse' };
    if (classement.recette.palettes.some((palette) => palette.id === demande.palette)) return { issue: 'refuse' };
    const suivie = rangee.palettes[demande.palette];
    if (!suivie) return { issue: 'retirees', retirees: 0 };

    let interruption: unknown;
    const restantes = { ...suivie.variables };
    if (suivie.liaison === 'destination') {
      const locales = new Map((await figma.variables.getLocalVariablesAsync('COLOR')).map((variable) => [variable.id, variable]));
      for (const id of new Set(Object.values(suivie.variables).map((variable) => variable.id))) {
        const variable = locales.get(id);
        try {
          if (variable) {
            variable.remove();
            retirees += 1;
          }
          for (const [cle, suivie] of Object.entries(restantes)) if (suivie.id === id) delete restantes[cle];
        } catch (erreur) {
          interruption = erreur;
          break;
        }
      }
    }
    const palettes = Object.fromEntries(Object.entries(rangee.palettes).filter(([id]) => id !== demande.palette));
    if (interruption !== undefined) palettes[demande.palette] = { ...suivie, variables: restantes };
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables, texteDuSuivi({ ...rangee, palettes }));
    figma.commitUndo();
    return interruption !== undefined ? { issue: 'interrompue', retirees, message: messageDe(interruption) } : { issue: 'retirees', retirees };
  } catch (erreur) {
    return { issue: 'interrompue', retirees, message: messageDe(erreur) };
  }
}

/**
 * La palette du fichier qu'une reprise désigne : un groupe, par sa
 * collection et le chemin commun de ses variables ; ou une palette groupée,
 * par sa collection, sa racine et sa forme.
 */
export type SourceDeLaReprise =
  | { readonly collection: string; readonly chemin: string }
  | SourceGroupee;

/** Ce que « Modifier dans le plugin » demande : la recette qui porte la palette reprise, et la palette du fichier qu'elle reprend. */
export interface DemandeDeReprise {
  readonly recette: unknown;
  readonly empreinteLue: string | null;
  /**
   * L'identifiant de la palette reprise, dans la recette demandée : tiré par
   * l'interface, ou imposé (celui d'un cadre orphelin). La recette rangée ne
   * doit pas le porter déjà : la demande est refusée, `invalide` sans refus
   * de recette. Une entrée du suivi à cet identifiant est remplacée.
   */
  readonly palette: string;
  readonly source: SourceDeLaReprise;
}

/** L'issue de « Modifier dans le plugin » ([VAR-13]). */
export type IssueDeLaReprise =
  | { readonly issue: 'interrompue'; readonly message: string }
  /** La recette et la liaison sont rangées ensemble ; `empreinte` est celle de la recette rangée. */
  | { readonly issue: 'reprise'; readonly empreinte: string }
  /** La recette rangée n'est plus celle que l'interface a lue ([REC-10]). */
  | { readonly issue: 'modifiee-ailleurs' }
  | { readonly issue: 'invalide'; readonly refus: readonly Refus[] }
  /** Le fichier ne porte plus cette palette dans ses variables, ou le plugin la tient déjà pour sienne. */
  | { readonly issue: 'palette-introuvable' }
  | { readonly issue: 'suivi-futur' };

/**
 * Reprend une palette du fichier ([VAR-13]) : range la recette qui la porte
 * et la liaison de reprise de son suivi, ensemble, sous un seul
 * `commitUndo`. Le sandbox relit les variables et retrouve lui-même la
 * palette du fichier : la liaison ne vient jamais de l'interface. Aucune
 * variable n'est écrite.
 */
export async function reprendreLaPalette(figma: FigmaDesVariablesEcrites, demande: DemandeDeReprise): Promise<IssueDeLaReprise> {
  try {
    const rangee = lireLeSuiviRange(figma.root);
    if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
    const validee = validerRecette(demande.recette);
    if ('refus' in validee) return { issue: 'invalide', refus: validee.refus };
    const { recette } = validee;
    if (!recette.palettes.some((palette) => palette.id === demande.palette)) return { issue: 'palette-introuvable' };
    const avant = lireEtat(figma.root);
    if (avant.empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };

    const profil = figma.root.documentColorProfile;
    const [collections, variables] = await Promise.all([
      figma.variables.getLocalVariableCollectionsAsync(),
      figma.variables.getLocalVariablesAsync('COLOR'),
    ]);
    if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };
    // Un identifiant déjà porté par la recette rangée ne se reprend pas : la palette qui le porte garderait deux liaisons.
    if (avant.classement.etat === 'courante' && avant.classement.recette.palettes.some((palette) => palette.id === demande.palette)) return { issue: 'invalide', refus: [] };
    // Les variables que le plugin tient pour siennes sous la recette d'avant ne se reprennent pas.
    const presentes = new Set(avant.classement.etat === 'courante' ? avant.classement.recette.palettes.map((palette) => palette.id) : []);
    const lues = palettesDuFichier(variables.map((variable) => variableLue(variable, profil)), collections.map(collectionLue), variablesSuivies(rangee, presentes));
    const designee = demande.source;
    // Une palette groupée se relit dans les groupes du fichier : une forme qui n'y est plus se refuse.
    let suivie: PaletteSuivie;
    if ('racine' in designee) {
      const groupee = retrouverLaPaletteGroupee(lues, designee);
      if (!groupee) return { issue: 'palette-introuvable' };
      suivie = suiviDeLaRepriseGroupee(groupee);
    } else {
      const source = lues.find((candidate) => candidate.collection === designee.collection && candidate.chemin === designee.chemin);
      if (!source) return { issue: 'palette-introuvable' };
      suivie = suiviDeLaReprise(source);
    }

    const texte = jsonCanonique(recette);
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE, texte);
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables, texteDuSuivi({ ...rangee, palettes: { ...rangee.palettes, [demande.palette]: suivie } }));
    figma.commitUndo();
    return { issue: 'reprise', empreinte: empreinteDuTexte(texte) as string };
  } catch (erreur) {
    return { issue: 'interrompue', message: messageDe(erreur) };
  }
}

/** Ce que « Passer au format du plugin » demande : la palette reprise, et l'empreinte de la recette lue. */
export interface DemandeDeConversion {
  readonly palette: string;
  readonly empreinteLue: string | null;
}

/** L'issue de « Passer au format du plugin » ([VAR-13]). */
export type IssueDeLaConversion =
  | { readonly issue: 'interrompue'; readonly message: string }
  /** Le suivi est rangé ; `renommees` variables ont pris le nom de la destination, `enPlace` dit si elles restent celles de la palette. */
  | { readonly issue: 'convertie'; readonly renommees: number; readonly enPlace: boolean }
  /** Une autre variable de la collection porte déjà un nom de la destination : rien n'est écrit. */
  | { readonly issue: 'nom-pris'; readonly nom: string }
  /** La recette rangée ne porte plus cette palette reprise, ou la porte figée : rien n'est écrit. */
  | { readonly issue: 'refusee' }
  | { readonly issue: 'recette-changee' }
  | { readonly issue: 'suivi-futur' };

/**
 * Passe une palette reprise au format du plugin, définitivement ([VAR-13]) :
 * ses variables prennent le nom que la destination leur donne et son suivi
 * la liaison d'une palette que le plugin a créée, ou elles deviennent une
 * sortie ancienne quand elles ne sont pas dans la collection et la forme de
 * la destination. Aucune couleur n'est écrite ; un seul `commitUndo` clôt
 * le geste. Une palette figée se recalcule d'abord.
 */
export async function convertirLaReprise(figma: FigmaDesVariablesEcrites, demande: DemandeDeConversion): Promise<IssueDeLaConversion> {
  try {
    const etat = lireEtat(figma.root);
    if (etat.classement.etat !== 'courante') return { issue: 'refusee' };
    if (etat.empreinte !== demande.empreinteLue) return { issue: 'recette-changee' };
    const rangee = lireLeSuiviRange(figma.root);
    if (suiviFutur(rangee)) return { issue: 'suivi-futur' };
    const { recette } = etat.classement;
    const palette = recette.palettes.find((candidate) => candidate.id === demande.palette);
    const suivie = rangee.palettes[demande.palette];
    if (!palette || palette.figees !== undefined || suivie?.liaison !== 'reprise') return { issue: 'refusee' };

    const [collections, toutes] = await Promise.all([figma.variables.getLocalVariableCollectionsAsync(), figma.variables.getLocalVariablesAsync()]);
    const locales = toutes.filter((variable) => variable.resolvedType === 'COLOR');
    if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return { issue: 'recette-changee' };
    const profil = figma.root.documentColorProfile;
    // Les variables prennent les noms que l'écriture leur donnerait : ceux des règles de nommage du fichier, quand il en a.
    const donnees = lireLesDonneesDeNommage(figma.root, collections, toutes);
    const nommer = (donnees ? creerNommeur(donnees) : undefined)?.pour({ id: suivie.collection });
    const conversion = conversionDeLaReprise(recette, palette, suivie, rangee.destination, locales.map((variable) => variableLue(variable, profil)), nommer);
    if (conversion.occupe !== null) return { issue: 'nom-pris', nom: conversion.occupe };

    const parId = new Map(locales.map((variable) => [variable.id, variable]));
    const faits: { variable: Variable; de: string }[] = [];
    try {
      for (const { id, de, vers } of conversion.aRenommer) {
        const variable = parId.get(id);
        if (!variable) continue;
        variable.name = vers;
        faits.push({ variable, de });
      }
    } catch (erreur) {
      // Un renommage refusé rend leur nom aux variables déjà renommées : le suivi reste celui de la reprise.
      for (const { variable, de } of faits.reverse()) {
        try {
          variable.name = de;
        } catch {
          // Une variable que Figma refuse de renommer garde le nom de la destination.
        }
      }
      return { issue: 'interrompue', message: messageDe(erreur) };
    }

    const palettes: { [id: string]: PaletteSuivie } = { ...rangee.palettes };
    if (conversion.enPlace) palettes[demande.palette] = conversion.suivie;
    else {
      // Hors de la collection ou de la forme de la destination : les variables d'origine attendent leur retrait dans Gestion.
      delete palettes[demande.palette];
      let rang = 1;
      while (palettes[`ancienne:${demande.palette}:${rang}`]) rang += 1;
      palettes[`ancienne:${demande.palette}:${rang}`] = { ...conversion.suivie, sortieAnterieureDe: demande.palette };
    }
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables, texteDuSuivi({ ...rangee, palettes }));
    figma.commitUndo();
    return { issue: 'convertie', renommees: faits.length, enPlace: conversion.enPlace };
  } catch (erreur) {
    return { issue: 'interrompue', message: messageDe(erreur) };
  }
}

/** L'API que la copie d'une palette de bibliothèque emploie. */
export interface FigmaDeLaCopie extends FigmaDesBibliotheques {
  readonly root: FigmaDesVariablesEcrites['root'];
  readonly variables: Pick<VariablesAPI, 'importVariableByKeyAsync' | 'getVariableCollectionByIdAsync'>;
  commitUndo(): void;
}

/** Ce que « Copier dans le plugin » demande : l'identifiant de la palette à créer, et la palette de bibliothèque à copier. */
export interface DemandeDeCopie {
  readonly empreinteLue: string | null;
  /** L'identifiant, tiré par l'interface, de la palette que la copie crée. */
  readonly palette: string;
  /** La palette de bibliothèque : la clé de sa collection et le chemin commun de ses variables. */
  readonly source: { readonly collection: string; readonly chemin: string };
}

/** L'issue de « Copier dans le plugin » ([VAR-14]). */
export type IssueDeLaCopie = (
  /** La recette porte la palette copiée ; `importees` variables de la bibliothèque ont rejoint le fichier. */
  | { readonly issue: 'copiee'; readonly empreinte: string; readonly importees: number }
  /** La recette rangée n'est plus celle que l'interface a lue ([REC-10]). */
  | { readonly issue: 'modifiee-ailleurs' }
  /** La bibliothèque ne porte plus cette palette. */
  | { readonly issue: 'palette-introuvable' }
  /** Aucune des variables importées ne porte de couleur dans le thème Light : rien à copier. */
  | { readonly issue: 'sans-couleur' }
  /** Figma a levé en listant ou en important les variables de la bibliothèque. */
  | { readonly issue: 'bibliotheque-illisible'; readonly message: string }
  | { readonly issue: 'invalide'; readonly refus: readonly Refus[] }
) & { readonly importsEffectues?: readonly string[] };

/**
 * Copie une palette de bibliothèque dans le plugin ([VAR-14]) : importe les
 * variables de cette seule palette, lit leurs couleurs, puis la reprend en
 * mode `recalculees` et range la recette, sous un seul `commitUndo`. La
 * copie n'a pas de liaison de reprise : elle s'écrira dans la destination
 * des tokens, jamais dans la bibliothèque.
 */
export async function copierLaPalette(figma: FigmaDeLaCopie, demande: DemandeDeCopie): Promise<IssueDeLaCopie> {
  const importsEffectues: string[] = [];
  const echouer = (issue: IssueDeLaCopie): IssueDeLaCopie => importsEffectues.length > 0 ? { ...issue, importsEffectues } : issue;
  try {
    const avant = lireEtat(figma.root);
    if (avant.empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };
    if (avant.classement.etat !== 'courante' && avant.classement.etat !== 'absente') return { issue: 'invalide', refus: [] };
    const recette: Recette = avant.classement.recette;
    const provisoire = nouvellePalette(recette, demande.palette, '#000000', 1);
    if (!provisoire) return { issue: 'invalide', refus: [] };
    const controle = validerRecette(ajouter(recette, provisoire));
    if ('refus' in controle) return { issue: 'invalide', refus: controle.refus };
    const { teamLibrary } = figma;
    if (!teamLibrary) return { issue: 'bibliotheque-illisible', message: 'figma.teamLibrary' };

    let importees: Variable[];
    let nuances: number[];
    try {
      const rampe = variablesDeLaRampe(await variablesDeLaBibliotheque({ teamLibrary }, demande.source.collection), demande.source.chemin);
      if (rampe.size < SEUIL_DE_PALETTE) return { issue: 'palette-introuvable' };
      nuances = [...rampe.keys()].sort((a, b) => a - b);
      if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return { issue: 'modifiee-ailleurs' };
      const lectures = await Promise.allSettled(nuances.map((nuance) => figma.variables.importVariableByKeyAsync(rampe.get(nuance)!.cle)));
      importees = lectures.flatMap((lecture) => lecture.status === 'fulfilled' ? [lecture.value] : []);
      importsEffectues.push(...importees.map((variable) => variable.name));
      const refusee = lectures.find((lecture) => lecture.status === 'rejected');
      if (refusee?.status === 'rejected') return echouer({ issue: 'bibliotheque-illisible', message: messageDe(refusee.reason) });
    } catch (erreur) {
      return echouer({ issue: 'bibliotheque-illisible', message: messageDe(erreur) });
    }

    const profil = figma.root.documentColorProfile;
    let collection: VariableCollection | null;
    try {
      collection = await figma.variables.getVariableCollectionByIdAsync(importees[0].variableCollectionId);
    } catch (erreur) {
      return echouer({ issue: 'bibliotheque-illisible', message: messageDe(erreur) });
    }
    if (!collection) return echouer({ issue: 'palette-introuvable' });
    if (lireEtat(figma.root).empreinte !== demande.empreinteLue) return echouer({ issue: 'modifiee-ailleurs' });
    const { modes, nom } = collectionLue(collection);
    const lues = importees.map((variable) => variableLue(variable, profil));
    const source: PaletteDuFichier = {
      collection: collection.id,
      nomDeLaCollection: nom,
      chemin: demande.source.chemin,
      nuances,
      variables: lues.map((variable) => variable.id),
      modes,
      couleurs: Object.fromEntries(modes.map((mode) => [mode.id, lues.map((variable) => variable.valeurs[mode.id] ?? null)])),
      reference: nuanceDeReference(nuances),
    };
    const palette = reprendreDuFichier(recette, demande.palette, source, 'recalculees');
    if (!palette) return echouer({ issue: 'sans-couleur' });
    const validee = validerRecette(ajouter(recette, palette));
    if ('refus' in validee) return echouer({ issue: 'invalide', refus: validee.refus });
    const texte = jsonCanonique(validee.recette);
    figma.root.setSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE, texte);
    figma.commitUndo();
    return { issue: 'copiee', empreinte: empreinteDuTexte(texte) as string, importees: importees.length };
  } catch (erreur) {
    return echouer({ issue: 'bibliotheque-illisible', message: messageDe(erreur) });
  }
}
