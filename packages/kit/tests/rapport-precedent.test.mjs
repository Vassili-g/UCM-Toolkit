/**
 * Quel commentaire d'une demande de fusion le rapport remplace : la règle que
 * GitHub et GitLab lisent toutes deux.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { MARQUEUR_RAPPORT, MARQUEUR_SANS_OBJET } from "../src/lecteurs/controle-repository.mjs";
import { rapportPrecedent, rapportSansObjet } from "../src/lecteurs/rapport-precedent.mjs";

const COMPTE = "ucm-bot";

test("R1 : le rapport le plus récent du compte est choisi, jamais la note qui cite le marqueur", () => {
  const notes = [
    { id: 1, auteur: COMPTE, corps: `${MARQUEUR_RAPPORT}\n## ❌ 2 contrats invalides`, systeme: false },
    { id: 2, auteur: COMPTE, corps: `${MARQUEUR_RAPPORT}\n## ✅ Tout est conforme`, systeme: false },
    { id: 3, auteur: COMPTE, corps: `Le rapport est écrit sous ${MARQUEUR_RAPPORT}`, systeme: false },
    { id: 4, auteur: "humain", corps: `${MARQUEUR_RAPPORT}\nrecopié`, systeme: false },
  ];
  assert.equal(rapportPrecedent(notes, COMPTE), 2);
});

test("R1 : une note système et une note d'un autre compte ne sont jamais remplacées", () => {
  assert.equal(rapportPrecedent([{ id: 1, auteur: COMPTE, corps: MARQUEUR_RAPPORT, systeme: true }], COMPTE), null);
  assert.equal(rapportPrecedent([{ id: 1, auteur: "autre", corps: MARQUEUR_RAPPORT, systeme: false }], COMPTE), null);
  assert.equal(rapportPrecedent([], COMPTE), null);
});

test("R1 : l'identifiant de compte numérique de GitLab se compare tel quel", () => {
  const notes = [{ id: 9, auteur: 7, corps: `${MARQUEUR_RAPPORT}\n`, systeme: false }];
  assert.equal(rapportPrecedent(notes, 7), 9);
  assert.equal(rapportPrecedent(notes, "7"), null);
});

test("R2 : le marqueur sans objet compte dans les deux premières lignes, pas en ligne 4", () => {
  const ligne2 = `${MARQUEUR_RAPPORT}\n${MARQUEUR_SANS_OBJET}\n## Rien à signaler\n`;
  const ligne4 = `${MARQUEUR_RAPPORT}\n## ❌ 1 contrat invalide\n\n${MARQUEUR_SANS_OBJET}\n`;
  assert.equal(rapportSansObjet(ligne2), true);
  assert.equal(rapportSansObjet(ligne4), false);
  assert.equal(rapportSansObjet(ligne4.replace(/\n/g, "\r\n")), false);
  assert.equal(rapportSansObjet(ligne2.replace(/\n/g, "\r\n")), true);
});
