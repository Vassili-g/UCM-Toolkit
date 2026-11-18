/**
 * Le catalogue des codes de constat (`CODES_DES_CONSTATS`) et le code qui rend les constats disent la même chose : tout code écrit dans
 * `packages/kit/src/` ou `packages/plugin-architect/src/` figure au catalogue, et chaque entrée du catalogue est rendue quelque part.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CODES_DES_CONSTATS } from '../src/controles/index.js';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOSSIERS = ['kit/src', 'plugin-architect/src'];
const EXTENSIONS = new Set(['.ts', '.mts', '.mjs']);
/** Le catalogue cite chaque code : il ne prouve pas qu'un contrôle le rende. */
const CATALOGUE = path.join(racine, 'kit/src/controles/codes.ts');

function fichiersDe(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersDe(chemin);
    return EXTENSIONS.has(path.extname(entree.name)) ? [chemin] : [];
  });
}

const sansCommentaires = (texte: string): string => texte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

/** Un code écrit seul entre guillemets (`code: 'C25'`, `'C8' | 'C10'`) ou en tête d'un identifiant (`` `C82:cran:${cle}` ``, `'C49:borne'`). */
const FORME_D_UN_CODE = /(['"`])C(\d+)(?:\1|:)/g;
/** Un code que le code teste (`case 'C20':`, `=== 'C16'`) ne prouve pas qu'un contrôle le rende. */
const FORME_D_UN_TEST = /(?:\bcase\s+|[!=]==\s*)$/;

function codesCites(): { tous: Map<string, string[]>; rendus: Set<string> } {
  const tous = new Map<string, string[]>();
  const rendus = new Set<string>();
  for (const dossier of DOSSIERS) {
    for (const fichier of fichiersDe(path.join(racine, dossier)).filter((chemin) => chemin !== CATALOGUE)) {
      const texte = sansCommentaires(fs.readFileSync(fichier, 'utf8'));
      for (const trouve of texte.matchAll(FORME_D_UN_CODE)) {
        const code = `C${trouve[2]}`;
        tous.set(code, [...(tous.get(code) ?? []), path.relative(racine, fichier)]);
        if (!FORME_D_UN_TEST.test(texte.slice(0, trouve.index))) rendus.add(code);
      }
    }
  }
  return { tous, rendus };
}

test('le catalogue donne chaque code une seule fois, avec sa famille, ses types et son sens', () => {
  const codes = CODES_DES_CONSTATS.map(({ code }) => code);
  assert.equal(new Set(codes).size, codes.length);
  for (const entree of CODES_DES_CONSTATS) {
    assert.equal(entree.code, `C${Number(entree.code.slice(1))}`);
    assert.ok(entree.familles.length > 0, `${entree.code} n'a pas de famille`);
    assert.ok(entree.types.length > 0, `${entree.code} n'a pas de type`);
    assert.match(entree.sens, /^\S.*\.$/, `${entree.code} : le sens est une phrase`);
  }
});

test('tout code écrit dans les contrôles du kit et dans UCM Architect figure au catalogue', () => {
  const connus = new Set<string>(CODES_DES_CONSTATS.map(({ code }) => code));
  const absents = [...codesCites().tous].filter(([code]) => !connus.has(code)).map(([code, fichiers]) => `${code} (${[...new Set(fichiers)].join(', ')})`);
  assert.deepEqual(absents, [], 'Ajouter ces codes à CODES_DES_CONSTATS (packages/kit/src/controles/codes.ts)');
});

test('chaque code du catalogue est rendu par un contrôle', () => {
  const { tous, rendus } = codesCites();
  assert.deepEqual(CODES_DES_CONSTATS.filter(({ code }) => !tous.has(code)).map(({ code }) => code), [], 'Codes jamais cités');
  assert.deepEqual(CODES_DES_CONSTATS.filter(({ code }) => !rendus.has(code)).map(({ code }) => code), [], 'Codes seulement testés, jamais rendus');
});
