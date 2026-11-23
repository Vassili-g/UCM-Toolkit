# Le linter UCM

Le linter vérifie que le code d'un composant utilise les tokens que le contrat
donne, au lieu de valeurs écrites à la main. Il souligne l'erreur dans
l'éditeur du développeur. `ucm check` rend le même verdict dans la pull request.

## Ce qu'il vérifie

| Règle | Il signale |
|---|---|
| `token-inconnu` | une référence `{chemin}` ou une variable `var(--nom)` qui ne nomme aucun token de `tokens.json`, ou un repli écrit en dur dans `var(--nom, 8px)` |
| `valeur-en-dur` | une couleur, une longueur ou un nombre visuel que le contrat ne publie pas, comme `#ff0000` ou `12px` |

Il juge les fichiers d'un composant : le fichier que le contrat désigne, et les
fichiers qu'il importe depuis son dossier. Les tests et les stories ne sont pas
jugés.

Une valeur neutre passe toujours, parce qu'elle ne porte aucun choix du
designer. Un mot-clé CSS passe aussi (`solid`, `auto`, `left`), sauf un nom de
couleur.

## Ce qu'il ne voit pas

- Une valeur calculée par le code (`gap: taille * 2`). L'inventaire et le rapport la comptent comme « non jugée ».
- Une forme de style autre que les objets `style` et les objets typés `CSSProperties`, comme CSS Modules.
- Le rendu réel du composant. Le comparateur de rendu s'en chargera.

## Ce qui se règle

Les listes (familles, propriétés, valeurs neutres) vivent dans un seul fichier,
`packages/kit/src/lecteurs/controle-du-code-listes.mjs`. L'inventaire les
affiche, section 6. Pour en changer une, dire à un agent : « Ajoute `auto` aux
valeurs neutres du linter. » L'agent suit la skill `regler-le-linter`, et une
nouvelle version des paquets part.

## Garder une valeur malgré tout

Chaque erreur donne la commande qui garde la valeur, avec une seule chose à
remplir, la raison :

```sh
npx ucm deroger Button valeur-en-dur src/components/Button/Button.tsx 13px --motif "Le texte se coupe sur Safari avec 12px"
```

La commande écrit l'exception dans `.ucm/derogations.json`. Le rapport la
montre au designer. Elle tombe au prochain export du contrat de ce composant.
Un agent ne la lance qu'à la demande du développeur, avec sa raison.

Un commentaire `eslint-disable` sur une règle UCM ne cache rien : `ucm check`
l'ignore et le signale comme une erreur.

## Dans la pull request

`ucm check` juge les mêmes fichiers avec le même juge, et applique la règle du
dernier modifié. Le code plus récent que son contrat bloque la fusion. Le code
plus ancien est « en retard » et ne bloque pas.

## Pour le développeur du plugin

- Le plugin appelle `preparerControle` de `@ucm-kit/core/modules` et `lecteurDuCode` de `@ucm-kit/adapter-typescript/usages`. Les types sont dans les `index.d.mts` de ces deux portes, et [MODULES.md](./MODULES.md) donne l'appel complet.
- L'éditeur et `ucm check` doivent utiliser le même `@ucm-kit/core`, épinglé à la même version exacte. `ucm check` avertit quand ils diffèrent.
- Le cache d'ESLint reste désactivé : le juge relit le contrat et `tokens.json` à chaque fichier.
