/** Le relevé d'un jeu de variants : propriétés, layers, liaisons et porteurs, textes, instances, budget, annulation, lecture seule. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ouvrirLaMesure, fermerLaMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { liaisonsDuNoeud, liaisonsDuNoeudCooperatives } from '../src/consommateurs';
import { lireLeReleve } from '../src/releveDuComposant';
import { creerContexteCooperatif } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

test('90 petits variants partagent le budget et gardent le même relevé avec ou sans cessions', async () => {
  const a = atelierDeCalques();
  const variants = Array.from({ length: 90 }, (_, rang) => a.calque(`v-${rang}`, 'COMPONENT', { absoluteBoundingBox: boite(0, 0, 10, 10) }));
  const jeu = a.calque('jeu', 'COMPONENT_SET', {}, variants);
  const { port } = portDeTest([], []);
  const reference = await lireLeReleve(a.port(port), jeu, { cooperation: creerContexteCooperatif({ horloge: () => 0 }) });
  let horloge = 0;
  let faits = 0;
  const cessions: number[] = [];
  const courant = await lireLeReleve(a.port(port), jeu, {
    progresser: (fait) => { faits = fait; },
    cooperation: creerContexteCooperatif({
      horloge: () => horloge++, budgetDeCalculMs: 25,
      respirer: async () => { cessions.push(faits); },
    }),
  });
  assert.ok(cessions.length > 0);
  assert.equal(cessions[0], 0);
  assert.ok(cessions.some((fait) => fait > 0 && fait < 90), JSON.stringify(cessions));
  assert.deepEqual(courant, reference);
});

test('une annulation pendant le parcours profond arrête avant de lire les layers', async () => {
  const a = atelierDeCalques();
  let visites = 0;
  let dimensionsLues = 0;
  let racine = a.calque('feuille', 'FRAME', { get absoluteBoundingBox() { dimensionsLues += 1; return boite(0, 0, 1, 1); } });
  for (let rang = 0; rang < 1500; rang += 1) {
    const enfant = racine;
    racine = a.calque(`niveau-${rang}`, rang === 1499 ? 'COMPONENT' : 'FRAME', {
      get children() { visites += 1; return [enfant]; },
    }, [enfant]);
  }
  const { port } = portDeTest([], []);
  const jeton = { leve: false };
  let horloge = 0;
  const issue = await lireLeReleve(a.port(port), racine, {
    jeton,
    cooperation: creerContexteCooperatif({
      jeton, horloge: () => horloge++, budgetDeCalculMs: 25,
      respirer: async () => { jeton.leve = true; },
    }),
  });
  assert.deepEqual(issue, { statut: 'annule' });
  assert.ok(visites > 0 && visites < 1500, `${visites} visites`);
  assert.equal(dimensionsLues, 0);
});

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

test('un gap Auto garde son itemSpacing sans effet : le relevé n’en fait pas une valeur en dur', async () => {
  const a = atelierDeCalques();
  const rangee = (id: string, champs: Record<string, unknown>) => a.calque(id, 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10), layoutMode: 'HORIZONTAL', itemSpacing: 10, ...champs });
  const auto = rangee('auto', { primaryAxisAlignItems: 'SPACE_BETWEEN' });
  const fixe = rangee('fixe', { primaryAxisAlignItems: 'MIN' });
  const grille = a.calque('grille', 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10), layoutMode: 'GRID', itemSpacing: 10 });
  const variant = a.calque('v', 'COMPONENT', { name: 'Etat=Repos', absoluteBoundingBox: boite(0, 0, 40, 10) }, [auto, fixe, grille]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Alert', key: 'cle', defaultVariant: variant, componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos'] } } }, [variant]);
  const issue = await lireLeReleve(a.port(variables().port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const avecGap = issue.releve.variants[0].layers.filter((layer) => layer.valeursEnDur.some((valeur) => valeur.champ === 'itemSpacing')).map((layer) => layer.id);
  assert.deepEqual(avecGap, ['fixe']);
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

test('un identifiant refusé à la première acquisition est relu à la suivante', async () => {
  const a = atelierDeCalques();
  const fond = a.calque('fond', 'RECTANGLE', {
    absoluteBoundingBox: boite(0, 0, 10, 10),
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('fond') } }],
  });
  const variant = a.calque('v', 'COMPONENT', { name: 'Etat=Repos', absoluteBoundingBox: boite(0, 0, 10, 10) }, [fond]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Alert', key: 'cle-jeu', defaultVariant: variant,
    componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos'] } },
  }, [variant]);
  const lectureRefusee = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['fond'])],
    [variableFigma('fond', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': { r: 1, g: 0, b: 0, a: 1 } })],
    [], [], { refusees: new Set(['fond']) },
  );
  const premiere = await lireLeReleve(a.port(lectureRefusee.port), jeu);
  assert.equal(premiere.statut, 'lu');
  if (premiere.statut !== 'lu') return;
  assert.ok(premiere.releve.lecture.manquees.some(({ layer, motif }) => layer === 'fond' && motif === 'Accès refusé à la bibliothèque'));

  const lectureRetablie = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['fond'])],
    [variableFigma('fond', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': { r: 1, g: 0, b: 0, a: 1 } })],
  );
  const seconde = await lireLeReleve(a.port(lectureRetablie.port), jeu);
  assert.equal(seconde.statut, 'lu');
  if (seconde.statut !== 'lu') return;
  assert.deepEqual(seconde.releve.lecture.manquees, []);
  assert.equal(seconde.releve.variants[0].layers.find(({ id }) => id === 'fond')?.liaisons[0].variable.cle, 'cle-fond');
  assert.equal(lectureRefusee.appels.get('fond'), 1);
  assert.equal(lectureRetablie.appels.get('fond'), 1);
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

test('la mesure du relevé compte ses propriétés et ses pauses existantes sans changer les faits', async () => {
  const a = atelierDeCalques();
  const enfants = Array.from({ length: 401 }, (_, rang) => a.calque(`n${rang}`, 'FRAME', { absoluteBoundingBox: boite(0, 0, 1, 1) }));
  const racine = a.calque('racine', 'COMPONENT', { absoluteBoundingBox: boite(0, 0, 1, 1) }, enfants);
  const port = a.port(variables().port);
  const reference = await lireLeReleve(port, racine);
  let horloge = 0;
  ouvrirLaMesure();
  const courant = await lireLeReleve(port, racine, {
    cooperation: creerContexteCooperatif({ horloge: () => horloge += 25, budgetDeCalculMs: 25, respirer: () => port.pause() }),
  });
  const trace = fermerLaMesure('');
  assert.deepEqual(courant, reference);
  assert.ok((trace?.compteurs.proprietesDuReleve ?? 0) > 401);
  assert.ok((trace?.compteurs.cessionsArchitect ?? 0) > 401);
});

for (const source of ['variantProperties', 'nom'] as const) {
  test(`les valeurs de variant gardent les clés propres et les doublons depuis ${source}`, async () => {
    const a = atelierDeCalques();
    const paires = [['__proto__', 'premier'], ['constructor', 'constructeur'], ['Etat', 'Repos'], ['__proto__', 'dernier']];
    const variant = a.calque('v', 'COMPONENT', {
      absoluteBoundingBox: boite(0, 0, 10, 10),
      name: paires.map(([nom, valeur]) => `${nom}=${valeur}`).join(', '),
      ...(source === 'variantProperties' ? { variantProperties: Object.fromEntries(paires) } : {}),
    });
    const jeu = a.calque('jeu', 'COMPONENT_SET', {}, [variant]);
    const issue = await lireLeReleve(a.port(portDeTest([], []).port), jeu);
    assert.equal(issue.statut, 'lu');
    if (issue.statut !== 'lu') return;
    assert.deepEqual(issue.releve.variants[0].valeurs, Object.fromEntries(paires));
    assert.equal(Object.getPrototypeOf(issue.releve.variants[0].valeurs), Object.prototype);
    assert.deepEqual(Object.getOwnPropertyDescriptor(issue.releve.variants[0].valeurs, '__proto__'), {
      value: 'dernier', enumerable: true, configurable: true, writable: true,
    });
  });
}

for (const nombre of [128, 256]) for (const passe of ['fills', 'strokes', 'champs surchargés', 'peintures de plage', 'valeurs de variant', 'propriétés', 'options', 'modes de collection', 'styles de plages', 'enfants du jeu', 'enfants du variant'] as const) {
  test(`le relevé cède et s'annule pendant la passe ${passe} sur ${nombre} entrées sans changer sa sortie`, async () => {
    const a = atelierDeCalques();
    let travail = 0;
    const valeur = (rang: number) => ({ toString() { travail += 1; return String(rang); } });
    const peintures = Array.from({ length: nombre }, () => ({
      get type() { travail += 1; return 'SOLID'; }, color: { r: 0, g: 0, b: 0 }, visible: false,
    }));
    const champs: Record<string, unknown> = { absoluteBoundingBox: boite(0, 0, 10, 10) };
    if (passe === 'champs surchargés') {
      const surcharges: string[] = new Array(nombre);
      for (let rang = 0; rang < nombre; rang += 1) Object.defineProperty(surcharges, rang, { get() { travail += 1; return 'fills'; } });
      champs.overrides = [{ id: 'contenu', overriddenFields: surcharges }];
    }
    const definitions: Record<string, unknown> = {};
    let collections = [] as ReturnType<typeof collectionFigma>[];
    if (passe === 'fills' || passe === 'strokes') champs[passe] = peintures;
    if (passe === 'valeurs de variant') {
      const propres = {};
      for (let rang = 0; rang < nombre; rang += 1) Object.defineProperty(propres, `Axe${rang}`, { enumerable: true, get() { travail += 1; return String(rang); } });
      champs.variantProperties = propres;
    }
    if (passe === 'propriétés') for (let rang = 0; rang < nombre; rang += 1) Object.defineProperty(definitions, `Axe${rang}`, { enumerable: true, get() { travail += 1; return { type: 'TEXT', defaultValue: String(rang) }; } });
    if (passe === 'options') definitions.Etat = { type: 'VARIANT', defaultValue: '0', variantOptions: Array.from({ length: nombre }, (_, rang) => valeur(rang)) };
    if (passe === 'modes de collection') {
      champs.resolvedVariableModes = { c: 'm0' };
      collections = [{ ...collectionFigma('c', 'Composants', ['Repos'], []), modes: Array.from({ length: nombre }, (_, rang) => ({ modeId: `m${rang}`, get name() { travail += 1; return `Mode${rang}`; } })) }];
    }
    const texte = passe === 'peintures de plage' || passe === 'styles de plages';
    if (texte) champs.getStyledTextSegments = (demandes: string[]) => {
      if (!demandes.includes('fontSize')) return [];
      if (passe === 'peintures de plage') return [{ start: 0, end: 1, fills: peintures }];
      return Array.from({ length: nombre }, (_, rang) => ({ start: rang, end: rang + 1, get textStyleId() { travail += 1; return ''; } }));
    };
    const enfant = a.calque('contenu', texte ? 'TEXT' : passe === 'champs surchargés' ? 'INSTANCE' : 'FRAME', champs);
    const variant = a.calque('v', 'COMPONENT', passe === 'valeurs de variant' || passe === 'modes de collection' ? champs : { absoluteBoundingBox: boite(0, 0, 10, 10) }, passe === 'valeurs de variant' ? [] : passe === 'enfants du variant' ? Array.from({ length: nombre }, (_, rang) => a.calque(`frere-${rang}`, 'FRAME', { absoluteBoundingBox: boite(0, 0, 1, 1), get children() { travail += 1; return []; } })) : [enfant]);
    const enfants = passe === 'enfants du jeu' ? Array.from({ length: nombre }, (_, rang) => a.calque(`ignore-${rang}`, 'FRAME', { get type() { travail += 1; return 'FRAME'; } })).concat([variant]) : [variant];
    const jeu = a.calque('jeu', 'COMPONENT_SET', { componentPropertyDefinitions: definitions }, enfants);
    const port = a.port(portDeTest(collections, []).port);
    const reference = await lireLeReleve(port, jeu, { cooperation: creerContexteCooperatif({ horloge: () => 0 }) });
    assert.equal(reference.statut, 'lu');
    const total = travail;
    assert.ok(total >= nombre, `${passe}: ${total}`);
    travail = 0;
    let precedent = 0;
    const cessions: number[] = [];
    const courant = await lireLeReleve(port, jeu, {
      cooperation: creerContexteCooperatif({ horloge: () => travail, budgetDeCalculMs: 25, respirer: async () => {
        cessions.push(travail);
        assert.ok(travail - precedent <= 26, `${passe}: ${travail - precedent} lectures entre cessions`);
        precedent = travail;
      } }),
    });
    assert.ok(cessions.length > 0);
    assert.ok(cessions[0] < total);
    assert.deepEqual(courant, reference);
    travail = 0;
    const jeton = { leve: false };
    const issue = await lireLeReleve(port, jeu, {
      cooperation: creerContexteCooperatif({ jeton, horloge: () => travail, budgetDeCalculMs: 25, respirer: async () => { jeton.leve = true; } }),
    });
    assert.deepEqual(issue, { statut: 'annule' });
    assert.ok(travail >= 25 && travail <= 26 && travail < total, `${passe}: ${travail}/${total}`);
  });
}

for (const nombre of [128, 256]) test(`les valeurs tirées du nom cèdent pendant leur découpage sur ${nombre} entrées`, async () => {
  const a = atelierDeCalques();
  let dansLesValeurs = false;
  const paires = Array.from({ length: nombre }, (_, rang) => [`Axe${rang}`, String(rang)]);
  const variant = a.calque('v', 'COMPONENT', {
    absoluteBoundingBox: boite(0, 0, 10, 10),
    name: paires.map(([nom, valeur]) => `${nom}=${valeur}`).join(', '),
    get variantProperties() { dansLesValeurs = true; return undefined; },
  });
  const jeu = a.calque('jeu', 'COMPONENT_SET', {}, [variant]);
  const port = a.port(portDeTest([], []).port);
  const reference = await lireLeReleve(port, jeu, { cooperation: creerContexteCooperatif({ horloge: () => 0 }) });
  assert.equal(reference.statut, 'lu');
  if (reference.statut !== 'lu') return;
  assert.deepEqual(reference.releve.variants[0].valeurs, Object.fromEntries(paires));
  dansLesValeurs = false;
  let horloge = 0;
  const jeton = { leve: false };
  const issue = await lireLeReleve(port, jeu, {
    cooperation: creerContexteCooperatif({ jeton, horloge: () => dansLesValeurs ? horloge++ : 0, budgetDeCalculMs: 25, respirer: async () => { jeton.leve = true; } }),
  });
  assert.deepEqual(issue, { statut: 'annule' });
  assert.equal(horloge, 26);
});

for (const nombre of [128, 256]) for (const passe of ['alias', 'arrêts', 'effets', 'grilles', 'plages'] as const) {
  test(`les liaisons gardent leur ordre et cèdent pendant les ${passe} sur ${nombre} entrées`, async () => {
    let travail = 0;
    const lie = () => ({ get boundVariables() { travail += 1; return { color: alias('fond') }; } });
    // Un arrêt de dégradé de Figma porte toujours sa couleur ; la copie des peintures refuse un arrêt qui n'en a pas.
    const arret = () => Object.defineProperty({ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } }, 'boundVariables', { enumerable: true, get() { travail += 1; return { color: alias('fond') }; } });
    const champs: Record<string, unknown> = {};
    if (passe === 'alias') champs.boundVariables = { componentProperties: Object.fromEntries(Array.from({ length: nombre }, (_, rang) => [String(rang), { get type() { travail += 1; return 'VARIABLE_ALIAS'; }, id: `v${rang}` }])) };
    if (passe === 'arrêts') champs.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: Array.from({ length: nombre }, arret) }];
    if (passe === 'effets') champs.effects = Array.from({ length: nombre }, lie);
    if (passe === 'grilles') champs.layoutGrids = Array.from({ length: nombre }, lie);
    if (passe === 'plages') champs.getStyledTextSegments = () => Array.from({ length: nombre }, (_, rang) => ({ start: rang, end: rang + 1, boundVariables: { color: alias('fond') }, get fills() { travail += 1; return []; } }));
    const a = atelierDeCalques();
    const noeud = a.calque('contenu', passe === 'plages' ? 'TEXT' : 'FRAME', champs);
    const reference = liaisonsDuNoeud(noeud);
    travail = 0;
    const cessions: number[] = [];
    const courant = await liaisonsDuNoeudCooperatives(noeud, creerContexteCooperatif({ horloge: () => travail, budgetDeCalculMs: 25, respirer: async () => { cessions.push(travail); } }));
    assert.deepEqual(courant, reference);
    assert.equal(courant.length, nombre);
    assert.ok(cessions.length > 0 && cessions[0] < nombre, `${passe}: ${cessions}`);
    travail = 0;
    const jeton = { leve: false };
    const variant = a.calque('v', 'COMPONENT', { absoluteBoundingBox: boite(0, 0, 10, 10) }, [noeud]);
    const issue = await lireLeReleve(a.port(variables().port), variant, {
      cooperation: creerContexteCooperatif({ jeton, horloge: () => travail, budgetDeCalculMs: 25, respirer: async () => { jeton.leve = true; } }),
    });
    assert.deepEqual(issue, { statut: 'annule' });
    assert.ok(travail >= 25 && travail < nombre, `${passe}: ${travail}`);
  });
}
