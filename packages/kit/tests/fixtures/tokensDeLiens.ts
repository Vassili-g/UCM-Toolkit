/**
 * Un `tokens.json` anonymisé qui a la forme d'un fichier full UCM complet : `primitives` (neuf palettes inventées), `brands` à deux
 * marques nommées `marque-1` et `marque-2` (`primary` et `secondary` en Light et en Dark, couleurs de charte), `utility` (le neutre
 * et ses bornes, quatre statuts en `soft` et `vivid`, l'élévation). Aucun nom ni aucune couleur ne vient d'un fichier réel.
 *
 * Il sert à prouver que C82 ne dit rien d'un fichier conforme dans `brands` et `utility`, et de base aux tests des liens, qui en
 * retirent ou en changent des variables.
 */
import { catalogueDepuisTokens, type CatalogueDeReference } from '../../src/controles/index.js';
import { CIBLES_DE_L_ELEVATION } from '../../src/referentiel/reference.js';
import { CRANS, MODES, PROFILS } from '../../src/referentiel/vocabulaire.js';

export const MARQUES_DE_LA_FIXTURE = ['marque-1', 'marque-2'] as const;
export const STATUTS_DE_LA_FIXTURE = ['success', 'warning', 'info', 'danger'] as const;

/** La palette que chaque famille vise : une par marque pour `primary` et `secondary`, une pour le neutre et pour chaque statut. */
export const PALETTES_DE_LA_FIXTURE = {
  'marque-1': { primary: 'cobalt', secondary: 'ambre' },
  'marque-2': { primary: 'orchidee', secondary: 'sapin' },
  neutral: 'granite',
  success: 'prairie',
  warning: 'safran',
  info: 'azur',
  danger: 'corail',
} as const;

type Jeton = Record<string, unknown>;

/** Un cran de 0 à 1 qui ne dépend que du rang de la palette et du cran : aucune teinte n'est reprise d'un fichier réel. */
const couleur = (graine: number, cran: number): Jeton => {
  const clarte = 1 - cran / 1000;
  return { $type: 'color', $value: { colorSpace: 'srgb', components: [Math.min(1, clarte * ((graine * 37) % 100) / 100 + 0.05), clarte * 0.6, Math.min(1, clarte * 0.9 + 0.05)], alpha: 1 } };
};

const alias = (chemin: string): string => `{${chemin}}`;

/** Un jeton aliasé par marque : `$value` est le mode par défaut, `com.ucm.modes` porte les autres. */
function jetonParMarque(cibles: readonly string[]): Jeton {
  const [premiere, ...autres] = cibles;
  return {
    $type: 'color', $value: alias(premiere),
    ...(autres.length === 0 ? {} : { $extensions: { 'com.ucm.modes': Object.fromEntries(autres.map((cible, rang) => [MARQUES_DE_LA_FIXTURE[rang + 1], alias(cible)])) } }),
  };
}

function poser(arbre: Jeton, chemin: readonly string[], jeton: Jeton): void {
  let courant = arbre;
  for (const segment of chemin.slice(0, -1)) courant = (courant[segment] ??= {}) as Jeton;
  courant[chemin[chemin.length - 1]] = jeton;
}

/** Les nombres de la fixture : 46 variables par marque dans `brands`, 206 dans `utility`. */
export function tokensAnonymises(): Jeton {
  const primitives: Jeton = {};
  const palettes = [
    ...Object.values(PALETTES_DE_LA_FIXTURE['marque-1']), ...Object.values(PALETTES_DE_LA_FIXTURE['marque-2']), PALETTES_DE_LA_FIXTURE.neutral,
  ];
  palettes.forEach((palette, rang) => {
    for (const theme of MODES) for (const cran of CRANS) poser(primitives, ['color', palette, theme, String(cran)], couleur(rang + 1, cran));
  });
  STATUTS_DE_LA_FIXTURE.forEach((statut, rang) => {
    for (const profil of PROFILS) for (const theme of MODES) for (const cran of CRANS) poser(primitives, ['color', PALETTES_DE_LA_FIXTURE[statut], profil, theme, String(cran)], couleur(rang + 20, cran));
  });
  poser(primitives, ['color', PALETTES_DE_LA_FIXTURE.neutral, 'white'], { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 1, 1], alpha: 1 } });
  poser(primitives, ['color', PALETTES_DE_LA_FIXTURE.neutral, 'black'], { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 } });

  const brands: Jeton = {};
  for (const famille of ['primary', 'secondary'] as const) {
    for (const theme of MODES) {
      for (const cran of CRANS) {
        poser(brands, [famille, theme, String(cran)], jetonParMarque(MARQUES_DE_LA_FIXTURE.map((marque) => `primitives.color.${PALETTES_DE_LA_FIXTURE[marque][famille]}.${theme}.${cran}`)));
      }
    }
    const cranDeCharte = famille === 'primary' ? 600 : 900;
    poser(brands, ['identity', famille], jetonParMarque(MARQUES_DE_LA_FIXTURE.map((marque) => `primitives.color.${PALETTES_DE_LA_FIXTURE[marque][famille]}.light.${cranDeCharte}`)));
  }

  const utility: Jeton = {};
  const neutre = PALETTES_DE_LA_FIXTURE.neutral;
  for (const theme of MODES) {
    for (const cran of CRANS) poser(utility, ['neutral', theme, String(cran)], jetonParMarque([`primitives.color.${neutre}.${theme}.${cran}`]));
    for (const absolue of ['white', 'black']) poser(utility, ['neutral', theme, absolue], jetonParMarque([`primitives.color.${neutre}.${absolue}`]));
    for (const niveau of ['page', 'raised'] as const) {
      const cible = CIBLES_DE_L_ELEVATION[niveau][theme];
      poser(utility, ['elevation', theme, niveau], jetonParMarque([`primitives.color.${neutre}.${'absolue' in cible ? cible.absolue : `${theme}.${cible.cran}`}`]));
    }
  }
  for (const statut of STATUTS_DE_LA_FIXTURE) {
    for (const profil of PROFILS) {
      for (const theme of MODES) {
        for (const cran of CRANS) poser(utility, [statut, profil, theme, String(cran)], jetonParMarque([`primitives.color.${PALETTES_DE_LA_FIXTURE[statut]}.${profil}.${theme}.${cran}`]));
      }
    }
  }

  return {
    $extensions: { 'com.ucm.formatVersion': 2, 'com.ucm.axes': { brands: { modes: [...MARQUES_DE_LA_FIXTURE], default: MARQUES_DE_LA_FIXTURE[0] } } },
    primitives, brands, utility,
  };
}

export const catalogueDeLiens = (): CatalogueDeReference => catalogueDepuisTokens(tokensAnonymises(), 'ucm').catalogue;
