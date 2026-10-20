import assert from 'node:assert/strict';
import test from 'node:test';
import {
  annulerLeDernierRenommage, appliquerLesRenommages,
  type PortDeRegles, type RenommageDemande, type SessionEcriture,
} from '../../../../../../packages/plugin-nomenclature/src/ecriture';
import { inventaireDeLectures } from '../../../../../../packages/plugin-nomenclature/src/lecture';
import { cheminsEnConflit, inventairePublie } from '../../../../../../packages/plugin-socle/src/cheminsPublies';
import { joinTokenPath } from '../../../../../../packages/plugin-socle/src/cheminsDeTokens';
import { axesDesCollections, insert } from '../../../../../../packages/plugin-exporter/src/tokens/exportTokens';
import { creerSession } from '../../../../../../packages/plugin-nomenclature/src/session';
import type { Bilan, DemandeArchitect, PluginMessage } from '../../../../../../packages/plugin-nomenclature/src/messages';

function fichier(collectionsInitiales: [string, string][], variablesInitiales: [string, string, string][]) {
  const collections = collectionsInitiales.map(([id, name]) => ({
    id, name, remote: false, defaultModeId: `${id}:0`,
    modes: [{ modeId: `${id}:0`, name: 'Light' }, { modeId: `${id}:1`, name: 'Dark' }],
  }));
  const variables = variablesInitiales.map(([id, name, variableCollectionId]) => ({ id, name, variableCollectionId, remote: false }));
  const stock = new Map<string, string>();
  const stockage: PortDeRegles = {
    cles: () => [...stock.keys()], lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => { stock.set(cle, texte); }, effacer: (cle) => { stock.delete(cle); },
  };
  const session: SessionEcriture = {
    get inventaire() {
      return inventaireDeLectures(collections, variables, { cibleAlias: () => undefined, protegee: () => false, palette: () => undefined });
    },
    collection: (id) => collections.find((objet) => objet.id === id) ?? null,
    variable: (id) => variables.find((objet) => objet.id === id) ?? null,
    commitUndo: () => {},
  };
  const demandeVariable = (id: string, nouveauNom: string): RenommageDemande => {
    const variable = variables.find((objet) => objet.id === id)!;
    return { id: JSON.stringify(['variable', id]), type: 'variable', figmaId: id, collectionId: variable.variableCollectionId, ancienNom: variable.name, nouveauNom };
  };
  const demandeCollection = (id: string, nouveauNom: string): RenommageDemande => ({
    id: JSON.stringify(['collection', id]), type: 'collection', figmaId: id,
    ancienNom: collections.find((objet) => objet.id === id)!.name, nouveauNom,
  });
  return { collections, variables, session, stockage, demandeVariable, demandeCollection };
}

function protocole(f: ReturnType<typeof fichier>) {
  const messages: PluginMessage[] = [];
  const instance = creerSession({
    port: {
      lecture: {
        collections: async () => f.collections, variables: async () => f.variables,
        cibleAlias: () => undefined, protegee: () => false, palette: () => undefined,
      },
      ecriture: { ouvrir: async () => f.session }, regles: f.stockage,
    },
    envoyer: (message) => messages.push(message), tranches: { pause: async () => {} },
  });
  let numero = 0;
  type DemandeSansNumero<T> = T extends unknown ? Omit<T, 'demande'> : never;
  return {
    messages,
    envoyer: (demande: DemandeSansNumero<DemandeArchitect>) => instance.recevoir({ ...demande, demande: ++numero }),
    bilan: (): Bilan => {
      const message = messages.findLast((item) => item.type === 'bilan');
      assert.ok(message?.type === 'bilan');
      return message.bilan;
    },
  };
}

test('AUD-E1 : une annulation crée un nouveau conflit entre token et groupe après une modification extérieure', () => {
  const f = fichier([['c', 'Brand']], [['a', 'a', 'c'], ['autre', 'c', 'c']]);
  assert.equal(appliquerLesRenommages({ demandes: [f.demandeVariable('a', 'b')], session: f.session, stockage: f.stockage }).statut, 'applique');
  f.variables[1]!.name = 'a/x';
  const avant = inventairePublie(f.session.inventaire, (entree) => entree.nom.id);
  const conflits = cheminsEnConflit(avant, new Map([[JSON.stringify(['variable', 'a']), 'a']]));
  assert.equal(conflits.length, 1);
  assert.equal(conflits[0]!.motif, 'token-et-groupe');
  const annulation = annulerLeDernierRenommage({ session: f.session, stockage: f.stockage });
  assert.equal(annulation.statut, 'applique');
  assert.equal(annulation.annulable, false);
  assert.equal(f.variables[0]!.name, 'a');
  const arbre = {};
  const avertissements: string[] = [];
  const conserves = f.variables.map((variable) => insert(arbre, joinTokenPath('Brand', variable.name), { $type: 'number', $value: 1 }, avertissements));
  assert.deepEqual(conserves, [true, false]);
  assert.equal(avertissements.length, 1);
});

test('AUD-E2 : un renommage de collection accepté supprime les deux axes de modes à l’export', () => {
  const f = fichier([['c', 'Couleurs']], [['a', 'primary', 'c']]);
  f.collections.push({ id: 'd', name: 'Primitives', remote: false, defaultModeId: 'd:0', modes: [{ modeId: 'd:0', name: 'Light' }, { modeId: 'd:1', name: 'Dark' }] });
  f.variables.push({ id: 'b', name: 'secondary', variableCollectionId: 'd', remote: false });
  assert.equal(axesDesCollections(f.collections as unknown as VariableCollection[]).axes.size, 2);
  const resultat = appliquerLesRenommages({ demandes: [f.demandeCollection('c', 'primitives')], session: f.session, stockage: f.stockage });
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual(resultat.sautes, []);
  const apres = axesDesCollections(f.collections as unknown as VariableCollection[]);
  assert.equal(apres.axes.size, 0);
  assert.equal(apres.points.length, 1);
  assert.match(apres.points[0]!.impact, /ne pourra pas générer les modes de ces collections/u);
});

test('AUD-E2b : la réponse de collection suivie d’Appliquer atteint la collision d’axes avec une collection exclue', async () => {
  const f = fichier([['c', 'Zorglub'], ['d', 'Primitives']], [['a', 'primary', 'c'], ['b', 'secondary', 'c'], ['tiers', 'autre', 'd']]);
  const p = protocole(f);
  await p.envoyer({ type: 'analyser' });
  await p.envoyer({ type: 'regle', geste: { type: 'ecriture', ecriture: { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } } } });
  await p.envoyer({ type: 'configurer', collectionsExclues: ['d'] });
  const question = p.bilan().questions.find((item) => item.type === 'collection' && item.nom === 'Zorglub');
  assert.ok(question);
  await p.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'collection', cible: 'primitives' } });
  const bilan = p.bilan();
  assert.ok(bilan.groupes.some((groupe) => groupe.regle.sorte === 'collection' && groupe.apres === 'primitives'));
  assert.equal(bilan.bloques.length, 0);
  assert.equal(axesDesCollections(f.collections as unknown as VariableCollection[]).axes.size, 2);
  await p.envoyer({ type: 'appliquer', generation: bilan.generation, selection: { groupes: bilan.groupes.map((groupe) => groupe.cle), inclus: [], exclus: [] } });
  const application = p.messages.findLast((message) => message.type === 'application');
  assert.ok(application?.type === 'application');
  assert.equal(application.resultat.statut, 'applique');
  assert.deepEqual(f.collections.map((collection) => collection.name), ['primitives', 'Primitives']);
  assert.equal(axesDesCollections(f.collections as unknown as VariableCollection[]).axes.size, 0);
});

test('AUD-E3 : une collection exclue après application est modifiée par Annuler', async () => {
  const f = fichier([['c', 'components']], [['a', 'Button/Fill Hover', 'c'], ['b', 'Button/Fill Pressed', 'c']]);
  const p = protocole(f);
  await p.envoyer({ type: 'analyser' });
  await p.envoyer({ type: 'regle', geste: { type: 'ecriture', ecriture: { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } } } });
  const bilan = p.bilan();
  await p.envoyer({ type: 'appliquer', generation: bilan.generation, selection: { groupes: bilan.groupes.map((groupe) => groupe.cle), inclus: [], exclus: [] } });
  assert.equal(f.variables[0]!.name, 'button/fill-hover');
  await p.envoyer({ type: 'configurer', collectionsExclues: ['c'] });
  assert.equal(p.bilan().collections[0]!.analysee, false);
  assert.ok(p.bilan().dernierRenommage);
  await p.envoyer({ type: 'annuler-dernier' });
  assert.equal(f.variables[0]!.name, 'Button/Fill Hover');
  assert.equal(f.variables[1]!.name, 'Button/Fill Pressed');
  const annulation = p.messages.findLast((message) => message.type === 'application');
  assert.ok(annulation?.type === 'application');
  assert.equal(annulation.resultat.statut, 'applique');
  assert.equal(annulation.resultat.renommes, 2);
});
