/**
 * Où vit l'implémentation d'un contrat, et si elle est là.
 * Le noyau résout un chemin et teste son existence sans lire le langage ni
 * comparer l'API ; cette mesure propre à la stack appartient à l'adaptateur.
 */
import { readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// Le motif par défaut est une valeur du format, pas une décision de ce module :
// il est aussi le défaut de `ucm.config.json`, et deux constantes pour la même
// chaîne dériveraient. Il vit donc dans `@ucm-kit/core/format`, avec le reste
// de la grammaire de configuration.
import { MOTIF_IMPLEMENTATION_PAR_DEFAUT } from "@ucm-kit/core/format";

/** L'identifiant d'artefact que porte un chemin de contrat : son nom de base. */
export function identifiantDuContrat(cheminContrat) {
  return basename(cheminContrat, ".contract.json");
}

/**
 * Le chemin où l'implémentation de ce contrat est censée se trouver.
 *
 * Le motif est résolu, pas interprété : aucun glob, aucune recherche. Un
 * emplacement calculable est ce qui permet de dire « absente » sans avoir à
 * fouiller le repo, donc sans jamais confondre « pas écrite » et « pas
 * trouvée ».
 */
export function cheminImplementation(cheminContrat, motif = MOTIF_IMPLEMENTATION_PAR_DEFAUT) {
  // Ce refus a été écrit après s'être fait prendre : `contrats.map(cheminDuComposant)`
  // passe l'index de `map` en second argument, donc un motif valant `0`. La
  // panne était un `motif.replaceAll is not a function` à trois appels de
  // profondeur, dans le kit, pour une faute commise chez le consommateur. Dire
  // ce qu'on attendait et ce qu'on a reçu coûte deux lignes et rend le
  // coupable au premier coup d'œil.
  if (typeof motif !== "string") {
    throw new TypeError(
      `cheminImplementation attend un motif textuel, par exemple `
        + `"${MOTIF_IMPLEMENTATION_PAR_DEFAUT}", et a reçu ${JSON.stringify(motif)}. `
        + `Si l'appel vient d'un \`map\`, c'est l'index que vous lui passez : `
        + `enveloppez la fonction dans une lambda.`,
    );
  }
  const remplace = motif
    .replaceAll("{dir}", dirname(cheminContrat))
    .replaceAll("{id}", identifiantDuContrat(cheminContrat));
  // `join` normalise les séparateurs : le motif s'écrit avec des `/` sur toutes
  // les plateformes, et le chemin rendu est celui du système hôte.
  return join(remplace);
}

/** Les noms d'un dossier, ou aucun s'il manque ou ne se lit pas. */
function listerLeDossier(dossier) {
  try {
    return readdirSync(dossier);
  } catch {
    return [];
  }
}

/**
 * Où en est l'implémentation de ce contrat : là sous le nom du motif, là sous
 * une autre casse, ou absente.
 *
 * Le dossier se liste au lieu de demander `existsSync`, qui ignore la casse sous
 * Windows et macOS : `button.tsx` y répondait « présent » pour `Button.tsx`, et
 * la CI sous Linux disait l'inverse. Le nom se compare ici, donc le verdict est
 * le même partout. `lister` est injectable pour poser la question sans disque.
 * Borne : seul le nom du fichier se compare ; une autre casse d'un dossier du
 * chemin n'est pas vue.
 *
 * @returns {{ presente: true } | { presente: false, autreCasse?: string }}
 */
export function etatDeLImplementation(
  cheminContrat,
  { motif = MOTIF_IMPLEMENTATION_PAR_DEFAUT, lister = listerLeDossier } = {},
) {
  const chemin = cheminImplementation(cheminContrat, motif);
  const nom = basename(chemin);
  const noms = lister(dirname(chemin));
  if (noms.includes(nom)) return { presente: true };
  const autreCasse = noms.find((candidat) => candidat.toLowerCase() === nom.toLowerCase());
  return autreCasse === undefined ? { presente: false } : { presente: false, autreCasse };
}

/** L'implémentation de ce contrat existe-t-elle, sous le nom exact du motif ? */
export function implementationPresente(cheminContrat, options = {}) {
  return etatDeLImplementation(cheminContrat, options).presente;
}
