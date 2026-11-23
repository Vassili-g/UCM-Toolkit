/**
 * Ce que l'inventaire lit dans le dépôt : le kit compilé, le moteur de couleur, le hub, la CLI, le socle et les fichiers du
 * dépôt. Chaque fonction rend des données, jamais du HTML ; `generer-inventaire.ts` les met en forme.
 *
 * Une lecture qui ne trouve pas ce qu'elle attend lève une erreur qui nomme le fichier : l'inventaire ne s'écrit pas avec une
 * section vide. Les phrases qu'aucun fichier ne porte (une par script npm) restent ici, et un script npm sans phrase fait échouer
 * la lecture, comme une phrase sans script.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOKENS_FORMAT_VERSION, VERSIONS_DE_TOKENS_LUES, CONTRACT_VERSION } from '@ucm-kit/core/format';
import { VERSION_CONTRAT_MINIMALE, sectionEcartsDeParite } from '@ucm-kit/core/lecteurs';
import { FENETRE_DE_LA_RECETTE } from '@ucm-kit/core/protocoles';
import * as controlesBrut from '@ucm-kit/core/controles';
import * as referentielBrut from '@ucm-kit/core/referentiel';
import * as emploisBrut from '@ucm-kit/core/emplois';
import type { FondDeGarantie } from '@ucm-kit/core/emplois';
import { aUnTitreContenant, questionsDe, sectionContenant, sectionDe, tableauDe } from './extraire';
import { dateDuDernierLot, etatDuPlan, lireLePlan, lotSuivant, type Lot } from './plans';
import { ETATS_DE_COMPOSANT, TEXTES_DES_ETATS, verdictDeLaDemande } from '../../packages/kit/src/lecteurs/verdict-bilan.mjs';
import {
  ATTRIBUTS_SANS_VALEUR_VISUELLE,
  CHAMPS_A_VALEUR_PUBLIEE,
  CHAMPS_HORS_FAMILLE,
  CODES_DU_CONTROLE_DU_CODE,
  FAMILLES,
  FONCTIONS_DE_COULEUR,
  FONCTIONS_MATHEMATIQUES,
  LIMITES_DU_CONTROLE,
  MOTS_CLES_DE_FORME,
  NOMS_DE_COULEUR,
  PROPRIETES_PAR_FAMILLE,
  RAISON_ATTRIBUTS_SANS_VALEUR_VISUELLE,
  RAISON_FONCTIONS_DE_COULEUR,
  RAISON_FONCTIONS_MATHEMATIQUES,
  RAISON_MOTS_CLES_DE_FORME,
  RAISON_NOMS_DE_COULEUR,
  RAISON_UNITES_DE_LONGUEUR,
  UNITES_DE_LONGUEUR,
  VALEURS_NEUTRES,
} from '../../packages/kit/src/lecteurs/controle-du-code-listes.mjs';
import { coordonneesDuGenre } from '../../packages/kit/src/lecteurs/derogations.mjs';
import { PREREGLAGES, couleurDeLaCarte, ecrireHexa, rampesDe, recetteParDefaut, type Recette } from 'ucm-couleur';

import { ELEMENT_DE_LA_FAMILLE } from '../../packages/plugin-architect/src/ui/panneau/elements';
import { TEXTES_ELEMENTS } from '../../packages/plugin-architect/src/ui/textes/elements';
import { recetteDeDemonstration } from '../../packages/hub/src/modele/modele';
import { svgDeLAlerte } from '../../packages/plugin-socle/src/ui/Alerte';

/**
 * Les noms que l'inventaire lit dans chaque module du kit dont il couvre les exports. Chaque module se lit à travers un
 * `Proxy` posé sur une copie : un nom lu s'y inscrit, et `couverture.ts` écarte ceux que la page ne montre pas.
 */
export const NOMS_LUS: Readonly<Record<'referentiel' | 'emplois' | 'controles', Set<string>>> = { referentiel: new Set(), emplois: new Set(), controles: new Set() };

function suivre<T extends object>(module: keyof typeof NOMS_LUS, contenu: T): T {
  return new Proxy({ ...contenu }, {
    get(cible, nom, receveur) {
      if (typeof nom === 'string') NOMS_LUS[module].add(nom);
      return Reflect.get(cible, nom, receveur);
    },
  });
}
const { CIBLE_MINIMALE_PX, CIBLE_TACTILE_PX, CODES_DES_CONSTATS, TEXTE_MINIMAL_PX } = suivre('controles', controlesBrut);
const {
  CIBLES_DES_COLLECTIONS,
  COLLECTIONS,
  COLLECTIONS_SANS_PORTEE,
  FAMILLES_BRANDS,
  FAMILLES_COMPOSANT,
  FAMILLES_DE_SIGNES,
  FAMILLES_UTILITY,
  REGISTRE_PROPRIETES_COMPOSANT,
  REGISTRE_TAILLES,
  FAMILLES_PRIMITIVES,
  FAMILLES_LAYOUT,
  FAMILLES_TYPOGRAPHY,
  MODES,
  REGISTRE_MESURES_LAYOUT,
  REGISTRE_VALEURS_DIMENSIONNELLES,
  REGISTRE_VALEURS_TYPOGRAPHIQUES,
  REPRISES_DE_SIGNES,
  REGISTRES,
  REGISTRES_ARCHITECTURE,
  REGISTRES_COMPOSANTS,
  PRODUITS,
  CONVENTIONS,
  ETATS,
  DOSSIERS,
  PROFILS,
  SORTES_D_IMBRIQUE,
  LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES,
  LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE,
  LONGUEUR_MINIMALE_D_UNE_FAUTE_D_UN_MOT_COURT,
  SIGNAUX_DU_LANGAGE,
  SIGNES,
  TYPES_D_ALERTE,
  svgDuSigne,
} = suivre('referentiel', referentielBrut);
const {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  GARANTIES,
  NIVEAUX_D_ELEVATION_DU_THEME,
  TEXTE_DES_BOUTONS_PAR_DEFAUT,
  VARIABLES_DE_PALETTE,
  VARIABLES_DU_NEUTRE,
  VARIABLES_DU_THEME,
  VARIABLES_GLOBALES,
  cibleDeLaVariable,
} = suivre('emplois', emploisBrut);

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Un fichier du dépôt, en LF. */
export function lire(chemin: string): string {
  const complet = path.join(RACINE, chemin);
  if (!existsSync(complet)) throw new Error(`Fichier absent du dépôt : ${chemin}`);
  return readFileSync(complet, 'utf8').replace(/\r\n/g, '\n');
}
const liste = (chemin: string): string[] => readdirSync(path.join(RACINE, chemin));
const dossiers = (chemin: string): string[] => liste(chemin).filter((nom) => statSync(path.join(RACINE, chemin, nom)).isDirectory());
const json = (chemin: string) => JSON.parse(lire(chemin));

// ---------- Les versions ----------

export interface Versions {
  kit: string;
  cli: string;
  adaptateur: string;
  contrat: string;
  contratMinimal: string;
  tokens: number;
  tokensLus: readonly number[];
  recette: number;
  recettePremiere: number;
}

export function versions(): Versions {
  return {
    kit: json('packages/kit/package.json').version,
    cli: json('packages/cli/package.json').version,
    adaptateur: json('packages/adapter-typescript/package.json').version,
    contrat: CONTRACT_VERSION,
    contratMinimal: VERSION_CONTRAT_MINIMALE,
    tokens: TOKENS_FORMAT_VERSION,
    tokensLus: VERSIONS_DE_TOKENS_LUES,
    recette: FENETRE_DE_LA_RECETTE.courante,
    recettePremiere: FENETRE_DE_LA_RECETTE.premiere,
  };
}

// ---------- Le référentiel du panneau des variables ----------

const termes = (registre: { readonly termes: readonly { readonly id: string }[] }): string[] => registre.termes.map((terme) => terme.id);

/** Ce que le panneau des variables lit : collections, familles, table du thème par mode et par sens, garanties. */
export function referencePourLePanneau() {
  const sens = ['normal', 'inverse'] as const;
  const familleDe = (variable: string): string =>
    (VARIABLES_DE_PALETTE as readonly string[]).includes(variable)
      ? 'palette'
      : (VARIABLES_DU_NEUTRE as readonly string[]).includes(variable)
        ? 'neutre'
        : (VARIABLES_GLOBALES as readonly string[]).includes(variable)
          ? 'globale'
          : 'elevation';
  return {
    couleursAbsolues: { white: COULEUR_DU_TEXTE_DES_BOUTONS.blanc, black: COULEUR_DU_TEXTE_DES_BOUTONS.noir },
    niveauxElevation: NIVEAUX_D_ELEVATION_DU_THEME,
    collections: COLLECTIONS.map((nom) => ({
      nom,
      cibles: CIBLES_DES_COLLECTIONS[nom],
      scope: !(COLLECTIONS_SANS_PORTEE as readonly string[]).includes(nom),
    })),
    familles: Object.fromEntries(famillesParCollection().map(({ collection, familles }) => [collection, familles])),
    registres: {
      valeursDimensionnelles: termes(REGISTRE_VALEURS_DIMENSIONNELLES),
      mesuresLayout: termes(REGISTRE_MESURES_LAYOUT),
      valeursTypographiques: termes(REGISTRE_VALEURS_TYPOGRAPHIQUES),
    },
    theme: VARIABLES_DU_THEME.map((variable) => ({
      variable,
      famille: familleDe(variable),
      cibles: Object.fromEntries(MODES.flatMap((mode) => sens.map((s) => [`${mode}-${s}`, cibleDeLaVariable(variable, mode, s) ?? null]))),
    })),
    garanties: GARANTIES.map((garantie) => ({ numero: garantie.numero, variable: garantie.premier.variable })),
  };
}

/** Les garanties en lignes de tableau : variable, fonds regroupés par famille, seuil. */
export function lignesDesGaranties(): { numero: number; variable: string; fonds: string; seuil: string }[] {
  const nomDuFond = (fond: FondDeGarantie): { famille: string; etat: string } => {
    if ('fondDeLaPage' in fond) return { famille: '', etat: 'page' };
    if ('fondDeLaCarte' in fond) return { famille: '', etat: 'carte' };
    const [famille, etat] = fond.variable.split('/');
    return { famille, etat };
  };
  return GARANTIES.map((garantie) => {
    const groupes: { famille: string; etats: string[] }[] = [];
    for (const fond of garantie.fonds) {
      const { famille, etat } = nomDuFond(fond);
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier.famille === famille) dernier.etats.push(etat);
      else groupes.push({ famille, etats: [etat] });
    }
    return {
      numero: garantie.numero,
      variable: garantie.premier.variable,
      fonds: groupes.map((groupe) => `${groupe.famille ? `${groupe.famille} ` : ''}${groupe.etats.join(', ')}`).join(', '),
      seuil: garantie.seuil === 'texte' ? 'texte 4,5:1' : 'non-texte 3:1',
    };
  });
}

// ---------- Les couleurs ----------

/** La clarté OKLCH des courbes du préréglage à 11 nuances : la page dessine les rampes de ses deux modes avec elle. */
export function clarteDesCrans() {
  const onze = PREREGLAGES[11];
  return { crans: onze.crans, clarte: { light: onze.courbes.light, dark: onze.courbes.dark } };
}

/**
 * Les rampes des six palettes de démonstration du hub, par intensité, mode et sens du thème. Le sens inverse change les crans
 * 500 à 800 par le texte des boutons de chaque mode : la page lit les deux jeux.
 */
export function donneesDesPalettes() {
  const base = recetteDeDemonstration();
  const autre = (texte: string) => (texte === 'blanc' ? 'noir' : 'blanc');
  const texteInverse = Object.fromEntries(MODES.map((mode) => [mode, autre(TEXTE_DES_BOUTONS_PAR_DEFAUT[mode])])) as Recette['texteDesBoutons'];
  const recettes = { normal: { ...base, texteDesBoutons: { ...TEXTE_DES_BOUTONS_PAR_DEFAUT } } as Recette, inverse: { ...base, texteDesBoutons: texteInverse } as Recette };
  const palettes = base.palettes.map((palette, rang) => {
    const intensites: Record<string, Record<string, string[]>> = {};
    for (const [sens, recette] of Object.entries(recettes)) {
      const rampes = rampesDe(recette, recette.palettes[rang]) as Record<string, Record<string, readonly { readonly hexa: string }[]>>;
      for (const intensite of Object.keys(rampes)) {
        intensites[intensite] ??= {};
        for (const mode of MODES) intensites[intensite][`${mode}-${sens}`] = rampes[intensite][mode].map((cran) => cran.hexa);
      }
    }
    return { nom: palette.nom, reference: palette.reference, intensites };
  });
  return {
    crans: base.crans,
    fonds: base.fonds,
    palettes,
    cartes: Object.fromEntries(MODES.map((mode) => [mode, ecrireHexa(couleurDeLaCarte(base, mode))])),
  };
}

// ---------- Les codes de constat ----------

/** La section du panneau d'Architect qui range les constats de la vue Tokens : aucun élément du composant ne les porte. */
const CODES_DE_LA_VUE_TOKENS: readonly string[] = ['C60', 'C63', 'C82'];

/** Un code, sa section, son sens et ses types, dans l'ordre des sections du panneau puis du catalogue. */
export function codesDesConstats(): [string, string, string, readonly string[]][] {
  const libelles = TEXTES_ELEMENTS.elementsDuPanneau.libelles as Readonly<Record<string, string>>;
  const ordre = Object.keys(libelles);
  const section = (code: string, famille: keyof typeof ELEMENT_DE_LA_FAMILLE): string =>
    CODES_DE_LA_VUE_TOKENS.includes(code) ? 'Vue Tokens' : libelles[ELEMENT_DE_LA_FAMILLE[famille]];
  const lignes = CODES_DES_CONSTATS.map((entree) => ({
    entree,
    section: section(entree.code, entree.familles[0]),
    rang: CODES_DE_LA_VUE_TOKENS.includes(entree.code) ? ordre.length : ordre.indexOf(ELEMENT_DE_LA_FAMILLE[entree.familles[0]]),
  }));
  lignes.sort((a, b) => a.rang - b.rang);
  return lignes.map(({ entree, section: nom }) => [entree.code, nom, entree.sens, entree.types]);
}

// ---------- Les paquets, leurs points d'entrée, leurs tests ----------

const PAQUETS: Readonly<Record<string, string>> = {
  'plugin-palettes': 'UCM Palettes',
  'plugin-architect': 'UCM Architect',
  'plugin-exporter': 'Contract Exporter',
  'plugin-socle': 'Socle',
  cli: 'CLI',
  'adapter-typescript': 'Adaptateur TypeScript',
  kit: 'Kit',
  couleur: 'Moteur de couleur',
  hub: 'Hub UCM',
};

function fichiersDeTest(dossier: string): number {
  let compte = 0;
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === 'node_modules') continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) compte += fichiersDeTest(complet);
    else if (/\.test\.(ts|tsx|mjs|cjs)$/.test(entree.name)) compte++;
  }
  return compte;
}

/** Les paquets de `packages/`, dans l'ordre de la page, avec leur nombre de fichiers de test. */
export function paquets(): { dossier: string; libelle: string; fichiersDeTest: number }[] {
  const presents = dossiers('packages');
  const sansLibelle = presents.filter((nom) => !(nom in PAQUETS));
  const disparus = Object.keys(PAQUETS).filter((nom) => !presents.includes(nom));
  if (sansLibelle.length || disparus.length) {
    throw new Error(`Les paquets de packages/ ont changé. Sans libellé : ${sansLibelle.join(', ') || 'aucun'}. Libellé sans paquet : ${disparus.join(', ') || 'aucun'}.`);
  }
  return Object.entries(PAQUETS).map(([dossier, libelle]) => ({ dossier, libelle, fichiersDeTest: fichiersDeTest(path.join(RACINE, 'packages', dossier)) }));
}

/** Les points d'entrée du kit : leur nom, et les noms qu'ils exportent. */
export async function pointsDEntree(): Promise<{ entree: string; noms: string[] }[]> {
  const exportsDuKit = json('packages/kit/package.json').exports as Record<string, { default?: string }>;
  const entrees = Object.entries(exportsDuKit).filter(([, cible]) => typeof cible === 'object' && /.m?js$/.test(cible.default ?? ''));
  return Promise.all(entrees.map(async ([entree]) => ({ entree, noms: Object.keys(await import(`@ucm-kit/core/${entree.slice(2)}`)) })));
}

/** Le nombre de noms uniques que les points d'entrée exportent, et le total avec les doublons. */
export function nomsExportes(entrees: readonly { noms: readonly string[] }[]): { uniques: number; total: number } {
  return { uniques: new Set(entrees.flatMap(({ noms }) => noms)).size, total: entrees.reduce((somme, { noms }) => somme + noms.length, 0) };
}

function fichiersDeSource(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    if (entree.name === 'node_modules') return [];
    const complet = path.join(dossier, entree.name);
    return entree.isDirectory() ? fichiersDeSource(complet) : /\.(mjs|ts|js)$/.test(entree.name) ? [complet] : [];
  });
}

/** Le nombre de noms que la CLI et l'adaptateur importent de `@ucm-kit/core`, sans doublon. */
export function symbolesImportes(): number {
  const noms = new Set<string>();
  for (const dossier of ['packages/cli/src', 'packages/adapter-typescript/src']) {
    for (const fichier of fichiersDeSource(path.join(RACINE, dossier))) {
      const texte = readFileSync(fichier, 'utf8');
      for (const trouve of texte.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']@ucm-kit\/core\/[^"']+["']/g)) {
        for (const brut of trouve[1].split(',').map((nom) => nom.trim()).filter(Boolean)) {
          noms.add(brut.replace(/^type\s+/, '').split(/\s+as\s+/)[0]);
        }
      }
    }
  }
  return noms.size;
}

export const nombreDAides = (): number => liste('packages/cli/aides').filter((nom) => nom.endsWith('.md')).length;

/**
 * Les `COMMANDES` de la CLI : un retour à la ligne d'un rôle ou d'une note devient une espace. Le module de la CLI a un
 * `await` de tête (sa garde de lancement) : `require` le refuse, il ne se lit que par `import()`, d'où une lecture asynchrone.
 */
export async function commandes(): Promise<{ nom: string; role: string; note: string; options: string[] }[]> {
  const { COMMANDES } = await import('../../packages/cli/src/ucm.mjs');
  const phrase = (texte: string): string => texte.replace(/\s*\n\s*/g, ' ');
  return COMMANDES.map((commande) => ({
    nom: commande.nom,
    role: phrase(commande.role),
    note: 'note' in commande && commande.note ? phrase(commande.note as string) : '',
    options: commande.options.map((option) => option.nom),
  }));
}

// ---------- Le contrat du Button ----------

/** La taille du contrat de recette du Button, ses props et ses variants. */
export function contratDuButton() {
  const chemin = 'packages/kit/fixtures/contrats/13.0/Button.contract.json';
  const contrat = JSON.parse(lire(chemin));
  return {
    chemin,
    version: contrat.meta.contractVersion as string,
    octets: statSync(path.join(RACINE, chemin)).size,
    props: Object.keys(contrat.props).length,
    variants: contrat.variants.length,
  };
}

// ---------- Le rapport d'ucm check ----------

/** Les phrases du commentaire de pull request pour un `Button.tsx` sans prop `size`. */
export function rapportDuButton() {
  const bilan = {
    fichier: 'src/components/Button/Button.contract.json',
    parite: { interfaceAbsente: null, fonctionAbsente: null, manquantes: ['size'], typesIncorrects: [], valeursNonImplementees: [], booleensNonUtilises: [], enumsSansEffet: [], compositionsIncorrectes: [] },
  };
  const texte = sectionEcartsDeParite([bilan]).join('\n');
  const prendre = (motif: RegExp, nom: string): string => {
    const trouve = texte.match(motif);
    if (!trouve) throw new Error(`Le rapport de parité n'a plus la phrase « ${nom} » : ${texte}`);
    return trouve[1];
  };
  const dansLeCode = (fichier: string, motif: RegExp, nom: string): string => {
    const trouve = lire(fichier).match(motif);
    if (!trouve) throw new Error(`${fichier} n'écrit plus le titre « ${nom} »`);
    return trouve[1];
  };
  return {
    vert: dansLeCode('packages/kit/src/lecteurs/controle-repository.mjs', /`## \$\{[^}]+\} (Aucun blocage[^`]*)`/, 'Aucun blocage détecté'),
    rouge: dansLeCode('packages/kit/src/lecteurs/verdict-bilan.mjs', /`## \$\{[^}]+\} (Les contrôles du repository bloquent[^`]*)`/, 'Les contrôles du repository bloquent la fusion'),
    titre: prendre(/### [^ ]+ (.*)\n/, 'titre'),
    ecart: prendre(/\n- (La propriété `size`[^\n]*)/, 'écart'),
    action: prendre(/#### Action\n\n([^\n]*)/, 'action'),
    fin: prendre(/\n(\*\*Votre design n'est pas en cause\*\*[^\n]*)/, 'fin').replace(/\*\*/g, ''),
  };
}

// ---------- Le verdict de ucm check et le linter ----------

/** Les trois demandes que `verdictDeLaDemande` juge, dans l'ordre des colonnes du tableau. */
export const DEMANDES = ['code', 'contrats-et-tokens', 'tokens-seuls'] as const;

/** Les causes de blocage que `verdictDeLaDemande` nomme dans `bloquantPar`, en mots. */
const CAUSES_DE_BLOCAGE: Readonly<Record<string, string>> = {
  contrat: 'le contrat',
  tokens: '`tokens.json`',
  parite: 'la parité du code avec le contrat',
  code: 'le contrôle du code',
};

interface Scenario {
  bilan?: Record<string, unknown>;
  parite?: Record<string, unknown>;
  rangContrat: number | null;
  rangCode: number | null;
  rangTokens: number | null;
  adaptateurAttendu?: string;
  derogee?: boolean;
}

/**
 * Un composant dans chaque état, tel que le juge `verdictDeLaDemande`. Rang 0 : le fichier que la demande modifie ; un rang
 * plus grand est plus ancien. Le scénario est fixe, la demande change seulement ce qu'elle juge : le verdict d'une cellule
 * est donc celui du kit, et un scénario qui ne produit plus son état fait échouer la lecture.
 */
const SCENARIOS: Readonly<Record<string, Scenario>> = {
  'contrat-invalide': { bilan: { illisible: true }, rangContrat: 0, rangCode: 3, rangTokens: 9 },
  'tokens-absents': { bilan: { manquants: ['color/absent'] }, rangContrat: 0, rangCode: 0, rangTokens: 9 },
  ecart: { parite: { manquantes: ['size'] }, rangContrat: 3, rangCode: 0, rangTokens: 9 },
  'code-non-verifie': { parite: { implementationNonLue: 'Button.tsx' }, rangContrat: 3, rangCode: 0, rangTokens: 9, adaptateurAttendu: 'absent' },
  'en-retard-sur-son-contrat': { parite: { manquantes: ['size'] }, rangContrat: 0, rangCode: 3, rangTokens: 9 },
  'en-retard-sur-les-tokens': { bilan: { manquants: ['color/absent'] }, rangContrat: 3, rangCode: 3, rangTokens: 0 },
  'deroge-a-valider': { parite: { manquantes: ['size'] }, rangContrat: 3, rangCode: 0, rangTokens: 9, derogee: true },
  'pas-encore-d-implementation': { parite: { implementationAbsente: true }, rangContrat: 3, rangCode: null, rangTokens: 9 },
  conforme: { rangContrat: 3, rangCode: 0, rangTokens: 9 },
};

/** La date d'export que partagent le contrat fabriqué et sa dérogation. */
const EXPORT_FABRIQUE = '2026-01-01T00:00:00.000Z';

function verdictDuScenario(etat: string, demande: (typeof DEMANDES)[number]) {
  const scenario = SCENARIOS[etat];
  if (!scenario) throw new Error(`releves.ts : ETATS_DE_COMPOSANT a l'état « ${etat} », sans scénario dans SCENARIOS`);
  const bilan = {
    illisible: false,
    champsAbsents: [],
    version: null,
    graphe: [],
    manquants: [],
    typesTypographiques: [],
    ...scenario.bilan,
    parite: {
      implementationAbsente: false,
      implementationNonLue: null,
      interfaceAbsente: null,
      fonctionAbsente: null,
      manquantes: [],
      typesIncorrects: [],
      valeursNonImplementees: [],
      booleensNonUtilises: [],
      enumsSansEffet: [],
      compositionsIncorrectes: [],
      ...scenario.parite,
    },
  };
  const derogations = scenario.derogee
    ? { derogations: [{ composant: 'Button', ecart: { genre: 'prop-absente', prop: 'size' }, export: EXPORT_FABRIQUE, motif: 'Motif fabriqué pour le calcul.', par: 'inventaire' }], erreurs: [] }
    : { derogations: [], erreurs: [] };
  const verdict = verdictDeLaDemande({
    demande,
    composants: [{ id: 'Button', bilan, exportedAt: EXPORT_FABRIQUE, rangContrat: scenario.rangContrat, rangCode: scenario.rangCode }],
    rangTokens: scenario.rangTokens,
    derogations,
    adaptateurAttendu: scenario.adaptateurAttendu ?? 'sans-adaptateur',
  } as never) as { composants: { etat: string; bloquant: boolean; bloquantPar: Record<string, boolean> }[] };
  const composant = verdict.composants[0];
  if (composant.etat !== etat) throw new Error(`releves.ts : le scénario de « ${etat} » donne l'état « ${composant.etat} » sous la demande ${demande}`);
  return composant;
}

/** Une ligne par état de composant : sa phrase, sa raison, le verdict de chaque demande et ce qui décide du blocage. */
export function etatsDeComposant(): { etat: string; phrase: string; raison: string; verdicts: boolean[]; autorite: string[] }[] {
  return (ETATS_DE_COMPOSANT as readonly string[]).map((etat) => {
    const textes = (TEXTES_DES_ETATS as Record<string, { phrase: string; raison: string }>)[etat];
    if (!textes) throw new Error(`releves.ts : TEXTES_DES_ETATS n'a pas l'état « ${etat} »`);
    const verdicts = DEMANDES.map((demande) => verdictDuScenario(etat, demande));
    const causes = Object.keys(CAUSES_DE_BLOCAGE).filter((cause) => verdicts.some((verdict) => verdict.bloquantPar[cause]));
    return { etat, phrase: textes.phrase, raison: textes.raison, verdicts: verdicts.map((verdict) => verdict.bloquant), autorite: causes.map((cause) => CAUSES_DE_BLOCAGE[cause]) };
  });
}

/** La phrase d'un état de composant, telle que le terminal l'écrit. */
export function phraseDeLEtat(etat: string): string {
  const textes = (TEXTES_DES_ETATS as Record<string, { phrase: string }>)[etat];
  if (!textes) throw new Error(`releves.ts : TEXTES_DES_ETATS n'a pas l'état « ${etat} »`);
  return textes.phrase;
}

const NIVEAUX_DU_LINTER: Readonly<Record<string, string>> = { ecart: 'écart', limite: 'limite', 'non-analyse': 'non analysé' };

/** Les listes que le linter applique, lues dans `controle-du-code-listes.mjs`, avec la raison de chaque entrée. */
export function controleDuCode() {
  const niveau = (code: string, valeur: string): string => {
    const mot = NIVEAUX_DU_LINTER[valeur];
    if (!mot) throw new Error(`releves.ts : le code « ${code} » a le niveau « ${valeur} », que NIVEAUX_DU_LINTER ne nomme pas`);
    return mot;
  };
  const listes: { titre: string; raison: string; valeurs: readonly string[] }[] = [
    { titre: 'Unités de longueur', raison: RAISON_UNITES_DE_LONGUEUR, valeurs: UNITES_DE_LONGUEUR },
    { titre: 'Fonctions de couleur', raison: RAISON_FONCTIONS_DE_COULEUR, valeurs: FONCTIONS_DE_COULEUR },
    { titre: 'Fonctions mathématiques', raison: RAISON_FONCTIONS_MATHEMATIQUES, valeurs: FONCTIONS_MATHEMATIQUES },
    { titre: 'Noms de couleur', raison: RAISON_NOMS_DE_COULEUR, valeurs: NOMS_DE_COULEUR },
    { titre: 'Mots de forme', raison: RAISON_MOTS_CLES_DE_FORME, valeurs: MOTS_CLES_DE_FORME },
    { titre: 'Attributs sans valeur visuelle', raison: RAISON_ATTRIBUTS_SANS_VALEUR_VISUELLE, valeurs: ATTRIBUTS_SANS_VALEUR_VISUELLE },
  ];
  return {
    codes: (CODES_DU_CONTROLE_DU_CODE as { code: string; regles: string[]; niveau: string; raison: string }[]).map((entree) => ({
      code: entree.code,
      regles: entree.regles,
      niveau: niveau(entree.code, entree.niveau),
      raison: entree.raison,
      derogeable: coordonneesDuGenre(entree.code) as string[] | null,
    })),
    limites: LIMITES_DU_CONTROLE as { code: string; raison: string }[],
    familles: FAMILLES as { famille: string; raison: string }[],
    proprietes: PROPRIETES_PAR_FAMILLE as { propriete: string; familles: string[]; raison: string }[],
    neutres: VALEURS_NEUTRES as { valeur: string; raison: string }[],
    listes,
    champsPublies: CHAMPS_A_VALEUR_PUBLIEE as { champ: string; famille: string; raison: string }[],
    champsHorsFamille: CHAMPS_HORS_FAMILLE as { champ: string; raison: string }[],
  };
}

// ---------- Les annexes ----------

/** Les signes et leurs familles, avec le dessin de chacun, puis les formes d'alerte. */
export function signesEtAlertes() {
  const origine = (id: string): string => {
    const signe = SIGNES.find((candidat) => candidat.id === id);
    const famille = FAMILLES_DE_SIGNES.find((candidat) => candidat.id === signe?.famille);
    if (!famille) throw new Error(`Signe repris sans famille : ${id}`);
    return famille.libelle;
  };
  const familles = FAMILLES_DE_SIGNES.map((famille) => ({
    id: famille.id,
    libelle: famille.libelle,
    signes: SIGNES.filter((signe) => signe.famille === famille.id).map((signe) => ({ id: signe.id, libelle: signe.libelle, svg: svgDuSigne(signe.id, 24) })),
    reprises: REPRISES_DE_SIGNES.filter((reprise) => reprise.famille === famille.id).flatMap((reprise) =>
      reprise.reprend.map((repris) => ({ id: repris.id, origine: origine(repris.id) })),
    ),
  }));
  const alertes = TYPES_D_ALERTE.map((type) => ({ id: type.id, libelle: type.libelle, svg: svgDeLAlerte(type.id, 24) }));
  return { familles, alertes };
}

/** Les signaux du langage visuel des plugins : identifiant, famille, libellé et sens, tels que le kit les définit. */
export function signauxDuLangage() {
  return SIGNAUX_DU_LANGAGE.map((signal) => ({ id: signal.id, famille: signal.famille, libelle: signal.libelle, sens: signal.sens }));
}

/** Les icônes que le contrat de recette Button 13.0 liste dans `icons` : le seul exemple réel d'un contrat qui en emploie. */
export function iconesDuContratDeRecette() {
  const chemin = 'packages/kit/fixtures/contrats/13.0/Button.contract.json';
  const contrat = json(chemin) as { icons?: Record<string, { policy: string; figmaName: string; slot: string; visibilityProp?: string }> };
  if (!contrat.icons || !Object.keys(contrat.icons).length) throw new Error(`${chemin} n'a plus de bloc icons`);
  return {
    chemin,
    version: path.basename(path.dirname(chemin)),
    icones: Object.entries(contrat.icons).map(([cle, icone]) => ({ cle, politique: icone.policy, nom: icone.figmaName, emplacement: icone.slot, propriete: icone.visibilityProp ?? null })),
  };
}

/**
 * Un SVG de `docs/marque/` sans taille fixe, ses identifiants préfixés : une même image posée deux fois dans la page garde des
 * identifiants uniques. Un logo décoratif perd son `<title>`, car le nom du produit s'écrit à côté.
 */
function svgDeMarque(chemin: string, prefixe: string, decoratif: boolean): { titre: string; svg: string } {
  let svg = lire(chemin).trim();
  const titre = svg.match(/<title>([^<]*)<\/title>/)?.[1];
  if (titre === undefined) throw new Error(`${chemin} n'a pas de <title>`);
  const nom = decoratif ? '' : ` role="img" aria-label="${titre}"`;
  svg = svg.replace(/^<svg ([^>]*)>/, (_tout, attributs: string) => `<svg ${attributs.replace(/\s(width|height)="[^"]*"/g, '')}${nom}>`);
  if (decoratif) svg = svg.replace(/<title>[^<]*<\/title>/, '');
  for (const id of new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((trouve) => trouve[1]))) {
    svg = svg.split(`id="${id}"`).join(`id="${prefixe}${id}"`).split(`url(#${id})`).join(`url(#${prefixe}${id})`);
  }
  return { titre, svg };
}

/** Les logos et les cartes de `docs/marque/`, en SVG, avec des identifiants préfixés pour qu'aucun ne collisionne. */
export function marque() {
  const script = 'docs/marque/generer-marque.mjs';
  lire(script);
  const fichiers: { nature: 'logo' | 'carte'; titre: string; svg: string }[] = [];
  for (const [dossier, nature] of [['logos', 'logo'], ['cartes', 'carte']] as const) {
    for (const fichier of liste(`docs/marque/${dossier}`).filter((nom) => nom.endsWith('.svg')).sort()) {
      fichiers.push({ nature, ...svgDeMarque(`docs/marque/${dossier}/${fichier}`, `m-${nature}-${fichier.replace('.svg', '')}-`, false) });
    }
  }
  return { script, fichiers };
}

/**
 * Le logo de chaque carte d'outil de la partie 2. La CLI et l'adaptateur n'ont pas de logo propre : ils sont des paquets
 * `@ucm-kit` d'UCM Toolkit et prennent son logo, avec le signe du kit qui nomme leur geste (la demande de fusion que la CLI
 * contrôle, la property de variant que l'adaptateur compare).
 */
export function logosDesOutils() {
  const outils: { outil: string; fichier: string; signe?: string }[] = [
    { outil: 'palettes', fichier: 'ucm-palettes' },
    { outil: 'architect', fichier: 'ucm-token-explorer' },
    { outil: 'exporter', fichier: 'ucm-contract-exporter' },
    { outil: 'cli', fichier: 'ucm-toolkit', signe: 'fusion' },
    { outil: 'adaptateur', fichier: 'ucm-toolkit', signe: 'prop-variant' },
  ];
  return outils.map(({ outil, fichier, signe }) => ({
    outil,
    svg: svgDeMarque(`docs/marque/logos/${fichier}.svg`, `m-outil-${outil}-`, true).svg,
    signe: signe === undefined ? null : svgDuSigne(signe, 12),
  }));
}

/** Les design systems de `docs/references/` : rôles, fiches de composants, guides. */
export function references() {
  const systemes = json('docs/references/systemes.json') as { id: string; nom: string; roles: string[] }[];
  const composants = dossiers('docs/references/composants');
  const fiches: Record<string, string[]> = {};
  for (const composant of composants) {
    for (const fichier of liste(`docs/references/composants/${composant}`)) {
      const trouve = fichier.match(/^(.+)\.json$/);
      if (trouve && trouve[1] !== 'tokens') (fiches[trouve[1]] ??= []).push(composant);
    }
  }
  const tableDesRoles = lire('docs/references/README.md').split('| Rôle | Apport |')[1]?.split('\n\n')[0];
  if (tableDesRoles === undefined) throw new Error('docs/references/README.md n\'a plus la table « Rôle | Apport »');
  const roles = Object.fromEntries(
    tableDesRoles.split('\n').filter((ligne) => /^\| `/.test(ligne)).map((ligne) => {
      const [, role, apport] = ligne.split('|').map((cellule) => cellule.trim());
      return [role.replace(/`/g, ''), apport.replace(/`/g, '')];
    }),
  );
  const analyses = liste('docs/references/analyses').filter((nom) => nom.endsWith('.json')).map((nom) => nom.replace('.json', ''));
  const description = lire('.agents/skills/guide-composant/SKILL.md').match(/^description: "(.*)"$/m)?.[1];
  if (description === undefined) throw new Error('.agents/skills/guide-composant/SKILL.md n\'a plus de champ description');
  return {
    systemes: systemes.map((systeme) => ({ nom: systeme.nom, roles: systeme.roles, composants: fiches[systeme.id] ?? [] })),
    roles,
    analyses,
    skillGuide: `${description.split('. ')[0]}.`,
  };
}

function enTete(texte: string): Record<string, string> {
  const bloc = texte.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const champs: Record<string, string> = {};
  let cle: string | null = null;
  for (const ligne of bloc.split('\n')) {
    const paire = ligne.match(/^([a-z]+):\s*(.*)$/);
    if (paire) {
      cle = paire[1];
      champs[cle] = paire[2].replace(/^"(.*)"$/, '$1');
    } else if (cle) champs[cle] += ` ${ligne.trim()}`;
  }
  // Le front matter de rediger-diagnostics-ucm écrit « name » et « description » sur une seule ligne.
  if (champs.name && / description: /.test(champs.name)) {
    const [nom, ...reste] = champs.name.split(' description: ');
    champs.name = nom;
    champs.description = reste.join(' description: ');
  }
  return champs;
}

const premierePhrase = (texte: string): string => (texte.match(/^.*?[.!?](?=\s|$)/) ?? [texte])[0];

/** Une phrase par script npm de la racine, et le document ou le commentaire dont elle vient. */
const PHRASES_DES_SCRIPTS: Readonly<Record<string, readonly [string, string]>> = {
  typecheck: ['Vérifie les types de chaque paquet, puis ceux des tests et des scripts de la racine.', 'package.json ; AGENTS.md, « Vérification »'],
  test: ['Construit le kit, lance les tests de chaque paquet, puis les tests de la racine.', 'package.json ; AGENTS.md, « Vérification »'],
  build: ['Construit le kit puis les trois plugins Exporter, Palettes et Architect.', 'package.json ; AGENTS.md, « Vérification »'],
  schema: ['Régénère le schéma JSON du contrat, dérivé de `packages/kit/src/format/types.ts`.', 'AGENTS.md, « Vérification »'],
  pins: ['Contrôle que le registre npm sert les versions épinglées que la documentation montre.', 'scripts/pins-servis.mjs, commentaire d’en-tête'],
  cascade: ['Charge la feuille des tokens dans Chromium, Firefox et WebKit, hors de `npm test`.', 'AGENTS.md, « Vérification »'],
  start: ['Lance `npm run build`.', 'package.json'],
  'build:plugin': ['Construit le kit puis le plugin nommé (palettes, architect ou exporter).', 'AGENTS.md, « Vérification » ; scripts/construire-plugin.mjs'],
  'galerie:plugin': ['Construit le kit puis ouvre la galerie des états du plugin nommé.', 'AGENTS.md, « Vérification » ; scripts/construire-plugin.mjs'],
  'test:paquet': ['Construit le kit puis teste le paquet nommé.', 'AGENTS.md, « Vérification » ; scripts/construire-plugin.mjs'],
  'stress:f1': ['Lance le harnais de stress test des noms de Nomenclature, hors de `npm test`.', 'packages/kit/tests/stress/f1-noms/index.ts, commentaire d’en-tête'],
  'stress:rejeu': ['Rejoue des fichiers réels dans le mode Tokens et mesure les contrôles, hors de `npm test`.', 'packages/kit/tests/stress/rejeu-fichiers/index.ts, commentaire d’en-tête'],
  vues: ['Régénère le hub, la planche du moteur, les données de la vue illustrée et cet inventaire, et rend la liste de celles qui ont changé.', 'AGENTS.md, « Vérification » ; scripts/vues.mjs'],
  inventaire: ['Ouvre la page de l’inventaire dans le navigateur par défaut.', 'scripts/ouvrir-inventaire.mjs, commentaire d’en-tête'],
  'agents:lire': ['Rend les fichiers à lire avant de modifier des chemins donnés, et seulement eux.', 'AGENTS.md, « Avant de modifier »'],
  'agents:domicile': ['Rend le domicile d’un fichier de `packages/*/src/`.', 'AGENTS.md, « Routage »'],
  'agents:diff': ['Rend les domiciles et documents à relire, les vérifications à lancer et les documents qui citent un chemin supprimé ou renommé.', 'AGENTS.md, « Vérification »'],
  sujet: ['Crée le dossier de recherche d’une piste, l’inscrit au registre et au sommaire, et renseigne sa recherche.', 'CONTRIBUTING.md, « Sujets de recherche et plans »'],
  'sujet:archiver': ['Calcule, pour une piste livrée, les documents de son dossier à garder, à relire ou à supprimer.', 'skill archiver-un-sujet'],
};

/** Le déclencheur, les branches et les commandes de chaque job des workflows, lus ligne à ligne. */
function jobsDuFichier(fichier: string) {
  const texte = lire(`.github/workflows/${fichier}`);
  const surBloc = texte.split(/^on:\n/m)[1]?.split(/^\S/m)[0] ?? '';
  const declencheurs = [...surBloc.matchAll(/^ {2}(\w+):/gm)].map((trouve) => trouve[1]);
  const branches = surBloc.match(/branches:\s*\[(.*?)\]/)?.[1] ?? null;
  const corps = texte.split(/^jobs:\n/m)[1] ?? '';
  const parties = corps.split(/^ {2}(?=\w[\w-]*:\n)/m).filter((partie) => /^\w[\w-]*:\n/.test(partie));
  return parties.map((partie) => {
    const id = partie.match(/^(\w[\w-]*):/)![1];
    const commandesDuJob = [...partie.matchAll(/^\s+(?:- )?run: (.+)$/gm)].map((trouve) => trouve[1].trim()).filter((commande) => commande !== '|');
    const lances = commandesDuJob.filter((commande) => !/^npm install -g|^npm ci$|^npx playwright install|^npm -v/.test(commande));
    return { fichier, id, declencheurs, branches, lances };
  });
}

/** Les skills, les agents, les scripts npm et les jobs des workflows du dépôt. */
export function outillage() {
  const skills = liste('.agents/skills')
    .filter((nom) => existsSync(path.join(RACINE, '.agents/skills', nom, 'SKILL.md')))
    .sort()
    .map((nom) => {
      const champs = enTete(lire(`.agents/skills/${nom}/SKILL.md`));
      return { nom: champs.name, description: premierePhrase(champs.description) };
    });
  const agents = liste('.claude/agents')
    .filter((nom) => nom.endsWith('.md'))
    .sort()
    .map((nom) => {
      const champs = enTete(lire(`.claude/agents/${nom}`));
      return { nom: champs.name, modele: champs.model, description: premierePhrase(champs.description) };
    });
  const noms = Object.keys(json('package.json').scripts);
  const sansPhrase = noms.filter((nom) => !(nom in PHRASES_DES_SCRIPTS));
  const sansScript = Object.keys(PHRASES_DES_SCRIPTS).filter((nom) => !noms.includes(nom));
  if (sansPhrase.length || sansScript.length) {
    throw new Error(`PHRASES_DES_SCRIPTS ne suit pas package.json. Sans phrase : ${sansPhrase.join(', ') || 'aucun'}. Phrase sans script : ${sansScript.join(', ') || 'aucun'}.`);
  }
  const scripts = noms.map((nom) => ({ nom, phrase: PHRASES_DES_SCRIPTS[nom][0], source: PHRASES_DES_SCRIPTS[nom][1] }));
  const jobs = liste('.github/workflows').filter((nom) => nom.endsWith('.yml')).sort().flatMap(jobsDuFichier);
  return { skills, agents, scripts, jobs };
}

// ---------- Les registres ----------

/** Le registre des familles de chaque collection qui en a un, dans l'ordre des collections de la page. */
const REGISTRES_DE_FAMILLES = [
  ['brands', FAMILLES_BRANDS],
  ['utility', FAMILLES_UTILITY],
  ['primitives', FAMILLES_PRIMITIVES],
  ['layout', FAMILLES_LAYOUT],
  ['typography', FAMILLES_TYPOGRAPHY],
  ['components', FAMILLES_COMPOSANT],
] as const;

/** Les familles de chaque collection ; une collection nouvelle sans registre fait échouer la lecture. */
export function famillesParCollection(): { collection: string; familles: string[] }[] {
  const presentes = REGISTRES_DE_FAMILLES.map(([collection]) => collection) as readonly string[];
  const sansRegistre = COLLECTIONS.filter((nom) => nom !== 'theme' && !presentes.includes(nom));
  if (sansRegistre.length) throw new Error(`Collection sans registre de familles dans releves.ts : ${sansRegistre.join(', ')}`);
  return REGISTRES_DE_FAMILLES.map(([collection, registre]) => ({ collection, familles: termes(registre) }));
}

/** Le nombre de tailles du registre, la plus petite et la plus grande. */
export function registreDesTailles(): { nombre: number; premiere: string; derniere: string } {
  const ids = termes(REGISTRE_TAILLES);
  return { nombre: ids.length, premiere: ids[0], derniere: ids[ids.length - 1] };
}

export const nombreDeProprietesDeComposant = (): number => REGISTRE_PROPRIETES_COMPOSANT.termes.length;

// ---------- Les documents du projet ----------

/** Le nombre de contrats de recette, et la version de contrat du dernier dossier de fixtures. */
export function contratsDeRecette(): { version: string; nombre: number } {
  const versions = dossiers('packages/kit/fixtures/contrats').sort((a, b) => parseFloat(a) - parseFloat(b));
  const version = versions[versions.length - 1];
  return { version, nombre: liste(`packages/kit/fixtures/contrats/${version}`).filter((nom) => nom.endsWith('.contract.json')).length };
}

/**
 * Ce que l'inventaire tire des documents de cadrage. Le nombre de classes de compatibilité se compte dans la table de
 * `COMPATIBILITE.md`. Les trois autres lectures ne rendent rien : elles lèvent « ancre X absente de Y » quand `CHANGELOG-FORMAT.md`,
 * `CONCEPT.md`, `VALIDATIONS-MVP.md` ou le sommaire des recherches renomme une section que la page présente.
 * Les textes qui résument ces documents (sens de chaque version du contrat, invariants, limites non prouvées, statut du hub)
 * restent dans le gabarit : leurs sections ne se citent pas telles quelles.
 */
export function extraitsDesDocuments(donnees: Versions): { classesDeCompatibilite: number } {
  const classes = tableauDe(lire('docs/format/COMPATIBILITE.md'), 'docs/format/COMPATIBILITE.md', 'Les douze classes de changement');
  const changelog = lire('docs/format/CHANGELOG-FORMAT.md');
  for (const version of [donnees.contratMinimal, donnees.contrat]) sectionDe(changelog, 'docs/format/CHANGELOG-FORMAT.md', version);
  const concept = sectionDe(lire('CONCEPT.md'), 'CONCEPT.md', '6. Ce que le modèle cherche à prouver');
  for (const promesse of ['Robustesse', 'Confiance']) {
    if (!concept.includes(promesse)) throw new Error(`CONCEPT.md, § 6 : la promesse « ${promesse} » a disparu`);
  }
  if (tableauDe(lire('VALIDATIONS-MVP.md'), 'VALIDATIONS-MVP.md', 'Ce qui n\'est pas prouvé').length === 0) throw new Error('VALIDATIONS-MVP.md : « Ce qui n\'est pas prouvé » n\'a plus de tableau');
  const sujets = tableauDe(lire('docs/notes/Recherches/README.md'), 'docs/notes/Recherches/README.md', 'Sujets');
  if (!sujets.some((ligne) => ligne.Sujet.startsWith('[Hub UCM]'))) throw new Error('docs/notes/Recherches/README.md : le sujet « Hub UCM » a disparu du sommaire');
  return { classesDeCompatibilite: classes.length };
}

// ---------- Les nombres du moteur de couleur et d'Architect ----------

const enFrancais = (nombre: number): string => String(nombre).replace('.', ',');

/** Les réglages de la recette par défaut que la page cite : parts de saturation des profils, seuils d'alerte, nuances possibles. */
export function reglagesDePalettes() {
  const recette = recetteParDefaut();
  return {
    partSoft: `${Math.round(recette.profils.soft.part * 100)} %`,
    partVivid: `${Math.round(recette.profils.vivid.part * 100)} %`,
    seuilConfondues: enFrancais(recette.seuils.profilsConfondus),
    seuilProches: enFrancais(recette.seuils.palettesProches),
    nuances: Object.keys(PREREGLAGES).join(' ou '),
  };
}

/** Les sections de la vue Composant d'Architect : leur nombre et leurs libellés. */
export function sectionsDuComposant(): { nombre: number; liste: string } {
  const libelles = Object.values(TEXTES_ELEMENTS.elementsDuPanneau.libelles) as string[];
  return { nombre: libelles.length, liste: libelles.join(', ') };
}

// ---------- Les pistes et les décisions du dépôt ----------

export const CHEMIN_DES_PISTES = 'docs/notes/Recherches/Evolutions globales/pistes.json';
export const CHEMIN_DES_DECISIONS = 'docs/notes/Recherches/Evolutions globales/decisions.json';
/** Le début d'un lien vers un fichier du dépôt ; le commit ou `main` et le chemin encodé le suivent. */
export const DEPOT_SUR_GITHUB = 'https://github.com/Vassili-g/UCM-Toolkit/blob';
const SECTION_DES_QUESTIONS = 'Questions au mainteneur';

/** Une piste telle que `pistes.json` l'écrit : le jugement seul, l'état et l'avancement se calculent depuis les plans. */
export interface PisteEcrite {
  id: string;
  titre: string;
  titreCourt: string;
  sujet: string;
  resume: string;
  importance: string;
  raisonImportance: string;
  complexite: string;
  coutHumain: string;
  /** La prio de l'agent, de 0 (d'abord) à 5. */
  prio: number;
  /** La prio que le mainteneur a posée : elle prime sur `prio`. */
  prioDuMainteneur?: { prio: number; raison: string };
  /** Une piste que le mainteneur écarte, avec sa raison. */
  ecartee?: { raison: string };
  /** Le commit où le plan de la piste archivée existait encore. */
  archive?: string;
  recherche?: string;
  plan?: string;
  dependances: string[];
  points: { chemin: string; action: string; quoi: string }[];
  criteresDeFin?: string[];
  risques?: string[];
  /** Les questions d'une piste sans recherche ; une piste qui a une recherche les porte dans sa section « Questions au mainteneur ». */
  questions?: string[];
  [champ: string]: unknown;
}

export interface Regle {
  id: string;
  genre: 'carte' | 'liste' | 'tableau' | 'transverse';
  pour?: string;
  titre?: string;
  texte: string;
  options?: { valeur: string; libelle: string }[];
  domicileCible: string;
  ecrite: 'non' | 'partiel' | 'oui';
  pistes: string[];
}

export interface Decisions {
  version: 1;
  regles: Regle[];
}

/** Un lot de plan tel que la page le montre. `hash` est vide tant que le lot n'en cite aucun ; `depot@hash` pour un autre dépôt. */
export interface LotAffiche {
  groupe: string;
  numero: string;
  fait: boolean;
  marque: 'mainteneur' | `attend P${number}` | '';
  suivant: boolean;
  texte: string;
  hash: string;
}

export interface Attente {
  /** `toi` attend le mainteneur, `piste` attend une autre piste. */
  genre: 'toi' | 'piste';
  texte: string;
  detail: string;
}

export interface Transverse {
  id: string;
  titre: string;
  texte: string;
  pistes: string[];
}

/** Une piste à suivre, telle que la page la montre. */
export interface Piste {
  id: string;
  titre: string;
  titreCourt: string;
  sujet: string;
  /** La prio affichée : celle du mainteneur si elle existe, sinon celle de l'agent. */
  prio: number;
  prioDeLAgent: number;
  prioPosee: { raison: string } | null;
  importance: string;
  complexite: string;
  coutHumain: string;
  resume: string;
  raisonImportance: string;
  risques: string[];
  criteresDeFin: string[];
  /** Les pistes à suivre dont celle-ci attend la livraison. */
  dependances: string[];
  debloque: string[];
  recherche: string | null;
  plan: string | null;
  etat: 'idee' | 'recherche' | 'en-cours';
  avancement: { faits: number; total: number } | null;
  lots: LotAffiche[] | null;
  attentes: Attente[];
  questions: string[];
  transverses: Transverse[];
  /** La date (AAAA-MM-JJ) du commit le plus récent cité par un lot fait. */
  dernierLot: string | null;
}

/** Une piste livrée, archivée ou écartée. */
export interface Terminee {
  id: string;
  titreCourt: string;
  date: string | null;
  lien: string | null;
  ecartee: string | null;
}

/** Les sujets d'une piste et leur couleur (texte sur fond, contraste d'au moins 4,5:1). Seul endroit qui les liste. */
export const SUJETS: Record<string, { texte: string; fond: string }> = {
  'Règle de blocage': { texte: '#86198f', fond: '#fae8ff' },
  'Vérification du rendu': { texte: '#155e75', fond: '#cffafe' },
  'API du kit': { texte: '#3730a3', fond: '#e0e7ff' },
  'Modules consommateurs': { texte: '#115e59', fond: '#ccfbf1' },
  'Bibliothèque de production': { texte: '#78350f', fond: '#f0e0cc' },
  'Architecture des tokens': { texte: '#5b21b6', fond: '#ede9fe' },
  'Format du contrat': { texte: '#065f46', fond: '#a7f3d0' },
  Documentation: { texte: '#3f6212', fond: '#d9f99d' },
  'Outils de revue': { texte: '#075985', fond: '#bae6fd' },
};

const AVEC_ECHEC = (fichier: string, ou: string, message: string): never => {
  throw new Error(`${fichier}, ${ou} : ${message}`);
};

/** Un chemin du dépôt à contrôler : ni un réglage GitHub, ni un chemin d'un autre dépôt, ni un motif. */
function cheminDuDepot(chemin: string): boolean {
  if (chemin.startsWith('../') || /[*,;:()`]/.test(chemin)) return false;
  return /^[\w.@ -]+(\/[\w.@ -]+)*(\.[a-z]+|\/)$/i.test(chemin);
}

/** La sortie d'une commande Git lancée dans `racine`, ou `null` si elle échoue. */
function git(racine: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

const dateDuCommitDans = (racine: string, hash: string): string | null => git(racine, ['show', '-s', '--format=%cs', hash])?.trim() || null;

/** Les champs que `pistes.json` ne porte plus : chacun a son remplaçant. */
const CHAMPS_RETIRES: Readonly<Record<string, string>> = {
  etat: "retiré, l'état se calcule depuis la recherche et le plan",
  alertes: 'retiré, une attente du mainteneur est une case « (mainteneur) » du plan',
  rang: 'renommé prio',
};

const estUnePrio = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 0 && valeur <= 5;
const estUnTexte = (valeur: unknown): boolean => typeof valeur === 'string' && valeur.trim() !== '';

/** Les champs d'une piste, hors de ses liens avec les autres : retire, borne et exige selon la règle de chaque champ. */
function validerUnePiste(piste: PisteEcrite, racine: string): void {
  const ou = (champ: string): string => `piste ${piste.id}, champ ${champ}`;
  for (const [champ, remplacant] of Object.entries(CHAMPS_RETIRES)) {
    if (champ in piste) AVEC_ECHEC(CHEMIN_DES_PISTES, ou(champ), remplacant);
  }
  if (typeof piste.sujet !== 'string' || piste.sujet === '') AVEC_ECHEC(CHEMIN_DES_PISTES, ou('sujet'), 'obligatoire');
  if (!(piste.sujet in SUJETS)) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('sujet'), `« ${piste.sujet} » n'est pas dans SUJETS de releves.ts`);
  if (!estUnePrio(piste.prio)) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('prio'), 'doit être un entier de 0 à 5');
  if (piste.prioDuMainteneur !== undefined) {
    if (!estUnTexte(piste.prioDuMainteneur?.raison)) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('prioDuMainteneur.raison'), 'obligatoire, non vide');
    if (!estUnePrio(piste.prioDuMainteneur.prio)) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('prioDuMainteneur.prio'), 'doit être un entier de 0 à 5');
  }
  if (piste.ecartee !== undefined && !estUnTexte(piste.ecartee?.raison)) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('ecartee.raison'), 'obligatoire, non vide');
  if (piste.recherche !== undefined && piste.questions !== undefined) {
    AVEC_ECHEC(CHEMIN_DES_PISTES, ou('questions'), `retiré à côté d'une recherche : les questions se lisent dans la section « ${SECTION_DES_QUESTIONS} » de ${piste.recherche}`);
  }
  if (piste.archive !== undefined) {
    if (!estUnTexte(piste.archive) || piste.plan === undefined) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('archive'), 'un commit, et la piste garde son champ plan');
    if (git(racine, ['cat-file', '-e', `${piste.archive}:${piste.plan}`]) === null) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('archive'), `${piste.plan} n'existe pas au commit ${piste.archive}`);
    return;
  }
  if (piste.recherche !== undefined && !existsSync(path.join(racine, piste.recherche))) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('recherche'), `${piste.recherche} n'existe pas dans le dépôt`);
  if (piste.plan !== undefined && !existsSync(path.join(racine, piste.plan))) AVEC_ECHEC(CHEMIN_DES_PISTES, ou('plan'), `${piste.plan} n'existe pas dans le dépôt`);
}

/**
 * Les pistes que `pistes.json` écrit, validées : identifiants uniques, champs retirés refusés, prios bornées, dépendances connues, chemins existants,
 * aucun cycle. Une piste archivée n'a plus ses documents dans l'arbre : son plan se contrôle au commit d'archive, et ses chemins ne sont pas vérifiés.
 */
export function pistes(racine: string = RACINE): PisteEcrite[] {
  const contenu = JSON.parse(readFileSync(path.join(racine, CHEMIN_DES_PISTES), 'utf8')) as { version: number; pistes: PisteEcrite[] };
  if (contenu.version !== 1) AVEC_ECHEC(CHEMIN_DES_PISTES, 'champ version', `la version ${contenu.version} n'est pas lue`);
  const ids = new Set<string>();
  for (const piste of contenu.pistes) {
    if (ids.has(piste.id)) AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${piste.id}, champ id`, 'identifiant déjà pris');
    ids.add(piste.id);
  }
  for (const piste of contenu.pistes) validerUnePiste(piste, racine);
  const crees = new Set(contenu.pistes.flatMap((piste) => piste.points.filter((point) => point.action === 'créer').map((point) => point.chemin)));
  for (const piste of contenu.pistes) {
    for (const dependance of piste.dependances) {
      if (!ids.has(dependance)) AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${piste.id}, champ dependances`, `${dependance} n'existe pas`);
    }
    if (piste.archive !== undefined) continue;
    piste.points.forEach((point, rang) => {
      if (point.action === 'créer' || crees.has(point.chemin)) return;
      // « a/b.ts et c.js » nomme deux fichiers : le second, sans dossier, est celui du premier.
      const [premier, ...autres] = point.chemin.split(' et ');
      const dossierDuPremier = premier.includes('/') ? premier.slice(0, premier.lastIndexOf('/') + 1) : '';
      for (const chemin of [premier, ...autres.map((autre) => (autre.includes('/') ? autre : dossierDuPremier + autre))]) {
        if (cheminDuDepot(chemin) && !existsSync(path.join(racine, chemin))) {
          AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${piste.id}, champ points[${rang}].chemin`, `${chemin} n'existe pas dans le dépôt`);
        }
      }
    });
  }
  const parId = new Map(contenu.pistes.map((piste) => [piste.id, piste]));
  const etat = new Map<string, 'en cours' | 'fini'>();
  const visiter = (id: string, trajet: string[]): void => {
    if (etat.get(id) === 'fini') return;
    if (etat.get(id) === 'en cours') AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${id}, champ dependances`, `cycle ${[...trajet.slice(trajet.indexOf(id)), id].join(' puis ')}`);
    etat.set(id, 'en cours');
    for (const dependance of parId.get(id)!.dependances) visiter(dependance, [...trajet, id]);
    etat.set(id, 'fini');
  };
  for (const piste of contenu.pistes) visiter(piste.id, []);
  return contenu.pistes;
}

const ORDRE_D_IMPORTANCE = ['critique', 'haute', 'moyenne', 'basse'];

const lienDuFichier = (commit: string, chemin: string): string => `${DEPOT_SUR_GITHUB}/${commit}/${chemin.split('/').map(encodeURIComponent).join('/')}`;

/** Le texte du plan d'une piste : celui du commit d'archive pour une piste archivée, celui de l'arbre sinon. Un plan sans case est refusé. */
function lotsDeLaPiste(piste: PisteEcrite, racine: string): Lot[] {
  const texte = piste.archive !== undefined
    ? git(racine, ['show', `${piste.archive}:${piste.plan}`])
    : readFileSync(path.join(racine, piste.plan!), 'utf8');
  const lots = lireLePlan((texte ?? '').replace(/\r\n/g, '\n'));
  if (lots.length === 0) AVEC_ECHEC(CHEMIN_DES_PISTES, `piste ${piste.id}, champ plan`, `${piste.plan} n'a aucune case à cocher`);
  return lots;
}

/** Les questions d'une piste : sa section « Questions au mainteneur » si elle a une recherche, son champ `questions` sinon. */
function questionsDeLaPiste(piste: PisteEcrite, racine: string): string[] {
  if (piste.recherche === undefined) return piste.questions ?? [];
  const texte = readFileSync(path.join(racine, piste.recherche), 'utf8').replace(/\r\n/g, '\n');
  return aUnTitreContenant(texte, SECTION_DES_QUESTIONS) ? questionsDe(sectionContenant(texte, piste.recherche, SECTION_DES_QUESTIONS)) : [];
}

function lotAffiche(lot: Lot, suivant: Lot | null): LotAffiche {
  const [premier] = lot.hashes;
  return {
    groupe: lot.groupe,
    numero: lot.numero,
    fait: lot.fait,
    marque: lot.marque === null ? '' : lot.marque === 'mainteneur' ? 'mainteneur' : (`attend ${lot.marque.attend}` as LotAffiche['marque']),
    suivant: lot === suivant,
    texte: lot.texte,
    hash: premier === undefined ? '' : premier.depot === null ? premier.hash : `${premier.depot}@${premier.hash}`,
  };
}

/** Ce que la piste attend, dans l'ordre : le mainteneur d'abord, puis une autre piste. */
function attentesDeLaPiste(piste: Piste, lots: Lot[] | null): Attente[] {
  const attentes: Attente[] = [];
  const nonFaits = (lots ?? []).filter((lot) => !lot.fait);
  const decision = nonFaits.find((lot) => lot.marque === 'mainteneur');
  const bloque = nonFaits.find((lot) => lot.marque !== null && lot.marque !== 'mainteneur');
  if (piste.etat === 'idee' && piste.prio <= 1) attentes.push({ genre: 'toi', texte: 'À lancer, rien de commencé', detail: 'Prio 0 ou 1 sans recherche ni plan' });
  if (decision) attentes.push({ genre: 'toi', texte: `Ta décision, lot ${decision.numero}`, detail: decision.texte });
  if (piste.etat === 'recherche' && piste.questions.length > 0) {
    attentes.push({ genre: 'toi', texte: `Tes réponses, ${piste.questions.length} ${piste.questions.length > 1 ? 'questions' : 'question'}`, detail: 'Questions de la recherche' });
  }
  if (bloque && bloque.marque !== null && bloque.marque !== 'mainteneur') attentes.push({ genre: 'piste', texte: `Lot ${bloque.numero} attend ${bloque.marque.attend}`, detail: bloque.texte });
  else if (piste.dependances.length > 0) attentes.push({ genre: 'piste', texte: `Après ${piste.dependances.join(', ')}`, detail: 'Prérequis pas encore livrés' });
  return attentes;
}

/**
 * Les pistes à suivre et les pistes terminées, calculées depuis `pistes.json`, les plans et les commits qu'ils citent. Une piste est terminée
 * quand son plan est livré (toutes ses cases de premier niveau cochées), quand elle est archivée ou quand le mainteneur l'écarte. Les pistes à suivre
 * se rangent par prio, puis par importance. `transverses` sont les règles de genre transverse de `decisions.json` : chacune va dans la fiche de chaque
 * piste à suivre qu'elle nomme.
 */
export function roadmap(transverses: Regle[], racine: string = RACINE): { pistes: Piste[]; terminees: Terminee[] } {
  const ecrites = pistes(racine);
  const dates = new Map<string, string | null>();
  const dateDuCommit = (hash: string): string | null => {
    if (!dates.has(hash)) dates.set(hash, dateDuCommitDans(racine, hash));
    return dates.get(hash)!;
  };
  const calculees = ecrites.map((ecrite) => {
    const lots = ecrite.plan === undefined ? null : lotsDeLaPiste(ecrite, racine);
    const livre = lots !== null && etatDuPlan(lots).livre;
    return { ecrite, lots, termine: livre || ecrite.archive !== undefined || ecrite.ecartee !== undefined };
  });
  const terminees = new Set(calculees.filter(({ termine }) => termine).map(({ ecrite }) => ecrite.id));
  const aSuivre = calculees.filter(({ termine }) => !termine);

  const pistesASuivre = aSuivre.map(({ ecrite, lots }): Piste => {
    const posee = ecrite.prioDuMainteneur;
    const etat: Piste['etat'] = lots !== null ? 'en-cours' : ecrite.recherche !== undefined ? 'recherche' : 'idee';
    const suivant = lots === null ? null : lotSuivant(lots);
    const piste: Piste = {
      id: ecrite.id,
      titre: ecrite.titre,
      titreCourt: ecrite.titreCourt,
      sujet: ecrite.sujet,
      prio: posee?.prio ?? ecrite.prio,
      prioDeLAgent: ecrite.prio,
      prioPosee: posee ? { raison: posee.raison } : null,
      importance: ecrite.importance,
      complexite: ecrite.complexite,
      coutHumain: ecrite.coutHumain,
      resume: ecrite.resume,
      raisonImportance: ecrite.raisonImportance,
      risques: ecrite.risques ?? [],
      criteresDeFin: ecrite.criteresDeFin ?? [],
      dependances: ecrite.dependances.filter((id) => !terminees.has(id)),
      debloque: aSuivre.filter((autre) => autre.ecrite.dependances.includes(ecrite.id)).map((autre) => autre.ecrite.id),
      recherche: ecrite.recherche ?? null,
      plan: ecrite.plan ?? null,
      etat,
      avancement: lots === null ? null : { faits: etatDuPlan(lots).faits, total: lots.length },
      lots: lots === null ? null : lots.map((lot) => lotAffiche(lot, suivant)),
      attentes: [],
      questions: questionsDeLaPiste(ecrite, racine),
      transverses: transverses
        .filter((regle) => regle.pistes.includes(ecrite.id))
        .map((regle) => ({ id: regle.id, titre: regle.titre ?? regle.id, texte: regle.texte, pistes: regle.pistes.filter((id) => !terminees.has(id)) })),
      dernierLot: lots === null ? null : dateDuDernierLot(lots, dateDuCommit),
    };
    piste.attentes = attentesDeLaPiste(piste, lots);
    return piste;
  });
  pistesASuivre.sort((a, b) => a.prio - b.prio || ORDRE_D_IMPORTANCE.indexOf(a.importance) - ORDRE_D_IMPORTANCE.indexOf(b.importance));

  const piecesTerminees = calculees
    .filter(({ termine }) => termine)
    .map(({ ecrite, lots }): Terminee => {
      const document = ecrite.plan ?? ecrite.recherche;
      return {
        id: ecrite.id,
        titreCourt: ecrite.titreCourt,
        date: lots === null ? null : dateDuDernierLot(lots, dateDuCommit),
        lien: document === undefined ? null : lienDuFichier(ecrite.archive ?? 'main', document),
        ecartee: ecrite.ecartee?.raison ?? null,
      };
    });
  piecesTerminees.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.id.localeCompare(b.id, 'fr', { numeric: true }));
  return { pistes: pistesASuivre, terminees: piecesTerminees };
}

/** Les décisions que le dépôt porte : les règles décidées, validées. */
export function decisions(identifiants: ReadonlySet<string>): Decisions {
  const contenu = json(CHEMIN_DES_DECISIONS) as Decisions;
  if (contenu.version !== 1) AVEC_ECHEC(CHEMIN_DES_DECISIONS, 'champ version', `la version ${contenu.version} n'est pas lue`);
  const regles = new Set<string>();
  for (const regle of contenu.regles) {
    if (regles.has(regle.id)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ id`, 'identifiant déjà pris');
    regles.add(regle.id);
    if (!['non', 'partiel', 'oui'].includes(regle.ecrite)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ ecrite`, `« ${regle.ecrite} » n'est ni non, ni partiel, ni oui`);
    if (!['carte', 'liste', 'tableau', 'transverse'].includes(regle.genre)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ genre`, `« ${regle.genre} » est inconnu`);
    for (const piste of regle.pistes) {
      if (!identifiants.has(piste)) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ pistes`, `${piste} n'existe pas`);
    }
    const [fichier] = regle.domicileCible.split('#');
    if (!existsSync(path.join(RACINE, fichier))) AVEC_ECHEC(CHEMIN_DES_DECISIONS, `règle ${regle.id}, champ domicileCible`, `${fichier} n'existe pas dans le dépôt`);
  }
  return contenu;
}

// ---------- Les univers de la couverture ----------

/** Les sous-dossiers d'un dossier du dépôt, triés. */
export const dossiersDe = (chemin: string): string[] => dossiers(chemin).sort();

/** Les dossiers de `.agents/skills/` qui portent un `SKILL.md`. */
export const dossiersDeSkills = (): string[] => dossiers('.agents/skills').filter((nom) => existsSync(path.join(RACINE, '.agents/skills', nom, 'SKILL.md'))).sort();

// ---------- Les registres et les listes du référentiel ----------

/** Chaque registre de termes du référentiel : son identifiant, s'il accepte des termes de plus, son nombre de termes. */
export function registresDuReferentiel(): { id: string; extensible: boolean; termes: number }[] {
  return [...REGISTRES, ...REGISTRES_ARCHITECTURE, ...REGISTRES_COMPOSANTS].map((registre) => ({ id: registre.id, extensible: registre.extensible, termes: registre.termes.length }));
}

/** Les listes fermées du référentiel que la page nomme : leur nom dans le kit, leurs identifiants, ce qu'elles disent. */
export function listesDuReferentiel(): { nom: string; ids: string[]; phrase: string }[] {
  return [
    { nom: 'PRODUITS', ids: PRODUITS.map((produit) => produit.id), phrase: 'Les produits UCM, avec ce que chacun lit et écrit.' },
    { nom: 'CONVENTIONS', ids: CONVENTIONS.map((convention) => convention.id), phrase: 'Les conventions de nommage que le designer choisit pour ses variables.' },
    { nom: 'ETATS', ids: [...ETATS], phrase: 'Les états du thème.' },
    { nom: 'DOSSIERS', ids: [...DOSSIERS], phrase: 'Les dossiers de la collection usage.' },
    { nom: 'PROFILS', ids: [...PROFILS], phrase: "Les intensités d'une palette." },
  ];
}

/** Le nombre de sortes d'imbriqué que le kit distingue. */
export const nombreDeSortesDImbrique = (): number => SORTES_D_IMBRIQUE.length;

/** Les longueurs de mot à partir desquelles Architect juge une faute de vocabulaire. */
export const longueursDeFaute = (): { court: number; uneLettre: number; deuxLettres: number } => ({
  court: LONGUEUR_MINIMALE_D_UNE_FAUTE_D_UN_MOT_COURT,
  uneLettre: LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE,
  deuxLettres: LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES,
});

/** Les tailles en pixels sous lesquelles le contrôle d'accessibilité d'Architect signale une cible ou un texte. */
export const seuilsDAccessibilite = (): { cible: number; tactile: number; texte: number } => ({ cible: CIBLE_MINIMALE_PX, tactile: CIBLE_TACTILE_PX, texte: TEXTE_MINIMAL_PX });
