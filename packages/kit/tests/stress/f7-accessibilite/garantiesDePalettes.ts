/**
 * FP2 : les 72 cas de garantie des faux positifs (4 palettes × 9 garanties de `emplois/garanties.ts` × 2 modes). Chaque cas pose le
 * premier plan de la garantie sur chacun de ses fonds avec les couleurs d'une palette, dans un seul mode du thème. Une garantie que
 * les couleurs tiennent selon l'oracle ne doit donner aucun constat C49 ni C50 : Architect et Palettes jugent alors le même couple de
 * la même façon. Une garantie que les couleurs ne tiennent pas donne un cas vide, compté et signalé.
 *
 * Le moteur de `packages/couleur` n'est pas appelé : le kit ne dépend pas de ce paquet, qui change dans d'autres sessions. Les quatre
 * palettes sont des rampes de onze crans tirées de la graine (teinte, chroma fixe), l'une claire vers sombre pour `Light`, l'autre
 * sombre vers claire pour `Dark`. Les crans que chaque variable vise viennent de la table du kit (`cranDeLaVariable`).
 */
import { cranDeLaVariable, COULEUR_DU_TEXTE_DES_BOUTONS, TEXTE_DES_BOUTONS_PAR_DEFAUT } from '../../../src/emplois/dossiers.js';
import { GARANTIES, type FondDeGarantie } from '../../../src/emplois/garanties.js';
import { graineDe, mulberry32 } from '../commun/prng.js';
import { fabrique, type CasAccessibilite } from './cas.js';
import { idDuMode, themeDuCatalogue, type ComposantDeContraste } from './composantDeContraste.js';
import { MODES_DE_STRESS, pageEtCarte, type ModeDeStress } from './couleursDeStress.js';
import { cadre, solide, type Degradation } from './degradation.js';
import { atteintLeSeuil, couleurDeHex, hexDe, mesurerLaPaire, SEUIL_DE_NON_TEXTE } from './oracleContraste.js';

const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const CHROMA = 0.05;

/** Oklch vers sRGB, borné au gamut, en hexadécimal. */
function oklchVersHex(clarte: number, chroma: number, teinte: number): string {
  const [a, b] = [chroma * Math.cos((teinte * Math.PI) / 180), chroma * Math.sin((teinte * Math.PI) / 180)];
  const [l, m, s] = [clarte + 0.3963377774 * a + 0.2158037573 * b, clarte - 0.1055613458 * a - 0.0638541728 * b, clarte - 0.0894841775 * a - 1.291485548 * b].map((v) => v ** 3);
  const lineaires = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  const [r, g, bleu] = lineaires.map((v) => { const c = Math.min(1, Math.max(0, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; });
  return hexDe({ r, g, b: bleu });
}

/** La clarté d'un cran : de 0,98 à 0,2 en Light, de 0,1 à 0,98 en Dark. */
const clarteDuCran = (cran: number, mode: ModeDeStress): number =>
  (mode === 'light' ? 0.98 - ((cran - 50) / 900) * 0.78 : 0.1 + ((cran - 50) / 900) * 0.88);

const couleurDuCran = (teinte: number, cran: number, mode: ModeDeStress): string => oklchVersHex(clarteDuCran(cran, mode), CHROMA, teinte);

/** Ce que le kit tient pour la couleur de la variable `nom` d'une palette dans un mode ; `solid/foreground` est le texte des boutons. */
function couleurDeLaVariable(teinte: number, variable: string, mode: ModeDeStress): string {
  const cran = cranDeLaVariable(variable as never, mode, 'normal');
  if (cran === 'texteDesBoutons') return COULEUR_DU_TEXTE_DES_BOUTONS[TEXTE_DES_BOUTONS_PAR_DEFAUT[mode]];
  if (typeof cran !== 'number') throw new Error(`Aucun cran pour ${variable}`);
  return couleurDuCran(teinte, cran, mode);
}

const USAGE_DU_PREMIER: Readonly<Record<number, 'texte' | 'icone' | 'stroke' | 'anneau'>> = {
  1: 'texte', 2: 'icone', 3: 'texte', 4: 'stroke', 5: 'texte', 6: 'stroke', 7: 'anneau', 8: 'icone', 9: 'texte',
};

export interface GarantiesDePalettes {
  readonly cas: CasAccessibilite[];
  /** Les cas dont la garantie n'est pas tenue par les couleurs de la palette : le cas ne pose rien et n'attend rien. */
  readonly vides: readonly { readonly id: string; readonly raison: string }[];
}

export function casDeGarantie(base: ComposantDeContraste, graine: number): GarantiesDePalettes {
  const faire = fabrique(base);
  const tireur = mulberry32(graineDe(graine, 'garanties-de-palettes'));
  const teintes = Array.from({ length: 4 }, () => Math.floor(tireur() * 360));
  const cas: CasAccessibilite[] = [];
  const vides: { id: string; raison: string }[] = [];
  let numero = 0;

  for (const [rangDePalette, teinte] of teintes.entries()) {
    for (const garantie of GARANTIES) {
      for (const mode of MODES_DE_STRESS) {
        const id = `FP2-${++numero}`;
        const premier = garantie.premier.variable;
        const usage = USAGE_DU_PREMIER[garantie.numero];
        const seuil = garantie.seuil === 'texte' ? 4.5 : SEUIL_DE_NON_TEXTE;
        const couleurPremier = couleurDeLaVariable(teinte, premier, mode);
        const fonds = garantie.fonds.map((fond: FondDeGarantie) => {
          if ('fondDeLaPage' in fond) return { nom: 'page', hex: hexDe(pageEtCarte(mode).page) };
          if ('fondDeLaCarte' in fond) return { nom: 'carte', hex: hexDe(pageEtCarte(mode).carte) };
          return { nom: fond.variable, hex: couleurDeLaVariable(teinte, fond.variable, mode) };
        });
        const echec = fonds.find((fond) => !atteintLeSeuil(mesurerLaPaire([couleurDeHex(couleurPremier)], [couleurDeHex(fond.hex)], null)!.rapport, seuil));
        const description = `palette ${rangDePalette + 1} (teinte ${teinte}), garantie ${garantie.numero} (${premier}), ${mode}`;
        if (echec) {
          const raison = `${premier} ${couleurPremier} sous ${seuil}:1 sur ${echec.nom} ${echec.hex}`;
          vides.push({ id, raison });
          cas.push(faire(id, 'FP2', { description: `${description} : cas vide (${raison})`, degrader: () => undefined, attendus: [] }));
          continue;
        }
        cas.push(faire(id, 'FP2', {
          description, attendus: [],
          degrader: (d) => poserLaGarantie(d, { teinte, mode, premier, usage, fonds: garantie.fonds }),
        }));
      }
    }
  }
  return { cas, vides };
}

/** Le variant cible seul, le thème réduit à `mode`, les couleurs de la palette dans les variables, le premier plan sur chaque fond. */
function poserLaGarantie(d: Degradation, o: { teinte: number; mode: ModeDeStress; premier: string; usage: 'texte' | 'icone' | 'stroke' | 'anneau'; fonds: readonly FondDeGarantie[] }): void {
  for (const variant of d.releve.variants.slice(1)) d.retirer(d.releve.variants, variant);
  const theme = themeDuCatalogue(d.catalogue);
  const modeId = idDuMode(theme, o.mode)!;
  d.fixer(theme, 'modes', theme.modes.filter((m) => m.id === modeId));
  d.fixer(d.catalogue, 'fondsDElevation', { [modeId]: d.catalogue.fondsDElevation![modeId] });
  for (const variable of d.catalogue.variables.filter((v) => v.collection === theme.cle && v.nom.startsWith('primary/'))) {
    d.fixer(variable.valeurs!, modeId, { valeur: couleurDeHex(couleurDeLaVariable(o.teinte, variable.nom.slice('primary/'.length), o.mode)) });
  }
  const racine = d.scene({ fond: null, racineEnDur: true });
  const variable = (nom: string) => d.catalogue.variables.find((v) => v.collection === theme.cle && v.nom === `primary/${nom}`)!;
  const poser = (parent: ReturnType<Degradation['racine']>, suffixe: string): void => {
    const lie = variable(o.premier);
    switch (o.usage) {
      case 'texte': d.lier(d.ajouterUnTexte(`Texte ${suffixe}`, { peintures: [solide('#000000')] }, { parent }), lie, { plage: 0 }); break;
      case 'icone': d.lier(d.ajouterUnLayer({ nom: `Icone ${suffixe}`, type: 'VECTOR', peintures: [solide('#000000')], parent }), lie, { indice: 0 }); break;
      case 'stroke': d.lier(d.ajouterUnLayer({ nom: `Contour ${suffixe}`, peintures: [solide('#000000', { champ: 'strokes' })], strokeWeight: 1, parent }), lie, { champ: 'strokes', indice: 0 }); break;
      case 'anneau': d.lier(d.ajouterUnLayer({ nom: 'Ring', peintures: [solide('#000000', { champ: 'strokes' })], strokeWeight: 2, parent }), lie, { champ: 'strokes', indice: 0 }); break;
    }
  };
  if (o.fonds.some((fond) => 'fondDeLaPage' in fond || 'fondDeLaCarte' in fond)) poser(racine, 'sur la page');
  for (const fond of o.fonds) {
    if ('variable' in fond) {
      const zone = cadre(d, `Fond ${fond.variable}`, racine, [solide('#FFFFFF')]);
      d.lier(zone, variable(fond.variable), { indice: 0 });
      poser(zone, fond.variable);
    }
  }
}
