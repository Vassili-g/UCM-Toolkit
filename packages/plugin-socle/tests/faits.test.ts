/** Les types des faits ordinaires : sans type Figma, et chaque état se distingue des autres. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  MIXTE,
  NON_DEMANDE,
  acquis,
  champDe,
  cleDeSegments,
  doitEtreRelue,
  maitreDe,
  refuse,
  segmentsDe,
  type Acquisition,
  type ChampsDeNoeud,
  type ChampsDeVariable,
  type Couverture,
  type EtatDeChamp,
  type EtatDuMaitre,
  type FaitDeSegments,
  type FaitsDuNoeud,
  type NoeudDeTopologie,
  type NonDemande,
  type PeintureLue,
  type PlageDeTexte,
  type Ressources,
  type TableDesChamps,
} from '../src/composant/analyse/faits';

const racineDuDepot = path.resolve(__dirname, '..', '..', '..');
const source = fs.readFileSync(path.join(racineDuDepot, 'packages', 'plugin-socle', 'src', 'composant', 'analyse', 'faits.ts'), 'utf8');

test('faits.ts n’importe rien et ne nomme aucun type des typages Figma', () => {
  const typages = fs.readFileSync(path.join(racineDuDepot, 'node_modules', '@figma', 'plugin-typings', 'plugin-api.d.ts'), 'utf8');
  const typesFigma = new Set([...typages.matchAll(/\b(?:interface|type|class|enum)\s+([A-Za-z_]\w*)/g)].map((trouve) => trouve[1]));
  for (const attendu of ['SceneNode', 'BaseNode', 'Variable', 'PaintStyle', 'InstanceNode']) assert.ok(typesFigma.has(attendu), `${attendu} manque à la liste tirée des typages`);

  const nommes = [...new Set(source.match(/[A-Za-z_]\w*/g) ?? [])].filter((nom) => typesFigma.has(nom));
  assert.deepEqual(nommes, []);
  assert.doesNotMatch(source, /@figma|\bfigma\.|^\s*import\b/m);
});

/** La lecture des peintures par le relevé : chaque état a son traitement, et le compilateur refuse un cas oublié. */
function peinturesDuReleve(etat: EtatDeChamp<readonly PeintureLue[]>): string {
  switch (etat.etat) {
    case 'acquis': return `${etat.valeur.length} peinture(s)`;
    case 'mixte': return 'manquée : peintures mixtes ou illisibles';
    case 'refuse': return `manquée : ${etat.raison}`;
    case 'non-demande': return 'à acquérir';
  }
}

test('un champ mixte, refusé, acquis ou non demandé se distingue, et le non-demandé ne prend aucune valeur', () => {
  const champs: TableDesChamps<ChampsDeNoeud> = {
    fills: MIXTE,
    strokes: acquis([{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]),
    effects: refuse('leve', 'node removed'),
    layoutMode: refuse('absent'),
  };
  assert.equal(peinturesDuReleve(champDe(champs, 'fills')), 'manquée : peintures mixtes ou illisibles');
  assert.equal(peinturesDuReleve(champDe(champs, 'strokes')), '1 peinture(s)');
  assert.deepEqual(champDe(champs, 'effects'), { etat: 'refuse', raison: 'leve', message: 'node removed' });
  assert.deepEqual(champDe(champs, 'layoutMode'), { etat: 'refuse', raison: 'absent' });
  assert.deepEqual(champDe(champs, 'visible'), NON_DEMANDE);
  assert.equal('message' in refuse('absent'), false);

  // @ts-expect-error : la table n'écrit pas le non-demandé, elle omet la clé.
  const nonDemandeEcrit: TableDesChamps<ChampsDeNoeud> = { visible: NON_DEMANDE };
  // @ts-expect-error : la valeur acquise a le type du champ.
  const mauvaisType: TableDesChamps<ChampsDeNoeud> = { visible: acquis(1) };
  assert.ok(nonDemandeEcrit && mauvaisType);
});

function acquisition(couverture: Couverture, topologie: Record<string, NoeudDeTopologie>, faits: Record<string, FaitsDuNoeud> = {}, ressources: Partial<Ressources> = {}): Acquisition {
  return {
    couverture,
    sommets: Object.values(topologie).filter((noeud) => noeud.parent === null).map((noeud) => noeud.id),
    topologie,
    faits,
    ressources: { noeudsParIdentifiant: {}, variables: {}, collections: {}, styles: {}, maitres: {}, variablesDeLibrary: {}, inventaires: {}, ...ressources },
  };
}

test('un refus de children laisse un sous-arbre inconnu et un trou de couverture, jamais une liste vide', () => {
  const lue = acquisition(
    { instances: 'frontiere', complete: false, trous: [{ type: 'enfants', noeud: 'repos', raison: 'leve', message: 'children' }] },
    {
      jeu: { id: 'jeu', type: 'COMPONENT_SET', nom: 'Button', parent: null, rang: null, enfants: acquis(['repos']), frontiere: 'racine', sousUneInstance: false },
      repos: { id: 'repos', type: 'COMPONENT', nom: 'Etat=Repos', parent: 'jeu', rang: 0, enfants: refuse('leve', 'children'), frontiere: 'racine', sousUneInstance: false },
    },
  );
  const enfants = lue.topologie.repos.enfants;
  assert.equal(enfants.etat, 'refuse');
  assert.deepEqual(lue.sommets, ['jeu']);
  assert.equal(doitEtreRelue(lue.couverture), true);

  // @ts-expect-error : `children` n'est jamais mixte.
  const mixte: NoeudDeTopologie['enfants'] = MIXTE;
  assert.ok(mixte);
});

test('une couverture incomplète sans trou connu est inconnue, et se relit comme une couverture trouée', () => {
  assert.equal(doitEtreRelue({ instances: 'descendues', complete: false, trous: [] }), true);
  assert.equal(doitEtreRelue({ instances: 'descendues', complete: true }), false);
  assert.equal(doitEtreRelue({ instances: 'frontiere', complete: false, trous: [{ type: 'page-non-ecoutee', page: '0:1' }] }), true);

  // @ts-expect-error : une couverture complète n'a pas de trou.
  const contradictoire: Couverture = { instances: 'frontiere', complete: true, trous: [] };
  assert.ok(contradictoire);
});

test('un fait de segments se retrouve par ses champs dans n’importe quel ordre, et son refus porte sur l’appel entier', () => {
  assert.equal(cleDeSegments(['fills', 'boundVariables']), 'boundVariables,fills');
  assert.equal(cleDeSegments(['boundVariables', 'fills', 'fills']), 'boundVariables,fills');

  const lus: FaitDeSegments = {
    champs: ['boundVariables', 'fills'],
    etat: acquis<readonly PlageDeTexte[]>([
      { debut: 0, fin: 3, valeurs: { boundVariables: { fontSize: { type: 'VARIABLE_ALIAS', id: 'taille' } }, fills: [] } },
      { debut: 3, fin: 7, valeurs: { boundVariables: {}, fills: [] } },
    ]),
  };
  const refuses: FaitDeSegments = { champs: ['listOptions'], etat: refuse('leve', 'segments') };
  const texte: FaitsDuNoeud = { champs: {}, segments: { [cleDeSegments(lus.champs)]: lus, [cleDeSegments(refuses.champs)]: refuses } };

  assert.equal(segmentsDe(texte, ['fills', 'boundVariables']), lus);
  assert.deepEqual(segmentsDe(texte, ['listOptions']), { champs: ['listOptions'], etat: { etat: 'refuse', raison: 'leve', message: 'segments' } });
  assert.deepEqual(segmentsDe(texte, ['textStyleOverrides']), NON_DEMANDE);

  // @ts-expect-error : un appel de segments lève ou manque ; il n'a pas de cible introuvable.
  const introuvable: FaitDeSegments['etat'] = refuse('introuvable');
  assert.ok(introuvable);
});

/** Le traitement du relevé : la manquée `instanceDe`, ou le nom du jeu dans les ressources. */
function instanceDeDuReleve(etat: EtatDuMaitre | NonDemande, ressources: Ressources): string {
  switch (etat.etat) {
    case 'non-demande': return 'à acquérir';
    case 'refuse': return `manquée instanceDe : ${etat.raison}`;
    case 'acquis': {
      const maitre = ressources.maitres[etat.valeur];
      return maitre.etat.etat === 'acquis' ? (maitre.etat.valeur.jeu ?? maitre.etat.valeur).nom : 'manquée instanceDe : maître illisible';
    }
  }
}

test('un maître introuvable, acquis ou non demandé est un seul fait sur l’instance', () => {
  const ressources = acquisition({ instances: 'frontiere', complete: true }, {}, {}, {
    maitres: {
      maitre: {
        id: 'maitre',
        provenance: { appel: { appel: 'getMainComponentAsync', instance: 'icone' }, origine: 'distante' },
        etat: acquis({ id: 'maitre', key: 'cle-maitre', nom: 'Taille=M', remote: true, jeu: { id: 'jeu-icone', key: 'cle-icone', nom: 'Icone' } }),
      },
    },
  }).ressources;

  assert.equal(instanceDeDuReleve(maitreDe({ champs: {}, maitre: refuse('introuvable') }), ressources), 'manquée instanceDe : introuvable');
  assert.equal(instanceDeDuReleve(maitreDe({ champs: {}, maitre: acquis('maitre') }), ressources), 'Icone');
  assert.equal(instanceDeDuReleve(maitreDe({ champs: {} }), ressources), 'à acquérir');

  // @ts-expect-error : un maître n'est jamais mixte.
  const mixte: EtatDuMaitre = MIXTE;
  assert.ok(mixte);
});

test('une variable refusée dans une acquisition peut être acquise dans la suivante', () => {
  const provenance = { appel: { appel: 'getVariableByIdAsync', id: 'fond' }, origine: 'inconnue' } as const;
  const champs: TableDesChamps<ChampsDeVariable> = { name: acquis('carte/fond'), key: acquis('cle-fond'), remote: acquis(false) };
  const premiere = acquisition({ instances: 'frontiere', complete: true }, {}, {}, {
    variables: { fond: { id: 'fond', provenance, etat: refuse('leve', 'quota') } },
  });
  const seconde = acquisition({ instances: 'frontiere', complete: true }, {}, {}, {
    variables: { fond: { id: 'fond', provenance: { ...provenance, origine: 'locale' }, etat: acquis(champs) } },
  });

  assert.equal(premiere.ressources.variables.fond.etat.etat, 'refuse');
  const lue = seconde.ressources.variables.fond.etat;
  assert.equal(lue.etat, 'acquis');
  if (lue.etat !== 'acquis') return;
  assert.deepEqual(champDe(lue.valeur, 'name'), acquis('carte/fond'));
  assert.deepEqual(champDe(lue.valeur, 'valuesByMode'), NON_DEMANDE);
});
