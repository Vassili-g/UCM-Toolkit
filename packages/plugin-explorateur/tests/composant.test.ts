/** Le modèle de la vue composant : natures, lignes, portée, préfixe, sections, résumés, frontières, filtre, écart avec Figma. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compteDesLiaisons,
  ecartAvecFigma,
  filtrer,
  frontieresDe,
  lignesDe,
  modesNommes,
  natureDe,
  porteeDe,
  prefixeCommun,
  resumeDe,
  sectionsDe,
  type CalqueDuComposant,
  type LectureDeComposant,
} from '../src/composant';
import { indexer } from '../src/indexation';
import { resoudre } from '../src/resolution';
import { alias, composantBouton, composantComplexe, composantInterrompu, composantSansToken, composantSimple, constructeur, couleur, nombre } from './fixtures';

const lignesDuSujet = (lecture: LectureDeComposant, calque = lecture.calques[0].id) => lignesDe(lecture, indexer(lecture.releve), porteeDe(lecture, calque));

test('chaque chemin de propriété de la table rend sa nature et son libellé', () => {
  const table: Array<[string, string, string, string]> = [
    ['fills[0]', 'TEXT', 'couleur', 'texte'],
    ['texte[0–5].fills[0]', 'TEXT', 'couleur', 'texte'],
    ['fills[0]', 'FRAME', 'couleur', 'fond'],
    ['fills[1].gradientStops[0].color', 'FRAME', 'couleur', 'fond'],
    ['strokes[0]', 'FRAME', 'couleur', 'contour'],
    ['effects[0].color', 'FRAME', 'couleur', 'effet'],
    ...['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'cornerRadius'].map((champ): [string, string, string, string] => [champ, 'FRAME', 'forme', 'rayon']),
    ...['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'].map((champ): [string, string, string, string] => [champ, 'FRAME', 'forme', 'epaisseur']),
    ['opacity', 'FRAME', 'forme', 'opacite'],
    ...['itemSpacing', 'counterAxisSpacing', 'gridRowGap', 'gridColumnGap'].map((champ): [string, string, string, string] => [champ, 'FRAME', 'espacement', 'ecart']),
    ...['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].map((champ): [string, string, string, string] => [champ, 'FRAME', 'espacement', 'marge']),
    ...['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'].map((champ): [string, string, string, string] => [champ, 'FRAME', 'taille', 'taille']),
    ...['fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing', 'paragraphIndent'].flatMap((champ): Array<[string, string, string, string]> => [[champ, 'TEXT', 'texte', 'police'], [`texte[0–5].${champ}`, 'TEXT', 'texte', 'police']]),
    ['effects[0].radius', 'FRAME', 'autre', 'effects[0].radius'],
    ['componentProperties.Label', 'INSTANCE', 'autre', 'componentProperties.Label'],
    ['layoutGrids[0].count', 'FRAME', 'autre', 'layoutGrids[0].count'],
  ];
  for (const [propriete, type, nature, libelle] of table) assert.deepEqual(natureDe(propriete, type), { nature, libelle }, propriete);
});

test('Alert donne 10 lignes pour 7 calques et 1 composant imbriqué, comme la maquette', () => {
  const lecture = composantSimple();
  const lignes = lignesDuSujet(lecture);
  assert.equal(lecture.calques.length, 7);
  assert.equal(lignes.length, 10);
  assert.deepEqual(sectionsDe(lignes).map((section) => [section.nature, section.lignes.length]), [['couleur', 3], ['forme', 1], ['espacement', 3], ['taille', 1], ['texte', 2]]);
  assert.deepEqual(lignes.map((ligne) => [ligne.nomCourt, ligne.valeur]), [
    ['colors/info/standard/background', '#F0F9FF'],
    ['colors/info/standard/icon', '#0369A1'],
    ['colors/info/standard/foreground', '#0369A1'],
    ['sizes/border-radius', '6'],
    ['sizes/gap', '10'],
    ['sizes/padding-x', '14'],
    ['sizes/padding-y', '8'],
    ['icons/sizes/base', '22'],
    ['Body/Large', '16/24'],
    ['Body/Small', '14/20'],
  ]);
  assert.deepEqual(frontieresDe(lecture, porteeDe(lecture, lecture.calques[0].id)), [{ nom: 'Button', fois: 1, premiere: 'alert:6' }]);
  assert.equal(compteDesLiaisons(lecture, porteeDe(lecture, lecture.calques[0].id)), 11);
});

test('StressTest donne 52 lignes ; un token lié à 12 calques tient sur une ligne', () => {
  const lecture = composantComplexe();
  const lignes = lignesDuSujet(lecture);
  assert.equal(lecture.calques.length, 52);
  assert.equal(lignes.length, 52);
  assert.equal(lignes.filter((ligne) => ligne.genre === 'style').length, 5);
  const tuile = lignes.find((ligne) => ligne.nomCourt === 'tilesgrid/colors/tile');
  assert.equal(tuile?.calques.length, 12);
  assert.equal(tuile?.nomComplet, 'stresstest/info/tilesgrid/colors/tile');
  assert.deepEqual(frontieresDe(lecture, porteeDe(lecture, lecture.calques[0].id)).map((frontiere) => [frontiere.nom, frontiere.fois, frontiere.premiere]), [['Alert', 1, 'stresstest:4'], ['Button', 2, 'stresstest:19'], ['TileLink', 7, 'stresstest:38']]);
});

test('un style de texte porté par plusieurs calques donne une ligne, avec ses champs résolus', () => {
  const lecture = composantComplexe();
  const style = lignesDuSujet(lecture).find((ligne) => ligne.cle === 'style:S:Label/Small');
  assert.equal(style?.calques.length, 4);
  assert.deepEqual(style?.libelles, ['style']);
  assert.equal(style?.valeur, '10/12');
  assert.deepEqual(style?.champs.map((champ) => [champ.champ, champ.resultat.statut === 'resolu' && champ.resultat.etapes.length]), [['fontFamily', 1], ['fontSize', 2], ['fontWeight', 2], ['lineHeight', 2], ['letterSpacing', 2]]);
});

test('la portée d’un calque retire les lignes et les frontières des autres branches', () => {
  const lecture = composantComplexe();
  const saisie = lecture.calques.find((calque) => calque.nom === 'UserInput');
  assert.ok(saisie);
  const portee = porteeDe(lecture, saisie.id);
  assert.equal(portee.size, 5);
  const lignes = lignesDe(lecture, indexer(lecture.releve), portee);
  assert.equal(lignes.length, 14);
  assert.ok(lignes.every((ligne) => ligne.genre === 'style' || ligne.nomCourt.startsWith('userinput/')));
  assert.deepEqual(frontieresDe(lecture, portee), [{ nom: 'Button', fois: 2, premiere: 'stresstest:19' }]);
  assert.equal(porteeDe(lecture, 'inconnu').size, 0);
});

/** Deux calques qui portent la même variable, le second sous un autre mode de la collection intermédiaire. */
function deuxModes(): LectureDeComposant {
  const c = constructeur('Deux modes');
  c.collection('composants', 'Composants', ['Valeur']);
  c.collection('ambiance', 'Ambiance', ['Jour', 'Nuit']);
  c.variable('fond', 'composants', 'carte/fond', 'COLOR', { Valeur: alias('surface') });
  c.variable('surface', 'ambiance', 'surface', 'COLOR', { Jour: couleur('#FFFFFF'), Nuit: couleur('#111111') });
  const calque = (id: string, parent: string | null, mode: string | null): CalqueDuComposant => ({ id, nom: id, type: 'FRAME', parent, modes: mode ? { ambiance: { mode: `ambiance:${mode}`, explicite: true } } : {} });
  return {
    sujet: { id: 'racine', nom: 'Carte', type: 'COMPONENT', variant: null, variants: [] },
    ancetres: [],
    calques: [calque('racine', null, null), calque('jour', 'racine', 'Jour'), calque('nuit', 'racine', 'Nuit'), calque('aussi-jour', 'racine', 'Jour')],
    liaisons: [
      { calque: 'jour', propriete: 'fills[0]', variable: 'fond', valeurDeFigma: couleur('#FFFFFF') },
      { calque: 'nuit', propriete: 'fills[0]', variable: 'fond', valeurDeFigma: couleur('#222222') },
      { calque: 'aussi-jour', propriete: 'strokes[0]', variable: 'fond' },
    ],
    styles: [],
    usagesDeStyle: [],
    directes: [],
    releve: c.releve(),
    calquesNonLus: 0,
    erreurs: [],
  };
}

test('la même variable sous deux modes donne deux lignes ; l’écart avec Figma garde la valeur de la chaîne', () => {
  const lecture = deuxModes();
  const lignes = lignesDuSujet(lecture);
  assert.deepEqual(lignes.map((ligne) => [ligne.valeur, ligne.calques, ligne.libelles, ligne.ecart === null]), [
    ['#FFFFFF', ['jour', 'aussi-jour'], ['fond', 'contour'], true],
    ['#111111', ['nuit'], ['fond'], false],
  ]);
  assert.deepEqual(modesNommes(indexer(lecture.releve), lignes), ['Jour', 'Nuit']);
  assert.deepEqual(lignes[1].ecart, couleur('#222222'));
});

test('le préfixe commun vient du premier segment le plus fréquent, et laisse un segment à chaque nom', () => {
  assert.equal(prefixeCommun(['alert/sizes/gap', 'alert/colors/info/background', 'icons/sizes/base']), 'alert/');
  assert.equal(prefixeCommun(['stresstest/info/base/gap', 'stresstest/info/head/gap', 'stresstest/info/head/gap']), 'stresstest/info/');
  assert.equal(prefixeCommun(['a/b', 'a/b/c']), 'a/');
  assert.equal(prefixeCommun(['button/bg', 'icons/sm']), '');
  assert.equal(prefixeCommun(['seul/nom']), '');
  assert.equal(prefixeCommun([]), '');
});

test('le résumé d’une section rend ses couleurs, puis ses styles ou ses valeurs distinctes triées', () => {
  const lecture = composantComplexe();
  const sections = sectionsDe(lignesDuSujet(lecture));
  const resume = (nature: string) => resumeDe(sections.find((section) => section.nature === nature) as (typeof sections)[number]);
  assert.equal(resume('couleur').couleurs.length, 18);
  assert.deepEqual(resume('couleur').textes, []);
  assert.deepEqual(resume('forme').textes, ['1', '2', '4', '6', '12', '24']);
  assert.deepEqual(resume('espacement').textes, ['4', '6', '10', '20', '48']);
  assert.deepEqual(resume('taille').textes, ['1', '20', '350', '600']);
  assert.deepEqual(resume('texte').textes, ['Title/Medium', 'Body/Medium', 'Label/Small', 'Body/Large', 'Body/Small']);
});

test('le filtre cherche dans le nom complet, la valeur et les libellés, sans casse', () => {
  const lignes = lignesDuSujet(composantComplexe());
  assert.equal(filtrer(lignes, 'RADIUS').length, 8);
  assert.deepEqual(filtrer(lignes, '#ea580c').map((ligne) => ligne.nomCourt), ['scalewrap/colors/scale-5']);
  assert.equal(filtrer(lignes, 'bordure', (libelle) => (libelle === 'contour' ? 'Bordure' : libelle)).length, 2);
  assert.equal(filtrer(lignes, '   ').length, 52);
  assert.equal(filtrer(lignes, 'introuvable-xyz').length, 0);
});

test('une chaîne interrompue garde ses étapes lues, sans valeur ni écart', () => {
  const lecture = composantInterrompu();
  const [bord, texte] = lignesDuSujet(lecture);
  assert.equal(bord.resultat?.etapes.length, 5);
  assert.equal(bord.valeur, '#C34261');
  assert.deepEqual(bord.libelles, ['contour']);
  assert.equal(texte.resultat?.statut, 'inaccessible');
  assert.equal(texte.resultat?.etapes.length, 2);
  assert.equal(texte.valeur, null);
  assert.equal(texte.type, 'COLOR');
  assert.deepEqual(modesNommes(indexer(lecture.releve), [bord, texte]), ['Light', 'Apicil']);
  assert.deepEqual(lecture.directes, [{ calque: 'tag:0', propriete: 'paddingLeft', valeur: '11' }]);
});

test('un composant sans token ne donne aucune ligne, et garde ses valeurs sans token', () => {
  const lecture = composantSansToken();
  assert.deepEqual(lignesDuSujet(lecture), []);
  assert.equal(lecture.directes.length, 3);
});

test('une chaîne à travers une collection à deux modes nomme le mode retenu', () => {
  const lecture = composantBouton();
  const lignes = lignesDuSujet(lecture);
  assert.equal(lignes.length, 8);
  assert.deepEqual(modesNommes(indexer(lecture.releve), lignes), ['intencial']);
});

test('l’écart avec Figma ne se dit que sur une chaîne résolue et une valeur terminale', () => {
  const lecture = deuxModes();
  const index = indexer(lecture.releve);
  const resolu = resoudre(index, 'fond', {});
  assert.equal(ecartAvecFigma(resolu, couleur('#FFFFFF')), false);
  assert.equal(ecartAvecFigma(resolu, couleur('#FFFFFE')), true);
  assert.equal(ecartAvecFigma(resolu, nombre(1)), true);
  assert.equal(ecartAvecFigma(resolu, undefined), false);
  assert.equal(ecartAvecFigma(resolu, alias('surface')), false);
  assert.equal(ecartAvecFigma(resoudre(index, 'absente', {}), couleur('#FFFFFF')), false);
});
