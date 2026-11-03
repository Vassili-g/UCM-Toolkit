/**
 * L'opérateur A de F5 : la reconnaissance du nom d'un axe (E-27, Q-F5-1, Q-F5-3, Q-F5-9) et la lecture d'un axe dont les valeurs
 * viennent d'un autre registre (Q-F5-2). A1 et A2 ne portent aucun composant : `mesurer.ts` compare `axeDePropriete(nom)` au rôle
 * du cas. A3 et A4 fabriquent leur composant.
 *
 * Le rôle d'un nom `attendu` est celui du corpus ; celui d'un nom `mesure` est la proposition de la section 9 du plan. Selon Q-F5-1,
 * `Type`, `Kind` et `Shape` valent `style`, `Density` et `Spacing` valent `taille`, et un booléen n'est pas un axe. Selon Q-F5-9, un
 * nom français vaut son équivalent anglais.
 */
import type { AxeDuComposant } from '../../../src/controles/nommage.js';
import { casDegrade, Numerotation, type CasDeVariants } from './cas.js';
import { composantDeBase, type AxeDeVariants } from './composantDeBase.js';
import type { ComposantDeBase } from './portF3.js';
import { AXES_ATTESTES, roleDuCorpus } from './profils.js';

/** Les noms que le plan range comme n'étant pas des axes. */
export const NOMS_QUI_NE_SONT_PAS_DES_AXES = ['Icon', 'Label', 'Orientation', 'Theme', 'Mode', 'Statusbar', 'Resize', 'Colorful', 'Sizing', 'Stateful'] as const;

const NOMS_COMPOSES: Readonly<Record<string, readonly string[]>> = {
  'Fill style': ['fill-style', 'fill_style', 'fillStyle', 'FillStyle'],
  'High contrast': ['high-contrast', 'high_contrast', 'highContrast', 'HighContrast'],
};

/** Les noms que la lecture du code laisse prévoir mal lus (hypothèse 1 de la section 6.1). */
const NOMS_DE_L_HYPOTHESE_1 = new Set(['Kind', 'Type', 'Tone', 'Emphasis', 'Hierarchy', 'Density', 'Shape']);

function lecturesDuCorpus(numero: Numerotation): CasDeVariants[] {
  return AXES_ATTESTES.flatMap((entree) => {
    const ecritures = [entree.nom, entree.nom.toLowerCase(), entree.nom.toUpperCase(), ...(NOMS_COMPOSES[entree.nom] ?? [])];
    const attendu = roleDuCorpus(entree.nom) ?? undefined;
    return ecritures.map((nom): CasDeVariants => ({
      id: numero.prochain('A1'), famille: 'F5', operateur: 'A1', verdict: entree.verdict, ...(entree.question ? { question: entree.question } : {}),
      attendus: [], ecartConnu: 'E-27', ...(NOMS_DE_L_HYPOTHESE_1.has(entree.nom) ? { hypothese: 'H1' } : {}),
      entree: { description: `A1 : le nom « ${nom} » est lu comme ${attendu ?? 'aucun axe'} (corpus : ${entree.nom})`, zones: [], lecture: { nom, attendu } },
    }));
  });
}

function nonAxes(numero: Numerotation): CasDeVariants[] {
  return NOMS_QUI_NE_SONT_PAS_DES_AXES.map((nom): CasDeVariants => ({
    id: numero.prochain('A2'), famille: 'F5', operateur: 'A2', verdict: 'attendu', attendus: [],
    entree: { description: `A2 : le nom « ${nom} » n'est pas un axe`, zones: [], lecture: { nom, attendu: undefined } },
  }));
}

interface Paire {
  readonly premier: readonly [nom: string, valeurs: readonly string[]];
  readonly second: readonly [nom: string, valeurs: readonly string[]];
  readonly role: AxeDuComposant;
}

const PAIRES: readonly Paire[] = [
  { premier: ['Variant', ['solid', 'outline']], second: ['Appearance', ['subtle', 'strong']], role: 'style' },
  { premier: ['Style', ['solid', 'outline']], second: ['Hierarchy', ['high', 'low']], role: 'style' },
  { premier: ['Size', ['sm', 'lg']], second: ['Density', ['compact', 'comfortable']], role: 'taille' },
  { premier: ['Color', ['primary', 'danger']], second: ['Tone', ['soft', 'vivid']], role: 'palette' },
  { premier: ['Color', ['primary', 'danger']], second: ['Intent', ['info', 'warning']], role: 'palette' },
  { premier: ['State', ['default', 'hover']], second: ['Status', ['info', 'warning']], role: 'etat' },
  { premier: ['Variant', ['solid', 'outline']], second: ['Type', ['text', 'link']], role: 'style' },
  { premier: ['Style', ['solid', 'outline']], second: ['Kind', ['primary', 'ghost']], role: 'style' },
];

/**
 * Deux axes du même rôle. La grammaire des tokens n'a qu'une place par rôle : les tokens s'écrivent pour le premier axe, le second
 * n'a pas de segment. Q-F5-3 propose de contrôler le premier et de dire par une information que le second ne l'est pas ; cette
 * information n'est aucun des codes de F5, donc l'oracle n'attend aucun constat.
 */
function deuxAxesDuMemeRole(numero: Numerotation): CasDeVariants[] {
  return PAIRES.map(({ premier, second, role }) => {
    const axes: AxeDeVariants[] = [{ nom: premier[0], valeurs: premier[1], segment: role }, { nom: second[0], valeurs: second[1], segment: null }];
    return casDegrade(composantDeBase('Button', axes), {
      id: numero.prochain('A3'), operateur: 'A3', verdict: 'mesure', question: 'Q-F5-3', hypothese: 'H4',
      description: `les axes ${premier[0]} et ${second[0]} ont le rôle ${role} ; seul ${premier[0]} écrit un segment`,
      zones: [{ axe: second[0], valeur: second[1][0] }], degrader: () => undefined,
    });
  });
}

interface AxeDAutreRegistre {
  readonly origine: string;
  readonly nom: string;
  readonly valeurs: readonly string[];
  readonly role: AxeDuComposant;
  readonly verdict: 'attendu' | 'mesure';
  readonly hypothese: string;
}

const AXES_D_AUTRE_REGISTRE: readonly AxeDAutreRegistre[] = [
  { origine: 'Primer', nom: 'Variant', valeurs: ['default', 'primary', 'danger'], role: 'style', verdict: 'attendu', hypothese: 'H2' },
  { origine: 'Atlaskit', nom: 'Appearance', valeurs: ['default', 'primary', 'subtle', 'warning', 'danger', 'discovery'], role: 'style', verdict: 'attendu', hypothese: 'H2' },
  { origine: 'Carbon', nom: 'Kind', valeurs: ['primary', 'secondary', 'tertiary', 'ghost', 'danger'], role: 'style', verdict: 'mesure', hypothese: 'H2' },
  { origine: 'Ant Design', nom: 'Type', valeurs: ['primary', 'default', 'dashed', 'text', 'link'], role: 'style', verdict: 'mesure', hypothese: 'H2' },
  { origine: 'sévérité', nom: 'Status', valeurs: ['info', 'success', 'warning', 'danger'], role: 'etat', verdict: 'attendu', hypothese: 'H3' },
  { origine: 'Spectrum', nom: 'Variant', valeurs: ['accent', 'primary', 'secondary', 'negative'], role: 'style', verdict: 'attendu', hypothese: 'H2' },
];

/** Un axe reconnu dont les valeurs sont des termes d'un autre registre, avec les axes `Size` et `State` du composant de base : aucun constat. */
function valeursDUnAutreRegistre(numero: Numerotation): CasDeVariants[] {
  return AXES_D_AUTRE_REGISTRE.map(({ origine, nom, valeurs, role, verdict, hypothese }) => {
    const compagnons: AxeDeVariants[] = [
      { nom: 'Size', valeurs: ['sm', 'md', 'lg'], segment: 'taille' },
      ...(role === 'etat' ? [] : [{ nom: 'State', valeurs: ['default', 'hover', 'pressed', 'disabled'], segment: 'etat' as const }]),
    ];
    const base = composantDeBase('Button', [{ nom, valeurs, segment: role }, ...compagnons]);
    return casDegrade(base, {
      id: numero.prochain('A4'), operateur: 'A4', verdict, ...(verdict === 'mesure' ? { question: 'Q-F5-2' } : {}), hypothese,
      description: `l'axe ${nom} de ${origine} (${valeurs.join(', ')}) écrit ses valeurs dans les tokens`,
      zones: [{ axe: nom, valeur: valeurs[0] }], degrader: () => undefined,
    });
  });
}

/** A (137) : 113 lectures du corpus, 10 noms qui ne sont pas des axes, 8 couples de même rôle, 6 axes à valeurs d'un autre registre. */
export function operateursAxes(_base: ComposantDeBase, _graine: number): CasDeVariants[] {
  const numero = new Numerotation();
  return [...lecturesDuCorpus(numero), ...nonAxes(numero), ...deuxAxesDuMemeRole(numero), ...valeursDUnAutreRegistre(numero)];
}
