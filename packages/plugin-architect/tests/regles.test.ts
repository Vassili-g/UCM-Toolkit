/** C43 et C45 : les constats des règles d'usage, sur des relevés fabriqués. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { modeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu } from 'ucm-plugin-socle/src/composant/template/modele';

import { constatsDeRegles, modelesDeLAnalyse, proprietesDuModele, retenirLesModeles, surfaceDesRegles } from '../src/regles';
import { restreindreAuParent } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ReleveDesRegles } from '../src/regles';

const contrat: ContratLu = {
  props: {
    severity: { type: 'enum', values: ['info', 'success'], default: 'info' },
    variant: { type: 'enum', values: ['filled', 'outlined'], default: 'filled' },
    dismissible: { type: 'boolean', default: false },
  },
} as unknown as ContratLu;

function releve(sur: Partial<ReleveDesRegles> = {}): ReleveDesRegles {
  const modele = modeleDeRegles('Alert', contrat);
  return { composant: { id: '1:2', nom: 'Alert' }, instancePresente: false, modele, proprietes: proprietesDuModele(modele), documentees: [], ...sur };
}

test('proprietesDuModele : un nom par axe et par booléenne, dans l’ordre du contrat', () => {
  assert.deepEqual(proprietesDuModele(releve().modele), ['severity', 'variant', 'dismissible']);
});

test('C43 : un composant sans instance de règles reçoit un constat À corriger et sa correction', () => {
  const [constat, ...autres] = constatsDeRegles(releve());
  assert.equal(autres.length, 0);
  assert.equal(constat.code, 'C43');
  assert.equal(constat.type, 'corriger');
  assert.equal(constat.famille, 'regles');
  assert.equal(constat.faits.composant, 'Alert');
  assert.equal(constat.faits.proprietes, 'severity, variant, dismissible');
  assert.equal(constat.correction?.sorte, 'regles');
  assert.deepEqual(constat.correction?.cible, { layer: '1:2' });
  assert.equal(constat.correction?.apres.nom, 'creer');
});

test('C43 : avec une instance de règles, aucun constat C43', () => {
  const constats = constatsDeRegles(releve({ instancePresente: true, documentees: ['severity', 'variant', 'dismissible'] }));
  assert.deepEqual(constats, []);
});

test('C45 : une propriété sans règle et une règle sans propriété, sans correction', () => {
  const constats = constatsDeRegles(releve({ instancePresente: true, documentees: ['Severity', 'variant', 'Tone'] }));
  assert.deepEqual(constats.map((c) => [c.code, c.faits.ecart, c.faits.propriete ?? c.faits.regle]), [
    ['C45', 'sans-regle', 'dismissible'],
    ['C45', 'sans-propriete', 'Tone'],
  ]);
  assert.ok(constats.every((c) => c.type === 'corriger' && c.famille === 'regles' && c.correction === undefined));
});

test('C45 : sans instance de règles, aucune comparaison', () => {
  assert.deepEqual(constatsDeRegles(releve({ documentees: ['Tone'] })).map((c) => c.code), ['C43']);
});

test('sans relevé, aucun constat', () => {
  assert.deepEqual(constatsDeRegles(null), []);
});

test('les modèles retenus suivent la dernière analyse', () => {
  retenirLesModeles(releve());
  assert.deepEqual([...modelesDeLAnalyse().keys()], ['regles:creer:1:2']);
  retenirLesModeles(releve({ instancePresente: true }));
  assert.equal(modelesDeLAnalyse().size, 0);
});

test('C45 : les props fusionnées du wrapper de dimensions ne sont pas retirées avant la comparaison', () => {
  const enumDe = (...values: string[]) => ({ type: 'enum', values, default: values[0] });
  const contratButton = {
    props: {
      color: enumDe('primary'), variant: enumDe('solid'), state: enumDe('default'),
      size: enumDe('sm', 'md'), label: { type: 'string', default: '' },
      iconLeft: { type: 'boolean', default: false }, iconRight: { type: 'boolean', default: false },
    },
  } as unknown as ContratLu;
  const declarees = new Set(['color', 'variant', 'state']);
  const surface = surfaceDesRegles(declarees, { props: contratButton.props as never, imbriques: { auParent: [], sansRegles: [], sansPorteur: [] } });
  const modele = modeleDeRegles('Button', restreindreAuParent(contratButton, surface!));
  const constats = constatsDeRegles({
    composant: { id: '1:2', nom: 'Button' }, instancePresente: true, modele, proprietes: proprietesDuModele(modele), publiees: Object.keys(contratButton.props!),
    documentees: ['color', 'variant', 'size', 'label', 'iconLeft', 'iconRight'],
  });
  assert.deepEqual(constats.map((c) => [c.faits.ecart, c.faits.propriete ?? c.faits.regle]), [['sans-regle', 'state']]);
});
