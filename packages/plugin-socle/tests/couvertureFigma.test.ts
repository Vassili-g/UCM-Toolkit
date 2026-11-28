/** Chaque propriété de l'API Plugin de Figma installée a un classement du §2.14 de la forme 15.0, et chaque classement vise une propriété qui existe. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { classement, interfacesDeLAlias, proprietesDeLEntree, proprietesDuType, typesDeLEntree, typesDeNoeud } from './couvertureFigma.lecture';
import { RACINES_DE_SOUS_STRUCTURES, TABLE, type Entree } from './couvertureFigma.table';

const typesDeSousStructure = [
  ...RACINES_DE_SOUS_STRUCTURES.alias.flatMap(interfacesDeLAlias),
  ...RACINES_DE_SOUS_STRUCTURES.interfaces,
];
const proprietesParType = new Map<string, Set<string>>(
  [...typesDeNoeud, ...typesDeSousStructure].map((type) => [type, new Set(proprietesDuType(type))]),
);

const resume = (entree: Entree): string =>
  `${entree.types === 'noeuds' ? 'noeuds' : entree.types.join('+')} : ${entree.proprietes === '*' ? '*' : entree.proprietes.join(', ')}`;

const instruction =
  'Classer la propriété dans packages/plugin-socle/tests/couvertureFigma.table.ts selon le §2.14 de la forme 15.0 ' +
  '(champ portable, perte nommée, éditeur, traçabilité, prototype ou sans objet), puis relancer le test.';

test('chaque propriété de l’API Plugin installée est classée dans la table du §2.14', () => {
  const absentes: string[] = [];
  for (const [type, proprietes] of proprietesParType) {
    for (const propriete of proprietes) if (classement(type, propriete) < 0) absentes.push(`${type}.${propriete}`);
  }
  assert.deepEqual(absentes, [], `${absentes.length} propriété(s) sans classement. ${instruction}`);
});

test('chaque sous-structure des peintures, effets, grilles, tracés et plages a une entrée dans la table', () => {
  const citees = new Set(TABLE.flatMap((entree) => (entree.types === 'noeuds' ? [] : entree.types)));
  const sansEntree = typesDeSousStructure.filter((type) => !citees.has(type));
  assert.deepEqual(sansEntree, [], `Sous-structure(s) sans entrée. ${instruction}`);
});

test('chaque entrée de la table vise des types et des propriétés qui existent encore et classe au moins une paire', () => {
  const orphelines: string[] = [];
  TABLE.forEach((entree, rang) => {
    for (const type of typesDeLEntree(entree)) {
      if (!proprietesParType.has(type)) orphelines.push(`type ${type} inconnu dans « ${resume(entree)} »`);
    }
    const presents = typesDeLEntree(entree).filter((type) => proprietesParType.has(type));
    if (entree.proprietes !== '*') {
      for (const propriete of entree.proprietes) {
        if (!presents.some((type) => proprietesParType.get(type)?.has(propriete))) {
          orphelines.push(`propriété ${propriete} absente des typages dans « ${resume(entree)} »`);
        }
      }
    }
    const classe = presents.some((type) => proprietesDeLEntree(entree, type).some(
      (propriete) => proprietesParType.get(type)?.has(propriete) && classement(type, propriete) === rang,
    ));
    if (!classe) orphelines.push(`entrée sans effet, ses paires sont déjà classées plus haut : « ${resume(entree)} »`);
  });
  assert.deepEqual(orphelines, [], 'Entrée(s) de la table qui ne correspondent plus à rien : les retirer ou les corriger.');
});

test('chaque classe porte la donnée que le §2.14 exige', () => {
  const incompletes: string[] = [];
  for (const entree of TABLE) {
    const manque = (champ: 'champ' | 'ligne' | 'raison'): void => {
      if (!entree[champ]) incompletes.push(`${resume(entree)} : ${champ} manquant pour ${entree.classe}`);
    };
    if (entree.classe === 'portable') manque('champ');
    else if (entree.classe === 'perte' || entree.classe === 'prototype') manque('ligne');
    else manque('raison');
  }
  assert.deepEqual(incompletes, []);
});
