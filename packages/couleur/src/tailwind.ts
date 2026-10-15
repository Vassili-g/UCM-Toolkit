/**
 * Le préréglage Tailwind : la dérive de teinte que les rampes colorées de
 * Tailwind montrent, prédite pour une couleur de référence ([MOT-18] à
 * [MOT-20], [MOT-36]).
 */
import { CHROMA_SANS_TEINTE, ecartAngulaire, type Oklch } from './conversions';
import { arrondir, poidsA, type Bouts, type Derive } from './rampe';

/** Une rampe relevée : son nom, et pour chaque cran du 50 au 950 sa clarté OKLCH `L` et sa teinte `H` en degrés. */
export interface RampeDeDerive {
  readonly nom: string;
  readonly crans: readonly (readonly [L: number, H: number])[];
}

/**
 * Le relevé par défaut : les dix-sept rampes colorées de Tailwind 3.4.17, sans
 * `slate`, `gray`, `zinc`, `neutral` ni `stone`. Chaque rampe porte ses onze
 * crans du 50 au 950, convertis de leur hexa par `rgb8VersOklch`, `L` à quatre
 * décimales et `H` à deux. Source : `tailwind-3.4.17.json`, dans les mesures de
 * la recette critique de qualité. La recette le porte sous `derives` : c'est
 * elle qui fait autorité une fois rangée.
 */
export const RELEVE_TAILWIND: readonly RampeDeDerive[] = [
  { nom: 'rose', crans: [[0.9694, 12.42], [0.9414, 12.58], [0.8924, 10], [0.8097, 11.64], [0.7192, 13.43], [0.645, 16.44], [0.5858, 17.58], [0.5143, 16.93], [0.4546, 13.7], [0.4103, 10.27], [0.2708, 12.09]] },
  { nom: 'red', crans: [[0.9705, 17.38], [0.9356, 17.72], [0.8845, 18.33], [0.8077, 19.57], [0.7106, 22.22], [0.6368, 25.33], [0.5771, 27.33], [0.5054, 27.52], [0.4437, 26.9], [0.3958, 25.72], [0.2575, 26.04]] },
  { nom: 'orange', crans: [[0.9796, 73.68], [0.9542, 75.16], [0.9015, 70.7], [0.8366, 66.29], [0.7576, 55.93], [0.7049, 47.6], [0.6461, 41.12], [0.5534, 38.4], [0.4698, 37.3], [0.4084, 38.17], [0.2659, 36.26]] },
  { nom: 'amber', crans: [[0.9869, 95.28], [0.9619, 95.62], [0.9243, 95.75], [0.879, 91.61], [0.8369, 84.43], [0.7686, 70.08], [0.6658, 58.32], [0.5553, 49], [0.4732, 46.2], [0.4137, 45.9], [0.2791, 45.64]] },
  { nom: 'yellow', crans: [[0.9873, 102.21], [0.9729, 103.19], [0.9451, 101.54], [0.9052, 98.11], [0.8606, 91.94], [0.7952, 86.05], [0.6806, 75.83], [0.5538, 66.44], [0.4762, 61.91], [0.421, 57.71], [0.2857, 53.81]] },
  { nom: 'lime', crans: [[0.9857, 120.76], [0.9669, 122.33], [0.9382, 124.32], [0.8972, 126.67], [0.8493, 128.85], [0.7681, 130.85], [0.6482, 131.68], [0.5322, 131.59], [0.4528, 130.93], [0.405, 131.06], [0.2741, 132.11]] },
  { nom: 'green', crans: [[0.9819, 155.83], [0.9624, 156.74], [0.925, 155.99], [0.8712, 154.45], [0.8003, 151.71], [0.7227, 149.58], [0.6271, 149.21], [0.5273, 150.07], [0.4479, 151.33], [0.3925, 152.54], [0.2664, 152.93]] },
  { nom: 'emerald', crans: [[0.9793, 166.11], [0.9505, 163.05], [0.9049, 164.15], [0.8452, 164.98], [0.7729, 163.22], [0.6959, 162.48], [0.596, 163.23], [0.5081, 165.61], [0.4318, 166.91], [0.378, 168.94], [0.2621, 172.55]] },
  { nom: 'teal', crans: [[0.9836, 180.72], [0.9527, 180.8], [0.91, 180.43], [0.8549, 181.07], [0.7845, 181.91], [0.7038, 182.5], [0.6002, 184.7], [0.5109, 186.39], [0.437, 188.22], [0.3861, 188.42], [0.2773, 192.52]] },
  { nom: 'cyan', crans: [[0.9841, 200.87], [0.9563, 203.39], [0.9167, 205.04], [0.8651, 207.08], [0.7971, 211.53], [0.7148, 215.22], [0.6089, 221.72], [0.5198, 223.13], [0.45, 224.28], [0.3982, 227.39], [0.3018, 229.7]] },
  { nom: 'sky', crans: [[0.9771, 236.62], [0.9514, 236.82], [0.9014, 230.9], [0.8276, 230.32], [0.7535, 232.66], [0.6847, 237.32], [0.5876, 241.97], [0.5, 242.75], [0.4434, 240.79], [0.3912, 240.88], [0.2935, 243.16]] },
  { nom: 'blue', crans: [[0.9705, 254.6], [0.9319, 255.59], [0.8823, 254.13], [0.8091, 251.81], [0.7137, 254.62], [0.6231, 259.81], [0.5461, 262.88], [0.4882, 264.38], [0.4244, 265.64], [0.3791, 265.52], [0.2823, 267.94]] },
  { nom: 'indigo', crans: [[0.9619, 272.31], [0.9299, 272.79], [0.8699, 274.04], [0.7853, 274.71], [0.6801, 276.93], [0.5854, 277.12], [0.5106, 276.97], [0.4568, 277.02], [0.3984, 277.37], [0.3588, 278.7], [0.2573, 281.29]] },
  { nom: 'violet', crans: [[0.9691, 293.76], [0.9433, 294.59], [0.8943, 293.28], [0.8112, 293.57], [0.709, 293.54], [0.6056, 292.72], [0.5413, 293.01], [0.4907, 292.58], [0.432, 292.76], [0.3796, 293.74], [0.2827, 291.09]] },
  { nom: 'purple', crans: [[0.9768, 308.3], [0.9464, 307.17], [0.9024, 306.7], [0.8268, 306.38], [0.7217, 305.5], [0.6268, 303.9], [0.5575, 302.32], [0.4955, 301.92], [0.4383, 303.72], [0.3807, 304.99], [0.2905, 302.72]] },
  { nom: 'fuchsia', crans: [[0.9773, 320.06], [0.952, 318.85], [0.903, 319.62], [0.833, 321.43], [0.7477, 322.16], [0.6668, 322.15], [0.5915, 322.9], [0.518, 323.95], [0.4519, 324.59], [0.4007, 325.61], [0.2932, 325.66]] },
  { nom: 'pink', crans: [[0.9714, 343.2], [0.9482, 342.26], [0.8994, 343.23], [0.8228, 346.02], [0.7253, 349.76], [0.6559, 354.31], [0.5916, 0.58], [0.5246, 3.96], [0.4587, 3.82], [0.4078, 2.43], [0.2845, 3.91]] },
];

/**
 * La teinte d'une rampe relevée à la clarté `L`. Les teintes des crans sont
 * dépliées le long de la rampe pour ne pas franchir 0° ou 360° en
 * interpolant ; au-delà des crans extrêmes, la teinte du cran extrême.
 * Le résultat n'est pas ramené dans [0, 360[.
 */
function teinteALaClarte(crans: RampeDeDerive['crans'], L: number): number {
  const deplie = [crans[0][1]];
  for (let i = 1; i < crans.length; i += 1) deplie.push(deplie[i - 1] + ecartAngulaire(crans[i - 1][1], crans[i][1]));
  if (L >= crans[0][0]) return deplie[0];
  if (L <= crans[crans.length - 1][0]) return deplie[crans.length - 1];
  const i = crans.findIndex(([clarte]) => clarte < L);
  const t = (crans[i - 1][0] - L) / (crans[i - 1][0] - crans[i][0]);
  return deplie[i - 1] + t * (deplie[i] - deplie[i - 1]);
}

/**
 * La dérive de teinte à chaque bout, prédite pour une référence ([MOT-36]).
 * Chaque rampe du relevé est lue à la clarté de la référence : sa teinte à
 * cette clarté la place sur le cercle, et sa dérive à `bouts.clair` et à
 * `bouts.sombre` se mesure depuis cette teinte. Les deux rampes voisines de la
 * teinte de la référence prêtent leur dérive, interpolée linéairement selon la
 * position angulaire de la référence entre elles. Les angles sont arrondis au
 * centième ([MOT-27]).
 */
function deriveAuxBouts(reference: Oklch, bouts: Bouts, releve: readonly RampeDeDerive[]): Derive {
  const lues = releve
    .map(({ crans }) => {
      const h0 = teinteALaClarte(crans, reference.L);
      return {
        h: ((h0 % 360) + 360) % 360,
        clair: teinteALaClarte(crans, bouts.clair) - h0,
        sombre: teinteALaClarte(crans, bouts.sombre) - h0,
      };
    })
    .sort((x, y) => x.h - y.h);
  let suivante = lues.findIndex(({ h }) => h > reference.H);
  if (suivante < 0) suivante = 0;
  const apres = lues[suivante];
  const avant = lues[(suivante - 1 + lues.length) % lues.length];
  const position = ((reference.H - avant.h + 360) % 360) / (((apres.h - avant.h + 360) % 360) || 360);
  return {
    clair: arrondir(avant.clair + (apres.clair - avant.clair) * position, 2),
    sombre: arrondir(avant.sombre + (apres.sombre - avant.sombre) * position, 2),
  };
}

/**
 * Le préréglage Tailwind pour une référence (section 6.5, [MOT-36]). Une
 * couleur sans teinte ([MOT-04]) rend deux dérives nulles ; l'appelant qui
 * lit des octets écarte aussi un gris pur (`estGrisPur`, [MOT-18]).
 */
export function prereglageTailwind(
  reference: Oklch,
  bouts: Bouts,
  releve: readonly RampeDeDerive[] = RELEVE_TAILWIND,
): Derive {
  if (reference.C < CHROMA_SANS_TEINTE) return { clair: 0, sombre: 0 };
  return deriveAuxBouts(reference, bouts, releve);
}

/** Le préréglage « Constante » : aucune dérive ([DER-11]). */
export const PREREGLAGE_CONSTANTE: Derive = { clair: 0, sombre: 0 };

/** La borne du décalage de clarté du bout clair : au-delà, le 100 du jaune dépasse celui de Tailwind. */
export const CLARTE_SELON_LA_TEINTE_MAXIMALE = 0.03;

/** L'indice du cran 100 dans une rampe du relevé, qui va du 50 au 950. */
const RANG_DU_CENT = 1;

function mediane(valeurs: readonly number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = triees.length / 2;
  return triees.length % 2 ? triees[(triees.length - 1) / 2] : (triees[milieu - 1] + triees[milieu]) / 2;
}

/**
 * Le décalage de clarté du bout clair que les rampes de Tailwind montrent à
 * la teinte de `reference`. Pour chaque rampe du relevé, l'écart de clarté de
 * son cran 100 à la médiane des rampes ; les deux rampes voisines de la
 * teinte de la référence prêtent leur écart, interpolé comme la dérive de
 * teinte. `clarteDuCent` est la clarté de courbe du cran 100 de la palette : son
 * poids vers le bout clair divise l'écart. Le résultat se borne à
 * `CLARTE_SELON_LA_TEINTE_MAXIMALE` et se range au millième. Il vaut 0 pour une
 * couleur sans teinte ([MOT-04]) et quand le cran 100 pèse moins de 0,2.
 */
export function clarteSelonLaTeinteDuReleve(
  reference: Oklch,
  bouts: Bouts,
  clarteDuCent: number,
  releve: readonly RampeDeDerive[],
): number {
  if (reference.C < CHROMA_SANS_TEINTE) return 0;
  const { bout, poids } = poidsA(clarteDuCent, reference, bouts);
  if (bout !== 'clair' || poids < 0.2) return 0;
  const clarteMediane = mediane(releve.map(({ crans }) => crans[RANG_DU_CENT][0]));
  const lues = releve
    .map(({ crans }) => ({ h: ((teinteALaClarte(crans, reference.L) % 360) + 360) % 360, ecart: crans[RANG_DU_CENT][0] - clarteMediane }))
    .sort((x, y) => x.h - y.h);
  let suivante = lues.findIndex(({ h }) => h > reference.H);
  if (suivante < 0) suivante = 0;
  const apres = lues[suivante];
  const avant = lues[(suivante - 1 + lues.length) % lues.length];
  const position = ((reference.H - avant.h + 360) % 360) / (((apres.h - avant.h + 360) % 360) || 360);
  const ecart = avant.ecart + (apres.ecart - avant.ecart) * position;
  return arrondir(Math.max(-CLARTE_SELON_LA_TEINTE_MAXIMALE, Math.min(CLARTE_SELON_LA_TEINTE_MAXIMALE, (poids * ecart) / (poids * poids))), 3);
}
