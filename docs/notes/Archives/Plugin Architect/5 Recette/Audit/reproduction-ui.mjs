import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { build } from 'esbuild';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const fichier = (nom) => JSON.stringify(path.join(racine, 'packages/plugin-architect/src/nomenclature', nom));
const compilation = await build({
  stdin: { contents: `export * from ${fichier('ui/selection.ts')}; export * from ${fichier('ui/configuration.ts')}; export * from ${fichier('ui/frontiere.ts')}; export * from ${fichier('session.ts')};`, resolveDir: racine },
  bundle: true, platform: 'node', format: 'cjs', write: false,
});
class Element {
  children = [];
  events = new Map();
  checked = false;
  classList = { add() {}, toggle() {} };
  constructor(tag) { this.tag = tag; }
  append(...enfants) { this.children.push(...enfants); }
  appendChild(enfant) { this.append(enfant); return enfant; }
  replaceChildren(...enfants) { this.children = enfants; }
  setAttribute() {}
  addEventListener(type, action) { this.events.set(type, action); }
}
const document = { createElement: (tag) => new Element(tag) };
const module = { exports: {} };
vm.runInNewContext(compilation.outputFiles[0].text, { module, exports: module.exports, require: createRequire(import.meta.url), document, console, setTimeout, clearTimeout });
const api = module.exports;
const groupe = (variables, apercu = []) => ({ cle: 'terme:quux', regle: { sorte: 'terme', origine: 'personnalise', categorie: null }, avant: 'quuxed', apres: 'quux', variables, collections: 0, autres: 0, aussiDEcriture: 0, nouveau: false, apercu });
const ligne = (id) => ({ id, ancien: id, nouveau: id, marques: [], aussi: [] });
let selection = api.creerSelection([groupe(2, [ligne('a'), ligne('b')])]);
selection = api.cocherLigne(selection, ligne('a'), 'terme:quux', false);
selection = api.reconcilier(selection, [groupe(1, [ligne('b')])]);
// L'écran demande alors au sandbox quels exclus sont encore à renommer : `a` ne l'est plus.
selection = api.restreindre(selection, { exclus: ['a'], inclus: [] }, []);
assert.equal(api.compterLesNomsCoches(selection), 1);
assert.equal(api.ligneCochee(selection, ligne('b'), 'terme:quux'), true);
console.log('UI-01 corrigé : après la lecture selection, la ligne restante compte et Appliquer reste disponible.');

const envoyees = [];
const abonnements = [];
let bilanCourant = null;
const frontiere = api.creerFrontiere({
  envoyer: (demande) => envoyees.push(demande),
  afficher: (message) => {
    if (message.type === 'bilan') bilanCourant = message.bilan;
    for (const abonne of abonnements) abonne(message, { bilan: bilanCourant });
  },
});
const configuration = new Element('div');
api.monterConfiguration({ frontiere, configuration, abonner: (abonne) => abonnements.push(abonne), etat: () => ({ bilan: bilanCourant }) });
const bilan = (generation, exclues) => ({ generation, collections: ['a', 'b', 'c'].map((id) => ({ id, nom: id, analysee: !exclues.includes(id), palettes: false, nombre: 1 })), dernierRenommage: null, dernierImport: null });
const analyser = frontiere.analyser();
frontiere.recevoir({ type: 'bilan', demande: analyser, bilan: bilan(1, []) });
const cases = configuration.children[1].children[2].children.map((label) => label.children[0]);
const decocher = (rang) => { cases[rang].checked = false; cases[rang].events.get('change')(); };
decocher(0);
decocher(1);
frontiere.recevoir({ type: 'bilan', demande: 2, bilan: bilan(2, ['a']) });
assert.equal(cases[1].checked, false);
decocher(2);
frontiere.recevoir({ type: 'bilan', demande: 3, bilan: bilan(3, ['a', 'b']) });
assert.deepEqual(Array.from(envoyees.at(-1).collectionsExclues), ['a', 'b', 'c']);
frontiere.recevoir({ type: 'bilan', demande: 4, bilan: bilan(4, ['a', 'b', 'c']) });
assert.deepEqual(cases.map((caseACocher) => caseACocher.checked), [false, false, false]);
console.log('UI-02 corrigé : décocher A, B puis C pendant les réponses finit avec A, B et C exclues.');

const ecriture = JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const stock = new Map([
  ['ecriture', ecriture],
  ['terme:quux', JSON.stringify({ version: 1, terme: ['quux'], remplace: [['quuxed']], definition: 'Terme métier conservé.' })],
]);
const messages = [];
const session = api.creerSession({
  port: {
    lecture: { collections: async () => [{ id: 'c', name: 'components', remote: false }], variables: async () => [{ id: 'v', name: 'tile/quuxed/fill', variableCollectionId: 'c', remote: false }], cibleAlias: () => undefined, protegee: () => false, palette: () => undefined },
    regles: { cles: () => [...stock.keys()], lire: (cle) => stock.get(cle) ?? '', ecrire: (cle, texte) => stock.set(cle, texte), effacer: (cle) => stock.delete(cle) },
    ecriture: { ouvrir: async () => { throw new Error('Écriture Figma interdite dans ce scénario.'); } },
  },
  envoyer: (message) => messages.push(message), tranches: { pause: async () => {} },
});
await session.recevoir({ type: 'analyser', demande: 1 });
assert.ok(messages.some((message) => message.type === 'bilan'));
await session.recevoir({ type: 'regle', demande: 2, geste: { type: 'retirer-remplace', terme: 'quux', remplace: 'quuxed' } });
assert.deepEqual(JSON.parse(stock.get('terme:quux')).definition, 'Terme métier conservé.');
assert.deepEqual(JSON.parse(stock.get('terme:quux')).remplace, []);
console.log('UI-03 corrigé : retirer la dernière variante garde le terme et sa définition.');
