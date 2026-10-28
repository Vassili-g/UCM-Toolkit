/** Loi : un contrôle lit l'écriture d'un terme par `termePourCategorie`, jamais en comparant un segment à `terme.id`. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const DOSSIER = new URL('../src/controles/', import.meta.url);
const SEGMENT = String.raw`(?:formeReconnue\(\w+\)|\bsegment\b)`;
const IDENTIFIANT = String.raw`(?:formeReconnue\()?\w+\??\.id\b`;
const COMPARAISON = new RegExp(String.raw`${SEGMENT}\s*[!=]==?\s*${IDENTIFIANT}|${IDENTIFIANT}\)?\s*[!=]==?\s*${SEGMENT}`);

test('aucun fichier de src/controles ne compare un segment à terme.id hors de termePourCategorie', () => {
  const fautifs: string[] = [];
  for (const fichier of readdirSync(DOSSIER).filter((nom) => nom.endsWith('.ts'))) {
    readFileSync(new URL(fichier, DOSSIER), 'utf8').split(/\r?\n/).forEach((ligne, rang) => {
      if (COMPARAISON.test(ligne) && !ligne.includes('termePourCategorie')) fautifs.push(`${fichier}:${rang + 1}`);
    });
  }
  assert.deepEqual(fautifs, []);
});

test('la loi reconnaît la comparaison qu’elle interdit', () => {
  assert.ok(COMPARAISON.test('if (formeReconnue(segment) !== formeReconnue(terme.id)) {'));
  assert.ok(!COMPARAISON.test('termeActuel.id === termeDuToken?.id'));
});
