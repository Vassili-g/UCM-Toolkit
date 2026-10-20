/**
 * La grammaire du kit de règles Figma et son validateur : les noms des maîtres
 * et des calques, ce que chaque tag attend, et le jugement d'un relevé sans Figma.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIDES_A_MARQUER,
  CALQUES_DE_CONTENU,
  CALQUES_DU_KIT_DE_REGLES,
  CALQUES_LUS_PAR_TAG,
  MAITRES_COMPACTES,
  MAITRES_DU_KIT_DE_REGLES,
  MARQUEUR_A_COMPLETER,
  TAGS_DES_REGLES,
  VERSION_DU_KIT_DE_REGLES,
  calqueDuTag,
  estUneInstanceVierge,
  nomCompacte,
  porteLeMarqueur,
  validerLeKitDeRegles,
  type ReleveDuKitDeRegles,
  type TextesDesCalques,
} from '../src/referentiel/index.js';
import type { RuleTag } from '../src/referentiel/index.js';

const AIDE = `${MARQUEUR_A_COMPLETER} Décrivez.`;

/** Les calques qu'une règle de ce tag attend, avec le texte d'aide sur ceux que le maître marque. */
function varianteComplete(tag: RuleTag): TextesDesCalques {
  const textes: Record<string, string> = { [calqueDuTag(tag)]: calqueDuTag(tag) };
  for (const calque of CALQUES_LUS_PAR_TAG[tag]) textes[calque] = AIDE;
  if (tag === 'icons') {
    textes[CALQUES_DU_KIT_DE_REGLES.modifiable] = '';
    textes[CALQUES_DU_KIT_DE_REGLES.strict] = '';
  }
  return textes;
}

function releveComplet(): ReleveDuKitDeRegles {
  return {
    version: null,
    conteneur: { [CALQUES_DU_KIT_DE_REGLES.nomDuComposant]: AIDE },
    regles: Object.fromEntries(TAGS_DES_REGLES.map((tag) => [tag, varianteComplete(tag)])),
  };
}

/** Le relevé complet, sans un calque d'une règle. */
function sansLeCalque(tag: RuleTag, calque: string): ReleveDuKitDeRegles {
  const releve = releveComplet();
  const { [calque]: _retire, ...reste } = releve.regles[tag] as Record<string, string>;
  return { ...releve, regles: { ...releve.regles, [tag]: reste } };
}

test('les noms des maîtres et des calques sont ceux du kit Figma', () => {
  assert.deepEqual(MAITRES_DU_KIT_DE_REGLES, {
    conteneur: '.componentRules', section: '.rulesSection', regle: '.ruleItem',
  });
  assert.deepEqual(Object.values(CALQUES_DU_KIT_DE_REGLES), [
    'component-name', 'content', 'prop', 'icon', 'modifiable', 'strict',
  ]);
  assert.equal(MARQUEUR_A_COMPLETER, '[À compléter]');
  assert.equal(VERSION_DU_KIT_DE_REGLES, 1);
});

test('les formes compactées dérivent des noms des maîtres', () => {
  assert.deepEqual(MAITRES_COMPACTES, {
    conteneur: '.componentrules', section: '.rulessection', regle: '.ruleitem',
  });
  assert.equal(nomCompacte(' .Rule Item '), '.ruleitem');
});

test('le calque d’un tag s’écrit avec son arobase', () => {
  assert.deepEqual(TAGS_DES_REGLES.map(calqueDuTag), [
    '@usage', '@prop', '@boolean', '@do', '@dont', '@pairs', '@icons', '@default',
  ]);
});

test('chaque tag lit au moins un calque, et `default` ne lit pas son content', () => {
  for (const tag of TAGS_DES_REGLES) assert.ok(CALQUES_LUS_PAR_TAG[tag].length > 0, tag);
  assert.deepEqual(CALQUES_LUS_PAR_TAG.default, ['prop']);
  assert.deepEqual(CALQUES_LUS_PAR_TAG.icons, ['icon']);
  assert.deepEqual(CALQUES_DE_CONTENU, ['content', 'prop', 'icon']);
});

test('seuls usage, prop et boolean exigent le marqueur dans leur content', () => {
  assert.deepEqual(AIDES_A_MARQUER, { usage: 'content', prop: 'content', boolean: 'content' });
});

test('un relevé complet ne rend rien', () => {
  assert.deepEqual(validerLeKitDeRegles(releveComplet()), {
    version: 'courante', manquants: [], tagsSansVariant: [], aidesSansMarqueur: [],
  });
});

for (const tag of TAGS_DES_REGLES) {
  const attendus = [
    calqueDuTag(tag),
    ...CALQUES_LUS_PAR_TAG[tag],
    ...(tag === 'icons' ? ['modifiable', 'strict'] : []),
  ];
  for (const calque of attendus) {
    test(`le calque ${calque} retiré de ${calqueDuTag(tag)} est dit manquant`, () => {
      const verdict = validerLeKitDeRegles(sansLeCalque(tag, calque));
      assert.deepEqual(verdict.manquants, [`.ruleItem/${calqueDuTag(tag)}/${calque}`]);
      assert.deepEqual(verdict.tagsSansVariant, []);
    });
  }
}

test('un calque `component-name` absent du conteneur est dit manquant', () => {
  assert.deepEqual(validerLeKitDeRegles({ ...releveComplet(), conteneur: {} }).manquants, [
    '.componentRules/component-name',
  ]);
  assert.deepEqual(validerLeKitDeRegles({ ...releveComplet(), conteneur: null }).manquants, [
    '.componentRules/component-name',
  ]);
});

test('les noms de calque se comparent sans casse ni espaces de bord', () => {
  const releve = releveComplet();
  const verdict = validerLeKitDeRegles({
    ...releve,
    conteneur: { ' Component-Name ': AIDE },
    regles: { ...releve.regles, usage: { '@USAGE': '@usage', CONTENT: AIDE } },
  });
  assert.deepEqual(verdict.manquants, []);
  assert.deepEqual(verdict.aidesSansMarqueur, []);
});

test('un calque en plus n’est pas une faute', () => {
  const releve = releveComplet();
  const verdict = validerLeKitDeRegles({
    ...releve,
    regles: { ...releve.regles, usage: { ...releve.regles.usage, decor: 'Texte libre' } },
  });
  assert.deepEqual(verdict.manquants, []);
});

test('un tag sans variant est dit seul, sans répéter ses calques', () => {
  const { do: _retire, ...reste } = releveComplet().regles;
  const verdict = validerLeKitDeRegles({ ...releveComplet(), regles: reste });
  assert.deepEqual(verdict.tagsSansVariant, ['do']);
  assert.deepEqual(verdict.manquants, []);
});

test('un relevé vide dit tous les tags sans variant et le calque du conteneur', () => {
  const verdict = validerLeKitDeRegles({ version: null, conteneur: null, regles: {} });
  assert.deepEqual(verdict.tagsSansVariant, [...TAGS_DES_REGLES]);
  assert.deepEqual(verdict.manquants, ['.componentRules/component-name']);
});

test('une aide sans marqueur est dite, tag par tag', () => {
  const releve = releveComplet();
  const verdict = validerLeKitDeRegles({
    ...releve,
    regles: {
      ...releve.regles,
      prop: { ...releve.regles.prop, content: 'Décrivez quand choisir cette valeur.' },
    },
  });
  assert.deepEqual(verdict.aidesSansMarqueur, ['prop']);
});

test('une aide dont le calque manque ne porte pas le marqueur', () => {
  const verdict = validerLeKitDeRegles(sansLeCalque('usage', 'content'));
  assert.deepEqual(verdict.aidesSansMarqueur, ['usage']);
  assert.deepEqual(verdict.manquants, ['.ruleItem/@usage/content']);
});

test('le marqueur manquant de @icons et de @default ne rend aucune aide fautive', () => {
  const releve = releveComplet();
  const verdict = validerLeKitDeRegles({
    ...releve,
    regles: {
      ...releve.regles,
      icons: { ...releve.regles.icons, icon: 'icon-name' },
      default: { ...releve.regles.default, content: 'Écrivez dans prop la valeur par défaut.' },
    },
  });
  assert.deepEqual(verdict.aidesSansMarqueur, []);
});

test('la version absente vaut 1, la version 1 est courante, la version 2 est future', () => {
  const releve = releveComplet();
  assert.equal(validerLeKitDeRegles({ ...releve, version: null }).version, 'courante');
  assert.equal(validerLeKitDeRegles({ ...releve, version: 1 }).version, 'courante');
  assert.equal(validerLeKitDeRegles({ ...releve, version: 2 }).version, 'future');
});

test('un kit futur se juge comme les autres sur le reste du relevé', () => {
  const verdict = validerLeKitDeRegles({ ...sansLeCalque('usage', 'content'), version: 2 });
  assert.equal(verdict.version, 'future');
  assert.deepEqual(verdict.manquants, ['.ruleItem/@usage/content']);
});

test('le marqueur se reconnaît sans tenir compte de la casse ni de la forme Unicode', () => {
  assert.equal(porteLeMarqueur('[À compléter] Texte'), true);
  assert.equal(porteLeMarqueur('[à compléter] texte'), true);
  assert.equal(porteLeMarqueur('[À compléter] texte'), true);
  assert.equal(porteLeMarqueur('Texte rédigé'), false);
  assert.equal(porteLeMarqueur(''), false);
});

test('une instance dont les règles ne portent que du vide ou le marqueur est vierge', () => {
  assert.equal(estUneInstanceVierge([]), true);
  assert.equal(estUneInstanceVierge([
    { content: '', prop: '   ' },
    { content: AIDE, prop: AIDE },
    { icon: AIDE },
  ]), true);
});

test('une règle rédigée dans l’un des calques de contenu rend l’instance non vierge', () => {
  for (const calque of CALQUES_DE_CONTENU) {
    assert.equal(estUneInstanceVierge([
      { content: AIDE },
      { [calque]: 'Action principale du formulaire.' },
    ]), false, calque);
  }
});

test('un texte dans un calque qui n’écrit pas de contenu ne rend pas l’instance non vierge', () => {
  assert.equal(estUneInstanceVierge([{ '@usage': '@usage', 'component-name': 'Button' }]), true);
});
