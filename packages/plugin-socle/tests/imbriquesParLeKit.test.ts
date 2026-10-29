/**
 * La sorte d'un composant imbriqué se décide dans le kit, et nulle part ailleurs.
 *
 * Le socle relève des faits (`releverLesFaitsDUnImbrique`) et appelle `sorteDeLImbrique`. La loi lit les sources
 * de `src/composant/contract/`, commentaires retirés, et refuse ce qui réinventerait la décision sans passer par
 * elle : un test de préfixe `.` ou `_`, une sorte nommée par un fichier qui n'importe pas la fonction, un relevé
 * des dimensions liées dont aucun appel à la fonction ne tire la conclusion. Elle exige aussi que les deux
 * lecteurs connus appellent la fonction, pour ne pas passer à vide si le code déménage.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { releverLesFaitsDUnImbrique } from '../src/composant/contract/componentTree';
import { estUnePieceInterne } from '../src/composant/contract/imbriques';

const DOSSIER = path.resolve(__dirname, '..', 'src', 'composant', 'contract');

const SORTES = ['dependance', 'wrapper-de-dimensions', 'piece-interne', 'detail'];

/** Les sources du dossier, commentaires retirés : un commentaire peut citer `'.'` sans le décider. */
function sources(): Array<{ fichier: string; code: string }> {
  return fs.readdirSync(DOSSIER).filter((nom) => nom.endsWith('.ts')).map((fichier) => {
    const brut = fs.readFileSync(path.join(DOSSIER, fichier), 'utf8');
    const code = brut.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    return { fichier, code };
  });
}

/** Les formes d'un test de préfixe de pièce interne. */
const TESTS_DE_PREFIXE: ReadonlyArray<{ nom: string; motif: RegExp }> = [
  { nom: 'comparaison à `.` ou `_`', motif: /[!=]==?\s*['"`][._]['"`]|['"`][._]['"`]\s*[!=]==?/ },
  { nom: 'startsWith sur `.` ou `_`', motif: /startsWith\(\s*['"`][._]['"`]/ },
  { nom: 'expression régulière ancrée sur `.` ou `_`', motif: /\/\^(?:\[[^\]]*[._][^\]]*\]|\\?[._])/ },
  { nom: 'liste des préfixes du kit lue hors du kit', motif: /PREFIXES_DE_PIECE_INTERNE/ },
];

test('aucun fichier de contract/ ne teste un préfixe de pièce interne', () => {
  const trouves: string[] = [];
  for (const { fichier, code } of sources()) {
    for (const { nom, motif } of TESTS_DE_PREFIXE) {
      if (motif.test(code)) trouves.push(`${fichier} : ${nom}`);
    }
  }
  assert.deepEqual(trouves, [], 'La pièce interne se reconnaît par sorteDeLImbrique (@ucm-kit/core/referentiel).');
});

test('un fichier qui nomme une sorte ou compte les dimensions liées importe sorteDeLImbrique', () => {
  const sansLaFonction: string[] = [];
  for (const { fichier, code } of sources()) {
    const nommeUneSorte = SORTES.some((sorte) => code.includes(`'${sorte}'`) || code.includes(`"${sorte}"`));
    const relevePourClasser = /\b(?:countLayoutBindings|releverLesFaitsDUnImbrique)\(/.test(code);
    if ((nommeUneSorte || relevePourClasser) && !/\bsorteDeLImbrique\(/.test(code)) sansLaFonction.push(fichier);
  }
  assert.deepEqual(sansLaFonction, [], 'Ces fichiers décident une sorte sans appeler sorteDeLImbrique.');
});

test('l’élection du wrapper et la reconnaissance des pièces internes appellent sorteDeLImbrique', () => {
  const appelants = sources().filter(({ code }) => /\bsorteDeLImbrique\(/.test(code)).map(({ fichier }) => fichier);
  assert.deepEqual(appelants.sort(), ['componentTree.ts', 'imbriques.ts']);
});

test('estUnePieceInterne suit les préfixes du kit, espaces de tête ignorés', () => {
  assert.equal(estUnePieceInterne('.Ring'), true);
  assert.equal(estUnePieceInterne('_Ring'), true);
  assert.equal(estUnePieceInterne('  .sizeWrapperButton'), true);
  assert.equal(estUnePieceInterne('Button'), false);
  assert.equal(estUnePieceInterne('Ring.Inner'), false);
});

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

function instance(nom: string, maitre: unknown, boundVariables: Record<string, unknown> = {}): InstanceNode {
  return {
    id: `i-${nom}`,
    type: 'INSTANCE',
    name: nom,
    visible: true,
    layoutMode: 'HORIZONTAL',
    boundVariables,
    componentProperties: {},
    findAll: () => [],
    getMainComponentAsync: async () => maitre,
  } as unknown as InstanceNode;
}

test('le relevé des faits donne le nom du set, les dimensions liées, et l’absence de règles', async () => {
  const set = { type: 'COMPONENT_SET', name: '.sizeWrapperButton' };
  const maitre = { id: 'm1', name: 'Size=Small', parent: set };
  const releve = await releverLesFaitsDUnImbrique(
    instance('wrapper', maitre, { itemSpacing: alias('gap'), paddingLeft: alias('px'), paddingRight: alias('px') }),
    [],
    new Map(),
  );
  assert.deepEqual(releve.faits, { nom: '.sizeWrapperButton', reglesTrouvees: false, dimensionsLiees: 2 });
  assert.equal(releve.componentSet, set as unknown as ComponentSetNode);
});

test('le relevé d’une dépendance dit les règles trouvées et ne compte pas ses dimensions', async () => {
  const dependance = instance('Action', { id: 'm2', name: 'Button', parent: null }, { itemSpacing: alias('gap') });
  const releve = await releverLesFaitsDUnImbrique(dependance, [], new Map([[dependance.id, { component: 'Button', figmaLayer: 'Action' }]]));
  assert.deepEqual(releve.faits, { nom: 'Action', reglesTrouvees: true, dimensionsLiees: 0 });
  assert.equal(releve.maitre, null);
});
