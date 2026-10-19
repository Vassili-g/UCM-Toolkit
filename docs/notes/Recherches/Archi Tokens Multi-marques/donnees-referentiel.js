// Généré par generer-donnees-referentiel.ts ; ne pas modifier à la main.
window.REFERENTIEL = {
 "collections": [
  {
   "nom": "components",
   "cibles": [
    "theme",
    "layouts",
    "typography"
   ],
   "sansPortee": false
  },
  {
   "nom": "theme",
   "cibles": [
    "color-brands",
    "color-utilities"
   ],
   "sansPortee": false
  },
  {
   "nom": "color-brands",
   "cibles": [
    "primitives"
   ],
   "sansPortee": true
  },
  {
   "nom": "color-utilities",
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
   "nom": "layouts",
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
    "dark-normal": "300",
    "dark-inverse": "300"
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
    "dark-normal": "400",
    "dark-inverse": "400"
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
    "dark-normal": "500",
    "dark-inverse": "500"
   }
  },
  {
   "id": "surface/foreground",
   "libelle": "texte sur fond teinté",
   "definition": "Texte et icônes sur un fond teinté.",
   "garanties": [
    3
   ],
   "crans": {
    "light-normal": "800",
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
    "light-normal": "800",
    "light-inverse": "900",
    "dark-normal": "950",
    "dark-inverse": "950"
   }
  },
  {
   "id": "page/foreground",
   "libelle": "texte coloré",
   "definition": "Texte et icônes colorés sur le fond de la page.",
   "garanties": [
    5
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
    "dark-inverse": "700"
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
 "outils": [
  {
   "id": "palettes",
   "libelle": "UCM Palettes",
   "definition": "Calcule les palettes et écrit leur recette, leurs variables primitives et leurs planches dans Figma."
  },
  {
   "id": "explorateur",
   "libelle": "UCM Explorateur",
   "definition": "Présente les variables, les composants et la recette des palettes sans écrire dans le document Figma."
  },
  {
   "id": "architect",
   "libelle": "UCM Nomenclature",
   "definition": "Normalise les noms de collections et de variables, puis range les règles de nommage choisies."
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
