/**
 * `npm run vues` : régénère les pages que le kit et le moteur de couleur
 * produisent, et rend la liste de celles qui ont changé.
 *
 * Les générateurs lisent le kit compilé : si `packages/kit/dist/.empreinte` diffère de
 * l'empreinte des sources, le kit est reconstruit d'abord. Un fichier n'est
 * écrit que si son contenu change, fins de ligne mises à part.
 *
 * Les générateurs sont en TypeScript ; `tsx` les charge sans les compiler à part. Le chargeur s'enregistre par l'import de
 * `tsx`, comme `node --import tsx` : `tsImport` échoue sur un générateur CommonJS qui lit le kit compilé (Node 22.23, tsx 4.23).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import "tsx";

import { verifierKit } from "./empreinte-du-kit.mjs";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

const sansRetourChariot = (texte) => texte.replace(/\r\n/g, "\n");

function reconstruireLeKit() {
  const verdict = verifierKit(racine);
  if (verdict.ok) return;
  console.log(`Kit à reconstruire : ${verdict.raison}`);
  const resultat = spawnSync("npm run build --workspace @ucm-kit/core", { cwd: racine, stdio: "inherit", shell: true });
  if ((resultat.status ?? 1) !== 0) process.exit(resultat.status ?? 1);
}

async function charger(chemin) {
  return import(pathToFileURL(join(racine, chemin)).href);
}

/** Chaque vue : le fichier commité et le générateur qui rend son contenu. */
const VUES = [
  {
    fichier: "packages/couleur/planche/PLANCHE-DU-MOTEUR.html",
    contenu: async () => (await charger("packages/couleur/planche/generer-planche.ts")).genererPlanche(),
  },
  {
    fichier: "docs/notes/Recherches/Archi Tokens Multi-marques/donnees-referentiel.js",
    contenu: async () =>
      (await charger("docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts")).genererDonneesReferentiel(),
  },
  {
    fichier: "docs/notes/Recherches/Archi Tokens Multi-marques/tokens-reference.json",
    contenu: async () =>
      (await charger("docs/notes/Recherches/Archi Tokens Multi-marques/generer-reference.ts")).genererReference(),
  },
  {
    // Cette entrée lit le fichier de référence que l'entrée précédente écrit, donc elle vient après elle.
    fichier: "docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js",
    contenu: async () => {
      const dossier = "docs/notes/Recherches/Archi Tokens Multi-marques/";
      const source = JSON.parse(readFileSync(join(racine, dossier, "tokens-reference.json"), "utf8"));
      return (await charger(`${dossier}generer-vue-illustree.ts`)).genererDonneesVue(source);
    },
  },
  {
    fichier: "INVENTAIRE-UCM.html",
    contenu: async () => (await charger("docs/inventaire/generer-inventaire.ts")).genererInventaire(),
  },
];

reconstruireLeKit();

const reecrits = [];
for (const vue of VUES) {
  const chemin = join(racine, vue.fichier);
  const attendu = await vue.contenu();
  const present = existsSync(chemin) ? sansRetourChariot(readFileSync(chemin, "utf8")) : null;
  if (present === attendu) continue;
  writeFileSync(chemin, attendu);
  reecrits.push(relative(racine, chemin).split("\\").join("/"));
}

console.log(reecrits.length === 0 ? "Aucune vue à mettre à jour" : reecrits.map((f) => `Réécrit : ${f}`).join("\n"));
