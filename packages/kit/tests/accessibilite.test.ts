/** Contraste et accessibilité d'un composant : un cas positif et un négatif par contrôle. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BORNE_DE_COMBINAISONS, controlerLAccessibilite, controlerLAccessibiliteParEtapes,
  type CatalogueDeReference, type LayerLu, type PeintureLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index';

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
      mode: 'c1 en M1, c2 en M1', autresModes: 1, premierPlan: '#ffffff', fond: '#ffffff',
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
  assert.equal(c.faits.premierPlan, '#ffffff');
  assert.equal(c.faits.fond, '#ffffff');
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
