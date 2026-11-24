---
name: regler-le-linter
description: "Ajouter ou retirer une valeur neutre, une propriété d'une famille ou une autre entrée des listes du contrôle du code (linter UCM et ucm check). Charger pour une demande comme « ajoute auto aux valeurs neutres » ou « retire border de la famille couleur »."
---

# Régler une liste du linter

- **Les listes vivent seulement dans `packages/kit/src/lecteurs/controle-du-code-listes.mjs`.** Une entrée par ligne, chacune avec sa raison. Un réglage est une décision du mainteneur : ne rien ajouter ni retirer sans sa demande.
- **Écrire la ligne.** Valeur neutre : `{ valeur: "<valeur>", raison: "<pourquoi elle ne porte aucune décision du designer>" },` dans `VALEURS_NEUTRES`. Propriété : `{ propriete: "<nom CSS>", familles: ["<famille>"], raison: "<phrase>" },` dans `PROPRIETES_PAR_FAMILLE`. Retirer : supprimer la ligne.
- **Mesurer.** Avant et après le changement, lancer `npx tsx --test packages/kit/tests/apiPublique.test.mjs`, qui affiche le résultat de l'exemple généré depuis les listes. Compter les constats ajoutés ou retirés entre les deux affichages. Le nombre entre au journal.
- **Tests qui réagissent.** `kit/tests/controle-du-code-listes.test.mjs` refuse une ligne sans raison ou en double. `kit/tests/apiPublique.test.mjs` voit changer le résultat de l'exemple généré depuis les listes : recopier le résultat affiché dans `kit/tests/prise-attendus.json`. `tests/ecrituresDesAidesJugees.test.mjs` vérifie que les aides passent encore. Le test de fraîcheur de l'inventaire demande `npm run vues`.
- **Journal.** `packages/kit/CHANGELOG.md` : titre `## <nouvelle version>`, puis `### rupture`, le nom `preparerControle`, l'entrée ajoutée ou retirée, le nombre de constats mesuré, le geste du développeur et « Décidé par le mainteneur ».
- **Version.** Le chiffre du milieu du kit monte. La CLI et l'adaptateur montent leur dernier chiffre et épinglent le nouveau kit. Publier les trois selon la skill `publier-paquets`.
- **Geste du développeur.** Épingler les trois versions exactes, `npm install`, puis corriger les nouveaux constats ou lancer la commande `npx ucm deroger` qu'ils donnent.

Borne : aucune autre règle ne se règle. Une exception pour une variable CSS externe attend un cas réel et prendrait la même forme. Autorité : `controle-du-code-listes.mjs`. Spec : [cadrage P6, §7](../../../docs/notes/Recherches/Linter%20Dev/RECHERCHE-CADRAGE-P6.md).
