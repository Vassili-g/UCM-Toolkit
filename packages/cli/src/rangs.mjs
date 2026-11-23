/** Mesure les rangs des contrats, de leur implémentation et des tokens sur le premier parent de Git. Le kit juge ces mesures. */
import { execFileSync } from "node:child_process";
import { relative, resolve } from "node:path";
import { cheminImplementation, identifiantDuContrat } from "@ucm-kit/core/lecteurs";

/** Un chemin relatif au dossier contrôlé, avec les séparateurs que Git rend. */
const relatif = (racine, chemin) => relative(racine, resolve(racine, chemin)).replaceAll("\\", "/");
const cheminsDe = (texte) => texte.split("\0").filter(Boolean);

/** Le plus petit rang connu des fichiers, `null` si aucun n'est connu. */
function rangDuCode(fichiers, mesurer) {
  const connus = fichiers.map((fichier) => mesurer(fichier).rang).filter((rang) => rang !== null);
  return connus.length === 0 ? null : Math.min(...connus);
}

/**
 * Sans dépôt Git, rend `historique: aucun`. Un clone superficiel se rend au kit sans rangs pour son diagnostic d'invocation.
 * Avec base, les changements viennent du diff de la demande ; sans base, ils viennent de la copie de travail, index compris.
 * Un fichier absent de la ligne principale reçoit `null`, jamais un rang qui inventerait son ancienneté.
 * Avec `fichiersDuComposant`, le rang du code d'un composant est le plus petit rang connu de ses fichiers, `null` si aucun n'est connu.
 */
export function mesurerLesRangs(racine, configuration, contrats, { base = null, modifies = [], executer = execFileSync, maintenant = new Date(), fichiersDuComposant } = {}) {
  const git = (arguments_) => executer("git", arguments_, { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try { git(["rev-parse", "--show-toplevel"]); } catch (erreur) {
    if (/not a git repository/i.test(String(erreur?.stderr))) return { historique: "aucun", rangs: {} };
    throw erreur;
  }
  if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") return { historique: "superficiel", rangs: {} };

  const reference = base ?? "HEAD";
  let commits;
  try { commits = git(["rev-list", "--first-parent", reference]).trim().split("\n").filter(Boolean); } catch (erreur) {
    // Un dépôt initialisé, sans premier commit, n'a encore aucun rang. Une base donnée qui n'existe pas reste une erreur.
    if (!base && /bad revision|unknown revision|ambiguous argument/i.test(String(erreur?.stderr))) return { historique: "aucun", rangs: {} };
    throw erreur;
  }
  const rangParCommit = new Map(commits.map((commit, rang) => [commit, rang + 1]));
  const modifiesDuDossier = new Set(modifies.map((chemin) => relatif(racine, chemin)));
  if (!base) {
    for (const chemin of cheminsDe(git(["diff", "--name-only", "-z", "--relative", "HEAD"]))) modifiesDuDossier.add(chemin);
    for (const chemin of cheminsDe(git(["ls-files", "--others", "--exclude-standard", "-z"]))) modifiesDuDossier.add(chemin);
  }
  const mesures = new Map();
  const mesurer = (chemin) => {
    const nom = relatif(racine, chemin);
    if (mesures.has(nom)) return mesures.get(nom);
    let mesure;
    if (modifiesDuDossier.has(nom)) mesure = { rang: 0, depuis: new Date(maintenant).toISOString() };
    else {
      const dernier = git(["log", "--first-parent", "--diff-merges=first-parent", "-1", "--format=%H%x00%cI", reference, "--", `:(literal)${nom}`]).trim();
      const [commit, depuis] = dernier.split("\0");
      mesure = { rang: rangParCommit.get(commit) ?? null, ...(depuis ? { depuis } : {}) };
    }
    mesures.set(nom, mesure);
    return mesure;
  };
  const composants = Object.fromEntries(contrats.map((contrat) => {
    const contratMesure = mesurer(contrat);
    const implementation = cheminImplementation(contrat, configuration.implementation);
    const code = fichiersDuComposant ? rangDuCode(fichiersDuComposant(implementation).fichiers, mesurer) : mesurer(implementation).rang;
    return [identifiantDuContrat(contrat), { contrat: contratMesure.rang, code, depuis: contratMesure.depuis }];
  }));
  return { historique: "complet", rangs: { tokens: mesurer(configuration.tokens).rang, composants } };
}
