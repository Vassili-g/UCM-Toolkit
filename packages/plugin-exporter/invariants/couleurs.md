# Couleurs

- **Aucune couleur n'est perdue par troncature.** Dernier segment = base de la clé ; deux couleurs cohabitant dans une feuille en le partageant l'allongent des segments qui les séparent (`userinput.background` / `divider.background`). Autorité : `colorKeys.ts`.
- **La clé d'un token est la même dans toutes les feuilles.** Décision sur toute la matrice. Borne du coût : sélection exacte jusqu'à seize profondeurs candidates, gloutonne et déterministe au-delà. Autorité : `colorKeys.ts`. Spec : [§2]
- **Le site tranche la nature de ce qu'une couleur peint ; le nom précise à l'intérieur de cette nature.** Un dernier segment nommant un rôle partagé l'emporte seulement s'il est de la nature du calque (distingue `ring` de `border`), et ne tranche rien de plus. Un `…/foreground` posé en contour peint un contour, sans un mot.
- **Le nom se lit sur le dernier segment du token, jamais sur la clé publiée.**
- **Une clé de couleur ne porte pas un rôle.** `rendering.roles` : vocabulaire partagé, identique dans tous les contrats ; `rendering.keyRoles` : rôle de chaque clé observée qui n'en porte pas le nom, en deux tables que `colorKeys` sépare comme ses feuilles (`fills`, `strokes`). Résolution : `roles[keyRoles[côté][clé] ?? clé]`. Tests : `tests/lois.ts` vérifie sur chaque contrat que la réponse existe et est de la bonne nature.
- **Un rôle de contour ne cite jamais une propriété CSS qui consomme la boîte.** `border` devient `box-shadow`, `ring` devient `outline`, jamais l'un ni l'autre en bordure ; `align` donne la forme de l'ombre. Autorité : `defaultRenderingSemantics()`. Spec : [§8](../../../docs/format/FORMAT.md#8-rendu-sémantique-et-garde-fous)
- **Le contrat ne publie que les couleurs liées.** Retenu et avertissements sortent ensemble d'une lecture, liste du node en repli. Autorité : `lirePeintures`, unique lecture.
- **Une peinture posée à la main sur un calque parcouru avertit et rend `meta.coverage.portable` partiel.** Borne : réserves muettes : paint masqué ou d'opacité nulle, stroke d'épaisseur zéro, peinture non `SOLID`.
- **`variantViews.*.paintPlacements` situe fills et strokes par les chemins de l'arbre publié.** `[]` cible la racine ; chemins collectés pendant l'unique extraction de `structure.children`. Spec : [§2]
- **Le chemin est celui du calque publié qui porte la peinture.** Couleur sous une feuille : à cette feuille ; deux tracés d'une même icône : une seule cible. Borne : les deux relevés ne parcourent pas le même arbre ; égalité non exigée. Spec : [§2]

[§2]: ../../../docs/format/FORMAT.md#2-tokens-de-variantes
