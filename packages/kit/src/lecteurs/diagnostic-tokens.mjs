import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
import { cheminDeReference } from "./tokens-dtcg.mjs";
import { TYPES_D_ALERTE } from "@ucm-kit/core/referentiel";

const GLYPHES = Object.fromEntries(TYPES_D_ALERTE.map(({ id, texte }) => [id, texte]));

/** Le nom d'un composant dans une entrée : son identifiant, ou à défaut le nom de son fichier. */
const nomDeLEntree = (entree) => entree.id ?? entree.fichier;

/**
 * Le geste d'une référence absente qui bloque. Le contrôle lit le dépôt sans
 * les demandes ouvertes de la forge. Deux causes restent possibles, des tokens
 * en attente de fusion ou des variables qui n'existent plus, et le message
 * donne le geste de chacune. UCM Exporter, qui voit ces demandes, tranche avant de
 * publier (`lireAvantEcriture`, `packages/plugin-exporter/src/depot.ts`).
 */
const ACTION_BLOQUANTE = "Si une demande de tokens est encore ouverte, le designer la fusionne d'abord, puis relance ce contrôle. Sinon, le designer remplace ces variables par les variables actuelles dans Figma, puis réexporte le composant.";

/** Une référence se lit par son chemin de token, sans les accolades du contrat. */
const cheminCite = (reference) => cheminDeReference(reference) ?? reference;

/**
 * Dit quels contrats citent des références absentes de la source DTCG.
 *
 * `tokens.json` fait foi. Deux situations demandent deux sections, que le
 * verdict de la demande départage (`verdictDeLaDemande`, `verdict-bilan.mjs`) :
 *
 * - `bloquant: true` : le contrat est plus récent que les tokens, ou la demande
 *   le modifie, et il cite un token qui n'existe pas. Le geste est
 *   `ACTION_BLOQUANTE` ;
 * - `bloquant: false` : les tokens ont changé après le contrat, qui est « en
 *   retard sur les tokens ». Rien ne le bloque, mais le designer sait quels
 *   composants réexporter.
 *
 * Chaque entrée porte `id` (ou `fichier`) et `manquants`. `tokensModifies`
 * choisit le résumé du retard : une demande qui retire les tokens le dit.
 */
export function sectionTokensManquants(entrees, { bloquant = false, tokensModifies = false, sourceTokens = "tokens.json" } = {}) {
  const concernes = entrees.filter((entree) => entree.manquants.length > 0);
  if (concernes.length === 0) return [];

  const details = concernes.flatMap((entree) =>
    entree.manquants.map((reference) => `${nomDeLEntree(entree)} : \`${cheminCite(reference)}\``));

  if (bloquant) {
    return rendreDiagnostic({
      severity: "error",
      title: "Des contrats citent des tokens absents",
      count: concernes.length,
      itemSingular: "contrat",
      summary: `\`${sourceTokens}\` est la source de vérité. Les références ci-dessous n'y existent pas.`,
      detailsTitle: "Références absentes",
      details,
      action: ACTION_BLOQUANTE,
      status: "La fusion reste bloquée.",
    });
  }

  return rendreDiagnostic({
    severity: "warning",
    title: "Des contrats citent des tokens retirés",
    count: concernes.length,
    itemSingular: "contrat",
    summary: tokensModifies
      ? "Cette demande retire des tokens que ces contrats citent encore."
      : `Ces contrats citent encore des tokens que \`${sourceTokens}\` ne contient plus.`,
    detailsTitle: "Références retirées",
    details,
    action: "Le designer doit réexporter ces composants depuis Figma.",
    status: "Ce retard ne bloque pas la fusion.",
  });
}

/**
 * Résume au terminal les références absentes, avec le verdict de la section
 * correspondante : un point qui bloque ne dit jamais qu'il ne bloque pas.
 */
export function resumeTerminalTokensManquants(entrees, sourceTokens, { bloquant = false } = {}) {
  const total = entrees.reduce((somme, entree) => somme + entree.manquants.length, 0);
  if (total === 0) return null;
  const constat = `${libelleNombre(total, "référence")} de contrat absente${total === 1 ? "" : "s"} de ${sourceTokens}.`;
  return bloquant
    ? `${GLYPHES.bloquant.brut} ${constat} Si une demande de tokens est ouverte, fusionnez-la d'abord, puis relancez ce contrôle. Sinon, remplacez ces variables par les variables actuelles dans Figma, puis réexportez le composant.`
    : `${GLYPHES.corriger.brut} ${constat} Réexportez les composants concernés. Ce retard ne bloque pas la fusion.`;
}
