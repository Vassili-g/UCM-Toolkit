/**
 * Garde le composant de base des stress tests F3 et F4 : P0 et un échantillon de profils donnent zéro constat de la portée,
 * chaque profil a une carte complète, `button-216` se construit vite. Les 96 profils se construisent ici ; le contrôle
 * complet de chacun se lance par le harnais, hors de `npm test`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionParCle } from '../src/controles/catalogue.js';
import { estDuComposant } from '../src/controles/nommage.js';
import { CODES_DE_LA_PORTEE, constatsDeLaPortee, copierLeComposant, type ComposantDeBase } from './stress/f3-composant/composantDeBase.js';
import { jetonDe, liaisonAttendue, verifierLaCarte } from './stress/f3-composant/carte.js';
import { composantDuProfil, FORMES_DE_JEU, PROFIL_ALPHA, PROFIL_P0, PROFILS_DE_BASE, profilTire, type ProfilDeBase } from './stress/f3-composant/profils.js';

const parId = (id: string): ProfilDeBase => PROFILS_DE_BASE.find((profil) => profil.id === id)!;

/** Le premier profil de chaque forme, aux scopes larges et sans imbriqués : un échantillon de toutes les formes. */
const UN_PAR_FORME = FORMES_DE_JEU.map((forme) => PROFILS_DE_BASE.find((profil) => profil.forme === forme && profil.scopes === 'larges' && !profil.imbriques)!);

test('les 96 profils sont uniques, numérotés de p001 à p096, et P0 en fait partie', () => {
  assert.equal(PROFILS_DE_BASE.length, 96);
  assert.equal(new Set(PROFILS_DE_BASE.map((profil) => profil.id)).size, 96);
  assert.equal(PROFILS_DE_BASE[0].id, 'p001');
  assert.equal(PROFILS_DE_BASE[95].id, 'p096');
  assert.deepEqual(parId(PROFIL_P0.id), PROFIL_P0);
  assert.deepEqual({ ...PROFIL_P0, id: '' }, { id: '', forme: 'button-36', scopes: 'larges', imbriques: true, plages: 2, modesDeTaille: 1 });
  assert.deepEqual({ ...PROFIL_ALPHA, id: '' }, { id: '', forme: 'alert-11', scopes: 'precis', imbriques: true, plages: 2, modesDeTaille: 2 });
});

test('P0 compte 36 variants et ne donne aucun constat de la portée', () => {
  const base = composantDuProfil(PROFIL_P0);
  assert.equal(base.releve.variants.length, 36);
  assert.deepEqual(constatsDeLaPortee(base.releve, base.catalogue), []);
});

test('un profil aux scopes larges, de chaque forme, ne donne aucun constat de la portée', () => {
  for (const profil of [...UN_PAR_FORME, PROFIL_P0, profilTire()].filter((entree) => entree.scopes === 'larges')) {
    const base = composantDuProfil(profil);
    assert.deepEqual(constatsDeLaPortee(base.releve, base.catalogue), [], profil.id);
  }
});

// `porteeAttendue` attend `SHAPE_FILL` pour le fond d'une forme (N-04, N-05) : l'icône et la surcharge de Glyph ne reçoivent plus C18.
test('un profil aux scopes précis ne donne aucun constat de la portée', () => {
  for (const profil of [PROFIL_ALPHA, parId('p025'), parId('p029')]) {
    const base = composantDuProfil(profil);
    assert.deepEqual(constatsDeLaPortee(base.releve, base.catalogue), [], profil.id);
  }
});

test('les 96 profils se construisent avec une carte complète', () => {
  for (const profil of PROFILS_DE_BASE) {
    const base = composantDuProfil(profil);
    assert.deepEqual(verifierLaCarte(base.releve, base.catalogue, base.carte), [], profil.id);
  }
});

test('chaque layer ne se lie qu\'aux tokens de son composant ; seules les instances imbriquées héritent de theme ou de layout', () => {
  for (const profil of [PROFIL_P0, PROFIL_ALPHA]) {
    const { releve, catalogue, carte } = composantDuProfil(profil);
    for (const variant of releve.variants) {
      for (const layer of variant.layers) {
        for (const liaison of layer.liaisons) {
          const collection = collectionParCle(catalogue, liaison.variable.collection)?.role;
          if (liaison.provenance === 'composant-principal') {
            assert.ok(layer.sorte === 'piece-interne' || layer.sorte === 'wrapper-de-dimensions', `${profil.id} ${layer.nom}`);
            assert.ok(collection === 'theme' || collection === 'layout');
            continue;
          }
          assert.equal(collection, 'components', `${profil.id} ${layer.nom} ${liaison.champ}`);
          assert.ok(estDuComposant(liaison.variable.nom, releve.jeu.nom));
        }
      }
    }
    for (const jeton of carte.jetons) assert.ok(['theme', 'layout'].includes(collectionParCle(catalogue, catalogue.variables.find((variable) => variable.cle === jeton.cible.cle)!.collection)!.role!));
  }
});

test('la carte rend le token attendu par layer, champ et variant', () => {
  const { releve, carte } = composantDuProfil(PROFIL_P0);
  const variant = releve.variants.find((entree) => entree.valeurs.Palette === 'danger' && entree.valeurs.Style === 'outline' && entree.valeurs.State === 'hover' && entree.valeurs.Size === 'medium')!;
  const layer = (nom: string) => variant.layers.find((entree) => entree.nom === nom)!.id;
  const fond = liaisonAttendue(carte, { variant: variant.id, layer: layer('Root'), champ: 'fills', indice: 0 })!;
  assert.equal(fond.nom, 'button/color/danger/outline/medium/hover/background');
  assert.equal(fond.role, 'background');
  assert.equal(carte.jetons.find((jeton) => jeton.cle === fond.cle)!.cible.nom, 'danger/surface/hover');
  assert.equal(liaisonAttendue(carte, { variant: variant.id, layer: layer('Root'), champ: 'paddingTop' })!.nom, 'button/size/medium/padding-y');
  assert.equal(liaisonAttendue(carte, { variant: variant.id, layer: layer('Label'), champ: 'fills', plage: { debut: 5, fin: 10 } })!.role, 'text');
  assert.equal(liaisonAttendue(carte, { variant: variant.id, layer: layer('.Bar'), champ: 'fills', indice: 0 })!.origine, 'heritee');
  assert.equal(jetonDe(carte, { role: 'ring' }, { Palette: 'primary' })?.nom, 'button/color/primary/solid/small/default/ring');
  assert.equal(jetonDe(carte, { propriete: 'gap' }, { Size: 'small' })?.nom, 'button/size/small/gap');
});

test('button-216 se construit en moins de 2 s et compte 216 variants', () => {
  const profil = PROFILS_DE_BASE.find((entree) => entree.forme === 'button-216' && entree.imbriques && entree.plages === 2)!;
  const debut = Date.now();
  const base = composantDuProfil(profil);
  assert.ok(Date.now() - debut < 2000, `${Date.now() - debut} ms`);
  assert.equal(base.releve.variants.length, 216);
  assert.equal(base.releve.variants.reduce((somme, variant) => somme + variant.layers.length, 0), 216 * 7);
});

test('une même graine rend le même composant, une autre graine change les longueurs des tokens', () => {
  const a = composantDuProfil(PROFIL_P0, 7103);
  const b = composantDuProfil(PROFIL_P0, 7103);
  assert.deepEqual(a, b);
  const pixels = (base: ComposantDeBase) => base.carte.jetons.filter((jeton) => jeton.nature === 'taille').map((jeton) => jeton.pixels);
  assert.notDeepEqual(pixels(composantDuProfil(PROFIL_P0, 1)), pixels(a));
});

test('une copie ne partage rien avec la base, et dégrader la copie n\'altère pas la base', () => {
  const base = composantDuProfil(PROFIL_P0);
  const copie = copierLeComposant(base);
  assert.deepEqual(copie, base);
  copie.releve.variants[0].layers[0].liaisons[0].variable.nom = 'autre';
  copie.catalogue.variables.pop();
  assert.deepEqual(constatsDeLaPortee(base.releve, base.catalogue), []);
  assert.notEqual(base.releve.variants[0].layers[0].liaisons[0].variable.nom, 'autre');
});

test('les codes de la portée sont ceux que les contrôles émettent', () => {
  assert.equal(CODES_DE_LA_PORTEE.length, 15);
  assert.ok(CODES_DE_LA_PORTEE.includes('C29') && CODES_DE_LA_PORTEE.includes('C81'));
});
