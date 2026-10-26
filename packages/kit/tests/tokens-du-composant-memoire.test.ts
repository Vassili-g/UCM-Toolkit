/**
 * `axesDuReleve` et `tokensDuComposant` se calculent une fois par couple relevé et catalogue : même sortie que le calcul
 * d'avant, résultats gelés, mémoire écartée dès qu'une entrée change, et un seul passage sur les noms.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  axeDePropriete, axesDuReleve, controlerCouches, controlerLAccessibilite, controlerLaStructure, controlerLaTypographie, controlerLeTheme, controlerMapping, controlerNommage, controlerOublis,
  proposerLaPropagation, proposerLesCorrections, tokensDuComposant,
  type AxeDuComposant, type CatalogueDeReference, type ReleveDeComposant, type TokenDuComposant, type VariableDuCatalogue,
} from '../src/controles/index.js';
import type { ProprieteDAxe } from '../src/controles/nommage.js';
import { FAMILLES_PRIMITIVES } from '../src/referentiel/architecture.js';
import { reconnaitreLeChemin } from '../src/referentiel/grammaire.js';
import { formeReconnue, termeReconnu } from '../src/referentiel/reconnaissance.js';

/** Le calcul d'avant la mémoire, copié tel quel : l'oracle de parité. */
function axesDeReference(releve: ReleveDeComposant): Partial<Record<AxeDuComposant, ProprieteDAxe>> {
  const axes: Partial<Record<AxeDuComposant, ProprieteDAxe>> = {};
  for (const propriete of releve.proprietes) {
    if (propriete.type !== 'VARIANT') continue;
    const axe = axeDePropriete(propriete.nom);
    if (axe && !axes[axe]) axes[axe] = propriete;
  }
  return axes;
}

function tokensDeReference(releve: ReleveDeComposant, catalogue: CatalogueDeReference): TokenDuComposant[] {
  const axes = axesDeReference(releve);
  return catalogue.variables.flatMap((variable) => {
    const collection = catalogue.collections.find((entree) => entree.cle === variable.collection);
    if (collection?.role !== 'components') return [];
    const segments = variable.nom.split('/');
    if (formeReconnue(segments[0]) !== formeReconnue(releve.jeu.nom)) return [];
    const pourLaGrammaire = [...segments];
    if (termeReconnu(FAMILLES_PRIMITIVES, segments[1])?.id === 'color') pourLaGrammaire[1] = 'color';
    const lire = (axesSupplementaires: Record<string, readonly string[]> = {}) => reconnaitreLeChemin('components', pourLaGrammaire, {
      themes: 'chemin',
      axes: { ...Object.fromEntries(Object.entries(axes).map(([axe, propriete]) => [axe, propriete.valeurs ?? []])), ...axesSupplementaires },
    });
    let reconnu = lire();
    if (!reconnu.conforme && axes.style) {
      for (const segment of segments.slice(2)) {
        reconnu = lire({ style: [...(axes.style.valeurs ?? []), segment] });
        if (reconnu.conforme) break;
      }
    }
    return [{ variable, segments, lecture: reconnu.conforme ? reconnu.segments : [] }];
  });
}

const modes = [{ id: 'light', nom: 'Light' }, { id: 'dark', nom: 'Dark' }];
const collection = (cle: string, role: 'theme' | 'components' | 'layout' | 'brands', nom = cle): CatalogueDeReference['collections'][number] => ({ cle, nom, role, modes, etat: 'lue' });
const variable = (cle: string, nom: string, collectionDe = 'components', type: VariableDuCatalogue['type'] = 'COLOR', extra: Partial<VariableDuCatalogue> = {}): VariableDuCatalogue =>
  ({ cle, nom, collection: collectionDe, type, etat: 'presente', ...extra });
const axe = (nom: string, valeurs: string[]): ReleveDeComposant['proprietes'][number] => ({ nom, type: 'VARIANT', valeurs, defaut: valeurs[0] });

function releve(nom: string, proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant {
  return { version: 1, jeu: { cle: nom, id: nom, nom }, proprietes, variants: [], lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb' };
}

/** Deux variants d'un layer lié à la première variable du composant, pour que la propagation et les couches aient de quoi lire. */
function avecDesVariants(base: ReleveDeComposant, catalogue: CatalogueDeReference): ReleveDeComposant {
  const lie = catalogue.variables.find((candidate) => catalogue.collections.some((entree) => entree.cle === candidate.collection && entree.role === 'components'));
  const layer = (id: string) => ({
    id, nom: 'container', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [{ champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }],
    valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }],
    liaisons: lie ? [{ champ: 'fills', indice: 0, porteur: id, variable: { id: lie.cle, cle: lie.cle, nom: lie.nom, collection: lie.collection, distante: false } }] : [],
  });
  const valeurs = (i: number) => Object.fromEntries(base.proprietes.map((propriete) => [propriete.nom, propriete.valeurs?.[i % (propriete.valeurs?.length || 1)] ?? '']));
  return { ...base, variants: [0, 1].map((i) => ({ id: i === 0 ? 'm' : 'v', nom: `v${i}`, valeurs: valeurs(i), modesEffectifs: {}, layers: [layer(`l${i}`)] })) };
}

interface Cas { nom: string; fabriquer(): { releve: ReleveDeComposant; catalogue: CatalogueDeReference } }

/** Les formes de noms et d'axes que lisent les tests des contrôles, de la propagation, de la structure et de C29. */
const CAS: Cas[] = [
  {
    nom: 'Alert, forme tolérée colors et axes Severity et Variant',
    fabriquer: () => {
      const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [collection('components', 'components'), collection('layout', 'layout'), collection('theme', 'theme')], variables: [
        variable('k-info', 'alert/colors/info/standard/background'), variable('k-error', 'alert/colors/error/outlined/background'), variable('k-warning', 'alert/color/warning/standard/background'),
        variable('k-pad', 'alert/size/padding-x', 'components', 'FLOAT', { valeurs: { light: { valeur: 8 } } }), variable('k-autre', 'Button/color/primary/background'),
        variable('k-layout', 'layout/sizing/8', 'layout', 'FLOAT'), variable('k-theme', 'alert/surface/default', 'theme'),
      ] };
      return { catalogue, releve: avecDesVariants(releve('Alert', [axe('Severity', ['info', 'error']), axe('Variant', ['standard', 'outlined'])]), catalogue) };
    },
  },
  {
    nom: 'Button UCM, palette, style et état, avec thème et marques',
    fabriquer: () => {
      const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [collection('theme', 'theme'), collection('components', 'components'), collection('brands', 'brands')], variables: [
        variable('surface-fg', 'success/surface/foreground', 'theme', 'COLOR', { scopes: ['TEXT_FILL'] }),
        variable('primary', 'Button/color/primary/contained/default/background', 'components', 'COLOR', { valeurs: { light: { alias: 'theme-primary' } } }),
        variable('secondary', 'Button/color/secondary/contained/default/background', 'components', 'COLOR', { valeurs: { light: { alias: 'brand-secondary' } } }),
        variable('ring', 'Button/color/tertiary/contained/default/ring', 'components', 'COLOR', { valeurs: { dark: { valeur: null } } }),
        variable('theme-primary', 'primary/solid/default', 'theme'), variable('theme-secondary', 'secondary/solid/default', 'theme'), variable('brand-secondary', 'secondary/light/700', 'brands'),
      ] };
      return { catalogue, releve: avecDesVariants(releve('Button', [axe('Palette', ['primary', 'secondary', 'tertiary']), axe('Style', ['contained']), axe('State', ['default'])]), catalogue) };
    },
  },
  {
    nom: 'axe de style qui n’épuise pas ses valeurs : le segment candidat complète la grammaire',
    fabriquer: () => {
      const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [collection('components', 'components')], variables: [
        variable('a', 'button/color/primary/outlined/default/background'), variable('b', 'button/color/primary/contained/default/background'), variable('c', 'button/color/primary/ghost/hover/border'),
      ] };
      return { catalogue, releve: avecDesVariants(releve('Button', [axe('Palette', ['primary']), axe('Style', ['contained']), axe('State', ['default', 'hover']), { nom: 'Label', type: 'TEXT', valeurs: undefined, defaut: 'Ok' } as never]), catalogue) };
    },
  },
  {
    nom: 'Alert C29, sans axe, tailles FLOAT mêlées aux couleurs et aux chaînes',
    fabriquer: () => {
      const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [collection('components', 'components'), collection('layout', 'layout')], variables: [
        variable('radius-13', 'alert/size/radius', 'components', 'FLOAT', { valeurs: { Light: { valeur: 13 } } }), variable('size-8', 'alert/size/padding-x', 'components', 'FLOAT', { valeurs: { Light: { valeur: 8 } } }),
        variable('fond', 'alert/color/info/background', 'components', 'COLOR', { etat: 'non-chargee' }), variable('titre', 'alert/typography/title', 'components', 'STRING'),
        variable('layout-8', 'layout/sizing/8', 'layout', 'FLOAT'),
      ] };
      return { catalogue, releve: avecDesVariants(releve('Alert'), catalogue) };
    },
  },
  {
    nom: 'premiers segments qui ne diffèrent que par la casse ou le séparateur',
    fabriquer: () => {
      const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [collection('components', 'components')], variables: [
        variable('1', 'Button/color/primary/background'), variable('2', 'button/color/primary/background'), variable('3', 'BUTTON/color/primary/background'), variable('4', 'Icon-Button/color/primary/background'),
        variable('5', 'icon_button/color/primary/background'), variable('6', 'IconButton/size/md/padding-x', 'components', 'FLOAT'),
      ] };
      return { catalogue, releve: avecDesVariants(releve('Icon Button', [axe('Size', ['md'])]), catalogue) };
    },
  },
  {
    nom: 'bords : clé de collection en double, collection sans rôle, nom sans séparateur, nom vide, nom qui commence par une barre (aucun ne porte le nom du jeu : le calcul d’avant lève alors)',
    fabriquer: () => {
      const catalogue: CatalogueDeReference = {
        version: 1, library: null,
        collections: [collection('components', 'components'), { ...collection('components', 'layout'), nom: 'doublon' }, { cle: 'libre', nom: 'libre', role: null, modes: [], etat: 'lue' }],
        variables: [variable('1', 'card'), variable('2', ''), variable('3', '/button/color/primary/background'), variable('4', 'button/color/primary/background'), variable('5', 'button/color/primary/background', 'libre'), variable('6', 'button/color', 'inconnue')],
      };
      return { catalogue, releve: avecDesVariants(releve('button', [axe('Palette', ['primary'])]), catalogue) };
    },
  },
  {
    nom: 'jeu au nom vide',
    fabriquer: () => {
      const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [collection('components', 'components')], variables: [variable('1', 'x/y'), variable('2', '/x'), variable('3', '/')] };
      return { catalogue, releve: releve('') };
    },
  },
];

function figer<T>(valeur: T): T {
  if (valeur !== null && typeof valeur === 'object' && !Object.isFrozen(valeur)) {
    Object.freeze(valeur);
    for (const enfant of Object.values(valeur)) figer(enfant);
  }
  return valeur;
}

test('à froid puis à chaud, tokensDuComposant et axesDuReleve rendent ce que rendait le calcul d’avant, dans le même ordre', () => {
  let nonVide = 0;
  for (const { nom, fabriquer } of CAS) {
    const { releve: r, catalogue } = fabriquer();
    const attendu = tokensDeReference(r, catalogue);
    const attendusAxes = axesDeReference(r);
    const froid = tokensDuComposant(r, catalogue);
    assert.deepEqual(froid, attendu, `${nom} : à froid`);
    assert.deepEqual(axesDuReleve(r), attendusAxes, `${nom} : axes`);
    const chaud = tokensDuComposant(r, catalogue);
    assert.equal(chaud, froid, `${nom} : le résultat mémorisé est rendu`);
    assert.deepEqual(chaud, attendu, `${nom} : à chaud`);
    // Un relevé copié garde le tableau `proprietes` : même entrée.
    assert.equal(tokensDuComposant({ ...r }, catalogue), froid, `${nom} : relevé copié`);
    if (attendu.length > 0) nonVide += 1;
  }
  assert.ok(nonVide >= 5, 'le corpus produit des tokens');
});

test('le tableau rendu, le tableau segments de chaque token et les axes sont gelés', () => {
  const { releve: r, catalogue } = CAS[1].fabriquer();
  const tokens = tokensDuComposant(r, catalogue);
  assert.ok(tokens.length > 0);
  assert.ok(Object.isFrozen(tokens));
  for (const token of tokens) assert.ok(Object.isFrozen(token.segments));
  assert.ok(Object.isFrozen(axesDuReleve(r)));
  assert.throws(() => tokens.push(tokens[0]), TypeError);
  assert.throws(() => { tokens[0].segments[0] = 'x'; }, TypeError);
});

test('sur un relevé et un catalogue gelés en profondeur, les contrôles, les corrections et la propagation n’écrivent nulle part', () => {
  for (const { nom, fabriquer } of CAS) {
    const { releve: r, catalogue } = fabriquer();
    figer(r);
    figer(catalogue);
    const controles: Array<[string, () => unknown]> = [
      ['nommage', () => controlerNommage(r, catalogue)], ['mapping', () => controlerMapping(r, catalogue)], ['couches', () => controlerCouches(r, catalogue)], ['oublis', () => controlerOublis(r, catalogue)],
      ['accessibilité', () => controlerLAccessibilite(r, catalogue, { niveau: 'AA' })], ['typographie', () => controlerLaTypographie(r, catalogue)], ['thème', () => controlerLeTheme(r, catalogue)], ['structure', () => controlerLaStructure(r, catalogue)],
      ['corrections', () => proposerLesCorrections(r, catalogue, controlerNommage(r, catalogue))], ['propagation', () => proposerLaPropagation(r, catalogue, 'm')],
    ];
    for (const [controle, lancer] of controles) assert.doesNotThrow(lancer, `${nom} : ${controle}`);
  }
});

test('un tableau de variables remplacé, une variable ajoutée ou retirée, des collections changées écartent la mémoire', () => {
  const { releve: r, catalogue } = CAS[0].fabriquer();
  const avant = tokensDuComposant(r, catalogue);
  catalogue.variables = catalogue.variables.filter((entree) => entree.cle !== 'k-info');
  const remplace = tokensDuComposant(r, catalogue);
  assert.notEqual(remplace, avant);
  assert.deepEqual(remplace, tokensDeReference(r, catalogue));
  assert.equal(remplace.length, avant.length - 1);

  catalogue.variables.push(variable('k-nouvelle', 'alert/color/info/standard/border'));
  const ajoutee = tokensDuComposant(r, catalogue);
  assert.notEqual(ajoutee, remplace);
  assert.deepEqual(ajoutee, tokensDeReference(r, catalogue));
  assert.ok(ajoutee.some((token) => token.variable.cle === 'k-nouvelle'));

  catalogue.collections = [collection('components', 'layout')];
  assert.deepEqual(tokensDuComposant(r, catalogue), []);
  catalogue.collections.push(collection('autre', 'components'));
  assert.deepEqual(tokensDuComposant(r, catalogue), tokensDeReference(r, catalogue));
});

test('un autre nom de jeu, un autre tableau proprietes ou un tableau qui s’allonge donnent leur propre résultat, sans perdre le premier', () => {
  const { releve: r, catalogue } = CAS[4].fabriquer();
  const premier = tokensDuComposant(r, catalogue);
  const autreJeu = { ...r, jeu: { ...r.jeu, nom: 'Button' } };
  const pourButton = tokensDuComposant(autreJeu, catalogue);
  assert.notEqual(pourButton, premier);
  assert.deepEqual(pourButton, tokensDeReference(autreJeu, catalogue));
  assert.equal(tokensDuComposant(r, catalogue), premier);

  const autresAxes = { ...r, proprietes: [axe('Size', ['md', 'lg'])] };
  assert.deepEqual(axesDuReleve(autresAxes), axesDeReference(autresAxes));
  assert.deepEqual(tokensDuComposant(autresAxes, catalogue), tokensDeReference(autresAxes, catalogue));
  assert.equal(tokensDuComposant(r, catalogue), premier);

  r.proprietes.push(axe('Palette', ['primary']));
  assert.deepEqual(axesDuReleve(r), axesDeReference(r));
  assert.deepEqual(tokensDuComposant(r, catalogue), tokensDeReference(r, catalogue));
});

test('deux catalogues indépendants ne partagent aucune entrée', () => {
  const premier = CAS[0].fabriquer();
  const second = CAS[0].fabriquer();
  const a = tokensDuComposant(premier.releve, premier.catalogue);
  const b = tokensDuComposant(second.releve, second.catalogue);
  assert.notEqual(a, b);
  assert.deepEqual(a, b);
  second.catalogue.variables = second.catalogue.variables.slice(0, 1);
  assert.deepEqual(tokensDuComposant(second.releve, second.catalogue), tokensDeReference(second.releve, second.catalogue));
  assert.equal(tokensDuComposant(premier.releve, premier.catalogue), a);
  // Le même catalogue lu avec un autre relevé (autre tableau proprietes) garde son entrée pour le premier.
  assert.deepEqual(tokensDuComposant(second.releve, premier.catalogue), a);
});

test('cinq appels, comme les cinq sites de contrôle d’une analyse, lisent chaque nom une fois et parcourent proprietes une fois', () => {
  const N = 40;
  const lectures = { noms: 0, proprietes: 0 };
  const compteur = (cle: string, nom: string): VariableDuCatalogue => {
    const v = variable(cle, nom);
    return Object.defineProperty({ ...v, nom: undefined as never }, 'nom', { enumerable: true, get() { lectures.noms += 1; return nom; } });
  };
  const fabriquer = () => {
    lectures.noms = 0;
    lectures.proprietes = 0;
    const proprietes = [axe('Palette', ['primary', 'secondary']), axe('Style', ['contained']), axe('State', ['default'])];
    const iterateur = proprietes[Symbol.iterator].bind(proprietes);
    Object.defineProperty(proprietes, Symbol.iterator, { value: () => { lectures.proprietes += 1; return iterateur(); } });
    const catalogue: CatalogueDeReference = {
      version: 1, library: null, collections: [collection('components', 'components')],
      variables: Array.from({ length: N }, (_, i) => compteur(`k${i}`, `Button/color/${i % 2 ? 'primary' : 'secondary'}/contained/default/part-${i}`)),
    };
    return { releve: releve('Button', proprietes), catalogue };
  };

  const ancien = fabriquer();
  for (let i = 0; i < 5; i += 1) tokensDeReference(ancien.releve, ancien.catalogue);
  assert.equal(lectures.noms, 5 * N);
  assert.equal(lectures.proprietes, 5);

  const { releve: r, catalogue } = fabriquer();
  for (let i = 0; i < 5; i += 1) {
    tokensDuComposant(r, catalogue);
    axesDuReleve(r);
  }
  assert.equal(lectures.noms, N);
  assert.equal(lectures.proprietes, 1);
});
