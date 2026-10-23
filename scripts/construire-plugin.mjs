/**
 * Construit, ouvre en galerie ou teste un paquet après avoir construit le kit.
 *
 * Un plugin résout `@ucm-kit/core/*` vers `packages/kit/dist`. Construire un
 * plugin seul embarque donc le dernier build du kit, même si `packages/kit/src`
 * a changé depuis. Ces commandes passent par le kit d'abord :
 *
 *   npm run build:plugin -- palettes
 *   npm run galerie:plugin -- palettes
 *   npm run test:paquet -- socle
 *
 * Le script a un second emploi : `verifier-kit <nom>`, que lance le script
 * `build` de chaque plugin avant d'écrire une ligne. Il refuse alors un kit
 * compilé périmé ou sans empreinte (voir `empreinte-du-kit.mjs`).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifierKit } from "./empreinte-du-kit.mjs";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

const PLUGINS = {
  palettes: "ucm-palettes-plugin",
  architect: "ucm-architect-plugin",
  exporter: "ucm-exporter-plugin",
};

const PAQUETS_TESTES = {
  ...PLUGINS,
  socle: "ucm-plugin-socle",
  couleur: "ucm-couleur",
  hub: "ucm-hub",
  cli: "@ucm-kit/cli",
  adapter: "@ucm-kit/adapter-typescript",
};

/** Pour chaque commande : le script du paquet qu'elle lance et les noms admis. */
const COMMANDES = {
  build: { script: "build", paquets: PLUGINS },
  galerie: { script: "galerie", paquets: PLUGINS },
  test: { script: "test", paquets: PAQUETS_TESTES },
};

function echouer(message) {
  console.error(message);
  process.exit(1);
}

/** Les arguments viennent des tables ci-dessus, jamais de la ligne de commande. */
function lancer(args) {
  const resultat = spawnSync(`npm ${args.join(" ")}`, { cwd: racine, stdio: "inherit", shell: true });
  if ((resultat.status ?? 1) !== 0) process.exit(resultat.status ?? 1);
}

const [commande, nom] = process.argv.slice(2);

if (commande === "verifier-kit") {
  const verdict = verifierKit(racine);
  if (!verdict.ok) {
    echouer(
      `Le kit compilé est périmé : ${verdict.raison}\n` +
        "Le plugin embarquerait l'ancien packages/kit/dist.\n" +
        `Lance : npm run build:plugin -- ${nom ?? "<nom>"}`,
    );
  }
} else if (commande in COMMANDES) {
  const { script, paquets } = COMMANDES[commande];
  const noms = Object.keys(paquets).join(", ");
  if (!nom || !Object.hasOwn(paquets, nom)) {
    echouer(
      `${nom ? `Paquet inconnu : « ${nom} ».` : "Aucun nom de paquet donné."} ` +
        `Noms admis pour « ${commande} » : ${noms}.`,
    );
  }
  lancer(["run", "build", "--workspace", "@ucm-kit/core"]);
  lancer(["run", script, "--workspace", paquets[nom]]);
} else {
  echouer("Commande inconnue. Commandes admises : build, galerie, test, verifier-kit.");
}
