/**
 * Délimite le rapport CI à la demande de fusion courante.
 *
 * Ce module répond à deux questions, et il est l'autorité unique des deux :
 * quels états informatifs cette demande peut publier, et si elle concerne UCM.
 * Les séparer ferait diverger deux définitions du même périmètre.
 *
 * La cohérence du repository reste contrôlée globalement. En revanche, un
 * contrat valide mais encore sans composant ne doit être mentionné que dans
 * la demande qui le modifie : sinon un export Button reparle indéfiniment
 * d'un Alert déjà présent dans `main`.
 */
import { NOM_CONFIGURATION } from "@ucm-kit/core/format";

import { cheminImplementation } from "./implementation.mjs";

/** Uniformise les chemins Git (`/`) et Node sous Windows (`\`). */
function normaliserChemin(chemin) {
  return chemin.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
}

/**
 * Ce que la demande de fusion touche, du point de vue d'UCM.
 *
 * Sans liste fournie, l'appel est local ou lancé sur la branche par défaut :
 * tous les bilans restent visibles et le rapport s'écrit en entier. Une liste
 * vide est au contraire une demande sans aucun fichier d'UCM, donc aucun
 * ancien état « implémentation en attente » n'y est repris.
 *
 * **Un bilan entre dans le périmètre par son contrat, par son implémentation ou
 * par un autre fichier de son code.** Le contrat seul laissait passer la
 * demande qui casse la conformité dans le code : elle ne modifie aucun
 * `*.contract.json`, donc l'écart de parité qu'elle vient d'ouvrir disparaissait
 * du rapport. L'adresse de l'implémentation se résout par le motif de
 * `ucm.config.json` ; aucune extension n'est écrite ici, puisque le format ne
 * connaît aucune stack. Les autres fichiers du composant viennent de
 * `bilan.code.fichiers`, que l'adaptateur a relevés (relatifs à la racine) : une
 * demande qui ne touche que `Button.variants.ts` concerne `Button`.
 *
 * **Un contrat se reconnaît à son nom, jamais à sa présence sur le disque.**
 * Une demande qui supprime un contrat, ou qui dépose un premier export hors du
 * dossier déclaré, ne rencontre aucun bilan : ce sont pourtant les deux
 * demandes où le rapport doit parler, la seconde parce que lui seul nomme le
 * dossier que le contrôle a cherché.
 */
export function perimetreDeLaDemande(bilans, cheminsModifies, { motif, tokensModifies = false, cheminTokens } = {}) {
  if (cheminsModifies === undefined) return { bilans, concerne: true, genre: "sans-base" };

  const modifies = new Set(
    cheminsModifies
      .split(/\r?\n/)
      .map(normaliserChemin)
      .filter(Boolean),
  );

  const retenus = bilans.filter((bilan) =>
    modifies.has(normaliserChemin(bilan.relatif))
    || modifies.has(normaliserChemin(cheminImplementation(bilan.relatif, motif)))
    || (bilan.code?.fichiers ?? []).some((fichier) => modifies.has(normaliserChemin(fichier))));

  const concerne = Boolean(tokensModifies)
    || modifies.has(NOM_CONFIGURATION)
    || [...modifies].some((chemin) => chemin.endsWith(".contract.json"))
    || retenus.length > 0;

  return { bilans: retenus, concerne, genre: genreDeLaDemande(cheminsModifies, { cheminTokens, tokensModifies }) };
}

/**
 * Le genre d'une demande, qui décide de ce dont elle répond (autorité :
 * `verdictDeLaDemande`, `verdict-bilan.mjs`).
 *
 * - `"sans-base"` : pas de liste de fichiers, un contrôle local ou un envoi
 *   direct ;
 * - `"code"` : elle modifie au moins un fichier qui n'est ni un contrat ni
 *   `tokens.json`, y compris `ucm.config.json` et `.ucm/derogations.json` ;
 * - `"contrats-et-tokens"` : elle ne modifie que des contrats, avec ou sans
 *   `tokens.json`. Une demande sans aucun fichier se classe ici : elle ne
 *   modifie rien dont elle puisse répondre ;
 * - `"tokens-seuls"` : elle ne modifie que `tokens.json`.
 *
 * `cheminTokens` est la source de tokens de `ucm.config.json`. Sans lui, un
 * `tokens.json` modifié compte comme un fichier de code. `tokensModifies`, le
 * relevé de Git, suffit aussi à dire que `tokens.json` a changé.
 */
export function genreDeLaDemande(cheminsModifies, { cheminTokens, tokensModifies = false } = {}) {
  if (cheminsModifies === undefined) return "sans-base";

  const tokens = cheminTokens === undefined ? undefined : normaliserChemin(cheminTokens);
  const modifies = cheminsModifies
    .split(/\r?\n/)
    .map(normaliserChemin)
    .filter(Boolean);
  const contrats = modifies.filter((chemin) => chemin.endsWith(".contract.json"));
  const autres = modifies.filter((chemin) => !chemin.endsWith(".contract.json") && chemin !== tokens);

  if (autres.length > 0) return "code";
  if (contrats.length > 0) return "contrats-et-tokens";
  const tokensTouches = Boolean(tokensModifies) || (tokens !== undefined && modifies.includes(tokens));
  return tokensTouches ? "tokens-seuls" : "contrats-et-tokens";
}
