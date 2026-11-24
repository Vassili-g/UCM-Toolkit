import assert from "node:assert/strict";
import test from "node:test";

import {
  indexerTokensDtcg,
  nomsCssDesTokens,
  refusDesNomsCss,
  cheminDeReference,
  referencesAbsentes,
} from "../src/lecteurs/tokens-dtcg.mjs";

const tokens = {
  primitives: {
    couleurs: {
      terracota: { $value: "#b4552d", $type: "color" },
    },
    dimensions: {
      2: { $value: "4px", $type: "dimension" },
    },
  },
  layouts: {
    sizing: {
      // Figma nomme réellement ces tokens ainsi : une virgule décimale.
      "0,5": { $value: "{primitives.dimensions.2}", $type: "dimension" },
    },
  },
};

test("un arbre JSON de 8 000 groupes garde sa feuille et le type hérité sans épuiser la pile", () => {
  const profondeur = 8000;
  const texte = '{"$type":"number","profond":' + '{"niveau":'.repeat(profondeur)
    + '{"$value":7}' + '}'.repeat(profondeur) + ',"voisin":{"$value":8}}';
  const document = JSON.parse(texte);
  const index = indexerTokensDtcg(document);
  const chemin = ['profond', ...Array(profondeur).fill('niveau')].join('.');
  assert.deepEqual([...index.keys()], [chemin, 'voisin']);
  assert.deepEqual(index.get(chemin), { $value: 7, $type: 'number' });
  assert.deepEqual(index.get('voisin'), { $value: 8, $type: 'number' });
});

test("un chemin de token se retrouve tel qu'il est écrit, sans traduction", () => {
  const index = indexerTokensDtcg(tokens);
  assert.equal(index.get("primitives.couleurs.terracota").$value, "#b4552d");
  assert.equal(index.get("layouts.sizing.0,5").$type, "dimension");
});

test("un groupe n'est pas un token, même quand il porte un $type", () => {
  const index = indexerTokensDtcg({
    typographie: { $type: "dimension", corps: { $value: "16px" } },
  });
  assert.deepEqual([...index.keys()], ["typographie.corps"]);
});

test("une feuille sans $type hérite de celui de son groupe, comme DTCG le prévoit", () => {
  const index = indexerTokensDtcg({
    espacements: { $type: "dimension", petit: { $value: "4px" } },
  });
  assert.equal(index.get("espacements.petit").$type, "dimension");
});

test("le $type le plus proche l'emporte sur celui d'un groupe plus haut", () => {
  const index = indexerTokensDtcg({
    marque: {
      $type: "color",
      trait: { $type: "dimension", epaisseur: { $value: "1px" } },
      fond: { $value: "#fff" },
    },
  });
  assert.equal(index.get("marque.trait.epaisseur").$type, "dimension");
  assert.equal(index.get("marque.fond").$type, "color");
});

test("le $type propre d'une feuille n'est pas écrasé par l'héritage", () => {
  const index = indexerTokensDtcg({
    groupe: { $type: "color", feuille: { $value: "2px", $type: "dimension" } },
  });
  assert.equal(index.get("groupe.feuille").$type, "dimension");
});

test("les métadonnées de groupe ne fabriquent pas de chemins de token", () => {
  const index = indexerTokensDtcg({
    groupe: {
      $type: "color",
      $description: "les couleurs de marque",
      // Une extension de fournisseur porte des données quelconques, `$value`
      // compris : la descendre inventerait un token que personne n'a déclaré.
      $extensions: { "com.figma": { valeurDOrigine: { $value: "#eee" } } },
      fond: { $value: "#fff" },
    },
  });
  assert.deepEqual([...index.keys()], ["groupe.fond"]);
});

test("un arbre qui n'est pas un objet n'indexe rien plutôt que de lever", () => {
  for (const valeur of [null, undefined, "tokens", 12, ["a"]]) {
    assert.equal(indexerTokensDtcg(valeur).size, 0);
  }
});

test("une référence rend son chemin, une chaîne quelconque n'en rend aucun", () => {
  assert.equal(cheminDeReference("{a.b.c}"), "a.b.c");
  assert.equal(cheminDeReference("{marque}"), "marque");
  assert.equal(cheminDeReference("#b4552d"), null);
  assert.equal(cheminDeReference("{a b}"), null);
  assert.equal(cheminDeReference("{a}{b}"), null);
  assert.equal(cheminDeReference(undefined), null);
});

test("T1 : l'index du kit rend le chemin que la référence complète et la référence de premier niveau désignent", () => {
  const chaines = ["{a b.c}", "{a.b }", "{$a.b}", "{a.`b}", "{a.b$}", "{marque}", "{a.b}"];
  assert.deepEqual(chaines.map(cheminDeReference), [null, null, "$a.b", "a.`b", "a.b$", "marque", "a.b"]);
  assert.deepEqual(referencesAbsentes(chaines, indexerTokensDtcg({ a: { b: { $value: "1" } } })), [
    "{$a.b}", "{a b.c}", "{a.`b}", "{a.b }", "{a.b$}", "{marque}",
  ]);
});

test("une référence présente dans les tokens n'est pas déclarée absente", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(["{primitives.couleurs.terracota}"], index),
    [],
  );
});

test("un token nommé avec une virgule est reconnu, là où la projection CSS le perdait", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(referencesAbsentes(["{layouts.sizing.0,5}"], index), []);
});

test("les absentes sont rendues triées, pas dans l'ordre du relevé", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(new Set(["{z.absent}", "{a.absent}"]), index),
    ["{a.absent}", "{z.absent}"],
  );
});

test("une entrée qui n'a pas la forme d'une référence est absente elle aussi", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(["primitives.couleurs.terracota"], index),
    ["primitives.couleurs.terracota"],
  );
});

test("un groupe existant n'est pas un token qu'une référence puisse citer", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(["{primitives.couleurs}"], index),
    ["{primitives.couleurs}"],
  );
});

test("deux chemins au même nom CSS forment une entrée à deux chemins triés", () => {
  const index = indexerTokensDtcg({ layout: { size: { "50%": { $value: "50%" }, 50: { $value: "50px" } } } });
  assert.deepEqual(nomsCssDesTokens(index).get("--layout-size-50"), ["layout.size.50", "layout.size.50%"]);
});

test("deux chemins distincts donnent deux entrées d'un chemin", () => {
  const noms = nomsCssDesTokens(indexerTokensDtcg({ a: { b: { $value: "1px" }, c: { $value: "2px" } } }));
  assert.deepEqual([...noms.entries()], [["--a-b", ["a.b"]], ["--a-c", ["a.c"]]]);
});

test("l'ordre des groupes du fichier ne change pas les chemins d'un nom", () => {
  const avant = nomsCssDesTokens(indexerTokensDtcg({ x: { "y%": { $value: "1" } }, "x-y": { $value: "2" } }));
  const apres = nomsCssDesTokens(indexerTokensDtcg({ "x-y": { $value: "2" }, x: { "y%": { $value: "1" } } }));
  assert.deepEqual(avant.get("--x-y"), apres.get("--x-y"));
});

test("T3 : refusDesNomsCss rend un nom vide, un préfixe réservé et deux chemins au même nom", () => {
  assert.deepEqual(refusDesNomsCss(["✦.🙂", "ucm.x.fond", "layout.size.50%", "layout.size.50", "a.b"]), [
    { genre: "vide", nom: "--", chemins: ["✦.🙂"] },
    { genre: "prefixe-reserve", nom: "--ucm-x-fond", chemins: ["ucm.x.fond"] },
    { genre: "meme-nom", nom: "--layout-size-50", chemins: ["layout.size.50", "layout.size.50%"] },
  ]);
});

test("T3 : deux chemins sans nom CSS forment un seul refus vide, sans refus de même nom", () => {
  assert.deepEqual(refusDesNomsCss(["🙂", "✦"]), [{ genre: "vide", nom: "--", chemins: ["✦", "🙂"] }]);
});

test("T3 : un préfixe réservé porté par deux chemins donne les deux refus, et un fichier sain aucun", () => {
  assert.deepEqual(refusDesNomsCss(["ucm.x.a", "ucm_x_a"]).map(({ genre }) => genre), ["prefixe-reserve", "meme-nom"]);
  assert.deepEqual(refusDesNomsCss(["a.b", "a.c"]), []);
  assert.deepEqual(refusDesNomsCss(new Set()), []);
});
