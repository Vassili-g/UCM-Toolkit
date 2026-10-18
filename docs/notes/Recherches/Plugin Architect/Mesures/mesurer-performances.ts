/** Mesure le moteur du kit sur des noms synthétiques, sans Figma ni interface. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import {
  commencerLexique, detecterLesQuestions, indexerVocabulaire, normaliserLeLexique, porteesTouchees,
  type ConventionsParCategorie, type Lexique, type NomLu,
} from '@ucm-kit/core/referentiel';

const repetitions = 7;
const echauffements = 2;
const convention = { casse: 'minuscules', separateur: 'tiret' } as const;
const conventions: ConventionsParCategorie = { variables: convention, groupes: convention };
const ecritureModifiee: ConventionsParCategorie = { ...conventions, variables: { casse: 'PascalCase', separateur: 'camelCase' } };
const vocabulaire = { personnalises: [], ecartsUcm: [] } as const;
const index = indexerVocabulaire(vocabulaire).index;
const dejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] } as const;
const regle = { terme: ['outlined'], remplace: [['outline']] } as const;

function preparer(noms: readonly NomLu[]): Lexique {
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

function mesurer(action: () => unknown): number {
  for (let rang = 0; rang < echauffements; rang++) action();
  const temps: number[] = [];
  for (let rang = 0; rang < repetitions; rang++) {
    const debut = performance.now();
    action();
    temps.push(performance.now() - debut);
  }
  temps.sort((a, b) => a - b);
  return Number(temps[Math.floor(temps.length / 2)].toFixed(3));
}

const variables = [800, 8_000, 32_000].map((nombre) => {
  const noms: NomLu[] = Array.from({ length: nombre }, (_, rang) => ({
    id: `v${rang}`, categorie: 'variables', portee: `c${rang % 8}`,
    nom: `Button ${Math.floor(rang / 32)}/State Hover/${rang % 8 === 0 ? 'Outline' : 'Font'} Size ${rang}`,
    categoriesDesSegments: ['groupes', 'groupes', null],
  }));
  const lexique = preparer(noms);
  const initial = normaliserLeLexique(lexique, conventions, index);
  const questions = detecterLesQuestions(lexique, index, dejaJuge);
  const recalculerTerme = () => {
    const nouveau = indexerVocabulaire({ ...vocabulaire, personnalises: [regle] });
    assert.equal(nouveau.conflits.length, 0);
    const portees = porteesTouchees(lexique, regle.remplace);
    return normaliserLeLexique(lexique, conventions, nouveau.index, { portees });
  };
  const touchees = porteesTouchees(lexique, regle.remplace);
  const resultatPartiel = recalculerTerme();
  const global = normaliserLeLexique(lexique, conventions, indexerVocabulaire({ ...vocabulaire, personnalises: [regle] }).index);
  assert.deepEqual(resultatPartiel.renommages, global.renommages.filter(({ portee }) => touchees.includes(portee)));
  assert.deepEqual(resultatPartiel.collisions, global.collisions.filter(({ portee }) => touchees.includes(portee)));
  assert.equal(initial.renommages.length, nombre);
  return {
    nombre, portees: lexique.portees.size, porteesTouchees: touchees.length,
    nomsDansLesPorteesTouchees: touchees.reduce((total, portee) => total + (lexique.portees.get(portee)?.length ?? 0), 0),
    renommagesInitiaux: initial.renommages.length, questions: questions.questions.length + questions.autres.length,
    preparationMs: mesurer(() => preparer(noms)),
    detectionMs: mesurer(() => detecterLesQuestions(lexique, index, dejaJuge)),
    normalisationInitialeMs: mesurer(() => normaliserLeLexique(lexique, conventions, index)),
    recalculEcritureMs: mesurer(() => normaliserLeLexique(lexique, ecritureModifiee, index)),
    recalculTermeMs: mesurer(recalculerTerme),
  };
});

const resultat = {
  environnement: {
    node: process.version, plateforme: process.platform, architecture: process.arch, cpu: cpus()[0]?.model,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), repetitions, echauffements,
  },
  limites: [
    'Moteur du kit sous Node, sans API Figma, DOM, transfert sandbox/interface ni attente entre les étapes.',
    'Préparation : ajout, découpage, index et détection des conventions ; les noms sont générés hors mesure.',
    'Détection : questions sur le lexique préparé. Normalisation et recalculs réutilisent ce lexique.',
    'Le recalcul de terme comprend son index et la recherche des portées ; la règle outline vers outlined touche une collection sur huit.',
    'Les durées sont des médianes ; elles ne mesurent pas la plus longue tranche entre deux pauses.',
  ],
  variables,
};
const json = `${JSON.stringify(resultat, null, 2)}\n`;
writeFileSync(new URL('./resultats-performances.json', import.meta.url), json);
process.stdout.write(json);
