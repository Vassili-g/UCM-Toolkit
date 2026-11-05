/**
 * Guides de composants : lit les trois couches de `docs/references/` et rend
 * un guide HTML par composant.
 *
 *   npx tsx docs/references/_outils/guide.ts etat <nom>
 *   npx tsx docs/references/_outils/guide.ts relever <id> | --tous
 *   npx tsx docs/references/_outils/guide.ts verifier <id> | --tous
 *   npx tsx docs/references/_outils/guide.ts carte <id>
 *   npx tsx docs/references/_outils/guide.ts rendre <id> | --tous
 *
 * `etat` dit ce qui existe pour un nom de composant, à la date du jour : c'est
 * la seule commande qui lit l'horloge. `carte` est la seule qui lit le réseau :
 * elle demande à JSPM la table d'imports de chaque scène et l'enregistre à côté
 * d'elle. `relever`, `verifier` et `rendre` ne dépendent que des fichiers, pour
 * qu'un test refuse un relevé ou une page qui ne suit plus ses données.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import { fautesDuDocument } from '../../../scripts/controle-style.mjs';

/** Version du gabarit : un guide rendu pour une autre version est périmé. */
export const GABARIT = 2;

/** Les sections, dans l'ordre du gabarit. */
export const ANCRES = ['galerie', 'comprendre', 'dessiner', 'questions', 'sources'] as const;

/** Au-delà, une fiche est ancienne : `etat` la signale, `rendre` la refuse sans raison écrite. */
export const MOIS_DE_VALIDITE = 12;

/** Le générateur de tables d'imports : il résout tout l'arbre des dépendances vers une seule version de chaque paquet. */
const GENERATEUR = 'https://api.jspm.io/generate';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const REFERENCES = path.resolve(DOSSIER, '..');
const RACINE = path.resolve(REFERENCES, '..', '..');

export interface Contexte {
  /** `docs/references`, ou un dossier de même forme. */
  references: string;
  /** Racine du dépôt. */
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
   * en fichier.
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

export interface Cas { id: string; titre: string; largeur?: number }
export interface Carte {
  id: string;
  composant: string;
  paquets: string[];
  points: string[];
  note?: string;
}
export interface Guide {
  gabarit: number;
  composant: string;
  date: string;
  resume: string;
  cas: Cas[];
  galerie: Carte[];
  absences?: { systeme: string; raison: string }[];
  comprendre: { titre: string; constat: string; options: { nom: string; detail: string; systemes: string[] }[]; decider: string }[];
  dessiner: {
    tableaux: { titre: string; colonnes: string[]; lignes: { nom: string; cellules: string[]; pourquoi: string }[]; note?: string }[];
    proprietes: { nom: string; valeurs: string; note: string }[];
  };
  questions: { question: string; options: string[]; dependDe: string }[];
}
// Le JSON nomme le système `systeme` ; le type le relit sous ce nom.
type CarteJson = Omit<Carte, 'id'> & { systeme: string };
type GuideJson = Omit<Guide, 'galerie'> & { galerie: CarteJson[] };

/** Ce que `carte` enregistre pour une scène : la table d'imports et les feuilles que ses modules importent. */
export interface TableDImports {
  paquets: string[];
  installe: string[];
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
  feuilles: string[];
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

/* --------------------------------------------------------- index et fiches */

const normaliser = (t: string): string =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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

/* ------------------------------------------------------------------ scènes */

const dossierDesScenes = (ctx: Contexte): string => path.join(ctx.references, '_outils', 'scenes');
const fichierScene = (ctx: Contexte, id: string, systeme: string): string => path.join(dossierDesScenes(ctx), id, `${systeme}.js`);
const fichierTable = (ctx: Contexte, id: string, systeme: string): string => path.join(dossierDesScenes(ctx), id, `${systeme}.carte.json`);

/** Sépare `@scope/nom@1.2.3` en nom et version. */
function lirePaquet(paquet: string): { nom: string; version: string } {
  const i = paquet.lastIndexOf('@');
  return { nom: paquet.slice(0, i), version: paquet.slice(i + 1) };
}

/** Les spécificateurs nus qu'une scène importe : `react`, `antd`, `@react-spectrum/s2/icons/ViewList`. */
export function importsDeScene(code: string): string[] {
  const vus = new Set<string>();
  for (const m of code.matchAll(/^\s*import\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm)) {
    if (!/^(\.|\/|[a-z]+:)/.test(m[1])) vus.add(m[1]);
  }
  return [...vus];
}

/** Ce qu'il faut demander au générateur : chaque import, rattaché à la version figée de son paquet. */
export function aInstaller(code: string, paquets: string[]): { installe: string[]; erreurs: string[] } {
  const connus = paquets.map(lirePaquet).sort((a, b) => b.nom.length - a.nom.length);
  const installe: string[] = [];
  const erreurs: string[] = [];
  for (const specificateur of importsDeScene(code)) {
    const p = connus.find((x) => specificateur === x.nom || specificateur.startsWith(`${x.nom}/`));
    if (!p) erreurs.push(`l'import ${specificateur} ne correspond à aucun paquet déclaré`);
    else installe.push(`${p.nom}@${p.version}${specificateur.slice(p.nom.length)}`);
  }
  return { installe: installe.sort(), erreurs };
}

/** Les versions qu'une scène écrit en dur dans une adresse (`npm:paquet@1.2.3`) : elles doivent suivre les paquets déclarés. */
function versionsEnDur(code: string): string[] {
  return [...code.matchAll(/npm:((?:@[a-z0-9-._~]+\/)?[a-z0-9-._~]+@\d+\.\d+\.\d+)/g)].map((m) => m[1]);
}

const echapperScript = (code: string): string => code.replace(/<\/script/gi, '<\\/script');

/**
 * Le document d'une scène, en un seul fichier : sa table d'imports, la coquille
 * commune, les données du composant, puis la scène. Les imports de feuilles CSS
 * sont remplacés par un module qui lie la feuille, parce qu'un navigateur refuse
 * un `.css` chargé comme module ; `process` est défini pour les paquets qui le
 * lisent, comme le ferait un bundler.
 */
function documentDeScene(ctx: Contexte, id: string, systeme: string, cas: Cas[], table: TableDImports): string {
  const imports: Record<string, string> = { ...table.imports };
  for (const f of table.feuilles) {
    imports[f] = `data:text/javascript,${encodeURIComponent(`const l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(f)};document.head.append(l);`)}`;
  }
  const carte = JSON.stringify({ imports, ...(table.scopes ? { scopes: table.scopes } : {}) });
  const commun = path.join(dossierDesScenes(ctx), id, 'commun.js');
  const code = [
    `const CAS = ${JSON.stringify(cas)};`,
    readFileSync(path.join(dossierDesScenes(ctx), 'scene.js'), 'utf8'),
    existsSync(commun) ? readFileSync(commun, 'utf8') : '',
    readFileSync(fichierScene(ctx, id, systeme), 'utf8'),
  ].join('\n');
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
    + `<script type="importmap">${echapperScript(carte)}</script>`
    + '<script>globalThis.process = { env: { NODE_ENV: "production" } };</script>'
    + `</head><body><script type="module">${echapperScript(code)}</script></body></html>`;
}

/* ------------------------------------------------------------------- rendu */

const esc = (t: unknown): string =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tableau = (entetes: string[], lignes: string[][]): string =>
  `<div class="table-wrap"><table><thead><tr>${entetes.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    lignes.map((l) => `<tr>${l.join('')}</tr>`).join('')}</tbody></table></div>`;
const td = (contenu: string, classe = ''): string => `<td${classe ? ` class="${classe}"` : ''}>${contenu}</td>`;

interface Calcul {
  ctx: Contexte;
  guide: Guide;
  entree: EntreeIndex;
  systemes: Systeme[];
  fiches: Map<string, Fiche>;
  tables: Map<string, TableDImports>;
}

const nomDuSysteme = (c: Calcul, id: string): string => c.systemes.find((s) => s.id === id)?.nom ?? id;
const lienSysteme = (c: Calcul, id: string): string => `<a href="#${esc(id)}">${esc(nomDuSysteme(c, id))}</a>`;

function sectionGalerie(c: Calcul): string {
  const cartes = c.guide.galerie.map((g) => {
    const document = documentDeScene(c.ctx, c.guide.composant, g.id, c.guide.cas, c.tables.get(g.id)!);
    return `<article class="systeme" id="${esc(g.id)}"><header><h3>${esc(nomDuSysteme(c, g.id))}</h3>`
      + `<span class="paquets">${esc(g.composant)} · ${g.paquets.map(esc).join(' · ')}</span></header>`
      + `<div class="scene"><iframe title="${esc(`${g.composant}, ${nomDuSysteme(c, g.id)}`)}" srcdoc="${esc(document)}"></iframe></div>`
      + `<ol>${g.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`
      + (g.note ? `<p class="note">${esc(g.note)}</p>` : '')
      + '</article>';
  });
  const absences = (c.guide.absences ?? []).map((a) => `<article class="systeme absent" id="${esc(a.systeme)}">`
    + `<header><h3>${esc(nomDuSysteme(c, a.systeme))}</h3><span class="paquets">${esc(c.entree.systemes[a.systeme]?.nom ?? '')}</span></header>`
    + `<p>${esc(a.raison)}</p></article>`);
  const titres = c.guide.cas.map((x) => x.titre.toLowerCase()).join(', ');
  return `<p class="chapeau">Les vrais composants, chargés depuis leur paquet à la version écrite sur la carte. Chaque scène montre les mêmes cas : ${esc(titres)}. `
    + 'Survolez, cliquez, et utilisez Tab puis les flèches.</p>'
    + `<div class="galerie">${[...cartes, ...absences].join('')}</div>`;
}

function sectionComprendre(c: Calcul): string {
  return '<p class="chapeau">Les différences entre systèmes qui changent ce qu\'il faut dessiner.</p><div class="differences">'
    + c.guide.comprendre.map((d) => `<article class="diff"><h3>${esc(d.titre)}</h3><p>${esc(d.constat)}</p>`
      + `<div class="options">${d.options.map((o) => `<div><b>${esc(o.nom)}</b><span>${o.detail ? `${esc(o.detail)} ` : ''}${o.systemes.map((s) => lienSysteme(c, s)).join(', ')}.</span></div>`).join('')}</div>`
      + `<p class="decider"><b>À décider :</b> ${esc(d.decider)}</p></article>`).join('')
    + '</div>';
}

function sectionDessiner(c: Calcul): string {
  const d = c.guide.dessiner;
  const cellule = (v: string): string => {
    if (v === 'oui') return td('À dessiner', 'oui');
    if (v === 'non') return td('Non', 'non');
    return td(esc(v), 'si');
  };
  const tableaux = d.tableaux.map((t) => `<h3>${esc(t.titre)}</h3>`
    + tableau(['', ...t.colonnes.map(esc), 'Pourquoi'], t.lignes.map((l) => [td(esc(l.nom)), ...l.cellules.map(cellule), td(esc(l.pourquoi))]))
    + (t.note ? `<p>${esc(t.note)}</p>` : ''));
  const proprietes = d.proprietes.length
    ? `<h3>Propriétés</h3><div class="proprietes">${d.proprietes.map((p) => `<div class="prop"><b>${esc(p.nom)}</b><span class="valeurs">${esc(p.valeurs)}</span><span>${esc(p.note)}</span></div>`).join('')}</div>`
    : '';
  return `<div class="dessin">${tableaux.join('')}${proprietes}</div>`;
}

function sectionQuestions(c: Calcul): string {
  if (!c.guide.questions.length) return '<p class="discret">Aucune question ouverte.</p>';
  return tableau(['Question', 'Options', 'Ce qui en dépend'], c.guide.questions.map((q) => [
    td(esc(q.question)), td(q.options.length ? `<ul>${q.options.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''), td(esc(q.dependDe)),
  ]));
}

function sectionSources(c: Calcul): string {
  const fiches = [...c.fiches.values()].sort((a, b) => (a.systeme < b.systeme ? -1 : 1));
  const paquets = c.guide.galerie.flatMap((g) => g.paquets.map((p) => [g.id, p] as [string, string]));
  return '<details><summary>Fiches lues et paquets chargés</summary>'
    + `<h3>Fiches</h3>${tableau(['Système', 'Lue le', 'Pages'], fiches.map((f) => [
      td(esc(nomDuSysteme(c, f.systeme))), td(esc(f.lu)), td(f.pages.map((p) => `<a href="${esc(p)}">${esc(p)}</a>`).join('<br>')),
    ]))}`
    + `<h3>Paquets</h3>${tableau(['Système', 'Paquet'], paquets.map(([sid, p]) => {
      const { nom, version } = lirePaquet(p);
      return [td(esc(nomDuSysteme(c, sid))), td(`<a href="https://www.npmjs.com/package/${esc(nom)}/v/${esc(version)}"><code>${esc(p)}</code></a>`)];
    }))}`
    + '</details>';
}

/* ------------------------------------------------------------- orchestration */

export interface Rendu { erreurs: string[]; html: string | null }

/** Valide un guide et en calcule le HTML. Ni horloge, ni réseau. */
export function calculerGuide(ctx: Contexte, id: string): Rendu {
  const fichierGuide = path.join(ctx.references, 'analyses', `${id}.json`);
  if (!existsSync(fichierGuide)) return { erreurs: [`analyses/${id}.json : fichier absent`], html: null };
  const json = lireJson<GuideJson>(fichierGuide);
  const erreurs = erreursDuSchema('guide', json).map((e) => `analyses/${id}.json : ${e}`);
  if (erreurs.length) return { erreurs, html: null };
  const guide: Guide = { ...json, galerie: json.galerie.map(({ systeme, ...reste }) => ({ id: systeme, ...reste })) };

  const index = chargerIndex(ctx);
  const erreursIndex = verifierIndex(ctx, index);
  if (erreursIndex.length) return { erreurs: erreursIndex, html: null };
  const entree = index.find((e) => e.id === id);
  if (!entree) return { erreurs: [`${id} : absent de l'index`], html: null };
  if (guide.gabarit !== GABARIT) erreurs.push(`gabarit ${guide.gabarit} : le script rend le gabarit ${GABARIT}`);
  if (guide.composant !== id) erreurs.push(`le champ composant vaut ${guide.composant}`);
  if (!lireDate(guide.date)) erreurs.push(`date invalide ${guide.date}`);

  const systemes = chargerSystemes(ctx);
  erreurs.push(...verifierFiches(ctx, id));
  const fiches = new Map(fichesDe(ctx, id).map(({ fiche }) => [fiche.systeme, fiche] as [string, Fiche]));
  const connu = (sid: string, ou: string): boolean => {
    if (systemes.some((s) => s.id === sid)) return true;
    erreurs.push(`${ou} : le système ${sid} n'est pas dans systemes.json`);
    return false;
  };

  // Galerie : chaque carte a sa scène et une table d'imports qui suit ses paquets.
  const tables = new Map<string, TableDImports>();
  const montres = new Set<string>();
  for (const g of guide.galerie) {
    if (!connu(g.id, 'galerie')) continue;
    if (montres.has(g.id)) erreurs.push(`galerie : ${g.id} apparaît deux fois`);
    montres.add(g.id);
    const scene = fichierScene(ctx, id, g.id);
    if (!existsSync(scene)) {
      erreurs.push(`galerie / ${g.id} : scène absente, écrire _outils/scenes/${id}/${g.id}.js`);
      continue;
    }
    const code = readFileSync(scene, 'utf8');
    const attendu = aInstaller(code, g.paquets);
    erreurs.push(...attendu.erreurs.map((e) => `galerie / ${g.id} : ${e}`));
    for (const v of versionsEnDur(code)) if (!g.paquets.includes(v)) erreurs.push(`galerie / ${g.id} : la scène charge ${v}, absent des paquets déclarés`);
    const table = lireSiPresent<TableDImports | null>(fichierTable(ctx, id, g.id), null);
    if (!table || table.installe.join() !== attendu.installe.join()) {
      erreurs.push(`galerie / ${g.id} : table d'imports ${table ? 'périmée' : 'absente'}, lancer guide.ts carte ${id}`);
      continue;
    }
    tables.set(g.id, table);
  }
  const absents = new Set<string>();
  for (const a of guide.absences ?? []) {
    if (!connu(a.systeme, 'absences')) continue;
    if (montres.has(a.systeme)) erreurs.push(`absences : ${a.systeme} a aussi une scène`);
    absents.add(a.systeme);
  }
  for (const s of systemes.filter((x) => x.roles.includes('composants') && entree.systemes[x.id])) {
    if (!montres.has(s.id) && !absents.has(s.id)) erreurs.push(`${s.id} : alias non nul dans l'index, sans scène ni raison dans absences`);
    const f = fiches.get(s.id);
    if (f && moisEntre(f.lu, guide.date) > MOIS_DE_VALIDITE) {
      erreurs.push(`${s.id} : fiche lue le ${f.lu}, plus de ${MOIS_DE_VALIDITE} mois avant le guide`);
    }
  }

  // Une option renvoie à une carte de la page.
  guide.comprendre.forEach((d, i) => d.options.forEach((o) => o.systemes.forEach((sid) => {
    if (!montres.has(sid) && !absents.has(sid)) erreurs.push(`comprendre ${i + 1} : ${sid} n'a pas de carte dans la galerie`);
  })));
  for (const t of guide.dessiner.tableaux) {
    for (const l of t.lignes) {
      if (l.cellules.length !== t.colonnes.length) erreurs.push(`dessiner / ${t.titre} / ${l.nom} : ${l.cellules.length} cellules pour ${t.colonnes.length} colonnes`);
    }
  }
  erreurs.push(...fautesDeStyle(`analyses/${id}`, { ...json, galerie: json.galerie.map((g) => ({ ...g, paquets: undefined })) }));
  if (erreurs.length) return { erreurs, html: null };

  const c: Calcul = { ctx, guide, entree, systemes, fiches, tables };
  const sections: Record<(typeof ANCRES)[number], string> = {
    galerie: sectionGalerie(c),
    comprendre: sectionComprendre(c),
    dessiner: sectionDessiner(c),
    questions: sectionQuestions(c),
    sources: sectionSources(c),
  };
  let html = readFileSync(path.join(DOSSIER, 'gabarit.html'), 'utf8')
    .replace(/\{\{titre\}\}/g, esc(entree.nom))
    .replace(/\{\{resume\}\}/g, esc(guide.resume))
    .replace(/\{\{date\}\}/g, esc(guide.date))
    .replace(/\{\{gabarit\}\}/g, String(GABARIT));
  for (const ancre of ANCRES) html = html.replace(`<!-- @@${ancre}@@ -->`, () => sections[ancre]);
  if (html.includes('@@') || html.includes('{{')) return { erreurs: ['gabarit : une ancre reste sans contenu'], html: null };
  return { erreurs: [], html };
}

const fichierHtml = (ctx: Contexte, id: string): string => path.join(ctx.references, 'analyses', `${id}.html`);

/* -------------------------------------------------------- tables d'imports */

interface ReponseDuGenerateur { map?: { imports?: Record<string, string>; scopes?: Record<string, Record<string, string>> }; staticDeps?: string[]; error?: string }

/** Demande au générateur la table d'imports de chaque scène du guide et l'écrit à côté d'elle. */
export async function ecrireCartes(ctx: Contexte, id: string): Promise<string[]> {
  const fichierGuide = path.join(ctx.references, 'analyses', `${id}.json`);
  if (!existsSync(fichierGuide)) return [`analyses/${id}.json : fichier absent`];
  const json = lireJson<GuideJson>(fichierGuide);
  const erreurs: string[] = [];
  for (const g of json.galerie ?? []) {
    const scene = fichierScene(ctx, id, g.systeme);
    if (!existsSync(scene)) {
      erreurs.push(`${g.systeme} : scène absente`);
      continue;
    }
    const { installe, erreurs: e } = aInstaller(readFileSync(scene, 'utf8'), g.paquets);
    if (e.length) {
      erreurs.push(...e.map((x) => `${g.systeme} : ${x}`));
      continue;
    }
    const reponse = await fetch(GENERATEUR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ install: installe, env: ['browser', 'production', 'module'] }),
    });
    const r = (await reponse.json()) as ReponseDuGenerateur;
    if (!reponse.ok || r.error || !r.map?.imports) {
      erreurs.push(`${g.systeme} : le générateur répond ${reponse.status} ${r.error ?? ''}`.trim());
      continue;
    }
    const table: TableDImports = {
      paquets: g.paquets,
      installe,
      imports: r.map.imports,
      ...(r.map.scopes ? { scopes: r.map.scopes } : {}),
      feuilles: (r.staticDeps ?? []).filter((u) => u.endsWith('.css')).sort(),
    };
    writeFileSync(fichierTable(ctx, id, g.systeme), `${JSON.stringify(table, null, 2)}\n`);
    process.stdout.write(`${id} / ${g.systeme} : ${Object.keys(table.imports).length} imports, ${table.feuilles.length} feuilles\n`);
  }
  return erreurs;
}

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

export async function lancer(args: string[], ctx: Contexte = CONTEXTE_REEL): Promise<number> {
  const [commande, ...reste] = args;
  if (commande === 'etat') {
    const r = etat(ctx, reste.join(' '));
    process.stdout.write(r.texte);
    return 0;
  }
  if (commande === 'carte') {
    if (!reste[0]) {
      process.stderr.write('Usage : guide.ts carte <id>\n');
      return 2;
    }
    const erreurs = await ecrireCartes(ctx, reste[0]);
    erreurs.forEach((e) => process.stderr.write(`${e}\n`));
    return erreurs.length ? 1 : 0;
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
  process.stderr.write('Usage : guide.ts etat <nom> | relever <id> | verifier <id> | carte <id> | rendre <id>\n');
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void lancer(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
