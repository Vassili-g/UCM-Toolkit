/**
 * Verrouille la forme et la portée d'une dérogation : un écart exact, un
 * export donné, et un refus nommé pour toute entrée mal formée.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ajouterDerogation, appliquerDerogations, CHEMIN_DES_DEROGATIONS, commandeDeDerogation, coordonneesDuGenre, lireDerogations } from "../src/lecteurs/derogations.mjs";
import { lireDerogationsDuDepot } from "../src/lecteurs/configuration.mjs";
import { messageDeLaLimite } from "../src/lecteurs/controle-du-code-listes.mjs";

const EXPORT = "2026-11-01T10:00:00.000Z";

const entree = (surcharge = {}) => ({
  composant: "Button",
  ecart: { genre: "valeur-non-implementee", prop: "variant", valeur: "danger" },
  export: EXPORT,
  motif: "Le texte d'erreur attend le produit.",
  par: "Camille",
  ...surcharge,
});
const lire = (...entrees) => lireDerogations(JSON.stringify({ derogations: entrees }));
const ecart = (genre, coordonnees, derogeable = true) => ({ genre, coordonnees, derogeable, niveau: "ecart", texte: "" });

test("un fichier absent ne porte aucune dérogation ni erreur", () => {
  assert.deepEqual(lireDerogations(null), { derogations: [], erreurs: [] });
});

test("une entrée valide est lue", () => {
  assert.deepEqual(lire(entree()), { derogations: [entree()], erreurs: [] });
});

test("un JSON illisible est refusé", () => {
  const { derogations, erreurs } = lireDerogations("{ pas du json");
  assert.deepEqual(derogations, []);
  assert.match(erreurs[0], /derogations\.json est illisible/);
});

test("un champ manquant, vide ou inconnu est refusé avec le chemin de l'entrée", () => {
  const sansPar = entree();
  delete sansPar.par;
  assert.match(lire(entree(), sansPar).erreurs[0], /^derogations\[1\]\.par : champ manquant/);
  assert.match(lire(entree({ motif: "  " })).erreurs[0], /^derogations\[0\]\.motif : champ vide/);
  assert.match(lire(entree({ date: "2026" })).erreurs[0], /^derogations\[0\]\.date : champ inconnu/);
  assert.match(lire(entree({ ecart: { genre: "prop-absente", prop: "" } })).erreurs[0], /^derogations\[0\]\.ecart\.prop : coordonnée vide/);
  assert.match(lire(entree({ ecart: { genre: "prop-absente", prop: "a", valeur: "b" } })).erreurs[0], /^derogations\[0\]\.ecart\.valeur : coordonnée inconnue/);
  assert.match(lire(entree({ ecart: { genre: "valeur-non-implementee", prop: "a" } })).erreurs[0], /^derogations\[0\]\.ecart\.valeur : coordonnée manquante/);
});

test("un genre inconnu ou non dérogeable est refusé", () => {
  assert.match(lire(entree({ ecart: { genre: "couleur-fausse" } })).erreurs[0], /^derogations\[0\]\.ecart\.genre : genre inconnu/);
  for (const genre of ["interface-absente", "fonction-introuvable", "composition-comptage"]) {
    const { derogations, erreurs } = lire(entree({ ecart: { genre, interface: "X" } }));
    assert.deepEqual(derogations, []);
    assert.match(erreurs[0], /^derogations\[0\]\.ecart\.genre : .* ne se déroge pas/);
  }
});

test("un genre qui est un nom de l'objet de base est un genre inconnu, jamais une exception", () => {
  for (const genre of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    const { derogations, erreurs } = lire(entree({ ecart: { genre, prop: "variant" } }));
    assert.deepEqual(derogations, [], genre);
    assert.match(erreurs[0], /^derogations\[0\]\.ecart\.genre : genre inconnu/, genre);
  }
});

test("une entrée refusée n'empêche pas de lire les autres", () => {
  const { derogations, erreurs } = lire(entree({ par: "" }), entree());
  assert.equal(derogations.length, 1);
  assert.equal(erreurs.length, 1);
});

test("une entrée couvre l'écart exact de son export", () => {
  const ecarts = [ecart("valeur-non-implementee", { prop: "variant", valeur: "danger" })];
  const r = appliquerDerogations([entree()], "Button", EXPORT, ecarts);
  assert.equal(r.couverts.length, 1);
  assert.deepEqual(r.restants, []);
  assert.deepEqual(r.sansObjet, []);
});

test("une entrée dont l'export diffère ne s'applique pas et est signalée tombée", () => {
  const ecarts = [ecart("valeur-non-implementee", { prop: "variant", valeur: "danger" })];
  const r = appliquerDerogations([entree()], "Button", "2026-12-01T00:00:00.000Z", ecarts);
  assert.deepEqual(r.couverts, []);
  assert.equal(r.restants.length, 1);
  assert.equal(r.tombees.length, 1);
});

test("une entrée ne couvre ni une autre valeur, ni une autre prop, ni un autre composant", () => {
  const autreValeur = ecart("valeur-non-implementee", { prop: "variant", valeur: "ghost" });
  const autreProp = ecart("valeur-non-implementee", { prop: "size", valeur: "danger" });
  const autreGenre = ecart("prop-absente", { prop: "variant" });
  const r = appliquerDerogations([entree()], "Button", EXPORT, [autreValeur, autreProp, autreGenre]);
  assert.deepEqual(r.couverts, []);
  assert.equal(r.restants.length, 3);
  assert.equal(r.sansObjet.length, 1);
  const autreComposant = appliquerDerogations([entree()], "Badge", EXPORT, [ecart("valeur-non-implementee", { prop: "variant", valeur: "danger" })]);
  assert.deepEqual(autreComposant.couverts, []);
});

test("un écart non dérogeable reste, même si une entrée le nomme", () => {
  const forcee = entree({ ecart: { genre: "interface-absente", interface: "ButtonProps" } });
  const r = appliquerDerogations([forcee], "Button", EXPORT, [ecart("interface-absente", { interface: "ButtonProps" }, false)]);
  assert.deepEqual(r.couverts, []);
  assert.equal(r.restants.length, 1);
});

// ─── Les constats du code (lot 1.1) ───────────────────────────────────────

const entreeDuCode = (genre, coordonnees, surcharge = {}) => entree({ ecart: { genre, ...coordonnees }, ...surcharge });
const CODES = {
  "valeur-en-dur": { fichier: "src/Button.tsx", valeur: "12px" },
  "token-inconnu": { fichier: "src/Button.tsx", reference: "{a.b}" },
  "repli-en-dur": { fichier: "src/Button.tsx", reference: "--x" },
};

test("D1 : les trois genres du code se lisent, leurs coordonnées exactes", () => {
  for (const [genre, coordonnees] of Object.entries(CODES)) {
    assert.deepEqual(lire(entreeDuCode(genre, coordonnees)), { derogations: [entreeDuCode(genre, coordonnees)], erreurs: [] }, genre);
  }
  assert.match(lire(entreeDuCode("valeur-en-dur", { fichier: "a.tsx" })).erreurs[0], /ecart\.valeur : coordonnée manquante/);
  assert.match(lire(entreeDuCode("repli-en-dur", { fichier: "a.tsx", valeur: "x", reference: "--x" })).erreurs[0], /ecart\.valeur : coordonnée inconnue/);
});

test("D1 : nom-css-ambigu, non-analyse et desactivation-interdite ne se dérogent pas", () => {
  for (const genre of ["nom-css-ambigu", "non-analyse", "desactivation-interdite"]) {
    const { derogations, erreurs } = lire(entreeDuCode(genre, { fichier: "src/Button.tsx" }));
    assert.deepEqual(derogations, [], genre);
    assert.match(erreurs[0], new RegExp(`^derogations\\[0\\]\\.ecart\\.genre : \`${genre}\` ne se déroge pas`), genre);
  }
});

test("coordonneesDuGenre rend les coordonnées dans l'ordre, ou null", () => {
  assert.deepEqual(coordonneesDuGenre("valeur-en-dur"), ["fichier", "valeur"]);
  assert.deepEqual(coordonneesDuGenre("token-inconnu"), ["fichier", "reference"]);
  assert.deepEqual(coordonneesDuGenre("valeur-non-implementee"), ["prop", "valeur"]);
  for (const genre of ["interface-absente", "nom-css-ambigu", "non-analyse", "desactivation-interdite", "inconnu", "constructor", "__proto__"]) assert.equal(coordonneesDuGenre(genre), null, genre);
  coordonneesDuGenre("valeur-en-dur").push("autre");
  assert.deepEqual(coordonneesDuGenre("valeur-en-dur"), ["fichier", "valeur"]);
});

test("D2 : la commande écrit les coordonnées dans l'ordre et protège ce que le shell lirait", () => {
  assert.equal(
    commandeDeDerogation("Button", "valeur-en-dur", { valeur: "#fff", fichier: "src/a b.tsx" }),
    `npx @ucm-kit/cli deroger Button valeur-en-dur 'src/a b.tsx' '#fff' --motif "…"`,
  );
  assert.equal(
    commandeDeDerogation("Button", "token-inconnu", { fichier: "src/components/Button/Button.tsx", reference: "{a.b}" }),
    `npx @ucm-kit/cli deroger Button token-inconnu src/components/Button/Button.tsx '{a.b}' --motif "…"`,
  );
  assert.equal(
    commandeDeDerogation("Button", "repli-en-dur", { fichier: "src/Button.tsx", reference: "--components-button-gap" }),
    `npx @ucm-kit/cli deroger Button repli-en-dur src/Button.tsx --components-button-gap --motif "…"`,
  );
  assert.equal(
    commandeDeDerogation("Button", "valeur-en-dur", { fichier: "src/Button.tsx", valeur: `l'"a" \\ $x` }),
    `npx @ucm-kit/cli deroger Button valeur-en-dur src/Button.tsx "l'\\"a\\" \\\\ $x" --motif "…"`,
  );
});

test("K7 : aucun texte du kit n'écrit `npx ucm`, la CLI se lance par son paquet", () => {
  // `ucm` n'est un binaire résolu par `npx` que dans le dépôt du toolkit : chez
  // un consommateur, `npx ucm` installe un autre paquet.
  const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
  const fautifs = readdirSync(src, { recursive: true })
    .map(String)
    .filter((chemin) => /\.(mjs|mts|ts)$/.test(chemin))
    .filter((chemin) => /npx ucm\b/.test(readFileSync(join(src, chemin), "utf8")));
  assert.deepEqual(fautifs, []);
});

const LE_CODE = entreeDuCode("valeur-en-dur", CODES["valeur-en-dur"]);

test("D3 : ajouterDerogation crée le fichier, ajoute, et écrit du JSON indenté terminé par un saut de ligne", () => {
  const premier = ajouterDerogation(null, LE_CODE);
  assert.deepEqual(premier.erreurs, []);
  assert.equal(premier.remplacee, false);
  assert.equal(premier.texte, `${JSON.stringify({ derogations: [LE_CODE] }, null, 2)}\n`);
  assert.ok(premier.texte.startsWith('{\n  "derogations": [\n    {'));

  const autre = entreeDuCode("token-inconnu", CODES["token-inconnu"]);
  const second = ajouterDerogation(premier.texte, autre);
  assert.deepEqual(lireDerogations(second.texte).derogations, [LE_CODE, autre]);
  assert.equal(second.remplacee, false);
});

test("D3 : ajouterDerogation refuse une entrée identique, même motif différent", () => {
  const { texte } = ajouterDerogation(null, LE_CODE);
  const refus = ajouterDerogation(texte, { ...LE_CODE, motif: "Autre raison." });
  assert.equal(refus.texte, null);
  assert.equal(refus.remplacee, false);
  assert.match(refus.erreurs[0], /existe déjà/);
});

test("D3 : ajouterDerogation remplace l'entrée tombée du même écart, à sa place", () => {
  const voisine = entreeDuCode("token-inconnu", CODES["token-inconnu"]);
  const depart = `${JSON.stringify({ derogations: [LE_CODE, voisine] })}`;
  const neuve = { ...LE_CODE, export: "2026-12-01T00:00:00.000Z", motif: "Après réexport." };
  const resultat = ajouterDerogation(depart, neuve);
  assert.equal(resultat.remplacee, true);
  assert.deepEqual(resultat.erreurs, []);
  assert.deepEqual(lireDerogations(resultat.texte).derogations, [neuve, voisine]);
});

test("D3 : ajouterDerogation refuse un fichier invalide et une entrée invalide, sans rien écrire", () => {
  const fichierInvalide = ajouterDerogation("{ pas du json", LE_CODE);
  assert.equal(fichierInvalide.texte, null);
  assert.match(fichierInvalide.erreurs[0], /illisible/);
  const entreeInvalide = ajouterDerogation(null, { ...LE_CODE, motif: " " });
  assert.equal(entreeInvalide.texte, null);
  assert.match(entreeInvalide.erreurs[0], /motif : champ vide/);
  const nonDerogeable = ajouterDerogation(null, entreeDuCode("nom-css-ambigu", { fichier: "a.tsx" }));
  assert.equal(nonDerogeable.texte, null);
  assert.match(nonDerogeable.erreurs[0], /ne se déroge pas/);
});

test("une entrée du code couvre le constat de mêmes coordonnées, pas celui d'une autre valeur", () => {
  const ecarts = [
    ecart("valeur-en-dur", { fichier: "src/Button.tsx", valeur: "12px" }),
    ecart("valeur-en-dur", { fichier: "src/Button.tsx", valeur: "13px" }),
  ];
  const r = appliquerDerogations([LE_CODE], "Button", EXPORT, ecarts);
  assert.equal(r.couverts.length, 1);
  assert.equal(r.restants.length, 1);
});

// J6 : les deux contrôles lisent le fichier par la même fonction, BOM compris.
test("J6 : lireDerogationsDuDepot lit un fichier avec BOM, rend aucune dérogation s'il est absent", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-derog-"));
  try {
    assert.deepEqual(lireDerogationsDuDepot(racine), { derogations: [], erreurs: [] });
    mkdirSync(join(racine, ".ucm"));
    writeFileSync(join(racine, CHEMIN_DES_DEROGATIONS), "\uFEFF{\"derogations\":[]}", "utf8");
    assert.deepEqual(lireDerogationsDuDepot(racine), { derogations: [], erreurs: [] });
    writeFileSync(join(racine, CHEMIN_DES_DEROGATIONS), "\uFEFF{pas du json", "utf8");
    assert.match(lireDerogationsDuDepot(racine).erreurs[0], /n'est pas du JSON valide/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

// J8 : le chemin des messages vient de la constante, le texte ne change pas.
test("J8 : le message des dérogations illisibles nomme CHEMIN_DES_DEROGATIONS", () => {
  assert.equal(CHEMIN_DES_DEROGATIONS, ".ucm/derogations.json");
  assert.equal(
    messageDeLaLimite("derogations-illisibles", {}),
    ".ucm/derogations.json contient des erreurs. Aucune dérogation n’est appliquée.",
  );
});
