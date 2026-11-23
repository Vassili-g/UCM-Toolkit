/**
 * Les écritures par défaut des aides passent le juge du code (lot 2.3 de P6).
 *
 * Une aide dit au développeur comment écrire une propriété ; le juge refuse une
 * valeur visuelle en dur. Le test prend chaque code `propriete: valeur` de la
 * section « Écriture par défaut » de `packages/cli/aides/*.md`, remplace chaque
 * `<…>` et chaque `var(--…)` par la variable d'un token fabriqué, et le passe
 * au juge, contre un contrat qui ne publie que `stretch`. Une aide qui dit
 * le contraire du juge échoue ici.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { etatDuFormatDeTokens } from "@ucm-kit/core/format";

import { PROPRIETES_PAR_FAMILLE } from "../packages/kit/src/lecteurs/controle-du-code-listes.mjs";
import { creerContexteDuJuge, jugerDeclaration } from "../packages/kit/src/lecteurs/controle-du-code.mjs";
import { indexerTokensDtcg, nomsCssDesTokens } from "../packages/kit/src/lecteurs/tokens-dtcg.mjs";

const dossierDesAides = resolve(dirname(fileURLToPath(import.meta.url)), "..", "packages", "cli", "aides");

/**
 * Les `<…>` que le développeur remplace par un nombre ou une place du contrat, jamais par un
 * token : `columnStart`, `columnSpan` et `rotation` sont des champs hors famille.
 */
const MARQUEURS_SANS_TOKEN = new Set(["start", "span", "rotation"]);

/** Un contrat qui ne publie qu'une largeur `stretch`, que le juge lit aussi comme `100%`. */
const CONTRAT = { viewStructures: { vue: { sizing: { width: "stretch" } } } };

const ARBRE = { x: { $value: "1px", $type: "dimension" } };
const index = indexerTokensDtcg(ARBRE);
const contexte = creerContexteDuJuge({ tokens: { etat: etatDuFormatDeTokens(ARBRE), index, noms: nomsCssDesTokens(index) }, contrat: CONTRAT });
const VARIABLE = "var(--x)";

const proprietesDeFamille = new Set(PROPRIETES_PAR_FAMILLE.map((entree) => entree.propriete));

/** Les déclarations `propriete: valeur` de la section « Écriture par défaut » d'un texte d'aide. */
function ecrituresDe(texte) {
  const debut = texte.indexOf("## Écriture par défaut");
  if (debut === -1) return [];
  const suite = texte.indexOf("\n## ", debut + 1);
  const section = texte.slice(debut, suite === -1 ? undefined : suite);
  const ecritures = [];
  for (const [, code] of section.matchAll(/`([^`]+)`/g)) {
    const brut = code.replace(/\s+/g, " ").trim();
    const m = /^(-?[a-z][a-z-]*):\s*(\S.*)$/.exec(brut);
    if (!m) continue;
    const marqueurs = [...m[2].matchAll(/<([^>]+)>/g)].map((x) => x[1]);
    const recoitUnToken = marqueurs.some((nom) => !MARQUEURS_SANS_TOKEN.has(nom)) || /var\(--…\)/.test(m[2]);
    const valeur = m[2].replace(/<[^>]+>/g, VARIABLE).replace(/var\(--…\)/g, VARIABLE);
    ecritures.push({ brut, propriete: m[1], valeur, recoitUnToken });
  }
  return ecritures;
}

const aides = readdirSync(dossierDesAides).filter((nom) => nom.endsWith(".md")).sort();
const toutes = aides.flatMap((nom) => ecrituresDe(readFileSync(join(dossierDesAides, nom), "utf8")).map((e) => ({ aide: nom, ...e })));

test("les aides donnent des écritures à juger", () => {
  assert.ok(aides.length > 20);
  assert.ok(toutes.length > 20);
});

test("P1 : chaque écriture par défaut passe le juge sans constat", () => {
  const refusees = toutes
    .map((e) => ({ ...e, constats: jugerDeclaration({ propriete: e.propriete, valeur: e.valeur, debut: 0, fin: e.valeur.length, contexte: "style" }, contexte) }))
    .filter((e) => e.constats.length > 0)
    .map((e) => `${e.aide} : \`${e.brut}\` jugée \`${e.propriete}: ${e.valeur}\` -> ${e.constats.map((c) => c.code).join(", ")}`);
  assert.deepEqual(refusees, []);
});

test("P2 : chaque propriété qui reçoit un token figure dans PROPRIETES_PAR_FAMILLE", () => {
  const absentes = toutes.filter((e) => e.recoitUnToken && !proprietesDeFamille.has(e.propriete)).map((e) => `${e.aide} : ${e.propriete}`);
  assert.deepEqual(absentes, []);
});
