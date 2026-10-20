# Corpus de test

- **Le lecteur de contrats se teste sur un corpus figé, `fixtures/contrats/`, de la version précédente : quatre contrats 13.0.** Ce corpus est nécessaire : la fenêtre de lecture à deux versions n'est observable qu'à partir de contrats que le moteur ne produit plus. L'immobilité, défaut de l'instantané côté moteur, est ici la propriété recherchée.
- **Le corpus n'est jamais comparé à une sortie du moteur.** Un tel test serait ce que la règle « le moteur ne se teste sur aucun contrat commité » interdit (`tests-du-moteur.md`).
- **Le corpus n'est jamais rafraîchi.** Un réexport le rendrait inutile, puisqu'il cesserait d'être N-1. Ses empreintes SHA-256, dans le README voisin, empêchent de le croire frais.
- **Le corpus disparaît quand la fenêtre de lecture se referme au-dessus de sa version, en même temps que le code de compatibilité qu'il couvre, jamais avant.**
- **Les jeux 12.0 et 11.0, sortis de la fenêtre, restent en place.** `validation-contrat.mjs` garde le code qui lit la 12.0, la 11.0 et les versions antérieures ; `refus-enregistres.test.mjs` mesure ce code sur eux. Chaque jeu disparaît avec le code qui le lit.
- **Le corpus n'est pas publié.** `files` du kit ne l'inclut pas.
- **`fixtures/tokens/origine/` pose la même question à `tokens.json`.** Il porte un fichier de la forme d'origine, antérieure à la version `1` du format de tokens, produit par le moteur d'avant cette version depuis le mock du producteur. Les tests du kit le lisent pour l'état `origine`.
- **Les trois bornes du corpus de contrats valent pour `fixtures/tokens/origine/`.** Aucun test permanent ne le compare à une sortie du moteur. Il n'est jamais rafraîchi, et son empreinte SHA-256 est dans le README voisin. Il disparaît avec le code qui lit la forme d'origine, jamais avant. Il n'est pas publié non plus.
