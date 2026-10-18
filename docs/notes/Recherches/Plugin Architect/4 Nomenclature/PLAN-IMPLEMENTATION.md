# Nomenclature d'UCM : corpus des design systems et questions à trancher

Statut : plan réordonné d'après la [revue critique](./REVUE-CRITIQUE-PLAN-IMPLEMENTATION.md). Les lots A0 à A8 remplacent N2 à N6 ; N0 et N1 restent comme socle déjà livré.

## Pourquoi

La liste Q1 de questions sur C1 et C2 était inutilisable. Trois défauts du moteur l'expliquaient :

1. L'indice « même place » rapprochait deux variables différentes dont les alias visent la même cible (`badge / scale`).
2. Le lexique coupait tout segment à la casse (`ScaleWrap` donnait `scale`).
3. Rien ne distinguait un mot de nomenclature d'un nom propre à un composant.

Sur C2, les vrais écarts sont des noms qui diffèrent entre branches censées être identiques (le clair et le sombre, une collection de modes et sa cible). Le détail reste dans `_local/`, hors du dépôt.

La revue a montré que corriger le bruit ne suffit pas. Il faut garantir qu'une réponse produit le renommage attendu, qu'elle ne fusionne pas deux sens différents, et mesurer les cas manqués autant que le bruit.

## Deux fins distinctes

- **Dossier d'arbitrage** (objectif de cette passe) : méthode adoptée, jeu de référence annoté, décisions de termes prises par le mainteneur dans `decisions.json`.
- **Moteur livré** (passe suivante) : décisions intégrées au kit, renommages simulés et vérifiés, recette Figma.

## Règles retenues

- **Relation lexicale et équivalence sont deux choses.** Une faute, un pluriel ou une terminaison justifient une question, pas un remplacement. Une négation (`selected` / `unselected`, `active` / `inactive`) est une opposition : jamais une question de fusion.
- **Une question n'est posée que si sa réponse s'applique** au découpage employé par le renommage. Sinon elle disparaîtrait sans rien renommer.
- **Les noms propres à un composant ne donnent pas de question**, mais les états, rôles et propriétés d'un token de composant (`components/Badge/background/hover`) restent comparables.
- **Les comptes du marché sont des usages observés**, avec leur dénominateur. Ils éclairent une décision ; ils ne prouvent pas une synonymie.
- **C2 et ses dérivés restent locaux.** Les tests et documents commités n'emploient que des noms inventés.

## Socle déjà livré

### N0 · Détection corrigée

- [x] « Même place » supprimé ; indice `branches-paralleles` avec appariement un à un, recouvrement d'au moins 80 %, crans ignorés (`9e4c240`).
- [x] Découpage pour les questions gardé par le vocabulaire : morceaux de 3 lettres, un morceau exact, faute à une lettre avec la même initiale (`9e4c240`).
- [x] Négation retirée des fusions ; faute seulement vers un terme connu ; garde-fou d'applicabilité (`9e4c240`).
- [x] Mesure : C1 passe de 47 à 8 questions, C2 de 230 à 14, aucune hors sujet sur ces 14. Sur l'inventaire local de sept paires de C2, trois sont retrouvées ; les quatre autres sont manquées par opposition, par ex aequo, par double écart ou par renommage d'alias (`9e4c240`).

### N1 · Corpus de référence

- [x] `docs/references/design-systems/` : 13 systèmes, sources figées par SHA-256, extracteurs, UCM au même format (`c93b939`).

## Lots

| Lot | Travail | Qui | Dépend de | Preuve de fin |
|---|---|---|---|---|
| A0 | Adopter la méthode et les catégories de jugement | Mainteneur, sur la page | — | Section « Méthode » de la page répondue, reportée dans `decisions.json` |
| A1 | Annoter le jeu de référence : chaque paire est équivalente, distincte ou indéterminée | Mainteneur, sur la page ; contributeur prépare | A0 | Annotations dans `_local/annotations-c2.json` ; un tiers tenu à l'écart pour la recette |
| A2 | Représentation commune des occurrences, de la détection au renommage | Contributeur | A1 | Test de session : répondre, constater le renommage, annuler, retrouver l'état initial ; recalcul partiel égal au complet ; `textsucccess` corrigeable |
| A3 | Branches parallèles : score de confiance, motifs d'abstention, portée de la règle créée | Contributeur | A2 | Cas obligatoires du jeu retrouvés, contre-exemples préservés, aucun remplacement hors du périmètre validé, budgets de calcul mesurés (32 000 noms, tranches de 8 ms) |
| A4 | Auditer les extractions : provenance par occurrence, matrice système × famille × couche, `REGISTRES_ARCHITECTURE`, réglages MUI | Contributeur | — | Couches inconnues visibles ; chaque extracteur vérifié sur un extrait connu |
| A5 | Analyse par concept sur occurrences annotées | Contributeur | A4 | Dénominateurs explicites ; conclusions sensibles au classement signalées |
| A6 | Décisions de termes | Mainteneur, sur la page | A0, A5 | `decisions.json` : identifiant, version des données, choix, portée, raison, état |
| A7 | Intégrer les décisions au kit, simuler les renommages, traiter les consommateurs | Contributeur | A3, A6 | Tests, versions, vues générées ; impact des chemins publiés documenté |
| A8 | Recette Figma sur copie et nouveau jugement de Q1 | Mainteneur | A7 | Effets conformes aux simulations, retour arrière vérifié |

A4 peut avancer en parallèle d'A2 et A3. La page de questions sert A0, A1 et une première passe d'A6 sur les décisions qui ne dépendent pas d'A5.

## Format des décisions

`decisions.json`, commité, ne contient aucun nom de C2. Une entrée par question :

```json
{ "id": "T03", "donnees": "c93b939", "question": 1, "choix": "A",
  "portee": "partout | contexte | distinction", "raison": "…", "etat": "adopte | distinct | differe | a-examiner" }
```

Les annotations des paires de C2 vont dans `_local/annotations-c2.json`, au même format.
