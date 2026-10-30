/** C43 et C45 : les constats des règles d'usage, sur des relevés fabriqués. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { cibleCompacte, modeleDeRegles, reglesManquantes } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu, ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';

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
  const base = { composant: { id: '1:2', nom: 'Alert' }, instancePresente: false, modele, proprietes: proprietesDuModele(modele), documentees: [], presentes: [], ...sur };
  const manquantes = base.instancePresente
    ? reglesManquantes(base.modele, new Set(base.presentes.map(cibleCompacte)))
    : { nom: base.composant.nom, sections: [] };
  return { manquantes, ...base };
}

const cibles = (modele: ModeleDeRegles, tag: 'prop' | 'boolean'): string[] =>
  modele.sections.filter((s) => s.tag === tag).flatMap((s) => s.elements).flatMap((e) => (e.genre === 'regle' && e.cible ? [e.cible] : []));

const TOUTES_SAUF_DISMISSIBLE = ['severity.info', 'severity.success', 'variant.filled', 'variant.outlined'];

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
  const constats = constatsDeRegles(releve({ instancePresente: true, documentees: ['severity', 'variant', 'dismissible'], presentes: [...TOUTES_SAUF_DISMISSIBLE, 'dismissible'] }));
  assert.deepEqual(constats, []);
});

test('C45 : une propriété sans règle et une règle sans propriété, sans correction', () => {
  const constats = constatsDeRegles(releve({ instancePresente: true, documentees: ['Severity', 'variant', 'Tone'], presentes: TOUTES_SAUF_DISMISSIBLE }));
  assert.deepEqual(constats.map((c) => [c.code, c.faits.ecart, c.faits.propriete ?? c.faits.regle]), [
    ['C45', 'sans-regle', 'dismissible'],
    ['C45', 'sans-propriete', 'Tone'],
  ]);
  assert.ok(constats.every((c) => c.type === 'corriger' && c.famille === 'regles'));
  assert.equal(constats[1].correction, undefined);
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
  retenirLesModeles(releve({ instancePresente: true, documentees: ['severity', 'variant', 'dismissible'], presentes: [...TOUTES_SAUF_DISMISSIBLE, 'dismissible'] }));
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
  const presentes = [...cibles(modele, 'prop'), ...cibles(modele, 'boolean')];
  const constats = constatsDeRegles({
    presentes, manquantes: { nom: 'Button', sections: [] },
    composant: { id: '1:2', nom: 'Button' }, instancePresente: true, modele, proprietes: proprietesDuModele(modele), publiees: Object.keys(contratButton.props!),
    documentees: ['color', 'variant', 'size', 'label', 'iconLeft', 'iconRight'],
  });
  assert.deepEqual(constats.map((c) => [c.faits.ecart, c.faits.propriete ?? c.faits.regle]), [['sans-regle', 'state']]);
});

const contratEtats: ContratLu = {
  props: { severity: { type: 'enum', values: ['info', 'success'], default: 'info' }, dismissible: { type: 'boolean', default: false } },
  stateModel: { axis: 'state', states: { default: {}, hover: {}, focus: {} } },
} as unknown as ContratLu;

function releveEtats(sur: Partial<ReleveDesRegles>): ReleveDesRegles {
  const modele = modeleDeRegles('Alert', contratEtats);
  const presentes = sur.presentes ?? [];
  return {
    composant: { id: '1:2', nom: 'Alert' }, instancePresente: true, modele, proprietes: proprietesDuModele(modele), documentees: [], presentes,
    manquantes: reglesManquantes(modele, new Set(presentes)), ...sur,
  };
}

const corrections = (constats: ReturnType<typeof constatsDeRegles>) =>
  constats.filter((c) => c.code === 'C45').map((c) => [c.faits.ecart, c.faits.propriete, c.faits.valeurs, c.faits.regles, c.correction?.id]);

test('C45 : un axe absent des règles porte la correction ajouter et le nombre de valeurs', () => {
  const constats = constatsDeRegles(releveEtats({ documentees: ['severity', 'dismissible'], presentes: ['severity.info', 'severity.success', 'dismissible'] }));
  assert.deepEqual(corrections(constats), [['sans-regle', 'state', undefined, 3, 'regles:ajouter:1:2:state']]);
  assert.deepEqual(constats[0].correction, {
    id: 'regles:ajouter:1:2:state', sorte: 'regles', cible: { layer: '1:2' }, avant: null, apres: { nom: 'ajouter' }, aRelire: { regle: 'regles', avant: null },
  });
});

test('C45 : un axe dont des valeurs manquent donne un constat sans-valeur avec les valeurs, dans l’ordre du modèle', () => {
  const constats = constatsDeRegles(releveEtats({
    documentees: ['severity', 'dismissible', 'state'], presentes: ['severity.info', 'severity.success', 'dismissible', 'state.default'],
  }));
  assert.deepEqual(corrections(constats), [['sans-valeur', 'state', 'hover, focus', 2, 'regles:ajouter:1:2:state']]);
  assert.equal(constats[0].id, 'regles:C45:sans-valeur:state');
  assert.equal(constats[0].correction?.apres.nom, 'ajouter');
});

test('C45 : une valeur seulement marquée « à compléter » compte comme présente', () => {
  const constats = constatsDeRegles(releveEtats({
    documentees: ['severity', 'dismissible', 'state'],
    presentes: ['severity.info', 'severity.success', 'dismissible', 'state.default', 'state.hover', 'state.focus'],
  }));
  assert.deepEqual(constats, []);
});

test('C45 : une valeur marquée seule ne relance pas sa correction', () => {
  const constats = constatsDeRegles(releveEtats({
    documentees: ['severity', 'dismissible', 'state'],
    presentes: ['severity.info', 'severity.success', 'dismissible', 'state.default', 'state.hover'],
  }));
  assert.deepEqual(corrections(constats), [['sans-valeur', 'state', 'focus', 1, 'regles:ajouter:1:2:state']]);
});

test('C45 : une booléenne sans règle porte la correction ajouter sous sa clé', () => {
  const constats = constatsDeRegles(releveEtats({ documentees: ['severity', 'state'], presentes: ['severity.info', 'severity.success', 'state.default', 'state.hover', 'state.focus'] }));
  assert.deepEqual(corrections(constats), [['sans-regle', 'dismissible', undefined, 1, 'regles:ajouter:1:2:dismissible']]);
});

test('C45 sans-propriete : aucune correction', () => {
  const constats = constatsDeRegles(releveEtats({
    documentees: ['severity', 'dismissible', 'state', 'Tone'],
    presentes: ['severity.info', 'severity.success', 'dismissible', 'state.default', 'state.hover', 'state.focus'],
  }));
  assert.deepEqual(constats.map((c) => [c.faits.ecart, c.correction]), [['sans-propriete', undefined]]);
});

test('C45 : sans instance, C43 seul, sans correction ajouter', () => {
  const constats = constatsDeRegles(releveEtats({ instancePresente: false, documentees: ['Tone'], manquantes: { nom: 'Alert', sections: [] } }));
  assert.deepEqual(constats.map((c) => [c.code, c.correction?.apres.nom]), [['C43', 'creer']]);
});

test('retenirLesModeles : le modèle réduit à la propriété, sous l’identifiant de chaque correction ajouter', () => {
  const r = releveEtats({ documentees: ['severity', 'state'], presentes: ['severity.info', 'state.default'] });
  retenirLesModeles(r);
  const retenus = modelesDeLAnalyse();
  assert.deepEqual([...retenus.keys()].sort(), ['regles:ajouter:1:2:dismissible', 'regles:ajouter:1:2:severity', 'regles:ajouter:1:2:state']);
  assert.deepEqual(cibles(retenus.get('regles:ajouter:1:2:state')!, 'prop'), ['state.hover', 'state.focus']);
  assert.deepEqual(retenus.get('regles:ajouter:1:2:state')!.sections.map((s) => s.tag), ['prop']);
  assert.deepEqual(cibles(retenus.get('regles:ajouter:1:2:severity')!, 'prop'), ['severity.success']);
  assert.deepEqual(cibles(retenus.get('regles:ajouter:1:2:dismissible')!, 'boolean'), ['dismissible']);
  assert.equal(retenus.get('regles:ajouter:1:2:state')!.sections[0].elements.every((e) => e.genre === 'regle'), true);
});
