/**
 * La porte des lecteurs qui ne dépendent ni de Node ni d'Ajv : un plugin
 * Figma ou une page web les embarque sans `node:fs`. Elle republie, sous les
 * mêmes noms, les fonctions de `@ucm-kit/core/lecteurs` dont aucun import ne
 * touche au disque ; ouvrir un fichier, chercher des contrats dans un dossier
 * et valider par le JSON Schema restent dans la porte Node.
 *
 * `tests/porteNavigateur.test.mjs` tient la liste dans les deux sens : rien
 * de pur n'en manque, rien de ce qui lit le disque n'y entre.
 */
export { VERSION_CONTRAT_MINIMALE, VERSION_CONTRAT_MAXIMALE, verdictDeVersion } from "./version-contrat.mjs";
export { champsInvalidesDuContrat } from "./validation-contrat.mjs";
export { validerGrapheDesContrats } from "./validation-graphe-contrats.mjs";
export { validerAdressesDEchantillons } from "./validation-echantillons.mjs";
export { vueExacteDuVariant, compositionsExactesDuVariant, projectionDeReference, nomFigmaDuVariant, nodeIdDeLiaison, messagesDExport } from "./variant-views.mjs";
export { sansEchantillon, collecterReferences } from "./references-token.mjs";
export { erreursTypesTypographiques } from "./typography-token-types.mjs";
export { indexerTokensDtcg, cheminDeReference, referencesAbsentes } from "./tokens-dtcg.mjs";
export { BORNE_DES_CYCLES, axesDeTokens, axesDuContrat, conesDesAxes, contextesDesAxes, contextesDeVerification, cyclesActifs, valeurDansLeContexte } from "./modes-tokens.mjs";
export { CARACTERISTIQUES, CHAMPS, SANS_AIDE, caracteristiquesDuContrat } from "./caracteristiques.mjs";
export { avertissementsCorrigeables, TITRE_AVERTISSEMENTS, sectionAvertissementsExport, resumeTerminalAvertissements } from "./avertissements-export.mjs";
export { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
export { bilanEstBloquant, enteteDuVerdict } from "./verdict-bilan.mjs";
export { sectionTokensManquants, resumeTerminalTokensManquants } from "./diagnostic-tokens.mjs";
export { porteLaTableDesEmplois, constatsDesEmplois, sectionEmplois, resumeTerminalEmplois } from "./diagnostic-emplois.mjs";
export { pariteEnEcart, aUnEcartDeParite, sectionEcartsDeParite, resumeTerminalEcartsDeParite } from "./diagnostic-parite.mjs";
export { repartirEchecs, diagnosticEchecsDeTests, resumeTerminalEchecsDeTests } from "./diagnostic-tests.mjs";
