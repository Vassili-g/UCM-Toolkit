/**
 * Écrit `tokens-reference.json` : un `tokens.json` au format 2 qui porte la référence complète d'un fichier full UCM
 * (`PROPOSITION-REFERENCE-COMPLETE.md`), pour deux marques inventées. Les noms de `brands`, `utility` et `theme` sortent de
 * `variablesAttendues`, les valeurs de `layout`, `typography` et `primitives` de `ECHELLES_DE_REFERENCE`, les cibles de l'élévation
 * de `CIBLES_DE_L_ELEVATION`. Les palettes de `primitives` sont calculées par `ucm-couleur`, au préréglage par défaut.
 * Aucune liste du référentiel n'est recopiée ici : seuls les noms de marque, les noms de palette et les couleurs de départ sont inventés.
 *
 * `npx tsx generer-reference.ts` écrit le fichier ; `npm run vues` le régénère. Le test `tests/vueIllustree.test.ts` compare
 * le fichier commité à `genererReference()`.
 *
 * `npx tsx generer-reference.ts --comparer <tokens.json>` écrit sur la sortie standard, par collection, les noms manquants, les noms en trop
 * et les valeurs qui diffèrent entre ce fichier et la référence. Il n'écrit aucun fichier. Il ne juge pas les noms de palette ni les crans de
 * `identity`, que le designer choisit, et il ne compare pas `components`, que la référence n'impose pas.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { EXTENSION_AXE_TOKENS, EXTENSION_AXES_TOKENS, EXTENSION_MODES_TOKENS, EXTENSION_VERSION_TOKENS, TOKENS_FORMAT_VERSION } from '@ucm-kit/core/format';
import {
  CIBLES_ABSOLUES_DU_NEUTRE,
  CIBLES_DE_L_ELEVATION,
  COLLECTIONS,
  COULEUR_DU_TEXTE_DES_BOUTONS,
  CRANS,
  DESTINATION_DES_PALETTES,
  ECHELLES_DE_REFERENCE,
  FAMILLES_BRANDS,
  FAMILLES_UTILITY,
  MODES,
  NIVEAUX_D_ELEVATION_DU_THEME,
  PROFILS,
  REGISTRE_COULEURS_ABSOLUES,
  REGISTRE_STATUTS,
  VARIABLES_DE_PALETTE,
  VARIABLES_DU_NEUTRE,
  VARIABLES_GLOBALES,
  cibleDeLaVariable,
  estNeutre,
  variablesAttendues,
  type CibleDeVariable,
  type Collection,
  type ModeDuTheme,
  type VariableDuTheme,
} from '@ucm-kit/core/referentiel';
import {
  boutsDe,
  intensitesDe,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  type Palette,
} from 'ucm-couleur';

import { CHEMIN_DE_LA_REFERENCE, lireValeur } from './generer-vue-illustree';

type Noeud = Record<string, unknown>;
type Mode = ModeDuTheme;

/** Une valeur écrite : un renvoi `collection/chemin`, une couleur hexadécimale, une mesure en px, un nombre ou un nom de famille. */
type Valeur = { alias: string } | { couleur: string } | { px: number } | { nombre: number } | { famille: string };
type Type = 'color' | 'dimension' | 'number' | 'fontFamily';

interface Feuille {
  readonly collection: Collection;
  readonly chemin: string;
  /** Une collection à un seul mode écrit `valeur` ; une collection à modes écrit `modes`, une valeur par mode. */
  readonly valeur?: Valeur;
  readonly modes?: Readonly<Record<string, Valeur>>;
  /** Le type d'une valeur littérale ; un renvoi prend celui de sa cible. */
  readonly type?: Type;
}

/** Les marques et les couleurs de départ de leurs palettes sont inventées : aucun nom de client n'entre dans le fichier. */
const MARQUES = [
  { nom: 'marque-1', depart: { primary: '#2F5BEA', secondary: '#0E9F8E' } },
  { nom: 'marque-2', depart: { primary: '#8B3FD9', secondary: '#E08A1E' } },
] as const;
const DEPART_DES_STATUTS: Readonly<Record<string, string>> = { success: '#16A34A', warning: '#EAB308', info: '#0EA5E9', danger: '#DC2626' };
const DEPART_DU_NEUTRE = '#6B7280';
/** Le cran que `identity` vise dans la palette de sa famille : un exemple, le designer choisit le sien. */
const CRAN_DE_CHARTE: Readonly<Record<string, number>> = { primary: 600, secondary: 900 };

const familles = FAMILLES_BRANDS.termes.map((terme) => terme.id).filter((id) => id in CRAN_DE_CHARTE);
const statuts = REGISTRE_STATUTS.termes.map((terme) => terme.id);
const neutre = FAMILLES_UTILITY.termes.find((terme) => estNeutre(terme.id))!.id;
const nomDePalette = (rang: number): string => `palette-${String.fromCharCode(97 + rang)}`;
const colonnes: readonly string[] = MARQUES.map((marque) => marque.nom);

interface PaletteDeLaReference {
  readonly nom: string;
  readonly depart: string;
  /** Une palette sans profil : un jeu de crans Light et Dark. Sinon un jeu par profil. */
  readonly unique: boolean;
}

/** Les palettes de `primitives`, dans l'ordre : deux par marque, une par statut, le neutre. */
const PALETTES: PaletteDeLaReference[] = [
  ...MARQUES.flatMap((marque) => familles.map((famille) => ({ depart: marque.depart[famille as 'primary' | 'secondary'], unique: true }))),
  ...statuts.map((statut) => ({ depart: DEPART_DES_STATUTS[statut], unique: false })),
  { depart: DEPART_DU_NEUTRE, unique: true },
].map((palette, rang) => ({ ...palette, nom: nomDePalette(rang) }));

const paletteDeMarque = (marque: string, famille: string): string => PALETTES[colonnes.indexOf(marque) * familles.length + familles.indexOf(famille)].nom;
const paletteDeStatut = (statut: string): string => PALETTES[colonnes.length * familles.length + statuts.indexOf(statut)].nom;
const paletteNeutre = PALETTES[PALETTES.length - 1].nom;

const hexa = (couleur: string): string => couleur.toUpperCase();
/** Le blanc et le noir de la palette neutre, que `utility` et `theme` visent sans passer par un thème. */
const ABSOLUES: Readonly<Record<string, string>> = { white: COULEUR_DU_TEXTE_DES_BOUTONS.blanc, black: COULEUR_DU_TEXTE_DES_BOUTONS.noir };

/** Les rampes du moteur pour chaque palette : le même préréglage Tailwind, la référence ancrée. */
function calculerLesCouleurs(): Feuille[] {
  const recette = recetteParDefaut();
  const feuilles: Feuille[] = [];
  const groupe = DESTINATION_DES_PALETTES.groupe;
  PALETTES.forEach((def, rang) => {
    const derive = prereglageTailwind(rgb8VersOklch(lireHexa(def.depart)!), boutsDe(recette));
    const palette: Palette = {
      id: `p-${rang.toString(16).padStart(8, '0')}`,
      nom: def.nom,
      reference: def.depart,
      ...(def.unique ? { intensites: 1 as const } : {}),
      derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } },
    };
    const rampes = rampesDe(recette, palette);
    for (const intensite of intensitesDe(palette)) {
      for (const mode of MODES) {
        const rampe = rampeDe(rampes, intensite)[mode];
        if (rampe.length !== CRANS.length) throw new Error(`La palette ${def.nom} a ${rampe.length} crans, la référence en attend ${CRANS.length}.`);
        CRANS.forEach((cran, i) => {
          const profil = intensite === 'unique' ? '' : `${intensite}/`;
          feuilles.push({ collection: 'primitives', chemin: `${groupe}/${def.nom}/${profil}${mode}/${cran}`, valeur: { couleur: hexa(rampe[i].hexa) }, type: 'color' });
        });
      }
    }
    if (def.nom === paletteNeutre) {
      for (const { id } of REGISTRE_COULEURS_ABSOLUES.termes) feuilles.push({ collection: 'primitives', chemin: `${groupe}/${def.nom}/${id}`, valeur: { couleur: ABSOLUES[id] }, type: 'color' });
    }
  });
  return feuilles;
}

const alias = (chemin: string): Valeur => ({ alias: chemin });
const couleurPrimitive = (palette: string, ...fin: (string | number)[]): string => `primitives/${DESTINATION_DES_PALETTES.groupe}/${palette}/${fin.join('/')}`;

/** Le blanc et le noir de la palette neutre n'ont pas de thème dans leur chemin. Un cran en a un. */
function cibleDeLaPalette(palette: string, profil: string | undefined, mode: Mode, cible: CibleDeVariable): string {
  const debut = profil === undefined ? [] : [profil];
  return 'absolue' in cible ? couleurPrimitive(palette, cible.absolue) : couleurPrimitive(palette, ...debut, mode, cible.cran);
}

function feuillesDeBrands(): Feuille[] {
  const parChemin = new Map<string, Record<string, Valeur>>();
  for (const { chemin, marque } of variablesAttendues('brands', { marques: colonnes })) {
    const segments = chemin.split('/');
    // `identity/<famille>` a deux segments et vise un cran de la palette de sa famille ; `<famille>/<thème>/<cran>` vise le même cran du même thème.
    const valeur = segments.length === 2
      ? alias(couleurPrimitive(paletteDeMarque(marque!, segments[1]), MODES[0], CRAN_DE_CHARTE[segments[1]]))
      : alias(couleurPrimitive(paletteDeMarque(marque!, segments[0]), segments[1], segments[2]));
    parChemin.set(chemin, { ...parChemin.get(chemin), [marque!]: valeur });
  }
  return [...parChemin].map(([chemin, modes]) => ({ collection: 'brands' as const, chemin, modes }));
}

function feuillesDeUtility(): Feuille[] {
  return variablesAttendues('utility').map(({ chemin }) => {
    const segments = chemin.split('/');
    const fin = segments[segments.length - 1];
    let cible: string;
    if ((NIVEAUX_D_ELEVATION_DU_THEME as readonly string[]).includes(fin)) {
      const mode = segments[1] as Mode;
      cible = cibleDeLaPalette(paletteNeutre, undefined, mode, CIBLES_DE_L_ELEVATION[fin as keyof typeof CIBLES_DE_L_ELEVATION][mode]);
    } else if (estNeutre(segments[0])) {
      const cran = Number(fin);
      cible = cibleDeLaPalette(paletteNeutre, undefined, segments[1] as Mode, Number.isNaN(cran) ? { absolue: fin as 'white' | 'black' } : { cran });
    } else {
      cible = couleurPrimitive(paletteDeStatut(segments[0]), segments[1], segments[2], fin);
    }
    return { collection: 'utility' as const, chemin, valeur: alias(cible) };
  });
}

/** Les variables d'une palette du thème, dans l'ordre d'une fin de nom que `variablesAttendues` écrit. */
const FINS_DU_THEME = new Set<string>([...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE, ...CRANS.map((cran) => `scale/${cran}`)]);

/** Les variables du thème visent la table du kit, au sens normal : la palette est celle de la marque courante, du neutre ou du statut. */
function cibleDuTheme(chemin: string, mode: Mode): string {
  const segments = chemin.split('/');
  if ((VARIABLES_GLOBALES as readonly string[]).includes(chemin)) {
    const cran = cibleDeLaVariable(chemin as VariableDuTheme, mode, 'normal') as CibleDeVariable;
    return `utility/${neutre}/${mode}/${'cran' in cran ? cran.cran : cran.absolue}`;
  }
  if (segments.length === 2 && (NIVEAUX_D_ELEVATION_DU_THEME as readonly string[]).includes(segments[1])) return `utility/${segments[0]}/${mode}/${segments[1]}`;
  const longueur = [1, 2].find((n) => FINS_DU_THEME.has(segments.slice(n).join('/')));
  if (longueur === undefined) throw new Error(`Variable du thème inconnue : ${chemin}`);
  const palette = segments.slice(0, longueur);
  const variable = segments.slice(longueur).join('/');
  const cible = variable.startsWith('scale/') && !(variable in CIBLES_ABSOLUES_DU_NEUTRE)
    ? { cran: Number(variable.slice('scale/'.length)) }
    : cibleDeLaVariable(variable as VariableDuTheme, mode, 'normal');
  if (!cible) throw new Error(`Aucune cible pour ${chemin}`);
  const absolue = 'absolue' in cible;
  if (absolue) return `utility/${neutre}/${mode}/${cible.absolue}`;
  if (palette.length === 2) return `utility/${palette[0]}/${palette[1]}/${mode}/${cible.cran}`;
  return estNeutre(palette[0]) ? `utility/${neutre}/${mode}/${cible.cran}` : `brands/${palette[0]}/${mode}/${cible.cran}`;
}

function feuillesDuTheme(): Feuille[] {
  return variablesAttendues('theme').map(({ chemin }) => ({
    collection: 'theme' as const,
    chemin,
    modes: Object.fromEntries(MODES.map((mode) => [mode, alias(cibleDuTheme(chemin, mode))])),
  }));
}

const GROUPES_SANS_UNITE: Readonly<Record<string, Type>> = { 'font-weight': 'number', 'font-family': 'fontFamily' };

function feuillesDesEchelles(): Feuille[] {
  const { primitives, layout, typography } = ECHELLES_DE_REFERENCE;
  const dePrimitives = primitives.map((entree): Feuille => {
    const groupe = entree.chemin.split('/')[0];
    const type = GROUPES_SANS_UNITE[groupe] ?? 'dimension';
    const v = entree.valeur!;
    const ecrite: Valeur = type === 'number' ? { nombre: Number(v) } : type === 'fontFamily' ? { famille: String(v) } : { px: Number(v) };
    return { collection: 'primitives', chemin: entree.chemin, valeur: ecrite, type };
  });
  const alias_ = (collection: Collection) => (entree: { chemin: string; alias?: string }): Feuille => ({ collection, chemin: entree.chemin, valeur: alias(entree.alias!) });
  return [...dePrimitives, ...layout.map(alias_('layout')), ...typography.map(alias_('typography'))];
}

/** Le bouton d'exemple de la vue illustrée : ses mesures visent la variable de `layout` qui vaut exactement la mesure. */
function feuillesDuBouton(): Feuille[] {
  const { primitives, layout } = ECHELLES_DE_REFERENCE;
  const dimensionDe = (px: number): string => `primitives/${primitives.find((entree) => entree.chemin.startsWith('dimension/') && entree.valeur === px)!.chemin}`;
  const mesure = (famille: string, px: number): string => `layout/${layout.find((entree) => entree.chemin.startsWith(`${famille}/`) && entree.alias === dimensionDe(px))!.chemin}`;
  const exemple: readonly (readonly [string, string, number])[] = [
    ['md/padding-x', 'sizing', 14], ['md/padding-y', 'sizing', 12], ['md/gap', 'sizing', 10], ['md/radius', 'radius', 6],
    ['lg/padding-x', 'sizing', 20], ['lg/padding-y', 'sizing', 20],
    ['sm/padding-y', 'sizing', 4], ['sm/gap', 'sizing', 8],
  ];
  return exemple.map(([fin, famille, px]) => ({ collection: 'components' as const, chemin: `button/size/${fin}`, valeur: alias(mesure(famille, px)) }));
}

function lesFeuilles(): Feuille[] {
  return [...feuillesDuBouton(), ...feuillesDuTheme(), ...feuillesDeBrands(), ...feuillesDeUtility(), ...calculerLesCouleurs(), ...feuillesDesEchelles()];
}

/** Les collections à modes : un axe par collection, nommé comme elle. */
function axes(): Record<string, { modes: string[]; default: string }> {
  return { brands: { modes: [...colonnes], default: colonnes[0] }, theme: { modes: [...MODES], default: MODES[0] } };
}

const enHex = (canal: number): number => canal / 255;

/** La forme DTCG d'une valeur ; un renvoi s'écrit `{collection.chemin}` et prend le type de sa cible. */
function ecrireLaValeur(valeur: Valeur): unknown {
  if ('alias' in valeur) return `{${valeur.alias.split('/').join('.')}}`;
  if ('couleur' in valeur) {
    const [r, g, b] = lireHexa(valeur.couleur)!;
    return { colorSpace: 'srgb', components: [enHex(r), enHex(g), enHex(b)], alpha: 1 };
  }
  if ('px' in valeur) return { value: valeur.px, unit: 'px' };
  return 'nombre' in valeur ? valeur.nombre : valeur.famille;
}

function typeDe(feuille: Feuille, parCle: Map<string, Feuille>, vus = new Set<string>()): Type {
  if (feuille.type) return feuille.type;
  const premiere = feuille.valeur ?? Object.values(feuille.modes!)[0];
  const cle = (premiere as { alias: string }).alias;
  if (vus.has(cle)) throw new Error(`Cycle d'alias : ${[...vus, cle].join(' → ')}`);
  const cible = parCle.get(cle);
  if (!cible) throw new Error(`Cible d'alias absente : ${cle} (depuis ${feuille.collection}/${feuille.chemin})`);
  return typeDe(cible, parCle, new Set([...vus, cle]));
}

const TYPES_DTCG: Readonly<Record<Type, string>> = { color: 'color', dimension: 'dimension', number: 'number', fontFamily: 'fontFamily' };

/** Le document `tokens.json` de la référence, au format 2, collections dans l'ordre de `COLLECTIONS`. */
export function documentDeLaReference(): Noeud {
  const feuilles = lesFeuilles();
  const parCle = new Map(feuilles.map((feuille) => [`${feuille.collection}/${feuille.chemin}`, feuille]));
  const axesDuFichier = axes();
  const document: Noeud = { $extensions: { [EXTENSION_VERSION_TOKENS]: TOKENS_FORMAT_VERSION, [EXTENSION_AXES_TOKENS]: axesDuFichier } };
  for (const collection of COLLECTIONS) document[collection] = {};
  for (const feuille of feuilles) {
    const type = typeDe(feuille, parCle);
    const axe = axesDuFichier[feuille.collection];
    const ecrites = feuille.modes && Object.fromEntries(Object.entries(feuille.modes).map(([mode, v]) => [mode, ecrireLaValeur(v)]));
    const token: Noeud = ecrites
      ? { $value: ecrites[axe.default], $type: TYPES_DTCG[type], $extensions: { [EXTENSION_MODES_TOKENS]: ecrites, [EXTENSION_AXE_TOKENS]: feuille.collection } }
      : { $value: ecrireLaValeur(feuille.valeur!), $type: TYPES_DTCG[type] };
    let noeud = document[feuille.collection] as Noeud;
    const segments = feuille.chemin.split('/');
    for (const segment of segments.slice(0, -1)) noeud = (noeud[segment] ??= {}) as Noeud;
    const derniere = segments[segments.length - 1];
    if (derniere in noeud) throw new Error(`Variable en double : ${feuille.collection}/${feuille.chemin}`);
    noeud[derniere] = token;
  }
  return document;
}

/** Le contenu exact de `tokens-reference.json`. */
export function genererReference(): string {
  return `${JSON.stringify(documentDeLaReference(), null, 2)}\n`;
}

// --- Comparaison ---

interface Releve {
  readonly modes: Readonly<Record<string, string[]>>;
  readonly variables: Readonly<Record<string, Map<string, string[]>>>;
}

/** Un alias vers une couleur de `primitives` perd le nom de sa palette : les noms de palette sont ceux du fichier, pas de la référence. */
function sansNomDePalette(valeur: string): string {
  return valeur.replace(new RegExp(`^(primitives\\.${DESTINATION_DES_PALETTES.groupe}\\.)[^.]+`), '$1*');
}

/** Les variables d'un `tokens.json`, par collection : le chemin sans le nom de la collection, et une valeur par mode dans l'ordre des modes. */
export function relever(document: Noeud): Releve {
  const declares = ((document.$extensions as Noeud | undefined)?.[EXTENSION_AXES_TOKENS] ?? {}) as Record<string, { modes: string[] }>;
  const variables: Record<string, Map<string, string[]>> = {};
  const modes: Record<string, string[]> = {};
  for (const [collection, racine] of Object.entries(document)) {
    if (collection.startsWith('$') || !racine || typeof racine !== 'object') continue;
    modes[collection] = declares[collection]?.modes ?? [];
    const rangees = new Map<string, string[]>();
    const parcourir = (noeud: Noeud, segments: string[]): void => {
      if ('$value' in noeud) {
        const parMode = (noeud.$extensions as Noeud | undefined)?.[EXTENSION_MODES_TOKENS] as Record<string, unknown> | undefined;
        const nombre = Math.max(modes[collection].length, 1);
        const valeurs = parMode && modes[collection].length
          ? modes[collection].map((mode) => lireValeur(mode in parMode ? parMode[mode] : noeud.$value))
          : Array.from({ length: nombre }, () => lireValeur(noeud.$value));
        rangees.set(segments.join('/'), valeurs.map(sansNomDePalette));
        return;
      }
      for (const [cle, enfant] of Object.entries(noeud)) if (!cle.startsWith('$') && enfant && typeof enfant === 'object') parcourir(enfant as Noeud, [...segments, cle]);
    };
    parcourir(racine as Noeud, []);
    variables[collection] = rangees;
  }
  return { modes, variables };
}

const debutDesCouleurs = `${DESTINATION_DES_PALETTES.groupe}/`;
/** `identity/<famille>` est le seul chemin de `brands` à deux segments : le cran de charte, que le designer choisit. */
const estUneIdentite = (chemin: string, collection: string): boolean => collection === 'brands' && chemin.split('/').length === 2;

/** Les écarts d'un fichier lu à la référence, ligne par ligne ; aucune ligne si le fichier la suit. */
export function comparer(lu: Noeud, attendu: Noeud = documentDeLaReference()): string[] {
  const a = relever(attendu);
  const l = relever(lu);
  const lignes: string[] = [];
  for (const collection of COLLECTIONS) {
    if (collection === 'components') continue;
    const noms = a.variables[collection];
    const trouves = l.variables[collection];
    const ecarts: string[] = [];
    if (!trouves) {
      lignes.push(`${collection} : collection absente (${noms.size} variables attendues)`);
      continue;
    }
    const comparable = (chemin: string): boolean => !(collection === 'primitives' && chemin.startsWith(debutDesCouleurs));
    const manquants = [...noms.keys()].filter((chemin) => comparable(chemin) && !trouves.has(chemin));
    const enTrop = [...trouves.keys()].filter((chemin) => comparable(chemin) && !noms.has(chemin));
    if (manquants.length) ecarts.push(`  manquants (${manquants.length}) : ${manquants.join(', ')}`);
    if (enTrop.length) ecarts.push(`  en trop (${enTrop.length}) : ${enTrop.join(', ')}`);
    const attendusDesModes = a.modes[collection].length;
    if (l.modes[collection].length !== attendusDesModes) ecarts.push(`  modes : ${attendusDesModes} attendus, ${l.modes[collection].length} lus`);
    const differentes: string[] = [];
    for (const [chemin, valeurs] of trouves) {
      const reference = noms.get(chemin);
      if (!reference || !comparable(chemin) || estUneIdentite(chemin, collection)) continue;
      valeurs.forEach((valeur, rang) => {
        const attenduIci = reference[Math.min(rang, reference.length - 1)];
        if (valeur !== attenduIci) differentes.push(`${chemin}${valeurs.length > 1 ? ` (mode ${rang + 1})` : ''} : attendu ${attenduIci}, lu ${valeur}`);
      });
    }
    if (differentes.length) ecarts.push(`  valeurs qui diffèrent (${differentes.length}) :`, ...differentes.map((ligne) => `    ${ligne}`));
    if (collection === 'primitives') ecarts.push(...ecartsDesPalettes(a.variables.primitives, trouves));
    if (ecarts.length) lignes.push(`${collection} :`, ...ecarts);
  }
  return lignes;
}

/**
 * Une palette de couleur a l'une des formes de la référence : ses chemins sans le nom de la palette (crans Light et Dark, profils, `white` et `black`).
 * Un autre ensemble est un écart, même quand son compte est celui d'une autre forme : un statut sans `vivid` compte 22 variables, comme une palette de marque.
 */
function ecartsDesPalettes(attendues: Map<string, string[]>, lues: Map<string, string[]>): string[] {
  const formes = (variables: Map<string, string[]>): Map<string, string[]> => {
    const parPalette = new Map<string, string[]>();
    for (const chemin of variables.keys()) {
      if (!chemin.startsWith(debutDesCouleurs)) continue;
      const [, palette, ...reste] = chemin.split('/');
      parPalette.set(palette, [...(parPalette.get(palette) ?? []), reste.join('/')].sort());
    }
    return parPalette;
  };
  const admises = new Map<string, string[]>();
  for (const forme of formes(attendues).values()) admises.set(forme.join('|'), forme);
  const comptes = [...new Set([...admises.values()].map((forme) => forme.length))].sort((x, y) => x - y).join(', ');
  const lignes: string[] = [];
  for (const [palette, forme] of formes(lues)) {
    if (admises.has(forme.join('|'))) continue;
    const proche = [...admises.values()].sort((x, y) => ecart(forme, x) - ecart(forme, y))[0];
    const manquants = proche.filter((chemin) => !forme.includes(chemin));
    const enTrop = forme.filter((chemin) => !proche.includes(chemin));
    const detail = [...(manquants.length ? [`manquants : ${manquants.join(', ')}`] : []), ...(enTrop.length ? [`en trop : ${enTrop.join(', ')}`] : [])].join(' ; ');
    lignes.push(`  palette ${palette} : ${forme.length} variables (formes attendues : ${comptes}), ${detail}`);
  }
  return lignes;
}

const ecart = (forme: readonly string[], autre: readonly string[]): number =>
  autre.filter((chemin) => !forme.includes(chemin)).length + forme.filter((chemin) => !autre.includes(chemin)).length;

if (require.main === module) {
  const arguments_ = process.argv.slice(2);
  const rang = arguments_.indexOf('--comparer');
  if (rang === -1) {
    writeFileSync(CHEMIN_DE_LA_REFERENCE, genererReference());
    console.log(`Écrit : ${CHEMIN_DE_LA_REFERENCE}`);
  } else {
    const cible = arguments_[rang + 1];
    if (!cible) throw new Error('Usage : npx tsx generer-reference.ts --comparer <tokens.json>');
    const lignes = comparer(JSON.parse(readFileSync(path.resolve(cible), 'utf8')) as Noeud);
    console.log(lignes.length ? lignes.join('\n') : 'Aucun écart.');
  }
}
