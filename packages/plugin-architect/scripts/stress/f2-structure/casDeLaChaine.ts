/**
 * Les 28 cas de la section D du plan F2 (chaîne sandbox et écran) : D1 lecture qui échoue (4), D2 cases décochées (10), D3 proposition
 * ignorée (5), D4 motifs de saut (8), et le composite D5-1 qui porte tous les genres émis.
 *
 * Un cas part d'un cas du kit (`packages/kit/tests/stress/f2-structure/`) ou d'une fusion de plusieurs, passe par `lancerLaChaine`,
 * puis rend ses écarts d'écran. L'oracle de l'écran vient de la section 2.3 du plan et de la réponse Q-03 de l'inventaire ; le code
 * actuel ne les tient pas, et un écart est le résultat.
 *
 * La fusion (`fusionner`) pose sur une copie de P0 les dégradations de plusieurs cas du kit, pourvu qu'elles ne touchent pas la même
 * variable ni la même collection avec des écritures différentes. Une variable absente de la copie reste absente, une variable
 * ajoutée ou modifiée reçoit la valeur du cas.
 */
import type { CatalogueDeReference } from '@ucm-kit/core/controles';

import type { MotifDeStructureSaute } from '../../../src/ecriture/structure';
import { ACCES_DE_FIGMA } from '../../../src/sandbox/structure';
import { TEXTES } from '../../../src/ui/textes';
import type { Verdict } from '../../../../kit/tests/stress/commun/types';
import type { CasDeStructure } from '../../../../kit/tests/stress/f2-structure/cas';
import { interactions, unCouple } from '../../../../kit/tests/stress/f2-structure/interactions';
import { tousLesCas } from '../../../../kit/tests/stress/f2-structure/operateurs';
import { PROFIL_P0, themeDuProfil, type ThemeDeBase } from '../../../../kit/tests/stress/f2-structure/themeUcm';
import {
  LEVE, ajouterLesVerifications, cocherUneLigneAMain, controlerLAffichage, controlerLEchecDeLecture, controlerLesBoutonsDeCochage, controlerLesCasesDecochees,
  controlerLesGenres, controlerLeTexteDuMotif, genreDuConstat, jouerIgnorerLaPropositionPuisLeConstat, lancerLaChaine, nomsDuCatalogue, verification, verifier,
  type EcartDEcran, type ParametresDeChaine, type Verification,
} from './chaine';

export interface CasDeChaine {
  readonly id: string;
  readonly famille: 'F2';
  readonly operateur: 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  /** La propriété du plan que le cas juge. */
  readonly propriete: string;
  readonly verdict: Verdict;
  readonly question?: string;
  /** L'hypothèse de la section 6.1 du plan que ce cas met à l'épreuve. */
  readonly hypothese?: string;
  readonly description: string;
  executer(): Promise<ResultatDeChaine>;
}

export interface ResultatDeChaine {
  readonly propriete: string;
  readonly description: string;
  /** Les écarts de l'écran. */
  readonly ecran: readonly EcartDEcran[];
  /** Les vérifications de l'écran, tenues ou non. */
  readonly verifiees: number;
  readonly notes: readonly string[];
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les cas du kit

interface NoyauDuKit { readonly base: ThemeDeBase; readonly cas: readonly CasDeStructure[] }
let noyau: NoyauDuKit | null = null;

/** P0 et tous les cas du kit sur P0, calculés une fois. Le harnais ne les modifie jamais : `lancerLaChaine` copie le catalogue. */
export function noyauDuKit(): NoyauDuKit {
  if (!noyau) {
    const base = themeDuProfil(PROFIL_P0);
    noyau = { base, cas: [...tousLesCas(base), ...interactions()] };
  }
  return noyau;
}

type Filtre = (cas: CasDeStructure) => boolean;

function cas(filtre: Filtre, rang = 0): CasDeStructure {
  const trouves = noyauDuKit().cas.filter(filtre);
  if (!trouves[rang]) throw new Error('Aucun cas du kit ne correspond au filtre');
  return trouves[rang];
}

const attendu = (cas: CasDeStructure): boolean => cas.verdict === 'attendu';
const dit = (genre: string | null): ((cas: CasDeStructure) => boolean) => (cas) => cas.attendus.some((entree) => entree.cle.startsWith(`${genre ?? '-'}|`));
const duMode = (mode: string): Filtre => (cas) => cas.entree.description.includes(` en ${mode}`);

const parametresDe = (source: CasDeStructure | { catalogue: CatalogueDeReference; ecriture: ThemeDeBase['ecriture'] | null }, plus: Partial<ParametresDeChaine> = {}): ParametresDeChaine => (
  'entree' in source
    ? { catalogue: source.entree.theme.catalogue, ecriture: source.entree.ecriture, ...plus }
    : { catalogue: source.catalogue, ecriture: source.ecriture, ...plus }
);

// ---------------------------------------------------------------------------------------------------------------------------
// La fusion de plusieurs dégradations

export interface Fusion {
  readonly catalogue: CatalogueDeReference;
  readonly retenus: readonly CasDeStructure[];
  readonly ecartes: readonly string[];
}

const empreinte = (valeur: unknown): string => JSON.stringify(valeur ?? null);

/**
 * Pose sur une copie de la base les dégradations des candidats, dans l'ordre, et ignore celles qui touchent une variable déjà
 * touchée ou une collection déjà écrite autrement. Une dégradation se lit par différence entre le catalogue du cas et celui de la base.
 */
export function fusionner(base: ThemeDeBase, candidats: readonly CasDeStructure[]): Fusion {
  const catalogue = structuredClone(base.catalogue);
  const variablesDeLaBase = new Map(base.catalogue.variables.map((variable) => [variable.cle, variable]));
  const collectionsDeLaBase = new Map(base.catalogue.collections.map((collection) => [collection.cle, collection]));
  const variablesTouchees = new Set<string>();
  const collectionsEcrites = new Map<string, string>();
  let libraryEcrite: string | null = null;
  const retenus: CasDeStructure[] = [];
  const ecartes: string[] = [];

  for (const candidat of candidats) {
    const degrade = candidat.entree.theme.catalogue;
    const presentes = new Set(degrade.variables.map((variable) => variable.cle));
    const retirees = base.catalogue.variables.filter((variable) => !presentes.has(variable.cle)).map((variable) => variable.cle);
    const modifiees = degrade.variables.filter((variable) => variablesDeLaBase.has(variable.cle) && empreinte(variable) !== empreinte(variablesDeLaBase.get(variable.cle)));
    const ajoutees = degrade.variables.filter((variable) => !variablesDeLaBase.has(variable.cle));
    const collections = degrade.collections.filter((collection) => empreinte(collection) !== empreinte(collectionsDeLaBase.get(collection.cle)));
    const library = empreinte(degrade.library) !== empreinte(base.catalogue.library) ? empreinte(degrade.library) : null;
    const cles = [...retirees, ...modifiees.map(({ cle }) => cle), ...ajoutees.map(({ cle }) => cle)];
    const heurte = cles.some((cle) => variablesTouchees.has(cle))
      || collections.some((collection) => collectionsEcrites.has(collection.cle) && collectionsEcrites.get(collection.cle) !== empreinte(collection))
      || (library !== null && libraryEcrite !== null && libraryEcrite !== library);
    if (cles.length + collections.length + (library === null ? 0 : 1) === 0 || heurte) {
      ecartes.push(candidat.id);
      continue;
    }
    for (const cle of retirees) catalogue.variables.splice(catalogue.variables.findIndex((variable) => variable.cle === cle), 1);
    for (const variable of modifiees) catalogue.variables[catalogue.variables.findIndex((entree) => entree.cle === variable.cle)] = structuredClone(variable);
    catalogue.variables.push(...ajoutees.map((variable) => structuredClone(variable)));
    for (const collection of collections) {
      const rang = catalogue.collections.findIndex((entree) => entree.cle === collection.cle);
      if (rang >= 0) catalogue.collections[rang] = structuredClone(collection); else catalogue.collections.push(structuredClone(collection));
      collectionsEcrites.set(collection.cle, empreinte(collection));
    }
    if (library !== null) {
      catalogue.library = structuredClone(degrade.library);
      libraryEcrite = library;
    }
    for (const cle of cles) variablesTouchees.add(cle);
    retenus.push(candidat);
  }
  return { catalogue, retenus, ecartes };
}

/**
 * Les cas qui font les genres émis, un par sorte de constat, dans l'ordre où la fusion les essaie. Chacun touche des variables que les
 * autres laissent : `primary` pour R1, M1, S1 et Y3, `secondary` pour K1, L1 et I1. Tous lisent le mode Light.
 */
function candidatsDuComposite(): CasDeStructure[] {
  const tous = noyauDuKit().cas;
  const premier = (filtre: Filtre): CasDeStructure[] => tous.filter(filtre).slice(0, 1);
  const decrit = (mot: string): Filtre => (entree) => entree.entree.description.includes(mot);
  const duOperateur = (operateur: string, ...plus: Filtre[]): Filtre => (entree) => entree.operateur === operateur && attendu(entree) && plus.every((filtre) => filtre(entree));
  const avecCreation: Filtre = (entree) => (entree.details ?? []).some((detail) => detail.creation !== undefined) && entree.attendus.every((a) => a.cle.startsWith('variable-absente|'));
  return [
    ...premier(duOperateur('R1', avecCreation, decrit('primary surface/subtle'))),
    ...premier(duOperateur('R1', avecCreation, decrit('primary surface/divider'))),
    ...premier(duOperateur('K1', duMode('light'), dit('cran'), decrit('secondary solid/default'))),
    ...premier((entree) => entree.operateur === 'K3' && entree.verdict === 'mesure' && decrit('primary solid/foreground en light')(entree)),
    ...premier(duOperateur('M1', dit(null), decrit('primary surface/foreground en light'))),
    ...premier(duOperateur('M2', dit(null), decrit('surface/default en light'))),
    ...premier(duOperateur('L1', dit('alias-supprime'), decrit('secondary/surface/hover'))),
    ...premier(duOperateur('L2', dit('library-inactive'))),
    ...premier(duOperateur('L4', dit('sans-valeur-en-mode'))),
    ...premier(duOperateur('L5', dit('couleur-sans-alias'))),
    ...premier(duOperateur('E1', dit('doublons'))),
    ...premier(duOperateur('S1', dit(null), decrit('primary solid/default'))),
    ...premier(duOperateur('S2', dit('scopes'), decrit('S2 brands'))),
    ...premier(duOperateur('Y1', dit('couche'))),
    ...premier(duOperateur('Y2', dit('valeur-directe'))),
    ...premier(duOperateur('Y3', dit('type'), decrit('primary ring'))),
    ...premier(duOperateur('Y4', dit('mal-rangee'))),
    // Le cran retiré porte sur `secondary` : K3-1 déplace `solid/foreground` de `primary` et rendrait son sens ambigu.
    unCouple('I1', noyauDuKit().base, 'secondary'),
  ];
}

/**
 * Le cas M4 « Light seul » appliqué à la fin : le mode Dark et ses valeurs quittent `theme`, ce qui fait naître `mode-du-theme`.
 * Un mode renommé ou ajouté rendrait `mode-sans-cible` toute création de C82 ; retirer Dark les laisse proposées, en Light seul.
 */
function retirerLeModeDark(base: ThemeDeBase, catalogue: CatalogueDeReference): void {
  const theme = catalogue.collections.find((collection) => collection.cle === base.carte.collections.theme.cle)!;
  const sombre = base.carte.modes.dark.id;
  theme.modes = theme.modes.filter((mode) => mode.id !== sombre);
  for (const variable of catalogue.variables) if (variable.collection === theme.cle && variable.valeurs) delete variable.valeurs[sombre];
}

let compositeMemorise: Fusion | null = null;

/** Le composite qui porte tous les genres que le kit émet : une fusion, calculée une fois. */
export function composite(): Fusion {
  if (!compositeMemorise) {
    const base = noyauDuKit().base;
    const retenus: CasDeStructure[] = [];
    let derniere: Fusion | null = null;
    for (const candidat of candidatsDuComposite()) {
      const essai = fusionner(base, [...retenus, candidat]);
      if (essai.retenus.length === retenus.length + 1) {
        retenus.push(candidat);
        derniere = essai;
      }
    }
    compositeMemorise = derniere ?? fusionner(base, []);
    retirerLeModeDark(base, compositeMemorise.catalogue);
  }
  return compositeMemorise;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Les résultats

function resultat(cas: CasDeChaine, v: Verification, notes: readonly string[] = []): ResultatDeChaine {
  return { propriete: cas.propriete, description: cas.description, ecran: v.ecarts, verifiees: v.verifiees, notes };
}

const definir = (
  id: string, operateur: CasDeChaine['operateur'], propriete: string, description: string, executer: (cas: CasDeChaine) => Promise<ResultatDeChaine>,
  plus: { verdict?: Verdict; question?: string; hypothese?: string } = {},
): CasDeChaine => {
  const definition: CasDeChaine = {
    id, famille: 'F2', operateur, propriete, verdict: plus.verdict ?? 'attendu', description, executer: () => executer(definition),
    ...(plus.question ? { question: plus.question } : {}), ...(plus.hypothese ? { hypothese: plus.hypothese } : {}),
  };
  return definition;
};

// ---------------------------------------------------------------------------------------------------------------------------
// D1. Lecture qui échoue

const FIGMA_QUI_REFUSE = {
  root: { getSharedPluginData: () => ' ' },
  variables: { getLocalVariablesAsync: async () => { throw new Error('Figma refuse la lecture des variables'); } },
} as never;

function casDeLEchecDeLecture(n: number, description: string, parametres: () => ParametresDeChaine): CasDeChaine {
  return definir(`D1-${n}`, 'D1', 'P13', description, async (definition) => {
    const chaine = await lancerLaChaine(parametres());
    const message = chaine.derniere();
    return resultat(definition, controlerLEchecDeLecture(chaine.ecran, 'après la lecture'), [
      `message structure : ${message.constats.length} constats, ${message.corrections.length} corrections, aucun champ qui dise l'échec`,
    ]);
  });
}

/** D1-3. Les réglages qui lèvent à la deuxième lecture : l'ignoré reste ignoré et la création reste proposée. */
function casDesReglagesQuiLevent(): CasDeChaine {
  return definir('D1-3', 'D1', 'P13', 'Réglages qui lèvent à la relecture, après un constat ignoré et une création proposée', async (definition) => {
    const { base } = noyauDuKit();
    const fusion = fusionner(base, [
      cas((entree) => entree.operateur === 'R1' && entree.entree.description.includes('primary surface/subtle')),
      cas((entree) => entree.operateur === 'R1' && entree.entree.description.includes('primary surface/divider')),
    ]);
    const chaine = await lancerLaChaine({ catalogue: fusion.catalogue, ecriture: base.ecriture });
    const ignore = chaine.derniere().constats.find((constat) => constat.faits.variable === 'surface/subtle')!;
    const v = verification();
    chaine.cles(); // la liste des clés du fichier
    if (chaine.etat.reglages !== LEVE) chaine.etat.reglages.cles.push(ignore.id);
    await chaine.lire();
    verifier(v, !chaine.derniere().constats.some(({ id }) => id === ignore.id), { propriete: 'P13', sorte: 'geste-sans-effet', detail: `le constat ${ignore.id} ignoré reste dans la lecture sans échec` });
    const avant = chaine.derniere().corrections.length;
    verifier(v, avant > 0, { propriete: 'P13', sorte: 'geste-sans-effet', detail: 'la lecture sans échec ne propose aucune création' });
    chaine.etat.reglages = LEVE;
    await chaine.lire();
    const message = chaine.derniere();
    verifier(v, !message.constats.some(({ id }) => id === ignore.id), {
      propriete: 'P13', sorte: 'echec-tu', detail: `les réglages ne se lisent plus : le constat ignoré ${ignore.id} réapparaît à l'écran`,
    });
    verifier(v, message.corrections.length === avant, {
      propriete: 'P13', sorte: 'echec-tu', detail: `les réglages ne se lisent plus : ${message.corrections.length} créations proposées au lieu de ${avant}, l'écriture choisie est perdue`,
    });
    return resultat(definition, v);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// D2. Cases décochées

interface SorteDeCarte {
  readonly nom: string;
  /** Le cas qui donne la carte, puis un second de la même sorte que la relecture ajoute. */
  readonly source: () => readonly [CasDeStructure, CasDeStructure];
}

const dif = (a: CasDeStructure, b: CasDeStructure): boolean => a.entree.description !== b.entree.description;

function deuxCas(filtre: Filtre): readonly [CasDeStructure, CasDeStructure] {
  const premier = cas(filtre);
  return [premier, noyauDuKit().cas.filter(filtre).find((autre) => dif(premier, autre) && !premier.entree.touchees.some((cle) => autre.entree.touchees.includes(cle)))!];
}

const SORTES_DE_CARTE: readonly SorteDeCarte[] = [
  { nom: 'variables manquantes (C82)', source: () => deuxCas((entree) => entree.operateur === 'R1' && attendu(entree) && (entree.details ?? []).some((detail) => detail.creation !== undefined) && entree.attendus.every((a) => a.cle.startsWith('variable-absente|')) && !/^R1 (neutral|\(globale\))/.test(entree.entree.description)) },
  { nom: 'crans (C82)', source: () => deuxCas((entree) => entree.operateur === 'K1' && attendu(entree) && entree.hypothese === undefined) },
  { nom: 'modes (C60)', source: () => deuxCas((entree) => entree.operateur === 'M1' && attendu(entree)) },
  { nom: 'scopes de theme (C63)', source: () => deuxCas((entree) => entree.operateur === 'S1' && attendu(entree)) },
  { nom: 'scopes de couche (C82)', source: () => deuxCas((entree) => entree.operateur === 'S2' && attendu(entree) && entree.attendus.length === 1) },
];

function casDesCasesDecochees(rang: number, apresCocheManuelle: boolean): CasDeChaine {
  const sorte = SORTES_DE_CARTE[rang];
  const n = (apresCocheManuelle ? 6 : 1) + rang;
  const quand = apresCocheManuelle ? 'à la relecture après une coche à la main et l\'ajout d\'une correction' : 'au premier affichage';
  return definir(`D2-${n}`, 'D2', 'P12', `Cartes ${sorte.nom} ${quand}`, async (definition) => {
    const [premiere, seconde] = sorte.source();
    const chaine = await lancerLaChaine(parametresDe(premiere));
    const v = verification();
    verifier(v, chaine.ecran.lignes().length > 0, { propriete: 'P12', sorte: 'non-affiche', detail: `aucune ligne de correction pour ${sorte.nom} (${premiere.id})` });
    if (chaine.ecran.lignes().length === 0) return resultat(definition, v, [`source ${premiere.id}`]);
    if (!apresCocheManuelle) {
      ajouterLesVerifications(v, controlerLesCasesDecochees(chaine.ecran, quand), controlerLesBoutonsDeCochage(chaine.ecran));
      return resultat(definition, v, [`source ${premiere.id}`]);
    }
    const avant = new Set(chaine.ecran.lignes().map((ligne) => ligne.getAttribute('aria-label')));
    const coche = cocherUneLigneAMain(chaine.ecran);
    chaine.poserLeCatalogue(fusionner(noyauDuKit().base, [premiere, seconde]).catalogue);
    await chaine.lire();
    const nouvelles = chaine.ecran.lignes().filter((ligne) => !avant.has(ligne.getAttribute('aria-label')));
    verifier(v, nouvelles.length > 0, { propriete: 'P12', sorte: 'non-affiche', detail: `la relecture avec ${seconde.id} n'ajoute aucune ligne à ${sorte.nom}` });
    const cochees = chaine.ecran.lignesCochees();
    verifier(v, cochees.length <= 1, {
      propriete: 'P12', sorte: 'cochee', nombre: Math.max(cochees.length - 1, 1),
      detail: `${quand} : ${cochees.length} lignes cochées, une seule l'est de la main du designer (${coche ?? '-'})`,
    });
    verifier(v, nouvelles.every((ligne) => !ligne.checked), {
      propriete: 'P12', sorte: 'cochee', detail: `${quand} : ${nouvelles.filter((ligne) => ligne.checked).length} lignes arrivent cochées parmi les ${nouvelles.length} nouvelles`,
    });
    return resultat(definition, v, [`sources ${premiere.id} puis ${seconde.id}`]);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// D3. Proposition ignorée

interface SorteDeProposition {
  readonly nom: string;
  readonly source: () => CasDeStructure;
  readonly constat: (constat: { code: string; faits: Record<string, unknown>; correction?: { sorte: string } }) => boolean;
  readonly hypothese?: string;
}

const SORTES_DE_PROPOSITION: readonly SorteDeProposition[] = [
  { nom: 'C60 alias de mode', source: () => cas((entree) => entree.operateur === 'M1' && attendu(entree)), constat: (constat) => constat.code === 'C60' && constat.correction !== undefined },
  { nom: 'C63 scopes', source: () => cas((entree) => entree.operateur === 'S1' && attendu(entree)), constat: (constat) => constat.code === 'C63' && constat.correction?.sorte === 'scope', hypothese: 'H7' },
  { nom: 'C82 scopes', source: () => cas((entree) => entree.operateur === 'S2' && attendu(entree)), constat: (constat) => constat.faits.genre === 'scopes' && constat.correction !== undefined },
  { nom: 'C82 cran', source: () => cas((entree) => entree.operateur === 'K1' && attendu(entree) && entree.hypothese === undefined), constat: (constat) => constat.faits.genre === 'cran' && constat.correction !== undefined },
  { nom: 'C82 variable-absente', source: () => cas((entree) => entree.operateur === 'R1' && attendu(entree) && (entree.details ?? []).some((detail) => detail.creation !== undefined)), constat: (constat) => constat.faits.genre === 'variable-absente' && constat.correction !== undefined },
];

function casDeLaProposition(n: number): CasDeChaine {
  const sorte = SORTES_DE_PROPOSITION[n - 1];
  return definir(`D3-${n}`, 'D3', 'P11', `Proposition ignorée : ${sorte.nom}`, async (definition) => {
    const source = sorte.source();
    const chaine = await lancerLaChaine(parametresDe(source));
    const cible = chaine.derniere().constats.find(sorte.constat as never);
    const v = verification();
    verifier(v, cible !== undefined, { propriete: 'P11', sorte: 'non-affiche', detail: `aucun constat ${sorte.nom} avec une correction pour ${source.id}` });
    if (!cible) return resultat(definition, v, [`source ${source.id}`]);
    ajouterLesVerifications(v, await jouerIgnorerLaPropositionPuisLeConstat(chaine, nomsDuCatalogue(source.entree.theme.catalogue), cible));
    return resultat(definition, v, [`source ${source.id}, constat ${cible.id}`]);
  }, sorte.hypothese ? { hypothese: sorte.hypothese } : {});
}

// ---------------------------------------------------------------------------------------------------------------------------
// D4. Motifs de saut

/** Les valeurs de `MotifDeStructureSaute` ; le type d'enregistrement échoue à la compilation si une valeur manque ou s'ajoute. */
const MOTIFS: Readonly<Record<MotifDeStructureSaute, true>> = {
  'objet-change': true, 'fait-faux': true, 'cible-introuvable': true, erreur: true, 'non-ucm': true, 'journal-impossible': true, 'deja-la': true, 'existe-divergente': true,
};
const LISTE_DES_MOTIFS = Object.keys(MOTIFS) as MotifDeStructureSaute[];

function casDuMotif(n: number): CasDeChaine {
  const motif = LISTE_DES_MOTIFS[n - 1];
  return definir(`D4-${n}`, 'D4', 'P14', `Création sautée pour le motif ${motif}`, async (definition) => {
    const source = cas((entree) => entree.operateur === 'R1' && attendu(entree) && (entree.details ?? []).some((detail) => detail.creation !== undefined) && entree.attendus.length === 1);
    const chaine = await lancerLaChaine(parametresDe(source, {
      ecrire: async (corrections) => ({ ecrites: [], sautees: corrections.map(({ id }) => ({ id, motif })), sansAnnulation: [] }),
    }));
    const v = verification();
    const creation = chaine.derniere().corrections.find((correction) => correction.sorte === 'variable');
    verifier(v, creation !== undefined && chaine.ecran.lignes().length > 0, { propriete: 'P14', sorte: 'non-affiche', detail: `aucune création à écrire pour ${source.id}` });
    if (!creation) return resultat(definition, v, [`source ${source.id}`]);
    for (const ligne of chaine.ecran.lignes()) if (!ligne.checked) ligne.clic();
    const bouton = chaine.ecran.boutonAppliquer();
    verifier(v, bouton !== null && !bouton.disabled, { propriete: 'P14', sorte: 'geste-sans-effet', detail: 'Appliquer est inactif alors que la création est cochée' });
    if (!bouton || bouton.disabled) return resultat(definition, v, [`source ${source.id}`]);
    await chaine.apres(() => bouton.clic());
    const nom = `${creation.apres.collection ? `${creation.apres.collection}/` : ''}${creation.apres.nom}`;
    ajouterLesVerifications(v, controlerLeTexteDuMotif(chaine, motif, nom));
    return resultat(definition, v, [`source ${source.id}, texte du motif ${JSON.stringify(TEXTES.motifDeSaut[motif] ?? null)}`]);
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// D5. Composite

/** D5-1. Un catalogue qui porte tous les genres émis : chaque constat se lit à l'écran, et chaque genre est déclaré. */
function casDuComposite(): CasDeChaine {
  return definir('D5-1', 'D5', 'P9', 'Composite qui porte tous les genres émis, jugé pour P9 et P10', async (definition) => {
    const fusion = composite();
    const base = noyauDuKit().base;
    const chaine = await lancerLaChaine({ catalogue: fusion.catalogue, ecriture: base.ecriture });
    const noms = nomsDuCatalogue(fusion.catalogue);
    const message = chaine.derniere();
    const v = verification();
    const affichage = controlerLAffichage(chaine, noms);
    ajouterLesVerifications(v, affichage, controlerLesGenres(message.constats, noms));
    const genres = [...new Set(message.constats.map(genreDuConstat))].sort();
    const questions = message.constats.filter((constat) => constat.code === 'C60' && constat.question !== undefined && constat.correction === undefined);
    const invisibles = questions.filter((constat) => affichage.ecarts.some((ecart) => ecart.detail.includes(constat.id)));
    return resultat(definition, v, [
      `composite : ${fusion.retenus.length} cas fusionnés (${fusion.retenus.map((entree) => entree.id).join(' ')}), écartés ${fusion.ecartes.join(' ') || '-'}`,
      `${message.constats.length} constats, ${message.corrections.length} corrections, genres émis : ${genres.join(' ; ')}`,
      `H8 : ${questions.length} question(s) C60 sans correction, ${invisibles.length} sans carte à l'écran (${questions.length === 0 ? 'non éprouvée' : invisibles.length === questions.length ? 'confirmée' : 'infirmée'})`,
    ]);
  }, { hypothese: 'H8' });
}

// ---------------------------------------------------------------------------------------------------------------------------
// La liste

export function casDeLaChaine(): CasDeChaine[] {
  const premierR1 = (): ParametresDeChaine => parametresDe(cas((entree) => entree.operateur === 'R1' && attendu(entree)));
  return [
    casDeLEchecDeLecture(1, 'Catalogue dont la lecture lève', () => ({ ...premierR1(), catalogue: LEVE })),
    casDeLEchecDeLecture(2, 'Catalogue null sur un fichier UCM', () => ({ ...premierR1(), catalogue: null })),
    casDesReglagesQuiLevent(),
    casDeLEchecDeLecture(4, 'Lecture des variables de Figma qui lève, par l\'accès réel', () => ({
      ...premierR1(), catalogue: null, lecture: (contexte) => ACCES_DE_FIGMA.catalogue({ ...contexte, figma: FIGMA_QUI_REFUSE }),
    })),
    ...SORTES_DE_CARTE.map((_, rang) => casDesCasesDecochees(rang, false)),
    ...SORTES_DE_CARTE.map((_, rang) => casDesCasesDecochees(rang, true)),
    ...SORTES_DE_PROPOSITION.map((_, rang) => casDeLaProposition(rang + 1)),
    ...LISTE_DES_MOTIFS.map((_, rang) => casDuMotif(rang + 1)),
    casDuComposite(),
  ];
}
