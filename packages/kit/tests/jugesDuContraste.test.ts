/**
 * Les deux juges du contraste, C49 (Architect) et `constatsDesContrastes` (`ucm check`), reçoivent la même paire et rendent le même
 * verdict : le seuil, la couleur composée, la tolérance du gamut et la profondeur d'alias viennent des mêmes sources.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CONTRACT_VERSION } from '../src/format/index';
import { controlerLAccessibilite, PROFONDEUR_D_ALIAS, type CatalogueDeReference, type LayerLu, type LiaisonLue, type ReleveDeComposant } from '../src/controles/index';
import { composer, contraste, contrasteTronque, composanteDansLeGamut, versRgb8, type Rgba } from '../src/emplois/index';
import { constatsDesContrastes, sectionContrastes } from '@ucm-kit/core/lecteurs';

const BLANC: Rgba = { r: 1, g: 1, b: 1, a: 1 };
const gris = (octet: number, a = 1): Rgba => ({ r: octet / 255, g: octet / 255, b: octet / 255, a });

type Role = 'foreground' | 'icon';
type Peinture = { couleur: Rgba } | { chaine: number };
type VerdictDeC49 = { seuil: number; rapport: number } | { limite: string } | null;
type VerdictDeCheck = { seuil: number; rapport: number } | { ecart: string } | null;

/** Le chemin du token que la chaîne de `n` alias atteint : `t0` vise `t1`, jusqu'à `t<n>` qui porte la couleur. */
const chemin = (rang: number): string => `composants.bouton.t${rang}`;

/** Un relevé d'un seul variant : un fond blanc de la page et un layer dont la couleur est dite par `peinture`, avec son catalogue. */
function lireAvecC49(role: Role, peinture: Peinture, fond: Rgba): VerdictDeC49 {
  const liaison: LiaisonLue[] = 'chaine' in peinture
    ? [{ champ: 'fills', indice: 0, porteur: 'l', variable: { id: 'v0', cle: 'k0', nom: 't0', collection: 'ck', distante: false } }]
    : [];
  const couleur = 'couleur' in peinture ? peinture.couleur : gris(0);
  const solide = (c: Rgba, champ: 'fills') => ({ champ, indice: 0, type: 'SOLID' as const, visible: true, opacite: 1, blendMode: 'NORMAL', couleur: c });
  const dims = { x: 0, y: 0, largeur: 100, hauteur: 48 };
  const racine: LayerLu = { id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: dims, peintures: [solide(fond, 'fills')], liaisons: [], valeursEnDur: [] };
  const layer: LayerLu = role === 'icon'
    ? { id: 'l', nom: 'icon', type: 'VECTOR', parent: 'r', visible: true, opacite: 1, dimensions: { ...dims, largeur: 24, hauteur: 24 }, peintures: [solide(couleur, 'fills')], liaisons: liaison, valeursEnDur: [] }
    : {
      id: 'l', nom: 'Label', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions: { ...dims, largeur: 40, hauteur: 16 }, peintures: [], liaisons: [], valeursEnDur: [],
      texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [solide(couleur, 'fills')], liaisons: liaison }] },
    };
  const releve: ReleveDeComposant = {
    version: 1, jeu: { cle: 'k', id: '1', nom: 'x-button' }, proprietes: [],
    variants: [{ id: 'a', nom: 'a', valeurs: {}, layers: [racine, layer], modesEffectifs: { ck: 'm' } }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'ck', nom: 'composants', role: null, etat: 'lue', modes: [{ id: 'm', nom: 'Mode' }] }],
    variables: 'chaine' in peinture
      ? Array.from({ length: peinture.chaine + 1 }, (_, rang) => ({
        cle: `k${rang}`, nom: `t${rang}`, collection: 'ck', type: 'COLOR' as const, etat: 'presente' as const,
        valeurs: { m: rang === peinture.chaine ? { valeur: gris(0) } : { alias: `k${rang + 1}` } },
      }))
      : [],
  };
  const constats = controlerLAccessibilite(releve, catalogue, { niveau: 'AA' }).filter((c) => c.code === 'C49' && c.faits.usage !== 'taille');
  const mesure = constats.find((c) => !c.limite);
  if (mesure) return { seuil: Number(mesure.faits.seuil), rapport: Number(mesure.faits.rapport) };
  const limite = constats.find((c) => c.limite);
  return limite ? { limite: String(limite.faits.cause) } : null;
}

const srgb = (c: Rgba) => ({ colorSpace: 'srgb', components: [c.r, c.g, c.b], alpha: c.a });
const feuille = (valeur: unknown) => ({ $type: 'color', $value: valeur });

/** Un contrat d'un variant : le fond à la racine, la couleur d'un `role` dans le slot `label`. */
function contrat(role: Role) {
  return {
    meta: { contractVersion: CONTRACT_VERSION },
    rendering: { roles: {}, keyRoles: {} },
    variantViews: { vue: { structure: 'arbre', paintPlacements: 'peintures' } },
    viewStructures: { arbre: { children: [] } },
    viewPaintPlacements: { peintures: { fills: { background: [[]], [role]: [['label']] }, strokes: {} } },
    variants: [{ values: {}, view: 'vue', tokens: { background: '{composants.bouton.fond}', [role]: `{${chemin(0)}}` } }],
  };
}

function lireAvecCheck(role: Role, peinture: Peinture, fond: Rgba): VerdictDeCheck {
  const jetons: Record<string, unknown> = { fond: feuille(srgb(fond)) };
  if ('chaine' in peinture) {
    for (let rang = 0; rang <= peinture.chaine; rang++) jetons[`t${rang}`] = feuille(rang === peinture.chaine ? srgb(gris(0)) : `{${chemin(rang + 1)}}`);
  } else {
    jetons.t0 = feuille(srgb(peinture.couleur));
  }
  const constats = constatsDesContrastes(contrat(role), { composants: { bouton: jetons } });
  const ecart = constats.find((c) => c.nature === 'non-verifiee');
  if (ecart && ecart.nature === 'non-verifiee') return { ecart: ecart.cause };
  const constat = constats.find((c) => c.nature === 'contraste');
  if (constat && constat.nature === 'contraste') return { seuil: constat.seuil, rapport: contrasteTronque(constat.mesures[0].valeur ?? 0) };
  return null;
}

/** Les deux juges lisent la même paire ; un manque sous le seuil se dit par son seuil et son rapport tronqué. */
function lesDeuxJuges(role: Role, peinture: Peinture, fond: Rgba = BLANC): { c49: VerdictDeC49; check: VerdictDeCheck } {
  return { c49: lireAvecC49(role, peinture, fond), check: lireAvecCheck(role, peinture, fond) };
}

test('Z1 : une icône #8A8A8A sur blanc, à 3,45:1, manque sous 4,5:1 pour C49 comme pour ucm check', () => {
  const { c49, check } = lesDeuxJuges('icon', { couleur: gris(0x8a) });
  assert.deepEqual(c49, { seuil: 4.5, rapport: 3.45 });
  assert.deepEqual(check, c49);
});

test('Z2 : un texte noir d’alpha 0,40 sur blanc est jugé composé, à 2,84:1, par C49 et par ucm check', () => {
  const { c49, check } = lesDeuxJuges('foreground', { couleur: { r: 0, g: 0, b: 0, a: 0.4 } });
  const composee = composer([{ r: 0, g: 0, b: 0, a: 0.4 }], BLANC);
  assert.ok(composee);
  assert.equal(contrasteTronque(contraste(versRgb8(composee), versRgb8(BLANC))), 2.84);
  assert.deepEqual(c49, { seuil: 4.5, rapport: 2.84 });
  assert.deepEqual(check, c49);
});

test('Z3 : une composante de 1,0000001 ou de −1e-7 sort du gamut pour les deux juges, 1 et 0 y restent', () => {
  assert.equal(composanteDansLeGamut(1.0000001), false);
  assert.equal(composanteDansLeGamut(-1e-7), false);
  assert.equal(composanteDansLeGamut(1) && composanteDansLeGamut(0), true);
  const { c49: surFond, check: checkSurFond } = lesDeuxJuges('foreground', { couleur: gris(0x99) }, { r: 1.0000001, g: 1, b: 1, a: 1 });
  assert.deepEqual(surFond, { limite: 'couleur-hors-gamut' });
  assert.deepEqual(checkSurFond, { ecart: 'hors-limites' });
  const { c49: negatif, check: checkNegatif } = lesDeuxJuges('foreground', { couleur: { r: 0.5, g: -1e-7, b: 0.5, a: 1 } });
  assert.deepEqual(negatif, { limite: 'couleur-hors-gamut' });
  assert.deepEqual(checkNegatif, { ecart: 'hors-limites' });
  const { c49: borne, check: checkBorne } = lesDeuxJuges('foreground', { couleur: { r: 0.6, g: 0.6, b: 0.6, a: 1 } }, { r: 1, g: 1, b: 1, a: 1 });
  assert.ok(borne && 'rapport' in borne);
  assert.deepEqual(checkBorne, borne);
});

test('Z4 : une chaîne de 10 alias se lit, une de 11 ou de 20 non : C49 rend mode-illisible et ucm check « plus de 10 alias à suivre »', () => {
  assert.equal(PROFONDEUR_D_ALIAS, 10);
  // Le noir de bout de chaîne passe : une chaîne lue ne rend ni manque ni limite, une chaîne coupée rend une limite.
  assert.deepEqual(lesDeuxJuges('foreground', { chaine: PROFONDEUR_D_ALIAS }), { c49: null, check: null });
  for (const n of [PROFONDEUR_D_ALIAS + 1, 20]) {
    const { c49, check } = lesDeuxJuges('foreground', { chaine: n });
    assert.deepEqual(c49, { limite: 'mode-illisible' }, `${n} alias`);
    assert.deepEqual(check, { ecart: 'alias-trop-longs' }, `${n} alias`);
  }
});

test('Z5 : une couleur display-p3 dans tokens.json donne la ligne « Couleur non vérifiée », une fois par couleur', () => {
  const document = {
    composants: { bouton: { fond: feuille(srgb(BLANC)), t0: feuille({ colorSpace: 'display-p3', components: [0.2, 0.3, 0.9], alpha: 1 }) } },
  };
  const constats = constatsDesContrastes(contrat('foreground'), document);
  assert.deepEqual(constats, [{ nature: 'non-verifiee', chemin: chemin(0), cause: 'display-p3' }]);
  const bilans = [{ fichier: 'A.contract.json', contrastes: constats }, { fichier: 'B.contract.json', contrastes: constats }];
  const lignes = sectionContrastes(bilans).filter((ligne) => ligne.includes('Couleur non vérifiée'));
  assert.deepEqual(lignes.map((ligne) => ligne.replace(/^- /, '')), [`Couleur non vérifiée : \`${chemin(0)}\`, couleur Display P3, hors du périmètre d'UCM.`]);
});

test('Z5 : les lignes des deux autres causes s’écrivent mot pour mot', () => {
  const constats = [
    { nature: 'non-verifiee' as const, chemin: 'a.b', cause: 'hors-limites' as const },
    { nature: 'non-verifiee' as const, chemin: 'a.c', cause: 'alias-trop-longs' as const },
  ];
  const texte = sectionContrastes([{ fichier: 'A.contract.json', contrastes: constats }]).join('\n');
  assert.match(texte, /^- Couleur non vérifiée : `a\.b`, valeur hors des limites d'une couleur\.$/m);
  assert.match(texte, /^- Couleur non vérifiée : `a\.c`, plus de 10 alias à suivre\.$/m);
});
