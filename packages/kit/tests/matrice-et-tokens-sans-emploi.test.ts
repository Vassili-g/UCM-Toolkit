/**
 * Lot E7b : la borne de 4 096 combinaisons et le plafond de 200 constats de C31 (Q-F5-7, E-44), une valeur répétée (N-38), le coût de
 * la matrice (N-41), C32 `nom-illisible` (Q-F5-8, N-39), la liaison illisible (E-33) et la palette hors registre (N-40).
 * Les variants s'écrivent en toutes lettres (`Size=Small`), les tokens en abrégé (`sm`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerOublis, controlerOublisParEtapes,
  type CatalogueDeReference, type Constat, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariableDuCatalogue, type VariantLu,
} from '../src/controles/index.js';

type Axe = readonly [nom: string, valeurs: readonly string[]];

function produit(axes: readonly Axe[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>((debut, [nom, valeurs]) => debut.flatMap((partiel) => valeurs.map((valeur) => ({ ...partiel, [nom]: valeur }))), [{}]);
}

const dimensions = { x: 0, y: 0, largeur: 100, hauteur: 40 };
const layer = (id: string, nom: string, liaisons: LiaisonLue[] = []): LayerLu => ({
  id, nom, type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions, peintures: [], liaisons, valeursEnDur: [],
});

function releve(axes: readonly Axe[], variants: readonly Record<string, string>[], layers: (rang: number) => LayerLu[] = () => []): ReleveDeComposant {
  const lus: VariantLu[] = variants.map((valeurs, rang) => ({
    id: `v${rang}`, nom: Object.entries(valeurs).map(([nom, valeur]) => `${nom}=${valeur}`).join(', '), valeurs, modesEffectifs: {}, layers: layers(rang),
  }));
  return {
    version: 1, jeu: { cle: 'button', id: 'button', nom: 'Button' },
    proprietes: axes.map(([nom, valeurs]) => ({ nom, type: 'VARIANT' as const, valeurs: [...valeurs], defaut: valeurs[0] })),
    variants: lus, lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const jeton = (nom: string, type: VariableDuCatalogue['type'] = 'COLOR'): VariableDuCatalogue => ({ cle: nom, nom, collection: 'components', type, etat: 'presente' });

const catalogue = (variables: VariableDuCatalogue[] = []): CatalogueDeReference => ({
  version: 1, library: null,
  collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [{ id: 'l', nom: 'Light' }], etat: 'lue' }],
  variables,
});

const valeursNumerotees = (prefixe: string, nombre: number): string[] => Array.from({ length: nombre }, (_, rang) => `${prefixe}${rang + 1}`);
const MATRICE_16: readonly Axe[] = [['Axe1', valeursNumerotees('v', 16)], ['Axe2', valeursNumerotees('v', 16)], ['Axe3', valeursNumerotees('v', 16)]];
const deC31 = (constats: readonly Constat[]): Constat[] => constats.filter(({ code }) => code === 'C31');
const absents = (constats: readonly Constat[]): Constat[] => deC31(constats).filter(({ type }) => type === 'verifier');
const informations = (constats: readonly Constat[]): Constat[] => deC31(constats).filter(({ type }) => type === 'info');

// ---------------------------------------------------------------------------------------------------------------------------
// E7.5 : la borne, le plafond, la valeur répétée

test('E7.5 : au-delà de 4 096 combinaisons, une information donne le total et le nombre de variants, sans constat de variant absent', () => {
  const axes: readonly Axe[] = [['Axe1', valeursNumerotees('v', 17)], ['Axe2', valeursNumerotees('v', 16)], ['Axe3', valeursNumerotees('v', 16)]];
  const variants = produit(axes).slice(0, 800);
  const constats = controlerOublis(releve(axes, variants), catalogue());
  assert.deepEqual(absents(constats), []);
  const [information, ...autres] = informations(constats);
  assert.deepEqual(autres, []);
  assert.equal(information.id, 'C31:au-dela-de-la-borne');
  assert.equal(information.famille, 'variants');
  assert.deepEqual(information.faits, { genre: 'au-dela-de-la-borne', variants: 800, combinaisons: 4352 });
});

test('E7.5 : à 4 096 combinaisons exactement, la matrice se contrôle : 200 constats, puis une ligne qui compte les autres', () => {
  const constats = controlerOublis(releve(MATRICE_16, []), catalogue());
  const manquants = absents(constats);
  assert.equal(manquants.length, 200);
  assert.equal(new Set(manquants.map(({ id }) => id)).size, 200);
  assert.deepEqual(manquants[0].faits, { Axe1: 'v1', Axe2: 'v1', Axe3: 'v1' });
  assert.deepEqual(manquants[199].faits, { Axe1: 'v1', Axe2: 'v13', Axe3: 'v8' });
  const [ligne, ...autres] = informations(constats);
  assert.deepEqual(autres, []);
  assert.equal(ligne.id, 'C31:et-autres');
  assert.deepEqual(ligne.faits, { genre: 'et-autres', autres: 3896 });
  assert.equal(constats.at(-1), ligne);
});

test('E7.5 : 200 variants absents donnent 200 constats, 201 donnent 200 constats et « et 1 autre »', () => {
  const axes: readonly Axe[] = [['Axe1', valeursNumerotees('v', 201)]];
  const tous = produit(axes);
  const a200 = controlerOublis(releve(axes, tous.slice(0, 1)), catalogue());
  assert.equal(absents(a200).length, 200);
  assert.deepEqual(informations(a200), []);
  const a201 = controlerOublis(releve(axes, []), catalogue());
  assert.equal(absents(a201).length, 200);
  assert.deepEqual(informations(a201).map(({ faits }) => faits), [{ genre: 'et-autres', autres: 1 }]);
});

test('E7.5 : sous la borne, trois variants absents donnent trois constats et aucune information', () => {
  const axes: readonly Axe[] = [['Style', ['Solid', 'Subtle']], ['Size', ['Small', 'Medium']]];
  const constats = controlerOublis(releve(axes, produit(axes).slice(0, 1)), catalogue());
  assert.deepEqual(absents(constats).map(({ id }) => id), ['C31:Style=Solid,Size=Medium', 'C31:Style=Subtle,Size=Small', 'C31:Style=Subtle,Size=Medium']);
  assert.deepEqual(informations(constats), []);
});

test('N-38 : une valeur répétée dans un axe ne donne qu’un constat de variant absent', () => {
  const axes: readonly Axe[] = [['Size', ['Small', 'Medium', 'Small']], ['Style', ['Solid', 'Subtle']]];
  const presents = produit([['Size', ['Small', 'Medium']], ['Style', ['Solid', 'Subtle']]]).slice(1);
  const manquants = absents(controlerOublis(releve(axes, presents), catalogue()));
  assert.deepEqual(manquants.map(({ id }) => id), ['C31:Size=Small,Style=Solid']);
});

test('N-38 : la valeur répétée compte une fois dans le total, donc 16 x 16 x 16 reste sous la borne', () => {
  const axes: readonly Axe[] = [['Axe1', [...valeursNumerotees('v', 16), 'v1']], ['Axe2', valeursNumerotees('v', 16)], ['Axe3', valeursNumerotees('v', 16)]];
  const constats = controlerOublis(releve(axes, []), catalogue());
  assert.equal(absents(constats).length, 200);
  assert.deepEqual(informations(constats).map(({ faits }) => faits), [{ genre: 'et-autres', autres: 3896 }]);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E7.8 : le coût de la matrice

test('N-41 : la matrice de 16 x 16 x 16 variants se contrôle en moins de 50 000 étapes (17 367 575 avant le lot)', () => {
  const variants = produit(MATRICE_16);
  assert.equal(variants.length, 4096);
  const calcul = controlerOublisParEtapes(releve(MATRICE_16, variants), catalogue());
  let etapes = 0;
  let etape = calcul.next();
  while (!etape.done) {
    etapes += 1;
    etape = calcul.next();
  }
  assert.deepEqual(etape.value, []);
  assert.ok(etapes < 50_000, `${etapes} étapes`);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Les tokens d'un composant à deux axes : Color (Primary, Danger) et Size (Small, Medium)

const AXES_DU_BOUTON: readonly Axe[] = [['Color', ['Primary', 'Danger']], ['Size', ['Small', 'Medium']]];
const palette = (valeur: string): string => valeur.toLowerCase();
const abrege = (valeur: string): string => (valeur === 'Small' ? 'sm' : 'md');
const TOKENS_DE_COULEUR = AXES_DU_BOUTON[0][1].flatMap((couleur) => AXES_DU_BOUTON[1][1].map((taille) => `button/color/${palette(couleur)}/${abrege(taille)}/background`));
const liaison = (variable: string, champ = 'fills'): LiaisonLue => ({ champ, porteur: 'racine', variable: { id: variable, cle: variable, nom: variable, collection: 'components', distante: false } });
const illisible = (champ: string): LiaisonLue => ({ champ, porteur: 'racine', illisible: true, variable: { id: 'VariableID:9:9', cle: '', nom: '', collection: '', distante: false } });

/** Le bouton à quatre variants : la racine du premier variant porte `liaisons`, et la couche `Label` existe dans chaque variant. */
function bouton(liaisons: LiaisonLue[], variables: VariableDuCatalogue[]): { releve: ReleveDeComposant; catalogue: CatalogueDeReference } {
  return {
    releve: releve(AXES_DU_BOUTON, produit(AXES_DU_BOUTON), (rang) => [layer('racine', 'Root', rang === 0 ? liaisons : []), layer('etiquette', 'Label')]),
    catalogue: catalogue(variables),
  };
}
const tousLies = (): LiaisonLue[] => TOKENS_DE_COULEUR.map((nom) => liaison(nom));
const deC32 = (constats: readonly Constat[]): [string, unknown][] => constats.filter(({ code }) => code === 'C32').map(({ faits }) => [String(faits.token), faits.motif]);

test('contrôle : un bouton dont tous les tokens sont liés ne donne aucun constat', () => {
  const { releve: r, catalogue: c } = bouton(tousLies(), TOKENS_DE_COULEUR.map((nom) => jeton(nom)));
  assert.deepEqual(controlerOublis(r, c), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E7.6 : C32 `nom-illisible`

test('E7.6 : un token dont le nom ne se lit pas donne C32 nom-illisible, à vérifier', () => {
  const illisibles = ['button/color/primary/sm/glow', 'button/colours'];
  const { releve: r, catalogue: c } = bouton(tousLies(), [...TOKENS_DE_COULEUR, ...illisibles].map((nom) => jeton(nom)));
  const constats = controlerOublis(r, c).filter(({ code }) => code === 'C32');
  assert.deepEqual(constats.map(({ id, type, famille, faits }) => [id, type, famille, faits]), illisibles.map((nom) => [
    `C32:${nom}`, 'verifier', 'tokens', { token: nom, motif: 'nom-illisible' },
  ]));
});

test('E7.6 : un token d’un autre composant n’est pas un token de Button, donc il ne donne rien', () => {
  const { releve: r, catalogue: c } = bouton(tousLies(), [...TOKENS_DE_COULEUR, 'BtnPrimary/color/primary/sm/background'].map((nom) => jeton(nom)));
  assert.deepEqual(controlerOublis(r, c), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E-33 : une liaison illisible n'accuse pas un token

const TOKEN_SANS_LAYER = 'button/color/primary/sm/border';
const TOKEN_DE_TAILLE = 'button/size/sm/gap';
const variablesAvecLesDeuxTokens = (): VariableDuCatalogue[] => [...TOKENS_DE_COULEUR.map((nom) => jeton(nom)), jeton(TOKEN_SANS_LAYER), jeton(TOKEN_DE_TAILLE, 'FLOAT')];

test('E-33 : sans liaison illisible, un token de couleur et un token de taille que nul layer ne lie sont inutilisés', () => {
  const { releve: r, catalogue: c } = bouton(tousLies(), variablesAvecLesDeuxTokens());
  assert.deepEqual(deC32(controlerOublis(r, c)), [[TOKEN_SANS_LAYER, 'inutilise'], [TOKEN_DE_TAILLE, 'inutilise']]);
});

test('E-33 : une liaison illisible sur un remplissage ne laisse accuser aucun token de couleur, mais accuse encore le token de taille', () => {
  const { releve: r, catalogue: c } = bouton([...tousLies(), illisible('fills')], variablesAvecLesDeuxTokens());
  assert.deepEqual(deC32(controlerOublis(r, c)), [[TOKEN_DE_TAILLE, 'inutilise']]);
});

test('E-33 : une liaison illisible sur une largeur ne laisse accuser aucun token de taille, mais accuse encore le token de couleur', () => {
  const { releve: r, catalogue: c } = bouton([...tousLies(), illisible('width')], variablesAvecLesDeuxTokens());
  assert.deepEqual(deC32(controlerOublis(r, c)), [[TOKEN_SANS_LAYER, 'inutilise']]);
});

test('E-33 : une liaison illisible dans une plage de texte compte comme sur le layer', () => {
  const { releve: r, catalogue: c } = bouton(tousLies(), [...TOKENS_DE_COULEUR.map((nom) => jeton(nom)), jeton(TOKEN_SANS_LAYER)]);
  const plage = { debut: 0, fin: 3, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [illisible('fills')] };
  r.variants[1].layers[1].texte = { style: null, plages: [plage] };
  assert.deepEqual(deC32(controlerOublis(r, c)), []);
});

test('E-33 : une liaison illisible dans un variant de wrapper compte comme sur le layer', () => {
  const { releve: r, catalogue: c } = bouton(tousLies(), [...TOKENS_DE_COULEUR.map((nom) => jeton(nom)), jeton(TOKEN_SANS_LAYER)]);
  r.wrappers = [{ id: 'w', cle: 'w', nom: 'Wrapper', proprietes: [], variants: [{ id: 'w1', nom: 'w1', valeurs: {}, liaisons: [illisible('fills')] }] }];
  assert.deepEqual(deC32(controlerOublis(r, c)), []);
});

test('E-33 : une liaison illisible sur un champ de typographie ne protège aucun token du composant', () => {
  const { releve: r, catalogue: c } = bouton([...tousLies(), illisible('fontSize')], variablesAvecLesDeuxTokens());
  assert.deepEqual(deC32(controlerOublis(r, c)), [[TOKEN_SANS_LAYER, 'inutilise'], [TOKEN_DE_TAILLE, 'inutilise']]);
});

test('E-33 : une liaison illisible ne masque pas un token sans variant', () => {
  const sansVariant = 'button/color/primary/xl/background';
  const { releve: r, catalogue: c } = bouton([...tousLies(), illisible('fills')], [...TOKENS_DE_COULEUR.map((nom) => jeton(nom)), jeton(sansVariant)]);
  assert.deepEqual(deC32(controlerOublis(r, c)), [[sansVariant, 'sans-variant']]);
});

// ---------------------------------------------------------------------------------------------------------------------------
// N-40 : une palette hors registre

test('N-40 : un segment qui ne désigne aucun layer, à la place d’une palette, nomme une palette sans variant', () => {
  const tertiaire = 'button/color/tertiary/solid/sm/background';
  const { releve: r, catalogue: c } = bouton(tousLies(), [...TOKENS_DE_COULEUR, tertiaire].map((nom) => jeton(nom)));
  assert.deepEqual(deC32(controlerOublis(r, c)), [[tertiaire, 'sans-variant']]);
});

test('N-40 : un segment qui désigne un layer du composant est un élément, donc le token n’est qu’inutilisé', () => {
  const element = 'button/color/label/solid/sm/background';
  const { releve: r, catalogue: c } = bouton(tousLies(), [...TOKENS_DE_COULEUR, element].map((nom) => jeton(nom)));
  assert.deepEqual(deC32(controlerOublis(r, c)), [[element, 'inutilise']]);
});

test('N-40 : sans axe de palette, le même segment reste un élément', () => {
  const axes: readonly Axe[] = [['Size', ['Small', 'Medium']]];
  const tertiaire = 'button/color/tertiary/solid/sm/background';
  const r = releve(axes, produit(axes), () => [layer('racine', 'Root')]);
  assert.deepEqual(deC32(controlerOublis(r, catalogue([jeton(tertiaire)]))), [[tertiaire, 'inutilise']]);
});
