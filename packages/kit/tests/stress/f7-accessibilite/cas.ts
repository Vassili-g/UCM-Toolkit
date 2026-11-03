/**
 * Le cadre des cas de stress test d'accessibilité (famille F7) : le type d'un cas, la clé qui rattache un constat émis à un constat
 * attendu, les constructeurs d'attendus et la fabrique de cas. Un cas ne garde que des fermetures : `materialiser()` copie P0,
 * applique la dégradation et rend la copie avec son `annuler()`.
 *
 * Un constat de contraste se range par (usage, layer, plage de texte, fond nommé) : il groupe des variants et des modes, et son
 * identifiant porte aussi le seuil et le niveau, que le cas compare à part. Les attendus se rédigent avec `oracleContraste.ts` seul.
 */
import type { Cause, NiveauWcag } from '../../../src/controles/accessibilite.js';
import type { Constat } from '../../../src/controles/index.js';
import type { CasDeStress, ConstatAttendu, Verdict } from '../commun/types.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { Degradation, type Materialise } from './degradation.js';
import { MODES_DE_STRESS, pageEtCarte, type ModeDeStress } from './couleursDeStress.js';
import { atteintLeSeuil, mesurerLaPaire, rapportDeHex, seuilDeLUsage, tronquerA2, type Couleur, type MesureAttendue } from './oracleContraste.js';

export type Usage = 'texte' | 'grand-texte' | 'icone' | 'stroke' | 'anneau';
export type FondNomme = 'page' | 'carte' | 'page-figma';
/** Les causes du kit, et celle que la proposition de Q-F7-5 ajoute pour un canal ou un alpha hors de [0, 1]. */
export type CauseAttendue = Cause | 'couleur-hors-gamut';

/** Les codes dont un constat non attendu compte comme faux constat. C53 est une propriété du profil, jugée à part. */
export const CODES_JUGES: readonly string[] = ['C49', 'C50', 'C51', 'C52'];

export interface AttenduAcc extends ConstatAttendu {
  readonly type?: Constat['type'];
  /** Le rapport du pire cas, tronqué à deux décimales. */
  readonly rapport?: number;
  readonly seuil?: number;
  readonly niveau?: NiveauWcag;
  /** Les variants que le constat nomme, dans n'importe quel ordre. */
  readonly variants?: readonly string[];
  readonly premierPlan?: string;
  readonly fond?: string;
  /** L'étiquette du pire mode, ou `[collection, mode]` sans ordre entre ses parties. */
  readonly mode?: string;
  readonly autresModes?: number;
  readonly rapports?: readonly (readonly [string, number])[];
  /** Vrai : `rapports` se compare dans l'ordre (le mode effectif d'abord) et non comme un ensemble. */
  readonly rapportsOrdonnes?: boolean;
  readonly variableDuTheme?: string;
  readonly fontSize?: number;
}

export interface EntreeAccessibilite {
  readonly description: string;
  readonly niveau: NiveauWcag;
  readonly materialiser: () => Materialise;
}

export interface CasAccessibilite extends CasDeStress<EntreeAccessibilite> {
  readonly attendus: readonly AttenduAcc[];
  /** L'hypothèse de la section 6.1 du plan que ce cas met à l'épreuve (`H1` à `H20`). */
  readonly hypothese?: string;
  /** L'écart de l'inventaire auquel le cas se rattache (`E-26`, `E-31`, `E-40`). */
  readonly ecartConnu?: string;
}

/** Les vingt hypothèses de la section 6.1, dans l'ordre de son tableau. */
export const HYPOTHESES: Readonly<Record<string, string>> = {
  H1: 'hypothèse 1 (le kit ne lit jamais espaceDeCouleur ; hors périmètre, Display P3 est écarté)',
  H2: 'hypothèse 2 (l\'opacité d\'un ancêtre ne s\'applique pas à ce qu\'il contient)',
  H3: 'hypothèse 3 (un alpha, une opacité ou une plage sans peinture à zéro donnent un texte mesuré à 1:1)',
  H4: 'hypothèse 4 (un fond porté par un frère n\'est jamais vu)',
  H5: 'hypothèse 5 (la garantie du thème ne compare ni le seuil ni le niveau)',
  H6: 'hypothèse 6 (le repli sur la page et la carte ne mesure qu\'un mode du thème)',
  H11: 'hypothèse 11 (le grand texte gras commence à 18,66 px et non à 18,6667)',
  H15: 'hypothèse 15 (le mode de fusion du layer et les effets ne sont pas lus)',
  H19: "hypothèse 19 (l'exclusion de C53 retire aussi le texte sous 12 px et la cible)",
  H16: 'hypothèse 16 (un canal ou un alpha hors de [0, 1] est borné ou pris tel quel)',
};

// ---------------------------------------------------------------------------------------------------------------------------
// Clés de rattachement

export const CLE_DE_REPLI = 'fond-de-repli';
export const CLE_DE_BORNE = 'borne';

export const cleDeContraste = (usage: Usage, layer: string, plage = '', fond = ''): string => `${usage}|${layer}|${plage}|${fond}`;
export const cleDeLimite = (cause: CauseAttendue, usage: Usage, layer: string, plage = ''): string => `limite:${cause}|${usage}|${layer}|${plage}`;
export const cleDeTaille = (layer: string, fontSize: number): string => `taille|${layer}|${fontSize}`;

const plageDansLIdentifiant = (constat: Constat, usage: string, calque: string): string => {
  const reste = constat.id.slice(`${constat.code}:${calque}:${usage}:`.length);
  return /^(\d+-\d+)(?=:)/.exec(reste)?.[1] ?? '';
};

/** La clé que `comparer` calcule pour un constat émis. */
export function cleDeConstat(constat: Constat): string {
  const faits = constat.faits as Record<string, string | number>;
  if (constat.id === 'C53') return 'C53';
  if (constat.id === 'C49:borne') return CLE_DE_BORNE;
  if (constat.id === 'C50:sans-anneau') return 'sans-anneau';
  if (constat.id === CLE_DE_REPLI) return CLE_DE_REPLI;
  if (constat.code === 'C49' && constat.id.startsWith('C49:taille:')) return cleDeTaille(String(faits.calque), Number(faits.fontSize));
  if (constat.code === 'C51') return `anneau|${faits.calque}|${faits.strokeWeight}`;
  if (constat.code === 'C52') return `cible|${faits.largeur}x${faits.hauteur}|${faits.seuil}`;
  const [usage, calque] = [String(faits.usage), String(faits.calque)];
  const plage = plageDansLIdentifiant(constat, usage, calque);
  if (constat.limite && faits.cause) return cleDeLimite(faits.cause as CauseAttendue, usage as Usage, calque, plage);
  return cleDeContraste(usage as Usage, calque, plage, faits.fondNomme === undefined ? '' : String(faits.fondNomme));
}

// ---------------------------------------------------------------------------------------------------------------------------
// Constructeurs d'attendus

const CODE_DE_L_USAGE: Readonly<Record<Usage, 'C49' | 'C50'>> = { texte: 'C49', 'grand-texte': 'C49', icone: 'C49', stroke: 'C50', anneau: 'C50' };
const detail = <T extends object>(valeurs: T): Partial<T> => Object.fromEntries(Object.entries(valeurs).filter(([, v]) => v !== undefined)) as Partial<T>;

export interface OptionsDeContraste {
  readonly usage: Usage;
  readonly layer: string;
  /** `debut-fin`, pour une plage de texte. */
  readonly plage?: string;
  readonly fond?: FondNomme;
  /** Le rapport exact de l'oracle : le constat attend sa troncature. */
  readonly rapport: number;
  readonly seuil: number;
  readonly niveau?: NiveauWcag;
  readonly type?: 'corriger' | 'verifier';
  readonly variants?: readonly string[];
  readonly premierPlan?: string;
  readonly fondHex?: string;
  readonly mode?: string;
  readonly autresModes?: number;
  readonly rapports?: readonly (readonly [string, number])[];
  readonly rapportsOrdonnes?: boolean;
  readonly variableDuTheme?: string;
}

/** Un constat de contraste sous le seuil. Sans `type`, le fond est réel et le constat se corrige. */
export function contrasteAttendu(o: OptionsDeContraste): AttenduAcc {
  return {
    code: CODE_DE_L_USAGE[o.usage], cle: cleDeContraste(o.usage, o.layer, o.plage, o.fond), forme: 'a-faire', type: o.type ?? (o.fond ? 'verifier' : 'corriger'),
    rapport: tronquerA2(o.rapport), seuil: o.seuil, niveau: o.niveau ?? 'AA',
    ...detail({ variants: o.variants, premierPlan: o.premierPlan, fond: o.fondHex, mode: o.mode, autresModes: o.autresModes, rapports: o.rapports, rapportsOrdonnes: o.rapportsOrdonnes, variableDuTheme: o.variableDuTheme }),
  };
}

/** Une limite : le kit dit ce qu'il ne sait pas lire et ne rend aucun verdict. */
export function limiteAttendue(o: { usage: Usage; layer: string; cause: CauseAttendue; plage?: string; variants?: readonly string[] }): AttenduAcc {
  return { code: CODE_DE_L_USAGE[o.usage], cle: cleDeLimite(o.cause, o.usage, o.layer, o.plage), forme: 'a-faire', type: 'info', ...detail({ variants: o.variants }) };
}

/** L'information de repli sur la page Figma. Elle porte le code du premier layer mesuré, `Root` et son trait donc C50. */
export const repliAttendu = (fondHex: string, code: 'C49' | 'C50' = 'C50'): AttenduAcc => ({ code, cle: CLE_DE_REPLI, forme: 'a-faire', type: 'info', fond: fondHex });

export const tailleAttendue = (layer: string, fontSize: number, variants?: readonly string[]): AttenduAcc =>
  ({ code: 'C49', cle: cleDeTaille(layer, fontSize), forme: 'a-faire', type: 'verifier', seuil: 12, fontSize, ...detail({ variants }) });

/** Le layer que `Degradation.poserLaPaire` pose pour chaque usage, et la plage du texte (0 à 10). */
export const LAYER_DE_L_USAGE: Readonly<Record<Usage, string>> = { texte: 'Texte', 'grand-texte': 'Texte', icone: 'Pictogramme', stroke: 'Contour', anneau: 'Ring' };
export const PLAGE_DU_TEXTE = '0-10';

/** Le constat d'une paire opaque posée par `poserLaPaire` : un seul si le rapport est sous le seuil de l'usage, aucun sinon. */
export function attenduDeLaPaire(
  usage: Usage, premierPlan: string, fond: string, niveau: NiveauWcag, variants?: readonly string[], seuil = seuilDeLUsage(usage, niveau),
): AttenduAcc[] {
  const rapport = rapportDeHex(premierPlan, fond);
  if (atteintLeSeuil(rapport, seuil)) return [];
  const plage = usage === 'texte' || usage === 'grand-texte' ? PLAGE_DU_TEXTE : undefined;
  return [contrasteAttendu({ usage, layer: LAYER_DE_L_USAGE[usage], plage, rapport, seuil, niveau, variants, premierPlan, fondHex: fond })];
}

const SEUIL_DU_TEXTE_AA = 4.5;

/** Le constat d'un texte sur des couches de fond (de la plus haute à la plus basse) posées sur `base`, ou aucun si la paire passe le seuil AA. */
export function attenduSurLeFond(premierPlan: readonly Couleur[], fond: readonly Couleur[], base: Couleur | null, cible: string): AttenduAcc[] {
  const mesure = mesurerLaPaire(premierPlan, fond, base);
  if (!mesure || atteintLeSeuil(mesure.rapport, SEUIL_DU_TEXTE_AA)) return [];
  return [contrasteAttendu({
    usage: 'texte', layer: 'Texte', plage: PLAGE_DU_TEXTE, rapport: mesure.rapport, seuil: SEUIL_DU_TEXTE_AA, variants: [cible], premierPlan: mesure.premierPlan, fondHex: mesure.fond,
  })];
}

/**
 * Les constats d'un layer sans fond opaque : il se mesure sur la page et la carte du thème, dans chaque mode de la combinaison. Pour
 * chaque fond nommé, le pire rapport des modes décide ; le constat n'existe que sous le seuil. Sans `type`, il est à vérifier.
 */
export function attendusSurPageEtCarte(o: {
  readonly usage: Usage; readonly layer?: string; readonly plage?: string; readonly seuil: number; readonly niveau?: NiveauWcag; readonly cible: string;
  /** Les couches du premier plan dans un mode, de la plus haute à la plus basse. */
  readonly premierPlan: (mode: ModeDeStress) => readonly Couleur[];
  readonly fond?: readonly Couleur[]; readonly modes?: readonly ModeDeStress[]; readonly type?: 'corriger' | 'verifier'; readonly variableDuTheme?: string;
}): AttenduAcc[] {
  const attendus: AttenduAcc[] = [];
  for (const nom of ['page', 'carte'] as const) {
    let pire: MesureAttendue | null = null;
    for (const mode of o.modes ?? MODES_DE_STRESS) {
      const mesure = mesurerLaPaire(o.premierPlan(mode), o.fond ?? [], pageEtCarte(mode)[nom]);
      if (mesure && (!pire || mesure.rapport < pire.rapport)) pire = mesure;
    }
    if (!pire || atteintLeSeuil(pire.rapport, o.seuil)) continue;
    attendus.push(contrasteAttendu({
      usage: o.usage, layer: o.layer ?? LAYER_DE_L_USAGE[o.usage], plage: o.plage ?? (o.usage === 'texte' || o.usage === 'grand-texte' ? PLAGE_DU_TEXTE : undefined),
      fond: nom, rapport: pire.rapport, seuil: o.seuil, niveau: o.niveau ?? 'AA', type: o.type ?? 'verifier', variants: [o.cible],
      premierPlan: pire.premierPlan, fondHex: pire.fond, variableDuTheme: o.variableDuTheme,
    }));
  }
  return attendus;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Fabrique

export interface DefinitionDeCas {
  readonly description: string;
  readonly degrader: (d: Degradation) => void;
  readonly attendus: readonly AttenduAcc[];
  readonly niveau?: NiveauWcag;
  readonly verdict?: Verdict;
  readonly question?: string;
  readonly hypothese?: string;
  readonly ecartConnu?: string;
}

export type FabriqueDeCas = (id: string, operateur: string, definition: DefinitionDeCas) => CasAccessibilite;

/** Une fabrique de cas sur cette base : chaque cas copie la base à sa matérialisation et la dégrade. */
export function fabrique(base: ComposantDeContraste): FabriqueDeCas {
  return (id, operateur, definition) => ({
    id, famille: 'F7', operateur, verdict: definition.verdict ?? 'attendu', ...(definition.question ? { question: definition.question } : {}),
    entree: {
      description: `${operateur} : ${definition.description}`, niveau: definition.niveau ?? base.profil.niveau,
      materialiser: () => { const d = new Degradation(base); definition.degrader(d); return d.materialiser(); },
    },
    attendus: definition.attendus, codesJuges: CODES_JUGES,
    ...(definition.hypothese ? { hypothese: definition.hypothese } : {}), ...(definition.ecartConnu ? { ecartConnu: definition.ecartConnu } : {}),
  });
}

/** Le nom du variant que les cas dégradent. */
export const nomDeLaCible = (base: ComposantDeContraste): string => base.releve.variants[0].nom;
