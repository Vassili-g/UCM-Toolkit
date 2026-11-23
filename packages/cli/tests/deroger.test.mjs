/** `ucm deroger` : l'entrée écrite, ses refus et la parité des extensions lues. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { adaptateurTypeScript } from "@ucm-kit/adapter-typescript";
import { appliquerDerogations, commandeDeDerogation } from "@ucm-kit/core/lecteurs";
import { EXTENSIONS_PAR_ADAPTATEUR, NOM_ADAPTATEUR_TYPESCRIPT } from "../src/adaptateur.mjs";
import { executer } from "../src/ucm.mjs";

const EXPORT = "2026-01-01T00:00:00.000Z";
const CONFIGURATION = { components: "components", tokens: "tokens.json", implementation: "{dir}/{id}.tsx" };

function depot(contrat = { name: "Button", meta: { exportedAt: EXPORT } }) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-deroger-"));
  const ecrire = (chemin, contenu) => { mkdirSync(dirname(join(racine, chemin)), { recursive: true }); writeFileSync(join(racine, chemin), JSON.stringify(contenu)); };
  ecrire("ucm.config.json", CONFIGURATION);
  ecrire("components/Button/Button.contract.json", contrat);
  const chemin = join(racine, ".ucm", "derogations.json");
  return { racine, chemin, ecrire, fermer: () => rmSync(racine, { recursive: true, force: true }) };
}

function lancer(d, arguments_, { auteur = "Essai\n", exportedAt } = {}) {
  const sortie = [];
  const erreurs = [];
  if (exportedAt) d.ecrire("components/Button/Button.contract.json", { name: "Button", meta: { exportedAt } });
  const code = executer(["deroger", ...arguments_], {
    racine: d.racine,
    ecrire: (texte) => sortie.push(texte),
    alerter: (texte) => erreurs.push(texte),
    executerGit: () => auteur,
  });
  return { code, sortie: sortie.join("\n"), erreurs: erreurs.join("\n") };
}

const lire = (d) => JSON.parse(readFileSync(d.chemin, "utf8")).derogations;

/** Découpe une commande comme un shell : mots nus, entre apostrophes ou entre guillemets. */
function decouper(commande) {
  const mots = [];
  const re = /'([^']*)'|"((?:\\.|[^"\\])*)"|([^\s'"]+)/g;
  for (const [, simple, double, nu] of commande.matchAll(re)) mots.push(simple ?? double?.replace(/\\(.)/g, "$1") ?? nu);
  return mots;
}

test("DR1 : la commande complète écrit l'entrée avec l'export du contrat et l'auteur de git", () => {
  const d = depot();
  try {
    const { code, sortie } = lancer(d, ["Button", "valeur-en-dur", "components/Button/Button.tsx", "#ff0000", "--motif", "Charte du partenaire"]);
    assert.equal(code, 0);
    assert.deepEqual(lire(d), [{
      composant: "Button",
      ecart: { genre: "valeur-en-dur", fichier: "components/Button/Button.tsx", valeur: "#ff0000" },
      export: EXPORT,
      motif: "Charte du partenaire",
      par: "Essai",
    }]);
    assert.match(sortie, /Commitez \.ucm\/derogations\.json avec votre demande\./);
  } finally { d.fermer(); }
});

test("DR2 : une coordonnée de trop ou de moins sort en 2 et nomme les coordonnées attendues", () => {
  const d = depot();
  try {
    for (const coordonnees of [["a.ts"], ["a.ts", "1", "2"]]) {
      const { code, erreurs } = lancer(d, ["Button", "valeur-en-dur", ...coordonnees, "--motif", "raison"]);
      assert.equal(code, 2);
      assert.match(erreurs, /fichier, valeur/);
    }
  } finally { d.fermer(); }
});

test("DR3 : un composant inconnu, un genre ambigu ou inconnu sortent en 2", () => {
  const d = depot();
  try {
    const inconnu = lancer(d, ["Carte", "valeur-en-dur", "a.ts", "1", "--motif", "raison"]);
    assert.equal(inconnu.code, 2);
    assert.match(inconnu.erreurs, /Carte/);
    const ambigu = lancer(d, ["Button", "nom-css-ambigu", "a.ts", "--motif", "raison"]);
    assert.equal(ambigu.code, 2);
    assert.match(ambigu.erreurs, /deux tokens portent ce nom/);
    const autre = lancer(d, ["Button", "genre-imaginaire", "--motif", "raison"]);
    assert.equal(autre.code, 2);
    assert.match(autre.erreurs, /genre inconnu/);
  } finally { d.fermer(); }
});

test("DR3 : un contrat sans exportedAt sort en 2", () => {
  const d = depot({ name: "Button", meta: {} });
  try {
    const { code, erreurs } = lancer(d, ["Button", "valeur-en-dur", "a.ts", "1", "--motif", "raison"]);
    assert.equal(code, 2);
    assert.match(erreurs, /exportedAt/);
  } finally { d.fermer(); }
});

test("DR4 : un motif absent, vide ou égal à … sort en 2", () => {
  const d = depot();
  try {
    for (const motif of [[], ["--motif", ""], ["--motif", "  "], ["--motif", "…"], ["--motif"]]) {
      const { code, erreurs } = lancer(d, ["Button", "valeur-en-dur", "a.ts", "1", ...motif]);
      assert.equal(code, 2);
      assert.match(erreurs, /--motif/);
    }
  } finally { d.fermer(); }
});

test("DR5 : sans --par et sans user.name, la commande demande --par ; avec --par, elle écrit", () => {
  const d = depot();
  try {
    const refus = lancer(d, ["Button", "valeur-en-dur", "a.ts", "1", "--motif", "raison"], { auteur: "\n" });
    assert.equal(refus.code, 2);
    assert.match(refus.erreurs, /--par/);
    const accepte = lancer(d, ["Button", "valeur-en-dur", "a.ts", "1", "--motif", "raison", "--par", "Camille"], { auteur: "" });
    assert.equal(accepte.code, 0);
    assert.equal(lire(d)[0].par, "Camille");
  } finally { d.fermer(); }
});

test("DR6 : une entrée identique sort en 2 ; une entrée tombée du même écart est remplacée et le dit", () => {
  const d = depot();
  try {
    const commande = ["Button", "token-inconnu", "a.ts", "--couleur-x", "--motif", "raison"];
    assert.equal(lancer(d, commande).code, 0);
    const double = lancer(d, commande);
    assert.equal(double.code, 2);
    assert.match(double.erreurs, /existe déjà/);
    const remplace = lancer(d, commande, { exportedAt: "2026-02-01T00:00:00.000Z" });
    assert.equal(remplace.code, 0);
    assert.match(remplace.sortie, /remplace/);
    assert.equal(lire(d).length, 1);
    assert.equal(lire(d)[0].export, "2026-02-01T00:00:00.000Z");
  } finally { d.fermer(); }
});

test("DR7 : une coordonnée qui commence par -- est lue comme coordonnée", () => {
  const d = depot();
  try {
    const { code } = lancer(d, ["Button", "repli-en-dur", "a.ts", "--components-x", "--motif", "raison"]);
    assert.equal(code, 0);
    assert.equal(lire(d)[0].ecart.reference, "--components-x");
  } finally { d.fermer(); }
});

test("DR8 : la commande d'un constat, découpée comme un shell, écrit l'entrée que la dérogation du juge couvre", () => {
  const d = depot();
  try {
    const coordonnees = { fichier: "components/Button/Button.tsx", valeur: "0 0 4px rgba(0, 0, 0, 0.5)" };
    const mots = decouper(commandeDeDerogation("Button", "valeur-en-dur", coordonnees));
    assert.deepEqual(mots.slice(0, 3), ["npx", "ucm", "deroger"]);
    const arguments_ = mots.slice(3);
    assert.equal(arguments_.at(-1), "…");
    arguments_[arguments_.length - 1] = "Ombre imposée par la charte";
    const { code } = lancer(d, arguments_);
    assert.equal(code, 0);
    const ecart = { genre: "valeur-en-dur", derogeable: true, coordonnees };
    const { couverts } = appliquerDerogations(lire(d), "Button", EXPORT, [ecart]);
    assert.equal(couverts.length, 1);
  } finally { d.fermer(); }
});

test("N21 : les extensions de l'adaptateur déclarées dans la CLI sont celles que son lecteur lit", () => {
  assert.deepEqual([...EXTENSIONS_PAR_ADAPTATEUR[NOM_ADAPTATEUR_TYPESCRIPT]], [...adaptateurTypeScript.lecteurDuCode.extensions]);
});
