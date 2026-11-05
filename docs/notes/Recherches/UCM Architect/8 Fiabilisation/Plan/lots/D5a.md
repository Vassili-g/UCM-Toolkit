# D5a. Candidat de prélecture

Phase D. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase D
dans [README.md](../README.md).

Fichiers : `src/code.ts`, `src/sandbox/prelecture.ts`, `src/ui/index.ts` et leurs tests.

- [x] D5.1 Préparez une acquisition Tokens coopérative, avec un budget de 50 ms et des points de cession explicites.
  Une attente d'API seule ne constitue pas une cession prouvée. La prélecture ne change aucun résultat affiché.
- [x] D5.2 Annulez la prélecture remplacée ou rendue périmée. Une demande Composant passe avant elle.
  Relisez au clic les données sans preuve de fraîcheur. Gardez le candidat inactif jusqu'à la comparaison A/B dans Figma.

Fin : `npm run test:paquet -- architect` passe. Les tests vérifient priorité, abandon, génération et fraîcheur.
Le candidat reste inactif en attendant D5b. Cette attente ne bloque pas D6 ni les corrections E.

## Avancement

D5a fait (Claude, non commité). Candidat inactif.

- `src/sandbox/prelecture.ts` : `creerLaPrelectureDesTokens` lit le relevé par `lireLeReleveAcquis` avec un contexte coopératif de `BUDGET_DE_LA_PRELECTURE_DES_TOKENS_MS` (50 ms). Les points de cession sont explicites : `portCooperatif` attend `ceder` après chaque réponse de l'API, et une attente d'API seule n'en compte pas. Aucun import par clé (`portSansImportParCle`, ajouté à `lecture.ts`).
- Annulation : `lancer` arrête la lecture qui court ; `cederLaPlace` (toute demande, Composant comprise) et `surChangement` (nœud, style, sélection) lèvent le jeton ; un candidat est jeté si `reperDesLectures` a changé (écriture, Actualiser) pendant ou après la lecture. Une demande prioritaire (`operationEnCours`) lève le jeton à la cession suivante.
- Fraîcheur : `reprendreAuClic` rend toujours `null`, car Figma n'émet aucun événement sur une variable ; le clic relit. `candidat()` ne sert qu'à comparer les sorties en D5b. L'acquisition d'Actualiser (`acquisitionCourante`) reste vide.
- `src/code.ts` construit le candidat et branche ses arrêts ; aucun appel à `lancer`. `src/ui/index.ts` n'a rien à changer : sans activation, l'interface n'a aucun geste à envoyer.
- Tests : `tests/prelectureDesTokens.test.ts` (10 : budget et cessions, priorité, `cederLaPlace`, remplacement, événement, repère, clic sans reprise, aucun import, fermeture).
- Documents : `CARTE.md` (`prelecture.ts`), `invariants/explorateur.md` (nouvelle puce), `SPEC.md` (§ prélecture).

Limite : les boucles de conversion de `lecture.ts` (`convertirVariable`) restent synchrones entre deux réponses de l'API ; le budget de 50 ms n'y est pas coupé. D5b mesure si cela suffit.

Reste : D5b (mesure A/B dans Figma par le mainteneur) avant toute activation.
