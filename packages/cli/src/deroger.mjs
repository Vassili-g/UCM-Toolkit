/**
 * `ucm deroger` : écrit une dérogation du code dans `.ucm/derogations.json`.
 * Le kit porte les genres, les coordonnées et la validation ; la commande
 * ajoute ce que seul le repository sait : le `exportedAt` du contrat et l'auteur.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { CHEMIN_DES_DEROGATIONS, ajouterDerogation, coordonneesDuGenre, identifiantDuContrat, lireConfiguration, lireJsonDuDepot } from "@ucm-kit/core/lecteurs";

import { contratsDuDossier } from "./contrats.mjs";

export const USAGE_DEROGER = 'ucm deroger <composant> <genre> <coordonnées…> --motif "<raison>" [--par "<nom>"]';

/** Seules `--motif` et `--par` sont des options : tout autre argument est une coordonnée, même s'il commence par `--`. */
export function lireArgumentsDeroger(arguments_) {
  const positionnels = [];
  const options = { motif: undefined, par: undefined };
  for (let rang = 0; rang < arguments_.length; rang += 1) {
    const argument = arguments_[rang];
    if (argument === "--motif" || argument === "--par") {
      if (rang + 1 >= arguments_.length) return { erreur: `${argument} attend une valeur.` };
      options[argument.slice(2)] = arguments_[rang + 1];
      rang += 1;
    } else positionnels.push(argument);
  }
  return { composant: positionnels[0], genre: positionnels[1], coordonnees: positionnels.slice(2), ...options };
}

function auteurDeGit(racine, executerGit) {
  try {
    return String(executerGit("git", ["config", "user.name"], { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).trim();
  } catch {
    return "";
  }
}

export function deroger(arguments_, { racine = process.cwd(), ecrire = console.log, alerter = console.error, executerGit = execFileSync } = {}) {
  const echec = (message) => {
    alerter(`${message}\n\n${USAGE_DEROGER}`);
    return 2;
  };
  const lu = lireArgumentsDeroger(arguments_);
  if (lu.erreur) return echec(lu.erreur);
  const { composant, genre, coordonnees, motif } = lu;
  if (composant === undefined || genre === undefined) return echec("Le composant et le genre de l'écart sont obligatoires.");

  const { configuration, erreur } = lireConfiguration(racine);
  if (erreur) {
    alerter(erreur);
    return 2;
  }
  const cheminContrat = contratsDuDossier(resolve(racine, configuration.components)).find((chemin) => identifiantDuContrat(chemin) === composant);
  if (!cheminContrat) return echec(`Le composant ${composant} n'a pas de contrat sous ${configuration.components}.`);
  let exportedAt;
  try {
    exportedAt = lireJsonDuDepot(cheminContrat)?.meta?.exportedAt;
  } catch {
    return echec(`Le contrat de ${composant} est illisible.`);
  }
  if (typeof exportedAt !== "string" || exportedAt === "") return echec(`Le contrat de ${composant} n'a pas de meta.exportedAt : sans lui, une dérogation ne peut pas tomber au réexport.`);

  const attendues = coordonneesDuGenre(genre);
  if (!attendues) {
    // Le message du genre refusé est celui du kit : il dit la raison, ou le genre inconnu.
    const refus = ajouterDerogation(null, { composant, ecart: { genre }, export: exportedAt, motif: "-", par: "-" });
    return echec(refus.erreurs.join("\n"));
  }
  if (coordonnees.length !== attendues.length) {
    return echec(`Le genre ${genre} attend ${attendues.length} coordonnée(s) : ${attendues.join(", ")} ; ${coordonnees.length} reçue(s).`);
  }
  if (motif === undefined || motif.trim() === "" || motif.trim() === "…") return echec("--motif est obligatoire : dites pourquoi le code garde cet écart.");

  const par = (lu.par ?? auteurDeGit(racine, executerGit)).trim();
  if (par === "") return echec("Aucun auteur : `git config user.name` est vide. Passez --par \"<nom>\".");

  const chemin = resolve(racine, CHEMIN_DES_DEROGATIONS);
  const texte = existsSync(chemin) ? readFileSync(chemin, "utf8") : null;
  const entree = {
    composant,
    ecart: { genre, ...Object.fromEntries(attendues.map((cle, rang) => [cle, coordonnees[rang]])) },
    export: exportedAt,
    motif: motif.trim(),
    par,
  };
  const resultat = ajouterDerogation(texte, entree);
  if (resultat.texte === null) return echec(resultat.erreurs.join("\n"));

  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, resultat.texte, "utf8");
  ecrire([
    `Dérogation écrite dans ${CHEMIN_DES_DEROGATIONS}.`,
    ...(resultat.remplacee ? ["Elle remplace l'entrée tombée du même écart."] : []),
    JSON.stringify(entree, null, 2),
    "Commitez .ucm/derogations.json avec votre demande.",
  ].join("\n"));
  return 0;
}
