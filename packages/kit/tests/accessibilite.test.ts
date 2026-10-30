/** Contraste et accessibilité d'un composant : un cas positif et un négatif par contrôle. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BORNE_DE_COMBINAISONS, controlerLAccessibilite, controlerLAccessibiliteParEtapes,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index';
import { collectionDuCatalogue, variableDuCatalogue } from '../src/controles/catalogue';
import { liaisonsPropres } from '../src/controles/releve';
import { composer, couleurDeLiaison, fondEffectif, pileDePeintures, type Combinaison } from '../src/controles/accessibilite';

const gris = (v: number) => ({ r: v, g: v, b: v, a: 1 });
const solide = (champ: 'fills' | 'strokes', couleur: { r: number; g: number; b: number; a: number }, opacite = 1): PeintureLue =>
  ({ champ, indice: 0, type: 'SOLID', visible: true, opacite, blendMode: 'NORMAL', couleur });
const dims = (largeur = 100, hauteur = 48) => ({ x: 0, y: 0, largeur, hauteur });

function racine(fond: PeintureLue[] = [solide('fills', gris(1))], d = dims()): LayerLu {
  return { id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: d, peintures: fond, liaisons: [], valeursEnDur: [] };
}
function texte(couleur: PeintureLue[], fontSize = 14, fontWeight = 400, id = 't'): LayerLu {
  return {
    id, nom: 'Label', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions: dims(40, 16), peintures: [], liaisons: [], valeursEnDur: [],
    texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize, fontWeight, peintures: couleur, liaisons: [] }] },
  };
}
function variant(nom: string, layers: LayerLu[], valeurs: Record<string, string> = {}): VariantLu {
  return { id: nom, nom, valeurs, layers, modesEffectifs: {} };
}
function releve(variants: VariantLu[], etats: string[] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'k', id: '1', nom: 'x-button' },
    proprietes: etats.length ? [{ nom: 'State', type: 'VARIANT', valeurs: etats, defaut: etats[0] }] : [],
    variants, lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}
const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
const cc = (releveDuTest: ReleveDeComposant, niveau: 'AA' | 'AAA' = 'AA', catalogue = catalogueVide) =>
  controlerLAccessibilite(releveDuTest, catalogue, { niveau });
const parCode = (constats: ReturnType<typeof cc>, code: string) => constats.filter((c) => c.code === code && !c.limite);

test('le contraste par étapes conserve les rapports et cède au sein d’un variant', () => {
  const layers = [racine(), ...Array.from({ length: 90 }, (_, i) => texte([solide('fills', gris(0.6))], 14, 400, `t-${i}`))];
  const r = releve([variant('a', layers)]);
  const calcul = controlerLAccessibiliteParEtapes(r, catalogueVide, { niveau: 'AA' });
  let etapes = 0;
  let resultat = calcul.next();
  while (!resultat.done) { etapes += 1; resultat = calcul.next(); }
  assert.ok(etapes >= 90);
  assert.deepEqual(resultat.value, cc(r));
});

test('C49 : un texte gris clair sur blanc manque de contraste, un texte noir passe', () => {
  const mauvais = cc(releve([variant('a', [racine(), texte([solide('fills', gris(0.6))])])]));
  const c = parCode(mauvais, 'C49').find((x) => x.faits.usage === 'texte');
  assert.ok(c);
  assert.equal(c.faits.seuil, 4.5);
  assert.ok(Number(c.faits.rapport) < 4.5);
  assert.equal(parCode(cc(releve([variant('a', [racine(), texte([solide('fills', gris(0))])])])), 'C49').length, 0);
});

test('la construction des cibles cède avant de lire toutes les plages de texte', () => {
  const layer = texte([solide('fills', gris(0.6))]);
  let plagesLues = 0;
  const plages: NonNullable<LayerLu['texte']>['plages'] = Array.from({ length: 256 }, (_, rang) => ({
    debut: rang, fin: rang + 1, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [],
  }));
  for (const plage of plages) Object.defineProperty(plage, 'peintures', { enumerable: true, get: () => { plagesLues += 1; return [solide('fills', gris(0.6))]; } });
  layer.texte!.plages = plages;
  const r = releve([variant('a', [racine(), layer])]);
  const calcul = controlerLAccessibiliteParEtapes(r, catalogueVide, { niveau: 'AA' });
  for (let i = 0; i < 10; i += 1) assert.equal(calcul.next().done, false);
  assert.ok(plagesLues > 0 && plagesLues < 256, `${plagesLues} plages lues`);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  assert.deepEqual(etape.value, cc(r));
});

test('les contrôles finaux par étapes conservent les groupes et leur ordre', () => {
  const anneau: LayerLu = {
    id: 'anneau', nom: 'Focus ring', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1,
    dimensions: dims(), peintures: [solide('strokes', gris(0))], strokeWeight: 1, liaisons: [], valeursEnDur: [],
  };
  const petitTexte = texte([solide('fills', gris(0))], 11);
  const r = releve([
    variant('disabled', [racine()], { State: 'disabled' }),
    variant('a', [racine(undefined, dims(20, 20)), petitTexte], { State: 'focus' }),
    variant('b', [racine(undefined, dims(36, 36)), { ...petitTexte, id: 'tb' }, anneau], { State: 'focus' }),
    variant('c', [racine(undefined, dims(20, 20)), { ...petitTexte, id: 'tc' }], { State: 'focus' }),
  ], ['default', 'hover', 'focus', 'disabled']);
  const attendu = [
    { id: 'C53', code: 'C53', type: 'info', famille: 'contraste', variants: ['disabled'], layers: [], faits: { variantsExclus: 1 } },
    {
      id: 'C52:20x20:24', code: 'C52', type: 'corriger', famille: 'contraste', variants: ['a', 'c'], layers: ['r', 'r'],
      faits: { largeur: 20, hauteur: 20, seuil: 24 },
    },
    {
      id: 'C52:36x36:44', code: 'C52', type: 'verifier', famille: 'contraste', variants: ['b'], layers: ['r'],
      faits: { largeur: 36, hauteur: 36, seuil: 44 },
    },
    {
      id: 'C49:taille:Label:11', code: 'C49', type: 'verifier', famille: 'contraste', variants: ['a', 'b', 'c'], layers: ['t', 'tb', 'tc'],
      faits: { calque: 'Label', fontSize: 11, seuil: 12 },
    },
    {
      id: 'C50:sans-anneau', code: 'C50', type: 'corriger', famille: 'contraste', variants: ['a', 'c'], layers: ['r', 'r'],
      faits: { anneauVisible: 0, variantsEnFocus: 2, calque: 'Root' },
    },
    {
      id: 'C51:Focus ring:1', code: 'C51', type: 'verifier', famille: 'contraste', variants: ['b'], layers: ['anneau'],
      faits: { calque: 'Focus ring', strokeWeight: 1, epaisseurRecommandee: 2, espaceRecommande: 2 },
    },
  ];
  const calcul = controlerLAccessibiliteParEtapes(r, catalogueVide, { niveau: 'AA' });
  let resultat = calcul.next();
  while (!resultat.done) resultat = calcul.next();
  assert.deepEqual(resultat.value, attendu);
  assert.deepEqual(cc(r), attendu);
});

test('le produit des modes conserve l’ordre effectif et les faits de contraste', () => {
  const t = texte([solide('fills', gris(0))]);
  t.texte!.plages[0].liaisons = ['c1', 'c2'].map((collection, indice) => ({
    champ: 'fills', indice, porteur: 't', variable: { id: collection, cle: collection, nom: collection, collection, distante: false },
  }));
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: ['c1', 'c2'].map((cle) => ({
      cle, nom: cle, role: null, etat: 'lue', modes: [{ id: 'm0', nom: 'M0' }, { id: 'm1', nom: 'M1' }],
    })),
    variables: ['c1', 'c2'].map((cle) => ({
      cle, nom: cle, collection: cle, type: 'COLOR', etat: 'presente', valeurs: { m0: { valeur: gris(0) }, m1: { valeur: gris(1) } },
    })),
  };
  const v = variant('a', [racine(), t]);
  v.modesEffectifs = { c1: 'm1', c2: 'm1' };
  const r = releve([v]);
  const attendu = [{
    id: 'C49:Label:texte:0-5:4.5:AA', code: 'C49', type: 'corriger', famille: 'contraste', variants: ['a'], layers: ['t'],
    faits: {
      usage: 'texte', champ: 'fills', calque: 'Label', rapport: 1, seuil: 4.5, niveau: 'AA',
      mode: 'c1 en M1, c2 en M1', autresModes: 1, premierPlan: '#FFFFFF', fond: '#FFFFFF',
      rapports: JSON.stringify([
        ['c1 en M1, c2 en M1', 1], ['c1 en M1, c2 en M0', 1],
        ['c1 en M0, c2 en M1', 21], ['c1 en M0, c2 en M0', 21],
      ]),
    },
  }];
  const calcul = controlerLAccessibiliteParEtapes(r, catalogue, { niveau: 'AA' });
  let resultat = calcul.next();
  while (!resultat.done) resultat = calcul.next();
  assert.deepEqual(resultat.value, attendu);
  assert.deepEqual(cc(r, 'AA', catalogue), attendu);
});

test('seuils sans arrondi : un grand texte à 3,9:1 passe en AA et échoue en AAA', () => {
  // Gris 0.6 sur blanc : environ 2,85:1 ; on cherche un gris proche de 3,9:1.
  const lum = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  let v = 0;
  while ((1.05) / (lum(v) + 0.05) > 3.9) v += 0.0005;
  const layers = [racine(), texte([solide('fills', gris(v))], 24, 400)];
  assert.equal(parCode(cc(releve([variant('a', layers)]), 'AA'), 'C49').length, 0);
  const aaa = parCode(cc(releve([variant('a', layers)]), 'AAA'), 'C49');
  assert.equal(aaa.length, 1);
  assert.equal(aaa[0].faits.seuil, 4.5);
  assert.equal(aaa[0].faits.usage, 'grand-texte');
});

test('un rapport juste sous le seuil échoue : pas d arrondi à deux décimales', () => {
  // 4,499 afficherait 4,50 une fois arrondi ; ici on vérifie qu un gris à 4,49:1 échoue.
  const lum = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  let v = 0;
  while ((1.05) / (lum(v) + 0.05) > 4.49) v += 0.0001;
  const constats = parCode(cc(releve([variant('a', [racine(), texte([solide('fills', gris(v))])])])), 'C49');
  assert.equal(constats.length, 1);
});

test('texte mixte : une mesure par plage', () => {
  const t = texte([solide('fills', gris(0))]);
  t.texte!.plages.push({ debut: 5, fin: 9, fontSize: 14, fontWeight: 400, peintures: [solide('fills', gris(0.7))], liaisons: [] });
  const constats = parCode(cc(releve([variant('a', [racine(), t])])), 'C49');
  assert.equal(constats.length, 1);
  assert.match(constats[0].id, /5-9/);
});

test('fond composé : une peinture translucide du parent se compose sur la première peinture opaque', () => {
  const grand = racine([solide('fills', gris(1)), solide('fills', gris(0), 0.5)]);
  // Fond effectif gris moyen (~0,5) ; un texte noir passe, un texte gris moyen échoue.
  assert.equal(parCode(cc(releve([variant('a', [grand, texte([solide('fills', gris(0))])])])), 'C49').length, 0);
  assert.equal(parCode(cc(releve([variant('a', [grand, texte([solide('fills', gris(0.5))])])])), 'C49').length, 1);
});

test('limites : fond indéterminé, dégradé, image, peinture superposée non unie', () => {
  const cas: [string, PeintureLue[], string][] = [
    ['fond-indetermine', [], 'fond-indetermine'],
    ['degrade', [{ ...solide('fills', gris(1)), type: 'GRADIENT_LINEAR' }], 'degrade'],
    ['image', [{ ...solide('fills', gris(1)), type: 'IMAGE' }], 'image'],
    ['superposee', [{ ...solide('fills', gris(1)), type: 'GRADIENT_LINEAR' }, solide('fills', gris(0), 0.5)], 'peinture-superposee'],
  ];
  for (const [, fond, cause] of cas) {
    const constats = cc(releve([variant('a', [racine(fond), texte([solide('fills', gris(0.9))])])]));
    const limite = constats.find((c) => c.limite && c.faits.cause === cause);
    assert.ok(limite, cause);
    assert.equal(limite.type, 'info');
    assert.equal(parCode(constats, 'C49').length, 0, cause);
  }
});

test('modes : le pire mode est rapporté, un mode illisible est une limite', () => {
  const liaison = (champ: 'fills') => ({ champ, indice: 0, porteur: 't', variable: { id: 'v', cle: 'vk', nom: 'texte', collection: 'ck', distante: false } });
  const t = texte([solide('fills', gris(0))]);
  t.texte!.plages[0].liaisons = [liaison('fills')];
  const cat = (valeurs: Record<string, { valeur: unknown }>, etat: 'presente' | 'non-chargee' = 'presente'): CatalogueDeReference => ({
    version: 1, library: null,
    collections: [{ cle: 'ck', nom: 'theme', role: null, etat: 'lue', modes: [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }] }],
    variables: [{ cle: 'vk', nom: 'texte', collection: 'ck', type: 'COLOR', etat, valeurs }],
  });
  const v = variant('a', [racine(), t]);
  v.modesEffectifs = { ck: 'l' };
  const constats = cc(releve([v]), 'AA', cat({ l: { valeur: gris(0) }, d: { valeur: gris(0.8) } }));
  const c = parCode(constats, 'C49')[0];
  assert.ok(c);
  assert.equal(c.faits.mode, 'theme en Dark');
  const illisible = cc(releve([v]), 'AA', cat({ l: { valeur: gris(0) } }));
  assert.ok(illisible.find((x) => x.limite && x.faits.cause === 'mode-illisible'));
  const nonChargee = cc(releve([v]), 'AA', cat({}, 'non-chargee'));
  assert.ok(nonChargee.find((x) => x.limite && x.faits.cause === 'mode-illisible'));
});

test('C50 : un stroke sous 3:1 est signalé, un stroke sombre passe', () => {
  const bouton = (c: number): LayerLu => ({
    id: 'b', nom: 'Border', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(c))],
    strokeWeight: 1, liaisons: [], valeursEnDur: [],
  });
  const faible = parCode(cc(releve([variant('a', [racine(), bouton(0.85)])])), 'C50');
  assert.equal(faible.length, 1);
  assert.equal(faible[0].faits.usage, 'stroke');
  assert.equal(parCode(cc(releve([variant('a', [racine(), bouton(0.2)])])), 'C50').length, 0);
});

test('C50 : un variant en focus sans anneau visible est signalé, avec un anneau il ne l est pas', () => {
  const anneau: LayerLu = {
    id: 'f', nom: 'Focus ring', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(0))],
    strokeWeight: 2, liaisons: [], valeursEnDur: [],
  };
  const sans = cc(releve([variant('f', [racine()], { State: 'focus' })], ['default', 'focus']));
  assert.ok(sans.find((c) => c.id === 'C50:sans-anneau'));
  const avec = cc(releve([variant('f', [racine(), anneau], { State: 'focus' })], ['default', 'focus']));
  assert.equal(avec.find((c) => c.id === 'C50:sans-anneau'), undefined);
});

test('C51 : un anneau de 1 px s écarte de la recommandation, un anneau de 2 px non', () => {
  const anneau = (poids: number): LayerLu => ({
    id: 'f', nom: 'Focus ring', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(0))],
    strokeWeight: poids, liaisons: [], valeursEnDur: [],
  });
  const un = parCode(cc(releve([variant('f', [racine(), anneau(1)], { State: 'focus' })], ['focus'])), 'C51');
  assert.equal(un.length, 1);
  assert.equal(un[0].type, 'verifier');
  assert.equal(un[0].faits.strokeWeight, 1);
  assert.equal(parCode(cc(releve([variant('f', [racine(), anneau(2)], { State: 'focus' })], ['focus'])), 'C51').length, 0);
});

test('C52 : cible sous 24 px en constat, sous 44 px en recommandation, seulement si le composant est interactif', () => {
  const etats = ['default', 'hover', 'pressed'];
  const v = (h: number, l = 100) => variant(`h${h}`, [racine([solide('fills', gris(1))], dims(l, h))], { State: 'default' });
  const petit = parCode(cc(releve([v(20, 20)], etats)), 'C52');
  assert.equal(petit.length, 1);
  assert.equal(petit[0].type, 'corriger');
  assert.equal(petit[0].faits.seuil, 24);
  const moyen = parCode(cc(releve([v(36)], etats)), 'C52');
  assert.equal(moyen[0].type, 'verifier');
  assert.equal(moyen[0].faits.seuil, 44);
  assert.equal(parCode(cc(releve([v(48)], etats)), 'C52').length, 0);
  assert.equal(parCode(cc(releve([v(20, 20)], ['default', 'disabled'])), 'C52').length, 0);
});

test('C53 : les variants disabled ne sont pas mesurés et sont comptés', () => {
  const clair = [racine(), texte([solide('fills', gris(0.9))])];
  const constats = cc(releve([variant('d1', clair, { State: 'disabled' }), variant('d2', clair, { State: 'disabled' }), variant('ok', [racine(), texte([solide('fills', gris(0))])], { State: 'default' })], ['default', 'disabled']));
  const c53 = constats.find((c) => c.code === 'C53');
  assert.ok(c53);
  assert.equal(c53.type, 'info');
  assert.equal(c53.faits.variantsExclus, 2);
  assert.equal(parCode(constats, 'C49').length, 0);
  assert.equal(cc(releve([variant('ok', clair, { State: 'default' })], ['default'])).find((c) => c.code === 'C53'), undefined);
});

test('texte sous 12 px : recommandation, un texte de 12 px ne déclenche rien', () => {
  const petit = cc(releve([variant('a', [racine(), texte([solide('fills', gris(0))], 11)])])).find((c) => c.id.startsWith('C49:taille'));
  assert.ok(petit);
  assert.equal(petit.type, 'verifier');
  assert.equal(petit.faits.fontSize, 11);
  assert.equal(cc(releve([variant('a', [racine(), texte([solide('fills', gris(0))], 12)])])).find((c) => c.id.startsWith('C49:taille')), undefined);
});

test('borne : au-delà, un constat d information compte les combinaisons non mesurées', () => {
  const modes = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, nom: `M${i}` }));
  const collection = (cle: string) => ({ cle, nom: cle, role: null, etat: 'lue' as const, modes });
  const cat: CatalogueDeReference = {
    version: 1, library: null,
    collections: ['c1', 'c2', 'c3'].map(collection),
    variables: ['c1', 'c2', 'c3'].map((c) => ({
      cle: `v${c}`, nom: `v${c}`, collection: c, type: 'COLOR' as const, etat: 'presente' as const,
      valeurs: Object.fromEntries(modes.map((m) => [m.id, { valeur: gris(0) }])),
    })),
  };
  const t = texte([solide('fills', gris(0))]);
  t.texte!.plages[0].liaisons = ['c1', 'c2', 'c3'].map((c, i) => ({
    champ: 'fills', indice: i, porteur: 't', variable: { id: c, cle: `v${c}`, nom: `v${c}`, collection: c, distante: false },
  }));
  const variants = Array.from({ length: 6 }, (_, i) => variant(`v${i}`, [racine(), { ...t, id: `t${i}` }]));
  const constats = cc(releve(variants), 'AA', cat);
  const borne = constats.find((c) => c.id === 'C49:borne');
  assert.ok(borne);
  assert.equal(borne.type, 'info');
  assert.equal(borne.faits.borne, BORNE_DE_COMBINAISONS);
  assert.equal(borne.faits.combinaisonsNonMesurees, 6000 - BORNE_DE_COMBINAISONS);
});

test('faits du contraste : premier plan, fond et rapports de chaque mode ; une limite ne les porte pas', () => {
  const liaison = { champ: 'fills' as const, indice: 0, porteur: 't', variable: { id: 'v', cle: 'vk', nom: 'texte', collection: 'ck', distante: false } };
  const t = texte([solide('fills', gris(0))]);
  t.texte!.plages[0].liaisons = [liaison];
  const cat: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'ck', nom: 'theme', role: null, etat: 'lue', modes: [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }] }],
    variables: [{ cle: 'vk', nom: 'texte', collection: 'ck', type: 'COLOR', etat: 'presente', valeurs: { l: { valeur: gris(0) }, d: { valeur: gris(1) } } }],
  };
  const v = variant('a', [racine(), t]);
  v.modesEffectifs = { ck: 'l' };
  const c = parCode(cc(releve([v]), 'AA', cat), 'C49')[0];
  assert.equal(c.faits.premierPlan, '#FFFFFF');
  assert.equal(c.faits.fond, '#FFFFFF');
  assert.equal(c.faits.rapport, 1);
  const rapports = JSON.parse(String(c.faits.rapports)) as [string, number][];
  assert.deepEqual(rapports.map(([e]) => e), ['theme en Light', 'theme en Dark']);
  assert.ok(rapports[0][1] > 20);

  const limite = cc(releve([variant('a', [racine([{ ...solide('fills', gris(1)), type: 'GRADIENT_LINEAR' }]), texte([solide('fills', gris(0.9))])])])).find((x) => x.limite);
  assert.ok(limite);
  assert.equal(limite.faits.premierPlan, undefined);
  assert.equal(limite.faits.fond, undefined);
  assert.equal(limite.faits.rapports, undefined);
});

test('regroupement : C49, C50, C51 et les limites forment un constat par groupe, sans variant dans l id', () => {
  const clair = (id: string) => texte([solide('fills', gris(0.6))], 14, 400, id);
  const bord = (id: string): LayerLu => ({
    id, nom: 'Border', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(0.85))],
    strokeWeight: 1, liaisons: [], valeursEnDur: [],
  });
  const anneau = (id: string): LayerLu => ({ ...bord(id), nom: 'Focus ring', peintures: [solide('strokes', gris(0))] });
  const degrade = racine([{ ...solide('fills', gris(1)), type: 'GRADIENT_LINEAR' }]);
  const vs = ['a', 'b'].map((n) => variant(n, [racine(), clair(`t${n}`), bord(`b${n}`), anneau(`f${n}`)], { State: 'focus' }));
  const constats = cc(releve([...vs, variant('c', [degrade, clair('tc')], { State: 'focus' }), variant('d', [degrade, clair('td')], { State: 'focus' })], ['focus']));
  for (const code of ['C49', 'C50']) {
    const groupes = parCode(constats, code).filter((x) => x.id !== 'C50:sans-anneau');
    const attendus = code === 'C49' ? 1 : 1;
    assert.equal(groupes.length, attendus, code);
    assert.deepEqual(groupes[0].variants, ['a', 'b']);
    assert.equal(groupes[0].layers.length, 2);
    assert.ok(!groupes[0].id.includes(':a') && !groupes[0].id.endsWith(':b'));
  }
  const limites = constats.filter((x) => x.limite && x.code === 'C49');
  assert.equal(limites.length, 1);
  assert.deepEqual(limites[0].variants, ['c', 'd']);
  const fins = parCode(cc(releve(['a', 'b'].map((n) => variant(n, [racine(), { ...anneau(`f${n}`), strokeWeight: 1 }], { State: 'focus' })), ['focus'])), 'C51');
  assert.equal(fins.length, 1);
  assert.deepEqual(fins[0].variants, ['a', 'b']);
  // Négatif : un seul variant reste un constat simple ; un verdict différent ne se regroupe pas.
  const seul = parCode(cc(releve([vs[0]])), 'C49');
  assert.deepEqual(seul[0].variants, ['a']);
  const deux = parCode(cc(releve([variant('a', [racine(), clair('x')]), variant('b', [racine(), texte([solide('fills', gris(0.6))], 24, 400, 'y')])])), 'C49');
  assert.equal(deux.length, 2);
});

test('C50 sans anneau : layers porte la racine de chaque variant concerné', () => {
  const vs = ['f1', 'f2'].map((n) => variant(n, [{ ...racine(), id: `r${n}` }], { State: 'focus' }));
  const c = cc(releve(vs, ['focus'])).find((x) => x.id === 'C50:sans-anneau');
  assert.ok(c);
  assert.deepEqual(c.layers, ['rf1', 'rf2']);
  assert.equal(c.faits.calque, 'Root');
  const anneau: LayerLu = {
    id: 'f', nom: 'Focus ring', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(0))],
    strokeWeight: 2, liaisons: [], valeursEnDur: [],
  };
  assert.equal(cc(releve([variant('f', [racine(), anneau], { State: 'focus' })], ['focus'])).find((x) => x.id === 'C50:sans-anneau'), undefined);
});

/* ---------- préfixe des combinaisons de modes (4.4) ---------- */

/** Une collection par entrée de `tailles`, de `tailles[i]` modes ; la variable de c1 porte la couleur du texte, les autres sont atteintes sans être lues. */
function fixtureDeModes(tailles: number[], onLitLeNom?: () => void) {
  const collections = tailles.map((n, i) => ({
    cle: `c${i + 1}`, nom: `c${i + 1}`, role: null, etat: 'lue' as const,
    modes: Array.from({ length: n }, (_, m) => {
      const mode = { id: `m${m}`, nom: `M${m}` };
      if (onLitLeNom) Object.defineProperty(mode, 'nom', { enumerable: true, get() { onLitLeNom(); return `M${m}`; } });
      return mode;
    }),
  }));
  const cat: CatalogueDeReference = {
    version: 1, library: null, collections,
    variables: collections.map((c, i) => ({
      cle: `v${c.cle}`, nom: `v${c.cle}`, collection: c.cle, type: 'COLOR' as const, etat: 'presente' as const,
      valeurs: Object.fromEntries(c.modes.map((m) => [m.id, { valeur: gris(i === 0 && m.id === 'm4' ? 0.97 : 0.9) }])),
    })),
  };
  const t = texte([solide('fills', gris(0))]);
  t.texte!.plages[0].liaisons = collections.map((c, i) => ({
    champ: 'fills', indice: i, porteur: 't', variable: { id: c.cle, cle: `v${c.cle}`, nom: `v${c.cle}`, collection: c.cle, distante: false },
  }));
  return { cat, t, collections };
}

/** Le produit d'avant : chaque niveau matérialisé, le mode effectif de chaque collection en tête. */
function produitDeReference(tailles: number[], effectifs: Record<string, string>): string[] {
  let etiquettes = [''];
  tailles.forEach((n, i) => {
    const cle = `c${i + 1}`;
    const modes = Array.from({ length: n }, (_, m) => `m${m}`).sort((a, b) => Number(b === effectifs[cle]) - Number(a === effectifs[cle]));
    etiquettes = etiquettes.flatMap((e) => modes.map((m) => [e, `${cle} en M${m.slice(1)}`].filter(Boolean).join(', ')));
  });
  return etiquettes;
}

test('C49 : le préfixe de 5 000 combinaisons garde l\'ordre du produit, le mode effectif en tête, et le premier pire cas', () => {
  const tailles = [9, 9, 9, 9];
  const { cat, t } = fixtureDeModes(tailles);
  const effectifs = { c1: 'm2', c2: 'm3' };
  const variants = [0, 1].map((i) => ({ ...variant(`v${i}`, [racine(), { ...t, id: `t${i}` }]), modesEffectifs: effectifs }));
  const constats = cc(releve(variants), 'AA', cat);
  const reference = produitDeReference(tailles, effectifs);
  assert.equal(reference.length, 6561);
  const texteC49 = constats.find((c) => c.code === 'C49' && c.faits.usage === 'texte')!;
  assert.deepEqual(texteC49.variants, ['v0']);
  const rapports = JSON.parse(String(texteC49.faits.rapports)) as [string, number][];
  assert.deepEqual(rapports.map(([e]) => e), reference.slice(0, BORNE_DE_COMBINAISONS));
  assert.equal(texteC49.faits.mode, reference.find((e) => e.startsWith('c1 en M4')), 'le premier des pires cas');
  assert.equal(texteC49.faits.autresModes, BORNE_DE_COMBINAISONS - 1);
  const borne = constats.find((c) => c.id === 'C49:borne')!;
  assert.equal(borne.faits.combinaisonsMesurees, BORNE_DE_COMBINAISONS);
  assert.equal(borne.faits.combinaisonsNonMesurees, 2 * 6561 - BORNE_DE_COMBINAISONS);
});

test('C49 : la borne coupe le troisième variant au milieu de son produit', () => {
  const { cat, t } = fixtureDeModes([10, 10, 20]);
  const variants = [0, 1, 2].map((i) => variant(`v${i}`, [racine(), { ...t, id: `t${i}` }]));
  const constats = cc(releve(variants), 'AA', cat);
  const texteC49 = constats.find((c) => c.code === 'C49' && c.faits.usage === 'texte')!;
  assert.deepEqual(texteC49.variants, ['v0', 'v1', 'v2']);
  const borne = constats.find((c) => c.id === 'C49:borne')!;
  assert.equal(borne.faits.combinaisonsMesurees, BORNE_DE_COMBINAISONS);
  assert.equal(borne.faits.combinaisonsNonMesurees, 1000);
  const exact = cc(releve([variants[0], variants[1]]), 'AA', cat);
  assert.equal(exact.find((c) => c.id === 'C49:borne'), undefined, 'deux variants de 2 000 tiennent sous la borne');
});

test('C49 : l\'espace suit le préfixe retenu, pas le produit des modes', () => {
  const mesure = (tailles: number[]) => {
    let nomsLus = 0;
    const { cat, t } = fixtureDeModes(tailles, () => { nomsLus += 1; });
    const r = releve([variant('v0', [racine(), t])]);
    const calcul = controlerLAccessibiliteParEtapes(r, cat, { niveau: 'AA' });
    let etapes = 0;
    let etape = calcul.next();
    while (!etape.done) { etapes += 1; etape = calcul.next(); }
    const borne = etape.value.find((c) => c.id === 'C49:borne')!;
    return { nomsLus, etapes, nonMesurees: borne.faits.combinaisonsNonMesurees };
  };
  const moyen = mesure([10, 10, 10, 10, 10, 10]);
  const grand = mesure([10, 10, 10, 10, 10, 10, 10, 10]);
  assert.equal(moyen.nomsLus, BORNE_DE_COMBINAISONS * 6, 'un nom lu par collection et par combinaison produite');
  assert.equal(grand.nomsLus, BORNE_DE_COMBINAISONS * 8);
  assert.equal(moyen.nonMesurees, 1_000_000 - BORNE_DE_COMBINAISONS);
  assert.equal(grand.nonMesurees, 100_000_000 - BORNE_DE_COMBINAISONS);
  assert.ok(grand.etapes < BORNE_DE_COMBINAISONS * 4, `${grand.etapes} étapes`);
  assert.ok(grand.etapes < moyen.etapes * 1.2, `${moyen.etapes} puis ${grand.etapes} étapes pour un produit cent fois plus grand`);
});

/* ---------- cardinalité au-delà des entiers exacts (4.5) ---------- */

/** Le constat de borne d'un composant dont chaque variant atteint `collections` collections de `modes` modes. */
function bornePour(collections: number, modes: number, nombreDeVariants = 1) {
  const { cat, t } = fixtureDeModes(Array.from({ length: collections }, () => modes));
  const variants = Array.from({ length: nombreDeVariants }, (_, i) => variant(`v${i}`, [racine(), { ...t, id: `t${i}` }]));
  return cc(releve(variants), 'AA', cat).find((c) => c.id === 'C49:borne')!;
}

test('C49 : un compte exact reste un nombre, jusqu\'à 2^53 combinaisons', () => {
  assert.equal(bornePour(40, 2).faits.combinaisonsNonMesurees, 2 ** 40 - BORNE_DE_COMBINAISONS);
  assert.equal(bornePour(53, 2).faits.combinaisonsNonMesurees, 2 ** 53 - BORNE_DE_COMBINAISONS);
});

test('C49 : au-delà de 2^53 − 1, le compte est la chaîne exacte de ses chiffres, jamais un nombre arrondi', () => {
  assert.equal(bornePour(54, 2).faits.combinaisonsNonMesurees, '18014398509476984');
  assert.equal(bornePour(34, 3).faits.combinaisonsNonMesurees, '16677181699661569', '3^34 − 5000, impair donc non représentable en flottant');
});

test('C49 : la somme de plusieurs variants est exacte, même quand chacun tient dans un nombre exact', () => {
  assert.equal(bornePour(33, 3, 3).faits.combinaisonsNonMesurees, '16677181699661569');
});

test('C49 : un produit au-delà de la plage des flottants garde tous ses chiffres', () => {
  const attendu = '11505236063118821809467553221049758295155052665230762065499525194094891251552061640493342548634082305351687288311769174890162545204122663839542235560926343960177145179191391057683342054479750023644997308933440369205641643669917624414330439074612943178454432683813523087356623740062701843509462805095950344776824';
  const faits = bornePour(1030, 2).faits;
  assert.equal(faits.combinaisonsNonMesurees, attendu, '2^1030 − 5000');
  assert.equal(faits.combinaisonsMesurees, BORNE_DE_COMBINAISONS);
});

/* ---------- mémoire des résolutions d'alias (4.6) ---------- */

type Valeurs = NonNullable<CatalogueDeReference['variables'][number]['valeurs']>;
const rouge = (r: number) => ({ valeur: { r, g: 0, b: 0, a: 1 } });

/** La résolution d'avant la mémoire, sur les mêmes catalogues. */
function couleurDeReference(catalogue: CatalogueDeReference, variant: VariantLu, combinaison: Combinaison, cle: string, profondeur = 0): unknown {
  if (profondeur > 10) return 'mode-illisible';
  const variable = variableDuCatalogue(catalogue, cle);
  if (variable === 'absente' || variable.etat !== 'presente' || !variable.valeurs) return 'mode-illisible';
  const collection = collectionDuCatalogue(catalogue, variable.collection);
  if (collection === 'absente' || collection.etat !== 'lue') return 'mode-illisible';
  const brut = variant.modesEffectifs[collection.cle] ?? variant.modesEffectifs[collection.nom];
  const effectif = brut === undefined ? null : collection.modes.find((m) => m.id === brut || m.nom === brut)?.id ?? null;
  const modeId = combinaison.modes.get(collection.cle) ?? effectif ?? collection.modes[0]?.id;
  const valeur = modeId !== undefined ? variable.valeurs[modeId] : undefined;
  if (!valeur) return 'mode-illisible';
  if ('alias' in valeur) return couleurDeReference(catalogue, variant, combinaison, valeur.alias, profondeur + 1);
  const c = valeur.valeur as { r?: unknown; g?: unknown; b?: unknown; a?: unknown } | null;
  if (!c || typeof c !== 'object' || typeof c.r !== 'number' || typeof c.g !== 'number' || typeof c.b !== 'number') return 'mode-illisible';
  return { r: c.r, g: c.g, b: c.b, a: typeof c.a === 'number' ? c.a : 1 };
}

function catalogueDAlias(): CatalogueDeReference {
  const modes = (...ids: string[]) => ids.map((id) => ({ id, nom: `Mode ${id}` }));
  const v = (cle: string, collection: string, valeurs: Valeurs | undefined, over: Partial<CatalogueDeReference['variables'][number]> = {}) =>
    ({ cle, nom: `${cle}-nom`, collection, type: 'COLOR' as const, etat: 'presente' as const, ...(valeurs ? { valeurs } : {}), ...over });
  const chaine = Array.from({ length: 13 }, (_, i) => v(`k${i}`, 'C', { c1: i === 12 ? rouge(0.5) : { alias: `k${i + 1}` } }));
  return {
    version: 1, library: null,
    collections: [
      { cle: 'A', nom: 'A', role: null, etat: 'lue', modes: modes('a1', 'a2') },
      { cle: 'B', nom: 'B', role: null, etat: 'lue', modes: modes('b1', 'b2') },
      { cle: 'C', nom: 'C', role: null, etat: 'lue', modes: modes('c1') },
      { cle: 'D', nom: 'D', role: null, etat: 'inaccessible', modes: modes('d1') },
      { cle: 'E', nom: 'E', role: null, etat: 'lue', modes: [] },
    ],
    variables: [
      v('x', 'A', { a1: { alias: 'y' }, a2: rouge(0.2) }),
      v('y', 'B', { b1: { alias: 'z' }, b2: { alias: 'x' } }),
      v('z', 'C', { c1: rouge(0.4) }),
      v('w', 'A', { a1: { alias: 'nope' }, a2: { alias: 'nc' } }),
      v('nc', 'C', { c1: rouge(0.1) }, { etat: 'non-chargee' }),
      v('soi', 'C', { c1: { alias: 'soi' } }),
      v('d', 'D', { d1: rouge(0.3) }),
      v('e', 'E', { e1: rouge(0.3) }),
      v('texte', 'C', { c1: { valeur: 'rouge' } }),
      v('vide', 'C', undefined),
      v('parNom', 'A', { a1: { alias: 'z-nom' }, a2: { alias: 'x-nom' } }),
      ...chaine,
    ],
  };
}

function combinaisonsDeTest(): Combinaison[] {
  const resultat: Combinaison[] = [];
  for (const a of [undefined, 'a1', 'a2']) for (const b of [undefined, 'b1', 'b2']) for (const c of [undefined, 'c1']) {
    const modes = new Map<string, string>();
    if (a) modes.set('A', a);
    if (b) modes.set('B', b);
    if (c) modes.set('C', c);
    resultat.push({ modes, etiquette: [a, b, c].join('/') });
  }
  return resultat;
}

const variantsDeTest = (): VariantLu[] => ([{}, { A: 'a2' }, { B: 'Mode b2', A: 'a2' }, { C: 'inconnu' }] as Record<string, string>[]).map((modesEffectifs, i) => ({ ...variant(`v${i}`, []), modesEffectifs }));

test('la couleur d\'une liaison égale la résolution d\'avant : alias, chaînes, cycles, profondeur, absents, non chargés, contextes', () => {
  const cles = [...catalogueDAlias().variables.map((v) => v.cle), 'nope', 'y-nom', 'x-nom'];
  for (const sens of [1, -1]) {
    const dans = <T>(liste: T[]) => (sens === 1 ? liste : [...liste].reverse());
    const catalogue = catalogueDAlias();
    for (const profondeur of dans([0, 1, 5, 10, 11])) {
      for (const variantCourant of dans(variantsDeTest())) {
        for (const combinaison of dans(combinaisonsDeTest())) {
          for (const cle of dans(cles)) {
            assert.deepEqual(
              couleurDeLiaison(catalogue, variantCourant, combinaison, cle, profondeur),
              couleurDeReference(catalogue, variantCourant, combinaison, cle, profondeur),
              `${cle} profondeur ${profondeur} ${combinaison.etiquette} ${variantCourant.nom}`,
            );
          }
        }
      }
    }
  }
});

test('la mémoire des couleurs suit les tableaux du catalogue : un tableau remplacé ou allongé est relu', () => {
  const catalogue = catalogueDAlias();
  const combinaison = combinaisonsDeTest()[0];
  const [libre] = variantsDeTest();
  assert.deepEqual(couleurDeLiaison(catalogue, libre, combinaison, 'z'), { r: 0.4, g: 0, b: 0, a: 1 });
  catalogue.variables = catalogue.variables.map((v) => (v.cle === 'z' ? { ...v, valeurs: { c1: rouge(0.9) } } : v));
  assert.deepEqual(couleurDeLiaison(catalogue, libre, combinaison, 'z'), { r: 0.9, g: 0, b: 0, a: 1 });
  catalogue.variables.push({ cle: 'z2', nom: 'z2', collection: 'C', type: 'COLOR', etat: 'presente', valeurs: { c1: rouge(0.7) } });
  assert.deepEqual(couleurDeLiaison(catalogue, libre, combinaison, 'z2'), { r: 0.7, g: 0, b: 0, a: 1 });
  const autre = catalogueDAlias();
  assert.deepEqual(couleurDeLiaison(autre, libre, combinaison, 'z'), { r: 0.4, g: 0, b: 0, a: 1 }, 'deux catalogues ne partagent rien');
  assert.ok(Object.isFrozen(couleurDeLiaison(autre, libre, combinaison, 'z')));
});

test('la mesure du contraste lit chaque variable une fois par contexte de modes, pas une fois par combinaison', () => {
  const lectures = { memoire: 0, reference: 0 };
  const compter = (cle: keyof typeof lectures) => {
    const catalogue = catalogueDAlias();
    catalogue.variables = catalogue.variables.map((v) => {
      if (!v.valeurs) return v;
      const { valeurs } = v;
      const compte = { ...v };
      Object.defineProperty(compte, 'valeurs', { enumerable: true, get() { lectures[cle] += 1; return valeurs; } });
      return compte;
    });
    return catalogue;
  };
  const memoire = compter('memoire');
  const reference = compter('reference');
  for (const variantCourant of variantsDeTest()) for (const combinaison of combinaisonsDeTest()) for (let rang = 0; rang < 20; rang++) {
    couleurDeLiaison(memoire, variantCourant, combinaison, 'x');
    couleurDeReference(reference, variantCourant, combinaison, 'x');
  }
  assert.ok(lectures.reference > 1000, `${lectures.reference} lectures sans mémoire`);
  assert.ok(lectures.memoire < 60, `${lectures.memoire} lectures avec la mémoire`);
});

/* ---------- fonds et visibilité mutualisés (4.7) ---------- */

/** Le fond d'avant la mémoire : les layers indexés à chaque appel, la chaîne des ancêtres relue. */
function fondDeReference(variant: VariantLu, layer: LayerLu, catalogue: CatalogueDeReference, combinaison: Combinaison): unknown {
  const parId = new Map(variant.layers.map((l) => [l.id, l]));
  const couches: { r: number; g: number; b: number; a: number }[] = [];
  let courant = layer.parent ? parId.get(layer.parent) : undefined;
  while (courant) {
    if (courant.visible) {
      const fills = courant.peintures.filter((p) => p.champ === 'fills');
      const pile = pileDePeintures(fills, liaisonsPropres(courant), courant.opacite, catalogue, variant, combinaison);
      if ('limite' in pile) return pile;
      couches.push(...pile.couches);
      if (pile.couches.some((c) => c.a >= 1 - 1e-9)) break;
    }
    courant = courant.parent ? parId.get(courant.parent) : undefined;
  }
  return composer(couches, null) ?? { limite: 'fond-indetermine' };
}

function catalogueDeFonds(): CatalogueDeReference {
  const modes = (...ids: string[]) => ids.map((id) => ({ id, nom: `Mode ${id}` }));
  const v = (cle: string, collection: string, valeurs: Valeurs) =>
    ({ cle, nom: cle, collection, type: 'COLOR' as const, etat: 'presente' as const, valeurs });
  return {
    version: 1, library: null,
    collections: [
      { cle: 'A', nom: 'A', role: null, etat: 'lue', modes: modes('a1', 'a2') },
      { cle: 'B', nom: 'B', role: null, etat: 'lue', modes: modes('b1', 'b2') },
      { cle: 'Z', nom: 'Z', role: null, etat: 'lue', modes: modes('z1', 'z2') },
    ],
    variables: [
      v('xa', 'A', { a1: rouge(1), a2: rouge(0.2) }),
      v('yb', 'B', { b1: { valeur: { r: 0.9, g: 0.9, b: 0.9, a: 0.5 } }, b2: { alias: 'xa' } }),
      v('zz', 'Z', { z1: rouge(0.1), z2: rouge(0.8) }),
    ],
  };
}

type OptionsDArbre = { opaciteM?: number; parentM?: string | null; visibleM?: boolean; intermediaire?: boolean };

/** R (liée à A) porte M (liée à B, semi-transparente) qui porte le texte T ; S est un autre texte sous R. */
function arbreDeFonds(options: OptionsDArbre = {}): VariantLu {
  const { opaciteM = 0.6, parentM = 'R', visibleM = true, intermediaire = false } = options;
  const lie = (porteur: string, cle: string): LiaisonLue => ({ champ: 'fills', indice: 0, porteur, variable: { id: cle, cle, nom: cle, collection: 'x', distante: false } });
  const base = { type: 'FRAME', visible: true, opacite: 1, dimensions: dims(), valeursEnDur: [] as LayerLu['valeursEnDur'] };
  const racineLiee: LayerLu = { ...base, id: 'R', nom: 'Root', parent: null, peintures: [solide('fills', gris(1))], liaisons: [lie('R', 'xa')] };
  const layers: LayerLu[] = [
    racineLiee,
    { ...base, id: 'M', nom: 'Mid', parent: intermediaire ? 'F' : parentM, visible: visibleM, opacite: opaciteM, peintures: [solide('fills', gris(0.5), 0.5)], liaisons: [lie('M', 'yb')] },
    { ...texte([solide('fills', gris(0))], 14, 400, 'T'), parent: 'M' },
    { ...texte([solide('fills', gris(0))], 14, 400, 'S'), parent: 'R' },
  ];
  if (intermediaire) layers.push({ ...base, id: 'F', nom: 'Frame', parent: 'R', peintures: [], liaisons: [] });
  return variant('v', layers);
}

const combinaisonsDeFonds = (): Combinaison[] => {
  const resultat: Combinaison[] = [];
  for (const a of ['a1', 'a2', undefined]) for (const b of ['b1', 'b2']) for (const z of ['z1', 'z2']) {
    const modes = new Map<string, string>();
    if (a) modes.set('A', a);
    modes.set('B', b);
    modes.set('Z', z);
    resultat.push({ modes, etiquette: `${a}/${b}/${z}` });
  }
  return resultat;
};

test('le fond égale celui d\'avant dans deux contextes qui ne diffèrent que par un mode, un ancêtre, une opacité ou une visibilité', () => {
  const catalogue = catalogueDeFonds();
  const variantes: [string, VariantLu][] = [
    ['base', arbreDeFonds()],
    ['opacité', arbreDeFonds({ opaciteM: 0.4 })],
    ['ancêtre intermédiaire', arbreDeFonds({ intermediaire: true })],
    ['sans racine', arbreDeFonds({ parentM: null })],
    ['parent inconnu', arbreDeFonds({ parentM: 'absent' })],
    ['ancêtre masqué', arbreDeFonds({ visibleM: false })],
  ];
  const fondsDeLaBase = new Set<string>();
  for (const sens of [1, -1]) {
    const combos = sens === 1 ? combinaisonsDeFonds() : [...combinaisonsDeFonds()].reverse();
    for (const [nom, v] of sens === 1 ? variantes : [...variantes].reverse()) {
      for (const layerId of ['T', 'S', 'M', 'R']) {
        const layer = v.layers.find((l) => l.id === layerId)!;
        for (const combinaison of combos) {
          const attendu = fondDeReference(v, layer, catalogue, combinaison);
          assert.deepEqual(fondEffectif(v, layer, catalogue, combinaison), attendu, `${nom} ${layerId} ${combinaison.etiquette}`);
          if (nom === 'base' && layerId === 'T') fondsDeLaBase.add(JSON.stringify(attendu));
        }
      }
    }
  }
  assert.ok(fondsDeLaBase.size >= 3, 'les modes changent le fond du texte');
});

test('deux combinaisons qui s\'accordent sur les modes des ancêtres partagent un fond, une qui en change un non', () => {
  const catalogue = catalogueDeFonds();
  const v = arbreDeFonds();
  const texteT = v.layers.find((l) => l.id === 'T')!;
  const combinaison = (a: string, b: string, z: string): Combinaison => ({ modes: new Map([['A', a], ['B', b], ['Z', z]]), etiquette: '' });
  const un = fondEffectif(v, texteT, catalogue, combinaison('a1', 'b1', 'z1'));
  assert.equal(fondEffectif(v, texteT, catalogue, combinaison('a1', 'b1', 'z2')), un, 'Z n\'est lue par aucun ancêtre');
  assert.notDeepEqual(fondEffectif(v, texteT, catalogue, combinaison('a2', 'b1', 'z1')), un, 'A est lue par la racine');
  assert.notDeepEqual(fondEffectif(v, texteT, catalogue, combinaison('a1', 'b2', 'z1')), un, 'B est lue par M');
  assert.ok(Object.isFrozen(un));
});

test('la mémoire des fonds suit le tableau des layers et le catalogue', () => {
  const catalogue = catalogueDeFonds();
  const v = arbreDeFonds();
  const texteT = v.layers.find((l) => l.id === 'T')!;
  const combinaison: Combinaison = { modes: new Map([['A', 'a1'], ['B', 'b1']]), etiquette: '' };
  const avant = fondEffectif(v, texteT, catalogue, combinaison);
  v.layers = v.layers.map((l) => (l.id === 'M' ? { ...l, opacite: 0.1 } : l));
  assert.deepEqual(fondEffectif(v, texteT, catalogue, combinaison), fondDeReference(v, texteT, catalogue, combinaison));
  assert.notDeepEqual(fondEffectif(v, texteT, catalogue, combinaison), avant, 'une opacité différente change le fond');
  v.layers.push({ ...v.layers[0], id: 'R2', parent: null, peintures: [solide('fills', gris(0))], liaisons: [] });
  v.layers = [...v.layers.slice(0, 1), { ...v.layers[1], parent: 'R2' }, ...v.layers.slice(2)];
  assert.deepEqual(fondEffectif(v, texteT, catalogue, combinaison), fondDeReference(v, texteT, catalogue, combinaison));
  const autre = catalogueDeFonds();
  autre.variables = autre.variables.map((x) => (x.cle === 'xa' ? { ...x, valeurs: { a1: rouge(0.3), a2: rouge(0.3) } } : x));
  assert.deepEqual(fondEffectif(v, texteT, autre, combinaison), fondDeReference(v, texteT, autre, combinaison), 'un autre catalogue relit');
});

test('le fond lit les ancêtres une fois par contexte de modes, pas une fois par cible et par combinaison', () => {
  const lectures = { memoire: 0, reference: 0 };
  const compter = (cle: keyof typeof lectures) => {
    const v = arbreDeFonds();
    for (const ancetre of v.layers.filter((l) => l.id === 'M' || l.id === 'R')) {
      const { peintures } = ancetre;
      Object.defineProperty(ancetre, 'peintures', { enumerable: true, get() { lectures[cle] += 1; return peintures; } });
    }
    return v;
  };
  const catalogue = catalogueDeFonds();
  const memoire = compter('memoire');
  const reference = compter('reference');
  for (const combinaison of combinaisonsDeFonds()) for (let rang = 0; rang < 20; rang++) {
    for (const id of ['T', 'S']) {
      fondEffectif(memoire, memoire.layers.find((l) => l.id === id)!, catalogue, combinaison);
      fondDeReference(reference, reference.layers.find((l) => l.id === id)!, catalogue, combinaison);
    }
  }
  assert.ok(lectures.reference > 500, `${lectures.reference} lectures sans mémoire`);
  assert.ok(lectures.memoire <= 16, `${lectures.memoire} lectures avec la mémoire`);
});

test('les layers visibles se calculent une fois par variant pour tous les contrôles d\'accessibilité', () => {
  let lectures = 0;
  const layers = [racine(), ...Array.from({ length: 200 }, (_, i) => texte([solide('fills', gris(0))], 14, 400, `t${i}`))];
  for (const layer of layers) {
    const { visible } = layer;
    Object.defineProperty(layer, 'visible', { enumerable: true, get() { lectures += 1; return visible; } });
  }
  cc(releve([variant('a', layers)]));
  assert.ok(lectures <= 2 * layers.length, `${lectures} lectures de visibilité pour ${layers.length} layers`);
});

/* ---------- Fonds d'élévation et sévérité selon les garanties (K4) ---------- */

const luminance = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
/** Le gris, plus clair que `fond`, dont le rapport sur `fond` atteint tout juste `cible`. */
function grisAuRapport(fond: number, cible: number): number {
  let v = fond;
  while ((luminance(v) + 0.05) / (luminance(fond) + 0.05) < cible) v += 0.0001;
  return v;
}

function themeAvecFonds(variableDuTheme: string, trait: number, fonds: Partial<CatalogueDeReference> = {}): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [
      { cle: 'ck', nom: 'theme', role: 'theme', etat: 'lue', modes: [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }] },
      { cle: 'cc', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'm', nom: 'Mode 1' }] },
    ],
    variables: [
      { cle: 'tv', nom: variableDuTheme, collection: 'ck', type: 'COLOR', etat: 'presente', valeurs: { l: { valeur: gris(0) }, d: { valeur: gris(trait) } } },
      { cle: 'jeton', nom: 'button/border', collection: 'cc', type: 'COLOR', etat: 'presente', valeurs: { m: { alias: 'tv' } } },
    ],
    ...fonds,
  };
}
const FONDS_SOMBRES = { l: { page: gris(1), carte: gris(1) }, d: { page: gris(0.1), carte: gris(0.2) } };

function varianteAvecTrait(cleLiee: string, nombreDeTraits = 1): VariantLu {
  const traits: LayerLu[] = Array.from({ length: nombreDeTraits }, (_, i) => ({
    id: `b${i}`, nom: `Border ${i}`, type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(0))],
    strokeWeight: 1, valeursEnDur: [],
    liaisons: [{ champ: 'strokes', indice: 0, porteur: `b${i}`, variable: { id: 'v', cle: cleLiee, nom: 'x', collection: 'c', distante: false } }],
  }));
  const v = variant('a', [racine([]), ...traits]);
  v.modesEffectifs = { ck: 'd' };
  return v;
}
const sur = (constats: ReturnType<typeof cc>, fond: string) => parCode(constats, 'C50').filter((c) => c.faits.fondNomme === fond);

test('C50 : page/border à 2,7:1 sur la page en Dark est à corriger, sur la carte aussi (G6 porte la carte)', () => {
  const trait = grisAuRapport(0.1, 2.7);
  const catalogue = themeAvecFonds('page/border', trait, { fondsDElevation: FONDS_SOMBRES });
  const constats = cc(releve([varianteAvecTrait('jeton')]), 'AA', catalogue);
  const page = sur(constats, 'page');
  assert.equal(page.length, 1);
  assert.equal(page[0].type, 'corriger');
  assert.equal(page[0].faits.variableDuTheme, 'page/border');
  assert.equal(page[0].faits.garanti, 'oui');
  assert.match(String(page[0].faits.mode), /theme en Dark/);
  assert.ok(Number(page[0].faits.rapport) >= 2.6 && Number(page[0].faits.rapport) < 3);
  const carte = sur(constats, 'carte');
  assert.equal(carte.length, 1);
  assert.equal(carte[0].type, 'corriger');
  assert.equal(carte[0].faits.garanti, 'oui');
  assert.equal(constats.find((c) => c.limite && c.faits.cause === 'fond-indetermine'), undefined);
});

test('C50 : page/divider à 2,4:1 sur la carte en Dark est à vérifier, aucune garantie ne le couvre', () => {
  const trait = grisAuRapport(0.2, 2.4);
  const catalogue = themeAvecFonds('page/divider', trait, { fondsDElevation: FONDS_SOMBRES });
  const constats = cc(releve([varianteAvecTrait('tv')]), 'AA', catalogue);
  const carte = sur(constats, 'carte');
  assert.equal(carte.length, 1);
  assert.equal(carte[0].type, 'verifier');
  assert.equal(carte[0].faits.variableDuTheme, 'page/divider');
  assert.equal(carte[0].faits.garanti, 'non');
  assert.ok(Number(carte[0].faits.rapport) >= 2.3 && Number(carte[0].faits.rapport) < 2.5);
  for (const c of parCode(constats, 'C50')) assert.equal(c.type, 'verifier');
});

test('C50 : une variable hors du thème se vérifie, même sur la page', () => {
  const trait = grisAuRapport(0.1, 2.7);
  const catalogue = themeAvecFonds('page/border', trait, { fondsDElevation: FONDS_SOMBRES });
  catalogue.variables.push({ cle: 'libre', nom: 'trait', collection: 'cc', type: 'COLOR', etat: 'presente', valeurs: { m: { valeur: gris(trait) } } });
  const constats = cc(releve([varianteAvecTrait('libre')]), 'AA', catalogue);
  const page = sur(constats, 'page');
  assert.equal(page.length, 1);
  assert.equal(page[0].type, 'verifier');
  assert.equal(page[0].faits.variableDuTheme, '');
});

test('C50 : sans fonds d\'élévation, la page Figma sert de repli, à vérifier, avec un seul constat fond-de-repli', () => {
  const trait = grisAuRapport(0.1, 2.7);
  const catalogue = themeAvecFonds('page/border', trait, { fondDeLaPageFigma: gris(0.1) });
  const constats = cc(releve([varianteAvecTrait('jeton', 2)]), 'AA', catalogue);
  const mesures = parCode(constats, 'C50');
  assert.equal(mesures.length, 2);
  for (const c of mesures) {
    assert.equal(c.type, 'verifier');
    assert.equal(c.faits.fondNomme, 'page-figma');
    assert.equal(c.faits.garanti, 'non');
  }
  const replis = constats.filter((c) => c.limite && c.faits.cause === 'fond-de-repli');
  assert.equal(replis.length, 1);
  assert.equal(replis[0].type, 'info');
  assert.deepEqual(replis[0].layers.sort(), ['b0', 'b1']);
});

test('C50 : sans fonds d\'élévation ni page Figma, le fond reste indéterminé et rien n\'est mesuré', () => {
  const catalogue = themeAvecFonds('page/border', grisAuRapport(0.1, 2.7));
  const constats = cc(releve([varianteAvecTrait('jeton')]), 'AA', catalogue);
  assert.equal(parCode(constats, 'C50').length, 0);
  assert.ok(constats.find((c) => c.limite && c.faits.cause === 'fond-indetermine'));
  assert.equal(constats.find((c) => c.faits.cause === 'fond-de-repli'), undefined);
});

test('C52 : un jeu dont les états s’écrivent Default, Hovered et Press est interactif', () => {
  const v = variant('petit', [racine([solide('fills', gris(1))], dims(20, 20))], { State: 'Default' });
  const constats = parCode(cc(releve([v], ['Default', 'Hovered', 'Press'])), 'C52');
  assert.equal(constats.length, 1);
  assert.equal(constats[0].faits.seuil, 24);
  assert.equal(parCode(cc(releve([v], ['Default', 'Disabled'])), 'C52').length, 0);
});

test('C50 : un contour SOLID visible d’opacité nulle ne se mesure pas', () => {
  const bord = (opacite: number): LayerLu => ({
    id: 'b', nom: 'Border', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(0.85), opacite)],
    strokeWeight: 1, liaisons: [], valeursEnDur: [],
  });
  assert.equal(parCode(cc(releve([variant('a', [racine(), bord(1)])])), 'C50').length, 1);
  assert.equal(parCode(cc(releve([variant('a', [racine(), bord(0)])])), 'C50').length, 0);
});

test('C50 : un anneau dont le contour est d’opacité nulle ne compte pas comme anneau visible', () => {
  const anneau = (opacite: number): LayerLu => ({
    id: 'f', nom: 'Focus ring', type: 'RECTANGLE', parent: 'r', visible: true, opacite: 1, dimensions: dims(), peintures: [solide('strokes', gris(0), opacite)],
    strokeWeight: 2, liaisons: [], valeursEnDur: [],
  });
  const sansAnneau = (opacite: number) => cc(releve([variant('f', [racine(), anneau(opacite)], { State: 'focus' })], ['default', 'focus'])).find((c) => c.id === 'C50:sans-anneau');
  assert.equal(sansAnneau(1), undefined);
  assert.ok(sansAnneau(0));
});
