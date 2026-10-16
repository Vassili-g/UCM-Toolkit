/**
 * Juge `verifierPromesses` du paquet sur les entrées du mode produit de
 * `garanties-regles.ts` : les 144 références du balayage, la recette par
 * défaut (parts, dérives, courbes), les quatre couples de texte des boutons,
 * la page par défaut et la carte du paquet (`couleurDeLaCarte`).
 *
 * `npx tsx verifier-implementation.ts` affiche le décompte des promesses
 * manquées par garantie, dans le format de `MODE=produit`.
 */
import { ecrireHexa, lineaireVersRgb8, oklchVersLineaire } from '../../../../../../packages/couleur/src/conversions';
import { courbesParDefaut } from '../../../../../../packages/couleur/src/nuances';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { verifierPromesses } from '../../../../../../packages/couleur/src/promesses';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';

const teintes = Array.from({ length: 72 }, (_, i) => i * 5);
const references = teintes.flatMap((H) => [0.62, 0.75].map((L) => ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C: 0.9 * plafond(L, H, 'srgb'), H })))));

const textes = ['blanc', 'noir'] as const;
const decomptes: Record<string, number> = {};
for (const clair of textes) for (const sombre of textes) {
  const base = recetteParDefaut();
  const texteDesBoutons = { light: clair, dark: sombre };
  const palettes: Palette[] = references.map((reference, k) => ({
    id: `p-${(k + 1).toString(16).padStart(8, '0')}`,
    reference,
    derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
  } as Palette));
  const recette: Recette = { ...base, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons), palettes };
  for (const palette of palettes) {
    for (const promesse of verifierPromesses(recette, palette)) {
      if (promesse.verdict === 'manquee') decomptes[`G${promesse.garantie.numero}`] = (decomptes[`G${promesse.garantie.numero}`] ?? 0) + 1;
    }
  }
}

for (let g = 1; g <= 7; g += 1) console.log(`G${g} : ${decomptes[`G${g}`] ?? 0} promesses manquées`);
console.log(`Total : ${Object.values(decomptes).reduce((s, x) => s + x, 0)} promesses manquées`);
