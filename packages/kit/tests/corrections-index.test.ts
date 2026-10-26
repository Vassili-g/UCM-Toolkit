import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { proposerLesCorrections, proposerLesCorrectionsParEtapes, type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant, type VariantLu } from '../src/controles/index.js';

/**
 * 90 variants de dix layers : les trois états du jeu Button, avec C15, C16, C17, C25 (exact, multiple) et C29 (exact,
 * multiple, proche, sans candidat, recherche incomplète), et deux layers qui portent le même identifiant.
 */
const ETATS = ['default', 'hover', 'pressed'] as const;
const BASE = 'button/color/primary/contained';

function layer(id: string, nom: string, type: string, extra: Partial<LayerLu> = {}): LayerLu {
  return { id, nom, type, parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], liaisons: [], valeursEnDur: [], ...extra };
}

const peinture = { champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' };
const liaisonDeFond = (porteur: string) => ({ champ: 'fills', indice: 0, porteur, variable: { id: 'old', cle: 'old', nom: `${BASE}/default/background`, collection: 'components', distante: false } });

export function fixture(): { releve: ReleveDeComposant; catalogue: CatalogueDeReference; constats: Constat[] } {
  const variants: VariantLu[] = [];
  const constats: Constat[] = [];
  for (let i = 0; i < 90; i += 1) {
    const etat = ETATS[i % 3];
    const id = (j: number) => `v${i}-l${j}`;
    const dur = (champ: string, valeur: number) => [{ champ, valeur }];
    const doublon = i === 5 || i === 6;
    const layers = [
      layer(id(0), 'root', 'FRAME', { peintures: [peinture], liaisons: [liaisonDeFond(id(0))] }),
      layer(id(1), 'title', 'TEXT', { peintures: [peinture] }),
      layer(id(2), 'label', 'TEXT', { peintures: [peinture], liaisons: [liaisonDeFond(id(2))] }),
      layer(id(3), 'frame-3', 'FRAME', { valeursEnDur: dur('gap', 4) }),
      layer(id(4), 'frame-4', 'FRAME', { valeursEnDur: dur('paddingLeft', 15) }),
      layer(doublon ? 'doublon' : id(5), 'frame-5', 'FRAME', { valeursEnDur: dur('cornerRadius', 12) }),
      layer(id(6), 'frame-6', 'FRAME', { valeursEnDur: dur('strokeWeight', 1) }),
      layer(id(7), 'frame-7', 'FRAME', { valeursEnDur: dur('itemSpacing', 40) }),
      layer(id(8), 'frame-8', 'FRAME'),
      layer(id(9), 'frame-9', 'FRAME', { visible: i % 2 === 0, valeursEnDur: dur('gap', 4) }),
    ];
    variants.push({ id: `variant-${i}`, nom: `Button ${i}`, valeurs: { State: etat, Note: `n${i}` }, modesEffectifs: {}, layers });
    const fait = (code: 'C15' | 'C16'): Constat => ({ id: `${code}:${i}`, code, type: 'corriger', famille: 'liaisons', variants: [`variant-${i}`], layers: [id(0)], faits: { axe: 'State', valeur: etat, token: `${BASE}/default/background`, champ: 'fills', indice: 0 } });
    if (etat !== 'default') constats.push(fait('C16'));
    if (etat === 'pressed') constats.push(fait('C15'));
    constats.push({ id: `C17:${i}`, code: 'C17', type: 'corriger', famille: 'liaisons', variants: [`variant-${i}`], layers: [id(2)], faits: { token: `${BASE}/default/background`, attendu: 'foreground', champ: 'fills', indice: 0 } });
    constats.push({ ...fait('C15'), id: `C15:inconnu:${i}`, layers: ['absent'] });
  }
  const color = (cle: string, nom: string) => ({ cle, nom, collection: 'components', type: 'COLOR' as const, etat: 'presente' as const });
  // Les tokens de taille sont ceux du composant : C29 ne cherche plus dans `layout`.
  const nombre = (cle: string, nom: string, valeur: number) => ({ cle, nom, collection: 'components', type: 'FLOAT' as const, etat: 'presente' as const, valeurs: { Light: { valeur } } });
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [
      { cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' },
      { cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' },
    ],
    variables: [
      color('old', `${BASE}/default/background`),
      color('bg-hover', `${BASE}/hover/background`),
      color('bg-pressed', `${BASE}/pressed/background`),
      ...ETATS.map((e) => color(`fg-${e}`, `${BASE}/${e}/foreground`)),
      color('fg-pressed-bis', `${BASE}/pressed/foreground`),
      nombre('gap-4', 'button/size/gap', 4), nombre('pad-16', 'button/size/padding-left', 16),
      nombre('radius-12a', 'button/size/radius', 12), nombre('radius-12b', 'button/size/radius', 12),
      { cle: 'stroke-pending', nom: 'button/size/border-width', collection: 'components', type: 'FLOAT', etat: 'non-chargee' },
      // Un token de `layout` de même valeur n'est jamais proposé.
      { cle: 'layout-gap-40', nom: 'layout/sizing/40', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 40 } } },
    ],
  };
  const releve: ReleveDeComposant = {
    version: 1, jeu: { cle: 'button-set', id: 'button-set', nom: 'Button' },
    proprietes: [
      { nom: 'State', type: 'VARIANT', valeurs: [...ETATS], defaut: 'default' },
      { nom: 'Note', type: 'VARIANT', valeurs: variants.map((v) => v.valeurs.Note), defaut: 'n0' },
    ],
    variants, lecture: { layersLus: 900, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
  return { releve, catalogue, constats };
}

/**
 * Empreinte de la sortie de `proposerLesCorrections` sur cette fixture, recalculée quand C29 a cessé de chercher dans `layout`
 * (lot K1 de la recette v1). La précédente, prise au commit 34c64a65 avant les index, ne vaut plus : la règle a changé la
 * sortie de C29, et la fixture, ses variables de taille.
 */
const EMPREINTE_DE_HEAD = '91f3dfff55816e3b6a470faf59b414e39b99c0f4fd4ef9799748d978ba7673fe';

test('les index rendent la sortie de la version sans index, sur 90 variants', () => {
  const { releve, catalogue, constats } = fixture();
  const sortie = proposerLesCorrections(releve, catalogue, constats);
  const comptes = (code: string) => sortie.filter((constat) => constat.code === code);
  assert.ok(comptes('C22').some((constat) => constat.correction));
  assert.ok(comptes('C24').some((constat) => constat.correction));
  assert.ok(comptes('C16').some((constat) => constat.question?.indice));
  assert.ok(comptes('C25').some((constat) => constat.correction) && comptes('C25').some((constat) => constat.question));
  assert.ok(comptes('C29').some((constat) => constat.correction));
  assert.ok(comptes('C29').some((constat) => constat.question && constat.faits.proche === 1));
  assert.ok(comptes('C29').some((constat) => constat.faits.recherche === 'incomplete'));
  // Un identifiant porté par deux layers ne désigne aucun layer : ni correction ni question.
  const doublons = sortie.filter((constat) => constat.layers.includes('doublon'));
  assert.equal(doublons.length, 2);
  assert.ok(doublons.every((constat) => !constat.correction && !constat.question));
  assert.equal(createHash('sha256').update(JSON.stringify(sortie)).digest('hex'), EMPREINTE_DE_HEAD);
  const calcul = proposerLesCorrectionsParEtapes(releve, catalogue, constats);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  assert.equal(createHash('sha256').update(JSON.stringify(etape.value)).digest('hex'), EMPREINTE_DE_HEAD, 'la voie par étapes garde l’empreinte historique');
});

test('proposerLesCorrections ne modifie ni le relevé, ni le catalogue, ni les constats', () => {
  const { releve, catalogue, constats } = fixture();
  const avant = JSON.stringify({ releve, catalogue, constats });
  proposerLesCorrections(releve, catalogue, constats);
  assert.equal(JSON.stringify({ releve, catalogue, constats }), avant);
});

test('la voie par étapes rend la sortie de la voie synchrone, C25 et C29 compris, et cède pendant l’index', () => {
  const { releve, catalogue, constats } = fixture();
  const calcul = proposerLesCorrectionsParEtapes(releve, catalogue, constats);
  let etapes = 0;
  let resultat = calcul.next();
  while (!resultat.done) { etapes += 1; resultat = calcul.next(); }
  // L'index seul compte plus de 900 layers, sans compter les constats.
  assert.ok(etapes > 900, `${etapes} étapes`);
  const attendu = proposerLesCorrections(releve, catalogue, constats);
  assert.deepEqual(resultat.value, attendu);
  assert.ok(resultat.value.some(({ code }) => code === 'C25') && resultat.value.some(({ code }) => code === 'C29'));
});

test('la voie par étapes cède avant d’avoir fini l’index', () => {
  const { releve, catalogue, constats } = fixture();
  let layersLus = 0;
  for (const variant of releve.variants) {
    const layers = variant.layers;
    variant.layers = new Proxy(layers, { get(cible, cle, recepteur) { if (cle === Symbol.iterator) layersLus += 1; return Reflect.get(cible, cle, recepteur); } });
  }
  const calcul = proposerLesCorrectionsParEtapes(releve, catalogue, constats);
  calcul.next();
  assert.ok(layersLus < 3, `${layersLus} variants lus à la première étape`);
});
