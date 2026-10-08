/**
 * La reconstruction des réglages d'une palette figée ([VAR-13]) : à partir de
 * ses seules couleurs, elle cherche la référence, le Color shift, les parts et
 * les réglages de la carte qui font rendre ces couleurs, à l'hexa près, par
 * `rampesDe`.
 *
 * Méthode (mesure 3a de la recette v8) :
 *  - Le moteur écrit les octets exacts de la référence sur le cran d'ancrage
 *    des deux thèmes de l'intensité porteuse (MOT-17). Un hexa égal en Light et
 *    en Dark dans une même intensité est donc un candidat de référence. Les
 *    candidats qui portent la référence connue passent d'abord.
 *  - Par candidat, un premier temps : moindres carrés (Levenberg-Marquardt)
 *    sur un modèle flottant de `fabriquerRampe`, et balayage des décalages de
 *    clarté du porteur. Le second temps commence par le candidat le mieux
 *    ajusté : recherche locale aléatoire jugée sur les octets de `rampesDe`,
 *    puis calage sur les grains que la carte et le Color shift permettent
 *    d'écrire.
 *  - Une palette qui reproduit les couleurs est nettoyée : chaque retrait ou
 *    arrondi d'un réglage reste s'il laisse les octets inchangés.
 *  - Chaque palette essayée passe par `rampesDe` : l'écart rendu est celui du
 *    moteur, pas celui du modèle.
 *
 * La recherche est asynchrone et rend la main toutes les 30 ms environ. Elle
 * garde la meilleure palette essayée et s'arrête sur un écart nul, sur le
 * signal d'arrêt ou à l'échéance du budget. L'horloge et la cession de la main
 * s'injectent par les options : sans elles, la recherche lit `performance` et
 * `setTimeout` s'ils existent. C'est le seul endroit du moteur qui dépend du
 * temps, et le résultat n'en dépend que si le budget s'épuise.
 */
import { ecrireHexa, encoder, lireHexa, normaliserTeinte, oklchVersLineaire, rgb8VersOklch, type Rgb8 } from './conversions';
import { boutsDe, grilleDe } from './nuances';
import { fondsSombresDe, partDeLaReference, partsDe, rangPorteur, rampesDe } from './palette';
import { plafond } from './plafond';
import {
  MODES,
  PROFILS,
  arrondir,
  facteurSombre,
  fabriquerCran,
  poidsA,
  type Bouts,
  type Derive,
  type FondsSombres,
  type Mode,
  type Profil,
} from './rampe';
import { figeesParIntensite, validerRecette, type CouleursFigees, type Palette, type Recette } from './recette';
import { prereglageTailwind } from './tailwind';

/** La palette figée qu'on cherche à régler : sa liste de nuances et ses couleurs, une ou deux intensités. */
export interface PaletteFigee {
  readonly crans: readonly number[];
  readonly figees: NonNullable<Palette['figees']>;
  /** Sa référence, si elle existe : les candidats qui la portent passent d'abord. */
  readonly reference?: string;
}

/** Ce qui se pose sur la palette figée à la place de `figees` : référence, Color shift, parts, réglages et originale. */
export interface ReglagesRetrouves {
  readonly reglages: Partial<Palette>;
  /** La plus grande distance sur un canal (0 à 255) entre les rampes figées et celles que `rampesDe` calcule avec ces réglages. */
  readonly ecart: number;
  /** Le nombre de couleurs dont l'hexa diffère. */
  readonly differentes: number;
}

/** Ce que la recherche lit de l'`AbortSignal` : `aborted` suffit. */
export interface SignalDArret {
  readonly aborted: boolean;
}

export interface OptionsDeReconstruction {
  /** Interrompt la recherche : la promesse est rejetée par une erreur nommée `AbortError`. */
  readonly signal?: SignalDArret;
  /** Appelée à chaque cession de la main avec la fraction faite (0 à 1), et une dernière fois avec 1. */
  readonly progression?: (fraction: number) => void;
  /** Le temps imparti, en ms ; la meilleure palette trouvée est rendue à l'échéance. 60 000 par défaut. */
  readonly budgetMs?: number;
  /** La graine de la recherche aléatoire ; la même graine rend le même résultat. */
  readonly graine?: number;
  /** L'horloge en ms. Par défaut `performance.now`, sinon 0 (le budget ne s'épuise alors jamais). */
  readonly horloge?: () => number;
  /** Rend la main à l'hôte. Par défaut une promesse sur `setTimeout`. */
  readonly ceder?: () => Promise<void>;
}

export const BUDGET_PAR_DEFAUT_MS = 60000;
const PAS_DE_CESSION_MS = 30;
const GRAINE_PAR_DEFAUT = 20261008;
const ID_DE_TRAVAIL = 'p-00000000';

// ---------------------------------------------------------------- environnement

interface Environnement {
  readonly setTimeout?: (action: () => void, ms: number) => unknown;
  readonly performance?: { now(): number };
}

/** Le seul accès du moteur à l'hôte : le temps. Les types d'environnement manquent à `src/`, donc la lecture passe par `globalThis`. */
const monde = globalThis as unknown as Environnement;

const horlogeParDefaut = (): number => (monde.performance ? monde.performance.now() : 0);

const cederParDefaut = (): Promise<void> => new Promise<void>((fin) => {
  if (monde.setTimeout) monde.setTimeout(fin, 0);
  else fin();
});

/** Générateur à graine fixe (mulberry32). */
function generateur(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Levée quand le budget est épuisé : la meilleure palette essayée est rendue. */
class Epuisement extends Error {}

/** Levée dès qu'une palette valide reproduit les couleurs à l'hexa près. */
class Trouve extends Error {}

function interruption(): Error {
  const erreur = new Error('Recherche des réglages interrompue.');
  erreur.name = 'AbortError';
  return erreur;
}

// ---------------------------------------------------------------- cadre

type Hexas = { [P in Profil]?: { [M in Mode]?: string[] } };

/** Ce qui ne change pas pendant la recherche : la recette, la grille de la palette, et les couleurs à reproduire. */
interface Cadre {
  readonly recette: Recette;
  readonly crans: readonly number[];
  readonly courbes: { readonly light: readonly number[]; readonly dark: readonly number[] };
  readonly bouts: Bouts;
  readonly sombre: FondsSombres;
  readonly nuances: number;
  /** Une palette à une intensité : son unique profil s'appelle `vivid`, comme sa dérive. */
  readonly unique: boolean;
  readonly cles: readonly Profil[];
  readonly hexas: Hexas;
  readonly octets: { [P in Profil]?: { [M in Mode]?: Rgb8[] } };
  readonly oklch: { [P in Profil]?: { [M in Mode]?: ReturnType<typeof rgb8VersOklch>[] } };
  /** Les thèmes dont la palette figée porte des couleurs : un Dark absent ne se juge pas. */
  readonly presents: { [P in Profil]?: { [M in Mode]: boolean } };
  readonly reference: string | undefined;
}

const arrondi = (x: number, d: number): number => Math.round(x * 10 ** d) / 10 ** d;
const borner = (x: number, bas = 0, haut = 1): number => Math.min(haut, Math.max(bas, x));
const ecartAngle = (a: number, b: number): number => ((a - b + 540) % 360) - 180;
const hexa = (couleur: Rgb8): string => ecrireHexa(couleur);
const enMilliemes = (part: number): number => Math.round(part * 1000);

function rampesFigees(figees: PaletteFigee, recette: Recette, unique: boolean) {
  const palette: Palette = {
    id: ID_DE_TRAVAIL,
    reference: figees.reference ?? '#000000',
    derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
    crans: figees.crans,
    figees: figees.figees,
    ...(unique ? { intensites: 1 as const } : {}),
  };
  return rampesDe(recette, palette);
}

function bati(recette: Recette, figee: PaletteFigee): Cadre | null {
  const unique = !figeesParIntensite(figee.figees);
  const grille = grilleDe(recette, { crans: figee.crans } as Palette);
  const nuances = figee.crans.length;
  if (nuances < 3) return null;
  const lot: readonly (readonly [Profil, CouleursFigees])[] = figeesParIntensite(figee.figees)
    ? [['soft', figee.figees.soft], ['vivid', figee.figees.vivid]]
    : [['vivid', figee.figees]];
  for (const [, couleurs] of lot) {
    if (couleurs.light.length !== nuances || (couleurs.dark && couleurs.dark.length !== nuances)) return null;
    if ([...couleurs.light, ...(couleurs.dark ?? [])].some((h) => lireHexa(h) === null)) return null;
  }
  const rampes = rampesFigees(figee, recette, unique);
  const hexas: Hexas = {};
  const octets: Cadre['octets'] = {};
  const oklch: Cadre['oklch'] = {};
  const presents: Cadre['presents'] = {};
  for (const [cle, couleurs] of lot) {
    const rampe = unique ? rampes.unique : rampes[cle];
    if (!rampe) return null;
    hexas[cle] = {};
    octets[cle] = {};
    oklch[cle] = {};
    presents[cle] = { light: true, dark: couleurs.dark !== undefined };
    for (const mode of MODES) {
      const lus = rampe[mode].map((cran) => cran.hexa);
      hexas[cle]![mode] = lus;
      octets[cle]![mode] = lus.map((h) => lireHexa(h) as Rgb8);
      oklch[cle]![mode] = octets[cle]![mode]!.map(rgb8VersOklch);
    }
  }
  return {
    recette,
    crans: figee.crans,
    courbes: grille.courbes,
    bouts: boutsDe(recette),
    sombre: fondsSombresDe(recette),
    nuances,
    unique,
    cles: lot.map(([cle]) => cle),
    hexas,
    octets,
    oklch,
    presents,
    reference: figee.reference ? hexa(lireHexa(figee.reference) ?? [0, 0, 0]) : undefined,
  };
}

// ---------------------------------------------------------------- suivi du temps, de l'arrêt et du meilleur essai

interface Mesure {
  readonly max: number;
  readonly somme: number;
}

interface Piste {
  readonly palette: Palette;
  readonly mesure: Mesure;
}

const NOMBRE_DE_PISTES = 6;

class Suivi {
  readonly pistes: Piste[] = [];
  trouvee: Piste | null = null;
  private readonly debut: number;
  private dernierRendu: number;
  private fraction = 0;
  private notifiee = -1;

  constructor(
    private readonly budget: number,
    private readonly horloge: () => number,
    private readonly ceder: () => Promise<void>,
    private readonly signal: SignalDArret | undefined,
    private readonly progression: ((fraction: number) => void) | undefined,
  ) {
    this.debut = horloge();
    this.dernierRendu = this.debut;
  }

  /** À appeler souvent : lit l'arrêt et le budget, et rend la main toutes les 30 ms. */
  async point(): Promise<void> {
    if (this.signal?.aborted) throw interruption();
    const maintenant = this.horloge();
    if (maintenant - this.debut >= this.budget) throw new Epuisement();
    if (maintenant - this.dernierRendu < PAS_DE_CESSION_MS) return;
    await this.ceder();
    this.dernierRendu = this.horloge();
    if (this.signal?.aborted) throw interruption();
    this.notifier();
  }

  /** La part de travail faite, au plus égale à 0,99 tant que la recherche dure ; ne recule pas. */
  avancer(fraction: number): void {
    this.fraction = Math.max(this.fraction, Math.min(0.99, fraction));
  }

  notifier(): void {
    if (!this.progression) return;
    const ecoule = Math.min(0.99, (this.horloge() - this.debut) / this.budget);
    const valeur = Math.max(this.fraction, ecoule);
    this.fraction = valeur;
    if (valeur > this.notifiee) {
      this.notifiee = valeur;
      this.progression(valeur);
    }
  }

  terminer(): void {
    if (this.progression) this.progression(1);
  }

  /** Garde les meilleures palettes essayées ; un écart nul qui passe la validation arrête la recherche. */
  noter(palette: Palette, mesure: Mesure, valider: (palette: Palette) => boolean): void {
    if (mesure.somme === 0) {
      if (!valider(palette)) return;
      this.trouvee = { palette, mesure };
      throw new Trouve();
    }
    const pire = this.pistes.length ? this.pistes[this.pistes.length - 1].mesure.somme : Infinity;
    if (this.pistes.length >= NOMBRE_DE_PISTES && mesure.somme >= pire) return;
    if (this.pistes.some((p) => p.mesure.somme === mesure.somme)) return;
    this.pistes.push({ palette, mesure });
    this.pistes.sort((a, b) => a.mesure.somme - b.mesure.somme);
    if (this.pistes.length > NOMBRE_DE_PISTES) this.pistes.pop();
  }
}

// ---------------------------------------------------------------- modèle flottant

const NOMS = ['Hp', 'delta', 'p', 'dc', 'ds', 'sc', 'ss', 'lc', 'ls'] as const;
type Nom = (typeof NOMS)[number];
const BORNES: Record<Nom, readonly [number, number]> = {
  Hp: [-1e9, 1e9], delta: [-0.15, 0.15], p: [0, 1], dc: [-90, 90], ds: [-90, 90], sc: [-1, 1], ss: [-1, 1], lc: [-0.15, 0.15], ls: [-0.15, 0.15],
};
const PAS: Record<Nom, number> = { Hp: 0.5, delta: 0.002, p: 0.005, dc: 0.5, ds: 0.5, sc: 0.01, ss: 0.01, lc: 0.003, ls: 0.003 };
const indice = (profil: Profil, nom: Nom): number => 1 + (profil === 'soft' ? 0 : NOMS.length) + NOMS.indexOf(nom);
const NB_PARAMETRES = 1 + 2 * NOMS.length;

const nomDe = (i: number): Nom => NOMS[(i - 1) % NOMS.length];

/** Les rampes du modèle, en canaux flottants 0 à 255, calculées comme `fabriquerRampe` sans l'arrondi final. */
function rampeFlottante(c: Cadre, x: readonly number[], profil: Profil, mode: Mode): number[][] {
  const lire = (nom: Nom): number => x[indice(profil, nom)];
  const pivot = { L: x[0], C: 0, H: 0 };
  return c.courbes[mode].map((L) => {
    const { bout, poids } = poidsA(L, pivot, c.bouts);
    const clair = bout === 'clair';
    const part = borner(lire('p') * (1 + (clair ? lire('sc') : lire('ss')) * poids));
    const clarte = borner(L + lire('delta') + (clair ? lire('lc') : lire('ls')) * poids);
    const teinte = normaliserTeinte(lire('Hp') + (clair ? lire('dc') : lire('ds')) * poids);
    const C = part * (mode === 'dark' ? facteurSombre(L, c.sombre) : 1) * plafond(clarte, teinte, 'srgb');
    return oklchVersLineaire({ L: clarte, C, H: teinte }).map((v) => 255 * encoder(borner(v)));
  });
}

/** Ce que l'ajustement compare : les nuances observées, hors ancrages. */
interface Candidat {
  readonly cle: Profil;
  readonly rl: number;
  /** Le rang d'ancrage en Dark ; -1 quand la palette figée n'a pas de Dark. */
  readonly rd: number;
  readonly couleur: Rgb8;
  readonly L: number;
  readonly H: number;
  readonly C: number;
  readonly ancres: Set<string>;
}

function residus(c: Cadre, x: readonly number[], k: Candidat): number[] {
  const sortie: number[] = [];
  for (const cle of c.cles) {
    for (const mode of MODES) {
      if (!c.presents[cle]![mode]) continue;
      const modele = rampeFlottante(c, x, cle, mode);
      const lus = c.octets[cle]![mode]!;
      modele.forEach((canaux, rang) => {
        if (k.ancres.has(`${cle}/${mode}/${rang}`)) return;
        for (let i = 0; i < 3; i += 1) sortie.push(canaux[i] - lus[rang][i]);
      });
    }
  }
  return sortie;
}

function resoudre(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((ligne, i) => [...ligne, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let l = col + 1; l < n; l += 1) if (Math.abs(M[l][col]) > Math.abs(M[pivot][col])) pivot = l;
    if (Math.abs(M[pivot][col]) < 1e-18) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let l = col + 1; l < n; l += 1) {
      const f = M[l][col] / M[col][col];
      for (let j = col; j <= n; j += 1) M[l][j] -= f * M[col][j];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let l = n - 1; l >= 0; l -= 1) {
    let s = M[l][n];
    for (let j = l + 1; j < n; j += 1) s -= M[l][j] * x[j];
    x[l] = s / M[l][l];
  }
  return x;
}

function limiter(x: readonly number[], libres: readonly number[], fenetreL: readonly [number, number]): number[] {
  const y = x.slice();
  for (const i of libres) {
    if (i === 0) {
      y[0] = borner(y[0], fenetreL[0], fenetreL[1]);
      continue;
    }
    const [bas, haut] = BORNES[nomDe(i)];
    y[i] = borner(y[i], bas, haut);
  }
  return y;
}

const somme = (r: readonly number[]): number => r.reduce((s, v) => s + v * v, 0);

/** Levenberg-Marquardt sur les paramètres `libres`, jacobienne par différences finies. */
async function ajuster(
  c: Cadre,
  s: Suivi,
  k: Candidat,
  x0: readonly number[],
  libres: readonly number[],
  iterations: number,
  fenetreL: readonly [number, number],
): Promise<{ x: number[]; cout: number }> {
  let x = limiter(x0, libres, fenetreL);
  let r = residus(c, x, k);
  let cout = somme(r);
  let lambda = 1e-2;
  for (let it = 0; it < iterations; it += 1) {
    await s.point();
    const J = libres.map((i) => {
      const h = 1e-5 * (1 + Math.abs(x[i]));
      const y = x.slice();
      y[i] += h;
      return residus(c, y, k).map((v, n) => (v - r[n]) / h);
    });
    const A = libres.map((_, a) => libres.map((__, b) => J[a].reduce((t, v, n) => t + v * J[b][n], 0)));
    const g = libres.map((_, a) => J[a].reduce((t, v, n) => t + v * r[n], 0));
    let accepte = false;
    for (let essai = 0; essai < 8 && !accepte; essai += 1) {
      const B = A.map((ligne, a) => ligne.map((v, b) => (a === b ? v + lambda * (v + 1e-9) + 1e-12 : v)));
      const dx = resoudre(B, g.map((v) => -v));
      if (!dx) {
        lambda *= 10;
        continue;
      }
      const y = x.slice();
      libres.forEach((i, a) => { y[i] += dx[a]; });
      const z = limiter(y, libres, fenetreL);
      const rz = residus(c, z, k);
      const coutZ = somme(rz);
      if (coutZ < cout) {
        const gain = cout - coutZ;
        x = z;
        r = rz;
        cout = coutZ;
        lambda = Math.max(lambda / 4, 1e-9);
        accepte = true;
        if (gain < 1e-9) return { x, cout };
      } else {
        lambda *= 5;
      }
    }
    if (!accepte) break;
  }
  return { x, cout };
}

// ---------------------------------------------------------------- palette candidate

/** Le Color shift d'un profil, tel que la recette le range : les décalages nuls ne s'écrivent pas. */
function deriveDe(x: readonly number[], cle: Profil): Derive & { origine: 'libre' } {
  const lire = (nom: Nom): number => x[indice(cle, nom)];
  return {
    clair: lire('dc'),
    sombre: lire('ds'),
    origine: 'libre',
    ...(lire('sc') !== 0 || lire('ss') !== 0 ? { saturation: { clair: lire('sc'), sombre: lire('ss') } } : {}),
    ...(lire('lc') !== 0 || lire('ls') !== 0 ? { clarte: { clair: lire('lc'), sombre: lire('ls') } } : {}),
  };
}

/**
 * Les paramètres de la recherche en palette du moteur, dans la forme que la
 * recette range : la liste de la palette figée est conservée, donc le porteur
 * se range dans `reglages.porteur`, jamais dans `base` ([ENT-11]). Sans autre
 * réglage, un réglage de part égal à la part du porteur le range sans rien
 * changer aux rampes.
 */
function construirePalette(c: Cadre, x: readonly number[], k: Candidat, depart: Rgb8): Palette {
  const lu = rgb8VersOklch(depart);
  const teinte: { soft?: number; vivid?: number } = {};
  const clarte: { soft?: number; vivid?: number } = {};
  for (const cle of c.cles) {
    const t = ecartAngle(x[indice(cle, 'Hp')], lu.H);
    if (Math.abs(t) > 1e-9) teinte[cle] = t;
    const d = x[indice(cle, 'delta')];
    if (Math.abs(d) > 1e-12) clarte[cle] = d;
  }
  const base = {
    id: ID_DE_TRAVAIL,
    reference: hexa(k.couleur),
    crans: c.crans,
  };
  const reglages: { teinte?: typeof teinte; clarte?: typeof clarte; part?: number; porteur?: Profil } = {};
  if (Object.keys(teinte).length) reglages.teinte = teinte;
  if (Object.keys(clarte).length) reglages.clarte = clarte;

  let palette: Palette;
  if (c.unique) {
    const derive = deriveDe(x, 'vivid');
    palette = { ...base, derive: { lien: true, soft: derive, vivid: derive }, intensites: 1 };
    const part = x[indice('vivid', 'p')];
    if (enMilliemes(part) !== enMilliemes(partDeLaReference(c.recette, palette))) reglages.part = part;
  } else {
    const soft = deriveDe(x, 'soft');
    const vivid = deriveDe(x, 'vivid');
    const parts = { soft: x[indice('soft', 'p')], vivid: x[indice('vivid', 'p')] };
    palette = { ...base, derive: { lien: false, soft, vivid }, parts: { ...parts, origine: 'designer' } };
    reglages.porteur = k.cle;
    if (!reglages.teinte && !reglages.clarte) reglages.part = parts[k.cle];
  }
  if (Object.keys(reglages).length) palette = { ...palette, reglages };
  const duPorteur = reglages.part !== undefined || reglages.teinte?.[k.cle] !== undefined || reglages.clarte?.[k.cle] !== undefined;
  if (duPorteur) palette = { ...palette, originale: hexa(depart) };
  return palette;
}

/** L'écart d'une palette du moteur aux couleurs à reproduire, sur les thèmes observés. */
function ecartEntre(c: Cadre, palette: Palette): Mesure {
  const rampes = rampesDe(c.recette, palette);
  let max = 0;
  let total = 0;
  for (const cle of c.cles) {
    const rampe = c.unique ? rampes.unique : rampes[cle];
    if (!rampe) return { max: 255, somme: Infinity };
    for (const mode of MODES) {
      if (!c.presents[cle]![mode]) continue;
      const lus = c.octets[cle]![mode]!;
      rampe[mode].forEach((cran, rang) => {
        const voulu = lus[rang];
        for (let i = 0; i < 3; i += 1) {
          const d = Math.abs(cran.couleur[i] - voulu[i]);
          total += d * d;
          if (d > max) max = d;
        }
      });
    }
  }
  return { max, somme: total };
}

/** Construit, mesure et note une palette : le seul chemin par lequel une palette entre dans le suivi. */
function essayer(c: Cadre, s: Suivi, valider: (p: Palette) => boolean, x: readonly number[], k: Candidat, depart: Rgb8): Mesure & { palette: Palette } {
  const palette = construirePalette(c, x, k, depart);
  const mesure = ecartEntre(c, palette);
  s.noter(palette, mesure, valider);
  return { ...mesure, palette };
}

// ---------------------------------------------------------------- départs de l'ajustement

/** Valeurs de départ lues dans les rampes, d'après la structure du moteur (poids 0 près du pivot, 1 aux bouts). */
function initialiser(c: Cadre, x: readonly number[], cle: Profil, k: Candidat, variante: 'estimee' | 'nulle'): number[] {
  const y = x.slice();
  const lus = c.oklch[cle]!.light!;
  const courbe = c.courbes.light;
  let k0 = -1;
  let meilleur = Infinity;
  courbe.forEach((L, rang) => {
    if (k.ancres.has(`${cle}/light/${rang}`)) return;
    const d = Math.abs(L - x[0]);
    if (d < meilleur) { meilleur = d; k0 = rang; }
  });
  const proche = lus[k0];
  const teinteProche = proche.C < 1e-3 ? k.H : proche.H;
  const base = Math.max(plafond(proche.L, teinteProche, 'srgb'), 1e-6);
  const mise = (nom: Nom, valeur: number): void => { y[indice(cle, nom)] = valeur; };
  mise('Hp', teinteProche);
  mise('delta', borner(proche.L - courbe[k0], -0.15, 0.15));
  mise('p', borner(proche.C / base));
  for (const nom of ['dc', 'ds', 'sc', 'ss', 'lc', 'ls'] as const) mise(nom, 0);
  if (variante === 'estimee') {
    const bout = (rang: number, nomH: Nom, nomS: Nom, nomL: Nom): void => {
      const o = lus[rang];
      if (o.C > 2e-3) mise(nomH, borner(ecartAngle(o.H, teinteProche), -90, 90));
      const plaf = Math.max(plafond(o.L, o.C > 2e-3 ? o.H : teinteProche, 'srgb'), 1e-6);
      const p = y[indice(cle, 'p')];
      if (p > 0.02 && o.C > 2e-3) mise(nomS, borner(o.C / plaf / p - 1, -1, 1));
      mise(nomL, borner(o.L - courbe[rang] - y[indice(cle, 'delta')], -0.15, 0.15));
    };
    bout(0, 'dc', 'sc', 'lc');
    bout(c.nuances - 1, 'ds', 'ss', 'ls');
  }
  return y;
}

/** Une couleur à 8 bits dont la clarté OKLCH approche `L`, de teinte proche de `H` (le départ d'un réglage de clarté). */
function departParClarte(L: number, H: number, C: number): Rgb8 {
  const lisse = fabriquerCran(L, H, borner(C / Math.max(plafond(L, H, 'srgb'), 1e-6)), 'srgb').couleur;
  let meilleur = lisse;
  let ecart = Infinity;
  for (let dr = -3; dr <= 3; dr += 1) {
    for (let dg = -3; dg <= 3; dg += 1) {
      for (let db = -3; db <= 3; db += 1) {
        const couleur = [lisse[0] + dr, lisse[1] + dg, lisse[2] + db] as unknown as Rgb8;
        if (couleur.some((v) => v < 0 || v > 255)) continue;
        const lu = rgb8VersOklch(couleur);
        const e = Math.abs(lu.L - L) * 1000 + Math.abs(ecartAngle(lu.H, H)) * 0.001;
        if (e < ecart) { ecart = e; meilleur = couleur; }
      }
    }
  }
  return meilleur;
}

// ---------------------------------------------------------------- polissage et calage

type Alea = () => number;
type Essayeur = (x: readonly number[], depart: Rgb8) => Mesure & { palette: Palette };

/** Recherche locale aléatoire sur les valeurs continues, à pas décroissants, qui garde tout essai d'erreur égale ou moindre. */
async function polir(s: Suivi, essayer: Essayeur, x0: readonly number[], depart: Rgb8, libres: readonly number[], hasard: Alea, essais: number): Promise<number[]> {
  let x = x0.slice();
  let courant = essayer(x, depart);
  for (let essai = 0; essai < essais && courant.somme > 0; essai += 1) {
    await s.point();
    const y = x.slice();
    const mouvements = hasard() < 0.5 ? 1 : 2;
    for (let m = 0; m < mouvements; m += 1) {
      const i = libres[Math.floor(hasard() * libres.length)];
      if (i === 0) continue;
      y[i] += PAS[nomDe(i)] * 10 ** (-3 * hasard()) * (hasard() < 0.5 ? -1 : 1);
    }
    const z = limiter(y, libres, [0, 1]);
    const mesure = essayer(z, depart);
    if (mesure.somme <= courant.somme) {
      x = z;
      courant = mesure;
    }
  }
  return x;
}

/** Le grain de chaque réglage : ce que la carte et le Color shift permettent d'écrire (pas des réglettes, arrondis de la recette). */
const GRAINS = { t: 1, delta: 0.005, p: 0.001, dc: 0.01, ds: 0.01, sc: 0.01, ss: 0.01, lc: 0.005, ls: 0.005 } as const;
type CleDeGrain = keyof typeof GRAINS;
const CLES_DE_GRAIN = Object.keys(GRAINS) as CleDeGrain[];
const ESSAIS_DE_PLATEAU = 1500;

type Entiers = { [P in Profil]?: { [G in CleDeGrain]: number } };

/**
 * Cale l'ajustement continu sur les grilles des réglages : chaque valeur
 * s'arrondit à son grain, puis une descente par coordonnées (un grain à la
 * fois) et par octet du départ (un octet à la fois) réduit l'erreur mesurée
 * avec `rampesDe`. Des déplacements groupés traversent les plateaux, où des
 * réglages différents donnent presque les mêmes octets.
 */
async function caler(c: Cadre, s: Suivi, essayer: Essayeur, x0: readonly number[], depart0: Rgb8, hasard: Alea): Promise<void> {
  let depart = depart0.slice() as unknown as Rgb8;
  const versEntiers = (x: readonly number[], d: Rgb8): Entiers => {
    const H = rgb8VersOklch(d).H;
    const n: Entiers = {};
    for (const cle of c.cles) {
      const ligne = {} as { [G in CleDeGrain]: number };
      for (const grain of CLES_DE_GRAIN) {
        const brut = grain === 't' ? ecartAngle(x[indice(cle, 'Hp')], H) : x[indice(cle, grain)];
        ligne[grain] = Math.round(brut / GRAINS[grain]);
      }
      n[cle] = ligne;
    }
    return n;
  };
  const versX = (n: Entiers, d: Rgb8): number[] => {
    const lu = rgb8VersOklch(d);
    const x = new Array<number>(NB_PARAMETRES).fill(0);
    x[0] = lu.L;
    for (const cle of c.cles) {
      for (const grain of CLES_DE_GRAIN) {
        const valeur = n[cle]![grain] * GRAINS[grain];
        x[indice(cle, grain === 't' ? 'Hp' : grain)] = grain === 't' ? normaliserTeinte(lu.H + valeur) : valeur;
      }
    }
    return x;
  };
  const evaluer = (n: Entiers, d: Rgb8): Mesure => essayer(versX(n, d), d);
  const avec = (n: Entiers, cle: Profil, grain: CleDeGrain, pas: number): Entiers => ({ ...n, [cle]: { ...n[cle]!, [grain]: n[cle]![grain] + pas } });

  let n = versEntiers(x0, depart);
  let courant = evaluer(n, depart);
  for (let tour = 0; tour < 60 && courant.somme > 0; tour += 1) {
    let progres = false;
    for (const cle of c.cles) {
      for (const grain of CLES_DE_GRAIN) {
        for (const pas of [1, -1, 3, -3]) {
          await s.point();
          const essai = avec(n, cle, grain, pas);
          const mesure = evaluer(essai, depart);
          if (mesure.somme < courant.somme) {
            n = essai;
            courant = mesure;
            progres = true;
            break;
          }
        }
        if (courant.somme === 0) break;
      }
      if (courant.somme === 0) break;
    }
    if (!progres && courant.somme > 0) {
      // Le départ est un triplet d'octets : on cherche dans le cube de rayon 3 autour du départ courant.
      let meilleur: { d: Rgb8; mesure: Mesure; relatif: Entiers } | null = null;
      const absolu = versX(n, depart);
      for (let dr = -3; dr <= 3; dr += 1) {
        for (let dg = -3; dg <= 3; dg += 1) {
          for (let db = -3; db <= 3; db += 1) {
            if (dr === 0 && dg === 0 && db === 0) continue;
            const d = [depart[0] + dr, depart[1] + dg, depart[2] + db] as unknown as Rgb8;
            if (d.some((v) => v < 0 || v > 255)) continue;
            await s.point();
            // Les teintes absolues des pivots restent celles de l'ajustement : les réglages de teinte relatifs au nouveau départ s'en déduisent.
            const relatif = versEntiers(absolu, d);
            const mesure = evaluer(relatif, d);
            if (mesure.somme < (meilleur ? meilleur.mesure.somme : courant.somme)) meilleur = { d, mesure, relatif };
          }
        }
      }
      if (meilleur) {
        depart = meilleur.d;
        n = meilleur.relatif;
        courant = meilleur.mesure;
        progres = true;
      }
    }
    if (!progres) break;
  }
  for (let essai = 0; essai < ESSAIS_DE_PLATEAU && courant.somme > 0; essai += 1) {
    await s.point();
    const candidat: Entiers = {};
    for (const cle of c.cles) candidat[cle] = { ...n[cle]! };
    const mouvements = 1 + Math.floor(hasard() * 3);
    for (let m = 0; m < mouvements; m += 1) {
      const cle = c.cles[Math.floor(hasard() * c.cles.length)];
      const grain = CLES_DE_GRAIN[Math.floor(hasard() * CLES_DE_GRAIN.length)];
      candidat[cle]![grain] += (hasard() < 0.5 ? -1 : 1) * (1 + Math.floor(hasard() * 3));
    }
    let d = depart;
    if (hasard() < 0.25) {
      const canal = Math.floor(hasard() * 3);
      d = depart.slice() as unknown as Rgb8;
      (d as unknown as number[])[canal] = Math.min(255, Math.max(0, d[canal] + (hasard() < 0.5 ? -1 : 1)));
    }
    const mesure = evaluer(candidat, d);
    if (mesure.somme <= courant.somme) {
      n = candidat;
      depart = d;
      courant = mesure;
    }
  }
}

// ---------------------------------------------------------------- recherche par candidat

function candidat(c: Cadre, cle: Profil, rl: number, rd: number): Candidat {
  const couleur = c.octets[cle]!.light![rl];
  const lu = rgb8VersOklch(couleur);
  const ancres = new Set<string>([`${cle}/light/${rl}`]);
  if (rd >= 0) ancres.add(`${cle}/dark/${rd}`);
  return { cle, rl, rd, couleur, L: lu.L, H: lu.H, C: lu.C, ancres };
}

/** Les ancrages possibles, ceux de la référence connue d'abord. */
function candidats(c: Cadre): Candidat[] {
  const liste: Candidat[] = [];
  for (const cle of c.cles) {
    const light = c.hexas[cle]!.light!;
    const dark = c.hexas[cle]!.dark!;
    light.forEach((h, rl) => {
      if (!c.presents[cle]!.dark) {
        liste.push(candidat(c, cle, rl, -1));
        return;
      }
      dark.forEach((d, rd) => { if (h === d) liste.push(candidat(c, cle, rl, rd)); });
    });
  }
  if (!c.reference) return liste;
  const portent = liste.filter((k) => hexa(k.couleur) === c.reference);
  // Sans Dark, chaque rang de Light serait un candidat : on s'en tient à ceux qui portent la référence quand il y en a.
  if (portent.length && liste.some((k) => k.rd < 0)) return portent;
  return [...portent, ...liste.filter((k) => hexa(k.couleur) !== c.reference)];
}

/**
 * Les deux temps de la recherche d'un candidat : l'ajustement seul, vite fait,
 * puis le polissage et le calage, qui coûtent. À l'issue du premier temps,
 * `ecart` est la meilleure somme des carrés des écarts en octets qu'un essai a
 * rendue : quelques unités pour le vrai ancrage, des centaines pour une
 * coïncidence de clarté entre les courbes Light et Dark.
 */
interface Etude {
  ecart: number;
  rapide(avancer: (partie: number) => void): Promise<void>;
  lent(avancer: (partie: number) => void): Promise<void>;
}

function etudier(c: Cadre, s: Suivi, valider: (p: Palette) => boolean, k: Candidat, hasard: Alea): Etude {
  const etude: Etude = {
    ecart: Infinity,
    rapide: async () => undefined,
    lent: async () => undefined,
  };
  const essayeur: Essayeur = (x, depart) => {
    const resultat = essayer(c, s, valider, x, k, depart);
    if (resultat.somme < etude.ecart) etude.ecart = resultat.somme;
    return resultat;
  };
  const tous: number[] = [];
  for (const cle of c.cles) for (let i = 1; i < 1 + NOMS.length; i += 1) tous.push(indice(cle, NOMS[i - 1]));
  const rangsOk = (L: number): boolean =>
    rangPorteur(c.courbes.light, L) === k.rl && (k.rd < 0 || rangPorteur(c.courbes.dark, L) === k.rd);
  const departDeReference = k.couleur;

  const lancer = async (variante: 'estimee' | 'nulle', iterations: number): Promise<number[]> => {
    let x = new Array<number>(NB_PARAMETRES).fill(0);
    x[0] = k.L;
    for (const cle of c.cles) x = initialiser(c, x, cle, k, variante);
    return (await ajuster(c, s, k, x, tous, iterations, [k.L, k.L])).x;
  };

  // Départ structuré : pivot à la référence, parts par défaut du moteur, Color shift Tailwind ou nul.
  const structuree = (tailwind: boolean): number[] => {
    const x = new Array<number>(NB_PARAMETRES).fill(0);
    x[0] = k.L;
    const nul = { clair: 0, sombre: 0, origine: 'constante' as const };
    const sonde: Palette = {
      id: ID_DE_TRAVAIL,
      reference: hexa(k.couleur),
      derive: { lien: true, soft: nul, vivid: nul },
      crans: c.crans,
      ...(c.unique ? { intensites: 1 as const } : { reglages: { porteur: k.cle } }),
    };
    const parts = partsDe(c.recette, sonde);
    const derive = tailwind ? prereglageTailwind(rgb8VersOklch(k.couleur), c.bouts, c.recette.derives) : nul;
    for (const cle of c.cles) {
      x[indice(cle, 'Hp')] = k.C < 1e-3 ? 0 : k.H;
      x[indice(cle, 'p')] = (c.unique ? parts.unique : parts[cle]) ?? 0;
      x[indice(cle, 'dc')] = derive.clair;
      x[indice(cle, 'ds')] = derive.sombre;
    }
    return x;
  };
  const sansPivot = tous.filter((i) => nomDe(i) !== 'Hp' && nomDe(i) !== 'delta');
  const departs1: readonly [() => Promise<number[]> | number[], readonly number[]][] = [
    [() => structuree(true), sansPivot],
    [() => structuree(false), sansPivot],
    [() => structuree(true), tous],
    [() => lancer('estimee', 40), tous],
    [() => lancer('nulle', 40), tous],
  ];
  const sansDecalage = tous.filter((i) => i !== indice(k.cle, 'delta'));
  const ajustes1: { x: number[]; cout: number; libres: readonly number[] }[] = [];
  let retenus: { depart: Rgb8; x: number[]; cout: number }[] = [];

  return Object.assign(etude, {
    async rapide(avancer: (partie: number) => void) {
      if (rangsOk(k.L)) {
        for (let j = 0; j < departs1.length; j += 1) {
          const [depart, libres] = departs1[j];
          const brut = await depart();
          essayeur(brut, departDeReference);
          const ajuste = await ajuster(c, s, k, brut, libres, 40, [k.L, k.L]);
          essayeur(ajuste.x, departDeReference);
          ajustes1.push({ ...ajuste, libres });
          avancer(0.5 * ((j + 1) / departs1.length));
        }
      }
      // Passe 2 : le porteur porte un réglage de clarté, donc le départ n'est pas la référence. Le réglage est un multiple de 0,005
      // (pas de la réglette) : chaque multiple fixe le décalage du porteur et la clarté du départ, et les autres réglages se
      // cherchent par ajustement. Les trois meilleurs ajustements passent au calage.
      const essais: { depart: Rgb8; x: number[]; cout: number }[] = [];
      for (let m = -20; m <= 20; m += 1) {
        if (m === 0) continue;
        await s.point();
        const L0 = k.L - m * 0.005;
        if (!rangsOk(L0)) continue;
        const depart = departParClarte(L0, k.H, k.C);
        const L1 = rgb8VersOklch(depart).L;
        let x = new Array<number>(NB_PARAMETRES).fill(0);
        x[0] = L1;
        for (const cle of c.cles) x = initialiser(c, x, cle, k, 'estimee');
        x[indice(k.cle, 'Hp')] = k.C < 1e-3 ? 0 : k.H;
        x[indice(k.cle, 'delta')] = m * 0.005;
        const ajuste = await ajuster(c, s, k, x, sansDecalage, 15, [L1, L1]);
        essayeur(ajuste.x, depart);
        essais.push({ depart, ...ajuste });
        avancer(0.5 + 0.5 * ((m + 20) / 40));
      }
      essais.sort((p, q) => p.cout - q.cout);
      retenus = essais.slice(0, 3);
    },

    async lent(avancer: (partie: number) => void) {
      for (let j = 0; j < ajustes1.length; j += 1) {
        const { x, cout, libres } = ajustes1[j];
        const continu = await polir(s, essayeur, x, departDeReference, libres, hasard, cout > 0 ? 1500 : 0);
        await caler(c, s, essayeur, continu, departDeReference, hasard);
        avancer(0.5 * ((j + 1) / ajustes1.length));
      }
      for (let j = 0; j < retenus.length; j += 1) {
        const e = retenus[j];
        const continu = await polir(s, essayeur, e.x, e.depart, sansDecalage, hasard, 1500);
        await caler(c, s, essayeur, continu, e.depart, hasard);
        avancer(0.5 + 0.5 * ((j + 1) / retenus.length));
      }
    },
  });
}

// ---------------------------------------------------------------- simplification et rendu

/** Les trois origines du Color shift d'un profil : Tailwind, constante ou libre. */
function nommerLesDerives(c: Cadre, palette: Palette): Palette {
  const depart = palette.originale ?? palette.reference;
  const lu = rgb8VersOklch(lireHexa(depart) ?? [0, 0, 0]);
  const tailwind = prereglageTailwind(lu, c.bouts, c.recette.derives);
  const nommer = (derive: Palette['derive']['soft']): Palette['derive']['soft'] => {
    const sansDecalage = derive.saturation === undefined && derive.clarte === undefined;
    if (sansDecalage && derive.clair === 0 && derive.sombre === 0) return { ...derive, origine: 'constante' };
    if (sansDecalage && derive.clair === tailwind.clair && derive.sombre === tailwind.sombre) return { ...derive, origine: 'tailwind' };
    return derive;
  };
  const soft = nommer(palette.derive.soft);
  const vivid = nommer(palette.derive.vivid);
  const identiques = soft.clair === vivid.clair && soft.sombre === vivid.sombre && soft.origine === vivid.origine
    && JSON.stringify(soft.saturation) === JSON.stringify(vivid.saturation)
    && JSON.stringify(soft.clarte) === JSON.stringify(vivid.clarte);
  return { ...palette, derive: { lien: c.unique || identiques, soft, vivid } };
}

type Chemin = readonly string[];

function lireValeur(objet: unknown, chemin: Chemin): number | undefined {
  let courant: unknown = objet;
  for (const cle of chemin) {
    if (typeof courant !== 'object' || courant === null) return undefined;
    courant = (courant as Record<string, unknown>)[cle];
  }
  return typeof courant === 'number' ? courant : undefined;
}

/** Une copie de `objet` où la valeur au bout de `chemin` est remplacée, ou retirée si `valeur` est absente. */
function poser<T>(objet: T, chemin: Chemin, valeur: number | undefined): T {
  const [tete, ...reste] = chemin;
  const source = objet as unknown as Record<string, unknown>;
  const copie = { ...source };
  const suivant = reste.length === 0 ? valeur : source[tete] === undefined ? undefined : poser(source[tete], reste, valeur);
  if (suivant === undefined) delete copie[tete];
  else copie[tete] = suivant;
  return copie as unknown as T;
}

const estVide = (objet: unknown): boolean => typeof objet === 'object' && objet !== null && Object.keys(objet).length === 0;

/**
 * Remet la palette sous la forme que la recette range : un décalage du Color
 * shift dont les deux bouts valent zéro disparaît, un réglage nul aussi, des
 * réglages sans teinte, clarté ni part laissent la place au classement
 * automatique du porteur, et une palette à une intensité garde un Color shift
 * unique.
 */
function purger(palette: Palette): Palette {
  let p = palette;
  for (const cle of PROFILS) {
    for (const grandeur of ['saturation', 'clarte'] as const) {
      const d = p.derive[cle][grandeur];
      if (d && d.clair === 0 && d.sombre === 0) p = poser(p, ['derive', cle, grandeur], undefined);
    }
  }
  if (p.intensites === 1) p = { ...p, derive: { ...p.derive, soft: p.derive.vivid } };
  if (p.reglages) {
    for (const grandeur of ['teinte', 'clarte'] as const) {
      for (const cle of PROFILS) if (lireValeur(p.reglages, [grandeur, cle]) === 0) p = poser(p, ['reglages', grandeur, cle], undefined);
      if (p.reglages && estVide(p.reglages[grandeur])) p = poser(p, ['reglages', grandeur], undefined);
    }
    if (p.reglages && p.reglages.teinte === undefined && p.reglages.clarte === undefined && p.reglages.part === undefined) {
      const { reglages: _reglages, originale: _originale, ...reste } = p;
      p = reste;
    }
  }
  return p;
}

/** Les précisions de la recette ([MOT-27]) : angles au centième, parts et clartés au millième. */
const DECIMALES: readonly (readonly [Chemin, number])[] = [
  ...PROFILS.flatMap((cle) => [
    [['derive', cle, 'clair'], 2],
    [['derive', cle, 'sombre'], 2],
    [['derive', cle, 'saturation', 'clair'], 2],
    [['derive', cle, 'saturation', 'sombre'], 2],
    [['derive', cle, 'clarte', 'clair'], 3],
    [['derive', cle, 'clarte', 'sombre'], 3],
    [['parts', cle], 3],
    [['reglages', 'teinte', cle], 2],
    [['reglages', 'clarte', cle], 3],
  ] as (readonly [Chemin, number])[]),
  [['reglages', 'part'], 3],
];

/**
 * Ramène la palette trouvée à la forme la plus simple qui rend les mêmes
 * octets : l'ajustement continu laisse des restes (un Color shift de
 * 0,0004, un réglage de teinte de -0,87°) que l'écart nul ne distingue pas.
 * Chaque retrait ou arrondi s'essaie et ne reste que si les rampes sont
 * inchangées et la palette valide.
 */
function nettoyer(c: Cadre, palette: Palette, valider: (p: Palette) => boolean): Palette {
  let courante = purger(palette);
  const exacte = (p: Palette): boolean => ecartEntre(c, p).somme === 0 && valider(p);
  if (!exacte(courante)) courante = palette;
  const tenter = (modifier: (p: Palette) => Palette): void => {
    const essai = purger(modifier(courante));
    if (essai !== courante && exacte(essai)) courante = essai;
  };
  const depart = rgb8VersOklch(lireHexa(courante.originale ?? courante.reference) ?? [0, 0, 0]);
  const tailwind = prereglageTailwind(depart, c.bouts, c.recette.derives);
  const profils: readonly Profil[] = c.unique ? ['vivid'] : PROFILS;

  const passe = (): void => {
    tenter((p) => { const { parts: _parts, ...reste } = p; return reste; });
    for (const cle of profils) {
      const autre = cle === 'soft' ? 'vivid' : 'soft';
      const avec = (derive: Palette['derive']['soft']) => (p: Palette): Palette => ({ ...p, derive: { ...p.derive, [cle]: derive } });
      if (!c.unique) tenter((p) => avec(p.derive[autre])(p));
      tenter(avec({ clair: tailwind.clair, sombre: tailwind.sombre, origine: 'tailwind' }));
      tenter(avec({ clair: 0, sombre: 0, origine: 'constante' }));
      for (const grandeur of ['saturation', 'clarte'] as const) tenter((p) => poser(p, ['derive', cle, grandeur], undefined));
    }
    for (const grandeur of ['teinte', 'clarte'] as const) {
      for (const cle of profils) tenter((p) => poser(p, ['reglages', grandeur, cle], undefined));
    }
    tenter((p) => poser(p, ['reglages', 'part'], undefined));
    for (const [chemin, decimales] of DECIMALES) {
      if (c.unique && chemin[1] === 'soft') continue;
      const valeur = lireValeur(courante, chemin);
      if (valeur !== undefined) tenter((p) => poser(p, chemin, arrondir(valeur, decimales)));
    }
  };
  for (let tour = 0; tour < 3; tour += 1) {
    const avant = courante;
    passe();
    if (courante === avant) break;
  }
  return courante;
}

function rendre(c: Cadre, figee: PaletteFigee, palette: Palette): ReglagesRetrouves {
  const final = nommerLesDerives(c, palette);
  const voulues = rampesFigees(figee, c.recette, c.unique);
  const calculees = rampesDe(c.recette, final);
  let ecart = 0;
  let differentes = 0;
  for (const cle of c.cles) {
    const a = c.unique ? voulues.unique : voulues[cle];
    const b = c.unique ? calculees.unique : calculees[cle];
    if (!a || !b) continue;
    for (const mode of MODES) {
      a[mode].forEach((cran, rang) => {
        const autre = b[mode][rang];
        const d = Math.max(...cran.couleur.map((canal, i) => Math.abs(canal - autre.couleur[i])));
        if (d > 0) differentes += 1;
        if (d > ecart) ecart = d;
      });
    }
  }
  const { id: _id, crans: _crans, intensites: _intensites, ...reglages } = final;
  return { reglages, ecart, differentes };
}

// ---------------------------------------------------------------- entrée

/**
 * Cherche les réglages qui font rendre à `rampesDe` les couleurs d'une palette
 * figée. Rend `null` quand aucune palette valide n'a pu s'essayer : une liste
 * de nuances que les palettes libres refusent, des couleurs illisibles, ou
 * aucun ancrage possible. Sinon rend les réglages de la meilleure palette
 * essayée, avec son écart et le nombre de couleurs qui diffèrent. Un écart nul
 * est atteint dès que la recherche le trouve ; un écart non nul veut dire que
 * le budget s'est épuisé ou que la recherche a fini sans solution.
 *
 * Rejette avec une erreur nommée `AbortError` si `options.signal` s'abaisse.
 * `reglages` remplace `figees` sur la palette : il porte `reference`, `derive`,
 * `parts`, `reglages` et `originale` selon le cas. La palette garde son
 * `id`, son `nom`, sa liste `crans` et, à une intensité, `intensites: 1`.
 */
export async function reconstruireLesReglages(
  recette: Recette,
  palette: PaletteFigee,
  options: OptionsDeReconstruction = {},
): Promise<ReglagesRetrouves | null> {
  const c = bati(recette, palette);
  if (!c) return null;
  const valider = (p: Palette): boolean => 'recette' in validerRecette({ ...recette, palettes: [p] });
  const suivi = new Suivi(
    options.budgetMs ?? BUDGET_PAR_DEFAUT_MS,
    options.horloge ?? horlogeParDefaut,
    options.ceder ?? cederParDefaut,
    options.signal,
    options.progression,
  );
  const liste = candidats(c);
  if (liste.length === 0) return null;
  suivi.notifier();
  const hasard = generateur(options.graine ?? GRAINE_PAR_DEFAUT);
  // Les candidats qui portent la référence connue passent d'abord. Dans chaque groupe, le premier temps passe sur tous avant
  // que le second ne coûte, et le second commence par le candidat dont l'ajustement s'est le mieux approché.
  const groupes = c.reference
    ? [liste.filter((k) => hexa(k.couleur) === c.reference), liste.filter((k) => hexa(k.couleur) !== c.reference)]
    : [liste];
  const PART_DU_PREMIER_TEMPS = 0.3;
  let faite = 0;
  try {
    for (const groupe of groupes) {
      const etudes = groupe.map((k) => etudier(c, suivi, valider, k, hasard));
      for (const etude of etudes) {
        await suivi.point();
        await etude.rapide((partie) => suivi.avancer((faite + PART_DU_PREMIER_TEMPS * partie) / liste.length));
        faite += PART_DU_PREMIER_TEMPS;
      }
      etudes.sort((a, b) => a.ecart - b.ecart);
      for (const etude of etudes) {
        await suivi.point();
        await etude.lent((partie) => suivi.avancer((faite + (1 - PART_DU_PREMIER_TEMPS) * partie) / liste.length));
        faite += 1 - PART_DU_PREMIER_TEMPS;
      }
    }
  } catch (erreur) {
    if (!(erreur instanceof Trouve) && !(erreur instanceof Epuisement)) throw erreur;
  }
  const meilleure = suivi.trouvee ?? suivi.pistes.find((piste) => valider(piste.palette)) ?? null;
  if (!meilleure) return null;
  const retenue = meilleure.mesure.somme === 0 ? nettoyer(c, meilleure.palette, valider) : meilleure.palette;
  const resultat = rendre(c, palette, retenue);
  suivi.terminer();
  return resultat;
}
