/**
 * Le comparateur d'une valeur Figma et d'un token publié, règle par `$type`.
 *
 * Chaque règle se lit dans ses trois états. Une entrée qu'aucune règle ne
 * couvre doit rendre `non-comparable` : le texte d'égalité de l'explorateur ne
 * doit jamais dépendre d'un `egal` rendu faute de comparaison.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { comparerAuTokenPublie } from "@ucm-kit/core/lecteurs/navigateur";

const EGAL = { etat: "egal" };
const DIFFERENT = { etat: "different" };
const non = (cause) => ({ etat: "non-comparable", cause });

const couleur = (composantes, espace = "srgb", alpha = 1) => ({ nature: "couleur", espace, composantes, alpha });
const nombre = (valeur) => ({ nature: "nombre", nombre: valeur });
const duree = (secondes) => ({ nature: "duree", secondes });
const courbe = (points) => ({ nature: "courbe", points });
const texte = (valeur) => ({ nature: "texte", texte: valeur });
const booleen = (valeur) => ({ nature: "booleen", booleen: valeur });

test("color : mêmes canaux dans le même espace sont égaux, un canal éloigné diffère", () => {
  const publiee = { colorSpace: "srgb", components: [0.2, 0.4, 0.6], alpha: 0.5 };
  assert.deepEqual(comparerAuTokenPublie(couleur([0.2, 0.4, 0.6], "srgb", 0.5), "color", publiee), EGAL);
  assert.deepEqual(comparerAuTokenPublie(couleur([0.2, 0.4, 0.7], "srgb", 0.5), "color", publiee), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(couleur([0.2, 0.4, 0.6], "srgb", 1), "color", publiee), DIFFERENT);
});

test("color : un alpha absent vaut 1", () => {
  const publiee = { colorSpace: "display-p3", components: [0.1, 0.2, 0.3] };
  assert.deepEqual(comparerAuTokenPublie(couleur([0.1, 0.2, 0.3], "display-p3", 1), "color", publiee), EGAL);
  assert.deepEqual(comparerAuTokenPublie(couleur([0.1, 0.2, 0.3], "display-p3", 0.5), "color", publiee), DIFFERENT);
});

test("color : les mêmes composantes en srgb et en display-p3 sont différentes", () => {
  const publiee = { colorSpace: "display-p3", components: [0.2, 0.4, 0.6], alpha: 1 };
  assert.deepEqual(comparerAuTokenPublie(couleur([0.2, 0.4, 0.6], "srgb"), "color", publiee), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(couleur([0.2, 0.4, 0.6], "display-p3"), "color", publiee), EGAL);
});

test("color : l'écart admis est un demi-octet", () => {
  const publiee = { colorSpace: "srgb", components: [0.5, 0.5, 0.5], alpha: 1 };
  assert.deepEqual(comparerAuTokenPublie(couleur([0.5 + 0.4 / 255, 0.5, 0.5]), "color", publiee), EGAL);
  assert.deepEqual(comparerAuTokenPublie(couleur([0.5 + 0.6 / 255, 0.5, 0.5]), "color", publiee), DIFFERENT);
});

test("color : un hexadécimal se lit en srgb, avec ou sans alpha", () => {
  assert.deepEqual(comparerAuTokenPublie(couleur([1, 0, 0]), "color", "#ff0000"), EGAL);
  assert.deepEqual(comparerAuTokenPublie(couleur([1, 0, 0], "srgb", 0), "color", "#ff000000"), EGAL);
  assert.deepEqual(comparerAuTokenPublie(couleur([1, 0, 0]), "color", "#00ff00"), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(couleur([1, 0, 0], "display-p3"), "color", "#ff0000"), DIFFERENT);
});

test("color : un espace inconnu, une forme inconnue ou un composant manquant ne se comparent pas", () => {
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "color", { colorSpace: "oklch", components: [0, 0, 0] }), non("espace-inconnu"));
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "color", { colorSpace: "srgb", components: [0, 0] }), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "color", { colorSpace: "srgb", components: [0, "none", 0] }), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "color", { colorSpace: "srgb", components: [0, 0, 0], alpha: "1" }), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "color", "rouge"), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "color", { components: [0, 0, 0] }), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "color", null), non("forme-inconnue"));
});

test("dimension : un pixel se compare au nombre", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(16), "dimension", { value: 16, unit: "px" }), EGAL);
  assert.deepEqual(comparerAuTokenPublie(nombre(16), "dimension", { value: 12, unit: "px" }), DIFFERENT);
});

test("dimension : un nombre seul et une chaîne en pixels des anciens exports se comparent aussi", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(16), "dimension", 16), EGAL);
  assert.deepEqual(comparerAuTokenPublie(nombre(16), "dimension", 12), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(nombre(16), "dimension", "16px"), EGAL);
  assert.deepEqual(comparerAuTokenPublie(nombre(16.5), "dimension", "16.5px"), EGAL);
  assert.deepEqual(comparerAuTokenPublie(nombre(16), "dimension", "12px"), DIFFERENT);
});

test("dimension : rem et em dépendent de la page, une autre unité est inconnue", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", { value: 1, unit: "rem" }), non("unite-relative"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", { value: 1, unit: "em" }), non("unite-relative"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", { value: 1, unit: "ms" }), non("unite-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", { value: 1, unit: "vw" }), non("unite-inconnue"));
});

test("dimension : une forme inconnue ne se compare pas", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", "1rem"), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", { value: "1", unit: "px" }), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", { value: 1 }), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", true), non("forme-inconnue"));
});

test("number : un nombre se compare au nombre", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(0.5), "number", 0.5), EGAL);
  assert.deepEqual(comparerAuTokenPublie(nombre(0.5), "number", 0.6), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(nombre(0.5), "number", "0.5"), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "number", { value: 1, unit: "px" }), non("forme-inconnue"));
});

test("duration : 1 s égale 1000 ms et diffère de 1 ms", () => {
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { value: 1, unit: "s" }), EGAL);
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { value: 1000, unit: "ms" }), EGAL);
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { value: 1, unit: "ms" }), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(duree(0.2), "duration", { value: 200, unit: "ms" }), EGAL);
  assert.deepEqual(comparerAuTokenPublie(duree(0.2), "duration", { value: 0.3, unit: "s" }), DIFFERENT);
});

test("duration : l'écart relatif admis est de 1e-9", () => {
  assert.deepEqual(comparerAuTokenPublie(duree(1000), "duration", { value: 1000 * (1 + 1e-10), unit: "s" }), EGAL);
  assert.deepEqual(comparerAuTokenPublie(duree(1000), "duration", { value: 1000 * (1 + 1e-8), unit: "s" }), DIFFERENT);
});

test("duration : une autre unité est inconnue, une forme inconnue ne se compare pas", () => {
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { value: 1, unit: "px" }), non("unite-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { value: 1, unit: "min" }), non("unite-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", 1), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { value: "1", unit: "s" }), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { unit: "s" }), non("forme-inconnue"));
});

test("cubicBezier : quatre nombres égaux à 1e-9 près sont égaux", () => {
  assert.deepEqual(comparerAuTokenPublie(courbe([0.1, 0.2, 0.3, 0.4]), "cubicBezier", [0.1, 0.2, 0.3, 0.4]), EGAL);
  assert.deepEqual(comparerAuTokenPublie(courbe([0.1, 0.2, 0.3, 0.4]), "cubicBezier", [0.1 + 1e-10, 0.2, 0.3, 0.4]), EGAL);
  assert.deepEqual(comparerAuTokenPublie(courbe([0.1, 0.2, 0.3, 0.4]), "cubicBezier", [0.1 + 1e-8, 0.2, 0.3, 0.4]), DIFFERENT);
});

test("cubicBezier : la courbe [0.1, 0.2, 0.3, 0.4] diffère de [0.9, 0.8, 0.7, 0.6]", () => {
  assert.deepEqual(comparerAuTokenPublie(courbe([0.1, 0.2, 0.3, 0.4]), "cubicBezier", [0.9, 0.8, 0.7, 0.6]), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(courbe([0.1, 0.2, 0.3, 0.4]), "cubicBezier", [0.1, 0.2, 0.3, 0.5]), DIFFERENT);
});

test("cubicBezier : une source sans points ou une forme inconnue ne se compare pas", () => {
  assert.deepEqual(comparerAuTokenPublie(courbe(null), "cubicBezier", [0, 0, 1, 1]), non("courbe-sans-points"));
  assert.deepEqual(comparerAuTokenPublie(courbe([0, 0, 1, 1]), "cubicBezier", [0, 0, 1]), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(courbe([0, 0, 1, 1]), "cubicBezier", [0, 0, 1, "1"]), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(courbe([0, 0, 1, 1]), "cubicBezier", [0, 0, 1, Number.NaN]), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(courbe([0, 0, 1, 1]), "cubicBezier", "ease"), non("forme-inconnue"));
});

test("fontWeight : un nombre contre un nombre, une chaîne contre une chaîne", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(700), "fontWeight", 700), EGAL);
  assert.deepEqual(comparerAuTokenPublie(nombre(700), "fontWeight", 400), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(texte("Bold"), "fontWeight", "Bold"), EGAL);
  assert.deepEqual(comparerAuTokenPublie(texte("Bold"), "fontWeight", "Regular"), DIFFERENT);
});

test("fontWeight : un poids face à un nom de graisse ne se compare pas", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(700), "fontWeight", "Bold"), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(texte("Bold"), "fontWeight", 700), non("forme-inconnue"));
});

test("string et fontFamily : une chaîne contre une chaîne", () => {
  for (const type of ["string", "fontFamily"]) {
    assert.deepEqual(comparerAuTokenPublie(texte("Inter"), type, "Inter"), EGAL, type);
    assert.deepEqual(comparerAuTokenPublie(texte("Inter"), type, "inter"), DIFFERENT, type);
    assert.deepEqual(comparerAuTokenPublie(texte("Inter"), type, 400), non("forme-inconnue"), type);
  }
});

test("boolean : un booléen contre un booléen", () => {
  assert.deepEqual(comparerAuTokenPublie(booleen(true), "boolean", true), EGAL);
  assert.deepEqual(comparerAuTokenPublie(booleen(true), "boolean", false), DIFFERENT);
  assert.deepEqual(comparerAuTokenPublie(booleen(true), "boolean", "true"), non("forme-inconnue"));
});

test("une source qui n'est pas de la nature du $type est incompatible", () => {
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "dimension", { value: 1, unit: "px" }), non("type-incompatible"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "color", "#000000"), non("type-incompatible"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "duration", { value: 1, unit: "s" }), non("type-incompatible"));
  assert.deepEqual(comparerAuTokenPublie(duree(1), "cubicBezier", [0, 0, 1, 1]), non("type-incompatible"));
  assert.deepEqual(comparerAuTokenPublie(texte("a"), "number", 1), non("type-incompatible"));
  assert.deepEqual(comparerAuTokenPublie(booleen(true), "string", "true"), non("type-incompatible"));
  assert.deepEqual(comparerAuTokenPublie(couleur([0, 0, 0]), "fontWeight", 400), non("type-incompatible"));
});

test("un $type absent ou inconnu rend non-comparable, jamais egal", () => {
  assert.deepEqual(comparerAuTokenPublie(nombre(1), undefined, 1), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "", 1), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "gradient", 1), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "toString", 1), non("forme-inconnue"));
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "__proto__", 1), non("forme-inconnue"));
});

test("aucune entrée absurde ne rend egal", () => {
  const types = [undefined, "color", "dimension", "number", "duration", "cubicBezier", "fontWeight", "string", "fontFamily", "boolean", "inconnu"];
  const sources = [couleur([0, 0, 0]), nombre(0), duree(0), courbe(null), texte(""), booleen(false)];
  const publiees = [undefined, null, {}, [], Symbol.for("x"), () => 1, Number.NaN];
  for (const type of types) for (const source of sources) for (const publiee of publiees) {
    assert.notEqual(comparerAuTokenPublie(source, type, publiee).etat, "egal", `${type} ${source.nature} ${String(publiee)}`);
  }
});

test("les sondes de Codex, reformulées sur le comparateur", () => {
  // C02-courbe : deux courbes différentes affichaient l'égalité.
  assert.deepEqual(comparerAuTokenPublie(courbe([0.1, 0.2, 0.3, 0.4]), "cubicBezier", [0.9, 0.8, 0.7, 0.6]), DIFFERENT);
  // espace-ignore : les mêmes composantes sous un autre profil.
  assert.deepEqual(comparerAuTokenPublie(couleur([0.3, 0.5, 0.7], "srgb"), "color", { colorSpace: "display-p3", components: [0.3, 0.5, 0.7], alpha: 1 }), DIFFERENT);
  // unite-ignoree : 1 contre {1 rem}.
  assert.deepEqual(comparerAuTokenPublie(nombre(1), "dimension", { value: 1, unit: "rem" }), non("unite-relative"));
  // duree-unite-ignoree : 1 s contre {1 ms}.
  assert.deepEqual(comparerAuTokenPublie(duree(1), "duration", { value: 1, unit: "ms" }), DIFFERENT);
});
