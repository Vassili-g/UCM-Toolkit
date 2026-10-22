/** La lecture d'un composant : sujet, frontières, surcharges, styles de texte, valeurs sans token, variables, modes, volume, lecture seule. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lignesDe, porteeDe } from '../src/composant';
import { indexer } from '../src/indexation';
import { BORNE_DES_CALQUES, LOT, lireLeComposant, sujetDe, sujetDeLaSelection } from '../src/lectureDuComposant';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const sansAnnulation = { annulee: () => false };
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const rouge = { r: 1, g: 0, b: 0, a: 1 };
const peinture = (variable: string) => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias(variable) } });
const aplat = (hexa: { r: number; g: number; b: number }, champs: Record<string, unknown> = {}) => ({ type: 'SOLID', color: hexa, ...champs });

/** Deux variables locales, `fond` qui vise `base`, et leur collection. */
function variablesSimples() {
  return portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['fond', 'base', 'taille'])],
    [variableFigma('fond', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': alias('base') }), variableFigma('base', 'c', 'rouge', 'COLOR', { 'c:Valeur': rouge }), variableFigma('taille', 'c', 'texte/taille', 'FLOAT', { 'c:Valeur': 14 })],
  );
}

async function lire(...arguments_: Parameters<typeof lireLeComposant>) {
  const issue = await lireLeComposant(...arguments_);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') throw new Error('lecture non rendue');
  return issue.lecture;
}

test('le sujet se trouve depuis un calque profond, une instance imbriquée, un variant et un calque hors composant', () => {
  const a = atelierDeCalques();
  const profond = a.calque('profond', 'RECTANGLE');
  const interne = a.calque('interne', 'TEXT');
  const imbriquee = a.calque('imbriquee', 'INSTANCE', { name: 'Button' }, [interne]);
  const variant = a.calque('variant', 'COMPONENT', { name: 'Etat=Info' }, [a.calque('cadre', 'FRAME', {}, [profond, imbriquee])]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Alert', defaultVariant: variant }, [variant]);
  const libre = a.calque('libre', 'FRAME');
  a.calque('page', 'PAGE', {}, [jeu, libre]);

  assert.deepEqual([sujetDe(profond)?.sujet.id, sujetDe(profond)?.portee, sujetDe(profond)?.ancetres], ['variant', 'profond', []]);
  assert.deepEqual([sujetDe(interne)?.sujet.id, sujetDe(interne)?.portee, sujetDe(interne)?.ancetres.map((ancetre) => ancetre.id)], ['imbriquee', 'interne', ['variant']]);
  assert.deepEqual([sujetDe(jeu)?.sujet.id, sujetDe(jeu)?.portee], ['jeu', 'jeu']);
  assert.equal(sujetDe(libre), null);
  assert.deepEqual(sujetDeLaSelection([profond, libre, interne]), { sujet: { id: 'variant', portee: 'profond' }, ignores: 2 });
  assert.deepEqual(sujetDeLaSelection([libre]), { sujet: null, ignores: 0 });
  assert.deepEqual(sujetDeLaSelection([]), { sujet: null, ignores: 0 });
});

test('un jeu de variants lit son variant par défaut ; un variant prend le nom du jeu et liste ses voisins', async () => {
  const a = atelierDeCalques();
  const info = a.calque('info', 'COMPONENT', { name: 'Etat=Info' }, [a.calque('i1', 'FRAME')]);
  const erreur = a.calque('erreur', 'COMPONENT', { name: 'Etat=Erreur' }, [a.calque('e1', 'FRAME'), a.calque('e2', 'FRAME')]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Alert', defaultVariant: erreur }, [info, erreur]);
  const { port } = variablesSimples();

  const duJeu = await lire(a.port(port), jeu, sansAnnulation);
  assert.deepEqual(duJeu.sujet, { id: 'jeu', nom: 'Alert', type: 'COMPONENT_SET', variant: 'Etat=Erreur', variants: [{ id: 'info', nom: 'Etat=Info' }, { id: 'erreur', nom: 'Etat=Erreur' }] });
  assert.deepEqual(duJeu.calques.map((calque) => [calque.id, calque.parent]), [['erreur', null], ['e1', 'erreur'], ['e2', 'erreur']]);

  const duVariant = await lire(a.port(port), info, sansAnnulation);
  assert.deepEqual([duVariant.sujet.id, duVariant.sujet.nom, duVariant.sujet.variant, duVariant.sujet.variants.length], ['info', 'Alert', 'Etat=Info', 2]);
  assert.deepEqual(duVariant.ancetres, []);
});

test('aucun calque d’une frontière n’entre dans la lecture ; son nom vient de son maître, puis du calque', async () => {
  const a = atelierDeCalques();
  const maitre = a.calque('maitre', 'COMPONENT', { name: 'Taille=M' });
  a.calque('jeu-bouton', 'COMPONENT_SET', { name: 'Button' }, [maitre]);
  const dedans = a.calque('dedans', 'RECTANGLE', { fills: [peinture('fond')] });
  const bouton = a.calque('bouton', 'INSTANCE', { name: 'Bouton principal', fills: [peinture('fond')], getMainComponentAsync: async () => maitre }, [dedans]);
  const icone = a.calque('icone', 'INSTANCE', { name: 'circle-info', getMainComponentAsync: async () => { throw new Error('maître illisible'); } }, [a.calque('trace', 'VECTOR')]);
  const racine = a.calque('racine', 'COMPONENT', { name: 'Alert', fills: [peinture('fond')] }, [bouton, icone]);
  const { port } = variablesSimples();

  const lecture = await lire(a.port(port), racine, sansAnnulation);
  assert.deepEqual(lecture.calques.map((calque) => [calque.id, calque.frontiere?.composant ?? null]), [['racine', null], ['bouton', 'Button'], ['icone', 'circle-info']]);
  assert.deepEqual(lecture.liaisons.map((liaison) => liaison.calque), ['racine']);
  assert.deepEqual(lecture.erreurs, []);

  const ouverte = await lire(a.port(port), bouton, sansAnnulation);
  assert.deepEqual([ouverte.sujet.id, ouverte.sujet.variant, ouverte.ancetres], ['bouton', 'Taille=M', [{ id: 'racine', nom: 'Alert' }]]);
  assert.deepEqual(ouverte.calques.map((calque) => calque.id), ['bouton', 'dedans']);
  assert.deepEqual(ouverte.liaisons.map((liaison) => liaison.calque), ['bouton', 'dedans']);
});

test('une surcharge de fills se rattache à l’instance ; une surcharge sans liaison ou d’un autre champ est ignorée', async () => {
  const a = atelierDeCalques();
  const trace = a.calque('I1;trace', 'VECTOR', { fills: [peinture('fond')], strokes: [peinture('base')], boundVariables: { width: alias('taille'), opacity: alias('taille') } });
  const libelle = a.calque('I1;libelle', 'TEXT', { fills: [aplat({ r: 0, g: 0, b: 1 })] });
  const icone = a.calque('I1', 'INSTANCE', {
    name: 'circle-info',
    overrides: [
      { id: 'I1;trace', overriddenFields: ['fills', 'width'] },
      { id: 'I1;libelle', overriddenFields: ['fills', 'characters'] },
      { id: 'I1;absent', overriddenFields: ['fills'] },
      { id: 'I1', overriddenFields: ['name'] },
    ],
  }, [trace, libelle]);
  const racine = a.calque('racine', 'COMPONENT', {}, [icone]);
  const { port } = variablesSimples();

  const atelier = a.port(port);
  const lecture = await lire(atelier, racine, sansAnnulation);
  assert.deepEqual(lecture.liaisons.map((liaison) => [liaison.calque, liaison.propriete, liaison.variable]), [['I1', 'width', 'taille'], ['I1', 'fills[0]', 'fond']]);
  assert.deepEqual(lecture.directes, []);
  assert.equal(a.lectures.get('calque:I1'), undefined);

  const lignes = lignesDe(lecture, indexer(lecture.releve), porteeDe(lecture, 'racine'));
  assert.deepEqual(lignes.map((ligne) => [ligne.nomComplet, ligne.libelles, ligne.calques]), [['carte/fond', ['fond'], ['I1']], ['texte/taille', ['taille'], ['I1']]]);
});

test('une surcharge de boundVariables garde les liaisons du calque, pas celles de ses peintures', async () => {
  const a = atelierDeCalques();
  const cadre = a.calque('I2;cadre', 'FRAME', { fills: [peinture('fond')], boundVariables: { itemSpacing: alias('taille') } });
  const instance = a.calque('I2', 'INSTANCE', { overrides: [{ id: 'I2;cadre', overriddenFields: ['boundVariables'] }] }, [cadre]);
  const racine = a.calque('racine', 'COMPONENT', {}, [instance]);
  const lecture = await lire(a.port(variablesSimples().port), racine, sansAnnulation);
  assert.deepEqual(lecture.liaisons.map((liaison) => [liaison.calque, liaison.propriete]), [['I2', 'itemSpacing']]);
});

test('un style de texte se lit une fois pour douze calques, et ses variables ne font pas de liaison du calque', async () => {
  const a = atelierDeCalques();
  a.styleDeTexte('S:1', 'Body/Large', { fontSize: alias('taille'), fontFamily: alias('famille') });
  const textes = Array.from({ length: 12 }, (_, rang) => a.calque(`t${rang}`, 'TEXT', {
    textStyleId: 'S:1',
    fontSize: 14,
    getStyledTextSegments: () => [{ start: 0, end: 4, boundVariables: { fontSize: alias('taille'), fontFamily: alias('famille'), letterSpacing: alias('taille') }, fills: [peinture('fond')] }],
  }));
  const mixte = a.calque('mixte', 'TEXT', {
    textStyleId: Symbol('mixed'),
    getStyledTextSegments: (champs: string[]) => (champs.includes('textStyleId') ? [{ start: 0, end: 2, textStyleId: 'S:1' }, { start: 2, end: 4, textStyleId: 'S:absent' }, { start: 4, end: 6, textStyleId: '' }] : []),
  });
  const racine = a.calque('racine', 'COMPONENT', {}, [...textes, mixte]);
  const { port } = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['fond', 'base', 'taille', 'famille'])],
    [variableFigma('fond', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': alias('base') }), variableFigma('base', 'c', 'rouge', 'COLOR', { 'c:Valeur': rouge }), variableFigma('taille', 'c', 'texte/taille', 'FLOAT', { 'c:Valeur': 14 }), variableFigma('famille', 'c', 'texte/famille', 'STRING', { 'c:Valeur': 'Inter' })],
  );

  const lecture = await lire(a.port(port), racine, sansAnnulation);
  assert.equal(a.lectures.get('style:S:1'), 1);
  assert.equal(a.lectures.get('style:S:absent'), 1);
  assert.deepEqual(lecture.styles, [{ id: 'S:1', nom: 'Body/Large', liaisons: [{ champ: 'fontSize', variable: 'taille' }, { champ: 'fontFamily', variable: 'famille' }] }]);
  assert.equal(lecture.usagesDeStyle.length, 13);
  assert.deepEqual(lecture.liaisons.filter((liaison) => liaison.calque === 't0').map((liaison) => liaison.propriete), ['texte[0–4].letterSpacing', 'texte[0–4].fills[0]']);
  assert.deepEqual(lecture.directes, []);

  const lignes = lignesDe(lecture, indexer(lecture.releve), porteeDe(lecture, 'racine'));
  assert.deepEqual(lignes.map((ligne) => [ligne.genre, ligne.nomComplet, ligne.calques.length]), [['token', 'carte/fond', 12], ['token', 'texte/taille', 12], ['style', 'Body/Large', 13]]);
});

test('chaque ligne du tableau des valeurs sans token : peintures, rayons, épaisseur, espacements, taille de texte', async () => {
  const a = atelierDeCalques();
  const bleu = { r: 0, g: 0, b: 1 };
  const cadre = a.calque('cadre', 'FRAME', {
    fills: [aplat(bleu), aplat(bleu, { visible: false }), aplat(bleu, { opacity: 0 }), { type: 'GRADIENT_LINEAR' }, peinture('fond'), aplat({ r: 1, g: 1, b: 1 }, { opacity: 0.5 })],
    strokes: [aplat(bleu)],
    strokeWeight: 2,
    cornerRadius: 8,
    layoutMode: 'HORIZONTAL',
    itemSpacing: 12,
    paddingLeft: 16,
    paddingRight: 0,
    paddingTop: 4,
    paddingBottom: 4,
    boundVariables: { paddingTop: alias('taille') },
  });
  const libre = a.calque('libre', 'FRAME', { layoutMode: 'NONE', itemSpacing: 10, paddingLeft: 10, strokes: [aplat(bleu)], strokeWeight: 0, cornerRadius: Symbol('mixed'), topLeftRadius: 4, topRightRadius: 0, bottomLeftRadius: 6, boundVariables: { bottomLeftRadius: alias('taille') } });
  const lie = a.calque('lie', 'FRAME', { strokes: [aplat(bleu)], strokeWeight: 1, cornerRadius: 8, boundVariables: { strokeWeight: alias('taille'), topLeftRadius: alias('taille') } });
  const texteLibre = a.calque('texte-libre', 'TEXT', { textStyleId: '', fontSize: 13, fills: Symbol('mixed'), getStyledTextSegments: () => [] });
  const texteLie = a.calque('texte-lie', 'TEXT', { textStyleId: '', fontSize: 13, getStyledTextSegments: (champs: string[]) => (champs.includes('fills') ? [{ start: 0, end: 3, boundVariables: { fontSize: alias('taille') }, fills: [] }] : []) });
  const racine = a.calque('racine', 'COMPONENT', {}, [cadre, libre, lie, texteLibre, texteLie]);

  const lecture = await lire(a.port(variablesSimples().port), racine, sansAnnulation);
  assert.deepEqual(lecture.directes.map((directe) => `${directe.calque} ${directe.propriete} ${directe.valeur}`), [
    'cadre fills[0] #0000FF',
    'cadre fills[5] #FFFFFF80',
    'cadre strokes[0] #0000FF',
    'cadre cornerRadius 8',
    'cadre strokeWeight 2',
    'cadre itemSpacing 12',
    'cadre paddingLeft 16',
    'cadre paddingBottom 4',
    'libre topLeftRadius 4',
    'lie strokes[0] #0000FF',
    'texte-libre fontSize 13',
  ]);
});

test('une variable de départ ne s’importe jamais ; une cible d’alias s’importe par sa clé', async () => {
  const depart = 'VariableID:aaa111/1:1';
  const cible = 'VariableID:bbb222/1:2';
  const absente = 'VariableID:ccc333/1:3';
  const a = atelierDeCalques();
  const racine = a.calque('racine', 'COMPONENT', { fills: [peinture(depart)], strokes: [peinture(absente)] });
  const { port, appels } = portDeTest(
    [],
    [],
    [variableFigma(depart, 'bib', 'button/bg', 'COLOR', { 'bib:M': alias(cible) }, true)],
    [collectionFigma('bib', 'Bibliothèque', ['M'], [depart, cible, 'VariableID:ddd444/1:4'], true)],
    { importables: [{ ...variableFigma(cible, 'bib', 'blue/500', 'COLOR', { 'bib:M': rouge }, true), key: 'bbb222' }, { ...variableFigma(absente, 'bib', 'perdue', 'COLOR', { 'bib:M': rouge }, true), key: 'ccc333' }] },
  );

  const lecture = await lire(a.port(port), racine, sansAnnulation);
  assert.deepEqual([...appels.keys()].filter((cle) => cle.startsWith('import:')), ['import:bbb222']);
  assert.deepEqual(lecture.releve.variables.map((variable) => variable.id), [depart, cible]);
  assert.deepEqual(lecture.releve.manquees.map((manquee) => [manquee.id, manquee.issue]), [[absente, 'introuvable']]);
  assert.deepEqual(lecture.releve.collections.map((collection) => [collection.id, collection.variables]), [['bib', [depart, cible]]]);
  assert.equal(appels.get('VariableID:ddd444/1:4'), undefined);

  const [fond, contour] = lignesDe(lecture, indexer(lecture.releve), porteeDe(lecture, 'racine'));
  assert.deepEqual([fond.nomComplet, fond.valeur, fond.resultat?.etapes.length], ['button/bg', '#FF0000', 2]);
  assert.deepEqual([contour.nomComplet, contour.resultat?.statut], [absente, 'inaccessible']);
});

test('les modes d’un calque se traduisent quand deux collections distantes partagent un identifiant de mode', async () => {
  const avecModes = (collection: ReturnType<typeof collectionFigma>, modes: Array<[string, string]>) => ({ ...collection, modes: modes.map(([modeId, name]) => ({ modeId, name })), defaultModeId: modes[0][0] });
  const a = atelierDeCalques();
  const sombre = a.calque('sombre', 'FRAME', { fills: [peinture('theme-fond')], resolvedVariableModes: { theme: '1:1', marque: '1:0' }, explicitVariableModes: { theme: '1:1' } });
  const racine = a.calque('racine', 'COMPONENT', { fills: [peinture('theme-fond')], resolvedVariableModes: { theme: '1:0', marque: '1:0' } }, [sombre]);
  const figma = (valeur: unknown) => ({ resolveForConsumer: () => ({ value: valeur }) });
  const { port } = portDeTest(
    [],
    [],
    [
      { ...variableFigma('theme-fond', 'theme', 'fond', 'COLOR', { '1:0': alias('marque-clair'), '1:1': alias('marque-sombre') }, true), resolveForConsumer: (consommateur: never) => ({ value: (consommateur as { id: string }).id === 'sombre' ? { r: 0, g: 0, b: 0, a: 1 } : { r: 1, g: 1, b: 1, a: 0.5 } }) },
      { ...variableFigma('marque-clair', 'marque', 'clair', 'COLOR', { '1:0': { r: 1, g: 1, b: 1, a: 1 } }, true), ...figma(null) },
      { ...variableFigma('marque-sombre', 'marque', 'sombre', 'COLOR', { '1:0': { r: 0, g: 0, b: 0, a: 1 } }, true), ...figma(null) },
    ],
    [avecModes(collectionFigma('theme', 'Thème', [], ['theme-fond'], true), [['1:0', 'Light'], ['1:1', 'Dark']]), avecModes(collectionFigma('marque', 'Marque', [], ['marque-clair', 'marque-sombre'], true), [['1:0', 'Alpha']])],
  );

  const lecture = await lire(a.port(port), racine, sansAnnulation, () => 4321);
  assert.equal(lecture.releve.luA, 4321);
  assert.deepEqual(lecture.calques.map((calque) => calque.modes), [
    { theme: { mode: 'theme/1:0', explicite: false }, marque: { mode: 'marque/1:0', explicite: false } },
    { theme: { mode: '1:1', explicite: true }, marque: { mode: 'marque/1:0', explicite: false } },
  ]);
  const lignes = lignesDe(lecture, indexer(lecture.releve), porteeDe(lecture, 'racine'));
  assert.deepEqual(lignes.map((ligne) => [ligne.valeur, ligne.calques, ligne.resultat?.etapes.map((etape) => etape.origine), ligne.ecart !== null]), [
    ['#FFFFFF', ['racine'], ['calque-herite', 'calque-herite'], true],
    ['#000000', ['sombre'], ['calque-explicite', 'calque-herite'], false],
  ]);
});

test('une annulation ne rend aucun résultat partiel', async () => {
  const a = atelierDeCalques();
  const racine = a.calque('racine', 'COMPONENT', {}, Array.from({ length: LOT * 2 }, (_, rang) => a.calque(`n${rang}`, 'FRAME', { fills: [peinture('fond')] })));
  let appels = 0;
  const issue = await lireLeComposant(a.port(variablesSimples().port), racine, { annulee: () => { appels += 1; return appels > 3; } });
  assert.deepEqual(issue, { statut: 'annule' });
});

test(`au-delà de ${BORNE_DES_CALQUES} calques, la lecture s’arrête, compte le reste et rend la main entre les lots`, async () => {
  const a = atelierDeCalques();
  const racine = a.calque('racine', 'COMPONENT', {}, Array.from({ length: BORNE_DES_CALQUES + 150 }, (_, rang) => a.calque(`n${rang}`, 'FRAME', { fills: [peinture('fond')] })));
  const lecture = await lire(a.port(variablesSimples().port), racine, sansAnnulation);
  assert.equal(lecture.calques.length, BORNE_DES_CALQUES);
  assert.equal(lecture.calquesNonLus, 151);
  assert.equal(lecture.liaisons.length, BORNE_DES_CALQUES - 1);
  assert.ok(a.pauses() >= BORNE_DES_CALQUES / LOT, `${a.pauses()} pauses`);
});

test('un calque illisible se range dans les erreurs, et la lecture ne fait que lire', async () => {
  const a = atelierDeCalques();
  const casse = { get boundVariables(): unknown { throw new Error('calque illisible'); } };
  const racine = a.calque('racine', 'COMPONENT', { fills: [peinture('fond')] }, [a.calque('casse', 'FRAME', Object.defineProperties({}, Object.getOwnPropertyDescriptors(casse))), a.calque('sain', 'TEXT', { textStyleId: '', getStyledTextSegments: () => [] })]);
  const lecture = await lire(a.port(variablesSimples().port), racine, sansAnnulation);
  assert.deepEqual(lecture.erreurs, [{ calque: 'casse', message: 'calque illisible' }]);
  assert.deepEqual(lecture.calques.map((calque) => calque.id), ['racine', 'casse', 'sain']);
  assert.deepEqual([...new Set(a.journal)].sort(), ['getStyledTextSegments', 'pause']);

  const horsComposant = a.calque('hors', 'FRAME');
  assert.deepEqual(await lireLeComposant(a.port(variablesSimples().port), horsComposant, sansAnnulation), { statut: 'sans-sujet' });
});
