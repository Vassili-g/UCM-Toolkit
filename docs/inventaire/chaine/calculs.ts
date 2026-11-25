/**
 * Du registre des briques à ce que `rendu.js` lit pour dessiner la chaîne UCM. `controlerLeRegistre` refuse un registre qui viole
 * une règle de structure ; `convertirLeRegistre` calcule ce que le registre ne déclare pas (états, scénario « Aujourd'hui »,
 * dépendances, paquets affichés, teinte des traits, traits et puces du kit, versions, nombres des textes) et le rend sous la forme du rendu.
 * `donneesDeLaChaine` les enchaîne et reste la seule entrée que lit `generer-inventaire.ts`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VARIABLES_DU_THEME, GARANTIES } from '@ucm-kit/core/emplois';
import { COLLECTIONS, PRODUITS, SEUILS_PAR_USAGE } from '@ucm-kit/core/referentiel';
import type { Produit } from '@ucm-kit/core/referentiel';
import { BRIQUES, EXCLUSIONS_DE_PISTES, JAUGES, LEGENDES, NOMBRES_ECRITS, PUCES_DU_KIT, ZONES } from './briques';
import type { Brique, DonneeDeTrait, DonneesDeTrait, Etat, GenreDeBrique, Jauge, Mode, NombreEcrit, Piece, Preuve, PuceDuKit, Reception, Zone } from './briques';
import { RACINE, paquetsDuWorkspace, portesDuKit, portesImportees, preuvesDuCode, roadmap } from '../releves';
import type { PaquetDuWorkspace } from '../releves';

/** Les cartes qui montrent un produit ou une piste : les autres genres n'en nomment aucun. */
const GENRES_RATTACHES: readonly GenreDeBrique[] = ['outil', 'module', 'paquet', 'note'];

/** Les champs que le registre ne déclare plus : `calculs.ts` les calcule. */
const CHAMPS_CALCULES = ['etat', 'auj', 'deps'] as const;
const TABLES_CALCULEES = ['MARQUES', 'KIT'] as const;

/** La teinte d'un trait selon sa donnée : une seule table. Toute autre donnée donne la teinte neutre. */
const TEINTES: Readonly<Partial<Record<DonneeDeTrait, string>>> = {
  contrats: 'contrat',
  'tokens-dtcg': 'tokens',
  implementation: 'code',
  rapports: 'rapport',
};

/**
 * Les seuls traits dont la donnée n'est pas lue par la cible : l'aide du Linter au code du composant, l'hébergement de Santé par Storybook,
 * l'appel de l'adaptateur par le Contrôle UCM dans le même processus. Ces données n'ont ni source qui l'écrit ni cible qui la lit.
 */
const TRAITS_SANS_LECTURE: Readonly<Record<string, string>> = {
  'linter>developpement': 'aide',
  'storybook>sante': 'hebergement',
  'adaptateur>cli': 'hebergement',
};

const SANS_LECTURE: readonly DonneeDeTrait[] = ['aide', 'hebergement'];

/** Les données d'un trait, une liste que la donnée soit seule ou multiple. */
export function donneesDuTrait(donnee: DonneesDeTrait): readonly DonneeDeTrait[] {
  return typeof donnee === 'string' ? [donnee] : donnee;
}

/** La teinte d'un trait : celle que toutes ses données donnent, neutre quand elles en donnent plusieurs. */
export function teinteDuTrait(donnee: DonneesDeTrait): string {
  const teintes = new Set(donneesDuTrait(donnee).map((d) => TEINTES[d] ?? 'neutre'));
  return teintes.size === 1 ? [...teintes][0] : 'neutre';
}

/** Le dossier de `packages/` de chaque produit de `PRODUITS`. */
const DOSSIER_DU_PRODUIT: Readonly<Record<Produit['id'], string>> = {
  exporter: 'plugin-exporter',
  palettes: 'plugin-palettes',
  kit: 'kit',
  cli: 'cli',
  'adapter-typescript': 'adapter-typescript',
  couleur: 'couleur',
  socle: 'plugin-socle',
  architect: 'plugin-architect',
};

/** La largeur d'une carte selon son genre, comme `largeurDe` de `rendu.js`. */
export function largeurDeLaBrique(brique: Pick<Brique, 'genre' | 'large'>): number {
  if (brique.genre === 'fichier') return 170;
  if (brique.genre === 'note') return 176;
  if (brique.genre === 'paquet') return brique.large ? 360 : 180;
  return 190;
}

/**
 * Ce qu'une carte lit. Une carte de fichier ou de dessin lit sa `donnee`, une carte de produit lit ce que `PRODUITS` déclare, un module ou un geste lit ce qu'il déclare.
 */
export function donneesLues(b: Brique): readonly DonneeDeTrait[] {
  if (b.donnee !== undefined) return [b.donnee, ...(b.lit ?? [])];
  const produit = b.produit === undefined ? undefined : PRODUITS.find((p) => p.id === b.produit);
  if (produit !== undefined) return produit.lit;
  return b.lit ?? [];
}

/** Ce qu'une carte écrit, par les mêmes sources. La porte de la CI écrit aussi ce qu'elle lit, hors la configuration du repository. */
export function donneesEcrites(b: Brique): readonly DonneeDeTrait[] {
  if (b.donnee !== undefined) return [b.donnee, ...(b.ecrit ?? [])];
  const produit = b.produit === undefined ? undefined : PRODUITS.find((p) => p.id === b.produit);
  if (produit === undefined) return b.ecrit ?? [];
  const ecrites: DonneeDeTrait[] = produit.ecrit.flatMap((sortie) => sortie.donnees);
  return b.rangeCeQuIlLit === true ? [...ecrites, ...produit.lit.filter((d) => d !== 'configuration')] : ecrites;
}

export interface RegistreDeLaChaine {
  zones: readonly Zone[];
  briques: readonly Brique[];
  jauges: readonly Jauge[];
  /** Les nombres qu'un texte écrit à la main ; absent, aucun texte n'en écrit. */
  nombres?: readonly NombreEcrit[];
  /** Les pistes non terminées que la chaîne ne montre pas, chacune avec sa raison ; absent, aucune n'est exclue. */
  exclusions?: Readonly<Record<string, string>>;
}

/** Un paquet du workspace avec les portes du kit que son `src/` importe. */
export interface PaquetLu extends PaquetDuWorkspace {
  portes: readonly string[];
}

/** Ce que le registre est tenu de citer ou de tenir : les faits du dépôt qu'il ne recopie pas. */
export interface ReferencesDuRegistre {
  produits: ReadonlySet<string>;
  pistes: ReadonlySet<string>;
  collections: ReadonlySet<string>;
  /** Les pistes que `roadmap()` range parmi les terminées. */
  terminees: ReadonlySet<string>;
  paquets: readonly PaquetLu[];
  /** Les portes de `exports` du kit. */
  portesDuKit: readonly string[];
  /** Les noms des commandes de la CLI. */
  commandes: ReadonlySet<string>;
  /** Les noms que chaque porte du kit exporte. */
  exportees: Readonly<Record<string, ReadonlySet<string>>>;
  /** Le texte d'`ucm init`. */
  init: string;
  /** Les valeurs des trous `{{nom}}` des textes, hors `paquets-livres` et `paquets-a-venir`, que le registre compte lui-même. */
  valeurs: Readonly<Record<string, string>>;
}

let referencesLues: ReferencesDuRegistre | undefined;

export function referencesDuDepot(): ReferencesDuRegistre {
  if (referencesLues !== undefined) return referencesLues;
  const fichier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../notes/Recherches/Evolutions globales/pistes.json');
  const { pistes } = JSON.parse(readFileSync(fichier, 'utf8')) as { pistes: readonly { id: string }[] };
  const preuves = preuvesDuCode();
  const rapport = (seuil: number): string => `${String(seuil).replace('.', ',')}:1`;
  referencesLues = {
    produits: new Set(PRODUITS.map((p) => p.id)),
    pistes: new Set(pistes.map((p) => p.id)),
    collections: new Set<string>(COLLECTIONS),
    terminees: new Set(roadmap([]).terminees.map((piste) => piste.id)),
    paquets: paquetsDuWorkspace().map((paquet) => ({ ...paquet, portes: portesImportees(paquet.dossier) })),
    portesDuKit: portesDuKit(),
    commandes: new Set(preuves.commandes),
    exportees: Object.fromEntries(Object.entries(preuves.exportees).map(([porte, noms]) => [porte, new Set(noms)])),
    init: preuves.init,
    valeurs: {
      collections: String(COLLECTIONS.length),
      theme: String(VARIABLES_DU_THEME.length),
      garanties: String(GARANTIES.length),
      'rapport-texte': rapport(SEUILS_PAR_USAGE.texte),
      'rapport-graphique': rapport(SEUILS_PAR_USAGE.nonTexte),
      // La fiche de l'adaptateur, dans la section 2 de l'inventaire, lit le même nombre.
      'taille-typescript': NOMBRES_ECRITS.find((n) => n.source === 'node_modules/typescript')?.nombre ?? '',
    },
  };
  return referencesLues;
}

// ---------- Les faits que le dépôt prouve ----------

/** Le paquet du workspace d'un produit. */
function paquetDuProduit(produit: Produit['id'], references: ReferencesDuRegistre): PaquetLu | undefined {
  return references.paquets.find((paquet) => paquet.dossier === DOSSIER_DU_PRODUIT[produit]);
}

/** Une preuve existe quand le code porte ce qu'elle nomme. */
export function preuveTrouvee(preuve: Preuve, references: ReferencesDuRegistre): boolean {
  if ('commande' in preuve) return references.commandes.has(preuve.commande);
  if ('export' in preuve) return references.exportees[preuve.export.porte]?.has(preuve.export.nom) ?? false;
  if ('fichierDuConsommateur' in preuve) return references.init.includes(preuve.fichierDuConsommateur);
  return PRODUITS.find((produit) => produit.id === preuve.produit)?.ecrit.some((sortie) => sortie.donnees.includes(preuve.ecrit)) ?? false;
}

/** Une pièce est livrée quand le code la prouve, ou quand sa piste est terminée ; sinon elle est à venir. */
function etatDeLaPiece(piece: Piece, references: ReferencesDuRegistre): Etat {
  if (piece.preuve !== undefined) return preuveTrouvee(piece.preuve, references) ? 'livre' : 'venir';
  return piece.piste !== undefined && references.terminees.has(piece.piste) ? 'livre' : 'venir';
}

/**
 * L'état de chaque carte d'outil, de module, de paquet et de la note. Un produit est disponible quelles que soient ses pièces. Une carte
 * de piste est disponible quand sa piste est terminée ; sinon elle suit ses pièces, hors celles qui décrivent le chemin d'aujourd'hui,
 * et reste à venir sans pièces.
 */
export function etatsDesCartes(registre: Pick<RegistreDeLaChaine, 'briques'>, references: ReferencesDuRegistre): Map<string, Etat> {
  const etats = new Map<string, Etat>();
  for (const b of registre.briques) {
    if (!GENRES_RATTACHES.includes(b.genre)) continue;
    if (b.produit !== undefined) { etats.set(b.id, 'livre'); continue; }
    if (b.piste !== undefined && references.terminees.has(b.piste)) { etats.set(b.id, 'livre'); continue; }
    const comptees = (b.pieces ?? []).filter((piece) => piece.chemin !== true).map((piece) => etatDeLaPiece(piece, references));
    if (comptees.length === 0 || comptees.every((etat) => etat === 'venir')) etats.set(b.id, 'venir');
    else etats.set(b.id, comptees.every((etat) => etat === 'livre') ? 'livre' : 'partie');
  }
  return etats;
}

// ---------- Le contrôle du registre ----------

/** Les textes que le registre écrit, avec la carte qui les porte. */
function textesDe(b: Brique): string[] {
  const couches = (liste: readonly { libelle: string; detail: string }[] | undefined) => (liste ?? []).flatMap((c) => [c.libelle, c.detail]);
  return [
    b.nom, b.type, b.phrase, ...(b.fait ?? []), b.texte, b.sans, ...(b.pieces ?? []).map((p) => p.texte), ...couches(b.couches),
    ...Object.values(b.modes ?? {}).flatMap((m) => [m.libelle, m.phrase, ...m.fait]),
    ...(b.alternative === undefined ? [] : [b.alternative.nom, b.alternative.type, b.alternative.phrase, ...couches(b.alternative.couches)]),
  ].filter((texte): texte is string => texte !== undefined);
}

/** Les violations d'un trait : sa source écrit sa donnée, sa cible la lit ; `aide` et `hebergement` ne servent qu'aux trois traits qui les portent. */
function controlerLeTrait(cible: Brique, trait: Reception, briques: readonly Brique[]): string[] {
  const nom = `${cible.id} : le trait de ${trait.de}`;
  const donnees = donneesDuTrait(trait.donnee);
  const sansLecture = donnees.filter((d) => SANS_LECTURE.includes(d));
  if (sansLecture.length > 0) {
    return TRAITS_SANS_LECTURE[`${trait.de}>${cible.id}`] === sansLecture[0] && donnees.length === 1
      ? []
      : [`${nom} porte la donnée ${sansLecture[0]}, réservée à ${Object.keys(TRAITS_SANS_LECTURE).join(', ')}.`];
  }
  const source = briques.find((b) => b.id === trait.de);
  if (source === undefined) return [];
  return donnees.flatMap((donnee) => [
    ...(donneesEcrites(source).includes(donnee) ? [] : [`${nom} porte ${donnee}, que ${trait.de} n'écrit pas.`]),
    ...(donneesLues(cible).includes(donnee) ? [] : [`${nom} porte ${donnee}, que ${cible.id} ne lit pas.`]),
  ]);
}

const TROU = /\{\{([a-z-]+)\}\}/g;

/**
 * Les violations du suivi de la Roadmap : chaque piste non terminée de `pistes.json` est montrée par une carte ou une pièce, ou exclue avec sa raison ;
 * une exclusion sans raison, d'une piste absente ou d'une piste montrée est refusée.
 */
function controlerLesPistes(registre: RegistreDeLaChaine, references: ReferencesDuRegistre): string[] {
  const erreurs: string[] = [];
  const exclusions = registre.exclusions ?? {};
  const montrees = new Set(registre.briques.flatMap((b) => [b.piste, ...(b.pieces ?? []).map((piece) => piece.piste)]).filter((piste) => piste !== undefined));
  for (const piste of references.pistes) {
    if (references.terminees.has(piste) || montrees.has(piste) || piste in exclusions) continue;
    erreurs.push(`La piste ${piste} n'est ni montrée ni exclue : ajouter une carte, une pièce ou une exclusion dans EXCLUSIONS_DE_PISTES.`);
  }
  for (const [piste, raison] of Object.entries(exclusions)) {
    if (raison.trim() === '') erreurs.push(`L'exclusion de la piste ${piste} n'a pas de raison.`);
    if (!references.pistes.has(piste)) erreurs.push(`L'exclusion de la piste ${piste} est refusée : elle est absente de pistes.json, retirer l'exclusion.`);
    else if (montrees.has(piste)) erreurs.push(`L'exclusion de la piste ${piste} est refusée : une carte ou une pièce la montre, retirer l'exclusion.`);
  }
  return erreurs;
}

/** Les violations du registre, une phrase chacune ; vide quand il tient toutes les règles de structure. */
export function controlerLeRegistre(registre: RegistreDeLaChaine, references: ReferencesDuRegistre): string[] {
  const erreurs: string[] = [];
  const identifiants = new Set(registre.briques.map((b) => b.id));
  const zones = new Map(registre.zones.map((z) => [z.id, z]));
  const marques = new Set(registre.briques.filter((b) => b.genre === 'paquet' && b.marque !== undefined).map((b) => b.marque));
  const nombres = new Set((registre.nombres ?? []).map((n) => n.nombre));
  if (identifiants.size !== registre.briques.length) erreurs.push('Deux cartes portent le même identifiant.');
  for (const nom of TABLES_CALCULEES) if (nom in registre) erreurs.push(`Le registre porte ${nom} : les traits du kit et les paquets affichés se calculent.`);

  for (const b of registre.briques) {
    for (const champ of CHAMPS_CALCULES) if (champ in b) erreurs.push(`${b.id} : le champ ${champ} se calcule, le registre ne le déclare pas.`);
    const nommees = [b.produit, b.piste].filter((nom) => nom !== undefined).length;
    if (GENRES_RATTACHES.includes(b.genre) && nommees !== 1) erreurs.push(`${b.id} : une carte de genre ${b.genre} nomme un produit ou une piste, un seul.`);
    if (!GENRES_RATTACHES.includes(b.genre) && nommees !== 0) erreurs.push(`${b.id} : une carte de genre ${b.genre} ne nomme ni produit ni piste.`);
    if (b.produit !== undefined && !references.produits.has(b.produit)) erreurs.push(`${b.id} : le produit ${b.produit} est absent de PRODUITS.`);
    if (b.produit !== undefined && references.produits.has(b.produit) && paquetDuProduit(b.produit, references) === undefined) erreurs.push(`${b.id} : le produit ${b.produit} n'a pas de paquet dans le workspace.`);
    if (b.piste !== undefined && !references.pistes.has(b.piste)) erreurs.push(`${b.id} : la piste ${b.piste} est absente de pistes.json, retirer la carte ${b.id}.`);
    for (const piece of b.pieces ?? []) {
      if (piece.piste !== undefined && !references.pistes.has(piece.piste)) erreurs.push(`${b.id} : la piste ${piece.piste} de la pièce « ${piece.texte} » est absente de pistes.json, retirer cette pièce de la carte ${b.id}.`);
      if ((piece.preuve === undefined) === (piece.piste === undefined)) erreurs.push(`${b.id} : la pièce « ${piece.texte} » porte une preuve ou une piste, une seule.`);
      if (piece.preuve !== undefined && !preuveTrouvee(piece.preuve, references)) erreurs.push(`${b.id} : la preuve de la pièce « ${piece.texte} » est absente du code (${JSON.stringify(piece.preuve)}).`);
    }
    for (const r of b.recoit ?? []) {
      if (!identifiants.has(r.de)) erreurs.push(`${b.id} : le trait reçoit de ${r.de}, qui n'est pas une carte.`);
      if ('teinte' in r) erreurs.push(`${b.id} : le trait de ${r.de} porte une teinte, qui se calcule depuis sa donnée.`);
      erreurs.push(...controlerLeTrait(b, r, registre.briques));
    }
    for (const [nom, mode] of Object.entries(b.modes ?? {})) {
      if (!identifiants.has(mode.vers)) erreurs.push(`${b.id} : le mode ${nom} alimente ${mode.vers}, qui n'est pas une carte.`);
      const cible = registre.briques.find((autre) => autre.id === mode.vers);
      if (cible !== undefined && !donneesEcrites(b).some((d) => [...donneesLues(cible), ...donneesEcrites(cible)].includes(d))) {
        erreurs.push(`${b.id} : le mode ${nom} alimente ${mode.vers}, dont aucune donnée n'est écrite par ${b.id}.`);
      }
    }
    for (const couche of b.couches ?? []) {
      for (const collection of couche.collections) {
        if (!references.collections.has(collection)) erreurs.push(`${b.id} : la couche ${couche.libelle} cite la collection ${collection}, absente de COLLECTIONS.`);
      }
    }
    for (const marque of b.paquets ?? []) if (!marques.has(marque)) erreurs.push(`${b.id} : le paquet ${marque} n'est la marque d'aucune carte de paquet.`);
    for (const porte of b.portes ?? []) if (!references.portesDuKit.includes(porte)) erreurs.push(`${b.id} : la porte ${porte} n'est pas une porte de exports du kit.`);
    for (const texte of textesDe(b)) {
      const sansTrous = texte.replace(TROU, ' ');
      for (const trou of texte.matchAll(TROU)) {
        if (!(trou[1] in references.valeurs)) erreurs.push(`${b.id} : le trou {{${trou[1]}}} n'a pas de valeur calculée.`);
      }
      if (/\b\d+\.\d+\.\d+\b/.test(sansTrous)) erreurs.push(`${b.id} : le texte « ${texte} » écrit une version, qui se calcule depuis package.json.`);
      for (const nombre of sansTrous.match(/\d+(?:[.,]\d+)*/g) ?? []) {
        if (!nombres.has(nombre)) erreurs.push(`${b.id} : le texte « ${texte} » écrit le nombre ${nombre}, hors d'un calcul et de NOMBRES_ECRITS.`);
      }
    }
    const zone = zones.get(b.zone);
    if (zone === undefined) { erreurs.push(`${b.id} : la zone ${b.zone} n'existe pas.`); continue; }
    const droite = b.x + largeurDeLaBrique(b);
    if (b.x < zone.x || droite > zone.x + zone.w || b.y < zone.y || b.y > zone.y + zone.h) {
      erreurs.push(`${b.id} : la carte (x ${b.x} à ${droite}, y ${b.y}) sort de la zone ${zone.titre} (x ${zone.x} à ${zone.x + zone.w}, y ${zone.y} à ${zone.y + zone.h}).`);
    }
  }
  for (const zone of registre.zones) {
    for (const nombre of zone.qui.replace(TROU, ' ').match(/\d+(?:[.,]\d+)*/g) ?? []) {
      if (!nombres.has(nombre)) erreurs.push(`La zone ${zone.titre} écrit le nombre ${nombre}, hors d'un calcul et de NOMBRES_ECRITS.`);
    }
  }
  erreurs.push(...controlerLesPistes(registre, references));
  for (const jauge of registre.jauges) {
    for (const id of jauge.par) if (!identifiants.has(id)) erreurs.push(`La jauge « ${jauge.nom} » cite ${id}, qui n'est pas une carte.`);
  }
  return erreurs;
}

/** Les violations de la table des puces : chaque porte de `exports` du kit appartient à une seule puce, et chaque puce ne cite que des portes du kit. */
export function controlerLesPuces(puces: readonly PuceDuKit[], portes: readonly string[]): string[] {
  const erreurs: string[] = [];
  for (const porte of portes) {
    const parmi = puces.filter((puce) => puce.portes.includes(porte));
    if (parmi.length === 0) erreurs.push(`La porte ${porte} du kit n'appartient à aucune puce.`);
    if (parmi.length > 1) erreurs.push(`La porte ${porte} du kit appartient à ${parmi.length} puces : ${parmi.map((puce) => puce.libelle).join(', ')}.`);
  }
  for (const puce of puces) for (const porte of puce.portes) if (!portes.includes(porte)) erreurs.push(`La puce ${puce.libelle} cite ${porte}, qui n'est pas une porte du kit.`);
  return erreurs;
}

/** La taille d'un dossier, en mégaoctets. */
function tailleEnMo(chemin: string): number {
  const somme = (dossier: string): number => readdirSync(dossier, { withFileTypes: true }).reduce((total, entree) => {
    const complet = path.join(dossier, entree.name);
    return total + (entree.isDirectory() ? somme(complet) : statSync(complet).size);
  }, 0);
  return somme(chemin) / 1048576;
}

/**
 * Les nombres écrits dont la source ne les porte pas. Une source fichier doit contenir le nombre ; une source dossier doit peser ce nombre
 * de mégaoctets, à un près, car la taille dépend de l'installation.
 */
export function controlerLesNombresEcrits(nombres: readonly NombreEcrit[], racine: string = RACINE): string[] {
  const erreurs: string[] = [];
  for (const { nombre, source } of nombres) {
    const chemin = path.join(racine, source);
    if (!existsSync(chemin)) { erreurs.push(`${nombre} : la source ${source} est absente du dépôt.`); continue; }
    if (statSync(chemin).isDirectory()) {
      const taille = tailleEnMo(chemin);
      if (Math.abs(taille - Number(nombre)) >= 1) erreurs.push(`${nombre} : ${source} pèse ${taille.toFixed(1)} Mo.`);
    } else if (!new RegExp(`(?<![\\d.,])${nombre}(?![\\d.,])`).test(readFileSync(chemin, 'utf8'))) {
      erreurs.push(`${nombre} : ${source} ne contient pas ce nombre.`);
    }
  }
  return erreurs;
}

// ---------- Ce que le registre ne déclare pas ----------

/** La carte de paquet qui porte cette marque. */
function carteDeMarque(briques: readonly Brique[], marque: string): Brique | undefined {
  return briques.find((b) => b.genre === 'paquet' && b.marque === marque);
}

/** Les cartes de paquet que `dependencies` du produit nomme. Un paquet que le workspace ne contient pas (`ajv`, `typescript`) n'a pas de carte. */
function cartesDesDependances(produit: Produit['id'], briques: readonly Brique[], references: ReferencesDuRegistre): Brique[] {
  const paquet = paquetDuProduit(produit, references);
  return (paquet?.dependances ?? []).flatMap((nom) => {
    const dependance = references.paquets.find((autre) => autre.nom === nom);
    const carte = briques.find((b) => b.genre === 'paquet' && b.produit !== undefined && DOSSIER_DU_PRODUIT[b.produit] === dependance?.dossier);
    return carte === undefined ? [] : [carte];
  });
}

/** La carte de paquet qui porte le même produit qu'une carte d'outil : le paquet que cet outil installe. */
function cartePaquetDe(b: Brique, briques: readonly Brique[]): Brique | undefined {
  return b.genre === 'outil' ? briques.find((autre) => autre.genre === 'paquet' && autre.produit === b.produit) : undefined;
}

/**
 * Les cartes dont une carte dépend : d'abord les traits `requis`, puis les `dependencies` du produit pour une carte de produit ou de
 * paquet, les paquets que cite un module, et le kit pour un paquet à venir qui en reçoit des portes. Un paquet privé n'en reçoit aucune :
 * les plugins l'embarquent à la construction.
 */
export function dependancesDe(b: Brique, briques: readonly Brique[], references: ReferencesDuRegistre): string[] {
  const requises = (b.recoit ?? []).filter((r) => r.requis === true).map((r) => r.de);
  const paquet = b.produit === undefined ? undefined : paquetDuProduit(b.produit, references);
  let paquets: Brique[] = [];
  if ((b.genre === 'outil' || b.genre === 'paquet') && b.produit !== undefined && !(b.genre === 'paquet' && paquet?.prive === true)) {
    paquets = cartesDesDependances(b.produit, briques, references);
  } else if (b.genre === 'module') {
    paquets = (b.paquets ?? []).flatMap((marque) => carteDeMarque(briques, marque) ?? []);
  } else if (b.genre === 'paquet' && b.produit === undefined && (b.portes ?? []).length > 0) {
    paquets = briques.filter((autre) => autre.genre === 'paquet' && autre.produit === 'kit');
  }
  return [...new Set([...requises, ...paquets.map((carte) => carte.id)])];
}

/** Les marques des paquets qu'une carte du flux affiche, dans l'ordre de ses `dependencies` ou de son champ `paquets`. */
export function marquesDe(b: Brique, briques: readonly Brique[], references: ReferencesDuRegistre): string[] {
  let cartes: Brique[] = [];
  if (b.genre === 'outil' && b.produit !== undefined) {
    const sien = cartePaquetDe(b, briques);
    cartes = sien === undefined ? cartesDesDependances(b.produit, briques, references) : [sien];
  } else if (b.genre === 'module' || b.genre === 'geste') {
    cartes = (b.paquets ?? []).flatMap((marque) => carteDeMarque(briques, marque) ?? []);
  }
  return cartes.flatMap((carte) => carte.marque ?? []);
}

/** Les identifiants des puces dont une porte figure dans `portes`, dans l'ordre de la table. */
function pucesDesPortes(portes: readonly string[], puces: readonly PuceDuKit[]): string[] {
  return puces.filter((puce) => puce.portes.some((porte) => portes.includes(porte))).map((puce) => puce.id);
}

/** Un trait de la lecture « Les paquets » : paquet source, carte cible, puces du kit que ce trait porte. */
export type LienDuKit = readonly [string, string, readonly string[]];

/**
 * Ce que chaque paquet du Toolkit envoie à chaque carte. Un trait vient des `dependencies` d'un outil ou d'un paquet, du paquet d'un
 * outil de même produit, du champ `paquets` d'un module ou d'un geste, ou des portes d'un paquet à venir. Le kit envoie ses portes
 * importées, ou `modules` à un module ; les autres paquets n'envoient aucune puce. L'ordre : le kit, les paquets publiés, les privés.
 */
export function liensDuKit(briques: readonly Brique[], references: ReferencesDuRegistre, puces: readonly PuceDuKit[] = PUCES_DU_KIT): LienDuKit[] {
  const liens = new Map<string, { lien: LienDuKit; rang: number; ordre: number }>();
  const rangDe = (source: Brique): number => (source.produit === 'kit' ? 0 : source.produit !== undefined && paquetDuProduit(source.produit, references)?.prive === false ? 1 : 2);
  const ajouter = (source: Brique, cible: Brique, portes: readonly string[]) => {
    const cle = `${source.id}>${cible.id}`;
    if (liens.has(cle)) return;
    liens.set(cle, { lien: [source.id, cible.id, source.produit === 'kit' ? pucesDesPortes(portes, puces) : []], rang: rangDe(source), ordre: briques.indexOf(cible) });
  };
  const portesDuProduit = (b: Brique): readonly string[] => (b.produit === undefined ? [] : (paquetDuProduit(b.produit, references)?.portes ?? []));
  for (const b of briques) {
    if (b.genre === 'outil' || (b.genre === 'paquet' && b.produit !== undefined)) {
      const sien = cartePaquetDe(b, briques);
      if (sien !== undefined) ajouter(sien, b, b.portes ?? portesDuProduit(b));
      else for (const source of cartesDesDependances(b.produit!, briques, references)) ajouter(source, b, portesDuProduit(b));
    } else if (b.genre === 'paquet' && (b.portes ?? []).length > 0) {
      for (const source of briques.filter((autre) => autre.genre === 'paquet' && autre.produit === 'kit')) ajouter(source, b, b.portes!);
    } else if (b.genre === 'module' || b.genre === 'geste') {
      for (const marque of b.paquets ?? []) {
        const source = carteDeMarque(briques, marque);
        if (source !== undefined) ajouter(source, b, b.genre === 'module' ? ['modules'] : []);
      }
    }
  }
  return [...liens.values()].sort((a, b) => a.rang - b.rang || a.ordre - b.ordre).map(({ lien }) => lien);
}

/** Le type d'une carte de paquet : sa version publiée, ou « Paquet privé ». Une carte qui déclare son `type` le garde. */
function typeDe(b: Brique, references: ReferencesDuRegistre): string | undefined {
  if (b.genre !== 'paquet' || b.produit === undefined) return b.type;
  const paquet = paquetDuProduit(b.produit, references);
  if (paquet === undefined) return b.type;
  return paquet.prive ? 'Paquet privé' : `npm · ${paquet.version}`;
}

/** Remplace chaque trou `{{nom}}` d'un texte du registre, à toute profondeur. */
function remplirLesTrous<T>(valeur: T, valeurs: Readonly<Record<string, string>>): T {
  if (typeof valeur === 'string') {
    return valeur.replace(TROU, (_trou, nom: string) => {
      if (!(nom in valeurs)) throw new Error(`Le trou {{${nom}}} n'a pas de valeur calculée.`);
      return valeurs[nom];
    }) as T;
  }
  if (Array.isArray(valeur)) return valeur.map((element) => remplirLesTrous(element, valeurs)) as T;
  if (valeur !== null && typeof valeur === 'object') return Object.fromEntries(Object.entries(valeur).map(([nom, contenu]) => [nom, remplirLesTrous(contenu, valeurs)])) as T;
  return valeur;
}

// ---------- La conversion vers le rendu ----------

/** Une carte sous la forme que lit `rendu.js`. Les champs qu'il ne lit pas sur un genre de carte restent absents. */
export interface Noeud {
  id: string;
  x: number;
  y: number;
  nom: string;
  type?: string;
  logo?: string;
  picto?: string;
  etat?: Etat;
  auj?: boolean;
  deps?: readonly string[];
  fixe?: boolean;
  fichier?: boolean;
  note?: boolean;
  paquet?: boolean;
  large?: boolean;
  phrase?: string;
  fait?: readonly string[];
  texte?: string;
  sans?: string;
  briques?: readonly (readonly [string, Etat])[];
  modes?: Readonly<Record<string, Mode>>;
  couches?: readonly (readonly [string, string])[];
  alternative?: { nom: string; type: string; couches: readonly (readonly [string, string])[]; phrase: string };
  puces?: readonly (readonly [string, string])[];
}

/** Source, cible, port, teinte, et `true` pour un trait secondaire. */
export type Lien = readonly [string, string, string | null, string, boolean?];

/** Ce que le calcul tire du dépôt pour une carte : son état, ses dépendances, son type et l'état de ses pièces. */
interface Calcule {
  etat: Etat | undefined;
  deps: string[];
  type: string | undefined;
  pieces: readonly (readonly [string, Etat])[] | undefined;
}

/** Les cartes du registre sous la forme du rendu, champ pour champ et dans l'ordre où `rendu.js` et la page les lisent. */
function noeudDe(b: Brique, calcule: Calcule): Noeud {
  const noeud: Record<string, unknown> = { id: b.id };
  if (b.genre === 'fichier') noeud.fichier = true;
  if (b.genre === 'note') noeud.note = true;
  noeud.x = b.x;
  noeud.y = b.y;
  if (b.genre === 'paquet') noeud.paquet = true;
  if (b.large) noeud.large = true;
  const ajouter = (champs: Record<string, unknown>) => {
    for (const [nom, valeur] of Object.entries(champs)) if (valeur !== undefined) noeud[nom] = valeur;
  };
  ajouter({
    logo: b.logo, picto: b.picto, nom: b.nom, type: calcule.type, etat: calcule.etat,
    auj: calcule.etat === undefined ? undefined : calcule.etat === 'livre',
    deps: calcule.deps.length === 0 ? undefined : calcule.deps,
  });
  if (b.genre === 'geste') noeud.fixe = true;
  ajouter({
    modes: b.modes,
    couches: b.couches?.map((c) => [c.libelle, c.detail]),
    alternative: b.alternative && { nom: b.alternative.nom, type: b.alternative.type, couches: b.alternative.couches.map((c) => [c.libelle, c.detail]), phrase: b.alternative.phrase },
    phrase: b.phrase, fait: b.fait, texte: b.texte,
    briques: calcule.pieces,
    puces: b.genre === 'paquet' && b.produit === 'kit' ? PUCES_DU_KIT.map((puce) => [puce.id, puce.libelle]) : undefined,
    sans: b.sans,
  });
  return noeud as unknown as Noeud;
}

/** Les traits du registre : chacun vit dans la carte qui le reçoit, et `rang` redonne l'ordre de tracé. Une exigence sans trait ne se dessine pas. */
function liensDe(briques: readonly Brique[]): Lien[] {
  return briques
    .flatMap((b) => (b.recoit ?? []).flatMap((r) => ('sansTrait' in r ? [] : [{ r, cible: b.id }])))
    .sort((a, b) => a.r.rang - b.r.rang)
    .map(({ r, cible }): Lien => (r.secondaire ? [r.de, cible, r.port ?? null, teinteDuTrait(r.donnee), true] : [r.de, cible, r.port ?? null, teinteDuTrait(r.donnee)]));
}

export function convertirLeRegistre(registre: RegistreDeLaChaine, references: ReferencesDuRegistre) {
  const etats = etatsDesCartes(registre, references);
  const cartesDePaquet = registre.briques.filter((b) => b.genre === 'paquet');
  const nombreDePaquets = (etat: Etat) => String(cartesDePaquet.filter((b) => etats.get(b.id) === etat).length);
  const valeurs = { ...references.valeurs, 'paquets-livres': nombreDePaquets('livre'), 'paquets-a-venir': nombreDePaquets('venir') };
  const briques = registre.briques;
  const noeuds = briques.map((b) => noeudDe(remplirLesTrous(b, valeurs), {
    etat: etats.get(b.id),
    deps: dependancesDe(b, briques, references),
    type: remplirLesTrous(typeDe(b, references), valeurs),
    pieces: b.pieces?.map((piece) => [remplirLesTrous(piece.texte, valeurs), etatDeLaPiece(piece, references)] as const),
  }));
  const marques = Object.fromEntries(briques.flatMap((b) => { const noms = marquesDe(b, briques, references); return noms.length === 0 ? [] : [[b.id, noms]]; }));
  return {
    ZONES: remplirLesTrous(registre.zones, valeurs).map(({ id: _id, ...zone }) => zone),
    LEGENDES,
    NOEUDS: noeuds,
    LIENS: liensDe(briques),
    KIT: liensDuKit(briques, references),
    MARQUES: marques as Readonly<Record<string, readonly string[]>>,
    GARANTIES: registre.jauges,
  };
}

export function donneesDeLaChaine() {
  const registre: RegistreDeLaChaine = { zones: ZONES, briques: BRIQUES, jauges: JAUGES, nombres: NOMBRES_ECRITS, exclusions: EXCLUSIONS_DE_PISTES };
  const references = referencesDuDepot();
  const erreurs = [...controlerLeRegistre(registre, references), ...controlerLesPuces(PUCES_DU_KIT, references.portesDuKit)];
  if (erreurs.length > 0) throw new Error(`Le registre de la chaîne est refusé :\n${erreurs.join('\n')}`);
  return convertirLeRegistre(registre, references);
}

export type DonneesDeLaChaine = ReturnType<typeof donneesDeLaChaine>;
