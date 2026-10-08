# ucm-couleur

Le moteur de couleur de [UCM Toolkit](../../README.md) calcule les palettes
d'[UCM Palettes](../plugin-palettes/README.md). Ce paquet privé est importé en
source TypeScript par le plugin. Il n'est pas publié sur npm.

## Ce qu'il calcule

| Domaine | Modules |
|---|---|
| Conversions sRGB, linéaire, Oklab, OKLCH et Display P3 | `conversions.ts` |
| Limite de chroma sRGB, rampes, dérive de teinte et fonds Dark | `plafond.ts`, `rampe.ts` |
| Modèles de nuances, courbes par défaut selon le texte des boutons de chaque thème, intensités, gris et ancrage de la référence | `nuances.ts`, `palette.ts` |
| Réglage global et limites dynamiques du Color shift | `reglages.ts`, `limites.ts` |
| Proposition d'ajustement de la référence | `ajustement.ts` |
| Contrastes WCAG 2 et les sept garanties de la table en dossiers | `contraste.ts`, `promesses.ts` ; la table et les garanties sont dans `@ucm-kit/core/emplois` |
| Alertes de conception et garantie des courbes | `alertes.ts`, `garantie.ts`, `constats.ts` |
| Recette, validation, classement et empreinte | `recette.ts`, `empreinte.ts` |
| Clé de stockage partagée avec l'explorateur | `protocole.ts` |
| Préréglage Tailwind et son relevé | `tailwind.ts` |

La porte publique est [src/index.ts](./src/index.ts). Les consommateurs
importent depuis `ucm-couleur` pour utiliser ces fonctions et leurs types.

## Recette et déterminisme

`FORMAT_RECETTE` vaut **9** : la recette porte `texteDesBoutons`, blanc ou noir
pour chaque thème. `classerRecette` distingue une recette absente, courante,
future ou illisible. Une recette absente propose les valeurs par défaut. Une
recette au format 8 se lit : `classerRecette` lui ajoute `texteDesBoutons` par
défaut et la passe au format 9. Une version antérieure à 8 est refusée sans
conversion. Le format de recette est distinct des formats de contrat et de
tokens d'UCM.

Les calculs ne dépendent ni de Figma, ni du DOM, ni de l'heure, du hasard ou de
la langue du poste. La recette et la palette passées en entrée déterminent le
résultat. L'enregistrement et le dessin appartiennent au plugin.

## Vérifier et mesurer

Depuis la racine du dépôt, après `npm install` :

```sh
npm run test --workspace ucm-couleur
npm run typecheck --workspace ucm-couleur
node packages/couleur/scripts/mesurer-temps.mjs
node packages/couleur/scripts/mesurer-garantie.mjs
node packages/couleur/scripts/mesurer-ancrage.mjs
node packages/couleur/scripts/mesurer-limites.mjs
```

Les tests couvrent des vecteurs figés, les propriétés des rampes et la pureté
du moteur. Les scripts de mesure s'exécutent séparément des tests.

Les [invariants du moteur](../../AGENTS.md#moteur-de-couleur) précisent les
bornes de chaque calcul et renvoient à la spécification de Palettes.

## Licence

[MIT](../../LICENSE).
