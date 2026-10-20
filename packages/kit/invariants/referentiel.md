# Référentiel

- **Une définition UCM (crans, modes, profils, états, collections, rôles du thème, garanties, rôle des produits, tags des règles d'usage, conventions de noms) se modifie dans [`src/referentiel/`](../src/referentiel/), jamais dans un paquet.** Tests : `/tests/referentielUnique.test.ts` refuse la liste qui la recopie.
- **Après une modification du référentiel, relancer les tests, régénérer la vue illustrée (`generer-donnees-referentiel.ts`), régénérer la planche du moteur (`npm run planche --workspace ucm-couleur`) si le moteur ou ses crans changent, et changer la version de `@ucm-kit/core`.**
