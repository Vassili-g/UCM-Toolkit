/**
 * Ouvre `ucm.config.json` sur disque. Sa grammaire et ses défauts vivent dans
 * `@ucm-kit/core/format`, également accessible au plugin sans `node:fs`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CONFIGURATION_PAR_DEFAUT, NOM_CONFIGURATION, configurationDepuisJson, jsonSansBom } from "@ucm-kit/core/format";

import { CHEMIN_DES_DEROGATIONS, lireDerogations } from "./derogations.mjs";

/** Un JSON du repository, BOM de tête retiré ; lève comme `readFileSync` et `JSON.parse`. */
export function lireJsonDuDepot(chemin) {
  return jsonSansBom(readFileSync(chemin, "utf8"));
}

/**
 * Lit la configuration d'un repository, et rend toujours une configuration
 * complète.
 *
 * `erreur` porte ce qui n'a pas pu être lu : fichier illisible, JSON cassé,
 * champs invalides. L'appelant décide s'il refuse, ce module ne lève pas, pour
 * la même raison que le validateur de contrats ne lève pas : un garde-fou doit
 * diagnostiquer là où il serait tentant d'exploser.
 */
export function lireConfiguration(racine) {
  const chemin = join(racine, NOM_CONFIGURATION);
  if (!existsSync(chemin)) {
    return { configuration: { ...CONFIGURATION_PAR_DEFAUT }, chemin: null, erreur: null };
  }

  let brut;
  try {
    brut = lireJsonDuDepot(chemin);
  } catch {
    return {
      configuration: { ...CONFIGURATION_PAR_DEFAUT },
      chemin,
      erreur: `${NOM_CONFIGURATION} est illisible : ce n'est pas du JSON valide.`,
    };
  }

  const { configuration, erreur } = configurationDepuisJson(brut);
  return { configuration, chemin, erreur };
}

/**
 * Lit `.ucm/derogations.json` à la racine. Un fichier absent n'est aucune
 * dérogation ; un fichier qu'on ne peut pas ouvrir est une erreur à corriger, et
 * jamais une absence.
 */
export function lireDerogationsDuDepot(racine) {
  let texte = null;
  try {
    texte = readFileSync(join(racine, CHEMIN_DES_DEROGATIONS), "utf8");
  } catch (erreur) {
    if (erreur?.code !== "ENOENT") {
      return { derogations: [], erreurs: [`${CHEMIN_DES_DEROGATIONS} est illisible : ${erreur?.code ?? "lecture impossible"}.`] };
    }
  }
  return lireDerogations(texte);
}
