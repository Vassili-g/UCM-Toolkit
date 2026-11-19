/**
 * Un exemple d'appel par nom de la prise `@ucm-kit/core/modules`, sur les
 * contrats et les tokens de `fixtures/`. `apiPublique.test.mjs` compare chaque
 * résultat à `prise-attendus.json`. Un résultat attendu qui change est une
 * rupture de la prise : le journal `CHANGELOG.md` doit alors le dire.
 *
 * Un exemple ne rend que du JSON, et aucun chemin de la machine.
 */
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as prise from "@ucm-kit/core/modules";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const lire = (...chemin) => JSON.parse(readFileSync(join(fixtures, ...chemin), "utf8"));
const enSlash = (chemin) => chemin.split("\\").join("/");

/** Nom de la fonction promise, puis l'appel et ce qu'il rend. */
export const EXEMPLES = {
  "lireConfiguration : un repository sans ucm.config.json rend la configuration par défaut": {
    nom: "lireConfiguration",
    appeler: () => prise.lireConfiguration(join(fixtures, "tokens", "origine")),
  },
  "trouverContrats : les contrats de la version 13.0": {
    nom: "trouverContrats",
    appeler: () => prise.trouverContrats(join(fixtures, "contrats", "13.0")).map((chemin) => enSlash(relative(fixtures, chemin))).sort(),
  },
  "verdictDeVersion : 13.0 se lit": { nom: "verdictDeVersion", appeler: () => prise.verdictDeVersion("13.0") },
  "verdictDeVersion : 12.0 est ancien": { nom: "verdictDeVersion", appeler: () => prise.verdictDeVersion("12.0") },
  "verdictDeVersion : 15.0 est récent": { nom: "verdictDeVersion", appeler: () => prise.verdictDeVersion("15.0") },
  "vueExacteDuVariant : la vue du premier variant de TileLink": {
    nom: "vueExacteDuVariant",
    appeler: () => {
      const contrat = lire("contrats", "13.0", "TileLink.contract.json");
      return prise.vueExacteDuVariant(contrat, contrat.variants[0]);
    },
  },
  "indexerTokensDtcg : les feuilles du fichier de tokens d'origine": {
    nom: "indexerTokensDtcg",
    appeler: () => {
      const index = prise.indexerTokensDtcg(lire("tokens", "origine", "tokens.json"));
      return {
        feuilles: index.size,
        premieres: [...index.keys()].slice(0, 3),
        rouge: index.get("primitives.color.red"),
        demi: index.get("primitives.dimensions.0,5"),
      };
    },
  },
  "isTokenReference : une référence complète": { nom: "isTokenReference", appeler: () => prise.isTokenReference("{components.button.gap}") },
  "isTokenReference : un nom sans point n'en est pas une": { nom: "isTokenReference", appeler: () => prise.isTokenReference("{à définir}") },
  "isTokenReference : sans accolades": { nom: "isTokenReference", appeler: () => prise.isTokenReference("components.button.gap") },
  "tokenCssVariable : un chemin de composant": { nom: "tokenCssVariable", appeler: () => prise.tokenCssVariable("components.button.sizes.medium.gap") },
  "tokenCssVariable : une virgule décimale": { nom: "tokenCssVariable", appeler: () => prise.tokenCssVariable("layouts.sizing.0,5") },
};

/**
 * Un nom de type n'existe pas à l'exécution : son exemple est un extrait
 * TypeScript que `apiPublique.test.mjs` compile contre la prise.
 */
export const EXEMPLES_DE_TYPES = {
  Contract: 'import type { Contract } from "@ucm-kit/core/modules";\nexport const nom: string = ({} as Contract).name;\nexport const version: string = ({} as Contract).meta.contractVersion;',
};
