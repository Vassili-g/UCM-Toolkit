/**
 * Les opérateurs du moteur du stress test F8 : la traduction des points de l'exporteur en constats C30, C34, C35, C41, C42 et C44
 * (`constatsDuMoteur.ts`) et leur rangement dans le panneau (`elementDuConstat`). 114 cas : M1 40, M2 8, M3 17, M4 5, M6 14, M7 21, M8 9.
 *
 * Un point est une phrase du moteur (`PointACorriger` du socle) posée sur des nœuds. Le moteur double rend les mêmes `warnings`,
 * `parties` et `localisations` que le moteur réel. L'oracle vient de l'inventaire 4.8 et de la section 3.3 du plan : le code suit le
 * sens du point, jamais un mot de son titre ; seuls C41 et la sévérité `danger` rendent un constat bloquant ; l'identifiant d'un
 * constat ne dépend pas de l'ordre des phrases et reste unique.
 *
 * M7 rejoue pour le doublon du kit et du moteur la chaîne sandbox de F3 (`lancerLaChaine`) sur un cas du kit de F3 et F4 : l'oracle
 * dit que seul le constat du kit reste sur le layer (Q-09), si bien que tout C30 sur ce layer est un faux constat. Trois cas (C64, C65 et
 * C81 avec C30) restent `mesure` « non constructible » : leur source demande les opérateurs de F5 et F6 ou la propagation, hors de ce lot.
 */
import type { Constat } from '@ucm-kit/core/controles';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import { constatsDuMoteur } from '../../../src/constatsDuMoteur';
import { elementDuConstat } from '../../../src/ui/panneau/elements';
import { graineDe, melanger, mulberry32 } from '../../../../kit/tests/stress/commun/prng';
import {
  attenduC43, attenduC44, HYPOTHESES, Registre, sorteDeC44, cleDeConstat, type AttenduF8, type CasF8, type DefinitionDeCas, type SortieDeCas, type Variante,
} from './cas';
import {
  CORPUS_DU_MOTEUR, familleDuConstatAttendu, gabaritDe, type CodeDuMoteur, type GabaritDuMoteur,
} from './corpusDuMoteur';
import { avecLeConteneur, avecLesRegles, jouerLaPage, reglesDe, specR0 } from './operateursRegles';
import { nombreDeReglesDuJeu, REDIGE } from './profilsRegles';
import type { SpecDePage } from './pageDeRegles';

export interface PointPose {
  readonly point: PointACorriger;
  readonly noeuds: readonly string[];
}

/** Un point que le moteur rend sans ses parties (une phrase seule). */
export interface PhraseSeule {
  readonly phrase: string;
  readonly noeuds: readonly string[];
}

const NOEUD = '12:34';
const VARIANTS_DU_RELEVE = new Set(['12:10', '12:11']);

/** La clé que l'oracle donne à un point : celle de `cleDeConstat` sur le constat qu'il attend. */
export function cleDuPoint(code: CodeDuMoteur, point: PointACorriger, noeuds: readonly string[]): string {
  const sorte = code === 'C44' ? sorteDeC44(point.titre) : null;
  return sorte ?? `${point.titre}|${point.impact}|${[...noeuds].sort().join(',')}`;
}

export function attenduDuPoint(code: CodeDuMoteur, point: PointACorriger, noeuds: readonly string[], plus: { type?: Constat['type']; variants?: readonly string[] } = {}): AttenduF8 {
  const bloquant = code === 'C41' || point.severite === 'danger';
  const type = plus.type ?? (bloquant ? 'bloquant' : code === 'C30' || code === 'C44' ? 'corriger' : 'verifier');
  const variants = plus.variants ?? noeuds.filter((id) => VARIANTS_DU_RELEVE.has(id));
  return {
    code, cle: cleDuPoint(code, point, noeuds), forme: 'a-faire', type, famille: familleDuConstatAttendu(code) as Constat['famille'],
    variants, layers: noeuds.filter((id) => !variants.includes(id)), faits: { geste: point.famille },
  };
}

/** Les constats du moteur pour des points posés, dans l'ordre donné. */
export function constatsDesPoints(points: readonly (PointPose | PhraseSeule)[], variants: ReadonlySet<string> = VARIANTS_DU_RELEVE): Constat[] {
  const phrases = points.map((entree) => ('point' in entree ? phraseDe(entree.point) : entree.phrase));
  const parties = new Map<string, PointACorriger>();
  points.forEach((entree, rang) => { if ('point' in entree) parties.set(phrases[rang], entree.point); });
  const localisations = new Map(points.map((entree, rang) => [phrases[rang], [...entree.noeuds]] as const));
  return constatsDuMoteur({ warnings: phrases, parties, localisations } as never, variants);
}

const permutations = <T>(liste: readonly T[]): T[][] => (liste.length <= 1 ? [[...liste]] : liste.flatMap((element, rang) => permutations([...liste.slice(0, rang), ...liste.slice(rang + 1)]).map((reste) => [element, ...reste])));

interface OptionsDeMoteur {
  readonly variants?: ReadonlySet<string>;
  /** Les ordres alternatifs rejoués pour juger l'indépendance des identifiants. */
  readonly alternatives?: readonly (readonly (PointPose | PhraseSeule)[])[];
}

const jouerMoteur = (points: readonly (PointPose | PhraseSeule)[], options: OptionsDeMoteur = {}) => async (variante: Variante): Promise<SortieDeCas> => {
  const ordre = variante.melange === undefined ? [...points] : melanger(mulberry32(graineDe(variante.melange, 'points')), points);
  return {
    constats: constatsDesPoints(ordre, options.variants),
    donnees: { alternatives: (options.alternatives ?? []).map((autre) => constatsDesPoints(autre, options.variants)) },
  };
};

const cleSemantique = (constat: Constat): string => `${constat.code}|${cleDeConstat(constat)}`;

/** P9 : des identifiants uniques, et les mêmes d'un ordre à l'autre. */
function verifierLesIdentifiants(sortie: SortieDeCas): string[] {
  const messages: string[] = [];
  const ids = sortie.constats.map((constat) => constat.id);
  const doubles = ids.filter((id, rang) => ids.indexOf(id) !== rang);
  if (doubles.length > 0) messages.push(`identifiants en double : ${[...new Set(doubles)].join(', ')}`);
  const base = new Map(sortie.constats.map((constat) => [cleSemantique(constat), constat.id]));
  for (const [rang, autre] of ((sortie.donnees?.alternatives ?? []) as Constat[][]).entries()) {
    const changes = autre.filter((constat) => base.has(cleSemantique(constat)) && base.get(cleSemantique(constat)) !== constat.id);
    if (changes.length > 0) messages.push(`ordre ${rang + 1} : ${changes.length} identifiant(s) changent (${changes.slice(0, 2).map((constat) => `${base.get(cleSemantique(constat))} devient ${constat.id}`).join(' ; ')})`);
  }
  return messages;
}

export const point = (titre: string, plus: Partial<PointACorriger> = {}): PointACorriger => ({ famille: 'disposition', titre, impact: 'Le contrat ne le transmettra pas.', action: 'Corrigez ce point, puis réexportez.', ...plus });

// ---------------------------------------------------------------------------------------------------------------------------
// M1 : un cas par gabarit

function operateursM1(registre: Registre): void {
  for (const gabarit of CORPUS_DU_MOTEUR) {
    const noeuds = [NOEUD];
    registre.ajouter('M1', {
      description: `${gabarit.id} (${gabarit.sens}) : ${gabarit.code} attendu`,
      attendus: [attenduDuPoint(gabarit.code, gabarit.point, noeuds, { type: gabarit.type })],
      ...(gabarit.question ? { question: gabarit.question } : {}),
      ...(gabarit.point.famille === 'proprietes' ? { rattachement: `${HYPOTHESES.H06} ; E-37` } : {}),
      jouer: jouerMoteur([{ point: gabarit.point, noeuds }]),
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// M2 : pièges de texte

function operateursM2(registre: Registre): void {
  const m2 = (description: string, p: PointACorriger, code: CodeDuMoteur, plus: Partial<DefinitionDeCas> = {}): void => {
    registre.ajouter('M2', { description, attendus: [attenduDuPoint(code, p, [NOEUD])], rattachement: HYPOTHESES.H05, jouer: jouerMoteur([{ point: p, noeuds: [NOEUD] }]), ...plus });
  };
  m2('calque nommé « masqué » dans un point `disposition` ordinaire', point('Layer « masqué » : il n\'utilise pas d\'auto layout.', { calque: 'masqué' }), 'C42');
  m2('composant nommé « masqué », combinaison manquante', point('Component Set « masqué » : une combinaison de valeurs de ses propriétés de variante n\'a pas de variant.', { famille: 'proprietes', calque: 'masqué' }), 'C34');
  m2('propriété nommée « pilote » dans une combinaison manquante', point('Component Set « Button » : une combinaison de valeurs de ses propriétés de variante n\'a pas de variant :', { famille: 'proprietes', elements: ['pilote=on'] }), 'C34');
  m2('calque nommé « Variable introuvable » dans un point C30', point('Layer « Variable introuvable », padding : aucune variable Figma n\'est reliée.', { famille: 'variables', calque: 'Variable introuvable' }), 'C30');
  m2('« variable introuvable » dans `elements` (témoin C41)', point('Layer « Card », padding : certains côtés n\'ont pas de variable exploitable :', { famille: 'variables', elements: ['variable introuvable : padding-left'] }), 'C41');
  m2('« Masqué » en majuscule dans un point `disposition` ordinaire', point('Layer « Masqué » : il n\'utilise pas d\'auto layout.', { calque: 'Masqué' }), 'C42');
  m2('« masqué » dans `elements` seul', point('Layer « Card » : il range 3 calques mais n\'utilise pas d\'auto layout, dont :', { elements: ['Badge masqué'] }), 'C42');
  m2('« Valeur introuvable » (témoin C30)', point('Layer « Valeur introuvable », gap : aucune variable associée.', { famille: 'variables', calque: 'Valeur introuvable' }), 'C30');
}

// ---------------------------------------------------------------------------------------------------------------------------
// M3 : identifiants

const FNV_DEPART = 0x811c9dc5;
function empreinte(texte: string): number {
  let h = FNV_DEPART;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const ESSAIS_MAXIMUM_DE_LA_COLLISION = 200_000;

/**
 * Deux titres de même empreinte pour le même nœud, cherchés avec un tirage à graine (mots de huit lettres) jusqu'à 200 000 essais ;
 * `null` si aucun. Une numérotation 1, 2, 3… ne suffit pas : FNV-1a y répartit mal ses sorties et n'y collisionne pas en 200 000.
 */
export function trouverUneCollisionDEmpreinte(graine = 7108, noeud = NOEUD): { titres: [string, string]; essais: number } | null {
  const tirer = mulberry32(graineDe(graine, 'collision-d-empreinte'));
  const vus = new Map<number, string>();
  for (let essai = 1; essai <= ESSAIS_MAXIMUM_DE_LA_COLLISION; essai += 1) {
    const mot = Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(tirer() * 26))).join('');
    const titre = `Layer « ${mot} » : il n'utilise pas d'auto layout.`;
    const h = empreinte(`${titre}|${noeud}`);
    const precedent = vus.get(h);
    if (precedent !== undefined) return { titres: [precedent, titre], essais: essai };
    vus.set(h, titre);
  }
  return null;
}

function operateursM3(registre: Registre): void {
  const poser = (titre: string, noeuds: readonly string[] = [NOEUD], plus: Partial<PointACorriger> = {}): PointPose => ({ point: point(titre, plus), noeuds });
  const attendre = (points: readonly PointPose[], code: CodeDuMoteur = 'C42'): AttenduF8[] => points.map((entree) => attenduDuPoint(code, entree.point, entree.noeuds));
  const m3 = (description: string, points: readonly (PointPose | PhraseSeule)[], attendus: readonly AttenduF8[], plus: { alternatives?: readonly (readonly (PointPose | PhraseSeule)[])[]; rattachement?: string; question?: string } = {}): void => {
    registre.ajouter('M3', {
      description, attendus, jouer: jouerMoteur(points, { alternatives: plus.alternatives }), verifier: verifierLesIdentifiants,
      ...(plus.rattachement ? { rattachement: plus.rattachement } : {}), ...(plus.question ? { question: plus.question } : {}),
    });
  };
  const a = { ...poser('Layer « Card » : il n\'utilise pas d\'auto layout.'), point: point('Layer « Card » : il n\'utilise pas d\'auto layout.', { impact: 'Impact A.' }) };
  const b = { ...poser('Layer « Card » : il n\'utilise pas d\'auto layout.'), point: point('Layer « Card » : il n\'utilise pas d\'auto layout.', { impact: 'Impact B.' }) };
  m3('deux phrases de même titre et mêmes nœuds', [a, b], attendre([a, b]), { alternatives: [[b, a]], rattachement: HYPOTHESES.H04 });
  m3('la même phrase deux fois', [a, a], attendre([a]));
  const trois = [poser('Layer « A » : il n\'utilise pas d\'auto layout.', ['12:1']), poser('Layer « B » : il n\'utilise pas d\'auto layout.', ['12:2']), poser('Layer « C » : il n\'utilise pas d\'auto layout.', ['12:3'])];
  const [abc, cab, bca] = [trois, [trois[2], trois[0], trois[1]], [trois[1], trois[2], trois[0]]];
  m3('trois points dans l\'ordre A, B, C', abc, attendre(trois), { alternatives: [cab, bca, [...abc].reverse()] });
  m3('trois points dans l\'ordre C, A, B', cab, attendre(trois), { alternatives: [abc, bca, [...abc].reverse()] });
  m3('trois points dans l\'ordre B, C, A', bca, attendre(trois), { alternatives: [abc, cab, [...abc].reverse()] });
  const collision = trouverUneCollisionDEmpreinte();
  if (collision) {
    const [x, y] = collision.titres.map((titre) => poser(titre));
    m3(`deux titres de même empreinte (trouvés en ${collision.essais} essais)`, [x, y], attendre([x, y]), { alternatives: [[y, x]], rattachement: HYPOTHESES.H04 });
  } else {
    m3(`deux titres de même empreinte : aucune collision en ${ESSAIS_MAXIMUM_DE_LA_COLLISION} essais, non constructible`, [], [], { question: 'non constructible' });
  }
  const u = { ...poser('Layer « Card » : il n\'utilise pas d\'auto layout.', ['12:1']), point: point('Layer « Card » : il n\'utilise pas d\'auto layout.', { impact: 'Impact A.' }) };
  const v = { ...poser('Layer « Card » : il n\'utilise pas d\'auto layout.', ['12:2']), point: point('Layer « Card » : il n\'utilise pas d\'auto layout.', { impact: 'Impact B.' }) };
  m3('même titre, nœuds différents (deux phrases)', [u, v], attendre([u, v]), { alternatives: [[v, u]] });
  const deux = poser('Layer « Card » : il n\'utilise pas d\'auto layout.', ['12:1', '12:2']);
  m3('même titre, une phrase sur deux nœuds', [deux], attendre([deux]));
  const inverse = poser('Layer « Card » : il n\'utilise pas d\'auto layout.', ['12:2', '12:1']);
  m3('mêmes nœuds dans un autre ordre', [inverse], attendre([inverse]), { alternatives: [[deux]] });
  const vide = poser('');
  m3('titre vide', [vide], attendre([vide]));
  const sans1: PhraseSeule = { phrase: 'Une phrase du moteur sans parties.', noeuds: [NOEUD] };
  const sans2: PhraseSeule = { phrase: 'Une autre phrase du moteur sans parties.', noeuds: [NOEUD] };
  const sansParties = (phrase: PhraseSeule): AttenduF8 => ({ code: 'C42', cle: `${phrase.phrase}||${phrase.noeuds.join(',')}`, forme: 'a-faire', type: 'verifier', famille: 'export' });
  m3('un point sans parties', [sans1], [sansParties(sans1)]);
  m3('deux points sans parties', [sans1, sans2], [sansParties(sans1), sansParties(sans2)], { alternatives: [[sans2, sans1]] });
  const danger = poser('Layer « Card », padding : aucune variable Figma n\'est reliée.', [NOEUD], { famille: 'variables', severite: 'danger' });
  m3('sévérité danger sur un point de variables', [danger], attendre([danger], 'C30'));
  const dangerRegles = poser('Règle @prop « size.md » : elle apparaît deux fois.', [NOEUD], { famille: 'regles', severite: 'danger' });
  m3('sévérité danger sur un point de règles', [dangerRegles], attendre([dangerRegles], 'C44'));
  const sansSeverite = poser('Layer « Card », padding : aucune variable Figma n\'est reliée.', [NOEUD], { famille: 'variables' });
  m3('sévérité absente', [sansSeverite], attendre([sansSeverite], 'C30'));
  const cent = Array.from({ length: 100 }, (_, rang) => poser(`Layer « Calque ${rang} » : il n'utilise pas d'auto layout.`, [`13:${rang}`]));
  m3('cent points distincts', cent, attendre(cent), { alternatives: [[...cent].reverse()] });
  const cinqCents = Array.from({ length: 500 }, (_, rang) => poser(`Layer « Cellule ${rang} » : il n'utilise pas d'auto layout.`));
  m3('cinq cents phrases identiques au nombre près', cinqCents, attendre(cinqCents), { alternatives: [[...cinqCents].reverse()] });
}

// ---------------------------------------------------------------------------------------------------------------------------
// M4 : nœuds

function operateursM4(registre: Registre): void {
  const p = point('Layer « Card » : il n\'utilise pas d\'auto layout.');
  const m4 = (description: string, noeuds: readonly string[], variants: readonly string[]): void => {
    registre.ajouter('M4', {
      description, attendus: [attenduDuPoint('C42', p, noeuds, { variants })], jouer: jouerMoteur([{ point: p, noeuds }], { variants: VARIANTS_DU_RELEVE }),
    });
  };
  m4('un variant du relevé', ['12:10'], ['12:10']);
  m4('un layer', ['12:40'], []);
  m4('un identifiant inconnu du relevé', ['99:99'], []);
  m4('le jeu lui-même', ['12:1'], []);
  m4('aucun nœud', [], []);
}

// ---------------------------------------------------------------------------------------------------------------------------
// M6 : rangement par élément

function operateursM6(registre: Registre): void {
  const m6 = (description: string, titre: string, element: string, plus: { code?: CodeDuMoteur; question?: string } = {}): void => {
    const p = point(titre, { famille: 'variables' });
    const code = plus.code ?? 'C30';
    registre.ajouter('M6', {
      description, attendus: [attenduDuPoint(code, p, [NOEUD])], rattachement: `${HYPOTHESES.H07} ; E-29`,
      jouer: async (variante) => {
        const sortie = await jouerMoteur([{ point: p, noeuds: [NOEUD] }])(variante);
        return { ...sortie, donnees: { elements: sortie.constats.map(elementDuConstat) } };
      },
      verifier: (sortie) => {
        const elements = (sortie.donnees?.elements ?? []) as string[];
        return elements.every((id) => id === element) ? [] : [`rangé dans « ${elements.join(', ')} », attendu « ${element} »`];
      },
      ...(plus.question ? { question: plus.question } : {}),
    });
  };
  m6('marge', 'Layer « Card », padding : aucune variable Figma n\'est reliée.', 'tailles');
  m6('espacement', 'Layer « Card », gap : aucune variable associée.', 'tailles');
  m6('rayon', 'Layer « Card », cornerRadius : aucune variable associée.', 'tailles');
  m6('épaisseur de contour', 'Layer « Card », stroke weight : aucune variable associée.', 'tailles');
  m6('remplissage', 'Layer « Card » : son fill n’est relié à aucune variable Figma.', 'couleurs');
  m6('contour', 'Layer « Card » : son stroke n’est relié à aucune variable Figma.', 'couleurs');
  m6('style de texte', 'Layer « Title », font size : aucune variable Figma n\'est reliée.', 'texte');
  m6('opacité', 'Layer « Card », opacity : aucune variable associée.', 'tokens', { question: 'Q-F89-11' });
  m6('effet', 'Style d’effets « Ombre », blur : aucune variable associée.', 'tokens', { question: 'Q-F89-11' });
  m6('dimensions minimales', 'Layer « Card » : il fixe minWidth sans variable Figma.', 'tailles');
  m6('côtés à variables différentes', 'Layer « Card », padding : les côtés ne sont pas reliés à la même variable.', 'tailles');
  m6('espacement « Auto »', 'Layer « Card » : son vertical gap est réglé sur « Auto », donc Figma répartit lui-même l\'espace.', 'tailles');
  m6('variable introuvable sur une marge', 'Layer « Card », padding : certains côtés utilisent une variable introuvable.', 'tailles', { code: 'C41' });
  m6('variable introuvable sur un remplissage', 'Layer « Card », fill : variable introuvable : fills.', 'couleurs', { code: 'C41' });
}

// ---------------------------------------------------------------------------------------------------------------------------
// M7 : doublons du kit et du moteur

const NON_CONSTRUCTIBLE = 'non constructible';

export interface SourceDuKit {
  readonly operateur: string;
  readonly code: string;
  readonly description: string;
}

/** Les cas du kit de F3 et F4 qui portent un constat du code demandé sur le layer et le champ que la description nomme. */
export async function chaineAvecLePointDuMoteur(source: SourceDuKit, plus: { moteur?: boolean; ignorer?: boolean; layerVoisin?: boolean; champ?: string } = {}): Promise<SortieDeCas> {
  const { noyauDuKit } = await import('../f3-composant/casDeLaChaine');
  const { lancerLaChaine } = await import('../f3-composant/chaine');
  const trouves = noyauDuKit().cas.filter((cas) => cas.operateur === source.operateur
    && cas.attendus.some((attendu) => attendu.code === source.code) && cas.entree.description.includes(source.description));
  const cas = trouves[0];
  if (!cas) throw new Error(`Aucun cas du kit (${source.operateur}, ${source.code}, « ${source.description} »)`);
  const kit = cas.attendus.find((attendu) => attendu.code === source.code)!;
  const [, layer, champKit] = kit.cle.split('|');
  const champ = plus.champ ?? (champKit || 'fills');
  const composant = { releve: cas.entree.composant.releve as never, catalogue: cas.entree.composant.catalogue as never };
  const base = await lancerLaChaine(composant);
  const idDuKit = base.final().constats.find((constat) => constat.code === source.code && constat.layers.includes(layer))?.id;
  const autreLayer = base.releve.variants.flatMap((variant) => variant.layers).find((entree) => entree.id !== layer && entree.id.length > 0)?.id ?? layer;
  const visee = plus.layerVoisin ? autreLayer : layer;
  const nom = base.releve.variants.flatMap((variant) => variant.layers).find((entree) => entree.id === visee)?.nom ?? visee;
  const moteur = plus.moteur === false ? undefined : { points: [{ point: { famille: 'variables' as const, titre: `${nom} : ${champ} sans variable associée.`, impact: 'La valeur ne suit pas le thème.', action: 'Lier une variable.', calque: nom }, noeuds: [visee] }] };
  const chaine = await lancerLaChaine({ ...composant, ...(moteur ? { moteur } : {}), ...(plus.ignorer && idDuKit ? { ignores: [idDuKit] } : {}) });
  const finaux = chaine.final().constats as unknown as Constat[];
  return { constats: finaux.filter((constat) => constat.layers.includes(visee) && ['C25', 'C29', 'C30'].includes(constat.code)), donnees: { kit: finaux.filter((constat) => constat.code === source.code && constat.layers.includes(layer)).length, layer, champ } };
}

function operateursM7(registre: Registre): void {
  const doublon = (description: string, source: SourceDuKit, question?: string): void => {
    registre.ajouter('M7', {
      description: `${source.code} du kit avec C30 du moteur sur ${description}`, attendus: [], codesJuges: ['C30'], rattachement: source.code === 'C25' ? 'E-25 (le kit ne juge pas ce layer), puis E-30' : 'E-30',
      jouer: () => chaineAvecLePointDuMoteur(source), ...(question ? { question } : {}),
      verifier: (sortie) => ((sortie.donnees?.kit as number) >= 1 ? [] : [`le constat ${source.code} du kit manque sur le layer ${String(sortie.donnees?.layer)}`]),
    });
  };
  const absent = (description: string, spec: SpecDePage): void => {
    registre.ajouter('M7', {
      description: `C43 avec C44 « aucune instance » : ${description}`, attendus: [attenduC43(nombreDeReglesDuJeu(spec.proprietes))], codesJuges: ['C43', 'C44'], rattachement: 'E-30',
      jouer: jouerLaPage(spec),
    });
  };
  const base = specR0();
  absent('page vierge', { ...base, conteneurs: [] });
  absent('instance sur une autre page', avecLeConteneur(base, { emplacement: 'autre-page' }));
  doublon('un remplissage', { operateur: 'U1', code: 'C25', description: 'fond de Root' });
  doublon('un contour', { operateur: 'U1', code: 'C25', description: 'trait de Root' });
  doublon('une plage de texte', { operateur: 'U1', code: 'C25', description: 'plage' });
  for (const champ of ['paddingLeft', 'itemSpacing', 'cornerRadius', 'strokeWeight', 'counterAxisSpacing']) doublon(`le champ ${champ}`, { operateur: 'Z1', code: 'C29', description: champ });
  for (const [code, nom] of [['C64', 'un texte (C64)'], ['C65', 'un texte (C65)'], ['C81', 'une propagation (C81)']] as const) {
    registre.ajouter('M7', {
      description: `${code} du kit avec C30 du moteur sur ${nom} : ${NON_CONSTRUCTIBLE} dans ce lot`, attendus: [], codesJuges: ['C30'], question: NON_CONSTRUCTIBLE, rattachement: 'E-30',
      jouer: async () => ({ constats: [] }),
    });
  }
  registre.ajouter('M7', {
    description: 'témoin : C44 « À compléter » seul', attendus: [attenduC44('a-completer|@usage')], codesJuges: ['C43', 'C44'],
    jouer: jouerLaPage(avecLesRegles(base, [{ tag: 'usage', contenu: '[À compléter] Décrivez cette règle.' }, ...reglesDe(base).filter((regle) => regle.tag !== 'usage')])),
  });
  registre.ajouter('M7', {
    description: 'témoin : C44 « plusieurs instances » seul', attendus: [attenduC44('plusieurs-instances')], codesJuges: ['C43', 'C44'],
    jouer: jouerLaPage({ ...base, conteneurs: [base.conteneurs[0], { ecrit: 'Button', regles: [{ tag: 'usage', contenu: REDIGE }], emplacement: 'page' }] }),
  });
  const sansEquivalent = (description: string, titre: string, calque: string): void => {
    const p = point(titre, { famille: 'variables', calque });
    registre.ajouter('M7', {
      description, attendus: [attenduDuPoint('C30', p, [NOEUD])], codesJuges: ['C30'], jouer: jouerMoteur([{ point: p, noeuds: [NOEUD] }]),
    });
  };
  sansEquivalent('témoin : C30 sur `opacity`, sans équivalent du kit (Root)', 'Layer « Root », opacity : aucune variable associée.', 'Root');
  sansEquivalent('témoin : C30 sur `opacity`, sans équivalent du kit (Label)', 'Layer « Label », opacity : aucune variable associée.', 'Label');
  registre.ajouter('M7', {
    description: 'témoin : C29 du kit sur un layer, C30 du moteur sur un autre layer du même champ', attendus: [], codesJuges: ['C29'], rattachement: 'E-30',
    jouer: async () => {
      const sortie = await chaineAvecLePointDuMoteur({ operateur: 'Z1', code: 'C29', description: 'paddingLeft' }, { layerVoisin: true, champ: 'paddingLeft' });
      return { ...sortie, constats: sortie.constats.filter((constat) => constat.code === 'C30') };
    },
    verifier: (sortie) => (sortie.donnees?.kit === 1 && sortie.constats.length === 1 ? [] : [`le C30 d'un autre layer doit rester : ${sortie.constats.length} C30 gardé(s)`]),
  });
  registre.ajouter('M7', {
    description: 'témoin : C29 du kit sur paddingLeft, C30 du moteur sur itemSpacing du même layer', attendus: [], codesJuges: ['C29'], rattachement: 'E-30',
    jouer: async () => {
      const sortie = await chaineAvecLePointDuMoteur({ operateur: 'Z1', code: 'C29', description: 'paddingLeft' }, { champ: 'itemSpacing' });
      return { ...sortie, constats: sortie.constats.filter((constat) => constat.code === 'C30') };
    },
    verifier: (sortie) => (sortie.donnees?.kit === 1 && sortie.constats.length === 1 ? [] : [`le C30 d'un autre champ doit rester : ${sortie.constats.length} C30 gardé(s)`]),
  });
  for (const [source, nom] of [[{ operateur: 'Z1', code: 'C29', description: 'paddingLeft' }, 'C29'], [{ operateur: 'U1', code: 'C25', description: 'fond de Root' }, 'C25']] as const) {
    registre.ajouter('M7', {
      description: `constat ${nom} du kit ignoré : le point C30 de même clé`, attendus: [], codesJuges: ['C30'], question: 'Q-F89-12', rattachement: 'E-30',
      jouer: () => chaineAvecLePointDuMoteur(source, { ignorer: true }),
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// M8 : largeur de C34

function operateursM8(registre: Registre): void {
  const m8 = (description: string, id: string, plus: { question?: boolean } = {}): void => {
    const gabarit: GabaritDuMoteur = gabaritDe(id);
    registre.ajouter('M8', {
      description: `${description} : ${gabarit.code} attendu`, attendus: [attenduDuPoint(gabarit.code, gabarit.point, [NOEUD], { type: gabarit.type })],
      jouer: jouerMoteur([{ point: gabarit.point, noeuds: [NOEUD] }]), rattachement: `${HYPOTHESES.H06} ; E-37`,
      ...(plus.question ? { question: 'Q-F89-10' } : {}),
    });
  };
  m8('une combinaison manquante', 'proprietes-2');
  m8('plusieurs combinaisons manquantes', 'proprietes-3');
  m8('« aucun variant »', 'proprietes-4', { question: true });
  m8('« aucune propriété définie »', 'proprietes-5', { question: true });
  m8('collision de noms de propriétés', 'proprietes-6', { question: true });
  m8('collision de taille', 'proprietes-7', { question: true });
  m8('état non reconnu', 'proprietes-8', { question: true });
  m8('état toléré', 'proprietes-9', { question: true });
  m8('« pilote aucun calque »', 'proprietes-1');
}

export function operateursMoteur(): CasF8[] {
  const registre = new Registre('F8');
  operateursM1(registre);
  operateursM2(registre);
  operateursM3(registre);
  operateursM4(registre);
  operateursM6(registre);
  operateursM7(registre);
  operateursM8(registre);
  return registre.cas;
}
