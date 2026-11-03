/**
 * Garde l'oracle numérique de F7 (`stress/f7-accessibilite/oracleContraste.ts`) et la recherche de paires (`paires.ts`) : l'oracle
 * n'importe rien de `src/emplois/`, rend les rapports connus, tient la même table de luminance avec 0,03928 et 0,04045, et diffère de
 * moins de 1e-12 de `contraste` du kit sur 100 000 paires opaques de la graine 7107. La recherche rend la paire la plus proche de
 * chaque seuil, à plus de 1e-9, que le test retrouve en parcourant les 16 777 216 couleurs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { contraste } from '../src/emplois/contraste.js';
import { mulberry32 } from './stress/commun/prng.js';
import {
  atteintLeSeuil, composer, couleurDeHex, estFragile, estUnGrandTexte, hexDe, luminanceDe, mesurerLaPaire, octetsDeHex, rapportDeContraste, rapportDeHex, tableDeLuminance, TABLE_SRGB, tronquerA2,
} from './stress/f7-accessibilite/oracleContraste.js';
import { COMPOSITIONS_FRAGILES, compositionsFragiles, grisLesPlusProches, MARGE, paireLaPlusProche } from './stress/f7-accessibilite/paires.js';

const dossierF7 = './stress/f7-accessibilite/';
const source = (nom: string): string => readFileSync(fileURLToPath(new URL(`${dossierF7}${nom}`, import.meta.url)), 'utf8');

test('l\'oracle et la recherche de paires n\'importent rien de src/emplois/', () => {
  for (const nom of ['oracleContraste.ts', 'paires.ts']) {
    assert.deepEqual(source(nom).match(/from '[^']*emplois[^']*'/g) ?? [], [], nom);
  }
});

test('noir sur blanc donne 21, deux couleurs égales donnent 1, et les repères de WCAG se retrouvent', () => {
  assert.equal(rapportDeHex('#000000', '#FFFFFF'), 21);
  assert.equal(rapportDeHex('#FFFFFF', '#000000'), 21);
  assert.equal(rapportDeHex('#3A7BC8', '#3A7BC8'), 1);
  assert.equal(rapportDeHex('#767676', '#FFFFFF').toFixed(4), '4.5422');
  assert.equal(rapportDeHex('#595959', '#FFFFFF').toFixed(4), '7.0047');
  assert.equal(rapportDeHex('#777777', '#FFFFFF').toFixed(4), '4.4781');
  assert.equal(rapportDeHex('#5A5A5A', '#FFFFFF').toFixed(4), '6.8969');
  assert.equal(rapportDeHex('#949494', '#FFFFFF').toFixed(4), '3.0335');
  assert.equal(rapportDeHex('#959595', '#FFFFFF').toFixed(4), '2.9953');
});

test('les seuils 0,03928 et 0,04045 donnent la même table de 256 luminances, que la coupure à 10/255 retrouve', () => {
  const [ancienne, courante] = [tableDeLuminance(0.03928), tableDeLuminance(0.04045)];
  assert.equal(courante.length, 256);
  assert.equal(courante.filter((valeur, octet) => valeur !== ancienne[octet]).length, 0);
  const coupureA10 = Array.from({ length: 256 }, (_, o) => (o <= 10 ? o / 255 / 12.92 : ((o / 255 + 0.055) / 1.055) ** 2.4));
  assert.deepEqual(coupureA10, [...courante]);
  assert.equal(TABLE_SRGB[255], 1);
  assert.equal(luminanceDe([255, 255, 255]).toFixed(12), '1.000000000000');
});

test('sur 100 000 paires opaques de la graine 7107, l\'oracle diffère de moins de 1e-12 de contraste du kit', () => {
  const tirer = mulberry32(7107);
  const octet = (): number => Math.floor(tirer() * 256);
  let ecart = 0;
  for (let i = 0; i < 100_000; i++) {
    const [a, b] = [[octet(), octet(), octet()] as const, [octet(), octet(), octet()] as const];
    ecart = Math.max(ecart, Math.abs(rapportDeContraste(a, b) - contraste(a, b)));
  }
  assert.ok(ecart < 1e-12, `écart maximal ${ecart}`);
});

test('la troncature à deux décimales ne s\'arrondit jamais, d\'après l\'écriture à dix décimales', () => {
  assert.equal(tronquerA2(2.999999817), 2.99);
  assert.equal(tronquerA2(3.000000003), 3);
  assert.equal(tronquerA2(4.4999993), 4.49);
  assert.equal(tronquerA2(4.499999999999), 4.5);
  assert.equal(tronquerA2(21), 21);
  assert.equal(atteintLeSeuil(4.499999851, 4.5), false);
  assert.equal(atteintLeSeuil(4.500000635, 4.5), true);
});

test('les six paires de la section 3.1 du plan et leurs rapports sont celles que la recherche rend', () => {
  const attendues: [number, string, string, number, string, number][] = [
    [3, '#FFFFFF', '#E969A1', 3.000000193, '#989A30', 2.999999768],
    [3, '#F8FAFC', '#9688CC', 3.000000003, '#F947C0', 2.999999817],
    [4.5, '#FFFFFF', '#7C7290', 4.500000635, '#9A6C5A', 4.499999851],
    [4.5, '#000000', '#9D5D9F', 4.50000066, '#458301', 4.499999932],
    [7, '#FFFFFF', '#33642C', 7.000000295, '#960FB1', 6.999998691],
    [7, '#F8FAFC', '#174CC4', 7.000000265, '#553FC1', 6.999999979],
  ];
  for (const [seuil, fond, dessus, rapportDessus, dessous, rapportDessous] of attendues) {
    const paires = paireLaPlusProche(seuil, fond);
    assert.equal(paires.auDessus.couleur, dessus, `${seuil} sur ${fond}`);
    assert.equal(paires.auDessus.rapport.toFixed(9), rapportDessus.toFixed(9), `${seuil} sur ${fond}`);
    assert.equal(paires.auDessous.couleur, dessous, `${seuil} sur ${fond}`);
    assert.equal(paires.auDessous.rapport.toFixed(9), rapportDessous.toFixed(9), `${seuil} sur ${fond}`);
  }
});

test('la paire la plus proche de chaque seuil sur chaque fond est celle de la recherche exhaustive des 16 777 216 couleurs, à plus de 1e-9', () => {
  const fonds = ['#FFFFFF', '#000000', '#F8FAFC'];
  const seuils = [3, 4.5, 7];
  const yFonds = fonds.map((fond) => luminanceDe(octetsDeHex(fond)));
  const meilleurs = fonds.flatMap(() => seuils.map(() => ({ dessus: Infinity, dessous: Infinity })));
  for (let r = 0; r < 256; r++) {
    for (let g = 0; g < 256; g++) {
      const partiel = 0.2126 * TABLE_SRGB[r] + 0.7152 * TABLE_SRGB[g];
      for (let b = 0; b < 256; b++) {
        const y = partiel + 0.0722 * TABLE_SRGB[b];
        for (let f = 0; f < 3; f++) {
          const yf = yFonds[f];
          const rapport = y >= yf ? (y + 0.05) / (yf + 0.05) : (yf + 0.05) / (y + 0.05);
          for (let s = 0; s < 3; s++) {
            const ecart = rapport - seuils[s];
            const meilleur = meilleurs[f * 3 + s];
            if (ecart > 0 && ecart < meilleur.dessus) meilleur.dessus = ecart;
            if (ecart < 0 && -ecart < meilleur.dessous) meilleur.dessous = -ecart;
          }
        }
      }
    }
  }
  fonds.forEach((fond, f) => seuils.forEach((seuil, s) => {
    const { auDessus, auDessous } = paireLaPlusProche(seuil, fond);
    const meilleur = meilleurs[f * 3 + s];
    assert.ok(Math.abs((auDessus.rapport - seuil) - meilleur.dessus) < 1e-12, `${seuil} sur ${fond} au-dessus`);
    assert.ok(Math.abs((seuil - auDessous.rapport) - meilleur.dessous) < 1e-12, `${seuil} sur ${fond} au-dessous`);
    assert.ok(auDessus.rapport - seuil > MARGE && seuil - auDessous.rapport > MARGE, `${seuil} sur ${fond} marge`);
  }));
});

test('les gris les plus proches de 4,5 sur blanc sont #767676 et #777777', () => {
  const { auDessus, auDessous } = grisLesPlusProches(4.5, '#FFFFFF');
  assert.deepEqual([auDessus.couleur, auDessous.couleur], ['#767676', '#777777']);
});

test('la composition se fait de bas en haut dans l\'espace encodé, avec un seul arrondi, et s\'arrête à la première couche opaque', () => {
  const rendu = composer(couleurDeHex('#FFFFFF'), [couleurDeHex('#000000', 0.5)])!;
  assert.equal(hexDe(rendu), '#808080');
  // Une couche opaque coupe la pile : celle du dessous n'est pas lue.
  assert.equal(hexDe(composer(null, [couleurDeHex('#112233', 0.5), couleurDeHex('#FF0000'), couleurDeHex('#00FF00')])!), hexDe(composer(couleurDeHex('#FF0000'), [couleurDeHex('#112233', 0.5)])!));
  // Sans base ni couche opaque, le fond est indéterminé.
  assert.equal(composer(null, [couleurDeHex('#000000', 0.5)]), null);
  const mesure = mesurerLaPaire([couleurDeHex('#000000', 0.5)], [couleurDeHex('#FFFFFF')], null)!;
  assert.deepEqual([mesure.premierPlan, mesure.fond], ['#808080', '#FFFFFF']);
});

test('le grand texte commence à 24 px, ou à 14 pt (56/3 px) en graisse 700', () => {
  assert.deepEqual([[18.66, 700], [18.664, 900], [18.6667, 700], [18.67, 700], [18.67, 699], [23.99, 400], [24, 400]].map(([t, g]) => estUnGrandTexte(t, g)),
    [false, false, true, true, false, false, true]);
});

test('les six compositions de O6 sont fragiles : l\'arrondi final et l\'arrondi par couche donnent deux verdicts', () => {
  assert.equal(COMPOSITIONS_FRAGILES.length, 6);
  for (const c of COMPOSITIONS_FRAGILES) {
    assert.ok(estFragile([couleurDeHex(c.texte.couleur, c.texte.alpha)], [couleurDeHex(c.zone.couleur, c.zone.alpha)], couleurDeHex(c.fond), c.seuil), JSON.stringify(c));
  }
  assert.deepEqual(compositionsFragiles(7107, 1), COMPOSITIONS_FRAGILES.slice(0, 1));
});
