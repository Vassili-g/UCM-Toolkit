/** Le signe de chaque ligne de la colonne de gauche du mode Composant : usage d'une couleur, champ d'un nombre, style, titre. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { SIGNES } from '@ucm-kit/core/referentiel';

import { lignesDe, porteeDe, type LectureDeComposant, type LigneDeComposant } from '../src/composant';
import { indexer } from '../src/indexation';
import { signeDeLigne, signeDuTitre } from '../src/ui/composant/signes';
import { composantBouton, composantComplexe, composantSimple } from './fixtures';

const lignesDuSujet = (lecture: LectureDeComposant): LigneDeComposant[] => lignesDe(lecture, indexer(lecture.releve), porteeDe(lecture, lecture.calques[0].id));

const estCouleurResolue = (ligne: LigneDeComposant): boolean => ligne.resultat?.statut === 'resolu' && ligne.resultat.valeur.nature === 'couleur';

/** Le signe de la ligne qui porte ce nom court, la couleur résolue quand elle l'est. */
function signeDe(lecture: LectureDeComposant, nomCourt: string): string {
  const ligne = lignesDuSujet(lecture).find((candidate) => candidate.nomCourt === nomCourt);
  assert.ok(ligne, `ligne « ${nomCourt} » absente`);
  return signeDeLigne(lecture, ligne, estCouleurResolue(ligne)).id;
}

test('Alert : chaque ligne reçoit le signe de sa sorte', () => {
  const alert = composantSimple();
  const signes = Object.fromEntries(lignesDuSujet(alert).map((ligne) => [ligne.nomCourt, signeDe(alert, ligne.nomCourt)]));
  assert.deepEqual(signes, {
    'colors/info/standard/background': 'usage-fill',
    'colors/info/standard/foreground': 'usage-texte',
    'colors/info/standard/icon': 'usage-icone',
    'sizes/border-radius': 'radius',
    'sizes/gap': 'gap',
    'sizes/padding-x': 'padding-left',
    'sizes/padding-y': 'padding-top',
    'Body/Large': 'text-style',
    'Body/Small': 'text-style',
    'icons/sizes/base': 'taille-icone',
  });
});

test('tous les identifiants rendus existent dans le kit', () => {
  const connus = new Set(SIGNES.map((signe) => signe.id));
  for (const lecture of [composantSimple(), composantBouton(), composantComplexe()]) {
    for (const ligne of lignesDuSujet(lecture)) {
      assert.ok(connus.has(signeDeLigne(lecture, ligne, true).id), ligne.nomComplet);
      assert.ok(connus.has(signeDeLigne(lecture, ligne, false).id), ligne.nomComplet);
    }
  }
  for (const type of [undefined, 'FRAME', 'TEXT', 'INSTANCE', 'COMPONENT', 'COMPONENT_SET', 'GROUP', 'VECTOR', 'RECTANGLE']) {
    assert.ok(connus.has(signeDuTitre(false, type)), String(type));
  }
});

test('un padding lié sur les quatre côtés, sur left et right, sur top et bottom, ou sur un côté, rend son signe', () => {
  const alert = composantSimple();
  const variable = alert.liaisons.find((liaison) => liaison.propriete === 'paddingLeft')?.variable ?? '';
  const lier = (cotes: string[]): string => {
    const autres = alert.liaisons.filter((liaison) => !liaison.propriete.startsWith('padding'));
    const liees = cotes.map((cote) => ({ calque: alert.calques[0].id, propriete: cote, variable }));
    return signeDe({ ...alert, liaisons: [...autres, ...liees] }, 'sizes/padding-x');
  };
  assert.equal(lier(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']), 'padding');
  assert.equal(lier(['paddingLeft', 'paddingRight']), 'padding-x');
  assert.equal(lier(['paddingTop', 'paddingBottom']), 'padding-y');
  assert.equal(lier(['paddingBottom']), 'padding-bottom');
  assert.equal(lier(['paddingRight']), 'padding-right');
  assert.equal(lier(['paddingLeft', 'paddingTop']), 'padding');
});

test('une couleur qui ne se résout pas prend usage-inconnue ; un contour, un effet, un fond mêlé prennent leur usage', () => {
  const alert = composantSimple();
  const fond = lignesDuSujet(alert).find((ligne) => ligne.nomCourt === 'colors/info/standard/background');
  assert.ok(fond);
  assert.equal(signeDeLigne(alert, fond, false).id, 'usage-inconnue');
  assert.equal(signeDeLigne(alert, { ...fond, libelles: ['contour'] }, true).id, 'usage-stroke');
  assert.equal(signeDeLigne(alert, { ...fond, libelles: ['effet'] }, true).id, 'usage-effet');
  assert.equal(signeDeLigne(alert, { ...fond, libelles: ['fond', 'contour'] }, true).id, 'usage-fill');
});

test('le titre : component pour le sujet, le signe du type pour un layer', () => {
  assert.equal(signeDuTitre(true, 'FRAME'), 'component');
  assert.equal(signeDuTitre(false, 'FRAME'), 'frame');
  assert.equal(signeDuTitre(false, 'TEXT'), 'text');
  assert.equal(signeDuTitre(false, 'INSTANCE'), 'instance');
});
