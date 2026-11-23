/**
 * Non-régression du périmètre des états informatifs publiés sur une PR, et du
 * verdict « cette demande concerne-t-elle UCM ? » qui décide si le rapport
 * s'écrit.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { genreDeLaDemande, perimetreDeLaDemande } from "../src/lecteurs/perimetre-rapport.mjs";

const MOTIF = "{dir}/{id}.tsx";

/**
 * Les chemins d'un bilan portent le séparateur de la plateforme : `analyser`
 * les tire de `chemin.replace(racine, ".")`, et `cheminImplementation` les
 * résout par `node:path`. Un antislash écrit en dur passait sous Windows et
 * désignait un fichier unique sous Linux, où la résolution rendait `index.vue`
 * à la racine.
 */
const bilans = ["Alert", "Button"].map((nom) => ({
  fichier: `${nom}.contract.json`,
  relatif: join(".", "src", "components", nom, `${nom}.contract.json`),
}));

/** Raccourci : le périmètre d'une demande qui modifie ces chemins. */
function perimetre(chemins, options = {}) {
  return perimetreDeLaDemande(bilans, chemins, { motif: MOTIF, ...options });
}

test("une PR Button ne reprend pas l'état en attente de Alert", () => {
  const { bilans: selection } = perimetre("src/components/Button/Button.contract.json");

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Button.contract.json"]);
});

test("une PR sans contrat modifié ne reprend aucun ancien état", () => {
  assert.deepEqual(perimetre("").bilans, []);
});

test("un lancement hors pull request conserve le rapport global", () => {
  assert.equal(perimetreDeLaDemande(bilans, undefined, { motif: MOTIF }).bilans, bilans);
});

/**
 * Le trou que ce périmètre avait ouvert : une demande qui casse la conformité
 * dans le code seul repartait au vert, parce que la sélection ne connaissait
 * que les contrats. L'implémentation se résout par le motif de
 * `ucm.config.json`, jamais par une extension : le format ne connaît aucune
 * stack.
 */
test("une PR qui ne touche que l'implémentation garde l'état de son contrat", () => {
  const { bilans: selection, concerne } = perimetre("src/components/Button/Button.tsx");

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Button.contract.json"]);
  assert.equal(concerne, true);
});

test("le motif décide de l'implémentation, et lui seul", () => {
  const vue = perimetreDeLaDemande(bilans, "src/components/Button/index.vue", {
    motif: "{dir}/index.vue",
  });

  assert.deepEqual(vue.bilans.map((bilan) => bilan.fichier), ["Button.contract.json"]);
  assert.equal(
    perimetre("src/components/Button/index.vue").concerne,
    false,
    "sous le motif .tsx, ce fichier n'est l'implémentation de rien",
  );
});

test("hors pull request, la demande concerne toujours UCM", () => {
  assert.equal(perimetreDeLaDemande(bilans, undefined, { motif: MOTIF }).concerne, true);
});

test("une demande qui ne touche rien d'UCM ne le concerne pas", () => {
  assert.equal(perimetre(".github/workflows/ucm.yml\npackage-lock.json").concerne, false);
});

test("les tokens et la configuration concernent UCM sans qu'un contrat bouge", () => {
  assert.equal(perimetre("docs/lisez-moi.md", { tokensModifies: true }).concerne, true);
  assert.equal(perimetre("ucm.config.json").concerne, true);
});

/**
 * Le contrat se reconnaît à son nom, jamais à sa présence sur le disque.
 * Un premier export déposé hors du dossier déclaré n'est trouvé par personne :
 * c'est exactement la demande où le rapport doit parler, puisque lui seul
 * nomme le dossier cherché.
 */
test("un contrat déposé là où personne ne le cherche concerne quand même UCM", () => {
  const { bilans: selection, concerne } = perimetreDeLaDemande(
    [],
    "src/composants/Button/Button.contract.json",
    { motif: MOTIF },
  );

  assert.deepEqual(selection, []);
  assert.equal(concerne, true);
});

test("un contrat supprimé par la demande la fait concerner UCM", () => {
  assert.equal(perimetre("src/components/Card/Card.contract.json").concerne, true);
});

/**
 * `git diff` rend des `/` sur toute plateforme, et un bilan produit sous
 * Windows porte des `\`. Sans normalisation, aucun contrat ne serait jamais
 * reconnu sur cette plateforme, et tout le rapport y perdrait sa portée.
 */
test("un bilan écrit avec des antislashs désigne le contrat que git nomme avec des slashs", () => {
  const windows = [{
    fichier: "Alert.contract.json",
    relatif: ".\\src\\components\\Alert\\Alert.contract.json",
  }];
  const { bilans: selection } = perimetreDeLaDemande(
    windows,
    "src/components/Alert/Alert.contract.json",
    { motif: MOTIF },
  );

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Alert.contract.json"]);
});

/**
 * Le genre décide de ce dont la demande répond (`verdictDeLaDemande`). Un
 * fichier qui n'est ni un contrat ni `tokens.json` en fait une demande de
 * code : `ucm.config.json` et `.ucm/derogations.json` aussi.
 */
const TOKENS = "src/tokens/tokens.json";
const CONTRAT = "src/components/Button/Button.contract.json";
const genre = (chemins, options = {}) => genreDeLaDemande(chemins, { cheminTokens: TOKENS, ...options });

test("sans liste de fichiers, la demande est sans base", () => {
  assert.equal(genreDeLaDemande(undefined, { cheminTokens: TOKENS }), "sans-base");
  assert.equal(perimetreDeLaDemande(bilans, undefined, { motif: MOTIF }).genre, "sans-base");
});

test("un tokens.json seul est une demande de tokens seuls", () => {
  assert.equal(genre(TOKENS), "tokens-seuls");
  assert.equal(genre(`${TOKENS}
`), "tokens-seuls");
});

test("des contrats, avec ou sans tokens.json, sont une demande de contrats et tokens", () => {
  assert.equal(genre(CONTRAT), "contrats-et-tokens");
  assert.equal(genre(`${CONTRAT}
${TOKENS}`), "contrats-et-tokens");
  assert.equal(genre(`${CONTRAT}
src/components/Alert/Alert.contract.json`), "contrats-et-tokens");
});

test("tout autre fichier fait une demande de code, avec ou sans contrat", () => {
  assert.equal(genre("src/components/Button/Button.tsx"), "code");
  assert.equal(genre(`${CONTRAT}
src/components/Button/Button.tsx`), "code");
  assert.equal(genre(`${TOKENS}
README.md`), "code");
  assert.equal(genre("ucm.config.json"), "code");
  assert.equal(genre(".ucm/derogations.json"), "code");
});

test("le chemin de tokens se compare sans `./` ni antislash", () => {
  assert.equal(genreDeLaDemande("src/tokens/tokens.json", { cheminTokens: ".\\src\\tokens\\tokens.json" }), "tokens-seuls");
  assert.equal(genreDeLaDemande("src/tokens/tokens.json", { cheminTokens: "./src/tokens/tokens.json" }), "tokens-seuls");
});

test("sans chemin de tokens, tokens.json compte comme du code", () => {
  assert.equal(genreDeLaDemande(TOKENS), "code");
});

test("une demande sans fichier ne répond de rien : elle se juge comme une demande du designer", () => {
  assert.equal(genre(""), "contrats-et-tokens");
});

test("le périmètre rend le genre de la demande", () => {
  const { genre: rendu } = perimetre(`${TOKENS}
src/components/Button/Button.tsx`, { cheminTokens: TOKENS });

  assert.equal(rendu, "code");
  assert.equal(perimetre(TOKENS, { cheminTokens: TOKENS, tokensModifies: true }).genre, "tokens-seuls");
});

/**
 * Le périmètre du code (lot 2.1 du plan P6) : `bilan.code.fichiers` porte les
 * fichiers du composant, relatifs à la racine, avec `/`.
 */
test("une PR qui ne touche qu'un fichier voisin de l'implémentation garde l'état du composant", () => {
  const avecCode = bilans.map((bilan) => ({
    ...bilan,
    code: {
      fichiers: [`src/components/${bilan.fichier.replace(".contract.json", "")}/${bilan.fichier.replace(".contract.json", ".tsx")}`, `src/components/${bilan.fichier.replace(".contract.json", "")}/${bilan.fichier.replace(".contract.json", ".variants.ts")}`],
    },
  }));
  const { bilans: selection, concerne } = perimetreDeLaDemande(avecCode, "src/components/Button/Button.variants.ts", { motif: MOTIF });

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Button.contract.json"]);
  assert.equal(concerne, true);
});

test("un fichier hors du code d'un composant ne le met pas dans la demande", () => {
  const avecCode = bilans.map((bilan) => ({ ...bilan, code: { fichiers: [] } }));

  assert.deepEqual(perimetreDeLaDemande(avecCode, "src/components/Button/Button.stories.tsx", { motif: MOTIF }).bilans, []);
});

test("un bilan sans code reste retenu par son implémentation", () => {
  const { bilans: selection } = perimetre("src/components/Alert/Alert.tsx");

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Alert.contract.json"]);
});
