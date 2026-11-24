/** P1 (P27, 5.2) : la clé que l'Exporter compare pour rattacher une règle à sa propriété. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { ContractProp } from '@ucm-kit/core/format';

import { mergeBooleanDescriptions } from '../src/composant/contract/mergeBooleanDescriptions';
import { mergePropDescriptions } from '../src/composant/contract/mergePropDescriptions';
import { buildRules, cleDeRegle } from '../src/composant/contract/rulesModel';
import { normalizePropKey } from '../src/composant/analyse/proprietesEtEtats';

/** La propriété Figma, la clé que le contrat lui donne, le texte de la règle et la clé de ce texte. */
const PAIRES_SEPAREES = [
  { propriete: 'Icon Left', cleDuContrat: 'iconLeft', texte: 'iconleft', cle: 'iconleft' },
  { propriete: 'Icon Left', cleDuContrat: 'iconLeft', texte: 'ICONLEFT', cle: 'iconleft' },
  { propriete: 'Icon Left', cleDuContrat: 'iconLeft', texte: 'Icon_Left', cle: 'icon_left' },
  { propriete: 'Show Label', cleDuContrat: 'showLabel', texte: 'show_label', cle: 'show_label' },
  { propriete: 'Leading Icon', cleDuContrat: 'leadingIcon', texte: 'leadingicon', cle: 'leadingicon' },
] as const;

test('P1 : cleDeRegle sépare la règle de la propriété pour chaque paire écrite autrement', () => {
  for (const paire of PAIRES_SEPAREES) {
    assert.equal(normalizePropKey(paire.propriete), paire.cleDuContrat, paire.propriete);
    assert.equal(cleDeRegle(paire.texte), paire.cle, paire.texte);
    assert.notEqual(cleDeRegle(paire.texte), paire.cleDuContrat, `${paire.propriete} / ${paire.texte}`);
  }
});

test('P1 : cleDeRegle rapproche la règle de la propriété quand le texte s’écrit comme elle (Icon Left, iconLeft)', () => {
  assert.equal(cleDeRegle('iconLeft'), 'iconLeft');
  assert.equal(cleDeRegle('Icon Left'), 'iconLeft');
  assert.equal(cleDeRegle('  Icon Left  '), 'iconLeft', 'le texte est nettoyé avant la clé');
});

test('P1 : buildRules range une règle @boolean sous cleDeRegle, la clé que la fusion lit', () => {
  for (const paire of PAIRES_SEPAREES) {
    const { booleanDescriptions } = buildRules([{ tag: 'boolean', prop: ` ${paire.texte} `, content: 'Affiche l’icône.' }]);
    assert.deepEqual(Object.keys(booleanDescriptions), [cleDeRegle(paire.texte)], paire.texte);
  }
});

test('P1 : l’Exporter avertit d’une règle @boolean non rattachée, et seulement pour les paires séparées', () => {
  for (const paire of PAIRES_SEPAREES) {
    const props: Record<string, ContractProp> = { [paire.cleDuContrat]: { type: 'boolean', default: true } };
    const warnings: string[] = [];
    const { booleanDescriptions } = buildRules([{ tag: 'boolean', prop: paire.texte, content: 'Affiche l’icône.' }]);
    mergeBooleanDescriptions(props, booleanDescriptions, warnings);
    assert.equal(warnings.length, 1, `${paire.propriete} / ${paire.texte}`);
    assert.equal('description' in props[paire.cleDuContrat], false, paire.texte);
  }
  const props: Record<string, ContractProp> = { iconLeft: { type: 'boolean', default: true } };
  const warnings: string[] = [];
  mergeBooleanDescriptions(props, buildRules([{ tag: 'boolean', prop: 'iconLeft', content: 'Affiche l’icône.' }]).booleanDescriptions, warnings);
  assert.deepEqual(warnings, []);
  assert.deepEqual(props.iconLeft, { type: 'boolean', default: true, description: 'Affiche l’icône.' });
});

test('P1 : l’Exporter avertit d’une règle @prop écrite icon_position pour iconPosition, et la rattache écrite comme la propriété', () => {
  const contrat = (): Record<string, ContractProp> => ({ iconPosition: { type: 'enum', values: ['left', 'right'], default: 'left' } });
  const separee = contrat();
  const avertissements: string[] = [];
  mergePropDescriptions(separee, null, buildRules([{ tag: 'prop', prop: 'icon_position.left', content: 'À gauche.' }]).propDescriptions, avertissements);
  assert.equal(avertissements.length, 1);

  const rattachee = contrat();
  const aucun: string[] = [];
  mergePropDescriptions(rattachee, null, buildRules([{ tag: 'prop', prop: 'Icon Position.left', content: 'À gauche.' }]).propDescriptions, aucun);
  assert.deepEqual(aucun, []);
  assert.deepEqual(rattachee.iconPosition, { type: 'enum', values: ['left', 'right'], default: 'left', descriptions: { left: 'À gauche.' } });
});
