/**
 * CAM16 dans les conditions de vue de Material Color Utilities (blanc D65,
 * luminance d'adaptation 200/π × Y(L* 50)/100, fond à L* 50, entourage moyen),
 * à une différence près : l'adaptation au blanc est complète (D = 1). Avec le D
 * de Material (0,84), un gris garde 1,9 de chroma, ce qui fausserait la
 * comparaison des fonds pâles entre teintes.
 * Rend la clarté J, la teinte h, la chroma C, la vivacité M (colorfulness) et
 * sa forme uniforme M' de CAM16-UCS. Source : Li et al. 2017 ; même calcul que
 * `cam16.ts` de material-color-utilities.
 */
import type { Rgb8 } from '../../../../../../packages/couleur/src/index';

const lin = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const M16 = [[0.401288, 0.650173, -0.051461], [-0.250268, 1.204414, 0.045854], [-0.002079, 0.048952, 0.953127]];
const mult = (m: number[][], v: number[]) => m.map((l) => l[0] * v[0] + l[1] * v[1] + l[2] * v[2]);
const BLANC = [95.047, 100, 108.883];
const yDeLstar = (L: number) => 100 * (L > 8 ? ((L + 16) / 116) ** 3 : L / 903.2962962);

const Yb = yDeLstar(50);
const La = (200 / Math.PI) * Yb / 100;
const F = 1, c = 0.69, Nc = 1;
const rgbW = mult(M16, BLANC);
const D = 1;
const DRGB = rgbW.map((x) => D * (100 / x) + 1 - D);
const k = 1 / (5 * La + 1);
const Fl = 0.2 * k ** 4 * (5 * La) + 0.1 * (1 - k ** 4) ** 2 * Math.cbrt(5 * La);
const n = Yb / BLANC[1];
const z = 1.48 + Math.sqrt(n);
const Nbb = 0.725 / n ** 0.2;
const adapter = (x: number) => { const af = (Fl * Math.abs(x) / 100) ** 0.42; return Math.sign(x) * 400 * af / (af + 27.13); };
const rgbAW = rgbW.map((x, i) => adapter(DRGB[i] * x));
const Aw = (2 * rgbAW[0] + rgbAW[1] + 0.05 * rgbAW[2]) * Nbb;

export interface Cam16 { J: number; h: number; C: number; M: number; Mucs: number; s: number }

export function cam16(couleur: Rgb8): Cam16 {
  const [r, g, b] = couleur.map(lin);
  const XYZ = [
    (0.4123908 * r + 0.3575843 * g + 0.1804808 * b) * 100,
    (0.2126390 * r + 0.7151687 * g + 0.0721923 * b) * 100,
    (0.0193308 * r + 0.1191948 * g + 0.9505322 * b) * 100,
  ];
  const [rA, gA, bA] = mult(M16, XYZ).map((x, i) => adapter(DRGB[i] * x));
  const a = (11 * rA - 12 * gA + bA) / 11;
  const bb = (rA + gA - 2 * bA) / 9;
  const u = (20 * rA + 20 * gA + 21 * bA) / 20;
  const p2 = (40 * rA + 20 * gA + bA) / 20;
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  const hp = h < 20.14 ? h + 360 : h;
  const eHue = 0.25 * (Math.cos((hp * Math.PI) / 180 + 2) + 3.8);
  const J = 100 * (Math.max(0, p2 * Nbb) / Aw) ** (c * z);
  const t = ((50000 / 13) * eHue * Nc * Nbb * Math.hypot(a, bb)) / (u + 0.305);
  const alpha = t ** 0.9 * (1.64 - 0.29 ** n) ** 0.73;
  const C = alpha * Math.sqrt(J / 100);
  const M = C * Fl ** 0.25;
  return { J, h, C, M, Mucs: Math.log(1 + 0.0228 * M) / 0.0228, s: 50 * Math.sqrt((alpha * c) / (Aw + 4)) };
}
