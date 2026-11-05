/**
 * Les opérateurs de modes et de collections sur P0 : M1 (valeurs différentes par mode), M2 (mode effectif du variant), M3 (plusieurs
 * collections), M4 (chaînes d'alias), M5 (valeurs illisibles), M6 (repli par mode) et M7 (variable de library). Le produit des
 * modes porte sur les collections que les alias atteignent, tous modes confondus ; une étiquette de combinaison est la liste
 * `collection en mode` de ces collections, que l'oracle compare sans tenir compte de l'ordre des parties.
 */
import {
  attendusSurPageEtCarte, contrasteAttendu, fabrique, limiteAttendue, nomDeLaCible, PLAGE_DU_TEXTE, type AttenduAcc, type CasAccessibilite, type CauseAttendue,
} from './cas.js';
import { themeDuCatalogue, type ComposantDeContraste } from './composantDeContraste.js';
import type { ModeDeStress } from './couleursDeStress.js';
import { solide, type Degradation } from './degradation.js';
import { atteintLeSeuil, couleurDeHex, mesurerLaPaire, tronquerA2, type Couleur } from './oracleContraste.js';

const BLANC = '#FFFFFF';
const NOIR = '#000000';
const CLAIR = '#CCCCCC';
const blanc = couleurDeHex(BLANC);
const SEUIL_AA = 4.5;

/** Une combinaison : l'étiquette `collection en mode, …` et la couleur du texte et du fond qu'elle donne. */
interface Combinaison { readonly etiquette: string; readonly texte: string; readonly fond: string }

/** Le constat d'un texte sur un fond en dur dans chaque combinaison : le pire rapport, les autres échecs et tous les rapports. */
function constatDeModes(combinaisons: readonly Combinaison[], cible: string, ordonne = false): AttenduAcc[] {
  const mesures = combinaisons.map((c) => ({ c, m: mesurerLaPaire([couleurDeHex(c.texte)], [couleurDeHex(c.fond)], null)! }));
  const echecs = mesures.filter(({ m }) => !atteintLeSeuil(m.rapport, SEUIL_AA));
  if (echecs.length === 0) return [];
  const pire = echecs.reduce((a, b) => (b.m.rapport < a.m.rapport ? b : a));
  return [contrasteAttendu({
    usage: 'texte', layer: 'Texte', plage: PLAGE_DU_TEXTE, rapport: pire.m.rapport, seuil: SEUIL_AA, variants: [cible], premierPlan: pire.m.premierPlan, fondHex: pire.m.fond,
    mode: pire.c.etiquette, autresModes: echecs.length - 1, rapports: mesures.map(({ c, m }) => [c.etiquette, tronquerA2(m.rapport)] as const), rapportsOrdonnes: ordonne,
  })];
}

const limiteDuTexte = (cause: CauseAttendue, cible: string): AttenduAcc => limiteAttendue({ usage: 'texte', layer: 'Texte', cause, plage: PLAGE_DU_TEXTE, variants: [cible] });

/** Un texte noir dont la liaison de la plage 0 vise `variable`, sur la scène à racine en dur. */
function texteLie(d: Degradation, variable: Parameters<Degradation['lier']>[1], o: { fond?: Couleur } = {}): void {
  d.scene({ racineEnDur: true, ...(o.fond ? { fond: o.fond } : {}) });
  const texte = d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
  d.lier(texte, variable, { plage: 0 });
}

export function operateurM(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;
  const themeDeBase = themeDuCatalogue(base.catalogue);
  const [modeLight, modeDark] = themeDeBase.modes;
  const parMode = (light: string, dark: string): Combinaison[] =>
    [{ etiquette: 'theme en Light', texte: light, fond: BLANC }, { etiquette: 'theme en Dark', texte: dark, fond: BLANC }];
  const texteDuTheme = (light: string, dark: string) => (d: Degradation): void => {
    texteLie(d, d.nouvelleVariable({ nom: 'test/texte', collection: themeDuCatalogue(d.catalogue), valeurs: [light, dark] }));
  };

  // M1 : un token de `theme` aux valeurs différentes par mode ; le pire mode décide.
  for (const [quoi, light, dark] of [
    ['échec en Light seul', CLAIR, NOIR], ['échec en Dark seul', NOIR, CLAIR], ['échec dans les deux modes', '#BBBBBB', '#999999'], ['échec dans aucun mode', NOIR, '#111111'],
  ] as const) {
    cas.push(faire(`M1-${numero('M1')}`, 'M1', { description: `texte lié à un token de theme : ${quoi} (${light} en Light, ${dark} en Dark)`, degrader: texteDuTheme(light, dark), attendus: constatDeModes(parMode(light, dark), cible) }));
  }

  // M2 : le mode effectif du variant passe en premier dans `rapports` ; le pire mode reste rapporté.
  for (const [quoi, effectif] of [['Dark', modeDark.id], ['Light', modeLight.id], ['absent', undefined]] as const) {
    const ordre = effectif === modeDark.id ? [1, 0] : [0, 1];
    const combinaisons = ordre.map((rang) => parMode(CLAIR, '#AAAAAA')[rang]);
    cas.push(faire(`M2-${numero('M2')}`, 'M2', {
      description: `mode effectif du thème ${quoi}, texte ${CLAIR} en Light et #AAAAAA en Dark`,
      degrader: (d) => {
        d.fixer(d.cible.modesEffectifs, themeDeBase.cle, effectif);
        texteDuTheme(CLAIR, '#AAAAAA')(d);
      },
      attendus: constatDeModes(combinaisons, cible, true),
    }));
  }

  // M3 : le produit des modes des collections atteintes ; une combinaison par élément du produit.
  const produit = (collections: readonly (readonly string[])[]): string[][] =>
    collections.reduce<string[][]>((acc, modes) => acc.flatMap((debut) => modes.map((mode) => [...debut, mode])), [[]]);
  const etiquette = (noms: readonly string[], modes: readonly string[]): string => noms.map((nom, rang) => `${nom} en ${modes[rang]}`).join(', ');
  // (a) le premier plan dans une collection à 2 modes, le fond dans une à 3 : 6 combinaisons.
  {
    const [textes, fonds] = [[NOIR, '#808080'], [BLANC, BLANC, '#555555']];
    cas.push(faire(`M3-${numero('M3')}`, 'M3', {
      description: 'premier plan dans une collection à 2 modes, fond dans une collection à 3 modes : 6 combinaisons',
      degrader: (d) => {
        const [a, b] = [d.nouvelleCollection('Alpha', ['a1', 'a2']), d.nouvelleCollection('Beta', ['b1', 'b2', 'b3'])];
        const racine = d.scene({ racineEnDur: true });
        d.remplacerLesPeintures(racine, 'fills', [solide(BLANC)]);
        d.lier(racine, d.nouvelleVariable({ nom: 'test/fond', collection: b, valeurs: fonds }), { indice: 0 });
        const texte = d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
        d.lier(texte, d.nouvelleVariable({ nom: 'test/texte', collection: a, valeurs: textes }), { plage: 0 });
      },
      attendus: constatDeModes(produit([['b1', 'b2', 'b3'], ['a1', 'a2']]).map(([b, a]) => ({
        etiquette: etiquette(['Beta', 'Alpha'], [b, a]), texte: textes[Number(a[1]) - 1], fond: fonds[Number(b[1]) - 1],
      })), cible),
    }));
  }
  // (b) trois collections de 2, 3 et 4 modes : 24 combinaisons ; le trait du Root vit dans la troisième.
  {
    const [textes, fonds] = [[NOIR, '#808080'], [BLANC, BLANC, '#555555']];
    cas.push(faire(`M3-${numero('M3')}`, 'M3', {
      description: 'trois collections de 2, 3 et 4 modes : 24 combinaisons',
      degrader: (d) => {
        const [a, b, c] = [d.nouvelleCollection('Alpha', ['a1', 'a2']), d.nouvelleCollection('Beta', ['b1', 'b2', 'b3']), d.nouvelleCollection('Gamma', ['c1', 'c2', 'c3', 'c4'])];
        const racine = d.scene({ racineEnDur: true });
        d.remplacerLesPeintures(racine, 'fills', [solide(BLANC)]);
        d.lier(racine, d.nouvelleVariable({ nom: 'test/fond', collection: b, valeurs: fonds }), { indice: 0 });
        d.lier(racine, d.nouvelleVariable({ nom: 'test/trait', collection: c, valeurs: ['#808080', '#808080', '#808080', '#808080'] }), { champ: 'strokes', indice: 0 });
        const texte = d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
        d.lier(texte, d.nouvelleVariable({ nom: 'test/texte', collection: a, valeurs: textes }), { plage: 0 });
      },
      attendus: constatDeModes(produit([['b1', 'b2', 'b3'], ['c1', 'c2', 'c3', 'c4'], ['a1', 'a2']]).map(([b, c, a]) => ({
        etiquette: etiquette(['Beta', 'Gamma', 'Alpha'], [b, c, a]), texte: textes[Number(a[1]) - 1], fond: fonds[Number(b[1]) - 1],
      })), cible),
    }));
  }
  // (c) et (d) la chaîne components, theme, brands, primitives : le mode du thème seul varie avec une brands à un mode, brands varie aussi avec la vraie.
  for (const [quoi, brandsUnique] of [['une collection brands à un mode', true], ['la collection brands à deux modes', false]] as const) {
    const combinaisons = produit([['Default'], ['Light', 'Dark'], brandsUnique ? ['Mode 1'] : ['Light', 'Dark'], ['Mode 1']]);
    const nomsDeBrands = brandsUnique ? 'brands-un-mode' : 'brands';
    cas.push(faire(`M3-${numero('M3')}`, 'M3', {
      description: `chaîne components, theme, ${nomsDeBrands}, primitives (${quoi}) : ${combinaisons.length} combinaisons`,
      degrader: (d) => {
        const collection = (role: string) => d.catalogue.collections.find((c) => c.role === role)!;
        const brands = brandsUnique ? d.nouvelleCollection('brands-un-mode', ['Mode 1'], 'brands') : collection('brands');
        const primitive = d.nouvelleVariable({ nom: 'test/primitive', collection: collection('primitives'), valeurs: [CLAIR] });
        const deBrands = d.nouvelleVariable({ nom: 'test/brands', collection: brands, valeurs: brands.modes.map(() => ({ alias: primitive.cle })) });
        const duTheme = d.nouvelleVariable({ nom: 'test/theme', collection: collection('theme'), valeurs: [{ alias: deBrands.cle }, { alias: deBrands.cle }] });
        const decomposant = d.nouvelleVariable({ nom: 'test/components', collection: collection('components'), valeurs: [{ alias: duTheme.cle }] });
        texteLie(d, decomposant);
      },
      attendus: constatDeModes(combinaisons.map((modes) => ({
        etiquette: etiquette(['components', 'theme', nomsDeBrands, 'primitives'], modes), texte: CLAIR, fond: BLANC,
      })), cible),
    }));
  }

  // M4 : une chaîne d'alias est lisible jusqu'à 10 renvois ; au-delà, et pour un cycle, c'est une limite.
  for (const renvois of [1, 9, 10, 11, 12]) {
    cas.push(faire(`M4-${numero('M4')}`, 'M4', {
      description: `chaîne de ${renvois} renvoi${renvois > 1 ? 's' : ''} vers une couleur ${CLAIR}`,
      degrader: (d) => {
        const chaine = d.nouvelleCollection('Chaine', ['Mode 1']);
        let suivante = d.nouvelleVariable({ nom: `chaine/${renvois}`, collection: chaine, valeurs: [CLAIR] });
        for (let rang = renvois - 1; rang >= 0; rang--) suivante = d.nouvelleVariable({ nom: `chaine/${rang}`, collection: chaine, valeurs: [{ alias: suivante.cle }] });
        texteLie(d, suivante);
      },
      attendus: renvois <= 10 ? constatDeModes([{ etiquette: 'Chaine en Mode 1', texte: CLAIR, fond: BLANC }], cible) : [limiteDuTexte('mode-illisible', cible)],
    }));
  }
  for (const [quoi, boucle] of [['un cycle de deux variables', true], ['un alias vers soi', false]] as const) {
    cas.push(faire(`M4-${numero('M4')}`, 'M4', {
      description: quoi,
      degrader: (d) => {
        const chaine = d.nouvelleCollection('Chaine', ['Mode 1']);
        const premiere = d.nouvelleVariable({ nom: 'chaine/a', collection: chaine, valeurs: [{ alias: 'vide' }] });
        if (boucle) {
          const seconde = d.nouvelleVariable({ nom: 'chaine/b', collection: chaine, valeurs: [{ alias: premiere.cle }] });
          d.fixer(premiere.valeurs!, chaine.modes[0].id, { alias: seconde.cle });
        } else d.fixer(premiere.valeurs!, chaine.modes[0].id, { alias: premiere.cle });
        texteLie(d, premiere);
      },
      attendus: [limiteDuTexte('mode-illisible', cible)],
    }));
  }

  // M5 : huit valeurs que le kit ne sait pas lire, puis quatre canaux ou alphas hors de [0, 1] (Q-F7-5).
  const lecture: [string, (d: Degradation) => Parameters<Degradation['lier']>[1]][] = [
    ['mode absent des valeurs', (d) => { const k = d.nouvelleCollection('Test', ['Mode 1']); const v = d.nouvelleVariable({ nom: 'test/v', collection: k, valeurs: [CLAIR] }); d.fixer(v, 'valeurs', { autre: { valeur: couleurDeHex(CLAIR) } }); return v; }],
    ['variable absente du catalogue', () => ({ cle: 'kz-absente', nom: 'absente', collection: 'col-x' })],
    ['variable non chargée', (d) => d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1']), valeurs: [CLAIR], etat: 'non-chargee' })],
    ['variable inaccessible', (d) => d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1']), valeurs: [CLAIR], etat: 'inaccessible' })],
    ['collection inaccessible', (d) => d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1'], null, 'inaccessible'), valeurs: [CLAIR] })],
    ['valeur FLOAT', (d) => d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1']), valeurs: [{ brut: 0.5 }], type: 'FLOAT' })],
    ['valeur STRING', (d) => d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1']), valeurs: [{ brut: 'rouge' }], type: 'STRING' })],
    ['canal manquant', (d) => d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1']), valeurs: [{ brut: { r: 0.5, g: 0.5, a: 1 } }] })],
  ];
  for (const [quoi, fabriquer] of lecture) {
    cas.push(faire(`M5-${numero('M5')}`, 'M5', { description: quoi, degrader: (d) => texteLie(d, fabriquer(d)), attendus: [limiteDuTexte('mode-illisible', cible)] }));
  }
  const horsGamut: [string, unknown][] = [
    ['canal à 1,2', { r: 1.2, g: 0, b: 0, a: 1 }], ['canal à -0,1', { r: -0.1, g: 0, b: 0, a: 1 }], ['alpha à 1,5', { r: 0, g: 0, b: 0, a: 1.5 }], ['alpha à -0,2', { r: 0, g: 0, b: 0, a: -0.2 }],
  ];
  for (const [quoi, valeur] of horsGamut) {
    cas.push(faire(`M5-${numero('M5')}`, 'M5', {
      description: `${quoi} : une limite couleur-hors-gamut et aucun verdict, la couleur n'est pas bornée en silence`,
      degrader: (d) => texteLie(d, d.nouvelleVariable({ nom: 'test/v', collection: d.nouvelleCollection('Test', ['Mode 1']), valeurs: [{ brut: valeur }] })),
      attendus: [limiteDuTexte('couleur-hors-gamut', cible)], hypothese: 'H16',
    }));
  }

  // M6 : le repli sur la page et la carte mesure chaque mode du thème, même quand le texte est en dur (Q-F7-6).
  const noir = [couleurDeHex(NOIR)];
  const fondTranslucide = couleurDeHex(BLANC, 0.1);
  const repli = (modes?: readonly ModeDeStress[]): AttenduAcc[] => attendusSurPageEtCarte({ usage: 'texte', seuil: SEUIL_AA, cible, premierPlan: () => noir, fond: [fondTranslucide], modes });
  const m6: [string, (d: Degradation) => void, AttenduAcc[]][] = [
    ['texte noir en dur, fond blanc d\'alpha 0,1, thème à deux modes', (d) => { d.scene({ fond: fondTranslucide, racineEnDur: true }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }); }, repli()],
    ['texte noir en dur, thème à un seul mode', (d) => {
      const theme = themeDuCatalogue(d.catalogue);
      d.fixer(theme, 'modes', theme.modes.filter((m) => m.id === modeLight.id));
      d.fixer(d.catalogue, 'fondsDElevation', { [modeLight.id]: d.catalogue.fondsDElevation![modeLight.id] });
      d.scene({ fond: fondTranslucide, racineEnDur: true }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
    }, repli(['light'])],
    ['texte noir lié au thème', (d) => { texteLie(d, d.nouvelleVariable({ nom: 'test/texte', collection: themeDuCatalogue(d.catalogue), valeurs: [NOIR, NOIR] }), { fond: fondTranslucide }); }, repli()],
    ['texte noir lié à une autre collection à un mode', (d) => { texteLie(d, d.nouvelleVariable({ nom: 'test/texte', collection: d.nouvelleCollection('Autre', ['Mode 1']), valeurs: [NOIR] }), { fond: fondTranslucide }); }, repli()],
  ];
  for (const [description, degrader, attendus] of m6) {
    cas.push(faire(`M6-${numero('M6')}`, 'M6', { description, degrader, attendus, verdict: 'mesure', question: 'Q-F7-6', hypothese: 'H6' }));
  }

  // M7 : une couleur liée à une variable de library, lue ou non.
  cas.push(faire(`M7-${numero('M7')}`, 'M7', {
    description: 'variable de library lue',
    degrader: (d) => texteLie(d, d.nouvelleVariable({ nom: 'lib/texte', collection: d.nouvelleCollection('Library', ['Mode 1']), valeurs: [CLAIR], distante: true })),
    attendus: constatDeModes([{ etiquette: 'Library en Mode 1', texte: CLAIR, fond: BLANC }], cible),
  }));
  cas.push(faire(`M7-${numero('M7')}`, 'M7', {
    description: 'variable de library non chargée',
    degrader: (d) => texteLie(d, d.nouvelleVariable({ nom: 'lib/texte', collection: d.nouvelleCollection('Library', ['Mode 1']), valeurs: [CLAIR], distante: true, etat: 'non-chargee' })),
    attendus: [limiteDuTexte('mode-illisible', cible)],
  }));
  return cas;
}
