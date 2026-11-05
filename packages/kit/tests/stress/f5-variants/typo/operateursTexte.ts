/**
 * Le cadre des cas de F6 (typographie et icônes) et l'opérateur S : le style des textes (C64) et la liaison de leur taille et de
 * leur graisse (C65), sur la base de 12 variants (`composantF6`, `Size` × `State`).
 *
 * Un cas de F6 écrit son oracle à la main, sans modèle : `casF6` copie la base, la dégrade, et lit les noms de variants sur la copie.
 * La clé d'un constat attendu est (calque, motif, champ, détail) puis les variants qu'il nomme ; un même défaut sur plusieurs variants
 * est un seul constat (P23). Un constat de C67 qui ne fait que dire une limite (`icones-permises-non-lues`, `icone-non-pilotee`)
 * n'est jugé que si le cas l'attend (`mesurer.ts`).
 *
 * Q-F6-2 propose de comparer les styles à l'intérieur d'une même valeur de l'axe de taille. Le kit les compare tous ensemble
 * (H13) : un style qui sort de son groupe de taille ne donne alors rien tant que les autres tailles portent d'autres styles. Les
 * cas où le groupe de taille tranche attendent le constat de la proposition.
 */
import type { Constat, LayerLu, LiaisonLue, VariableDuCatalogue, VariantLu } from '../../../../src/controles/index.js';
import { attendu as attenduDeBase, cleDeConstat, Degradation, Numerotation, type CasDeVariants, type ZoneTouchee } from '../cas.js';
import { composantF6, liaisonVers, segmentDeLaValeur, styleDeTexteDeLaTaille } from '../composantDeBase.js';
import type { ConstatAttendu } from '../../commun/types.js';
import type { ComposantDeBase } from '../portF3.js';

export type ControleDeStress = 'nommage' | 'oublis' | 'typographie';

/** Un cas qui dit quels contrôles le passent, et si la lecture complète des tokens fait partie de l'oracle (P1). */
export interface CasMixte extends CasDeVariants {
  readonly controles: readonly ControleDeStress[];
  readonly verifierLaLecture?: true;
}

export const HYPOTHESES_F6: Readonly<Record<string, string>> = {
  H13: 'hypothèse 13 (C64 compare tous les variants sans tenir compte de l\'axe de taille)',
  H14: 'hypothèse 14 (un texte à styles mixtes reçoit sans-style-ni-variables)',
  H17: 'hypothèse 17 (Silicone, Lexicon, IconButton sont jugés comme des icônes ; Pictogram, Glyph, icône ne le sont jamais)',
  H18: 'hypothèse 18 (C17 attend icon pour un fond nommé IconButton ou Silicone)',
  H21: 'hypothèse 21 (le texte de sans-style-ni-variables parle des autres variants)',
  H22: 'hypothèse 22 (C67 affiche la propriété avec son suffixe #id)',
  H23: 'hypothèse 23 (les cartes de question arrivent cochées ou sans Ignorer)',
  H24: 'hypothèse 24 (deux layers de même nom mêlent leurs fréquences)',
};

export const CODES_DE_TYPOGRAPHIE: ReadonlySet<string> = new Set(['C64', 'C65', 'C66', 'C67']);

// ---------------------------------------------------------------------------------------------------------------------------
// Clés de rattachement

/** Les variants d'un constat, dans une clé : triés, et résumés au-delà de trois. */
export function variantsEnCle(noms: readonly string[]): string {
  const tries = [...noms].sort();
  return tries.length > 3 ? `${tries.length} variants ${tries[0]}…${tries[tries.length - 1]}` : tries.join(';');
}

export function cleDeConstatDeTypographie(constat: Constat): string {
  const { faits } = constat;
  const motif = String(faits.motif ?? faits.cause ?? '');
  const detail = String(faits.variable ?? faits.styleLu ?? faits.propriete ?? faits.valeur ?? '');
  return `${[faits.calque, motif, faits.champ ?? '', detail].join('|')}@${variantsEnCle(constat.variants)}`;
}

/** La clé de tout constat des neuf codes de F5 et des quatre de F6. */
export const cleDeConstatDuHarnais = (constat: Constat): string => (CODES_DE_TYPOGRAPHIE.has(constat.code) ? cleDeConstatDeTypographie(constat) : cleDeConstat(constat));

export function attenduDeTypographie(
  code: 'C64' | 'C65' | 'C66' | 'C67', calque: string, motif: string, variants: readonly string[], plus: { champ?: string; detail?: string } = {},
): ConstatAttendu {
  return attenduDeBase(code, `${[calque, motif, plus.champ ?? '', plus.detail ?? ''].join('|')}@${variantsEnCle(variants)}`);
}
export const a64 = (calque: string, motif: string, variants: readonly string[], detail = ''): ConstatAttendu => attenduDeTypographie('C64', calque, motif, variants, { detail });
export const a65 = (calque: string, motif: string, variants: readonly string[], champ: string, detail = ''): ConstatAttendu => attenduDeTypographie('C65', calque, motif, variants, { champ, detail });
export const a66 = (calque: string, motif: string, variants: readonly string[], plus: { champ?: string; detail?: string } = {}): ConstatAttendu => attenduDeTypographie('C66', calque, motif, variants, plus);
export const a67 = (calque: string, motif: string, variants: readonly string[], detail = ''): ConstatAttendu => attenduDeTypographie('C67', calque, motif, variants, { detail });

// ---------------------------------------------------------------------------------------------------------------------------
// Fabrique de cas

export interface SpecF6 {
  readonly id: string;
  readonly operateur: string;
  readonly description: string;
  /** Les couples (layer, variant) touchés : `axe` porte le nom du layer, `valeur` le nom du variant. */
  readonly zones: readonly ZoneTouchee[];
  readonly degrader: (degradation: Degradation) => void;
  /** L'oracle, lu sur le composant dégradé : les noms de variants sont ceux d'après la dégradation. */
  readonly attendus: (degradation: Degradation) => ConstatAttendu[];
  readonly verdict?: 'attendu' | 'mesure';
  readonly question?: string;
  readonly hypothese?: string;
  readonly ecartConnu?: string;
  readonly famille?: string;
  readonly controles?: readonly ControleDeStress[];
}

/** Un cas qui dégrade une copie de `base` et attend ce que `spec.attendus` dit de la copie. L'oracle se calcule au premier accès. */
export function casF6(base: ComposantDeBase, spec: SpecF6): CasMixte {
  let memoire: readonly ConstatAttendu[] | undefined;
  const calculer = (): readonly ConstatAttendu[] => {
    const degradation = new Degradation(base);
    spec.degrader(degradation);
    return spec.attendus(degradation);
  };
  return {
    id: spec.id, famille: spec.famille ?? 'F6', operateur: spec.operateur, verdict: spec.verdict ?? 'attendu',
    ...(spec.question ? { question: spec.question } : {}),
    get attendus() { return (memoire ??= calculer()); },
    codesJuges: ['C64', 'C65', 'C66', 'C67'],
    ...(spec.hypothese ? { hypothese: spec.hypothese } : {}), ...(spec.ecartConnu ? { ecartConnu: spec.ecartConnu } : {}),
    controles: spec.controles ?? ['typographie'],
    entree: {
      description: `${spec.operateur} : ${spec.description}`, zones: spec.zones,
      materialiser: () => { const degradation = new Degradation(base); spec.degrader(degradation); return degradation.materialiser(); },
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Lecture et écriture des layers

export function layerDe(variant: VariantLu, nom: string): LayerLu {
  const layer = variant.layers.find((entree) => entree.nom === nom);
  if (!layer) throw new Error(`Layer ${nom} absent du variant ${variant.nom}`);
  return layer;
}

export function variableParNom(degradation: Degradation, nom: string): VariableDuCatalogue {
  const variable = degradation.catalogue.variables.find((entree) => entree.nom === nom);
  if (!variable) throw new Error(`Variable ${nom} absente du catalogue`);
  return variable;
}

export const zoneDe = (calque: string, variant: VariantLu): ZoneTouchee => ({ axe: calque, valeur: variant.nom });

/** Retire du layer ses liaisons de ce champ (sur le layer et sur les plages de son texte). */
export function delierLeChamp(degradation: Degradation, layer: LayerLu, champ: string): void {
  for (const liaison of layer.liaisons.filter((entree) => entree.champ === champ)) degradation.retirer(layer.liaisons, liaison);
  for (const plage of layer.texte?.plages ?? []) {
    for (const liaison of plage.liaisons.filter((entree) => entree.champ === champ)) degradation.retirer(plage.liaisons, liaison);
  }
}

/** Lie un champ du texte, sur une plage, à cette variable. */
export function lierLeTexte(degradation: Degradation, layer: LayerLu, champ: string, variable: VariableDuCatalogue, plage = 0): LiaisonLue {
  const cible = layer.texte!.plages[plage];
  const liaison = liaisonVers(layer.id, champ, variable, { plage: { debut: cible.debut, fin: cible.fin } });
  degradation.inserer(cible.liaisons, liaison);
  return liaison;
}

/** Un layer neuf, à ranger dans un variant avec `Degradation.inserer`. */
export function layerNeuf(id: string, nom: string, type: string, parent: string | null, plus: Partial<LayerLu> = {}): LayerLu {
  return {
    id, nom, type, parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 16, hauteur: 16 },
    peintures: [], liaisons: [], valeursEnDur: [], ...plus,
  };
}

const textePlat = (style: string | null): NonNullable<LayerLu['texte']> => ({ style, plages: [] });

// ---------------------------------------------------------------------------------------------------------------------------
// S1 : texte sans style ni variable, texte à styles mixtes

export const RANG_PREMIER = 0;
export const RANG_MILIEU = 5;
export const RANG_DERNIER = 11;
const RANGS_DE_3 = [RANG_PREMIER, RANG_MILIEU, RANG_DERNIER] as const;

function textesSansStyle(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const variants = base.releve.variants;
  const sansStyle = (d: Degradation, rang: number): void => d.fixer(layerDe(d.releve.variants[rang], 'Label').texte!, 'style', null);
  const un = RANGS_DE_3.map((rang) => casF6(base, {
    id: numero.prochain('S1'), operateur: 'S1', description: `le texte Label du variant ${variants[rang].nom} n'a ni style ni variable`,
    zones: [zoneDe('Label', variants[rang])], degrader: (d) => sansStyle(d, rang),
    attendus: () => [a64('Label', 'sans-style-ni-variables', [variants[rang].nom])],
  }));
  const tous = casF6(base, {
    id: numero.prochain('S1'), operateur: 'S1', description: `le texte Label des ${variants.length} variants n'a ni style ni variable`,
    zones: variants.map((variant) => zoneDe('Label', variant)), degrader: (d) => variants.forEach((_, rang) => sansStyle(d, rang)),
    attendus: () => [a64('Label', 'sans-style-ni-variables', variants.map((variant) => variant.nom))],
  });
  const mixte = (description: string, plusDePlages: boolean): CasDeVariants => casF6(base, {
    id: numero.prochain('S1'), operateur: 'S1', verdict: 'mesure', question: 'Q-F6-6', hypothese: 'H14',
    description: `${description} dans le variant ${variants[RANG_MILIEU].nom} : le relevé range style: null`,
    zones: [zoneDe('Label', variants[RANG_MILIEU])],
    degrader: (d) => {
      const texte = layerDe(d.releve.variants[RANG_MILIEU], 'Label').texte!;
      d.fixer(texte, 'style', null);
      if (plusDePlages) d.inserer(texte.plages, { debut: 10, fin: 14, fontSize: 14, fontWeight: 500, peintures: [], liaisons: [] });
    },
    attendus: () => [a64('Label', 'styles-mixtes', [variants[RANG_MILIEU].nom])],
  });
  return [...un, tous, mixte('deux plages à deux styles', false), mixte('trois plages à trois styles', true), mixte('une plage à style et une plage à valeurs directes', false)];
}

// ---------------------------------------------------------------------------------------------------------------------------
// S2 : style différent

const STYLE_DE_L_ECART = 'Label/Caption';

/** Garde les variants de ces rangs, retire les autres. */
function garderLesRangs(d: Degradation, base: ComposantDeBase, rangs: readonly number[]): void {
  base.releve.variants.forEach((variant, rang) => {
    if (!rangs.includes(rang)) d.retirer(d.releve.variants, d.releve.variants.find((entree) => entree.id === variant.id)!);
  });
}

const deuxTextes = (variant: VariantLu, styles: readonly [string, string]): LayerLu[] =>
  styles.map((style, rang) => layerNeuf(`${variant.id}~t${rang + 1}`, 'Text', 'TEXT', layerDe(variant, 'Root').id, { texte: textePlat(style) }));

function stylesDifferents(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const variants = base.releve.variants;
  const nom = (rang: number): string => variants[rang].nom;
  const styleDuGroupe = (rang: number): string => styleDeTexteDeLaTaille(segmentDeLaValeur('taille', variants[rang].valeurs.Size));
  const changer = (d: Degradation, rang: number, style: string | null): void => d.fixer(layerDe(d.releve.variants[rang], 'Label').texte!, 'style', style);

  const ecart = [0, 5, 10, 11].map((rang) => casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2', hypothese: 'H13',
    description: `le variant ${nom(rang)} porte ${STYLE_DE_L_ECART} au lieu de ${styleDuGroupe(rang)}, comme les 3 autres de sa taille`,
    zones: [zoneDe('Label', variants[rang])], degrader: (d) => changer(d, rang, STYLE_DE_L_ECART),
    attendus: () => [a64('Label', 'style-different', [nom(rang)], STYLE_DE_L_ECART)],
  }));

  const TAILLES: readonly string[] = ['Small', 'Medium', 'Large'];
  const proprePourUneTaille = TAILLES.slice().reverse().map((seule) => {
    const paire = TAILLES.filter((taille) => taille !== seule);
    const style = styleDeTexteDeLaTaille(segmentDeLaValeur('taille', paire[0]));
    return casF6(base, {
      id: numero.prochain('S2'), operateur: 'S2', verdict: 'mesure', question: 'Q-F6-2', hypothese: 'H13',
      description: `${paire.join(' et ')} partagent ${style}, ${seule} garde le sien : le style suit la taille`,
      zones: variants.filter((variant) => paire.includes(variant.valeurs.Size)).map((variant) => zoneDe('Label', variant)),
      degrader: (d) => d.releve.variants.forEach((variant) => { if (paire.includes(variant.valeurs.Size)) d.fixer(layerDe(variant, 'Label').texte!, 'style', style); }),
      attendus: () => [],
    });
  });

  const deux = casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2',
    description: 'deux variants seulement, le second porte un autre style : un seul voisin ne fait pas une unanimité',
    zones: [zoneDe('Label', variants[1])],
    degrader: (d) => { garderLesRangs(d, base, [0, 1]); changer(d, 1, STYLE_DE_L_ECART); },
    attendus: () => [],
  });
  const troisDontUn = casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2', verdict: 'mesure', question: 'Q-F6-2', hypothese: 'H13',
    description: `trois variants dont ${nom(4)} (Label/Medium) diffère de ${nom(0)} et ${nom(1)} (Label/Small), qui sont d'autres tailles que lui`,
    zones: [zoneDe('Label', variants[4])], degrader: (d) => garderLesRangs(d, base, [0, 1, 4]),
    attendus: () => [],
  });
  const troisTousDifferents = casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2',
    description: `trois variants, ${nom(0)}, ${nom(4)} et ${nom(8)}, portent trois styles différents : aucune unanimité`,
    zones: [0, 4, 8].map((rang) => zoneDe('Label', variants[rang])), degrader: (d) => garderLesRangs(d, base, [0, 4, 8]),
    attendus: () => [],
  });

  const deuxLayersDeMemeNom = (permuter: boolean): CasDeVariants => casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2', hypothese: 'H24',
    ...(permuter ? { verdict: 'mesure' as const, question: 'Q-F6-2' } : {}),
    description: permuter
      ? `deux layers Text de styles Label/Mono et Label/Serif dans chaque variant, permutés dans ${nom(RANG_MILIEU)}`
      : 'deux layers Text de styles Label/Mono et Label/Serif dans chaque variant',
    zones: permuter ? [zoneDe('Text', variants[RANG_MILIEU])] : variants.map((variant) => zoneDe('Text', variant)),
    degrader: (d) => {
      d.releve.variants.forEach((variant, rang) => {
        const styles: [string, string] = permuter && rang === RANG_MILIEU ? ['Label/Serif', 'Label/Mono'] : ['Label/Mono', 'Label/Serif'];
        for (const layer of deuxTextes(variant, styles)) d.inserer(variant.layers, layer);
      });
    },
    attendus: () => (permuter
      ? [a64('Text', 'style-different', [nom(RANG_MILIEU)], 'Label/Serif'), a64('Text', 'style-different', [nom(RANG_MILIEU)], 'Label/Mono')]
      : []),
  });

  const memeNomUnanime = deuxLayersDeMemeNom(false);
  const memeNomPermute = deuxLayersDeMemeNom(true);
  const renomme = casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2', verdict: 'mesure', question: 'Q-F6-2', hypothese: 'H24',
    description: `le layer Label du variant ${nom(RANG_MILIEU)} s'appelle Text : il n'a plus de voisin de même nom`,
    zones: [zoneDe('Label', variants[RANG_MILIEU])],
    degrader: (d) => d.fixer(layerDe(d.releve.variants[RANG_MILIEU], 'Label'), 'nom', 'Text'),
    attendus: () => [],
  });
  const masque = casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2',
    description: `le texte Label masqué du variant ${nom(RANG_MILIEU)} porte ${STYLE_DE_L_ECART} : un texte masqué n'est jamais jugé`,
    zones: [zoneDe('Label', variants[RANG_MILIEU])],
    degrader: (d) => {
      const label = layerDe(d.releve.variants[RANG_MILIEU], 'Label');
      d.fixer(label.texte!, 'style', STYLE_DE_L_ECART);
      d.fixer(label, 'visible', false);
    },
    attendus: () => [],
  });
  const sousUnParentMasque = casF6(base, {
    id: numero.prochain('S2'), operateur: 'S2',
    description: `le texte Label du variant ${nom(RANG_MILIEU)} porte ${STYLE_DE_L_ECART} sous un parent Root masqué`,
    zones: [zoneDe('Label', variants[RANG_MILIEU])],
    degrader: (d) => {
      const variant = d.releve.variants[RANG_MILIEU];
      d.fixer(layerDe(variant, 'Label').texte!, 'style', STYLE_DE_L_ECART);
      d.fixer(layerDe(variant, 'Root'), 'visible', false);
    },
    attendus: () => [],
  });
  return [...ecart, ...proprePourUneTaille, deux, troisDontUn, troisTousDifferents, memeNomUnanime, memeNomPermute, renomme, masque, sousUnParentMasque];
}

// ---------------------------------------------------------------------------------------------------------------------------
// S3 : taille et graisse liées

const CHAMPS_DE_TEXTE = ['fontSize', 'fontWeight'] as const;
/** Les variables de typographie de chaque champ : `label/md/font-size` existe dans la base, `font-weight` s'y ajoute (`composantF6`). */
export const VARIABLE_DE_TYPOGRAPHIE: Readonly<Record<string, string>> = { fontSize: 'label/md/font-size', fontWeight: 'label/md/font-weight' };
const AUTRES_CHAMPS = ['lineHeight', 'letterSpacing', 'fontFamily'] as const;

function tailleEtGraisse(base: ComposantDeBase, numero: Numerotation): CasDeVariants[] {
  const variants = base.releve.variants;
  const premier = variants[RANG_PREMIER];
  const jetonDeTaille = base.carte.jetons.find((jeton) => jeton.propriete === 'gap')!.nom;
  const collections: readonly (readonly [collection: string, nom: string])[] = [
    ['primitives', 'dimension/none'], ['theme', 'primary/solid/default'], ['layout', 'sizing/8'], ['components', jetonDeTaille],
  ];

  const mauvaise = CHAMPS_DE_TEXTE.flatMap((champ) => collections.map(([collection, nom]) => casF6(base, {
    id: numero.prochain('S3'), operateur: 'S3',
    description: `${champ} du texte Label de ${premier.nom} est lié à ${nom}, de ${collection}`,
    zones: [zoneDe('Label', premier)],
    degrader: (d) => { lierLeTexte(d, layerDe(d.releve.variants[RANG_PREMIER], 'Label'), champ, variableParNom(d, nom)); },
    attendus: () => [a65('Label', 'mauvaise-collection', [premier.nom], champ, nom)],
  })));

  const autres = AUTRES_CHAMPS.map((champ) => casF6(base, {
    id: numero.prochain('S3'), operateur: 'S3', verdict: 'mesure', question: 'Q-F6-7',
    description: `${champ} du texte Label de ${premier.nom} est lié à dimension/none, de primitives : C65 ne juge que fontSize et fontWeight`,
    zones: [zoneDe('Label', premier)],
    degrader: (d) => { lierLeTexte(d, layerDe(d.releve.variants[RANG_PREMIER], 'Label'), champ, variableParNom(d, 'dimension/none')); },
    attendus: () => [a65('Label', 'mauvaise-collection', [premier.nom], champ, 'dimension/none')],
  }));

  const sansLiaison = CHAMPS_DE_TEXTE.flatMap((champ) => [RANG_PREMIER, RANG_DERNIER].map((rang) => casF6(base, {
    id: numero.prochain('S3'), operateur: 'S3',
    description: `${champ} est lié à ${VARIABLE_DE_TYPOGRAPHIE[champ]} dans tous les variants sauf ${variants[rang].nom}`,
    zones: [zoneDe('Label', variants[rang])],
    degrader: (d) => d.releve.variants.forEach((variant, position) => { if (position !== rang) lierLeTexte(d, layerDe(variant, 'Label'), champ, variableParNom(d, VARIABLE_DE_TYPOGRAPHIE[champ])); }),
    attendus: () => [a65('Label', 'sans-liaison-comme-les-autres', [variants[rang].nom], champ)],
  })));

  const valides = [
    casF6(base, {
      id: numero.prochain('S3'), operateur: 'S3', description: `fontSize de ${premier.nom} est lié à label/md/font-size, de typography, sur la plage du texte`,
      zones: [zoneDe('Label', premier)],
      degrader: (d) => { lierLeTexte(d, layerDe(d.releve.variants[RANG_PREMIER], 'Label'), 'fontSize', variableParNom(d, 'label/md/font-size')); },
      attendus: () => [],
    }),
    casF6(base, {
      id: numero.prochain('S3'), operateur: 'S3', description: `fontSize de ${premier.nom} est lié à label/md/font-size, de typography, sur le layer`,
      zones: [zoneDe('Label', premier)],
      degrader: (d) => {
        const label = layerDe(d.releve.variants[RANG_PREMIER], 'Label');
        d.inserer(label.liaisons, liaisonVers(label.id, 'fontSize', variableParNom(d, 'label/md/font-size')));
      },
      attendus: () => [],
    }),
  ];
  const autreChamp = [['fontSize', 'label/md/font-weight'], ['fontWeight', 'label/md/font-size']].map(([champ, nom]) => casF6(base, {
    id: numero.prochain('S3'), operateur: 'S3', description: `${champ} de ${premier.nom} est lié à ${nom}, une variable de typography d'un autre champ`,
    zones: [zoneDe('Label', premier)],
    degrader: (d) => { lierLeTexte(d, layerDe(d.releve.variants[RANG_PREMIER], 'Label'), champ, variableParNom(d, nom)); },
    attendus: () => [],
  }));
  const illisibles: readonly (readonly [description: string, variable: LiaisonLue['variable'], illisible: boolean])[] = [
    ['la liaison de fontSize est illisible', { id: 'VariableID:9:9', cle: '', nom: '', collection: '', distante: false }, true],
    ['fontSize est lié à une variable dont la collection n\'est pas au catalogue', { id: 'VariableID:9:8', cle: 'k-fantome', nom: 'fantome/taille', collection: 'col-fantome', distante: false }, false],
  ];
  const sansLieu = illisibles.map(([description, variable, illisible]) => casF6(base, {
    id: numero.prochain('S3'), operateur: 'S3', description: `${description} dans ${premier.nom} : aucun jugement`,
    zones: [zoneDe('Label', premier)],
    degrader: (d) => {
      const label = layerDe(d.releve.variants[RANG_PREMIER], 'Label');
      const plage = label.texte!.plages[0];
      d.inserer(plage.liaisons, { champ: 'fontSize', plage: { debut: plage.debut, fin: plage.fin }, porteur: label.id, ...(illisible ? { illisible: true as const } : {}), variable });
    },
    attendus: () => [],
  }));
  return [...mauvaise, ...autres, ...sansLiaison, ...valides, ...autreChamp, ...sansLieu];
}

/** S (43) : 7 textes sans style ou à styles mixtes, 15 styles différents, 21 liaisons de taille et de graisse. */
export function operateursTexte(_base: ComposantDeBase, graine: number): CasDeVariants[] {
  const base = composantF6(graine);
  const numero = new Numerotation();
  return [...textesSansStyle(base, numero), ...stylesDifferents(base, numero), ...tailleEtGraisse(base, numero)];
}
