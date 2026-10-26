/** Le relevé d'un jeu de variants : propriétés, layers, liaisons et porteurs, textes, instances, budget, annulation, lecture seule. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

function variables() {
  return portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['fond', 'taille'])],
    [variableFigma('fond', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': { r: 1, g: 0, b: 0, a: 1 } }), variableFigma('taille', 'c', 'texte/taille', 'FLOAT', { 'c:Valeur': 14 })],
  );
}

/** Six variants `Taille × Etat` de trois layers : racine à fond dégradé, texte à deux plages, instance surchargée. */
function jeuFactice() {
  const a = atelierDeCalques();
  const variants = ['S', 'M', 'L'].flatMap((taille) =>
    ['Repos', 'Survol'].map((etat) => {
      const cle = `${taille}${etat}`;
      const interne = a.calque(`interne-${cle}`, 'RECTANGLE', { fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('fond') } }] });
      const instance = a.calque(
        `inst-${cle}`,
        'INSTANCE',
        {
          name: 'Icone',
          absoluteBoundingBox: boite(0, 0, 16, 16),
          overrides: [{ id: `interne-${cle}`, overriddenFields: ['fills'] }],
          componentPropertyReferences: { mainComponent: 'Icone#1:0' },
          getMainComponentAsync: async () => ({ id: 'maitre', name: 'Icone', type: 'COMPONENT', key: 'cle-icone', remote: true, parent: null }),
        },
        [interne],
      );
      const texte = a.calque(`texte-${cle}`, 'TEXT', {
        absoluteBoundingBox: boite(4, 4, 40, 12),
        textStyleId: '',
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
        getStyledTextSegments: () => [
          { start: 0, end: 3, fontSize: 14, fontWeight: 400, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], boundVariables: { fontSize: alias('taille') }, textStyleId: '' },
          { start: 3, end: 6, fontSize: 16, fontWeight: 700, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], boundVariables: {}, textStyleId: '' },
        ],
      });
      return a.calque(`v-${cle}`, 'COMPONENT', {
        name: `Taille=${taille}, Etat=${etat}`,
        absoluteBoundingBox: boite(0, 0, 120, 40),
        opacity: 0.5,
        layoutMode: 'HORIZONTAL',
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
        itemSpacing: 6,
        cornerRadius: 4,
        resolvedVariableModes: { c: 'c:Valeur' },
        fills: [{ type: 'GRADIENT_LINEAR', opacity: 0.8, blendMode: 'MULTIPLY', gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } }] }],
        boundVariables: { paddingLeft: alias('taille') },
      }, [texte, instance]);
    }),
  );
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Button',
    key: 'cle-jeu',
    defaultVariant: variants[0],
    componentPropertyDefinitions: {
      Taille: { type: 'VARIANT', defaultValue: 'S', variantOptions: ['S', 'M', 'L'] },
      Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol'] },
      'Avec icone#1:2': { type: 'BOOLEAN', defaultValue: true },
    },
  }, variants);
  return { a, jeu, variants };
}

test('le relevé lit tous les variants, les propriétés et les faits de chaque layer', async () => {
  const { a, jeu } = jeuFactice();
  const { port } = variables();
  const issue = await lireLeReleve(a.port(port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const { releve } = issue;

  assert.deepEqual(releve.jeu, { cle: 'cle-jeu', id: 'jeu', nom: 'Button' });
  assert.equal(releve.espaceDeCouleur, 'srgb');
  assert.deepEqual(releve.proprietes.map((p) => [p.nom, p.type, p.valeurs, p.defaut]), [
    ['Taille', 'VARIANT', ['S', 'M', 'L'], 'S'],
    ['Etat', 'VARIANT', ['Repos', 'Survol'], 'Repos'],
    ['Avec icone#1:2', 'BOOLEAN', undefined, true],
  ]);
  assert.equal(releve.variants.length, 6);
  assert.deepEqual(releve.variants[3].valeurs, { Taille: 'M', Etat: 'Survol' });
  assert.deepEqual(releve.lecture, { layersLus: 18, layersNonLus: 0, variantsNonLus: [], manquees: [] });
  assert.deepEqual(releve.variants[0].modesEffectifs, { Composants: 'Valeur' });

  const [racine, texte, instance] = releve.variants[0].layers;
  assert.deepEqual([racine.parent, texte.parent, instance.parent], [null, 'v-SRepos', 'v-SRepos']);
  assert.equal(racine.opacite, 0.5);
  assert.deepEqual(racine.dimensions, { x: 0, y: 0, largeur: 120, hauteur: 40 });
  assert.deepEqual(racine.peintures, [{ champ: 'fills', indice: 0, type: 'GRADIENT_LINEAR', visible: true, opacite: 0.8, blendMode: 'MULTIPLY' }]);
  assert.deepEqual(racine.liaisons.map((l) => [l.champ, l.porteur, l.variable.cle, l.variable.nom, l.variable.collection, l.variable.distante]), [['paddingLeft', 'v-SRepos', 'cle-taille', 'texte/taille', 'Composants', false]]);
  assert.deepEqual(racine.valeursEnDur.map((v) => v.champ), ['paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'cornerRadius', 'width', 'height']);

  assert.deepEqual(texte.peintures, [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0, g: 0, b: 0, a: 1 } }]);
  assert.deepEqual(texte.texte?.plages.map((p) => [p.debut, p.fin, p.fontSize, p.fontWeight, p.liaisons.length, p.peintures[0].couleur?.r]), [[0, 3, 14, 400, 1, 1], [3, 6, 16, 700, 0, 1]]);
  assert.deepEqual(texte.texte?.plages[0].liaisons[0], { champ: 'fontSize', plage: { debut: 0, fin: 3 }, porteur: 'texte-SRepos', variable: texte.liaisons[0].variable });
  assert.equal(texte.texte?.style, null);

  assert.deepEqual(instance.instanceDe, { cle: 'cle-icone', nom: 'Icone', distante: true, pilotee: 'Icone#1:0' });
  assert.deepEqual(instance.liaisons.map((l) => [l.champ, l.indice, l.porteur, l.variable.nom]), [['fills', 0, 'inst-SRepos', 'carte/fond']]);
});

test('l’épaisseur d’un layer sans contour visible n’est pas une valeur en dur', async () => {
  const a = atelierDeCalques();
  const contour = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
  const sansContour = a.calque('sans', 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10), strokes: [], strokeWeight: 1 });
  const masque = a.calque('masque', 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10), strokes: [{ ...contour, visible: false }], strokeWeight: 1 });
  const visible = a.calque('visible', 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10), strokes: [contour], strokeWeight: 1 });
  const lie = a.calque('lie', 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10), strokes: [contour], strokeWeight: 1, boundVariables: { strokeTopWeight: alias('taille') } });
  const variant = a.calque('v', 'COMPONENT', { name: 'Etat=Repos', absoluteBoundingBox: boite(0, 0, 40, 10), strokes: [], strokeWeight: 1 }, [sansContour, masque, visible, lie]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Alert', key: 'cle', defaultVariant: variant, componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos'] } } }, [variant]);
  const issue = await lireLeReleve(a.port(variables().port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const epaisseurs = issue.releve.variants[0].layers.filter((layer) => layer.valeursEnDur.some((valeur) => valeur.champ === 'strokeWeight')).map((layer) => layer.id);
  assert.deepEqual(epaisseurs, ['visible']);
});

test('un budget qui coupe au quatrième variant compte les layers non lus', async () => {
  const { a, jeu } = jeuFactice();
  const { port } = variables();
  const issue = await lireLeReleve(a.port(port), jeu, { budgetDeLayers: 10 });
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.equal(issue.releve.variants.length, 3);
  assert.deepEqual(issue.releve.lecture, {
    layersLus: 9,
    layersNonLus: 9,
    variantsNonLus: ['Taille=M, Etat=Survol', 'Taille=L, Etat=Repos', 'Taille=L, Etat=Survol'],
    manquees: [],
  });
});

test('deux acquisitions indépendantes gardent les textes à plages et instances surchargées', async () => {
  const { a, jeu } = jeuFactice();
  const premierPort = variables();
  const premier = await lireLeReleve(a.port(premierPort.port), jeu);
  const secondPort = variables();
  const second = await lireLeReleve(a.port(secondPort.port), jeu);
  assert.deepEqual(second, premier);
});

test('retirer puis ajouter un variant change le préfixe admis par le budget', async () => {
  const { a, jeu, variants } = jeuFactice();
  const avant = await lireLeReleve(a.port(variables().port), jeu, { budgetDeLayers: 1 });
  assert.equal(avant.statut, 'lu');
  if (avant.statut !== 'lu') return;
  assert.deepEqual(avant.releve.variants.map(({ id }) => id), [variants[0].id]);
  assert.equal(avant.releve.lecture.variantsNonLus.length, 5);

  const varianteAjoutee = a.calque('v-ajoute', 'COMPONENT', {
    name: 'Taille=XL, Etat=Repos', absoluteBoundingBox: boite(0, 0, 120, 40),
  });
  const setModifie = a.calque('jeu-modifie', 'COMPONENT_SET', {
    name: 'Button', key: 'cle-jeu', defaultVariant: variants[0],
    componentPropertyDefinitions: { Taille: { type: 'VARIANT', defaultValue: 'S', variantOptions: ['S', 'XL'] } },
  }, [variants[0], varianteAjoutee]);
  const modifie = await lireLeReleve(a.port(variables().port), setModifie, { budgetDeLayers: 1 });
  assert.equal(modifie.statut, 'lu');
  if (modifie.statut !== 'lu') return;
  assert.deepEqual(modifie.releve.variants.map(({ id }) => id), [variants[0].id]);
  assert.deepEqual(modifie.releve.lecture.variantsNonLus, ['Taille=XL, Etat=Repos']);
  assert.equal(modifie.releve.lecture.layersLus, avant.releve.lecture.layersLus);
  assert.ok(modifie.releve.lecture.layersNonLus < avant.releve.lecture.layersNonLus);
});

test('un budget plus petit que le premier variant le lit quand même', async () => {
  const { a, jeu } = jeuFactice();
  const { port } = variables();
  const issue = await lireLeReleve(a.port(port), jeu, { budgetDeLayers: 1 });
  assert.equal(issue.statut === 'lu' && issue.releve.variants.length, 1);
});

test('un jeton levé rend « annulé » ; une variable illisible est une lecture manquée et reste une liaison illisible', async () => {
  const { a, jeu } = jeuFactice();
  const { port } = variables();
  assert.deepEqual(await lireLeReleve(a.port(port), jeu, { jeton: { leve: true } }), { statut: 'annule' });

  const { port: vide } = portDeTest([], []);
  const issue = await lireLeReleve(a.port(vide), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut === 'lu') {
    assert.ok(issue.releve.lecture.manquees.length > 0);
    assert.ok(issue.releve.lecture.manquees.every((m) => m.motif === 'variable illisible'));
    const liaisons = issue.releve.variants[0].layers[0].liaisons;
    assert.ok(liaisons.length > 0);
    assert.ok(liaisons.every((liaison) => liaison.illisible === true && liaison.variable.cle === ''));
  }
});

test('un calque hors de tout composant n’a pas de relevé, et la lecture n’écrit rien', async () => {
  const { a, variants } = jeuFactice();
  const libre = a.calque('libre', 'FRAME');
  const { port } = variables();
  assert.deepEqual(await lireLeReleve(a.port(port), libre), { statut: 'sans-sujet' });
  const depuisUnVariant = await lireLeReleve(a.port(port), variants[2]);
  assert.equal(depuisUnVariant.statut === 'lu' && depuisUnVariant.releve.variants.length, 6);
  assert.ok(a.journal.every((appel) => ['getStyledTextSegments', 'getMainComponentAsync', 'pause', 'getNodeByIdAsync', 'getStyleByIdAsync'].includes(appel)));
});
