/** C21 compare les alias de tous les modes d'un token, non le premier trouvé. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerMapping,
  type CatalogueDeReference, type LayerLu, type PeintureLue, type ReleveDeComposant, type VariableDuCatalogue, type VariantLu,
} from '../src/controles/index.js';

const peinture: PeintureLue = { champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0, g: 0, b: 0, a: 1 } };

function layerLie(id: string, nom: string): LayerLu {
  return {
    id, nom: 'Fond', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 },
    peintures: [peinture], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: 'instance', variable: { id: `id:${nom}`, cle: nom, nom, collection: 'components', distante: true } }],
  };
}

/** Un variant par token, tous portés par un layer homonyme. */
function releve(tokens: string[]): ReleveDeComposant {
  const variants: VariantLu[] = tokens.map((nom, i) => ({ id: `v${i}`, nom: `v${i}`, valeurs: {}, layers: [layerLie(`l${i}`, nom)], modesEffectifs: {} }));
  return {
    version: 1, jeu: { cle: 'button', id: 'jeu', nom: 'Button' }, proprietes: [], variants,
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const TOKENS = ['button/a/background', 'button/b/background', 'button/c/background'];

function catalogue(dark: Record<string, string>, ordre: 'light-dark' | 'dark-light'): CatalogueDeReference {
  const theme = ['theme/primary', 'theme/secondary'].map((nom): VariableDuCatalogue => ({ cle: nom, nom, collection: 'theme', type: 'COLOR', etat: 'presente' }));
  const composants = TOKENS.map((nom): VariableDuCatalogue => {
    const light = { alias: 'theme/primary' };
    const sombre = { alias: dark[nom] ?? 'theme/primary' };
    return {
      cle: nom, nom, collection: 'components', type: 'COLOR', etat: 'presente',
      valeurs: ordre === 'light-dark' ? { light, dark: sombre } : { dark: sombre, light },
    };
  });
  return {
    version: 1, library: null,
    collections: [
      { cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' },
      { cle: 'theme', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
    ],
    variables: [...theme, ...composants],
  };
}

const c21 = (cat: CatalogueDeReference) => controlerMapping(releve(TOKENS), cat).filter((constat) => constat.code === 'C21');

test('C21 voit l’écart d’un token qui vise un autre rôle en Dark', () => {
  const constats = c21(catalogue({ 'button/c/background': 'theme/secondary' }, 'light-dark'));
  assert.deepEqual(constats.map(({ faits }) => faits.nom), ['button/c/background']);
});

test('C21 rend le même résultat quel que soit l’ordre des modes', () => {
  const dark = { 'button/c/background': 'theme/secondary' };
  const droit = c21(catalogue(dark, 'light-dark'));
  const inverse = c21(catalogue(dark, 'dark-light'));
  assert.equal(inverse.length, 1);
  assert.deepEqual(inverse, droit);
});

test('C21 ne signale rien quand les trois tokens visent les mêmes rôles dans tous les modes', () => {
  assert.deepEqual(c21(catalogue({}, 'light-dark')), []);
});

/** Un anneau de focus lié par variant : `Button/Color/<couleur>/<variant>/Focus/ring`, qui renvoie à `cible`. */
interface Anneau { couleur: string; variant: string; cible: string; valeurs?: Record<string, string> }

function anneaux(liste: Anneau[]): { releve: ReleveDeComposant; catalogue: CatalogueDeReference } {
  const jetons = liste.map(({ couleur, variant }) => `Button/Color/${couleur}/${variant}/Focus/ring`);
  const variants: VariantLu[] = liste.map(({ couleur, variant, valeurs }, i) => ({
    id: `v${i}`, nom: `v${i}`, valeurs: { Color: couleur, Variant: variant, State: 'Focus', ...valeurs },
    layers: [{
      id: `l${i}`, nom: 'Ring', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 },
      peintures: [], valeursEnDur: [],
      liaisons: [{ champ: 'strokes', indice: 0, porteur: 'instance', variable: { id: `id:${jetons[i]}`, cle: jetons[i], nom: jetons[i], collection: 'components', distante: true } }],
    }],
    modesEffectifs: {},
  }));
  const cibles = [...new Set(liste.map(({ cible }) => cible))];
  const theme = cibles.map((nom): VariableDuCatalogue => ({ cle: nom, nom, collection: 'theme', type: 'COLOR', etat: 'presente' }));
  const composants = liste.map((_, i): VariableDuCatalogue => ({
    cle: jetons[i], nom: jetons[i], collection: 'components', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: liste[i].cible } },
  }));
  return {
    releve: {
      version: 1, jeu: { cle: 'button', id: 'jeu', nom: 'Button' }, variants,
      proprietes: [
        { nom: 'Color', type: 'VARIANT', valeurs: ['Info', 'Success', 'Warning', 'Error', 'Primary', 'Secondary'], defaut: 'Primary' },
        { nom: 'Variant', type: 'VARIANT', valeurs: ['Contained', 'Outlined', 'Text'], defaut: 'Contained' },
        { nom: 'State', type: 'VARIANT', valeurs: ['Default', 'Focus'], defaut: 'Default' },
      ],
      lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
    },
    catalogue: {
      version: 1, library: null,
      collections: [
        { cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' },
        { cle: 'theme', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
      ],
      variables: [...theme, ...composants],
    },
  };
}

const VARIANTS = ['Contained', 'Outlined', 'Text'];
const juste = (couleur: string, cible: string): Anneau[] => VARIANTS.map((variant) => ({ couleur, variant, cible }));
const STATUTS = ['Info', 'Success', 'Warning', 'Error'].flatMap((statut) => juste(statut, `${statut}/Vivid/ring`));
const MARQUES = ['Primary', 'Secondary'].flatMap((marque) => juste(marque, `${marque}/ring`));
const c21De = ({ releve, catalogue }: ReturnType<typeof anneaux>) => controlerMapping(releve, catalogue).filter((constat) => constat.code === 'C21');

test('C21 ne vise pas une liaison dont le token porte les valeurs de son variant', () => {
  assert.deepEqual(c21De(anneaux([...STATUTS, ...MARQUES])), []);
});

test('C21 garde une liaison dont le token porte une autre valeur que celle de son variant', () => {
  const liste = [...STATUTS, ...MARQUES];
  liste[0] = { ...liste[0], cible: 'Primary/ring' };
  const sortie = anneaux(liste);
  sortie.releve.variants[0].valeurs.Color = 'Primary';
  assert.deepEqual(c21De(sortie).map(({ variants }) => variants), [['v0']]);
});

test('C21 garde une liaison dont le token n’a aucun segment d’axe', () => {
  const { releve, catalogue } = anneaux([...STATUTS, ...MARQUES]);
  const nom = 'Button/Color/ring';
  catalogue.variables.push({ cle: nom, nom, collection: 'components', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'Primary/ring' } } });
  releve.variants[0].layers[0].liaisons[0].variable = { id: `id:${nom}`, cle: nom, nom, collection: 'components', distante: true };
  assert.deepEqual(c21De({ releve, catalogue }).map(({ variants }) => variants), [['v0']]);
});
