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
  /** C53 : le nombre de variants exclus. */
  readonly exclus?: number;
  /** `C49:borne` : les combinaisons mesurées, et celles que le kit ne mesure pas (un nombre, ou la chaîne de ses chiffres au-delà de 2^53). */
  readonly combinaisonsMesurees?: number;
  readonly combinaisonsNonMesurees?: number | string;
  /** Des faits que la proposition d'un cas `mesure` ajoute, comparés tels quels à `faits`. */
  readonly faitsEnPlus?: Readonly<Record<string, unknown>>;
}

export interface EntreeAccessibilite {
  readonly description: string;
  readonly niveau: NiveauWcag;
  readonly materialiser: () => Materialise;
}

/** La définition d'icône d'un cas de I1 : le layer posé et ce que Q-F3-4 en dit. */
export interface IconeDuCas {
  readonly nom: string;
  readonly type: string;
  readonly instance?: 'bibliotheque' | 'pilotee';
  readonly estUneIcone: boolean;
}

export interface CasAccessibilite extends CasDeStress<EntreeAccessibilite> {
  readonly attendus: readonly AttenduAcc[];
  readonly icone?: IconeDuCas;
  /** Aucun `layers` en double dans un constat émis (P8, hypothèse 20). */
  readonly layersUniques?: boolean;
  /** Le contrôle peut ne jamais finir sur cette entrée : le harnais l'exécute dans un processus à délai. */
  readonly risqueDeBoucle?: boolean;
  /** Les relations métamorphiques que l'ordre ou la casse d'un nom change légitimement. */
  readonly sansRelation?: readonly ('ordre' | 'casse')[];
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
  H7: "hypothèse 7 (une instance nommée .Ring sans peinture propre n'est pas reconnue comme anneau)",
  H8: "hypothèse 8 (un anneau rempli sans contour n'est ni mesuré ni épargné par C51)",
  H9: "hypothèse 9 (un axe booléen Disabled=True ou l'état Inactive est mesuré comme un variant actif)",
  H10: "hypothèse 10 (tout VECTOR est une icône, quel que soit son nom ; un RECTANGLE nommé icon n'en est pas une)",
  H12: "hypothèse 12 (la borne coupe les derniers variants sans dire lesquels)",
  H13: "hypothèse 13 (le produit des modes compte des collections dont le mode ne change pas la mesure)",
  H14: "hypothèse 14 (l'identifiant d'un constat porte la plage de texte et le niveau)",
  H17: "hypothèse 17 (un contour décoratif est mesuré sur le fond des ancêtres seulement)",
  H18: "hypothèse 18 (la phrase de fond-de-repli et le code du premier layer mesuré)",
  H20: "hypothèse 20 (C51 ajoute le layer d'un second anneau de même nom sans test de doublon)",
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

/** `C50:sans-anneau` : les variants en focus sans anneau reconnu visible. */
export const sansAnneauAttendu = (variants: readonly string[]): AttenduAcc => ({ code: 'C50', cle: 'sans-anneau', forme: 'a-faire', type: 'corriger', variants });

/** C51 : un anneau dont le contour n'a pas 2 px, rangé par nom et épaisseur lue. */
export const epaisseurAttendue = (layer: string, epaisseur: number, variants?: readonly string[]): AttenduAcc =>
  ({ code: 'C51', cle: `anneau|${layer}|${epaisseur}`, forme: 'a-faire', type: 'verifier', ...detail({ variants }) });

/** C52 : la racine sous 24 px (corriger) ou sous 44 px (vérifier), rangée par dimensions et seuil. */
export const cibleAttendue = (largeur: number, hauteur: number, variants?: readonly string[]): AttenduAcc => {
  const seuil = Math.min(largeur, hauteur) < 24 ? 24 : 44;
  return { code: 'C52', cle: `cible|${largeur}x${hauteur}|${seuil}`, forme: 'a-faire', type: seuil === 24 ? 'corriger' : 'verifier', seuil, ...detail({ variants }) };
};

/** C53 : le nombre de variants désactivés que le contrôle exclut. */
export const desactivesAttendu = (exclus: number): AttenduAcc => ({ code: 'C53', cle: 'C53', forme: 'a-faire', type: 'info', exclus });

/** `C49:borne` : un total au-delà de 5 000 combinaisons, les 5 000 premières mesurées. */
export const borneAttendue = (nonMesurees: number | string, faitsEnPlus?: Readonly<Record<string, unknown>>): AttenduAcc =>
  ({ code: 'C49', cle: CLE_DE_BORNE, forme: 'a-faire', type: 'info', combinaisonsMesurees: 5000, combinaisonsNonMesurees: nonMesurees, ...detail({ faitsEnPlus }) });

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
  /** Les codes jugés ; absent : C49 à C52. Vide : seule une exception du contrôle compte. */
  readonly codesJuges?: readonly string[];
  readonly icone?: IconeDuCas;
  readonly layersUniques?: boolean;
  readonly risqueDeBoucle?: boolean;
  readonly sansRelation?: readonly ('ordre' | 'casse')[];
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
    attendus: definition.attendus, codesJuges: definition.codesJuges ?? CODES_JUGES,
    ...(definition.hypothese ? { hypothese: definition.hypothese } : {}), ...(definition.ecartConnu ? { ecartConnu: definition.ecartConnu } : {}),
    ...(definition.icone ? { icone: definition.icone } : {}), ...(definition.layersUniques ? { layersUniques: true } : {}),
    ...(definition.risqueDeBoucle ? { risqueDeBoucle: true } : {}), ...(definition.sansRelation ? { sansRelation: definition.sansRelation } : {}),
  });
}

/** Les modes du thème que le profil de la base porte : `Light` et `Dark`, ou `Light` seul. */
export const modesDuProfil = (base: ComposantDeContraste): readonly ModeDeStress[] => (base.profil.modes === 2 ? MODES_DE_STRESS : MODES_DE_STRESS.slice(0, 1));

/** Le nom du variant que les cas dégradent. */
export const nomDeLaCible = (base: ComposantDeContraste): string => base.releve.variants[0].nom;
