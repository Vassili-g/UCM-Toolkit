/**
 * La prise des modules : le seul point d'entrée que le kit promet au code des
 * autres (linter, Storybook, vérificateur de rendu). Chaque nom est republié
 * sous son nom d'origine, depuis `lecteurs` ou `format`, donc la fonction est
 * celle qu'`ucm check` appelle.
 *
 * Un nom entre ici quand le code d'un module l'importe, jamais par anticipation.
 * Aucun nom de `referentiel` n'entre. Toute modification de ce fichier ou de
 * `index.d.mts` suit `invariants/versionnage.md` : une entrée du journal
 * `CHANGELOG.md`, et l'accord du mainteneur.
 */

export {
  lireConfiguration,
  trouverContrats,
  verdictDeVersion,
  vueExacteDuVariant,
  indexerTokensDtcg,
  preparerControle,
} from "@ucm-kit/core/lecteurs";

export { isTokenReference, tokenCssVariable } from "@ucm-kit/core/format";
