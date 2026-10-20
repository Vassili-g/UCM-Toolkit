/** La porte `nommage` calcule sans Figma : un inventaire écrit à la main, les règles lues par `protocoles`. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  causeDeProtection, cheminsEnConflit, estProtegee, idsNonRenommables, inventairePublie, inventaireSelonLaProtection, nomsSelonLesReglesSync, palettesLibres,
  type EntreeInventaire, type Inventaire,
} from '../src/nommage/index.js';
import { lireReglesDeNommage } from '../src/protocoles/nommage.js';

const collection = (id: string, nom: string): EntreeInventaire => ({
  nom: { id: `collection:${id}`, categorie: 'collections', portee: 'document', nom },
  cible: { type: 'collection', collectionId: id }, renommable: true, protegee: false,
});
const variable = (id: string, nom: string, protegee = false): EntreeInventaire => ({
  nom: { id: `variable:${id}`, categorie: 'variables', portee: 'collection:c1', nom },
  contexte: { collection: 'primitives' },
  cible: { type: 'variable', variableId: id, collectionId: 'c1' }, renommable: true, protegee,
});
const REGLES = lireReglesDeNommage([['ecriture', JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } })]])!;

const inventaire = (noms: readonly string[], protegees: readonly string[] = [], marque?: Inventaire['marque']): Inventaire => ({
  entrees: [collection('c1', 'primitives'), ...noms.map((nom, rang) => variable(`v${rang}`, nom, protegees.includes(nom)))],
  ...(marque ? { marque } : {}),
});

/** Les noms que le calcul laisse après avoir appliqué ses renommages. */
function renommer(courant: Inventaire, nonRenommables: readonly string[]): { readonly noms: string[]; readonly renommages: number } {
  const { resultat } = nomsSelonLesReglesSync(courant, REGLES, nonRenommables);
  const nouveaux = new Map(resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
  return { noms: courant.entrees.filter((entree) => entree.cible.type === 'variable').map((entree) => nouveaux.get(entree.nom.id) ?? entree.nom.nom), renommages: resultat.renommages.length };
}

test('le calcul renomme selon l’écriture, puis ne renomme plus rien sur ses propres résultats', () => {
  const avant = inventaire(['Color/Primary Hover', 'Color/Secondary_Hover']);
  const premier = renommer(avant, []);
  assert.ok(premier.renommages > 0);
  assert.deepEqual(premier.noms, ['color/primary-hover', 'color/secondary-hover']);
  assert.equal(renommer(inventaire(premier.noms), []).renommages, 0);
});

test('une variable protégée garde son nom, sauf quand la marque courante et les règles rangées la libèrent', () => {
  const protegee = inventaire(['Color/Primary Hover'], ['Color/Primary Hover'], 'absente');
  assert.deepEqual(idsNonRenommables(protegee, []), ['variable:v0']);
  assert.equal(renommer(protegee, idsNonRenommables(protegee, [])).renommages, 0);

  const libre = inventaire(['Color/Primary Hover'], ['Color/Primary Hover'], 'courante');
  const options = { palettesLibres: palettesLibres(libre, true) };
  assert.deepEqual(idsNonRenommables(libre, [], options), []);
  assert.equal(renommer(libre, idsNonRenommables(libre, [], options)).noms[0], 'color/primary-hover');
});

test('estProtegee, causeDeProtection et inventaireSelonLaProtection disent la même chose', () => {
  const entree = variable('v0', 'a', true);
  for (const marque of ['absente', 'illisible', 'future', 'courante', 'refusee'] as const) {
    for (const reglesRangees of [false, true]) {
      const courant = { entrees: [entree], marque };
      const libres = palettesLibres(courant, reglesRangees);
      assert.equal(estProtegee(entree, { palettesLibres: libres }), causeDeProtection(entree, courant, reglesRangees) !== undefined, `${marque} ${reglesRangees}`);
      assert.equal(inventaireSelonLaProtection(courant, { palettesLibres: libres }).entrees[0]!.protegee, !libres);
    }
  }
});

test('un renommage qui ferait disparaître un token de tokens.json est retiré du résultat', () => {
  const courant = inventaire(['Brand/Primary', 'brand/primary']);
  const { resultat } = nomsSelonLesReglesSync(courant, REGLES, []);
  assert.equal(resultat.renommages.some((renommage) => renommage.nouveauNom === 'brand/primary'), false);
  const publie = inventairePublie(inventaire(['a', 'b']), (entree) => entree.nom.id);
  assert.deepEqual(cheminsEnConflit(publie, new Map([['variable:v1', 'a']])).map(({ id, motif }) => [id, motif]), [['variable:v1', 'meme-token']]);
});
