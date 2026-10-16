/** La roue des teintes : sa géométrie, ses noms, et la simulation de vision qui repeint ses points ([UI-43]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { grisDeMemeClarte, lireHexa, type Rgb8 } from 'ucm-couleur';

import { colonnesTiennent, couleurDeLAnneau, geometrieDeLaRoue, INTERLIGNE_DES_NOMS, MARGE_DES_NOMS, arcDeLaPaire, arcDeLaRoue, palettesNommees, pointDeLaRoue, poserLesNoms, teinteDuPointeur } from '../src/roueDesTeintes';
import { simulerLaVision, VISIONS, type Vision } from '../src/vision';

const geometrie = geometrieDeLaRoue(351);
const { centre, rayon } = geometrie;

const proche = (obtenu: number, attendu: number, quoi: string) => assert.ok(Math.abs(obtenu - attendu) < 1e-9, `${quoi} : ${obtenu} au lieu de ${attendu}`);

test('[UI-43] 0° est en haut du cercle, 90° à droite, 180° en bas, dans le sens horaire', () => {
  const [haut, droite, bas, gauche] = [0, 90, 180, 270].map((teinte) => pointDeLaRoue(teinte, rayon, centre));
  proche(haut.x, centre.x, 'x à 0°');
  proche(haut.y, centre.y - rayon, 'y à 0°');
  proche(droite.x, centre.x + rayon, 'x à 90°');
  proche(droite.y, centre.y, 'y à 90°');
  proche(bas.y, centre.y + rayon, 'y à 180°');
  proche(gauche.x, centre.x - rayon, 'x à 270°');
});

test('[UI-43] la teinte du pointeur est l’inverse de la place d’une teinte', () => {
  for (const teinte of [0, 12, 90, 135, 200, 270, 359]) {
    const { x, y } = pointDeLaRoue(teinte, 40, centre);
    proche(teinteDuPointeur(x - centre.x, y - centre.y), teinte, `teinte ${teinte}`);
  }
});

test('[UI-43] un arc long de plus de 180° prend le grand arc ; celui d’une paire déborde de 14° par le plus court chemin', () => {
  assert.match(arcDeLaRoue(0, 90, rayon, centre), / 0 0 1 /);
  assert.match(arcDeLaRoue(0, 200, rayon, centre), / 0 1 1 /);
  // 350° et 10° sont à 20° l'une de l'autre, de part et d'autre de 0° : l'arc va de 336° à 24°.
  assert.equal(arcDeLaPaire(350, 10, rayon, centre), arcDeLaRoue(336, 384, rayon, centre));
  assert.equal(arcDeLaPaire(10, 350, rayon, centre), arcDeLaRoue(336, 384, rayon, centre));
});

test('[UI-43] huit palettes colorées sont toutes nommées ; au-delà, les cochées et celles d’une paire', () => {
  const huit = Array.from({ length: 8 }, (_, rang) => `p${rang}`);
  assert.deepEqual([...palettesNommees(huit, [], new Set())], huit);
  const neuf = [...huit, 'p8'];
  assert.deepEqual([...palettesNommees(neuf, ['p1'], new Set(['p5', 'p8']))], ['p1', 'p5', 'p8']);
});

test('[UI-43] la roue suit la largeur utile et garde un rayon minimal de 70 px', () => {
  assert.deepEqual(geometrie, { largeur: 351, hauteur: 222, centre: { x: 175.5, y: 111 }, rayon: 87 });
  assert.deepEqual(geometrieDeLaRoue(500), { largeur: 500, hauteur: 372, centre: { x: 250, y: 186 }, rayon: 162 });
  assert.equal(geometrieDeLaRoue(300).rayon, 70);
  assert.equal(geometrieDeLaRoue(300).largeur, 316);
});

test('[UI-43] les noms sont alignés à 15 px des bords, à droite pour 90° et à gauche pour 270°', () => {
  const poses = poserLesNoms([{ teinte: 90, largeurDuNom: 30 }, { teinte: 270, largeurDuNom: 30 }], geometrie);
  for (const pose of poses) proche(pose.y, 115, 'ligne de base');
  assert.deepEqual(poses.map((pose) => ({ ...pose, y: Math.round(pose.y) })), [
    { x: 336, y: 115, ancre: 'end', trait: '271.5,111.0 284.5,111.0 302.0,111.0' },
    { x: 15, y: 115, ancre: 'start', trait: '79.5,111.0 66.5,111.0 49.0,111.0' },
  ]);
});

test('[UI-43] chaque colonne espace les noms de 13 px et les garde dans les marges verticales', () => {
  for (const teintes of [[179, 178, 177, 176, 175, 174], [6, 5, 4, 3, 2, 1], [181, 182, 183, 184, 185, 186], [354, 355, 356, 357, 358, 359], [1, 2, 3, 177, 178, 179], [181, 182, 183, 357, 358, 359]]) {
    const poses = poserLesNoms(teintes.map((teinte) => ({ teinte, largeurDuNom: 40 })), geometrie);
    const ordonnees = poses.map(({ y }) => y - 4).sort((a, b) => a - b);
    ordonnees.forEach((y, rang) => {
      assert.ok(y >= MARGE_DES_NOMS + 6 && y <= geometrie.hauteur - MARGE_DES_NOMS - 6);
      if (rang) assert.ok(y - ordonnees[rang - 1] >= INTERLIGNE_DES_NOMS);
    });
    for (const { x } of poses) assert.ok(x >= MARGE_DES_NOMS && x <= geometrie.largeur - MARGE_DES_NOMS);
  }
  assert.equal(colonnesTiennent(14, geometrie), true);
  assert.equal(colonnesTiennent(15, geometrie), false);
  assert.equal(colonnesTiennent(0, geometrie), true);
});

test('[UI-43] la largeur mesurée du nom borne son trait sans dépasser le coude', () => {
  const [nom] = poserLesNoms([{ teinte: 90, largeurDuNom: 200 }], geometrie);
  assert.equal(nom.trait, '271.5,111.0 284.5,111.0 284.5,111.0');
});

test('[UI-43] les couleurs de l’anneau sont stables en Light et en Dark', () => {
  assert.deepEqual(couleurDeLAnneau(0, 'light'), [246, 150, 180]);
  assert.deepEqual(couleurDeLAnneau(0, 'dark'), [191, 101, 131]);
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
