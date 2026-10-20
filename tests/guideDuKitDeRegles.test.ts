/**
 * `docs/guides/KIT-DE-REGLES.md` recopie les noms des trois maîtres, les calques,
 * les cinq sections et le marqueur que `packages/kit/src/referentiel/kit-de-regles.ts`
 * définit. Le mainteneur vérifie le kit Figma sur ce guide : un nom qui diverge
 * lui ferait valider un kit que le plugin ne reconnaît pas.
 *
 * Le test lit les mentions entre accents graves du guide et les compare à la
 * grammaire, section par section.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  AIDES_A_MARQUER,
  CALQUES_DU_KIT_DE_REGLES,
  MAITRES_COMPACTES,
  MAITRES_DU_KIT_DE_REGLES,
  MARQUEUR_A_COMPLETER,
  SECTIONS_DU_KIT_DE_REGLES,
  TAGS_DES_REGLES,
  calqueDuTag,
  nomCompacte,
} from '../packages/kit/src/referentiel/index';

const guide = fs.readFileSync(path.resolve(__dirname, '../docs/guides/KIT-DE-REGLES.md'), 'utf8')
  .replace(/\r\n/g, '\n');

/** Les mentions entre accents graves d'un texte, dans l'ordre. */
function mentions(texte: string): string[] {
  return [...texte.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

/** Le texte d'une puce « - **Nom.** … », jusqu'à la puce ou au paragraphe suivant. */
function puce(nom: string): string {
  const debut = guide.indexOf(`- **${nom}.**`);
  assert.notEqual(debut, -1, `le guide n'a plus de puce « ${nom} »`);
  const suite = guide.slice(debut + 1);
  const fin = suite.search(/\n- \*\*|\n\n|\n## /);
  return suite.slice(0, fin === -1 ? undefined : fin);
}

/** Les lignes de la table d'une section « ## Titre », sans l'en-tête ni le filet. */
function lignesDeLaTable(titre: string): string[] {
  const debut = guide.indexOf(`## ${titre}`);
  assert.notEqual(debut, -1, `le guide n'a plus de section « ${titre} »`);
  const suite = guide.slice(debut + 1);
  const fin = suite.search(/\n## /);
  const corps = suite.slice(0, fin === -1 ? undefined : fin);
  return corps.split('\n').filter((ligne) => ligne.startsWith('|')).slice(2);
}

const MAITRES = Object.values(MAITRES_DU_KIT_DE_REGLES);
const CALQUES = Object.values(CALQUES_DU_KIT_DE_REGLES);
const trie = (valeurs: readonly string[]) => [...valeurs].sort();

test('la puce « Noms exacts » cite les trois maîtres de la grammaire', () => {
  const citees = mentions(puce('Noms exacts')).filter((nom) => nom.startsWith('.'));
  assert.deepEqual(trie(citees), trie(MAITRES));
});

test('la puce « Noms exacts » cite les calques de la grammaire et un calque par tag', () => {
  const texte = puce('Noms exacts');
  const citees = mentions(texte).filter((nom) => !nom.startsWith('.') && !nom.startsWith('@'));
  assert.deepEqual(trie(citees), trie(CALQUES));
  assert.match(texte, /un calque par tag/);
  const tags = mentions(texte).filter((nom) => nom.startsWith('@'));
  assert.ok(tags.length > 0, 'la puce ne donne aucun exemple de calque de tag');
  for (const tag of tags) {
    assert.ok(TAGS_DES_REGLES.map(calqueDuTag).includes(tag as never), `${tag} n'est pas un tag`);
  }
});

test('la table « Ce que le kit contient » nomme les trois maîtres de la grammaire', () => {
  const premieres = lignesDeLaTable('Ce que le kit contient').map((ligne) => ligne.split('|')[1]);
  const citees = premieres.flatMap(mentions).filter((nom) => nom.startsWith('.'));
  assert.deepEqual(trie(citees), trie(MAITRES));
});

test('la table liste les cinq sections de la grammaire, dans l’ordre du maître', () => {
  const ligne = lignesDeLaTable('Ce que le kit contient')
    .find((candidate) => candidate.includes(MAITRES_DU_KIT_DE_REGLES.section));
  assert.ok(ligne, `la table n'a plus de ligne pour ${MAITRES_DU_KIT_DE_REGLES.section}`);
  const sections = mentions(ligne.split('|')[1]).filter((nom) => !nom.startsWith('.'));
  assert.deepEqual(sections, [...SECTIONS_DU_KIT_DE_REGLES]);
});

test('le marqueur cité dans le guide est celui de la grammaire', () => {
  const marqueurs = mentions(guide).filter((nom) => nom.toLowerCase().includes('compléter'));
  assert.ok(marqueurs.length >= 2, 'le guide ne cite plus le marqueur');
  for (const marqueur of marqueurs) assert.equal(marqueur, MARQUEUR_A_COMPLETER);
});

test('la puce « Marqueur » cite les tags et le calque que la grammaire fait marquer', () => {
  const citees = mentions(puce('Marqueur'));
  const tags = citees.filter((nom) => nom.startsWith('@'));
  assert.deepEqual(trie(tags), trie(Object.keys(AIDES_A_MARQUER).map((tag) => calqueDuTag(tag as never))));
  const calques = new Set(Object.values(AIDES_A_MARQUER));
  for (const calque of calques) {
    assert.ok(citees.includes(calque as string), `la puce ne cite plus le calque ${calque}`);
  }
  assert.ok(citees.includes(CALQUES_DU_KIT_DE_REGLES.nomDuComposant));
});

test('aucun nom de maître ou de calque du guide ne diffère de la grammaire que par la casse', () => {
  const exacts = new Set<string>([...MAITRES, ...CALQUES]);
  const compactes = new Set<string>([...Object.values(MAITRES_COMPACTES), ...CALQUES.map(nomCompacte)]);
  for (const nom of mentions(guide)) {
    if (compactes.has(nomCompacte(nom))) assert.ok(exacts.has(nom), `${nom} diffère de la grammaire`);
  }
});
