/**
 * La base du rejeu des captures : l'analyse sans panne de chacune des 5 sources de `rejeu.ts`, pour classer à la main chaque constat
 * d'un fichier réel (vrai défaut, faux constat, limite). Les constats détaillés, qui citent des noms de la capture, vont sous
 * `_local/stress/rejeu-fichiers/captures/source-<rang>.json` ; la sortie standard ne donne que des nombres et des codes.
 *
 *   npx tsx packages/plugin-architect/scripts/stress/f8-analyse/rejeuDeBase.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chargerLaSource, NOMBRE_DE_SOURCES, reference } from './rejeu';

const SORTIE = path.resolve(__dirname, '../../../../../_local/stress/rejeu-fichiers/captures');

const compter = (valeurs: readonly string[]): string => {
  const comptes = new Map<string, number>();
  for (const valeur of valeurs) comptes.set(valeur, (comptes.get(valeur) ?? 0) + 1);
  return [...comptes].sort(([a], [b]) => a.localeCompare(b)).map(([cle, nombre]) => `${cle} ${nombre}`).join(', ');
};

(async () => {
  mkdirSync(SORTIE, { recursive: true });
  for (let rang = 1; rang <= NOMBRE_DE_SOURCES; rang += 1) {
    const source = chargerLaSource(rang);
    const base = source.capture ? await reference(source) : null;
    if (!base) { console.log(`source ${rang} (${source.genre}) : absente (${source.raison ?? 'analyse sans message final'})`); continue; }
    const { final, releve } = base;
    const layers = releve.variants.reduce((somme, variant) => somme + variant.layers.length, 0);
    console.log(`source ${rang} (${source.genre}) : statut ${final.statut}, ${releve.variants.length} variants, ${layers} layers, ${final.constats.length} constats`);
    console.log(`  par code : ${compter(final.constats.map((constat) => constat.code))}`);
    console.log(`  par type : ${compter(final.constats.map((constat) => constat.type))}`);
    console.log(`  corrections : ${compter(final.constats.map((constat) => constat.correction?.sorte ?? (constat.question ? 'question' : 'aucune')))}`);
    writeFileSync(path.join(SORTIE, `source-${rang}.json`), `${JSON.stringify({ statut: final.statut, lecture: final.lecture, constats: final.constats }, null, 2)}\n`);
  }
})();
