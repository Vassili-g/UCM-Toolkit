/**
 * Guides de composants : lit les trois couches de `docs/references/` et rend
 * un guide HTML par composant.
 *
 *   npx tsx docs/references/_outils/guide.ts etat <nom>
 *   npx tsx docs/references/_outils/guide.ts relever <id> | --tous
 *   npx tsx docs/references/_outils/guide.ts verifier <id> | --tous
 *   npx tsx docs/references/_outils/guide.ts rendre <id> | --tous
 *
 * `etat` dit ce qui existe pour un nom de composant, à la date du jour : c'est
 * la seule commande qui lit l'horloge. `relever`, `verifier` et `rendre` ne
 * dépendent que des fichiers, pour qu'un test refuse un relevé ou une page qui
 * ne suit plus ses données. Les noms, les tokens, les couleurs, les contrastes
 * et les comptes « n sur m » viennent d'ici ; l'agent n'écrit que la synthèse.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import { REGISTRES, REGISTRES_ARCHITECTURE } from '@ucm-kit/core/referentiel';
import { atteintLeSeuil, contraste, ecrireContraste, lineaireVersRgb8, lireHexa, oklchVersLineaire } from 'ucm-couleur';
import { fautesDuDocument } from '../../../scripts/controle-style.mjs';

/** Version du gabarit : un guide rendu pour une autre version est périmé. */
export const GABARIT = 1;

/** Les quinze sections, dans l'ordre du gabarit. */
export const ANCRES = [
  'entete', 'definition', 'noms', 'anatomie', 'variantes', 'etats', 'clavier', 'accessibilite',
  'redaction', 'tokens', 'choix', 'rappels', 'exemples', 'questions', 'sources',
] as const;

/** Les seize critères WCAG 2.2 de la section 8. */
export const CRITERES: Record<string, string> = {
  '1.4.1': 'Utilisation de la couleur',
  '1.4.3': 'Contraste (minimum)',
  '1.4.4': 'Redimensionnement du texte',
  '1.4.11': 'Contraste du contenu non textuel',
  '1.4.12': 'Espacement du texte',
  '2.1.1': 'Clavier',
  '2.4.3': 'Parcours du focus',
  '2.4.7': 'Visibilité du focus',
  '2.4.11': 'Focus non masqué (minimum)',
  '2.4.13': 'Apparence du focus (AAA, indicatif)',
  '2.5.3': 'Étiquette dans le nom',
  '2.5.7': 'Mouvements de glissement',
  '2.5.8': 'Taille de la cible (minimum)',
  '3.3.2': 'Étiquettes ou instructions',
  '4.1.2': 'Nom, rôle et valeur',
  '4.1.3': 'Messages d’état',
};

/** Au-delà, une fiche est ancienne : `etat` la signale, `rendre` la refuse sans raison écrite. */
export const MOIS_DE_VALIDITE = 12;

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const REFERENCES = path.resolve(DOSSIER, '..');
const RACINE = path.resolve(REFERENCES, '..', '..');

export interface Contexte {
  /** `docs/references`, ou un dossier de même forme. */
  references: string;
  /** Racine du dépôt : le kit y donne la version des registres. */
  racine: string;
}
export const CONTEXTE_REEL: Contexte = { references: REFERENCES, racine: RACINE };

/* ------------------------------------------------------------------ types */

type Role = 'tokens' | 'composants' | 'comportement' | 'redaction' | 'nommage';
interface Mode { nom: string | null; page: string | null }
export interface Systeme {
  id: string;
  nom: string;
  editeur: string;
  roles: Role[];
  tokens: string | null;
  /**
   * Seul un système marqué remplit la table `tokens` de ses fiches : le
   * mainteneur l'a réservée aux systèmes qui publient des tokens de composant
   * en fichier. Les autres restent hors du nuancier.
   */
  tableDeTokens?: boolean;
  documentation: string;
  licences: { code: string; documentation: string };
  modes: { light: Mode | null; dark: Mode | null } | null;
}
interface Alias { nom: string; url: string; motifs?: string[]; note?: string }
export interface EntreeIndex {
  id: string;
  nom: string;
  definition: string;
  voisins: string[];
  systemes: Record<string, Alias | null>;
}
interface JetonDeFiche { variante: string; etat: string; role: string; token: string }
export interface Fiche {
  composant: string;
  systeme: string;
  lu: string;
  pages: string[];
  variantes: string[];
  tailles: Record<string, string>;
  anatomie: string[];
  etats: string[];
  clavier: string[];
  regles: string[];
  redaction: string[];
  particularites: string[];
  tokens?: JetonDeFiche[];
}
interface LigneDeNoms { nom: string; type: string | null; couche: string | null }
interface LigneDeValeurs { nom: string; mode: string | null; valeur: string | null; resolue: string | null; alpha?: number }
interface Source { systeme: string; version: string; originalPath: string; sha256: string; usage?: string }
export interface Releve {
  composant: string;
  systemes: Record<string, {
    version: string;
    motifs: string[];
    tokens: { nom: string; type: string | null; couche: string | null; valeurs: Record<string, string | null> }[];
  }>;
}

type Point = { texte: string; systemes: string[] };
type SansObjet = { sansObjet: string };
type Variante = { nom: string; locaux: Record<string, string> };
export interface Guide {
  gabarit: number;
  composant: string;
  date: string;
  absences?: { systeme: string; raison: string }[];
  definition: SansObjet | { resume: string; quandLUtiliser: string[]; voisins: { id: string; choisirSi: string }[] };
  anatomie: SansObjet | { parties: { nom: string; obligatoire: boolean; systemes: string[] }[] };
  variantes: SansObjet | { emphase: Variante[]; statut: Variante[]; tailles: Variante[] };
  etats: SansObjet | { etat: string; ceQuiChange: string; systemes: string[] }[];
  clavier: SansObjet | { touches: { touche: string; effet: string; systemes: string[] }[]; focus: Point[]; interactions: Point[] };
  accessibilite: SansObjet | {
    aria: { role: string; attributs: string[]; nomAccessible: string };
    criteres: { critere: string; sApplique: boolean; exigence: string; pratique: string }[];
  };
  redaction: SansObjet | { regles: Point[] };
  proposition: SansObjet | { segments: { genre: string; valeur: string }[]; note?: string }[];
  choix: SansObjet | { question: string; options: Record<string, string>; systemes: Record<string, string> }[];
  rappels: SansObjet | Record<'regle' | 'etat' | 'comportement' | 'accessibilite' | 'redaction' | 'tokens', Point[]>;
  exemples: { idee: string; systeme: string; source: string }[];
  questions: { question: string; options: string[]; dependDe: string }[];
}

/* --------------------------------------------------------------- lectures */

const lireJson = <T>(chemin: string): T => JSON.parse(readFileSync(chemin, 'utf8')) as T;
const lireSiPresent = <T>(chemin: string, defaut: T): T => (existsSync(chemin) ? lireJson<T>(chemin) : defaut);

export const chargerSystemes = (ctx: Contexte): Systeme[] => lireJson<Systeme[]>(path.join(ctx.references, 'systemes.json'));
export const chargerIndex = (ctx: Contexte): EntreeIndex[] => lireSiPresent<EntreeIndex[]>(path.join(ctx.references, 'composants', 'index.json'), []);
const dossierDeSysteme = (ctx: Contexte, systeme: Systeme): string | null =>
  (systeme.tokens ? path.join(ctx.references, systeme.tokens) : null);

const cache = new Map<string, unknown>();
function memo<T>(chemin: string, defaut: T): T {
  if (!cache.has(chemin)) cache.set(chemin, lireSiPresent<T>(chemin, defaut));
  return cache.get(chemin) as T;
}
const nomsDe = (ctx: Contexte, s: Systeme): LigneDeNoms[] => {
  const d = dossierDeSysteme(ctx, s);
  return d ? memo<LigneDeNoms[]>(path.join(d, 'noms.json'), []) : [];
};
const valeursDe = (ctx: Contexte, s: Systeme): LigneDeValeurs[] => {
  const d = dossierDeSysteme(ctx, s);
  return d ? memo<LigneDeValeurs[]>(path.join(d, 'valeurs.json'), []) : [];
};
const sourcesDe = (ctx: Contexte): Source[] => memo<Source[]>(path.join(ctx.references, 'design-systems', 'sources.json'), []);

/** Les fiches d'un composant : un fichier `<système>.json`, hors `tokens.json`. */
export function fichesDe(ctx: Contexte, id: string): { fichier: string; fiche: Fiche }[] {
  const dossier = path.join(ctx.references, 'composants', id);
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.json') && f !== 'tokens.json')
    .sort()
    .map((f) => ({ fichier: path.join(dossier, f), fiche: lireJson<Fiche>(path.join(dossier, f)) }));
}

/* ----------------------------------------------------------------- schémas */

const ajv = new Ajv({ allErrors: true, strict: false });
const validateurs: Partial<Record<'index' | 'fiche' | 'guide', ValidateFunction>> = {};
function erreursDuSchema(nom: 'index' | 'fiche' | 'guide', donnee: unknown): string[] {
  const v = (validateurs[nom] ??= ajv.compile(lireJson<object>(path.join(DOSSIER, `${nom}.schema.json`))));
  if (v(donnee)) return [];
  const vues = new Set<string>();
  for (const e of v.errors ?? []) {
    const detail = e.keyword === 'additionalProperties' ? ` (${String((e.params as { additionalProperty?: string }).additionalProperty)})` : '';
    vues.add(`${e.instancePath || '/'} ${e.message ?? ''}${detail}`.trim());
  }
  return [...vues].slice(0, 15);
}

/* ------------------------------------------------------------------ dates */

const motifDate = /^(\d{4})-(\d{2})-(\d{2})$/;
function lireDate(texte: string): { annee: number; mois: number; jour: number } | null {
  const m = motifDate.exec(texte);
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  return d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour ? { annee, mois, jour } : null;
}
/** Mois entiers écoulés de `a` à `b`, deux dates `AAAA-MM-JJ`. */
export function moisEntre(a: string, b: string): number {
  const x = lireDate(a);
  const y = lireDate(b);
  if (!x || !y) return 0;
  return (y.annee - x.annee) * 12 + (y.mois - x.mois) - (y.jour < x.jour ? 1 : 0);
}
const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

/* ----------------------------------------------------------------- couleurs */

export interface Couleur { rgb: [number, number, number]; alpha: number }

const NOMMEES: Record<string, Couleur> = {
  white: { rgb: [255, 255, 255], alpha: 1 },
  black: { rgb: [0, 0, 0], alpha: 1 },
  transparent: { rgb: [0, 0, 0], alpha: 0 },
};
const borner255 = (x: number): number => Math.min(255, Math.max(0, Math.round(x)));
const nombre = (t: string): number => (t.endsWith('%') ? Number(t.slice(0, -1)) / 100 : Number(t));

function hslVersRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [borner255(255 * f(0)), borner255(255 * f(8)), borner255(255 * f(4))];
}

/**
 * Lit une couleur publiée : hexa, `rgb()`, `hsl()` (et la forme nue `H S% L%` de
 * shadcn), `oklch()`, mots `white`, `black` et `transparent`. Rend null pour le
 * reste (`color-mix`, dégradé, espace P3), qui n'entre pas dans un contraste.
 */
export function lireCouleur(texte: string | null): Couleur | null {
  if (texte === null) return null;
  const t = texte.trim().toLowerCase();
  if (t in NOMMEES) return NOMMEES[t];
  const long = /^#([0-9a-f]{8})$/.exec(t) ?? /^#([0-9a-f]{4})$/.exec(t);
  if (long) {
    const c = long[1].length === 4 ? long[1].split('').map((x) => x + x).join('') : long[1];
    const rgb = lireHexa(c.slice(0, 6));
    return rgb ? { rgb: [rgb[0], rgb[1], rgb[2]], alpha: parseInt(c.slice(6), 16) / 255 } : null;
  }
  const hexa = lireHexa(t.startsWith('#') ? t : 'x');
  if (hexa) return { rgb: [hexa[0], hexa[1], hexa[2]], alpha: 1 };
  const fonction = /^(rgba?|hsla?|oklch)\(\s*([^)]*)\)$/.exec(t);
  const corps = fonction ? fonction[2] : /^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(t) ? t : null;
  if (corps === null) return null;
  const [valeurs, alphaTexte] = corps.split('/').map((x) => x.trim());
  const parts = valeurs.split(/[\s,]+/).filter(Boolean);
  let alpha = alphaTexte !== undefined ? nombre(alphaTexte) : 1;
  const genre = fonction ? fonction[1] : 'hsl';
  if (parts.length === 4 && alphaTexte === undefined) alpha = nombre(parts[3]);
  if (parts.length < 3 || [...parts.slice(0, 3), alpha].some((p) => Number.isNaN(typeof p === 'number' ? p : nombre(p)))) return null;
  if (genre.startsWith('rgb')) {
    const canal = (p: string): number => (p.endsWith('%') ? 2.55 * Number(p.slice(0, -1)) : Number(p));
    return { rgb: [borner255(canal(parts[0])), borner255(canal(parts[1])), borner255(canal(parts[2]))], alpha };
  }
  if (genre === 'oklch') {
    const L = parts[0].endsWith('%') ? Number(parts[0].slice(0, -1)) / 100 : Number(parts[0]);
    const rgb = lineaireVersRgb8(oklchVersLineaire({ L, C: Number(parts[1]), H: Number(parts[2].replace('deg', '')) }));
    return { rgb: [rgb[0], rgb[1], rgb[2]], alpha };
  }
  return { rgb: hslVersRgb(Number(parts[0].replace('deg', '')) % 360, nombre(parts[1]), nombre(parts[2])), alpha };
}

/** Compose une couleur translucide sur un fond opaque. */
export function composer(devant: Couleur, fond: [number, number, number]): [number, number, number] {
  const a = Math.min(1, Math.max(0, devant.alpha));
  return [0, 1, 2].map((i) => borner255(a * devant.rgb[i] + (1 - a) * fond[i])) as [number, number, number];
}

/* --------------------------------------------------------- index et fiches */

const normaliser = (t: string): string =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Cherche un composant par `id`, par nom français ou par nom local dans un système. */
export function trouverComposant(index: EntreeIndex[], requete: string): EntreeIndex | null {
  const cle = normaliser(requete);
  if (!cle) return null;
  return index.find((e) => e.id === cle || normaliser(e.nom) === cle)
    ?? index.find((e) => Object.values(e.systemes).some((a) => a !== null && normaliser(a.nom) === cle))
    ?? null;
}

/** Les chaînes de prose d'un objet : celles qui contiennent une espace, hors adresses. */
function prose(valeur: unknown, sortie: string[] = []): string[] {
  if (typeof valeur === 'string') {
    if (/\s/.test(valeur.trim()) && !/^https?:/.test(valeur)) sortie.push(valeur.trim());
  } else if (Array.isArray(valeur)) valeur.forEach((v) => prose(v, sortie));
  else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach((v) => prose(v, sortie));
  return sortie;
}
function fautesDeStyle(origine: string, donnee: unknown): string[] {
  const texte = prose(donnee).join('\n\n');
  return (fautesDuDocument(`${origine}.md`, texte) as { regle: string; extrait: string }[]).map((f) => `${origine} : ${f.regle} ${f.extrait}`);
}

/** Les erreurs d'un index : schéma, systèmes, voisins, motifs. */
export function verifierIndex(ctx: Contexte, index: EntreeIndex[]): string[] {
  const erreurs = erreursDuSchema('index', index).map((e) => `index : ${e}`);
  if (erreurs.length) return erreurs;
  const systemes = chargerSystemes(ctx);
  const ids = new Set<string>();
  for (const e of index) {
    if (ids.has(e.id)) erreurs.push(`index : l'id ${e.id} est en double`);
    ids.add(e.id);
  }
  for (const e of index) {
    for (const v of e.voisins) if (!ids.has(v)) erreurs.push(`${e.id} : le voisin ${v} n'est pas dans l'index`);
    for (const [sid, alias] of Object.entries(e.systemes)) {
      const s = systemes.find((x) => x.id === sid);
      if (!s) {
        erreurs.push(`${e.id} : le système ${sid} n'est pas dans systemes.json`);
        continue;
      }
      for (const motif of alias?.motifs ?? []) {
        let regle: RegExp;
        try { regle = new RegExp(motif); } catch { erreurs.push(`${e.id} / ${sid} : motif invalide ${motif}`); continue; }
        if (!s.tokens) erreurs.push(`${e.id} / ${sid} : un motif exige un système au rôle tokens`);
        else if (!nomsDe(ctx, s).some((n) => regle.test(n.nom))) erreurs.push(`${e.id} / ${sid} : le motif ${motif} ne trouve aucun nom`);
      }
    }
  }
  return erreurs;
}

/** Les erreurs des fiches d'un composant : schéma, alias, tokens, style. */
export function verifierFiches(ctx: Contexte, id: string): string[] {
  const index = chargerIndex(ctx);
  const entree = index.find((e) => e.id === id);
  if (!entree) return [`${id} : absent de l'index`];
  const systemes = chargerSystemes(ctx);
  const erreurs: string[] = [];
  for (const { fichier, fiche } of fichesDe(ctx, id)) {
    const nom = `${id}/${path.basename(fichier)}`;
    const schema = erreursDuSchema('fiche', fiche);
    if (schema.length) {
      erreurs.push(...schema.map((e) => `${nom} : ${e}`));
      continue;
    }
    if (fiche.composant !== id) erreurs.push(`${nom} : le champ composant vaut ${fiche.composant}`);
    if (`${fiche.systeme}.json` !== path.basename(fichier)) erreurs.push(`${nom} : le champ systeme vaut ${fiche.systeme}`);
    const s = systemes.find((x) => x.id === fiche.systeme);
    if (!s) {
      erreurs.push(`${nom} : le système ${fiche.systeme} n'est pas dans systemes.json`);
      continue;
    }
    if (!s.roles.some((r) => r === 'composants' || r === 'comportement' || r === 'redaction')) {
      erreurs.push(`${nom} : ${s.id} n'a aucun rôle qui admette une fiche`);
    }
    if (entree.systemes[s.id] === null) erreurs.push(`${nom} : l'index dit que ${s.id} n'a pas ce composant`);
    else if (entree.systemes[s.id] === undefined) erreurs.push(`${nom} : l'index ne nomme pas ${s.id} pour ce composant`);
    if (!lireDate(fiche.lu)) erreurs.push(`${nom} : date de lecture invalide ${fiche.lu}`);
    else if (fiche.lu > aujourdhui()) erreurs.push(`${nom} : la date de lecture ${fiche.lu} est dans le futur`);
    if (fiche.tokens?.length) {
      const noms = new Set(nomsDe(ctx, s).map((n) => n.nom));
      if (!s.tokens) erreurs.push(`${nom} : ${s.id} n'a pas de tokens, la table tokens doit rester absente`);
      else if (!s.tableDeTokens) erreurs.push(`${nom} : ${s.id} n'est pas marqué tableDeTokens dans systemes.json, la table tokens doit rester absente`);
      for (const t of fiche.tokens) if (s.tokens && !noms.has(t.token)) erreurs.push(`${nom} : le token ${t.token} n'est pas dans ${s.id}/noms.json`);
    }
    erreurs.push(...fautesDeStyle(nom, { ...fiche, tokens: undefined, pages: undefined }));
  }
  return erreurs;
}

/* ------------------------------------------------------------------ relevé */

const MODE_UNIQUE = 'defaut';

function versionsDe(ctx: Contexte, s: Systeme): string {
  const versions = sourcesDe(ctx).filter((x) => x.systeme === s.id && x.usage !== 'composant').map((x) => x.version);
  return [...new Set(versions)].sort().join(' ; ');
}

/** Le relevé des tokens d'un composant, d'après les motifs de l'index, `noms.json` et `valeurs.json`. */
export function relever(ctx: Contexte, id: string): Releve | null {
  const entree = chargerIndex(ctx).find((e) => e.id === id);
  if (!entree) return null;
  const systemes = chargerSystemes(ctx);
  const sortie: Releve = { composant: id, systemes: {} };
  for (const sid of Object.keys(entree.systemes).sort()) {
    const alias = entree.systemes[sid];
    const s = systemes.find((x) => x.id === sid);
    if (!alias?.motifs?.length || !s?.tokens) continue;
    const regles = alias.motifs.map((m) => new RegExp(m));
    const valeurs = valeursDe(ctx, s);
    const tokens = nomsDe(ctx, s)
      .filter((n) => regles.some((r) => r.test(n.nom)))
      .map((n) => ({
        nom: n.nom,
        type: n.type,
        couche: n.couche,
        valeurs: Object.fromEntries(
          valeurs.filter((v) => v.nom === n.nom).map((v) => [v.mode ?? MODE_UNIQUE, v.resolue] as [string, string | null]),
        ),
      }));
    sortie.systemes[sid] = { version: versionsDe(ctx, s), motifs: alias.motifs, tokens };
  }
  return sortie;
}

export const ecrireReleve = (r: Releve): string => `${JSON.stringify(r, null, 2)}\n`;
const fichierReleve = (ctx: Contexte, id: string): string => path.join(ctx.references, 'composants', id, 'tokens.json');

/* ------------------------------------------------------------- registres */

const TOUS_LES_REGISTRES = [...REGISTRES, ...REGISTRES_ARCHITECTURE];
function termesDuRegistre(id: string): readonly { id: string; toleres?: readonly string[] }[] {
  return TOUS_LES_REGISTRES.find((r) => r.id === id)?.termes ?? [];
}
const ORDRE_DES_ETATS = termesDuRegistre('etats').map((t) => t.id);

/** Dit si `valeur` est un terme du registre, un terme toléré, ou absent. */
function jugerTerme(registre: string, valeur: string): { etat: 'registre' | 'tolere' | 'absent'; prefere?: string } {
  const termes = termesDuRegistre(registre);
  if (termes.some((t) => t.id === valeur)) return { etat: 'registre' };
  const tolere = termes.find((t) => t.toleres?.includes(valeur));
  return tolere ? { etat: 'tolere', prefere: tolere.id } : { etat: 'absent' };
}

/* ------------------------------------------------------------------- rendu */

const esc = (t: unknown): string =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const estSansObjet = (x: unknown): x is SansObjet => !!x && typeof x === 'object' && 'sansObjet' in (x as object);
const sansObjet = (x: SansObjet): string => `<p class="sans-objet">Sans objet : ${esc(x.sansObjet)}</p>`;
const liste = (items: string[]): string => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p class="discret">Aucun point.</p>');
const tableau = (entetes: string[], lignes: string[][]): string =>
  `<div class="table-wrap"><table><thead><tr>${entetes.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    lignes.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

interface Calcul {
  ctx: Contexte;
  guide: Guide;
  index: EntreeIndex[];
  entree: EntreeIndex;
  systemes: Systeme[];
  fiches: Map<string, Fiche>;
  /** Systèmes au rôle composants qui ont une fiche : le `m` des comptes. */
  m: string[];
  alertes: string[];
}

const nomDuSysteme = (c: Calcul, id: string): string => c.systemes.find((s) => s.id === id)?.nom ?? id;
const tagSysteme = (c: Calcul, id: string): string => `<span class="tag${c.m.includes(id) ? '' : ' autre'}">${esc(nomDuSysteme(c, id))}</span>`;
const accord = (c: Calcul, ids: string[]): string => {
  const n = ids.filter((i) => c.m.includes(i)).length;
  return `<span class="pill n">${n} sur ${c.m.length}</span> ${ids.map((i) => tagSysteme(c, i)).join('')}`;
};
const points = (c: Calcul, items: Point[]): string => liste(items.map((p) => `${esc(p.texte)} ${accord(c, p.systemes)}`));
const parLocal = (c: Calcul, locaux: Record<string, string>, ajout?: (sid: string, local: string) => string): string =>
  Object.keys(locaux).sort().map((sid) => `<span class="tag">${esc(nomDuSysteme(c, sid))} : ${esc(locaux[sid])}${ajout ? esc(ajout(sid, locaux[sid])) : ''}</span>`).join('');

function sectionEntete(c: Calcul): string {
  const lectures = [...c.fiches.values()].map((f) => f.lu).sort();
  return `<dl class="meta"><dt>Composant</dt><dd>${esc(c.entree.nom)} <code>${esc(c.entree.id)}</code></dd>`
    + `<dt>Date du guide</dt><dd>${esc(c.guide.date)}</dd>`
    + `<dt>Gabarit</dt><dd>${GABARIT}</dd>`
    + `<dt>Fiches</dt><dd>${c.fiches.size} (${c.m.length} de systèmes au rôle composants)</dd>`
    + `<dt>Plus ancienne lecture</dt><dd>${lectures.length ? esc(lectures[0]) : 'aucune fiche'}</dd></dl>`;
}

function sectionDefinition(c: Calcul, erreurs: string[]): string {
  const d = c.guide.definition;
  if (estSansObjet(d)) return sansObjet(d);
  for (const v of d.voisins) if (!c.index.some((e) => e.id === v.id)) erreurs.push(`definition : le voisin ${v.id} n'est pas dans l'index`);
  return `<p>${esc(d.resume)}</p><h3>Quand l'utiliser</h3>${liste(d.quandLUtiliser.map(esc))}<h3>Voisins</h3>`
    + tableau(['Voisin', 'Choisir ce voisin si'], d.voisins.map((v) => {
      const e = c.index.find((x) => x.id === v.id);
      return [`${esc(e?.nom ?? v.id)} <code>${esc(v.id)}</code>`, esc(v.choisirSi)];
    }));
}

function sectionNoms(c: Calcul): string {
  const lignes = c.systemes
    .filter((s) => s.roles.some((r) => r === 'composants' || r === 'comportement' || r === 'nommage' || r === 'redaction'))
    .map((s) => {
      const a = c.entree.systemes[s.id];
      if (a === null) return [esc(s.nom), '<span class="pill">absent, vérifié</span>', ''];
      if (a === undefined) return [esc(s.nom), '<span class="pill alerte">non vérifié</span>', ''];
      return [esc(s.nom), esc(a.nom), `<a href="${esc(a.url)}">page</a>${a.note ? ` <span class="discret">${esc(a.note)}</span>` : ''}`];
    });
  return tableau(['Système', 'Nom local', 'Page'], lignes);
}

function sectionAnatomie(c: Calcul): string {
  const a = c.guide.anatomie;
  if (estSansObjet(a)) return sansObjet(a);
  return tableau(['Partie', 'Présence', 'Accord'], a.parties.map((p) => [esc(p.nom), p.obligatoire ? 'obligatoire' : 'facultative', accord(c, p.systemes)]));
}

function sectionVariantes(c: Calcul, alertes: string[]): string {
  const v = c.guide.variantes;
  if (estSansObjet(v)) return sansObjet(v);
  const tableDe = (titre: string, items: Variante[], registre?: string): string => {
    if (!items.length) return '';
    return `<h3>${titre}</h3>${tableau(['Variante', 'Noms dans les systèmes'], items.map((i) => {
      let signe = '';
      if (registre) {
        const j = jugerTerme(registre, i.nom);
        if (j.etat !== 'registre') {
          signe = ` <span class="pill alerte">${j.etat === 'tolere' ? `toléré, le registre dit ${esc(j.prefere)}` : `hors registre des ${registre}`}</span>`;
          alertes.push(`variantes : ${i.nom} ${j.etat === 'tolere' ? `est toléré, le registre dit ${j.prefere}` : `est hors registre des ${registre}`}`);
        }
      }
      return [`${esc(i.nom)}${signe}`, parLocal(c, i.locaux)];
    }))}`;
  };
  const tailles = v.tailles.length
    ? `<h3>Tailles</h3>${tableau(['Taille', 'Nom local et hauteur par système'], v.tailles.map((t) => [
      esc(t.nom),
      parLocal(c, t.locaux, (sid, local) => (c.fiches.get(sid)?.tailles[local] ? ` · ${c.fiches.get(sid)?.tailles[local]}` : '')),
    ]))}`
    : '';
  return tableDe('Emphase', v.emphase) + tableDe('Statut', v.statut, 'statuts') + tailles;
}

function sectionEtats(c: Calcul): string {
  const e = c.guide.etats;
  if (estSansObjet(e)) return sansObjet(e);
  const lignes = [...e].sort((a, b) => {
    const ia = ORDRE_DES_ETATS.indexOf(a.etat);
    const ib = ORDRE_DES_ETATS.indexOf(b.etat);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a.etat < b.etat ? -1 : 1);
  });
  return tableau(['État', 'Ce qui change', 'Accord'], lignes.map((l) => [
    `<code>${esc(l.etat)}</code>${jugerTerme('etats', l.etat).etat === 'absent' ? ' <span class="pill">propre au composant</span>' : ''}`,
    esc(l.ceQuiChange),
    accord(c, l.systemes),
  ]));
}

function sectionClavier(c: Calcul): string {
  const k = c.guide.clavier;
  if (estSansObjet(k)) return sansObjet(k);
  return `<h3>Touches</h3>${tableau(['Touche', 'Effet', 'Accord'], k.touches.map((t) => [`<code>${esc(t.touche)}</code>`, esc(t.effet), accord(c, t.systemes)]))}`
    + `<h3>Focus</h3>${points(c, k.focus)}<h3>Interactions</h3>${points(c, k.interactions)}`;
}

function sectionAccessibilite(c: Calcul): string {
  const a = c.guide.accessibilite;
  if (estSansObjet(a)) return sansObjet(a);
  const ordre = Object.keys(CRITERES);
  return `<dl class="meta"><dt>Rôle ARIA</dt><dd><code>${esc(a.aria.role)}</code></dd>`
    + `<dt>Attributs</dt><dd>${a.aria.attributs.map((x) => `<code>${esc(x)}</code>`).join(' ') || 'aucun'}</dd>`
    + `<dt>Nom accessible</dt><dd>${esc(a.aria.nomAccessible)}</dd></dl>`
    + `<h3>Critères WCAG 2.2</h3>${tableau(['Critère', 'S’applique', 'Exigence', 'Pratique relevée'],
      [...a.criteres].sort((x, y) => ordre.indexOf(x.critere) - ordre.indexOf(y.critere)).map((k) => [
        `<code>${esc(k.critere)}</code> ${esc(CRITERES[k.critere] ?? '')}`,
        k.sApplique ? '<span class="pill ok">oui</span>' : '<span class="pill">non</span>',
        esc(k.exigence),
        esc(k.pratique),
      ]))}`;
}

function sectionRedaction(c: Calcul): string {
  const r = c.guide.redaction;
  return estSansObjet(r) ? sansObjet(r) : points(c, r.regles);
}

/* ------------------------------------------------------------------ nuancier */

type Teinte = { texte: string; css: string } | null;
interface MesureDeMode {
  fond: Teinte;
  texte: Teinte;
  texteFond: number | null;
  fondPage: number | null;
  contourPage: number | null;
}

/** La valeur résolue d'un token dans un mode, ou `null` quand le système ne la publie pas. */
function valeurDuToken(ctx: Contexte, s: Systeme, nom: string, mode: string | null): LigneDeValeurs | null {
  const lignes = valeursDe(ctx, s).filter((v) => v.nom === nom);
  return lignes.find((v) => v.mode === mode) ?? lignes.find((v) => v.mode === null) ?? null;
}

function couleurDuToken(ctx: Contexte, s: Systeme, nom: string, mode: string | null, sur: [number, number, number] | null): { texte: string; rgb: [number, number, number] | null } | null {
  const ligne = valeurDuToken(ctx, s, nom, mode);
  if (!ligne?.resolue) return null;
  const base = lireCouleur(ligne.resolue);
  if (!base) return { texte: ligne.resolue, rgb: null };
  const alpha = ligne.alpha !== undefined ? base.alpha * ligne.alpha : base.alpha;
  if (alpha < 1 && !sur) return { texte: ligne.resolue, rgb: null };
  return { texte: ligne.alpha !== undefined ? `${ligne.resolue}, opacité ${ligne.alpha}` : ligne.resolue, rgb: alpha < 1 && sur ? composer({ rgb: base.rgb, alpha }, sur) : base.rgb };
}

const rapport = (a: [number, number, number] | null, b: [number, number, number] | null): number | null => (a && b ? contraste(a, b) : null);

function mesurer(ctx: Contexte, s: Systeme, jetons: JetonDeFiche[], mode: 'light' | 'dark'): MesureDeMode | null {
  const m = s.modes?.[mode];
  if (!m) return null;
  const page = m.page ? couleurDuToken(ctx, s, m.page, m.nom, null)?.rgb ?? null : null;
  const de = (roles: string[]): { texte: string; rgb: [number, number, number] | null } | null => {
    const j = jetons.find((x) => roles.includes(x.role));
    return j ? couleurDuToken(ctx, s, j.token, m.nom, null) : null;
  };
  const fondBrut = jetons.find((x) => x.role === 'background');
  const fond = fondBrut ? couleurDuToken(ctx, s, fondBrut.token, m.nom, page) : null;
  const jetonTexte = jetons.find((x) => x.role === 'foreground' || x.role === 'text');
  const texte = jetonTexte ? couleurDuToken(ctx, s, jetonTexte.token, m.nom, fond?.rgb ?? page) : null;
  const contour = de(['border', 'ring']);
  const teinte = (x: { texte: string; rgb: [number, number, number] | null } | null): Teinte =>
    x ? { texte: x.texte, css: x.rgb ? `rgb(${x.rgb.join(',')})` : '' } : null;
  return {
    fond: teinte(fond),
    texte: teinte(texte),
    texteFond: rapport(texte?.rgb ?? null, fond?.rgb ?? null),
    fondPage: rapport(fond?.rgb ?? null, page),
    contourPage: rapport(contour?.rgb ?? null, page),
  };
}

const mesure = (nom: string, v: number | null, seuil: number): string => {
  if (v === null) return `<span class="mesure">${nom} —</span>`;
  const atteint = atteintLeSeuil(v, seuil);
  return `<span class="mesure">${nom} ${ecrireContraste(v)} <span class="pill ${atteint ? 'ok' : 'alerte'}">${atteint ? '≥' : '&lt;'} ${String(seuil).replace('.', ',')}</span></span>`;
};
const pastille = (t: Teinte): string => (t?.css ? `<span class="sw" style="background:${t.css}"></span>` : '');

function celluleDuNuancier(c: Calcul, s: Systeme, jetons: JetonDeFiche[]): string {
  if (!jetons.length) return '<span class="discret">aucun token</span>';
  return (['light', 'dark'] as const).map((mode) => {
    const m = mesurer(c.ctx, s, jetons, mode);
    if (!m) return `<span class="cellule"><span class="mode">${mode}</span><span class="mesure">mode non publié</span></span>`;
    return `<span class="cellule"><span class="mode"><strong>${mode}</strong></span>`
      + `<span class="mode">${pastille(m.fond)}${m.fond ? esc(m.fond.texte) : 'fond non résolu'}</span>`
      + `<span class="mode">${pastille(m.texte)}${m.texte ? esc(m.texte.texte) : 'texte non résolu'}</span>`
      + `${mesure('texte/fond', m.texteFond, 4.5)}${mesure('fond/page', m.fondPage, 3)}${m.contourPage !== null ? mesure('contour/page', m.contourPage, 3) : ''}</span>`;
  }).join('');
}

function nuancier(c: Calcul): string {
  const avecTable = [...c.fiches.values()].filter((f) => f.tokens?.length && c.m.includes(f.systeme)).sort((a, b) => (a.systeme < b.systeme ? -1 : 1));
  const sans = c.m.filter((id) => !avecTable.some((f) => f.systeme === id));
  const sansTable = sans.length
    ? `<p class="discret">Pas de tokens de composant : ${sans.map((id) => tagSysteme(c, id)).join('')}</p>`
    : '';
  if (!avecTable.length) return `<p class="discret">Aucun système n'a de table de tokens de composant pour ce composant.</p>${sansTable}`;

  const v = c.guide.variantes;
  const lignesDeVariantes: Variante[] = !estSansObjet(v) && (v.emphase.length || v.statut.length)
    ? [...v.emphase, ...v.statut]
    : [...new Set(avecTable.flatMap((f) => f.tokens!.map((t) => t.variante)).filter((x) => x !== '*'))].sort().map((nom) => ({ nom, locaux: {} }));
  const etatsPresents = [...new Set(avecTable.flatMap((f) => f.tokens!.map((t) => t.etat)))];
  etatsPresents.sort((a, b) => {
    const ia = ORDRE_DES_ETATS.indexOf(a);
    const ib = ORDRE_DES_ETATS.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a < b ? -1 : 1);
  });
  const entetes = ['État', ...avecTable.map((f) => esc(nomDuSysteme(c, f.systeme)))];
  const blocs = lignesDeVariantes.map((variante) => {
    const lignes = etatsPresents.map((etat) => [
      `<code>${esc(etat)}</code>`,
      ...avecTable.map((f) => {
        const s = c.systemes.find((x) => x.id === f.systeme)!;
        const local = variante.locaux[f.systeme] ?? variante.nom;
        const jetons = f.tokens!.filter((t) => t.etat === etat && (t.variante === local || t.variante === '*'));
        return celluleDuNuancier(c, s, jetons);
      }),
    ]);
    return `<h3>${esc(variante.nom)}</h3>${tableau(entetes, lignes)}`;
  });
  return `${blocs.join('')}${sansTable}`;
}

function relevesDeTokens(c: Calcul): string {
  const releve = relever(c.ctx, c.entree.id);
  const entrees = Object.entries(releve?.systemes ?? {});
  if (!entrees.length) return '<p class="discret">Aucun motif de token dans l\'index pour ce composant.</p>';
  return entrees.map(([sid, r]) => {
    const s = c.systemes.find((x) => x.id === sid)!;
    const modes = [...new Set(r.tokens.flatMap((t) => Object.keys(t.valeurs)))].sort();
    const lignes = r.tokens.map((t) => [
      `<code>${esc(t.nom)}</code>`,
      esc(t.couche ?? '—'),
      modes.map((m) => {
        const val = t.valeurs[m];
        const col = lireCouleur(val ?? null);
        return `<span class="tag">${esc(m)} : ${col ? `<span class="sw" style="background:rgb(${col.rgb.join(',')})"></span>` : ''}${esc(val ?? '—')}</span>`;
      }).join(''),
    ]);
    return `<details><summary>${esc(s.nom)} : ${r.tokens.length} tokens (${esc(r.version)})</summary>`
      + `<p class="discret">Motifs : ${r.motifs.map((m) => `<code>${esc(m)}</code>`).join(' ')}</p>${tableau(['Token', 'Couche', 'Valeurs résolues'], lignes)}</details>`;
  }).join('');
}

function proposition(c: Calcul, alertes: string[]): string {
  const p = c.guide.proposition;
  if (estSansObjet(p)) return sansObjet(p);
  const registreDe: Record<string, string> = { statut: 'statuts', taille: 'tailles', etat: 'etats', role: 'roles' };
  return tableau(['Nom UCM proposé', 'Note', 'Signalement'], p.map((item) => {
    const nom = `components/${c.entree.id}/${item.segments.map((s) => s.valeur).join('/')}`;
    const signes = item.segments.flatMap((s) => {
      const registre = registreDe[s.genre];
      if (!registre) return [];
      const j = jugerTerme(registre, s.valeur);
      if (j.etat === 'registre') return [];
      const message = j.etat === 'tolere' ? `${s.valeur} est toléré, le registre dit ${j.prefere}` : `${s.valeur} est absent du registre des ${registre}`;
      alertes.push(`proposition ${nom} : ${message}`);
      return [`<span class="pill alerte">${esc(message)}</span>`];
    });
    return [`<code>${esc(nom)}</code>`, esc(item.note ?? ''), signes.join(' ')];
  }));
}

function sectionTokens(c: Calcul, alertes: string[]): string {
  return `<h3>Relevé par système</h3>${relevesDeTokens(c)}<h3>Nuancier comparé</h3>${nuancier(c)}<h3>Proposition de tokens UCM</h3>${proposition(c, alertes)}`;
}

function sectionChoix(c: Calcul, erreurs: string[]): string {
  const ch = c.guide.choix;
  if (estSansObjet(ch)) return sansObjet(ch);
  return ch.map((q, i) => {
    for (const [sid, option] of Object.entries(q.systemes)) {
      if (!(option in q.options)) erreurs.push(`choix ${i + 1} : ${sid} cite l'option ${option}, qui n'existe pas`);
    }
    const lignes = Object.keys(q.options).sort().map((cle) => [
      `<code>${esc(cle)}</code>`,
      esc(q.options[cle]),
      accord(c, Object.keys(q.systemes).filter((sid) => q.systemes[sid] === cle).sort()),
    ]);
    const non = c.m.filter((id) => !(id in q.systemes));
    return `<h3>${esc(q.question)}</h3>${tableau(['Option', 'Description', 'Systèmes'], lignes)}`
      + (non.length ? `<p class="discret">Non documenté : ${non.map((id) => tagSysteme(c, id)).join('')}</p>` : '');
  }).join('') || '<p class="discret">Aucun choix divergent.</p>';
}

const CATEGORIES_DE_RAPPELS: [keyof Extract<Guide['rappels'], Record<string, Point[]>>, string][] = [
  ['regle', 'Règle'], ['etat', 'État'], ['comportement', 'Comportement'], ['accessibilite', 'Accessibilité'], ['redaction', 'Rédaction'], ['tokens', 'Tokens'],
];
function sectionRappels(c: Calcul): string {
  const r = c.guide.rappels;
  if (estSansObjet(r)) return sansObjet(r);
  return CATEGORIES_DE_RAPPELS.map(([cle, titre]) => `<h3>${titre}</h3>${points(c, r[cle])}`).join('');
}

function sectionExemples(c: Calcul): string {
  const e = c.guide.exemples;
  if (!e.length) return '<p class="discret">Aucune idée retenue.</p>';
  return liste(e.map((x) => `${esc(x.idee)} ${tagSysteme(c, x.systeme)} <a href="${esc(x.source)}">source</a>`));
}

function sectionQuestions(c: Calcul): string {
  return tableau(['Question', 'Options', 'Ce qui en dépend'], c.guide.questions.map((q) => [esc(q.question), liste(q.options.map(esc)), esc(q.dependDe)]));
}

function sectionSources(c: Calcul): string {
  const fiches = [...c.fiches.values()].sort((a, b) => (a.systeme < b.systeme ? -1 : 1));
  const absences = c.guide.absences ?? [];
  const sources = sourcesDe(c.ctx);
  const systemesLus = new Set([...fiches.map((f) => f.systeme), ...Object.keys(relever(c.ctx, c.entree.id)?.systemes ?? {})]);
  const fichiers = sources.filter((s) => systemesLus.has(s.systeme))
    .sort((a, b) => (a.systeme + a.originalPath < b.systeme + b.originalPath ? -1 : 1));
  const kit = lireSiPresent<{ version?: string }>(path.join(c.ctx.racine, 'packages', 'kit', 'package.json'), {}).version ?? 'inconnue';
  return `<h3>Fiches</h3>${tableau(['Système', 'Lue le', 'Pages'], fiches.map((f) => [
    esc(nomDuSysteme(c, f.systeme)), esc(f.lu), f.pages.map((p) => `<a href="${esc(p)}">${esc(p)}</a>`).join('<br>'),
  ]))}`
    + (absences.length ? `<h3>Fiches absentes ou anciennes</h3>${liste(absences.map((a) => `${tagSysteme(c, a.systeme)} ${esc(a.raison)}`))}` : '')
    + `<h3>Fichiers de tokens</h3>${fichiers.length ? tableau(['Système', 'Fichier', 'Version', 'SHA-256'], fichiers.map((s) => [
      esc(nomDuSysteme(c, s.systeme)), `<code>${esc(s.originalPath)}</code>${s.usage ? ' <span class="pill">composant</span>' : ''}`, esc(s.version), `<code>${esc(s.sha256)}</code>`,
    ])) : '<p class="discret">Aucun fichier de tokens lu.</p>'}`
    + `<h3>Registres</h3><p>Version du kit des registres : <code>${esc(kit)}</code>.</p>`;
}

/* ------------------------------------------------------------- orchestration */

export interface Rendu { erreurs: string[]; alertes: string[]; html: string | null }

/** Valide un guide et en calcule le HTML. Aucune lecture de l'horloge. */
export function calculerGuide(ctx: Contexte, id: string): Rendu {
  const fichierGuide = path.join(ctx.references, 'analyses', `${id}.json`);
  if (!existsSync(fichierGuide)) return { erreurs: [`analyses/${id}.json : fichier absent`], alertes: [], html: null };
  const guide = lireJson<Guide>(fichierGuide);
  const erreurs = erreursDuSchema('guide', guide).map((e) => `analyses/${id}.json : ${e}`);
  if (erreurs.length) return { erreurs, alertes: [], html: null };

  const index = chargerIndex(ctx);
  const erreursIndex = verifierIndex(ctx, index);
  if (erreursIndex.length) return { erreurs: erreursIndex, alertes: [], html: null };
  const entree = index.find((e) => e.id === id);
  if (!entree) return { erreurs: [`${id} : absent de l'index`], alertes: [], html: null };
  if (guide.gabarit !== GABARIT) erreurs.push(`gabarit ${guide.gabarit} : le script rend le gabarit ${GABARIT}`);
  if (guide.composant !== id) erreurs.push(`le champ composant vaut ${guide.composant}`);
  if (!lireDate(guide.date)) erreurs.push(`date invalide ${guide.date}`);

  const systemes = chargerSystemes(ctx);
  const erreursDeFiche = verifierFiches(ctx, id);
  erreurs.push(...erreursDeFiche);
  const fiches = new Map(fichesDe(ctx, id).map(({ fiche }) => [fiche.systeme, fiche] as [string, Fiche]));
  const roleComposants = (sid: string): boolean => !!systemes.find((s) => s.id === sid)?.roles.includes('composants');
  const m = [...fiches.keys()].filter(roleComposants).sort();
  const c: Calcul = { ctx, guide, index, entree, systemes, fiches, m, alertes: [] };

  const connu = (sid: string, ou: string): void => {
    if (!systemes.some((s) => s.id === sid)) erreurs.push(`${ou} : le système ${sid} n'est pas dans systemes.json`);
  };
  const ids: [string, string[]][] = [];
  const g = guide;
  if (!estSansObjet(g.anatomie)) g.anatomie.parties.forEach((p) => ids.push(['anatomie', p.systemes]));
  if (!estSansObjet(g.variantes)) [...g.variantes.emphase, ...g.variantes.statut, ...g.variantes.tailles].forEach((v) => ids.push(['variantes', Object.keys(v.locaux)]));
  if (!estSansObjet(g.etats)) g.etats.forEach((e) => ids.push(['etats', e.systemes]));
  if (!estSansObjet(g.clavier)) {
    g.clavier.touches.forEach((t) => ids.push(['clavier', t.systemes]));
    [...g.clavier.focus, ...g.clavier.interactions].forEach((p) => ids.push(['clavier', p.systemes]));
  }
  if (!estSansObjet(g.redaction)) g.redaction.regles.forEach((p) => ids.push(['redaction', p.systemes]));
  if (!estSansObjet(g.choix)) g.choix.forEach((q) => ids.push(['choix', Object.keys(q.systemes)]));
  if (!estSansObjet(g.rappels)) Object.values(g.rappels).forEach((pts) => pts.forEach((p) => ids.push(['rappels', p.systemes])));
  g.exemples.forEach((x) => ids.push(['exemples', [x.systeme]]));
  (g.absences ?? []).forEach((a) => ids.push(['absences', [a.systeme]]));
  for (const [ou, liste_] of ids) liste_.forEach((sid) => connu(sid, ou));

  const absents = new Set((g.absences ?? []).map((a) => a.systeme));
  for (const s of systemes.filter((x) => x.roles.includes('composants') && entree.systemes[x.id])) {
    const f = fiches.get(s.id);
    if (!f && !absents.has(s.id)) erreurs.push(`${s.id} : alias non nul dans l'index, sans fiche ni raison dans absences`);
    else if (f && moisEntre(f.lu, g.date) > MOIS_DE_VALIDITE && !absents.has(s.id)) {
      erreurs.push(`${s.id} : fiche lue le ${f.lu}, plus de ${MOIS_DE_VALIDITE} mois avant le guide, sans raison dans absences`);
    }
  }

  const alertes: string[] = [];
  const sections: Record<(typeof ANCRES)[number], string> = {
    entete: sectionEntete(c),
    definition: sectionDefinition(c, erreurs),
    noms: sectionNoms(c),
    anatomie: sectionAnatomie(c),
    variantes: sectionVariantes(c, alertes),
    etats: sectionEtats(c),
    clavier: sectionClavier(c),
    accessibilite: sectionAccessibilite(c),
    redaction: sectionRedaction(c),
    tokens: sectionTokens(c, alertes),
    choix: sectionChoix(c, erreurs),
    rappels: sectionRappels(c),
    exemples: sectionExemples(c),
    questions: sectionQuestions(c),
    sources: sectionSources(c),
  };
  erreurs.push(...fautesDeStyle(`analyses/${id}`, guide));
  if (erreurs.length) return { erreurs, alertes, html: null };

  let html = readFileSync(path.join(DOSSIER, 'gabarit.html'), 'utf8')
    .replace(/\{\{titre\}\}/g, esc(entree.nom))
    .replace(/\{\{gabarit\}\}/g, String(GABARIT));
  for (const ancre of ANCRES) html = html.replace(`<!-- @@${ancre}@@ -->`, () => sections[ancre]);
  if (html.includes('@@')) return { erreurs: ['gabarit : une ancre reste sans contenu'], alertes, html: null };
  return { erreurs: [], alertes, html };
}

const fichierHtml = (ctx: Contexte, id: string): string => path.join(ctx.references, 'analyses', `${id}.html`);

/* --------------------------------------------------------------------- état */

/** Ce qui existe pour un composant, à la date `date`. */
export function etat(ctx: Contexte, requete: string, date: string = aujourdhui()): { texte: string; trouve: boolean } {
  const index = chargerIndex(ctx);
  const entree = trouverComposant(index, requete);
  if (!entree) {
    const cle = normaliser(requete);
    const proches = index.filter((e) => cle && (e.id.includes(cle) || normaliser(e.nom).includes(cle))).map((e) => e.id);
    return {
      trouve: false,
      texte: `« ${requete} » : absent de l'index (${index.length} composants indexés).${proches.length ? ` Proches : ${proches.join(', ')}.` : ''}\n`
        + 'Étape suivante : écrire son entrée dans composants/index.json (id, définition, voisins, alias, motifs).\n',
    };
  }
  const systemes = chargerSystemes(ctx);
  const fiches = new Map(fichesDe(ctx, entree.id).map(({ fiche }) => [fiche.systeme, fiche] as [string, Fiche]));
  const lignes = [`Composant : ${entree.id} (${entree.nom}), dans l'index.`, 'Fiches :'];
  for (const s of systemes.filter((x) => x.roles.some((r) => r === 'composants' || r === 'comportement' || r === 'redaction'))) {
    const a = entree.systemes[s.id];
    const f = fiches.get(s.id);
    let statut: string;
    if (a === null) statut = 'sans ce composant (vérifié)';
    else if (a === undefined) statut = 'non vérifié dans l\'index';
    else if (!f) statut = `fiche absente, alias « ${a.nom} »`;
    else {
      const mois = moisEntre(f.lu, date);
      statut = `fiche lue le ${f.lu}${mois > MOIS_DE_VALIDITE ? `, ANCIENNE (${mois} mois)` : ` (${mois} mois)`}`;
    }
    lignes.push(`  ${s.id.padEnd(14)} ${s.roles.filter((r) => r !== 'tokens').join('+').padEnd(26)} ${statut}`);
  }
  const releve = relever(ctx, entree.id);
  const fichier = fichierReleve(ctx, entree.id);
  const motifs = releve ? Object.keys(releve.systemes).length : 0;
  lignes.push(`Relevé de tokens : ${!existsSync(fichier) ? (motifs ? 'absent, à écrire avec relever' : 'aucun motif dans l\'index') : readFileSync(fichier, 'utf8') === ecrireReleve(releve!) ? 'à jour' : 'périmé, relancer relever'} (${motifs} systèmes avec motifs).`);
  const guide = path.join(ctx.references, 'analyses', `${entree.id}.json`);
  if (!existsSync(guide)) lignes.push('Guide : absent.');
  else {
    const rendu = calculerGuide(ctx, entree.id);
    const html = fichierHtml(ctx, entree.id);
    lignes.push(`Guide : analyses/${entree.id}.json présent, ${rendu.erreurs.length ? `${rendu.erreurs.length} erreurs au rendu` : !existsSync(html) ? 'HTML absent' : readFileSync(html, 'utf8') === rendu.html ? 'HTML à jour' : 'HTML périmé, relancer rendre'}.`);
  }
  return { trouve: true, texte: `${lignes.join('\n')}\n` };
}

/* ---------------------------------------------------------------------- CLI */

function idsVises(ctx: Contexte, argument: string | undefined): string[] {
  if (argument === '--tous') return chargerIndex(ctx).map((e) => e.id);
  return argument ? [argument] : [];
}

export function lancer(args: string[], ctx: Contexte = CONTEXTE_REEL): number {
  const [commande, ...reste] = args;
  if (commande === 'etat') {
    const r = etat(ctx, reste.join(' '));
    process.stdout.write(r.texte);
    return 0;
  }
  if (commande === 'relever' || commande === 'verifier' || commande === 'rendre') {
    const ids = idsVises(ctx, reste[0]);
    if (!ids.length) {
      process.stderr.write(`Usage : guide.ts ${commande} <id> | --tous\n`);
      return 2;
    }
    let echec = 0;
    if (commande === 'verifier') {
      const erreursIndex = verifierIndex(ctx, chargerIndex(ctx));
      erreursIndex.forEach((e) => process.stderr.write(`${e}\n`));
      if (erreursIndex.length) echec = 1;
    }
    for (const id of ids) {
      if (commande === 'relever') {
        const r = relever(ctx, id);
        if (!r) {
          process.stderr.write(`${id} : absent de l'index\n`);
          echec = 1;
          continue;
        }
        mkdirSync(path.dirname(fichierReleve(ctx, id)), { recursive: true });
        writeFileSync(fichierReleve(ctx, id), ecrireReleve(r));
        process.stdout.write(`${id} : ${Object.keys(r.systemes).length} systèmes, ${Object.values(r.systemes).reduce((n, s) => n + s.tokens.length, 0)} tokens\n`);
      } else if (commande === 'verifier') {
        const erreurs = verifierFiches(ctx, id);
        erreurs.forEach((e) => process.stderr.write(`${e}\n`));
        if (erreurs.length) echec = 1;
        else process.stdout.write(`${id} : fiches valides\n`);
      } else {
        const rendu = calculerGuide(ctx, id);
        rendu.alertes.forEach((a) => process.stdout.write(`Signalement : ${a}\n`));
        if (rendu.html === null) {
          rendu.erreurs.forEach((e) => process.stderr.write(`${e}\n`));
          echec = 1;
          continue;
        }
        mkdirSync(path.dirname(fichierHtml(ctx, id)), { recursive: true });
        writeFileSync(fichierHtml(ctx, id), rendu.html);
        process.stdout.write(`${id} : analyses/${id}.html écrit\n`);
      }
    }
    return echec;
  }
  process.stderr.write('Usage : guide.ts etat <nom> | relever <id> | verifier <id> | rendre <id>\n');
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = lancer(process.argv.slice(2));
}
