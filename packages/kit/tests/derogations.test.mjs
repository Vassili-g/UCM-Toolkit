/**
 * Verrouille la forme et la portée d'une dérogation : un écart exact, un
 * export donné, et un refus nommé pour toute entrée mal formée.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { appliquerDerogations, lireDerogations } from "../src/lecteurs/derogations.mjs";

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
