/**
 * Mesures de recherche : les partenaires des niveaux et la polarité de l'encre
 * des fonds pleins. Aucun fichier produit n'alimente le plugin.
 *
 * npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/2 Escalier/mesurer-polarites.ts"
 */
import { writeFileSync } from 'node:fs';
import {
  ancrageDe, boutsDe, contraste, ecrireHexa, fabriquerCran, fabriquerRampe, fondsSombresDe,
  intensitesDe, lireHexa, prereglageTailwind, rampeDe, rampesDe, recetteParDefaut, rgb8VersOklch,
  type Mode, type Palette, type Rgb8,
} from '../../../../../../packages/couleur/src/index';
import { atteintLeSeuil } from '../../../../../../packages/kit/src/emplois/contraste';

const recette = recetteParDefaut();
const crans = recette.crans;
const modes: Mode[] = ['light', 'dark'];
const references = [
  '#1E6FD9', '#D94635', '#EAB308', '#16A34A', '#9333EA', '#737373',
  '#FACC15', '#2563EB', '#DC2626', '#06B6D4', '#84CC16', '#F97316',
  '#EC4899', '#0B1F4D', '#8B8178', '#F5F5F5',
  // Les couleurs de marque du Playground : Intencial, puis la marque 2.
  '#B15152', '#4C3EBA', '#0EA5E9', '#F43F5E',
];
const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];
const fond = (mode: Mode) => lireHexa(recette.fonds[mode])!;
const neutre = (mode: Mode, cran: number) => fabriquerCran(recette.courbes[mode][crans.indexOf(cran)], 0, 0, recette.gamut).couleur;

const palettes = references.flatMap((reference, index): Palette[] => {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  const base = {
    id: `polarite-${index}`, reference,
    derive: { lien: true, soft: { ...derive, origine: 'tailwind' as const }, vivid: { ...derive, origine: 'tailwind' as const } },
  };
  return [base, { ...base, id: `${base.id}-unique`, intensites: 1 }];
});

/** Le minimum d'une mesure sur tous les contextes, et le contexte qui l'atteint. */
const minima = new Map<string, { ratio: number; contexte: string }>();
const succes = new Map<string, { tenus: number; total: number }>();
function retenir(cle: string, ratio: number, contexte: string, seuil?: number) {
  const precedent = minima.get(cle);
  if (!precedent || ratio < precedent.ratio) minima.set(cle, { ratio, contexte });
  if (seuil !== undefined) {
    const compte = succes.get(cle) ?? { tenus: 0, total: 0 };
    compte.total += 1;
    if (atteintLeSeuil(ratio, seuil)) compte.tenus += 1;
    succes.set(cle, compte);
  }
}

/**
 * Les options d'encre et de plein. `niveaux` donne les crans des quatre niveaux
 * de `solid` dans le thème, `rampe` la rampe dont ils sortent.
 */
const options = {
  miroir: { light: { rampe: 'light', niveaux: [700, 800, 900, 950], encre: () => fond('light') },
    dark: { rampe: 'dark', niveaux: [700, 800, 900, 950], encre: () => fond('dark') } },
  pleinConstant: { light: { rampe: 'light', niveaux: [700, 800, 900, 950], encre: () => fond('light') },
    dark: { rampe: 'light', niveaux: [700, 800, 900, 950], encre: () => fond('light') } },
  recaleSombre: { light: { rampe: 'light', niveaux: [700, 800, 900, 950], encre: () => fond('light') },
    dark: { rampe: 'dark', niveaux: [500, 400, 300, 200], encre: () => neutre('dark', 950) } },
  encreSombreEnClair: { light: { rampe: 'light', niveaux: [400, 300, 200, 100], encre: () => neutre('light', 950) },
    dark: { rampe: 'dark', niveaux: [700, 800, 900, 950], encre: () => fond('dark') } },
} as const;

const marques: object[] = [];
for (const palette of palettes) {
  const rampes = rampesDe(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  for (const intensite of intensitesDe(palette)) {
    const rampe = rampeDe(rampes, intensite);
    const couleur = (mode: Mode, cran: number) => rampe[mode][crans.indexOf(cran)].couleur;
    for (const mode of modes) {
      const contexte = `${palette.reference}/${mode}/${intensite}`;
      // Partenaires : chaque niveau de texte, de contour et de plein contre chaque surface.
      for (const [famille, premiers, seuil] of [
        ['text', [700, 800, 900, 950], 4.5], ['border-control', [600, 700, 800, 900], 3], ['solid', [700, 800, 900, 950], 3],
      ] as const) {
        premiers.forEach((premier, i) => [100, 200, 300, 400].forEach((surface, j) => {
          retenir(`partenaires/${famille}/${i + 1}/${j + 1}`, contraste(couleur(mode, premier), couleur(mode, surface)), contexte, seuil);
        }));
      }
      // Polarités : encre contre chaque niveau, niveau contre la page, écart entre deux niveaux voisins.
      for (const [nom, option] of Object.entries(options)) {
        const reglage = option[mode];
        const plein = (cran: number) => couleur(reglage.rampe as Mode, cran);
        reglage.niveaux.forEach((cran, i) => {
          retenir(`polarite/${nom}/${mode}/encre/${i + 1}`, contraste(reglage.encre(), plein(cran)), contexte, 4.5);
          retenir(`polarite/${nom}/${mode}/page/${i + 1}`, contraste(fond(mode), plein(cran)), contexte, 3);
          if (i > 0) retenir(`polarite/${nom}/${mode}/pas/${i}-${i + 1}`, contraste(plein(reglage.niveaux[i - 1]), plein(cran)), contexte);
        });
      }
      // L'encre automatique, noir ou blanc, sur les pleins du miroir.
      [700, 800, 900, 950].forEach((cran, i) => {
        const fondDuPlein = couleur(mode, cran);
        const blanc = contraste(BLANC, fondDuPlein);
        const noir = contraste(NOIR, fondDuPlein);
        retenir(`auto/${mode}/${i + 1}/${blanc >= noir ? 'blanc' : 'noir'}`, Math.max(blanc, noir), contexte, 4.5);
      });
    }
    if (intensite === ancrage.profil) {
      const exacte = lireHexa(palette.reference)!;
      marques.push({
        reference: palette.reference, intensites: palette.intensites ?? 2,
        crans: ancrage.crans,
        blanc: contraste(BLANC, exacte), noir: contraste(NOIR, exacte),
        encreClaire: contraste(fond('light'), exacte), encreSombreClair: contraste(neutre('light', 950), exacte),
        pageClaire: contraste(fond('light'), exacte), pageSombre: contraste(fond('dark'), exacte),
      });
    }
  }
}

// Balayage sans ancrage : 360 teintes, trois parts, la rampe sombre avec ses fonds atténués.
const sombre = fondsSombresDe(recette);
const fenetre = crans.map((cran) => ({ cran, encreBlanche: Infinity, encreNeutre950: Infinity, page: Infinity, pageMax: 0 }));
for (const part of [0.2, 0.45, 0.95]) {
  for (let teinte = 0; teinte < 360; teinte += 1) {
    const rampe = fabriquerRampe({
      courbe: recette.courbes.dark, bouts: boutsDe(recette), reference: { L: 0.6, C: 0.1, H: teinte },
      derive: { clair: 0, sombre: 0 }, part, gamut: recette.gamut, sombre,
    });
    rampe.forEach((cran, rang) => {
      const ligne = fenetre[rang];
      ligne.encreBlanche = Math.min(ligne.encreBlanche, contraste(BLANC, cran.couleur));
      ligne.encreNeutre950 = Math.min(ligne.encreNeutre950, contraste(neutre('dark', 950), cran.couleur));
      const page = contraste(fond('dark'), cran.couleur);
      ligne.page = Math.min(ligne.page, page);
      ligne.pageMax = Math.max(ligne.pageMax, page);
    });
  }
}

// La règle en escalier entre familles : un premier plan de niveau n d'une palette sur une surface de niveau m ≤ n d'une autre.
const escalier: object[] = [];
for (const mode of modes) {
  const uniques = palettes.filter((p) => p.intensites === 1).map((palette) => ({ reference: palette.reference, rampe: rampesDe(recette, palette).unique![mode] }));
  for (const [famille, premiers, seuil] of [['text', [700, 800, 900, 950], 4.5], ['border-control', [600, 700, 800, 900], 3]] as const) {
    let pire = { ratio: Infinity, couple: '' };
    let echecs = 0;
    let total = 0;
    premiers.forEach((premier, i) => [100, 200, 300, 400].slice(0, i + 1).forEach((surface) => {
      for (const a of uniques) for (const b of uniques) {
        const ratio = contraste(a.rampe[crans.indexOf(premier)].couleur, b.rampe[crans.indexOf(surface)].couleur);
        total += 1;
        if (!atteintLeSeuil(ratio, seuil)) echecs += 1;
        if (ratio < pire.ratio) pire = { ratio, couple: `${famille} ${premier} de ${a.reference} sur surface ${surface} de ${b.reference}` };
      }
    }));
    escalier.push({ mode, famille, total, echecs, pire });
  }
}

// La clarté sombre où une encre claire tient 4,5:1 et le plein 3:1 contre la page, sur toutes les teintes et parts.
const clartes: object[] = [];
for (let L = 0.46; L <= 0.62 + 1e-9; L += 0.01) {
  const ligne = { L: Number(L.toFixed(2)), blanc: Infinity, neutre950: Infinity, page: Infinity };
  for (const part of [0.2, 0.45, 0.7, 0.95]) {
    for (let teinte = 0; teinte < 360; teinte += 1) {
      const couleur = fabriquerCran(L, teinte, part, recette.gamut).couleur;
      ligne.blanc = Math.min(ligne.blanc, contraste(BLANC, couleur));
      ligne.neutre950 = Math.min(ligne.neutre950, contraste(neutre('dark', 950), couleur));
      ligne.page = Math.min(ligne.page, contraste(fond('dark'), couleur));
    }
  }
  clartes.push(ligne);
}

const enObjet = <T>(carte: Map<string, T>) => Object.fromEntries([...carte].sort(([a], [b]) => a.localeCompare(b)));
const resultat = {
  protocole: 'Seize références, deux intensités puis une, dérive Tailwind, recette par défaut, rampes ancrées de rampesDe ; balayage sans ancrage pour la fenêtre sombre.',
  encres: { fondClair: recette.fonds.light, fondSombre: recette.fonds.dark, neutre950Clair: ecrireHexa(neutre('light', 950)), neutre950Sombre: ecrireHexa(neutre('dark', 950)) },
  minima: enObjet(minima), succes: enObjet(succes), fenetreSombre: fenetre, escalier, clartes, marques,
};
writeFileSync(new URL('./resultats-polarites.json', import.meta.url), `${JSON.stringify(resultat, null, 2)}\n`);

const arrondi = (x: number) => x.toFixed(2);
const tableau = (prefixe: string) => [...minima].filter(([cle]) => cle.startsWith(prefixe))
  .map(([cle, { ratio, contexte }]) => `${cle.slice(prefixe.length)}  ${arrondi(ratio)}  ${succes.get(cle) ? `${succes.get(cle)!.tenus}/${succes.get(cle)!.total}` : ''}  ${contexte}`);
console.log(resultat.encres);
for (const prefixe of ['partenaires/', 'polarite/', 'auto/']) console.log(`\n== ${prefixe}\n${tableau(prefixe).join('\n')}`);
console.log('\n== fenêtre sombre');
for (const ligne of fenetre) console.log(ligne.cran, arrondi(ligne.encreBlanche), arrondi(ligne.encreNeutre950), arrondi(ligne.page), arrondi(ligne.pageMax));
console.log('\n== escalier entre familles');
for (const ligne of escalier) console.log(JSON.stringify(ligne, (_, v) => (typeof v === 'number' ? Number(v.toFixed(3)) : v)));
console.log('\n== clartés sombres pour une encre claire');
for (const ligne of clartes) console.log(JSON.stringify(ligne, (_, v) => (typeof v === 'number' ? Number(v.toFixed(2)) : v)));
console.log('\n== marques');
for (const marque of marques as Array<Record<string, unknown>>) console.log(JSON.stringify(marque, (_, v) => (typeof v === 'number' ? Number(v.toFixed(2)) : v)));
