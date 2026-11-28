/**
 * Le banc des pièces internes avant le validateur 15.0 : les fabriques de
 * contrats sont déterministes et sérialisables, et la table des mutations est
 * entière. Le test ne juge pas encore les refus ; le validateur arrive au lot 3.3.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { CAS_CONFORMES } from "./banc/cas-conformes.mjs";
import { BASES_15, VERSION_15, contrat15 } from "./banc/contrats-15.mjs";
import { MUTATIONS } from "./banc/mutations.mjs";

const json = (valeur) => JSON.stringify(valeur);

/** Les contrats de base : les fabriques nommées et chaque cas de la confrontation. */
const CONTRATS = [
  ...Object.entries(BASES_15).map(([nom, fabrique]) => [`base ${nom}`, fabrique]),
  ["contrat15 vide", () => contrat15()],
  ...CAS_CONFORMES.map((cas) => [`cas ${cas.id}`, cas.contrat]),
];

for (const [nom, fabrique] of CONTRATS) {
  test(`${nom} : déterministe, sérialisable, 15.0, sans structure.sizes`, () => {
    const contrat = fabrique();
    assert.equal(json(contrat), json(fabrique()), "deux appels donnent le même contrat");
    assert.notEqual(contrat, fabrique(), "chaque appel rend un objet neuf");
    assert.deepEqual(JSON.parse(json(contrat)), contrat, "le contrat est du JSON");
    assert.equal(contrat.meta.contractVersion, VERSION_15);
    assert.equal(contrat.structure?.sizes, undefined);
    for (const entree of Object.values(contrat.pieces ?? {})) {
      assert.equal(entree.structure?.sizes, undefined);
    }
  });
}

test("45 cas de la confrontation, aux identifiants uniques, dont deux refusés", () => {
  assert.equal(CAS_CONFORMES.length, 45);
  assert.equal(new Set(CAS_CONFORMES.map((cas) => cas.id)).size, 45);
  const refuses = CAS_CONFORMES.filter((cas) => cas.attendu === "refus");
  assert.deepEqual(
    refuses.map((cas) => cas.id).sort(),
    ["A05-boucle-indirecte", "E09-deux-item-suffixe"],
  );
  for (const cas of CAS_CONFORMES) {
    assert.ok(["accepte", "refus"].includes(cas.attendu), cas.id);
    if (cas.attendu === "refus") assert.ok(cas.point >= 1 && cas.point <= 16, cas.id);
  }
});

test("aucun cas ne porte de perte de transfert", () => {
  for (const cas of CAS_CONFORMES) {
    for (const diagnostic of cas.contrat().meta.diagnostics ?? []) {
      assert.doesNotMatch(diagnostic.message, /transfert/i, cas.id);
    }
  }
});

test("la table compte 73 mutations aux identifiants uniques", () => {
  assert.equal(MUTATIONS.length, 73);
  assert.equal(new Set(MUTATIONS.map((m) => m.id)).size, 73);
  assert.equal(MUTATIONS.filter((m) => m.source === "stress-test").length, 58);
  assert.equal(MUTATIONS.filter((m) => m.source === "confrontation").length, 15);
});

test("chaque mutation a une autorité et un verdict que la forme permet", () => {
  for (const mutation of MUTATIONS) {
    assert.ok(["kit", "dessin"].includes(mutation.autorite), mutation.id);
    const { refus, admis } = mutation.verdict;
    if (admis) {
      assert.equal(refus, undefined, mutation.id);
    } else {
      assert.ok(Number.isInteger(refus) && refus >= 1 && refus <= 16, `${mutation.id} cite le point ${refus}`);
    }
  }
});

test("une mutation admise relève du dessin, jamais du JSON seul", () => {
  for (const mutation of MUTATIONS.filter((m) => m.verdict.admis)) {
    assert.equal(mutation.autorite, "dessin", mutation.id);
  }
});

test("une mutation à point approximatif porte sa note", () => {
  for (const mutation of MUTATIONS) {
    if (mutation.note !== undefined) assert.ok(mutation.note.length > 0, mutation.id);
  }
});

for (const mutation of MUTATIONS) {
  test(`mutation ${mutation.id} : change son contrat de base`, () => {
    const contrat = mutation.base();
    const avant = json(contrat);
    if (mutation.muterTexte) {
      assert.equal(mutation.muter, undefined);
      const texte = mutation.muterTexte(avant);
      assert.notEqual(texte, avant);
      assert.doesNotThrow(() => JSON.parse(texte), "le texte reste du JSON décodable");
      assert.match(texte, /"name":".Autre"/);
      return;
    }
    mutation.muter(contrat);
    assert.notEqual(json(contrat), avant);
    assert.equal(json(mutation.base()), avant, "la base reste intacte pour l'appel suivant");
    assert.deepEqual(JSON.parse(json(contrat)), contrat, "le contrat muté reste du JSON");
  });
}
