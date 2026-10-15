/** La roue des teintes : sa géométrie, ses noms, et la simulation de vision qui repeint ses points ([UI-43]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { grisDeMemeClarte, lireHexa, type Rgb8 } from 'ucm-couleur';

import { CENTRE_DE_LA_ROUE, RAYON_DE_LA_ROUE, arcDeLaPaire, arcDeLaRoue, palettesNommees, pointDeLaRoue, poserLesNoms, teinteDuPointeur } from '../src/roueDesTeintes';
import { simulerLaVision, VISIONS, type Vision } from '../src/vision';

const proche = (obtenu: number, attendu: number, quoi: string) => assert.ok(Math.abs(obtenu - attendu) < 1e-9, `${quoi} : ${obtenu} au lieu de ${attendu}`);

test('[UI-43] 0° est en haut du cercle, 90° à droite, 180° en bas, dans le sens horaire', () => {
  const [haut, droite, bas, gauche] = [0, 90, 180, 270].map((teinte) => pointDeLaRoue(teinte));
  proche(haut.x, CENTRE_DE_LA_ROUE.x, 'x à 0°');
  proche(haut.y, CENTRE_DE_LA_ROUE.y - RAYON_DE_LA_ROUE, 'y à 0°');
  proche(droite.x, CENTRE_DE_LA_ROUE.x + RAYON_DE_LA_ROUE, 'x à 90°');
  proche(droite.y, CENTRE_DE_LA_ROUE.y, 'y à 90°');
  proche(bas.y, CENTRE_DE_LA_ROUE.y + RAYON_DE_LA_ROUE, 'y à 180°');
  proche(gauche.x, CENTRE_DE_LA_ROUE.x - RAYON_DE_LA_ROUE, 'x à 270°');
});

test('[UI-43] la teinte du pointeur est l’inverse de la place d’une teinte', () => {
  for (const teinte of [0, 12, 90, 135, 200, 270, 359]) {
    const { x, y } = pointDeLaRoue(teinte, 40);
    proche(teinteDuPointeur(x - CENTRE_DE_LA_ROUE.x, y - CENTRE_DE_LA_ROUE.y), teinte, `teinte ${teinte}`);
  }
});

test('[UI-43] un arc long de plus de 180° prend le grand arc ; celui d’une paire déborde de 14° par le plus court chemin', () => {
  assert.match(arcDeLaRoue(0, 90), / 0 0 1 /);
  assert.match(arcDeLaRoue(0, 200), / 0 1 1 /);
  // 350° et 10° sont à 20° l'une de l'autre, de part et d'autre de 0° : l'arc va de 336° à 24°.
  assert.equal(arcDeLaPaire(350, 10), arcDeLaRoue(336, 384));
  assert.equal(arcDeLaPaire(10, 350), arcDeLaRoue(336, 384));
});

test('[UI-43] huit palettes colorées sont toutes nommées ; au-delà, les cochées et celles d’une paire', () => {
  const huit = Array.from({ length: 8 }, (_, rang) => `p${rang}`);
  assert.deepEqual([...palettesNommees(huit, [], new Set())], huit);
  const neuf = [...huit, 'p8'];
  assert.deepEqual([...palettesNommees(neuf, ['p1'], new Set(['p5', 'p8']))], ['p1', 'p5', 'p8']);
});

test('[UI-43] les noms se posent à 11 px du point, à droite du centre ou à gauche, et descendent sous un nom voisin du même côté', () => {
  const [droite, gauche, voisine, autreCote] = poserLesNoms([{ x: 250, y: 60 }, { x: 150, y: 60 }, { x: 255, y: 66 }, { x: 140, y: 66 }]);
  const [seule] = poserLesNoms([{ x: 255, y: 66 }]);
  assert.deepEqual(droite, { x: 261, y: 63, ancre: 'start' });
  assert.deepEqual(gauche, { x: 139, y: 63, ancre: 'end' });
  // La ligne de base de la voisine est 69, à 6 px de 63 : elle descend de 11 px, à 80, comme son homologue de gauche. Un nom du côté opposé ne la gêne pas.
  assert.deepEqual(voisine, { x: 266, y: 80, ancre: 'start' });
  assert.deepEqual(autreCote, { x: 129, y: 80, ancre: 'end' });
  assert.equal(seule.y, 69);
});

test('[UI-43] la vision normale rend la couleur ; le blanc, le noir et les gris restent eux-mêmes', () => {
  const gris: Rgb8[] = [[255, 255, 255], [0, 0, 0], [128, 128, 128], [37, 37, 37]];
  for (const vision of VISIONS) {
    for (const couleur of gris) assert.deepEqual(simulerLaVision(couleur, vision), couleur, `${vision} ${couleur}`);
  }
  const rouge: Rgb8 = [200, 30, 30];
  assert.equal(simulerLaVision(rouge, 'normale'), rouge);
});

/** Le décodage et l'encodage sRGB, écrits ici pour juger la simulation sans lui emprunter son code. */
const lineaire = (octet: number): number => { const c = octet / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const encode = (x: number): number => { const c = Math.min(1, Math.max(0, x)); return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)); };

test('[UI-43] chaque vision applique sa matrice au vecteur linéaire puis borne : le rouge pur donne la première colonne', () => {
  const colonnes: Readonly<Record<Exclude<Vision, 'normale'>, readonly [number, number, number]>> = {
    deuteranopie: [0.367322, 0.280085, -0.01182],
    protanopie: [0.152286, 0.114503, -0.003882],
    tritanomalie: [1.255528, -0.078411, 0.004733],
  };
  for (const [vision, colonne] of Object.entries(colonnes) as [Exclude<Vision, 'normale'>, readonly [number, number, number]][]) {
    assert.deepEqual(simulerLaVision([255, 0, 0], vision), colonne.map(encode), vision);
  }
});

test('[UI-43] un bleu vif sous deutéranopie perd son rouge et son vert, et un coefficient négatif ne sort pas de l’octet', () => {
  const bleu: Rgb8 = [30, 111, 217];
  const [r, g, b] = [lineaire(30), lineaire(111), lineaire(217)];
  const attendu = [0.367322 * r + 0.860646 * g - 0.227968 * b, 0.280085 * r + 0.672501 * g + 0.047413 * b, -0.01182 * r + 0.04294 * g + 0.968881 * b].map(encode);
  assert.deepEqual(simulerLaVision(bleu, 'deuteranopie'), attendu);
  for (const vision of VISIONS) for (const canal of simulerLaVision([0, 0, 255], vision)) assert.ok(Number.isInteger(canal) && canal >= 0 && canal <= 255);
});

test('[UI-43] une couleur saturée change sous chaque vision ; la tritanomalie garde les gris', () => {
  for (const hexa of ['#0891B2', '#FACC15', '#7C3AED', '#E11D48']) {
    const couleur = lireHexa(hexa)!;
    for (const vision of VISIONS.filter((candidate) => candidate !== 'normale')) {
      assert.notDeepEqual(simulerLaVision(couleur, vision), couleur, `${hexa} ${vision}`);
    }
    const gris = grisDeMemeClarte(couleur);
    assert.deepEqual(simulerLaVision(gris, 'tritanomalie'), gris);
  }
});
