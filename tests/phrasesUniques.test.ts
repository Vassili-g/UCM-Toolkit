/**
 * Une phrase écrite en clair appartient à un seul paquet. Le test relève les
 * littéraux de chaîne de huit mots ou plus dans les dossiers `src` des paquets (hors
 * commentaires, hors `dist/`, `node_modules/`, `_local/` et hors `packages/hub/`,
 * sorti du workspace) et refuse la même phrase dans deux paquets : un paquet
 * qui a besoin du texte d'un autre l'importe du kit. `EXCEPTIONS` nomme chaque
 * phrase admise dans plusieurs paquets, avec sa raison.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const MOTS_MINIMUM = 8;
const PAQUETS_HORS_CONTROLE = ['hub'];

/** La phrase, telle que `normaliser` la rend, et la raison pour laquelle plusieurs paquets l'écrivent. */
export const EXCEPTIONS: { phrase: string; raison: string }[] = [];

export type Phrase = { paquet: string; fichier: string; ligne: number; texte: string };

/** Minuscules, espaces repliés, ponctuation de bord retirée : deux écritures de la même phrase se rejoignent. */
export function normaliser(texte: string): string {
  return texte.replace(/\s+/g, ' ').trim().toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** Les littéraux de chaîne de `source`, sans ceux des commentaires, avec leur ligne. Un gabarit avec `${…}` est ignoré. */
export function litteraux(source: string): { ligne: number; texte: string }[] {
  const trouves: { ligne: number; texte: string }[] = [];
  let ligne = 1;
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const suite = source[i + 1];
    if (c === '\n') { ligne++; i++; }
    else if (c === '/' && suite === '/') { while (i < source.length && source[i] !== '\n') i++; }
    else if (c === '/' && suite === '*') {
      const fin = source.indexOf('*/', i + 2);
      const bloc = source.slice(i, fin === -1 ? source.length : fin + 2);
      ligne += bloc.split('\n').length - 1;
      i += bloc.length;
    } else if (c === '"' || c === "'" || c === '`') {
      const debut = ligne;
      let j = i + 1;
      let corps = '';
      let dynamique = false;
      while (j < source.length && source[j] !== c) {
        if (source[j] === '\\') { corps += source[j + 1] === 'n' ? ' ' : source[j + 1]; j += 2; continue; }
        if (c === '`' && source[j] === '$' && source[j + 1] === '{') dynamique = true;
        if (source[j] === '\n') { ligne++; if (c !== '`') break; }
        corps += source[j];
        j++;
      }
      if (!dynamique) trouves.push({ ligne: debut, texte: corps });
      i = j + 1;
    } else i++;
  }
  return trouves;
}

/** Une phrase est un texte de huit mots ou plus, avec des lettres et au moins un espace entre mots. */
export function estUnePhrase(texte: string): boolean {
  const mots = normaliser(texte).split(' ').filter((m) => /\p{L}/u.test(m));
  return mots.length >= MOTS_MINIMUM && !/^(?:https?:|\.{0,2}\/)/.test(texte.trim());
}

function fichiersDeSource(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (['node_modules', 'dist', '_local'].includes(entree.name)) continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDeSource(complet));
    else if (/\.(ts|mjs|js)$/.test(entree.name)) trouves.push(complet);
  }
  return trouves;
}

function phrasesDeLArbre(): Phrase[] {
  const phrases: Phrase[] = [];
  for (const paquet of fs.readdirSync(path.join(racine, 'packages'))) {
    if (PAQUETS_HORS_CONTROLE.includes(paquet)) continue;
    const src = path.join(racine, 'packages', paquet, 'src');
    if (!fs.existsSync(src)) continue;
    for (const complet of fichiersDeSource(src)) {
      const fichier = path.relative(racine, complet).split(path.sep).join('/');
      for (const { ligne, texte } of litteraux(fs.readFileSync(complet, 'utf8'))) {
        if (estUnePhrase(texte)) phrases.push({ paquet, fichier, ligne, texte: normaliser(texte) });
      }
    }
  }
  return phrases;
}

/** Les phrases écrites dans plus d'un paquet, hors `exceptions`. */
export function phrasesEnDouble(phrases: Phrase[], exceptions: { phrase: string }[]): string[] {
  const admises = new Set(exceptions.map((e) => normaliser(e.phrase)));
  const parTexte = new Map<string, Phrase[]>();
  for (const p of phrases) parTexte.set(p.texte, [...(parTexte.get(p.texte) ?? []), p]);
  return [...parTexte.entries()]
    .filter(([texte, lieux]) => !admises.has(texte) && new Set(lieux.map((l) => l.paquet)).size > 1)
    .map(([texte, lieux]) => `« ${texte.slice(0, 80)} » : ${lieux.map((l) => `${l.fichier}:${l.ligne}`).join(', ')}`);
}

test('aucune phrase n\'est écrite dans deux paquets', () => {
  const phrases = phrasesDeLArbre();
  assert.ok(phrases.length > 100, `seules ${phrases.length} phrases relevées sous packages/**/src`);
  assert.deepEqual(
    phrasesEnDouble(phrases, EXCEPTIONS),
    [],
    "Ces phrases sont écrites dans deux paquets. Les écrire une fois dans le kit et les importer ; "
      + "si la copie est voulue, l'ajouter à EXCEPTIONS avec sa raison.",
  );
});

test('chaque exception désigne une phrase qui existe dans au moins deux paquets, avec une raison', () => {
  const phrases = phrasesDeLArbre();
  for (const e of EXCEPTIONS) {
    const paquets = new Set(phrases.filter((p) => p.texte === normaliser(e.phrase)).map((p) => p.paquet));
    assert.ok(paquets.size > 1, `l'exception « ${e.phrase.slice(0, 60)} » n'est plus écrite dans deux paquets`);
    assert.ok(e.raison.length > 10, `l'exception « ${e.phrase.slice(0, 60)} » n'a pas de raison`);
  }
});

test('litteraux et estUnePhrase relèvent une phrase de huit mots, sans commentaire ni gabarit', () => {
  const source = [
    "// une phrase de huit mots dans un commentaire seulement ici",
    "const a = 'Une phrase de huit mots, écrite dans un paquet.';",
    'const b = `trois mots ${x} dans un gabarit de plus de huit mots au total`;',
    "const c = 'court';",
  ].join('\n');
  const phrases = litteraux(source).filter((l) => estUnePhrase(l.texte));
  assert.deepEqual(phrases.map((p) => p.ligne), [2]);
  assert.equal(normaliser('  Une phrase.  '), 'une phrase');
  const lieux: Phrase[] = [
    { paquet: 'a', fichier: 'a/x.ts', ligne: 1, texte: 'une phrase' },
    { paquet: 'b', fichier: 'b/x.ts', ligne: 1, texte: 'une phrase' },
  ];
  assert.equal(phrasesEnDouble(lieux, []).length, 1);
  assert.deepEqual(phrasesEnDouble(lieux, [{ phrase: 'Une phrase.' }]), []);
});
