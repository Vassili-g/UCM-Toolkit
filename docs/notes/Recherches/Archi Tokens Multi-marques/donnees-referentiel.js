// Généré par generer-donnees-referentiel.ts ; ne pas modifier à la main.
window.REFERENTIEL = {
 "collections": [
  {
   "nom": "components",
   "cibles": [
    "theme",
    "layout",
    "typography"
   ],
   "sansPortee": false
  },
  {
   "nom": "theme",
   "cibles": [
    "brands",
    "utility"
   ],
   "sansPortee": false
  },
  {
   "nom": "brands",
   "cibles": [
    "primitives"
   ],
   "sansPortee": true
  },
  {
   "nom": "utility",
   "cibles": [
    "primitives"
   ],
   "sansPortee": true
  },
  {
   "nom": "primitives",
   "cibles": [],
   "sansPortee": true
  },
  {
   "nom": "layout",
   "cibles": [
    "primitives"
   ],
   "sansPortee": false
  },
  {
   "nom": "typography",
   "cibles": [
    "primitives"
   ],
   "sansPortee": false
  }
 ],
 "textesDesBoutonsParDefaut": {
  "light": "blanc",
  "dark": "noir"
 },
 "couleursDuTexteDesBoutons": {
  "blanc": "#FFFFFF",
  "noir": "#000000"
 },
 "niveauxDElevation": [
  "page",
  "raised"
 ],
 "variables": [
  {
   "id": "solid/default",
   "libelle": "bouton",
   "definition": "Fond et contour du bouton au repos.",
   "garanties": [
    2
   ],
   "crans": {
    "light-normal": "700",
    "light-inverse": "700",
    "dark-normal": "700",
    "dark-inverse": "700"
   }
  },
  {
   "id": "solid/hover",
   "libelle": "bouton survolé",
   "definition": "Fond et contour du bouton sous le pointeur.",
   "garanties": [],
   "crans": {
    "light-normal": "800",
    "light-inverse": "600",
    "dark-normal": "800",
    "dark-inverse": "600"
   }
  },
  {
   "id": "solid/pressed",
   "libelle": "bouton appuyé",
   "definition": "Fond et contour du bouton pendant la pression.",
   "garanties": [],
   "crans": {
    "light-normal": "900",
    "light-inverse": "500",
    "dark-normal": "900",
    "dark-inverse": "500"
   }
  },
  {
   "id": "solid/foreground",
   "libelle": "texte des boutons",
   "definition": "Texte et icônes sur le fond du bouton.",
   "garanties": [
    1
   ],
   "crans": {
    "light-normal": "blanc",
    "light-inverse": "noir",
    "dark-normal": "noir",
    "dark-inverse": "blanc"
   }
  },
  {
   "id": "surface/default",
   "libelle": "fond teinté",
   "definition": "Fond teinté au repos.",
   "garanties": [],
   "crans": {
    "light-normal": "100",
    "light-inverse": "100",
    "dark-normal": "200",
    "dark-inverse": "200"
   }
  },
  {
   "id": "surface/hover",
   "libelle": "fond teinté survolé",
   "definition": "Fond teinté sous le pointeur.",
   "garanties": [],
   "crans": {
    "light-normal": "200",
    "light-inverse": "200",
    "dark-normal": "300",
    "dark-inverse": "300"
   }
  },
  {
   "id": "surface/pressed",
   "libelle": "fond teinté appuyé",
   "definition": "Fond teinté pendant la pression.",
   "garanties": [],
   "crans": {
    "light-normal": "300",
    "light-inverse": "300",
    "dark-normal": "400",
    "dark-inverse": "400"
   }
  },
  {
   "id": "surface/subtle",
   "libelle": "fond teinté léger",
   "definition": "Fond teinté très léger, sans état.",
   "garanties": [],
   "crans": {
    "light-normal": "50",
    "light-inverse": "50",
    "dark-normal": "100",
    "dark-inverse": "100"
   }
  },
  {
   "id": "surface/foreground",
   "libelle": "texte sur fond teinté",
   "definition": "Texte et icônes sur un fond teinté.",
   "garanties": [
    3,
    8
   ],
   "crans": {
    "light-normal": "700",
    "light-inverse": "900",
    "dark-normal": "950",
    "dark-inverse": "950"
   }
  },
  {
   "id": "surface/border",
   "libelle": "contour sur fond teinté",
   "definition": "Contour sur un fond teinté.",
   "garanties": [
    4
   ],
   "crans": {
    "light-normal": "700",
    "light-inverse": "900",
    "dark-normal": "950",
    "dark-inverse": "950"
   }
  },
  {
   "id": "surface/divider",
   "libelle": "filet sur fond teinté",
   "definition": "Trait de séparation sur un fond teinté.",
   "garanties": [],
   "crans": {
    "light-normal": "300",
    "light-inverse": "300",
    "dark-normal": "500",
    "dark-inverse": "500"
   }
  },
  {
   "id": "page/foreground",
   "libelle": "texte coloré",
   "definition": "Texte et icônes colorés sur le fond de la page.",
   "garanties": [
    5,
    9
   ],
   "crans": {
    "light-normal": "700",
    "light-inverse": "800",
    "dark-normal": "700",
    "dark-inverse": "800"
   }
  },
  {
   "id": "page/border",
   "libelle": "contour",
   "definition": "Contour des éléments sur le fond de la page.",
   "garanties": [
    6
   ],
   "crans": {
    "light-normal": "700",
    "light-inverse": "800",
    "dark-normal": "700",
    "dark-inverse": "800"
   }
  },
  {
   "id": "page/divider",
   "libelle": "filet",
   "definition": "Trait de séparation sur le fond de la page.",
   "garanties": [],
   "crans": {
    "light-normal": "300",
    "light-inverse": "300",
    "dark-normal": "300",
    "dark-inverse": "300"
   }
  },
  {
   "id": "ring",
   "libelle": "anneau de focus",
   "definition": "Trait de l’anneau qui indique le focus visible.",
   "garanties": [
    7
   ],
   "crans": {
    "light-normal": "600",
    "light-inverse": "700",
    "dark-normal": "600",
    "dark-inverse": "800"
   }
  },
  {
   "id": "page/foreground-main",
   "libelle": "corps de texte",
   "definition": "Texte principal et icônes du neutre sur le fond de la page.",
   "garanties": [],
   "crans": {
    "light-normal": null,
    "light-inverse": null,
    "dark-normal": null,
    "dark-inverse": null
   }
  },
  {
   "id": "page/foreground-subtle",
   "libelle": "texte secondaire",
   "definition": "Texte secondaire et icônes du neutre sur le fond de la page.",
   "garanties": [],
   "crans": {
    "light-normal": "700",
    "light-inverse": "800",
    "dark-normal": "700",
    "dark-inverse": "800"
   }
  },
  {
   "id": "elevation/page",
   "libelle": "fond de la page",
   "definition": "Fond de la page.",
   "garanties": [],
   "crans": {
    "light-normal": null,
    "light-inverse": null,
    "dark-normal": null,
    "dark-inverse": null
   }
  },
  {
   "id": "elevation/raised",
   "libelle": "fond de la carte",
   "definition": "Fond des cartes au-dessus de la page.",
   "garanties": [],
   "crans": {
    "light-normal": null,
    "light-inverse": null,
    "dark-normal": null,
    "dark-inverse": null
   }
  },
  {
   "id": "scale/0",
   "libelle": "borne de départ",
   "definition": "Borne pure au début de l’échelle du neutre : blanc en Light, noir en Dark.",
   "garanties": [],
   "crans": {
    "light-normal": null,
    "light-inverse": null,
    "dark-normal": null,
    "dark-inverse": null
   }
  },
  {
   "id": "scale/1000",
   "libelle": "borne de fin",
   "definition": "Borne pure à la fin de l’échelle du neutre : noir en Light, blanc en Dark.",
   "garanties": [],
   "crans": {
    "light-normal": null,
    "light-inverse": null,
    "dark-normal": null,
    "dark-inverse": null
   }
  },
  {
   "id": "disabled/background",
   "libelle": "fond désactivé",
   "definition": "Fond des éléments désactivés.",
   "garanties": [],
   "crans": {
    "light-normal": "200",
    "light-inverse": "200",
    "dark-normal": "200",
    "dark-inverse": "200"
   }
  },
  {
   "id": "disabled/foreground",
   "libelle": "texte désactivé",
   "definition": "Texte et icônes des éléments désactivés.",
   "garanties": [],
   "crans": {
    "light-normal": "500",
    "light-inverse": "500",
    "dark-normal": "500",
    "dark-inverse": "500"
   }
  },
  {
   "id": "disabled/border",
   "libelle": "contour désactivé",
   "definition": "Contour des éléments désactivés.",
   "garanties": [],
   "crans": {
    "light-normal": "500",
    "light-inverse": "500",
    "dark-normal": "500",
    "dark-inverse": "500"
   }
  }
 ],
 "garanties": [
  {
   "numero": 1,
   "seuil": "texte"
  },
  {
   "numero": 2,
   "seuil": "nonTexte"
  },
  {
   "numero": 3,
   "seuil": "texte"
  },
  {
   "numero": 4,
   "seuil": "nonTexte"
  },
  {
   "numero": 5,
   "seuil": "texte"
  },
  {
   "numero": 6,
   "seuil": "nonTexte"
  },
  {
   "numero": 7,
   "seuil": "nonTexte"
  },
  {
   "numero": 8,
   "seuil": "nonTexte"
  },
  {
   "numero": 9,
   "seuil": "texte"
  }
 ],
 "recommandations": [
  {
   "id": "anneau-de-focus",
   "regle": "Séparer le composant de son anneau de focus par 2 px de la couleur du fond, puis tracer un anneau de 2 px.",
   "preuve": "Au focus visible, vérifier les 2 px de fond et les 2 px de trait autour du composant.",
   "parametres": {
    "espace": 2,
    "epaisseur": 2,
    "unite": "px",
    "couleurDeLEspace": "fond",
    "couleurDuTrait": "ring"
   }
  },
  {
   "id": "bouton-basculable",
   "regle": "Pour un bouton basculable, employer surface au repos et solid quand il est activé.",
   "preuve": "Comparer les fonds du bouton au repos et activé aux variables surface et solid.",
   "parametres": {
    "repos": "surface",
    "active": "solid"
   }
  }
 ],
 "famillesDeSignes": [
  {
   "id": "types-figma",
   "libelle": "Type de variable Figma",
   "teinte": null,
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "La famille n’a pas de teinte : `informe` ne change rien et la tuile reste grise.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "type-color",
     "libelle": "Color",
     "sens": "Variable de type Color.",
     "emploi": "Une variable de type Color, dans une liste de types. Pour la couleur d’un layer, prendre `usage-fill`.",
     "trace": "<path d=\"M8 2s4.6 4.9 4.6 7.9a4.6 4.6 0 0 1-9.2 0C3.4 6.9 8 2 8 2z\"/>",
     "grille": 16
    },
    {
     "id": "type-number",
     "libelle": "Number",
     "sens": "Variable de type Number.",
     "emploi": "Une variable de type Number. Pour dire ce que le nombre règle, prendre le signe de la famille « Usage d’un nombre ».",
     "trace": "<path d=\"M6.2 2.5 5 13.5M11 2.5l-1.2 11M2.8 6h10.7M2.5 10h10.7\"/>",
     "grille": 16
    },
    {
     "id": "type-string",
     "libelle": "String",
     "sens": "Variable de type String.",
     "emploi": "Une variable de type String. Pour un layer texte, prendre `text`.",
     "trace": "<path d=\"M4.5 4.5C3.4 5.3 3 6.5 3 8v3h2.6V8H3M10 4.5C8.9 5.3 8.5 6.5 8.5 8v3h2.6V8H8.5\"/>",
     "grille": 16
    },
    {
     "id": "type-boolean",
     "libelle": "Boolean",
     "sens": "Variable de type Boolean.",
     "emploi": "Une variable de type Boolean, et une property booléenne de composant que la famille « Property » reprend. Pour un état de la library, prendre `variable`.",
     "trace": "<rect x=\"1.5\" y=\"4.5\" width=\"13\" height=\"7\" rx=\"3.5\"/><circle cx=\"11\" cy=\"8\" r=\"1.8\" fill=\"currentColor\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "usage-couleur",
   "libelle": "Usage d’une couleur",
   "teinte": "couleurs",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). Pour montrer la valeur d’une couleur de token, passer `valeur` (et `clair` si elle est claire) : la tuile se remplit, `usage-stroke` devient un anneau, et la valeur prend le pas sur la teinte.",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « couleurs ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "usage-fill",
     "libelle": "fill",
     "sens": "Couleur de fond d’un layer.",
     "emploi": "La couleur qui peint le fond d’un layer. Pour un contour, prendre `usage-stroke`.",
     "trace": "",
     "grille": 16
    },
    {
     "id": "usage-texte",
     "libelle": "texte",
     "sens": "Couleur d’un texte.",
     "emploi": "La couleur qui peint un texte. Pour la police ou le corps, prendre un signe de « Typographie ».",
     "trace": "<text x=\"8\" y=\"11.4\" font-size=\"9.5\" text-anchor=\"middle\" font-weight=\"650\">A</text>",
     "grille": 16
    },
    {
     "id": "usage-icone",
     "libelle": "icône",
     "sens": "Couleur d’une icône. L’étoile est le signe de l’icône.",
     "emploi": "La couleur qui peint une icône. Pour sa taille, prendre `taille-icone`.",
     "trace": "<path d=\"M8 2.4 9.6 6.4 13.6 8 9.6 9.6 8 13.6 6.4 9.6 2.4 8 6.4 6.4z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "usage-stroke",
     "libelle": "stroke",
     "sens": "Couleur d’un contour.",
     "emploi": "La couleur qui peint un contour. Pour son épaisseur, prendre `stroke-weight`.",
     "trace": "",
     "grille": 16
    },
    {
     "id": "usage-effet",
     "libelle": "shadow",
     "sens": "Couleur d’un effet.",
     "emploi": "La couleur d’une ombre ou d’un autre effet. Pour un fond, prendre `usage-fill`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"8.5\" height=\"8.5\" rx=\"1.5\"/><path d=\"M13.5 5.5v7a1 1 0 0 1-1 1h-7\"/>",
     "grille": 16
    },
    {
     "id": "usage-inconnue",
     "libelle": "couleur non lue",
     "sens": "Couleur dont la valeur ne se résout pas.",
     "emploi": "Une couleur dont la valeur ne se résout pas. Une couleur lue se montre par son usage, jamais par ce signe.",
     "trace": "<path d=\"M8 2s4.6 4.9 4.6 7.9a4.6 4.6 0 0 1-9.2 0C3.4 6.9 8 2 8 2z\" stroke-dasharray=\"2 1.6\"/>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "type-color",
     "libelle": "Couleurs",
     "emploi": "La rubrique des couleurs d’un composant. Pour l’usage d’une couleur, prendre le signe de cet usage.",
     "trace": "<path d=\"M8 2s4.6 4.9 4.6 7.9a4.6 4.6 0 0 1-9.2 0C3.4 6.9 8 2 8 2z\"/>",
     "grille": 16
    }
   ]
  },
  {
   "id": "usage-nombre",
   "libelle": "Usage d’un nombre",
   "teinte": "tailles",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « tailles ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "padding",
     "libelle": "padding",
     "sens": "Les quatre côtés.",
     "emploi": "Un padding identique sur les quatre côtés. Si un côté diffère, prendre `padding-x`, `padding-y` ou le côté seul.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-width=\"1\" opacity=\".45\" stroke-dasharray=\"1.6 1.4\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" rx=\".5\" fill=\"currentColor\" stroke=\"none\" opacity=\".55\"/><path d=\"M2.5 2.5h11\" stroke-width=\"2.2\"/><path d=\"M2.5 13.5h11\" stroke-width=\"2.2\"/><path d=\"M2.5 2.5v11\" stroke-width=\"2.2\"/><path d=\"M13.5 2.5v11\" stroke-width=\"2.2\"/>",
     "grille": 16
    },
    {
     "id": "padding-x",
     "libelle": "padding-x",
     "sens": "Left et right.",
     "emploi": "Un padding à gauche et à droite. Pour un seul côté, prendre `padding-left` ou `padding-right`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-width=\"1\" opacity=\".45\" stroke-dasharray=\"1.6 1.4\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" rx=\".5\" fill=\"currentColor\" stroke=\"none\" opacity=\".55\"/><path d=\"M2.5 2.5v11\" stroke-width=\"2.2\"/><path d=\"M13.5 2.5v11\" stroke-width=\"2.2\"/>",
     "grille": 16
    },
    {
     "id": "padding-y",
     "libelle": "padding-y",
     "sens": "Top et bottom.",
     "emploi": "Un padding en haut et en bas. Pour un seul côté, prendre `padding-top` ou `padding-bottom`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-width=\"1\" opacity=\".45\" stroke-dasharray=\"1.6 1.4\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" rx=\".5\" fill=\"currentColor\" stroke=\"none\" opacity=\".55\"/><path d=\"M2.5 2.5h11\" stroke-width=\"2.2\"/><path d=\"M2.5 13.5h11\" stroke-width=\"2.2\"/>",
     "grille": 16
    },
    {
     "id": "padding-top",
     "libelle": "padding-top",
     "sens": "Top seul.",
     "emploi": "Un padding en haut seulement. Pour haut et bas ensemble, prendre `padding-y`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-width=\"1\" opacity=\".45\" stroke-dasharray=\"1.6 1.4\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" rx=\".5\" fill=\"currentColor\" stroke=\"none\" opacity=\".55\"/><path d=\"M2.5 2.5h11\" stroke-width=\"2.2\"/>",
     "grille": 16
    },
    {
     "id": "padding-right",
     "libelle": "padding-right",
     "sens": "Right seul.",
     "emploi": "Un padding à droite seulement. Pour gauche et droite ensemble, prendre `padding-x`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-width=\"1\" opacity=\".45\" stroke-dasharray=\"1.6 1.4\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" rx=\".5\" fill=\"currentColor\" stroke=\"none\" opacity=\".55\"/><path d=\"M13.5 2.5v11\" stroke-width=\"2.2\"/>",
     "grille": 16
    },
    {
     "id": "padding-bottom",
     "libelle": "padding-bottom",
     "sens": "Bottom seul.",
     "emploi": "Un padding en bas seulement. Pour haut et bas ensemble, prendre `padding-y`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-width=\"1\" opacity=\".45\" stroke-dasharray=\"1.6 1.4\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" rx=\".5\" fill=\"currentColor\" stroke=\"none\" opacity=\".55\"/><path d=\"M2.5 13.5h11\" stroke-width=\"2.2\"/>",
     "grille": 16
    },
    {
     "id": "padding-left",
     "libelle": "padding-left",
     "sens": "Left seul.",
     "emploi": "Un padding à gauche seulement. Pour gauche et droite ensemble, prendre `padding-x`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-width=\"1\" opacity=\".45\" stroke-dasharray=\"1.6 1.4\"/><rect x=\"6.2\" y=\"6.2\" width=\"3.6\" height=\"3.6\" rx=\".5\" fill=\"currentColor\" stroke=\"none\" opacity=\".55\"/><path d=\"M2.5 2.5v11\" stroke-width=\"2.2\"/>",
     "grille": 16
    },
    {
     "id": "gap",
     "libelle": "gap",
     "sens": "Écart entre les enfants d’un auto layout.",
     "emploi": "L’espace entre les enfants d’un auto layout. Pour l’espace entre le bord et le contenu, prendre `padding`.",
     "trace": "<rect x=\"2\" y=\"3\" width=\"4\" height=\"10\" rx=\"1\"/><rect x=\"10\" y=\"3\" width=\"4\" height=\"10\" rx=\"1\"/><path d=\"M7 8h2\"/>",
     "grille": 16
    },
    {
     "id": "width",
     "libelle": "width",
     "sens": "Largeur fixée.",
     "emploi": "Une largeur fixée. Pour une hauteur, prendre `height`.",
     "trace": "<path d=\"M2 4v8M14 4v8M4.3 8h7.4M5.8 6.5 4.3 8l1.5 1.5M10.2 6.5 11.7 8l-1.5 1.5\"/>",
     "grille": 16
    },
    {
     "id": "height",
     "libelle": "height",
     "sens": "Hauteur fixée.",
     "emploi": "Une hauteur fixée. Pour une largeur, prendre `width`.",
     "trace": "<path d=\"M4 2h8M4 14h8M8 4.3v7.4M6.5 5.8 8 4.3l1.5 1.5M6.5 10.2 8 11.7l1.5-1.5\"/>",
     "grille": 16
    },
    {
     "id": "taille-icone",
     "libelle": "taille d’icône",
     "sens": "Côté d’une icône.",
     "emploi": "Le côté d’une icône. Pour la largeur d’un layer quelconque, prendre `width`.",
     "trace": "<path d=\"M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5\"/><path d=\"M8 5.2 8.8 7.2 10.8 8 8.8 8.8 8 10.8 7.2 8.8 5.2 8 7.2 7.2z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "radius",
     "libelle": "radius",
     "sens": "Rayon des coins.",
     "emploi": "Le rayon des coins d’un layer. Pour l’épaisseur du contour, prendre `stroke-weight`.",
     "trace": "<path d=\"M3 13.5V8.5a5.5 5.5 0 0 1 5.5-5.5h5\"/>",
     "grille": 16
    },
    {
     "id": "stroke-weight",
     "libelle": "stroke weight",
     "sens": "Épaisseur d’un contour.",
     "emploi": "L’épaisseur d’un contour. Pour sa couleur, prendre `usage-stroke`.",
     "trace": "<path d=\"M2.5 3.8h11\" stroke-width=\"1\"/><path d=\"M2.5 7.8h11\" stroke-width=\"1.9\"/><path d=\"M2.5 12.2h11\" stroke-width=\"2.8\"/>",
     "grille": 16
    },
    {
     "id": "opacity",
     "libelle": "opacity",
     "sens": "Opacité d’un layer.",
     "emploi": "L’opacité d’un layer. Pour une couleur, prendre le signe de son usage.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1.5\"/><path d=\"M2.5 2.5h5.5v5.5H2.5zM8 8h5.5v5.5H8z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "typographie",
   "libelle": "Typographie",
   "teinte": "texte",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « texte ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "text-style",
     "libelle": "text style",
     "sens": "Style de texte de Figma.",
     "emploi": "Un style de texte de Figma, qui réunit police, corps et interligne. Pour un seul réglage, prendre le signe de ce réglage.",
     "trace": "<text x=\"8\" y=\"12\" font-size=\"10.5\" text-anchor=\"middle\" font-weight=\"650\">Aa</text>",
     "grille": 16
    },
    {
     "id": "font-family",
     "libelle": "font family",
     "sens": "Famille de police.",
     "emploi": "La famille de police d’un texte. Pour son corps, prendre `font-size`.",
     "trace": "<text x=\"8\" y=\"11.6\" font-size=\"10.5\" text-anchor=\"middle\" font-weight=\"650\">Ag</text>",
     "grille": 16
    },
    {
     "id": "font-size",
     "libelle": "font size",
     "sens": "Corps du texte.",
     "emploi": "Le corps d’un texte. Pour l’interligne, prendre `line-height`.",
     "trace": "<text x=\"4.6\" y=\"12\" font-size=\"5.5\" text-anchor=\"middle\" font-weight=\"650\">A</text><text x=\"10.6\" y=\"12\" font-size=\"10.5\" text-anchor=\"middle\" font-weight=\"650\">A</text>",
     "grille": 16
    },
    {
     "id": "font-weight",
     "libelle": "font weight",
     "sens": "Graisse.",
     "emploi": "La graisse d’un texte. Pour la famille de police, prendre `font-family`.",
     "trace": "<text x=\"8\" y=\"12\" font-size=\"11\" text-anchor=\"middle\" font-weight=\"900\">B</text>",
     "grille": 16
    },
    {
     "id": "line-height",
     "libelle": "line height",
     "sens": "Hauteur de ligne.",
     "emploi": "La hauteur de ligne d’un texte. Pour l’espace entre les lettres, prendre `letter-spacing`.",
     "trace": "<path d=\"M2 4h7M2 8h7M2 12h7M12.5 3v10M11 4.5 12.5 3 14 4.5M11 11.5l1.5 1.5 1.5-1.5\"/>",
     "grille": 16
    },
    {
     "id": "letter-spacing",
     "libelle": "letter spacing",
     "sens": "Espace entre les lettres.",
     "emploi": "L’espace entre les lettres. Pour l’interligne, prendre `line-height`.",
     "trace": "<text x=\"8\" y=\"8.5\" font-size=\"7\" text-anchor=\"middle\" font-weight=\"650\">AV</text><path d=\"M2.5 12.5h11M4 11l-1.5 1.5L4 14M12 11l1.5 1.5L12 14\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "couche",
   "libelle": "Couche UCM, dans l’ordre de la library",
   "teinte": "tokens",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « tokens ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "couche-primitives",
     "libelle": "primitives",
     "sens": "Valeurs brutes. Première collection.",
     "emploi": "La collection des valeurs brutes, première de la library. Pour une collection qui les lit, prendre `couche-layout`.",
     "trace": "<rect x=\"1.5\" y=\"0.19999999999999996\" width=\"13\" height=\"3.6\" rx=\"1\" stroke=\"none\" fill=\"currentColor\"/><path d=\"M3 6h10\" stroke-width=\"1\" opacity=\".55\"/><path d=\"M3 10h10\" stroke-width=\"1\" opacity=\".55\"/><path d=\"M3 14h10\" stroke-width=\"1\" opacity=\".55\"/>",
     "grille": 16
    },
    {
     "id": "couche-layout",
     "libelle": "layout, typography, brands, utility",
     "sens": "Valeurs partagées, lues dans primitives.",
     "emploi": "Les collections layout, typography, brands et utility, qui lisent primitives. Pour les rôles de couleur par mode, prendre `couche-theme`.",
     "trace": "<path d=\"M3 2h10\" stroke-width=\"1\" opacity=\".55\"/><rect x=\"1.5\" y=\"4.2\" width=\"13\" height=\"3.6\" rx=\"1\" stroke=\"none\" fill=\"currentColor\"/><path d=\"M3 10h10\" stroke-width=\"1\" opacity=\".55\"/><path d=\"M3 14h10\" stroke-width=\"1\" opacity=\".55\"/>",
     "grille": 16
    },
    {
     "id": "couche-theme",
     "libelle": "theme",
     "sens": "Rôles de couleur par mode.",
     "emploi": "La collection des rôles de couleur par mode. Pour les tokens d’un composant, prendre `couche-components`.",
     "trace": "<path d=\"M3 2h10\" stroke-width=\"1\" opacity=\".55\"/><path d=\"M3 6h10\" stroke-width=\"1\" opacity=\".55\"/><rect x=\"1.5\" y=\"8.2\" width=\"13\" height=\"3.6\" rx=\"1\" stroke=\"none\" fill=\"currentColor\"/><path d=\"M3 14h10\" stroke-width=\"1\" opacity=\".55\"/>",
     "grille": 16
    },
    {
     "id": "couche-components",
     "libelle": "components",
     "sens": "Tokens d’un composant. Dernière collection.",
     "emploi": "La collection des tokens d’un composant, dernière de la library. Pour une valeur partagée, prendre `couche-layout`.",
     "trace": "<path d=\"M3 2h10\" stroke-width=\"1\" opacity=\".55\"/><path d=\"M3 6h10\" stroke-width=\"1\" opacity=\".55\"/><path d=\"M3 10h10\" stroke-width=\"1\" opacity=\".55\"/><rect x=\"1.5\" y=\"12.2\" width=\"13\" height=\"3.6\" rx=\"1\" stroke=\"none\" fill=\"currentColor\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "etat-token",
   "libelle": "État d’un token",
   "teinte": "tokens",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). `a-creer` reçoit la classe `signe-absent`.",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « tokens ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "variable",
     "libelle": "variable liée",
     "sens": "Une variable est liée. Signe de Figma.",
     "emploi": "Une variable liée à un layer, sans dire d’où elle vient. Pour sa provenance, prendre `library` ou `local`.",
     "trace": "<path d=\"M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z\"/>",
     "grille": 16
    },
    {
     "id": "existe",
     "libelle": "existe",
     "sens": "La variable proposée existe déjà.",
     "emploi": "La variable que le plugin propose existe déjà. Pour une variable à ajouter, prendre `a-creer`.",
     "trace": "<path d=\"M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z\"/><path d=\"m5.6 8.1 1.6 1.6 3.2-3.4\"/>",
     "grille": 16
    },
    {
     "id": "a-creer",
     "libelle": "à créer",
     "sens": "La préparation créera la variable.",
     "emploi": "La préparation créera la variable. Pour une variable déjà présente, prendre `existe`.",
     "trace": "<path d=\"M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z\" stroke-dasharray=\"2.2 1.6\"/><path d=\"M8 5.6v4.8M5.6 8h4.8\"/>",
     "grille": 16
    },
    {
     "id": "en-dur",
     "libelle": "valeur en dur",
     "sens": "Aucune variable. La valeur est écrite dans le layer.",
     "emploi": "Une valeur écrite dans le layer, sans variable. Pour une chaîne dont un maillon manque, prendre `rompue`.",
     "trace": "<path d=\"M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z\" stroke-dasharray=\"2.2 1.6\"/><path d=\"m4.5 11.5 7-7\"/>",
     "grille": 16
    },
    {
     "id": "alias",
     "libelle": "alias",
     "sens": "La variable renvoie à une autre.",
     "emploi": "Une variable qui renvoie à une autre. Pour une chaîne dont un maillon manque, prendre `rompue`.",
     "trace": "<circle cx=\"3.5\" cy=\"8\" r=\"1.7\" fill=\"currentColor\"/><circle cx=\"12.5\" cy=\"8\" r=\"1.7\" fill=\"currentColor\"/><path d=\"M5.6 8h4.8\"/>",
     "grille": 16
    },
    {
     "id": "library",
     "libelle": "library",
     "sens": "Vient d’une library publiée.",
     "emploi": "Une variable d’une library publiée. Pour une variable de ce fichier, prendre `local`.",
     "trace": "<path d=\"M3 3.5A1.5 1.5 0 0 1 4.5 2h8.5v10H4.5A1.5 1.5 0 0 0 3 13.5zM3 13.5A1.5 1.5 0 0 0 4.5 15H13\"/>",
     "grille": 16
    },
    {
     "id": "local",
     "libelle": "locale",
     "sens": "Vient de ce fichier.",
     "emploi": "Une variable de ce fichier. Pour une variable d’une library publiée, prendre `library`.",
     "trace": "<path d=\"M4 1.8h5.5L12.5 4.8V14.2H4z\"/><path d=\"M9.5 1.8v3h3\"/>",
     "grille": 16
    },
    {
     "id": "rompue",
     "libelle": "chaîne rompue",
     "sens": "Une variable de la chaîne est introuvable.",
     "emploi": "Une chaîne d’alias dont une variable est introuvable. Pour une valeur sans variable, prendre `en-dur`.",
     "trace": "<path d=\"M6.5 9.5 5 11a2.1 2.1 0 0 1-3-3l1.5-1.5M9.5 6.5 11 5a2.1 2.1 0 0 1 3 3l-1.5 1.5M5.5 2.5l.5 2M2.5 5.5l2 .5M10.5 13.5 10 11.5M13.5 10.5l-2-.5\"/>",
     "grille": 16
    },
    {
     "id": "ecart",
     "libelle": "écart avec Figma",
     "sens": "Figma rend une autre valeur que la chaîne.",
     "emploi": "Figma rend une autre valeur que celle de la chaîne. Pour un changement de valeur proposé, prendre `avant-apres`. En texte, le caractère « ≠ » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M3 6.3h10M3 9.7h10M10.5 3l-5 10\"/>",
     "grille": 16
    },
    {
     "id": "mode",
     "libelle": "mode",
     "sens": "Mode d’une collection : Light, Dark.",
     "emploi": "Un mode d’une collection, Light ou Dark. Pour une palette entière, prendre `palette`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"5.6\"/><path d=\"M8 2.4a5.6 5.6 0 0 0 0 11.2z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "scope",
     "libelle": "scope",
     "sens": "Scope de la variable, comme Figma le nomme.",
     "emploi": "Le scope d’une variable, au sens de Figma. Pour la collection qui la range, prendre `rangement`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"4.3\"/><path d=\"M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "rubrique-tokens",
   "libelle": "Rubrique du mode Tokens",
   "teinte": "tokens",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). Pour `a-creer`, `cran`, `rompue`, `mode` et `scope`, reprises par cette famille, passer `famille: \"rubrique-tokens\"` pour en prendre la teinte.",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « tokens ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "nom",
     "libelle": "nom",
     "sens": "Le nom d’une variable, en segments séparés par des barres obliques.",
     "emploi": "Le nom d’une variable, dans la rubrique « Noms » du mode Tokens. Pour le dossier qui la range, prendre `rangement`.",
     "trace": "<text x=\"8\" y=\"11\" font-size=\"7.5\" text-anchor=\"middle\" font-weight=\"650\">a/b</text>",
     "grille": 16
    },
    {
     "id": "valeurs",
     "libelle": "valeurs",
     "sens": "Une valeur vide, ou deux variables de même valeur.",
     "emploi": "Une valeur vide, ou deux variables de même valeur. Pour une valeur écrite dans le layer, prendre `en-dur`.",
     "trace": "<path d=\"M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z\"/><path d=\"M5.6 6.9h4.8M5.6 9.1h4.8\"/>",
     "grille": 16
    },
    {
     "id": "couches",
     "libelle": "couches",
     "sens": "L’ordre des couches. Chaque couche lit celle du dessus.",
     "emploi": "L’ordre des couches, où chacune lit celle du dessus. Pour une couche seule, prendre son signe de la famille « Couche UCM ».",
     "trace": "<path d=\"M1.8 2.5h7.5M1.8 6.2h7.5M1.8 9.8h7.5M1.8 13.5h7.5\"/><path d=\"M12.8 13V3.5M11.2 5.1l1.6-1.6 1.6 1.6\"/>",
     "grille": 16
    },
    {
     "id": "types",
     "libelle": "types",
     "sens": "Le type Figma d’une variable (Color, Number, String, Boolean).",
     "emploi": "Le type Figma d’une variable, en rubrique. Pour un type précis, prendre son signe de « Type de variable Figma ».",
     "trace": "<rect x=\"2\" y=\"2.2\" width=\"5\" height=\"5\" rx=\"1\"/><circle cx=\"11.5\" cy=\"4.7\" r=\"2.5\"/><path d=\"M8 9.2l3.2 5H4.8z\"/>",
     "grille": 16
    },
    {
     "id": "rangement",
     "libelle": "rangement",
     "sens": "Le dossier ou la collection où la variable est rangée.",
     "emploi": "Le dossier ou la collection où la variable est rangée. Pour son nom, prendre `nom`.",
     "trace": "<path d=\"M1.8 4.2a1 1 0 0 1 1-1h3.4l1.5 1.8h5.5a1 1 0 0 1 1 1v6.8a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z\"/>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "a-creer",
     "libelle": "Variables manquantes",
     "emploi": "La rubrique des variables que la préparation créera. Pour une variable à ajouter dans une liste, prendre `ajouter`.",
     "trace": "<path d=\"M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z\" stroke-dasharray=\"2.2 1.6\"/><path d=\"M8 5.6v4.8M5.6 8h4.8\"/>",
     "grille": 16
    },
    {
     "id": "cran",
     "libelle": "Crans",
     "emploi": "La rubrique des crans de palette. Pour un cran seul, prendre `cran` dans « Palettes ».",
     "trace": "<path d=\"M2 13.5h3v-3h3v-3h3v-3h3\"/>",
     "grille": 16
    },
    {
     "id": "rompue",
     "libelle": "Alias",
     "emploi": "La rubrique des alias, où se lisent les chaînes rompues. Pour une chaîne seule, prendre `rompue`.",
     "trace": "<path d=\"M6.5 9.5 5 11a2.1 2.1 0 0 1-3-3l1.5-1.5M9.5 6.5 11 5a2.1 2.1 0 0 1 3 3l-1.5 1.5M5.5 2.5l.5 2M2.5 5.5l2 .5M10.5 13.5 10 11.5M13.5 10.5l-2-.5\"/>",
     "grille": 16
    },
    {
     "id": "mode",
     "libelle": "Modes",
     "emploi": "La rubrique des modes d’une collection. Pour un mode seul, prendre `mode` dans « État d’un token ».",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"5.6\"/><path d=\"M8 2.4a5.6 5.6 0 0 0 0 11.2z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "scope",
     "libelle": "Scopes",
     "emploi": "La rubrique des scopes d’une variable. Pour un scope seul, prendre `scope` dans « État d’un token ».",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"4.3\"/><path d=\"M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3\"/>",
     "grille": 16
    }
   ]
  },
  {
   "id": "objet-figma",
   "libelle": "Objet de Figma",
   "teinte": "variants",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « variants ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "component-set",
     "libelle": "component set",
     "sens": "Le jeu de variants : le cadre en pointillés de Figma autour du component.",
     "emploi": "Le jeu de variants d’un composant. Pour un composant seul, prendre `component`.",
     "trace": "<rect x=\"1.2\" y=\"1.2\" width=\"13.6\" height=\"13.6\" rx=\"2\" stroke-dasharray=\"2 1.6\"/><path d=\"M8 3.6 9.4 5 8 6.4 6.6 5zM8 9.6 9.4 11 8 12.4 6.6 11zM5 6.6 6.4 8 5 9.4 3.6 8zM11 6.6 12.4 8 11 9.4 9.6 8z\"/>",
     "grille": 16
    },
    {
     "id": "component",
     "libelle": "component",
     "sens": "Un composant principal. Signe de Figma.",
     "emploi": "Un composant principal. Pour une copie posée dans un frame, prendre `instance`.",
     "trace": "<path d=\"M8 1.8 10.1 3.9 8 6 5.9 3.9zM8 10l2.1 2.1L8 14.2l-2.1-2.1zM3.9 5.9 6 8l-2.1 2.1L1.8 8zM12.1 5.9 14.2 8l-2.1 2.1L10 8z\"/>",
     "grille": 16
    },
    {
     "id": "variant",
     "libelle": "variant",
     "sens": "Un variant du jeu.",
     "emploi": "Un variant du jeu, en plein. Pour une copie du composant, prendre `instance`, au contour seul.",
     "trace": "<path d=\"M8 2.3 13.7 8 8 13.7 2.3 8z\" fill=\"currentColor\"/>",
     "grille": 16
    },
    {
     "id": "instance",
     "libelle": "instance",
     "sens": "Une instance, dont un composant imbriqué. Signe de Figma.",
     "emploi": "Une instance d’un composant, y compris imbriquée. Pour le composant principal, prendre `component`.",
     "trace": "<path d=\"M8 2.3 13.7 8 8 13.7 2.3 8z\"/>",
     "grille": 16
    },
    {
     "id": "frame",
     "libelle": "frame",
     "sens": "Un frame.",
     "emploi": "Un frame. Pour un group, prendre `group`.",
     "trace": "<path d=\"M5 2v12M11 2v12M2 5h12M2 11h12\"/>",
     "grille": 16
    },
    {
     "id": "group",
     "libelle": "group",
     "sens": "Un group.",
     "emploi": "Un group de layers. Pour un frame, prendre `frame`.",
     "trace": "<rect x=\"2.5\" y=\"2.5\" width=\"11\" height=\"11\" rx=\"1\" stroke-dasharray=\"2 1.6\"/>",
     "grille": 16
    },
    {
     "id": "text",
     "libelle": "text",
     "sens": "Un layer texte.",
     "emploi": "Un layer texte, et une property texte de composant que la famille « Property » reprend. Pour le style d’un texte, prendre `text-style`.",
     "trace": "<path d=\"M3.5 4.5V3h9v1.5M8 3v10M6.3 13h3.4\"/>",
     "grille": 16
    },
    {
     "id": "vector",
     "libelle": "vector",
     "sens": "Un tracé vectoriel.",
     "emploi": "Un tracé vectoriel. Pour la couleur d’une icône, prendre `usage-icone`.",
     "trace": "<path d=\"M8 2 12.5 9 8 14 3.5 9z\"/><circle cx=\"8\" cy=\"9\" r=\"1.2\"/><path d=\"M8 2v5.8\"/>",
     "grille": 16
    },
    {
     "id": "slot",
     "libelle": "slot",
     "sens": "Un emplacement à remplir.",
     "emploi": "Un emplacement à remplir, et une property slot que la famille « Property » reprend. Pour échanger une instance, prendre `prop-swap`.",
     "trace": "<rect x=\"2\" y=\"3.5\" width=\"12\" height=\"9\" rx=\"1.5\" stroke-dasharray=\"2 1.6\"/><path d=\"M8 6v4M6 8h4\"/>",
     "grille": 16
    },
    {
     "id": "selection",
     "libelle": "sélection de Figma",
     "sens": "Les layers que le plugin a sélectionnés.",
     "emploi": "Les layers que le plugin a sélectionnés. Pour un objet précis, prendre son signe de « Objet de Figma ».",
     "trace": "<rect x=\"3.5\" y=\"3.5\" width=\"9\" height=\"9\"/><path d=\"M2 2h3v3H2zM11 2h3v3h-3zM2 11h3v3H2zM11 11h3v3h-3z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "property",
   "libelle": "Property de composant",
   "teinte": "variants",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). Pour `type-boolean`, `text` et `slot`, reprises par cette famille, passer `famille: \"property\"`.",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « variants ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "prop-variant",
     "libelle": "variant property",
     "sens": "Property de variant : Severity, Variant.",
     "emploi": "Une property de variant, comme Severity. Pour une property qui échange une instance, prendre `prop-swap`.",
     "trace": "<path d=\"M8 2.3 13.7 8 8 13.7 2.3 8z\"/><circle cx=\"8\" cy=\"8\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "prop-swap",
     "libelle": "instance swap",
     "sens": "Property d’échange d’instance.",
     "emploi": "Une property d’échange d’instance. Pour une property de variant, prendre `prop-variant`.",
     "trace": "<path d=\"M8 4.6 11.4 8 8 11.4 4.6 8z\"/><path d=\"M2.3 6.2A6 6 0 0 1 11 2.6M13.7 9.8A6 6 0 0 1 5 13.4\"/>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "type-boolean",
     "libelle": "boolean property",
     "emploi": "Une property booléenne de composant. Pour une property de variant, prendre `prop-variant`.",
     "trace": "<rect x=\"1.5\" y=\"4.5\" width=\"13\" height=\"7\" rx=\"3.5\"/><circle cx=\"11\" cy=\"8\" r=\"1.8\" fill=\"currentColor\"/>",
     "grille": 16
    },
    {
     "id": "text",
     "libelle": "text property",
     "emploi": "Une property texte de composant. Pour une property booléenne, prendre `type-boolean`.",
     "trace": "<path d=\"M3.5 4.5V3h9v1.5M8 3v10M6.3 13h3.4\"/>",
     "grille": 16
    },
    {
     "id": "slot",
     "libelle": "slot property",
     "emploi": "Une property slot de composant. Pour une property d’échange d’instance, prendre `prop-swap`.",
     "trace": "<rect x=\"2\" y=\"3.5\" width=\"12\" height=\"9\" rx=\"1.5\" stroke-dasharray=\"2 1.6\"/><path d=\"M8 6v4M6 8h4\"/>",
     "grille": 16
    }
   ]
  },
  {
   "id": "regles",
   "libelle": "Règles d’utilisation (.componentRules)",
   "teinte": "regles",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). Pour `prop-variant` et `type-boolean`, reprises par cette famille, passer `famille: \"regles\"`.",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « regles ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "regles",
     "libelle": "instance de règles",
     "sens": "L’instance .componentRules posée à côté du composant.",
     "emploi": "L’instance .componentRules posée à côté du composant. Pour une ligne de règle, prendre le signe de son tag.",
     "trace": "<rect x=\"3\" y=\"2\" width=\"10\" height=\"12\" rx=\"1.5\"/><path d=\"M5.5 5.5h5M5.5 8h5M5.5 10.5h3\"/>",
     "grille": 16
    },
    {
     "id": "tag-usage",
     "libelle": "@usage",
     "sens": "Quand employer le composant. Section GÉNÉRAL.",
     "emploi": "Le tag @usage, qui dit quand employer le composant. Pour un emploi précis, prendre `tag-do` ou `tag-dont`.",
     "trace": "<path d=\"M2.5 4h11M2.5 8h11M2.5 12h7\"/>",
     "grille": 16
    },
    {
     "id": "tag-do",
     "libelle": "@do",
     "sens": "Un emploi recommandé. Gris : le vert dit un changement.",
     "emploi": "Un emploi recommandé, en gris. Pour un emploi à éviter, prendre `tag-dont`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"5.8\"/><path d=\"m5.3 8.2 1.8 1.8 3.6-3.8\"/>",
     "grille": 16
    },
    {
     "id": "tag-dont",
     "libelle": "@dont",
     "sens": "Un emploi à éviter. Gris : le rouge dit un retrait.",
     "emploi": "Un emploi à éviter, en gris. Pour un emploi recommandé, prendre `tag-do`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"5.8\"/><path d=\"m5.9 5.9 4.2 4.2M10.1 5.9l-4.2 4.2\"/>",
     "grille": 16
    },
    {
     "id": "tag-pairs",
     "libelle": "@pairs",
     "sens": "Un composant qui va avec celui-ci.",
     "emploi": "Un composant qui va avec celui-ci. Pour les icônes admises, prendre `tag-icons`.",
     "trace": "<circle cx=\"6\" cy=\"8\" r=\"4\"/><circle cx=\"10\" cy=\"8\" r=\"4\"/>",
     "grille": 16
    },
    {
     "id": "tag-icons",
     "libelle": "@icons",
     "sens": "Icônes admises. L’étoile de l’icône. Section ICONES.",
     "emploi": "Les icônes qu’un composant admet. Pour la couleur d’une icône, prendre `usage-icone`.",
     "trace": "<path d=\"M8 2.4 9.6 6.4 13.6 8 9.6 9.6 8 13.6 6.4 9.6 2.4 8 6.4 6.4z\"/>",
     "grille": 16
    },
    {
     "id": "tag-default",
     "libelle": "@default",
     "sens": "Valeur par défaut d’une property.",
     "emploi": "La valeur par défaut d’une property. Pour une valeur imposée, prendre `strict`.",
     "trace": "<path d=\"M8 14.5V9.5M4.8 9.5h6.4L10 7.3V3H6v4.3z\"/>",
     "grille": 16
    },
    {
     "id": "modifiable",
     "libelle": "modifiable",
     "sens": "Le développeur peut changer la valeur.",
     "emploi": "Une valeur que le développeur peut changer. Pour une valeur imposée, prendre `strict`.",
     "trace": "<path d=\"M10.5 2.5l3 3-8 8h-3v-3zM9 4l3 3\"/>",
     "grille": 16
    },
    {
     "id": "strict",
     "libelle": "strict",
     "sens": "La valeur est imposée.",
     "emploi": "Une valeur imposée. Pour une valeur que le développeur peut changer, prendre `modifiable`.",
     "trace": "<rect x=\"3.5\" y=\"7\" width=\"9\" height=\"7\" rx=\"1.5\"/><path d=\"M5.5 7V5a2.5 2.5 0 0 1 5 0v2\"/>",
     "grille": 16
    },
    {
     "id": "a-completer",
     "libelle": "[À compléter]",
     "sens": "Texte d’aide pas encore rédigé. Il ne part pas dans le contrat.",
     "emploi": "Un texte d’aide pas encore rédigé. Un texte rédigé ne porte aucun signe.",
     "trace": "<text x=\"8\" y=\"10.5\" font-size=\"11\" text-anchor=\"middle\" font-weight=\"650\">…</text>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "prop-variant",
     "libelle": "@prop",
     "emploi": "Le tag @prop, qui décrit une property de variant. Pour une property booléenne, prendre `type-boolean`.",
     "trace": "<path d=\"M8 2.3 13.7 8 8 13.7 2.3 8z\"/><circle cx=\"8\" cy=\"8\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "type-boolean",
     "libelle": "@boolean",
     "emploi": "Le tag @boolean, qui décrit une property booléenne. Pour une property de variant, prendre `prop-variant`.",
     "trace": "<rect x=\"1.5\" y=\"4.5\" width=\"13\" height=\"7\" rx=\"3.5\"/><circle cx=\"11\" cy=\"8\" r=\"1.8\" fill=\"currentColor\"/>",
     "grille": 16
    }
   ]
  },
  {
   "id": "type-de-terme",
   "libelle": "Type de terme de Nomenclature",
   "teinte": "regles",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). Pour `palette`, `component`, `question` et `applique`, reprises par cette famille, passer `famille: \"type-de-terme\"`.",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « regles ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "remplace",
     "libelle": "remplace",
     "sens": "Le terme remplace un autre terme.",
     "emploi": "Un terme de Nomenclature qui en remplace un autre. Pour un terme qu’aucune règle ne décide, prendre `sans-regle`.",
     "trace": "<path d=\"M2.5 4.5h7M2.5 11.5h7M9.5 4.5 13 8l-3.5 3.5M13 8H6\"/>",
     "grille": 16
    },
    {
     "id": "sans-regle",
     "libelle": "sans règle",
     "sens": "Aucune règle ne décide ce terme.",
     "emploi": "Un terme qu’aucune règle ne décide. Pour un terme qui en remplace un autre, prendre `remplace`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"5.5\" stroke-dasharray=\"2.2 2\"/>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "palette",
     "libelle": "palette",
     "emploi": "Un terme de Nomenclature qui désigne une palette. Pour un terme qui désigne un composant, prendre `component`.",
     "trace": "<rect x=\"1.5\" y=\"4\" width=\"4.3\" height=\"8\" rx=\"1\" fill=\"currentColor\" opacity=\".35\" stroke=\"none\"/><rect x=\"5.85\" y=\"4\" width=\"4.3\" height=\"8\" fill=\"currentColor\" opacity=\".65\" stroke=\"none\"/><rect x=\"10.2\" y=\"4\" width=\"4.3\" height=\"8\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "component",
     "libelle": "composant",
     "emploi": "Un terme de Nomenclature qui désigne un composant. Pour un terme qui désigne une palette, prendre `palette`.",
     "trace": "<path d=\"M8 1.8 10.1 3.9 8 6 5.9 3.9zM8 10l2.1 2.1L8 14.2l-2.1-2.1zM3.9 5.9 6 8l-2.1 2.1L1.8 8zM12.1 5.9 14.2 8l-2.1 2.1L10 8z\"/>",
     "grille": 16
    },
    {
     "id": "question",
     "libelle": "à trancher",
     "emploi": "Un terme que le designer doit trancher, en ambre : la teinte vient du lecteur, pas du tracé. Pour un terme conforme, prendre `applique`.",
     "trace": "<text x=\"8\" y=\"12.4\" font-size=\"12\" text-anchor=\"middle\" font-weight=\"700\">?</text>",
     "grille": 16
    },
    {
     "id": "applique",
     "libelle": "conforme",
     "emploi": "Un terme qui suit déjà sa règle. Pour un terme à remplacer, prendre `remplace`.",
     "trace": "<path d=\"m3 8.5 3.2 3.2L13 4.5\"/>",
     "grille": 16
    }
   ]
  },
  {
   "id": "proposition",
   "libelle": "Sorte de proposition",
   "teinte": null,
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "La famille n’a pas de teinte : `informe` ne change rien et la tuile reste grise.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "correction",
     "libelle": "correction",
     "sens": "Le plugin l’applique.",
     "emploi": "Une proposition que le plugin applique lui-même. Pour un choix du designer, prendre `question`.",
     "trace": "<path d=\"M10.4 2.1a3.4 3.4 0 0 0-3.9 4.6L2.3 10.9a1.4 1.4 0 0 0 2 2l4.2-4.2a3.4 3.4 0 0 0 4.6-3.9l-2.1 2.1-1.9-.5-.5-1.9z\"/>",
     "grille": 16
    },
    {
     "id": "question",
     "libelle": "question",
     "sens": "Le designer choisit. Le type de terme « À trancher » la reprend en ambre : la teinte vient du lecteur, pas du tracé.",
     "emploi": "Une proposition où le designer choisit. Pour une action dans Figma, prendre `a-faire`.",
     "trace": "<text x=\"8\" y=\"12.4\" font-size=\"12\" text-anchor=\"middle\" font-weight=\"700\">?</text>",
     "grille": 16
    },
    {
     "id": "a-faire",
     "libelle": "à faire dans Figma",
     "sens": "Le designer agit dans Figma.",
     "emploi": "Une proposition où le designer agit dans Figma, hors du plugin. Pour une correction que le plugin applique, prendre `correction`.",
     "trace": "<path d=\"M3.5 2.5 12.8 7.6 8.6 8.8 6.6 13z\"/>",
     "grille": 16
    },
    {
     "id": "modele",
     "libelle": "copie d’un modèle",
     "sens": "Les liaisons d’un variant juste copiées aux autres.",
     "emploi": "Les liaisons d’un variant copiées aux autres. Pour une correction ordinaire, prendre `correction`.",
     "trace": "<rect x=\"5\" y=\"5\" width=\"9\" height=\"9\" rx=\"1.5\"/><path d=\"M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5\"/>",
     "grille": 16
    },
    {
     "id": "ignore",
     "libelle": "ignoré",
     "sens": "Le constat ne sera plus proposé.",
     "emploi": "Un constat que le plugin ne proposera plus. Pour une question remise à plus tard, prendre `plus-tard`.",
     "trace": "<path d=\"M1.8 8s2.3-4.2 6.2-4.2S14.2 8 14.2 8s-2.3 4.2-6.2 4.2S1.8 8 1.8 8z\"/><circle cx=\"8\" cy=\"8\" r=\"1.8\"/><path d=\"M2.8 13.2 13.2 2.8\"/>",
     "grille": 16
    },
    {
     "id": "plus-tard",
     "libelle": "plus tard",
     "sens": "La question attend.",
     "emploi": "Une question qui attend. Pour un constat écarté, prendre `ignore`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"6\"/><path d=\"M8 4.5V8l2.5 1.5\"/>",
     "grille": 16
    },
    {
     "id": "applique",
     "libelle": "appliqué",
     "sens": "L’écriture a réussi.",
     "emploi": "Une écriture réussie. Pour une écriture annulée, prendre `defait`.",
     "trace": "<path d=\"m3 8.5 3.2 3.2L13 4.5\"/>",
     "grille": 16
    },
    {
     "id": "defait",
     "libelle": "défait",
     "sens": "Le designer a fait Ctrl+Z.",
     "emploi": "Une écriture que le designer a annulée par Ctrl+Z. Pour une écriture réussie, prendre `applique`.",
     "trace": "<path d=\"M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8H7\"/>",
     "grille": 16
    },
    {
     "id": "perime",
     "libelle": "analyse périmée",
     "sens": "Le composant a changé depuis l’analyse.",
     "emploi": "Le composant a changé depuis l’analyse. Pour relire l’état de Figma, prendre `synchroniser`.",
     "trace": "<path d=\"M13 8a5 5 0 1 1-1.5-3.6M13 2.3v3h-3\"/>",
     "grille": 16
    },
    {
     "id": "information",
     "libelle": "information",
     "sens": "Ce que l’analyse n’a pas mesuré ; aucun geste attendu.",
     "emploi": "Un fait que l’analyse n’a pas mesuré, sans geste attendu. Pour un constat à corriger, prendre `correction`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"5.8\"/><path d=\"M8 7.2v4.2\"/><circle cx=\"8\" cy=\"4.8\" r=\".6\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "a-creer",
     "libelle": "préparation",
     "emploi": "La proposition de préparation, où le plugin crée la variable. Pour une variable à ajouter dans une liste, prendre `ajouter`.",
     "trace": "<path d=\"M8 1.8 13.4 4.9v6.2L8 14.2 2.6 11.1V4.9z\" stroke-dasharray=\"2.2 1.6\"/><path d=\"M8 5.6v4.8M5.6 8h4.8\"/>",
     "grille": 16
    }
   ]
  },
  {
   "id": "accessibilite",
   "libelle": "Accessibilité",
   "teinte": "a11y",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « a11y ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "contraste",
     "libelle": "paire de contraste",
     "sens": "Un texte ou une icône sur son fond.",
     "emploi": "Un texte ou une icône sur son fond. Pour le contour du focus, prendre `focus`.",
     "trace": "<rect x=\"2\" y=\"2\" width=\"8\" height=\"8\" rx=\"1\" fill=\"currentColor\"/><rect x=\"6\" y=\"6\" width=\"8\" height=\"8\" rx=\"1\"/>",
     "grille": 16
    },
    {
     "id": "focus",
     "libelle": "anneau de focus",
     "sens": "Le contour du focus clavier.",
     "emploi": "Le contour du focus clavier. Pour la surface tactile, prendre `cible`.",
     "trace": "<rect x=\"4.5\" y=\"4.5\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"1.5\" y=\"1.5\" width=\"13\" height=\"13\" rx=\"3\" stroke-dasharray=\"2 1.6\"/>",
     "grille": 16
    },
    {
     "id": "cible",
     "libelle": "cible tactile",
     "sens": "La surface qu’un doigt touche.",
     "emploi": "La surface qu’un doigt touche. Pour le contour du focus, prendre `focus`.",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"2\" fill=\"currentColor\"/><circle cx=\"8\" cy=\"8\" r=\"5.7\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "palettes",
   "libelle": "Palettes",
   "teinte": "couleurs",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). Pour `mode`, repris par cette famille, passer `famille: \"palettes\"`.",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « couleurs ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "palette",
     "libelle": "palette",
     "sens": "Une palette de primitives.",
     "emploi": "Une palette de primitives. Pour un pas de cette palette, prendre `cran`.",
     "trace": "<rect x=\"1.5\" y=\"4\" width=\"4.3\" height=\"8\" rx=\"1\" fill=\"currentColor\" opacity=\".35\" stroke=\"none\"/><rect x=\"5.85\" y=\"4\" width=\"4.3\" height=\"8\" fill=\"currentColor\" opacity=\".65\" stroke=\"none\"/><rect x=\"10.2\" y=\"4\" width=\"4.3\" height=\"8\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    },
    {
     "id": "cran",
     "libelle": "cran",
     "sens": "Un pas de la palette : 50 à 950.",
     "emploi": "Un pas de palette, de 50 à 950. Pour la palette entière, prendre `palette`.",
     "trace": "<path d=\"M2 13.5h3v-3h3v-3h3v-3h3\"/>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "mode",
     "libelle": "Light, Dark",
     "emploi": "Les modes Light et Dark d’une palette. Pour les modes d’une collection de variables, prendre `mode` dans « État d’un token ».",
     "trace": "<circle cx=\"8\" cy=\"8\" r=\"5.6\"/><path d=\"M8 2.4a5.6 5.6 0 0 0 0 11.2z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 16
    }
   ]
  },
  {
   "id": "publication",
   "libelle": "Publication",
   "teinte": null,
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "La famille n’a pas de teinte : `informe` ne change rien et la tuile reste grise.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "contrat",
     "libelle": "contrat de composant",
     "sens": "Le .contract.json publié.",
     "emploi": "Le .contract.json publié. Pour les tokens, prendre `dtcg`.",
     "trace": "<path d=\"M4 1.8h5.5L12.5 4.8V14.2H4z\"/><path d=\"M9.5 1.8v3h3\"/><text x=\"8.2\" y=\"12\" font-size=\"5.5\" text-anchor=\"middle\" font-weight=\"650\">{}</text>",
     "grille": 16
    },
    {
     "id": "dtcg",
     "libelle": "tokens DTCG",
     "sens": "Les tokens exportés.",
     "emploi": "Les tokens exportés. Pour la feuille CSS, prendre `css`.",
     "trace": "<path d=\"M8 1.5 13.5 4.4 8 7.3 2.5 4.4z\"/><path d=\"m2.5 8 5.5 2.9L13.5 8M2.5 11.6l5.5 2.9 5.5-2.9\"/>",
     "grille": 16
    },
    {
     "id": "css",
     "libelle": "feuille CSS",
     "sens": "La feuille des custom properties.",
     "emploi": "La feuille des custom properties. Pour les tokens DTCG, prendre `dtcg`.",
     "trace": "<path d=\"M4 1.8h5.5L12.5 4.8V14.2H4z\"/><path d=\"M9.5 1.8v3h3\"/><text x=\"8.2\" y=\"12.2\" font-size=\"6\" text-anchor=\"middle\" font-weight=\"650\">#</text>",
     "grille": 16
    },
    {
     "id": "fusion",
     "libelle": "demande de fusion",
     "sens": "La pull request ou la merge request ouverte.",
     "emploi": "La demande de fusion ouverte, pull request ou merge request. Pour le numéro du kit, prendre `version`.",
     "trace": "<circle cx=\"4\" cy=\"3.5\" r=\"1.6\"/><circle cx=\"4\" cy=\"12.5\" r=\"1.6\"/><circle cx=\"12\" cy=\"12.5\" r=\"1.6\"/><path d=\"M4 5.1v5.8M4 6.5c0 3.5 8 2 8 4.4\"/>",
     "grille": 16
    },
    {
     "id": "version",
     "libelle": "version du kit",
     "sens": "Le numéro de @ucm-kit/core.",
     "emploi": "Le numéro de @ucm-kit/core. Pour une demande de fusion, prendre `fusion`.",
     "trace": "<path d=\"M2 2h6l6 6-6 6-6-6z\"/><circle cx=\"5.5\" cy=\"5.5\" r=\"1\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "verdict-palettes",
   "libelle": "Verdicts et repères de Palettes",
   "teinte": "couleurs",
   "pose": {
    "fonction": "`creerSigne(id, options)` du socle (`packages/plugin-socle/src/ui/Signe.ts`). Les verdicts « tenu », « à corriger » et « bloquant » ne sont pas dans cette famille : ils prennent les icônes d’alerte du socle (`creerIcone`).",
    "tailles": "14 px dans un texte ou un bouton, 16 px dans une ligne (défaut), 24 px dans une bande de section.",
    "teinte": "Avec `informe: true`, la tuile prend la couleur « couleurs ». Sans lui, elle reste grise : réserver la couleur à un signe qui porte une information.",
    "nom": "Sans option `titre`, la tuile est décorative et le mot écrit à côté nomme le signe. Quand rien n’est écrit à côté, passer `titre` avec le libellé du signe : la tuile prend alors `role=\"img\"` et `aria-label`."
   },
   "signes": [
    {
     "id": "butee",
     "libelle": "butée",
     "sens": "Une valeur qui s’arrête sur la borne que le calcul de la palette impose.",
     "emploi": "Une valeur arrêtée sur sa borne, dans la ligne fixe sous une réglette. Pour une garantie manquée, prendre l’icône d’alerte « bloquant » du socle. En texte, le caractère « ⊣ » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M2.5 8h9M12.5 3.5v9\"/>",
     "grille": 16
    },
    {
     "id": "reference",
     "libelle": "référence",
     "sens": "La couleur de référence de la palette, à son cran.",
     "emploi": "La référence d’une palette, à son cran. Pour la palette entière, prendre `palette`. En texte, le caractère « ◆ » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M8 2.2 13.8 8 8 13.8 2.2 8z\" fill=\"currentColor\"/>",
     "grille": 16
    },
    {
     "id": "confondus",
     "libelle": "presque identiques",
     "sens": "Soft et Vivid se confondent à un cran.",
     "emploi": "Soft et Vivid presque identiques à un cran. Pour deux valeurs différentes, prendre `ecart`. En texte, le caractère « ≈ » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M2 6.2q1.5-2 3 0t3 0 3 0 3 0M2 10.8q1.5-2 3 0t3 0 3 0 3 0\"/>",
     "grille": 16
    }
   ],
   "reprises": []
  },
  {
   "id": "pictogramme-palettes",
   "libelle": "Pictogrammes des cartes de Palettes",
   "teinte": null,
   "pose": {
    "fonction": "`creerSvgDuSigne(id, largeur)` du socle pose le tracé sur sa grille de 44 × 28 ; UCM Palettes le ramène à 38 × 24 px (`creerGlyphe`, `packages/plugin-palettes/src/ui/glyphes.ts`).",
    "tailles": "38 × 24 px dans l’en-tête d’une carte titrée. La grille est de 44 sur 28 (champs `grille` et `hauteur`) : le trait de 1,8 se règle dans la feuille du plugin.",
    "teinte": "Chaque forme porte un rôle, la classe `glyphe-*` de son attribut `class`, et la feuille du plugin la peint de ses rôles de couleur. Sans cette feuille, le tracé reste dans la couleur du texte.",
    "nom": "Le pictogramme est décoratif (`aria-hidden`) : le titre de la carte le nomme."
   },
   "signes": [
    {
     "id": "carte-apercu",
     "libelle": "aperçu",
     "sens": "La carte Aperçu de Création : les nuances sur leur fond, la référence repérée.",
     "emploi": "Le pictogramme de la carte Aperçu de Création. Pour une palette seule, prendre `palette`.",
     "trace": "<rect class=\"glyphe-fond\" x=\"4\" y=\"3\" width=\"36\" height=\"22\" rx=\"2\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"8\" y=\"7\" width=\"4.6\" height=\"8\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"14\" y=\"7\" width=\"4.6\" height=\"8\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"20\" y=\"7\" width=\"4.6\" height=\"8\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"26\" y=\"7\" width=\"4.6\" height=\"8\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"32\" y=\"7\" width=\"4.6\" height=\"8\" rx=\"1\"/><path class=\"glyphe-losange\" stroke=\"none\" d=\"M22.3 17.5 L24.8 20 L22.3 22.5 L19.8 20 Z\"/>",
     "grille": 44
    },
    {
     "id": "carte-reglage-global",
     "libelle": "réglage global",
     "sens": "La carte du Réglage global : une rampe, et la même rampe décalée.",
     "emploi": "Le pictogramme de la carte du Réglage global. Pour le pictogramme du Color shift, prendre `carte-color-shift`.",
     "trace": "<rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"3\" y=\"6\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"9.6\" y=\"8.2\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"16.2\" y=\"10.4\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"22.8\" y=\"12.6\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"29.4\" y=\"14.8\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"36\" y=\"17\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"3\" y=\"13\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"9.6\" y=\"15.2\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"16.2\" y=\"17.4\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"22.8\" y=\"19.6\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"29.4\" y=\"21.8\" width=\"4.6\" height=\"4\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"36\" y=\"24\" width=\"4.6\" height=\"4\" rx=\"1\"/>",
     "grille": 44
    },
    {
     "id": "carte-color-shift",
     "libelle": "Color shift",
     "sens": "La carte du Color shift : deux bouts de rampe qui pivotent autour de la référence.",
     "emploi": "Le pictogramme de la carte du Color shift. Pour le Réglage global, prendre `carte-reglage-global`.",
     "trace": "<path class=\"glyphe-axe\" stroke-linecap=\"butt\" d=\"M4 14L40 14\"/><path class=\"glyphe-trait-marque\" d=\"M4 5L22 14L40 22\"/><circle class=\"glyphe-point\" cx=\"4\" cy=\"5\" r=\"2.6\"/><circle class=\"glyphe-point\" cx=\"40\" cy=\"22\" r=\"2.6\"/><path class=\"glyphe-losange\" stroke=\"none\" d=\"M22 10 L26 14 L22 18 L18 14 Z\"/>",
     "grille": 44
    },
    {
     "id": "carte-garanties",
     "libelle": "garanties",
     "sens": "La carte des garanties : un texte sur son fond, et la coche de la garantie tenue.",
     "emploi": "Le pictogramme de la carte des garanties. Pour un verdict de garantie, prendre l’icône d’alerte du socle.",
     "trace": "<rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"4\" y=\"6\" width=\"20\" height=\"16\" rx=\"2\"/><path class=\"glyphe-fond\" d=\"M9 14L19 14\"/><path class=\"glyphe-trait\" d=\"M28 14L32 19L40 8\"/>",
     "grille": 44
    },
    {
     "id": "carte-interface-de-test",
     "libelle": "Interface de test",
     "sens": "La carte de l’Interface de test : une fenêtre, sa barre, une ligne et un bouton.",
     "emploi": "Le pictogramme de la carte de l’Interface de test. Pour une autre carte, prendre le pictogramme de cette carte.",
     "trace": "<rect class=\"glyphe-fond\" x=\"4\" y=\"4\" width=\"36\" height=\"20\" rx=\"2\"/><path class=\"glyphe-trait\" d=\"M4 9L40 9\"/><path class=\"glyphe-trait\" d=\"M9 14L25 14\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"9\" y=\"17\" width=\"14\" height=\"4\" rx=\"2\"/>",
     "grille": 44
    },
    {
     "id": "carte-fonds",
     "libelle": "fonds",
     "sens": "La carte des fonds : une page, et la pastille de son fond.",
     "emploi": "Le pictogramme de la carte des fonds. Pour la couleur d’une nuance, prendre `palette`.",
     "trace": "<rect class=\"glyphe-fond\" x=\"4\" y=\"4\" width=\"36\" height=\"20\" rx=\"2\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"27\" y=\"13\" width=\"10\" height=\"8\" rx=\"1.5\"/>",
     "grille": 44
    },
    {
     "id": "carte-intensites",
     "libelle": "intensités",
     "sens": "La carte des intensités : Soft en rond cerné, Vivid en rond plein.",
     "emploi": "Le pictogramme de la carte des intensités, Soft et Vivid. Pour les modes Light et Dark, prendre `mode`.",
     "trace": "<circle class=\"glyphe-trait-marque\" cx=\"14\" cy=\"14\" r=\"7\"/><circle class=\"glyphe-aplat-marque\" stroke=\"none\" cx=\"30\" cy=\"14\" r=\"7\"/>",
     "grille": 44
    },
    {
     "id": "carte-courbes",
     "libelle": "courbes",
     "sens": "La carte des courbes : la luminosité qui descend du clair au sombre.",
     "emploi": "Le pictogramme de la carte des courbes. Pour un cran seul, prendre `cran`.",
     "trace": "<path class=\"glyphe-axe\" stroke-linecap=\"butt\" d=\"M4 24L40 24\"/><path class=\"glyphe-trait-marque\" d=\"M4 5 C 16 6, 26 20, 40 21\"/><circle class=\"glyphe-aplat-marque\" stroke=\"none\" cx=\"4\" cy=\"5\" r=\"2\"/><circle class=\"glyphe-aplat-marque\" stroke=\"none\" cx=\"40\" cy=\"21\" r=\"2\"/>",
     "grille": 44
    },
    {
     "id": "carte-minimums",
     "libelle": "minimums",
     "sens": "La carte des minimums de contraste : des barres, et le minimum en ligne tiretée.",
     "emploi": "Le pictogramme de la carte des minimums de contraste. Pour une paire de contraste seule, prendre `contraste`.",
     "trace": "<rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"7\" y=\"10\" width=\"5\" height=\"14\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"15\" y=\"14\" width=\"5\" height=\"10\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"23\" y=\"7\" width=\"5\" height=\"17\" rx=\"1\"/><rect class=\"glyphe-aplat-pale\" stroke=\"none\" x=\"31\" y=\"17\" width=\"5\" height=\"7\" rx=\"1\"/><path class=\"glyphe-trait\" stroke-dasharray=\"3 2\" d=\"M4 13L40 13\"/>",
     "grille": 44
    },
    {
     "id": "carte-proches",
     "libelle": "couleurs proches",
     "sens": "La carte des couleurs proches : deux ronds qui se recouvrent.",
     "emploi": "Le pictogramme de la carte des couleurs proches. Pour deux profils confondus à un cran, prendre `confondus`.",
     "trace": "<circle class=\"glyphe-trait\" cx=\"17\" cy=\"14\" r=\"8\"/><circle class=\"glyphe-trait-marque\" cx=\"27\" cy=\"14\" r=\"8\"/>",
     "grille": 44
    },
    {
     "id": "carte-contenu",
     "libelle": "contenu de la planche",
     "sens": "Un cadre de la planche : des pastilles, puis deux lignes de texte.",
     "emploi": "Le pictogramme d’un cadre de la planche. Pour la planche entière, prendre `palette`.",
     "trace": "<rect class=\"glyphe-fond\" x=\"4\" y=\"3\" width=\"36\" height=\"22\" rx=\"2\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"8\" y=\"7\" width=\"4.6\" height=\"5\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"14\" y=\"7\" width=\"4.6\" height=\"5\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"20\" y=\"7\" width=\"4.6\" height=\"5\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"26\" y=\"7\" width=\"4.6\" height=\"5\" rx=\"1\"/><rect class=\"glyphe-aplat-marque\" stroke=\"none\" x=\"32\" y=\"7\" width=\"4.6\" height=\"5\" rx=\"1\"/><path class=\"glyphe-trait\" d=\"M8 16L36 16\"/><path class=\"glyphe-trait\" d=\"M8 21L28 21\"/>",
     "grille": 44
    }
   ],
   "reprises": []
  },
  {
   "id": "interface",
   "libelle": "Interface des plugins",
   "teinte": null,
   "pose": {
    "fonction": "`creerSvgDuSigne(id, taille)` pour un tracé, `creerChevron(sens)` pour `chevron`, `creerGlyphe(id)` ou `glypheDe(id)` pour les sept signes dont le champ `glyphe` donne le caractère (`fermer`, `avant-apres`, `menu`, `ajouter`, `retirer`, `separateur`, `ecart`) ; tout vient de `packages/plugin-socle/src/ui/Signe.ts` et `Chevron.ts`. Le champ `glyphe` du signe donne le caractère qu’un texte écrit à la place du dessin. `creerSigne` ne pose pas ces signes dans une tuile.",
    "tailles": "Un tracé prend le côté en pixels que l’appelant donne ; `creerChevron` pose 12 px. Un glyphe prend la taille du texte autour.",
    "teinte": "La famille n’a pas de teinte : `informe` ne change rien et la tuile reste grise. Le signe prend la couleur du texte qui l’entoure (`currentColor`).",
    "nom": "Le signe est décoratif (`aria-hidden`) : le bouton qui le porte garde son nom accessible, par exemple « Fermer » ou « Réglages »."
   },
   "signes": [
    {
     "id": "chevron",
     "libelle": "chevron",
     "sens": "Un tracé qui pointe vers le bas ; le lecteur le tourne pour les trois autres sens.",
     "emploi": "Une section qui se plie ou une liste qui s’ouvre ; le lecteur le tourne pour les trois autres sens. Pour séparer deux niveaux d’un chemin, prendre `separateur`.",
     "trace": "<path d=\"M4 6 8 10 12 6\"/>",
     "grille": 16
    },
    {
     "id": "fermer",
     "libelle": "fermer",
     "sens": "Ferme le panneau, le message ou la fenêtre.",
     "emploi": "Fermer un panneau, un message ou une fenêtre. Pour retirer un élément d’une liste, prendre `retirer`. En texte, le caractère « × » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M4.8 4.8l6.4 6.4M11.2 4.8l-6.4 6.4\"/>",
     "grille": 16
    },
    {
     "id": "lien-externe",
     "libelle": "lien externe",
     "sens": "Ouvre une page hors du plugin.",
     "emploi": "Ouvrir une page hors du plugin. Pour une action dans le plugin, prendre l’icône de cette action.",
     "trace": "<path d=\"M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3\"/>",
     "grille": 16
    },
    {
     "id": "reglages",
     "libelle": "réglages",
     "sens": "Ouvre la configuration du plugin.",
     "emploi": "Ouvrir la configuration du plugin. Pour les autres actions d’une ligne, prendre `menu`.",
     "trace": "<path d=\"M495.9 166.6c3.2 8.7.5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6.3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z\" fill=\"currentColor\" stroke=\"none\"/>",
     "grille": 512
    },
    {
     "id": "poignee",
     "libelle": "poignée de taille",
     "sens": "Coin que le designer tire pour changer la taille de la fenêtre.",
     "emploi": "Le coin que le designer tire pour redimensionner la fenêtre. Pour replier une section, prendre `chevron`.",
     "trace": "<path d=\"M15 6 L6 15 M15 11 L11 15\"/>",
     "grille": 16
    },
    {
     "id": "loupe",
     "libelle": "loupe",
     "sens": "Recherche.",
     "emploi": "Lancer une recherche. Pour restreindre une liste par une catégorie, écrire le filtre en toutes lettres.",
     "trace": "<circle cx=\"6.8\" cy=\"6.8\" r=\"4.9\"/><path d=\"m10.5 10.5 4.3 4.3\"/>",
     "grille": 16
    },
    {
     "id": "tout-replier",
     "libelle": "tout replier",
     "sens": "Replie toutes les sections sauf celle qui est ouverte.",
     "emploi": "Replier toutes les sections sauf celle qui est ouverte. Pour une seule section, prendre `chevron`.",
     "trace": "<path d=\"M4 2.5l4 3.5 4-3.5M4 13.5l4-3.5 4 3.5\"/>",
     "grille": 16
    },
    {
     "id": "panneau-lateral",
     "libelle": "panneau latéral",
     "sens": "Montre ou masque le panneau latéral.",
     "emploi": "Montrer ou masquer le panneau latéral. Pour fermer une fenêtre, prendre `fermer`.",
     "trace": "<rect x=\"1.5\" y=\"2.5\" width=\"13\" height=\"11\" rx=\"1.5\"/><path d=\"M10 2.5v11\"/>",
     "grille": 16
    },
    {
     "id": "synchroniser",
     "libelle": "synchroniser",
     "sens": "Relit l’état de Figma.",
     "emploi": "Relire l’état de Figma. Pour dire qu’une analyse est périmée, prendre `perime`.",
     "trace": "<path d=\"M13.5 6.5A5.5 5.5 0 0 0 3.2 5M2.5 2.5v2.7h2.7M2.5 9.5A5.5 5.5 0 0 0 12.8 11M13.5 13.5v-2.7h-2.7\"/>",
     "grille": 16
    },
    {
     "id": "menu",
     "libelle": "menu",
     "sens": "Ouvre les autres actions d’une ligne.",
     "emploi": "Ouvrir les autres actions d’une ligne. Pour une action unique, prendre l’icône de cette action. En texte, le caractère « ⋯ » (champ glyphe) remplace le dessin.",
     "trace": "<circle cx=\"3\" cy=\"8\" r=\".9\" fill=\"currentColor\"/><circle cx=\"8\" cy=\"8\" r=\".9\" fill=\"currentColor\"/><circle cx=\"13\" cy=\"8\" r=\".9\" fill=\"currentColor\"/>",
     "grille": 16
    },
    {
     "id": "ajouter",
     "libelle": "ajouter",
     "sens": "Ajoute un élément.",
     "emploi": "Ajouter un élément. Pour retirer un élément, prendre `retirer`. En texte, le caractère « + » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M8 3v10M3 8h10\"/>",
     "grille": 16
    },
    {
     "id": "retirer",
     "libelle": "retirer",
     "sens": "Retire un élément.",
     "emploi": "Retirer un élément d’une liste. Pour fermer une fenêtre, prendre `fermer`. En texte, le caractère « − » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M3 8h10\"/>",
     "grille": 16
    },
    {
     "id": "avant-apres",
     "libelle": "avant, après",
     "sens": "Va d’une valeur d’avant à la valeur d’après.",
     "emploi": "Aller d’une valeur d’avant à la valeur d’après. Pour un écart de rendu avec Figma, prendre `ecart`. En texte, le caractère « → » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"M3.2 8h8.8M8.8 4.8 12 8l-3.2 3.2\"/>",
     "grille": 16
    },
    {
     "id": "separateur",
     "libelle": "séparateur de chemin",
     "sens": "Sépare deux niveaux d’un chemin.",
     "emploi": "Séparer deux niveaux d’un chemin. Pour une section qui se plie, prendre `chevron`. En texte, le caractère « › » (champ glyphe) remplace le dessin.",
     "trace": "<path d=\"m6 3.5 4.5 4.5L6 12.5\"/>",
     "grille": 16
    },
    {
     "id": "vide",
     "libelle": "vide",
     "sens": "Rien à montrer dans cette vue.",
     "emploi": "Une vue sans rien à montrer. Pour un terme sans règle, prendre `sans-regle`.",
     "trace": "<path d=\"M8 1.5 14.5 8 8 14.5 1.5 8z\" stroke-dasharray=\"1.1 1.1\"/>",
     "grille": 16
    }
   ],
   "reprises": [
    {
     "id": "ecart",
     "libelle": "différent",
     "emploi": "Dire que deux valeurs sont différentes, en caractère (`creerGlyphe`). Pour un constat de rendu avec Figma, prendre `ecart` dans sa famille « État d’un token ».",
     "trace": "<path d=\"M3 6.3h10M3 9.7h10M10.5 3l-5 10\"/>",
     "grille": 16
    }
   ]
  }
 ],
 "alertes": {
  "pose": {
   "fonction": "`creerIcone(type)` pose l’icône dans un élément DOM ; `svgDeLAlerte(type, taille)` rend le même SVG en texte pour un rendu sans document, comme le hub ; `creerGravite(type)` pose l’icône avec le mot du type. Pour une sortie texte, `texteDuType(type, sortie)` rend le repli de `TYPES_D_ALERTE`.",
   "tailles": "12 px, la taille de `creerIcone` et de `svgDeLAlerte` par défaut ; `svgDeLAlerte` accepte une autre taille.",
   "teinte": "La couleur vient du type (`poserTon`) : une alerte est toujours teintée. L’encre du trait et du point est `--texte-sur-ton`.",
   "nom": "L’icône est décorative (`aria-hidden`) : le mot du type (« Bloquant », « À corriger »…) porte le sens, jamais la couleur ni la forme seules."
  },
  "types": [
   {
    "id": "bloquant",
    "libelle": "Bloquant",
    "sens": "L’opération ne peut pas continuer.",
    "brut": "✗",
    "forge": "❌"
   },
   {
    "id": "corriger",
    "libelle": "À corriger",
    "sens": "Un écart établi demande une correction.",
    "brut": "⚠",
    "forge": "⚠️"
   },
   {
    "id": "verifier",
    "libelle": "À vérifier",
    "sens": "Les faits lus ne suffisent pas pour conclure.",
    "brut": "⚠",
    "forge": "⚠️"
   },
   {
    "id": "info",
    "libelle": "Information",
    "sens": "Un fait est communiqué sans correction demandée.",
    "brut": "ℹ",
    "forge": "ℹ️"
   },
   {
    "id": "tenu",
    "libelle": "Tenu",
    "sens": "Le contrôle n’a trouvé aucun écart.",
    "brut": "✓",
    "forge": "✅"
   }
  ]
 },
 "outils": [
  {
   "id": "palettes",
   "libelle": "UCM Palettes",
   "definition": "Calcule les palettes et écrit leur recette, leurs variables primitives et leurs planches dans Figma."
  },
  {
   "id": "architect",
   "libelle": "UCM Architect",
   "definition": "Présente les variables, les composants et la recette des palettes ; contrôle leur architecture et normalise les noms de collections et de variables."
  },
  {
   "id": "exporter",
   "libelle": "UCM Exporter",
   "definition": "Publie les contrats de composants et les tokens DTCG ; seule la création des règles d’usage écrit dans Figma."
  },
  {
   "id": "cli",
   "libelle": "UCM CLI",
   "definition": "Installe la configuration manquante, contrôle le repository et produit le CSS des tokens."
  }
 ]
};
