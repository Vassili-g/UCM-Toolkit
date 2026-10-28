/**
 * Les champs que chaque lecteur d'Architect lit sur un même jeu de calques, dans l'ordre de première lecture, et la
 * sortie qu'il en tire : le relevé de l'analyse, la lecture de la vue Composant, les fonctions de `consommateurs.ts` et
 * la surveillance de péremption. Ce fichier est l'oracle des cases du lot 6 qui déplacent l'acquisition : une lecture
 * qui change de champ, d'ordre ou de refus le fait échouer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { LayerLu, ReleveDeComposant } from '@ucm-kit/core/controles';

import { liaisonsDuNoeud, liaisonsDuStyle, modesDuNoeud, type NoeudLu } from '../src/consommateurs';
import { lireLeComposant } from '../src/lectureDuComposant';
import { lireLeReleve } from '../src/releveDuComposant';
import { surChangementDuDocument, traiter, analyseCourante, couvertureDeLAnalyse, reinitialiserLAnalyse } from '../src/sandbox/analyse';
import type { LectureDeComposant } from '../src/composant';
import type { PluginMessage } from '../src/messages';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import type { Contexte } from '../src/sandbox/contexte';
import { espionDeChamps } from './accesDesChamps';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const noir = { r: 0, g: 0, b: 0, a: 1 };

/**
 * Un jeu `Button` de deux variants. Le premier porte une mise en page, un fond lié, un contour libre, un texte à deux
 * plages sous style, une instance dont le maître est distant et une surcharge liée, un calque masqué. Le second porte un
 * texte sans style et un cadre vide.
 */
function jeuObserve() {
  const a = atelierDeCalques();
  const e = espionDeChamps();
  const calque = (id: string, type: string, champs: Record<string, unknown> = {}, enfants: readonly NoeudLu[] = []) => e.declarer(a.calque(id, type, champs, enfants));
  const style = e.declarerUnStyle(a.styleDeTexte('ts', 'Corps', { fontSize: alias('taille') }));

  const interne = calque('interne', 'RECTANGLE', { fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }] });
  const maitre = calque('maitre', 'COMPONENT', { name: 'Taille=M', key: 'cle-maitre', remote: true });
  calque('jeu-icone', 'COMPONENT_SET', { name: 'Icone', key: 'cle-icone', remote: true }, [maitre]);
  const instance = calque('instance', 'INSTANCE', {
    name: 'Icone',
    absoluteBoundingBox: boite(0, 0, 16, 16),
    overrides: [{ id: 'interne', overriddenFields: ['fills'] }],
    componentPropertyReferences: { mainComponent: 'Icone#1:0' },
    getMainComponentAsync: async () => maitre,
  }, [interne]);
  const texte = calque('texte', 'TEXT', {
    absoluteBoundingBox: boite(4, 4, 40, 12),
    characters: 'Valider',
    fontSize: 14,
    textStyleId: 'ts',
    fills: [{ type: 'SOLID', color: noir }],
    strokes: [],
    getStyledTextSegments: (champs: string[]) => [
      { start: 0, end: 3, fontSize: 14, fontWeight: 400, fills: [{ type: 'SOLID', color: noir }], boundVariables: { fontSize: alias('taille') }, textStyleId: 'ts' },
      { start: 3, end: 7, fontSize: 16, fontWeight: 700, fills: [{ type: 'SOLID', color: noir }], boundVariables: {}, textStyleId: 'ts' },
    ].map((segment) => Object.fromEntries(['start', 'end', ...champs].map((champ) => [champ, (segment as Record<string, unknown>)[champ]]))),
  });
  const soustitre = calque('sous-titre', 'TEXT', { absoluteBoundingBox: boite(4, 20, 40, 10), characters: 'Aide', fontSize: 12, textStyleId: '', fills: [], getStyledTextSegments: () => [] });
  const masque = calque('masque', 'FRAME', { visible: false, absoluteBoundingBox: boite(0, 0, 4, 4) });
  const repos = calque('repos', 'COMPONENT', {
    name: 'Etat=Repos',
    absoluteBoundingBox: boite(0, 0, 120, 40),
    opacity: 0.5,
    layoutMode: 'HORIZONTAL',
    paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, itemSpacing: 6,
    cornerRadius: 4,
    strokeWeight: 1,
    strokes: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }],
    resolvedVariableModes: { c: 'c:Valeur' },
    explicitVariableModes: { c: 'c:Valeur' },
    variantProperties: { Etat: 'Repos' },
    boundVariables: { paddingLeft: alias('taille') },
  }, [texte, soustitre, instance, masque]);
  const survol = calque('survol', 'COMPONENT', { name: 'Etat=Survol', absoluteBoundingBox: boite(0, 0, 120, 40), variantProperties: { Etat: 'Survol' } }, [
    calque('texte-survol', 'TEXT', { absoluteBoundingBox: boite(0, 0, 10, 10), textStyleId: '', fontSize: 12, getStyledTextSegments: () => [] }),
    calque('cadre', 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10) }),
  ]);
  const jeu = calque('jeu', 'COMPONENT_SET', {
    name: 'Button',
    key: 'cle-jeu',
    defaultVariant: repos,
    componentPropertyDefinitions: {
      Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol'] },
      'Avec icone#1:2': { type: 'BOOLEAN', defaultValue: true },
    },
    findAll: () => [repos, texte, soustitre, instance, interne, masque, survol, ...survol.children ?? []],
  }, [repos, survol]);

  const variables = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['fond', 'taille'])],
    [variableFigma('fond', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': { r: 1, g: 0, b: 0, a: 1 } }), variableFigma('taille', 'c', 'texte/taille', 'FLOAT', { 'c:Valeur': 14 })],
  );
  const base = a.port(variables.port);
  const port = {
    selection: () => [],
    getNodeByIdAsync: async (id: string) => {
      const trouve = await base.getNodeByIdAsync(id);
      return trouve ? e.espion(trouve) : null;
    },
    getStyleByIdAsync: async (id: string) => {
      const trouve = await base.getStyleByIdAsync(id);
      return trouve ? e.espion(trouve) : null;
    },
    variables: base.variables,
    pause: base.pause,
  };
  return { a, e, jeu, repos, texte, instance, style, port, appels: variables.appels };
}

/** Un layer en une ligne : de quoi fixer ce que le relevé en tire sans recopier l'objet entier. */
function ligneDeLayer(layer: LayerLu): string {
  const d = layer.dimensions;
  return [
    layer.id, layer.type, layer.parent ?? '-', layer.visible ? 'visible' : 'masque', `opacite ${layer.opacite}`, `${d.x},${d.y} ${d.largeur}x${d.hauteur}`,
    `peintures [${layer.peintures.map((p) => `${p.champ}${p.indice}:${p.type}${p.couleur ? `#${p.couleur.r}${p.couleur.g}${p.couleur.b}` : ''}`).join(' ')}]`,
    `liaisons [${layer.liaisons.map((l) => `${l.champ}${l.indice ?? ''}${l.plage ? `@${l.plage.debut}-${l.plage.fin}` : ''}=${l.variable.nom || l.variable.id}${l.illisible ? '!' : ''}${l.surcharge ? `~${l.surcharge.id}` : ''}`).join(' ')}]`,
    `enDur [${layer.valeursEnDur.map((v) => `${v.champ}=${v.valeur}`).join(' ')}]`,
    layer.strokeWeight === undefined ? 'sans epaisseur' : `epaisseur ${layer.strokeWeight}`,
    layer.texte ? `texte ${layer.texte.style ?? '-'} [${layer.texte.plages.map((p) => `${p.debut}-${p.fin}:${p.fontSize}/${p.fontWeight}/${p.peintures.length}p/${p.liaisons.length}l`).join(' ')}]` : 'pas de texte',
    layer.instanceDe ? `instanceDe ${layer.instanceDe.nom}:${layer.instanceDe.cle}:${layer.instanceDe.distante}:${layer.instanceDe.pilotee}` : 'pas d’instanceDe',
  ].join(' | ');
}

test('le relevé lit ces champs dans cet ordre et en tire ces layers', async () => {
  const { e, jeu, port, appels } = jeuObserve();
  const issue = await lireLeReleve(port, e.espion(jeu));
  assert.equal(issue.statut, 'lu');
  const releve = (issue as { releve: ReleveDeComposant }).releve;

  assert.deepEqual(e.releverEtVider(), {
    COMPONENT_SET: ['type', 'children', 'id', 'key', 'name', 'componentPropertyDefinitions'],
    COMPONENT: ['type', 'children', 'id', 'absoluteBoundingBox', 'name', 'visible', 'opacity', 'fills', 'strokes', 'strokeWeight', 'boundVariables', 'effects', 'layoutGrids', 'layoutMode', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'primaryAxisAlignItems', 'cornerRadius', 'parent', 'key', 'remote', 'variantProperties', 'resolvedVariableModes', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
    TEXT: ['type', 'children', 'absoluteBoundingBox', 'id', 'name', 'visible', 'opacity', 'fills', 'strokes', 'strokeWeight', 'boundVariables', 'effects', 'layoutGrids', 'getStyledTextSegments(fontSize,fontWeight,fills,boundVariables,textStyleId)', 'layoutMode', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'textStyleId'],
    INSTANCE: ['type', 'id', 'absoluteBoundingBox', 'name', 'visible', 'opacity', 'fills', 'strokes', 'strokeWeight', 'boundVariables', 'effects', 'layoutGrids', 'overrides', 'getMainComponentAsync()', 'componentPropertyReferences', 'layoutMode', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
    FRAME: ['type', 'children', 'absoluteBoundingBox', 'id', 'name', 'visible', 'opacity', 'fills', 'strokes', 'strokeWeight', 'boundVariables', 'effects', 'layoutGrids', 'layoutMode', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
    RECTANGLE: ['type', 'boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids', 'id', 'name'],
    STYLE: ['name'],
  });
  assert.deepEqual(releve.variants.map((variant) => ({ nom: variant.nom, valeurs: variant.valeurs, modes: variant.modesEffectifs, layers: variant.layers.map(ligneDeLayer) })), [
    {
      nom: 'Etat=Repos', valeurs: { Etat: 'Repos' }, modes: { Composants: 'Valeur' },
      layers: [
        'repos | COMPONENT | - | visible | opacite 0.5 | 0,0 120x40 | peintures [fills0:SOLID#000 strokes0:SOLID#100] | liaisons [paddingLeft=texte/taille fills0=carte/fond] | enDur [paddingRight=8 paddingTop=4 paddingBottom=4 itemSpacing=6 cornerRadius=4 strokeWeight=1 width=120 height=40] | epaisseur 1 | pas de texte | pas d’instanceDe',
        'texte | TEXT | repos | visible | opacite 1 | 4,4 40x12 | peintures [fills0:SOLID#000] | liaisons [fontSize@0-3=texte/taille] | enDur [width=40 height=12] | sans epaisseur | texte Corps [0-3:14/400/1p/1l 3-7:16/700/1p/0l] | pas d’instanceDe',
        'sous-titre | TEXT | repos | visible | opacite 1 | 4,20 40x10 | peintures [] | liaisons [] | enDur [width=40 height=10] | sans epaisseur | texte - [] | pas d’instanceDe',
        'instance | INSTANCE | repos | visible | opacite 1 | 0,0 16x16 | peintures [] | liaisons [fills0=carte/fond~interne] | enDur [width=16 height=16] | sans epaisseur | pas de texte | instanceDe Icone:cle-icone:true:Icone#1:0',
        'masque | FRAME | repos | masque | opacite 1 | 0,0 4x4 | peintures [] | liaisons [] | enDur [width=4 height=4] | sans epaisseur | pas de texte | pas d’instanceDe',
      ],
    },
    {
      nom: 'Etat=Survol', valeurs: { Etat: 'Survol' }, modes: {},
      layers: [
        'survol | COMPONENT | - | visible | opacite 1 | 0,0 120x40 | peintures [] | liaisons [] | enDur [width=120 height=40] | sans epaisseur | pas de texte | pas d’instanceDe',
        'texte-survol | TEXT | survol | visible | opacite 1 | 0,0 10x10 | peintures [] | liaisons [] | enDur [width=10 height=10] | sans epaisseur | texte - [] | pas d’instanceDe',
        'cadre | FRAME | survol | visible | opacite 1 | 0,0 10x10 | peintures [] | liaisons [] | enDur [width=10 height=10] | sans epaisseur | pas de texte | pas d’instanceDe',
      ],
    },
  ]);
  assert.deepEqual({ jeu: releve.jeu, proprietes: releve.proprietes, lecture: releve.lecture }, {
    jeu: { cle: 'cle-jeu', id: 'jeu', nom: 'Button' },
    proprietes: [
      { nom: 'Etat', type: 'VARIANT', valeurs: ['Repos', 'Survol'], defaut: 'Repos' },
      { nom: 'Avec icone#1:2', type: 'BOOLEAN', defaut: true },
    ],
    lecture: { layersLus: 8, layersNonLus: 0, variantsNonLus: [], manquees: [] },
  });
  assert.deepEqual([...appels.entries()], [['taille', 1], ['collection:c', 1], ['fond', 1]], 'chaque variable et chaque collection se lisent une fois');
});

test('la lecture de la vue Composant lit ces champs dans cet ordre et en tire ces calques, liaisons et valeurs en dur', async () => {
  const { e, jeu, port, appels } = jeuObserve();
  const issue = await lireLeComposant(port, e.espion(jeu), { annulee: () => false });
  assert.equal(issue.statut, 'lu');
  const lecture = (issue as { lecture: LectureDeComposant }).lecture;

  assert.deepEqual(e.releverEtVider(), {
    COMPONENT_SET: ['type', 'parent', 'id', 'defaultVariant', 'name', 'children'],
    COMPONENT: ['type', 'children', 'id', 'name', 'absoluteBoundingBox', 'explicitVariableModes', 'resolvedVariableModes', 'boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids', 'strokeWeight', 'cornerRadius', 'layoutMode', 'itemSpacing', 'primaryAxisAlignItems', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'parent'],
    TEXT: ['type', 'children', 'id', 'name', 'absoluteBoundingBox', 'explicitVariableModes', 'resolvedVariableModes', 'boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids', 'getStyledTextSegments(boundVariables,fills)', 'textStyleId', 'strokeWeight', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'layoutMode', 'fontSize'],
    INSTANCE: ['type', 'id', 'name', 'absoluteBoundingBox', 'explicitVariableModes', 'resolvedVariableModes', 'getMainComponentAsync()', 'overrides'],
    FRAME: ['type', 'children', 'id', 'name', 'absoluteBoundingBox', 'explicitVariableModes', 'resolvedVariableModes', 'boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids', 'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'strokeWeight', 'layoutMode'],
    RECTANGLE: ['type', 'boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids'],
    STYLE: ['name', 'paints', 'effects', 'layoutGrids', 'boundVariables'],
  });
  assert.deepEqual(lecture.sujet, { id: 'jeu', nom: 'Button', type: 'COMPONENT_SET', variant: 'Etat=Repos', variants: [{ id: 'repos', nom: 'Etat=Repos' }, { id: 'survol', nom: 'Etat=Survol' }] });
  assert.deepEqual(lecture.calques.map((calque) => [calque.id, calque.type, calque.parent, calque.frontiere?.composant ?? null, JSON.stringify(calque.modes), calque.boite ? `${calque.boite.x},${calque.boite.y} ${calque.boite.largeur}x${calque.boite.hauteur}` : null]), [
    ['repos', 'COMPONENT', null, null, '{"c":{"mode":"c:Valeur","explicite":true}}', '0,0 120x40'],
    ['texte', 'TEXT', 'repos', null, '{}', '4,4 40x12'],
    ['sous-titre', 'TEXT', 'repos', null, '{}', '4,20 40x10'],
    ['instance', 'INSTANCE', 'repos', 'Icone', '{}', '0,0 16x16'],
    ['masque', 'FRAME', 'repos', null, '{}', '0,0 4x4'],
  ]);
  assert.deepEqual(lecture.liaisons.map((liaison) => `${liaison.calque}:${liaison.propriete}=${liaison.variable}`), ['repos:paddingLeft=taille', 'repos:fills[0]=fond', 'instance:fills[0]=fond']);
  assert.deepEqual(lecture.styles.map((style) => [style.id, style.nom, style.liaisons.map((liaison) => `${liaison.champ}=${liaison.variable}`)]), [['ts', 'Corps', ['fontSize=taille']]]);
  assert.deepEqual(lecture.usagesDeStyle, [{ calque: 'texte', style: 'ts' }]);
  assert.deepEqual(lecture.directes.map((directe) => `${directe.calque}:${directe.propriete}=${directe.valeur}`), [
    'repos:strokes[0]=#FF0000', 'repos:cornerRadius=4', 'repos:strokeWeight=1', 'repos:itemSpacing=6', 'repos:paddingRight=8', 'repos:paddingTop=4', 'repos:paddingBottom=4', 'texte:fills[0]=#000000', 'sous-titre:fontSize=12',
  ]);
  assert.deepEqual([lecture.calquesNonLus, lecture.erreurs], [0, []]);
  assert.deepEqual([...appels.entries()], [['taille', 1], ['fond', 1], ['collection:c', 2]]);
});

test('les fonctions de consommateurs lisent ces champs sur un texte, un composant et un style', () => {
  const { e, texte, repos, style } = jeuObserve();

  assert.deepEqual(liaisonsDuNoeud(e.espion(texte)), [{ propriete: 'texte[0–3].fontSize', variable: 'taille' }]);
  assert.deepEqual(e.releverEtVider(), { TEXT: ['type', 'boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids', 'getStyledTextSegments(boundVariables,fills)'] });

  assert.deepEqual(liaisonsDuNoeud(e.espion(repos)), [{ propriete: 'paddingLeft', variable: 'taille' }, { propriete: 'fills[0]', variable: 'fond' }]);
  assert.deepEqual(modesDuNoeud(e.espion(repos)), { c: { mode: 'c:Valeur', explicite: true } });
  assert.deepEqual(e.releverEtVider(), { COMPONENT: ['type', 'boundVariables', 'fills', 'strokes', 'effects', 'layoutGrids', 'explicitVariableModes', 'resolvedVariableModes'] });

  assert.deepEqual(liaisonsDuStyle(e.espion(style)), [{ propriete: 'fontSize', variable: 'taille' }]);
  assert.deepEqual(e.releverEtVider(), { STYLE: ['paints', 'effects', 'layoutGrids', 'boundVariables'] });
});

test('la surveillance lit le type, le parent et l’identifiant, puis l’arbre du jeu, et un nœud touché le périme', async () => {
  const { e, texte, port } = jeuObserve();
  reinitialiserLAnalyse();
  const messages: PluginMessage[] = [];
  let lusAvantLAbonnement: unknown = null;
  const vide = async () => [];
  const figma = {
    currentPage: { selection: [e.espion(texte)] },
    root: { documentColorProfile: 'SRGB', getSharedPluginData: () => '' },
    getNodeByIdAsync: port.getNodeByIdAsync,
    getStyleByIdAsync: port.getStyleByIdAsync,
    variables: { getLocalVariableCollectionsAsync: vide, getLocalVariablesAsync: vide, getVariableByIdAsync: async () => null, getVariableCollectionByIdAsync: async () => null },
  };
  const contexte: Contexte = {
    figma: figma as never,
    envoyer: (message) => messages.push(message),
    surveillerLeDocument: () => { lusAvantLAbonnement = e.releverEtVider(); },
  };
  await traiter({ type: 'analyser' }, contexte);

  // L'abonnement du sujet suit sa résolution : ces lectures sont toutes celles de la surveillance. Le jeu et ses variants
  // se lisent par type et nom pour la topologie ; les descendants n'ont que leur identifiant.
  assert.deepEqual(lusAvantLAbonnement, {
    TEXT: ['type', 'parent', 'id'],
    COMPONENT: ['type', 'parent', 'id', 'name'],
    COMPONENT_SET: ['type', 'parent', 'children', 'id', 'name', 'findAll(filtre)', 'key'],
    INSTANCE: ['id'],
    RECTANGLE: ['id'],
    FRAME: ['id'],
  });
  assert.equal(analyseCourante()?.sujet, 'cle-jeu');
  assert.deepEqual(couvertureDeLAnalyse(analyseCourante() as IdentiteDAnalyse), { instances: 'descendues', complete: true });

  const avant = messages.length;
  surChangementDuDocument(['inconnu'], contexte);
  assert.equal(messages.length, avant, 'un nœud hors du jeu ne périme pas');
  surChangementDuDocument(['interne'], contexte);
  assert.deepEqual(messages.slice(avant).map((message) => (message.type === 'perime' ? [message.type, message.cause] : message.type)), [['perime', 'document']], 'un descendant du jeu périme l’analyse');
});
