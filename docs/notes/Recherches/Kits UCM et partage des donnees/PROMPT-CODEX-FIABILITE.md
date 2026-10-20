# Prompt pour Codex : vérifier le plan de fiabilité et fiabiliser UCM

Copier le texte ci-dessous tel quel.

---

Tu travailles dans le dépôt UCM-Toolkit. Deux missions, dans cet ordre :

1. vérifier le plan
   `docs/notes/Recherches/Kits UCM et partage des donnees/PLAN-FIABILITE-KITS-ET-PLUGINS.md`
   contre le code ;
2. chercher, dans tout le dépôt, ce qui peut encore rendre UCM peu fiable, et
   proposer comment le corriger sans trahir le concept du projet.

Tu analyses et tu proposes. Tu ne modifies aucun code produit et tu ne
commites rien : le mainteneur relit tes conclusions, puis décide de ce qui
entre dans le plan.

## À lire avant de commencer

1. `AGENTS.md`, en entier : ordre de lecture, carte du code, invariants.
2. `CONCEPT.md`, en entier : le concept que tes propositions doivent respecter.
3. `CONTRIBUTING.md`, sections « Code », « Rédiger un document » et
   « Interface du plugin ».
4. La revue `REVIEW-KITS-UCM-ET-PARTAGE-DES-DONNEES.md` et le plan, dans le
   même dossier.
5. La skill `.agents/skills/rediger-sans-tics-ia/SKILL.md`, avant d'écrire.

## Le concept à respecter

Toute proposition qui contredit l'un de ces points est écartée, ou présentée
comme une question au mainteneur avec ce qu'elle coûterait au concept.

- **Une information, un propriétaire** (`CONCEPT.md`, section 3). Figma fait foi
  pour les valeurs, les alias, les variantes et les règles d'usage ; le code
  pour le comportement ; le repository et la CI pour l'association et les
  écarts. Le kit fournit le modèle et les lecteurs, jamais les valeurs d'un
  design system particulier.
- **Deux périmètres.** Le périmètre agnostique est le défaut : un outil
  accepte n'importe quelle structure de variables et de collections. Le
  périmètre full UCM est une option. Une collection libre ou un nom propre de
  composant ne devient jamais une erreur de conformité. `ucm check` ne bloque
  que sur une variable manquante.
- **Une définition UCM s'écrit une fois**, dans `packages/kit/src/referentiel/`
  ou `packages/kit/src/emplois/`. Le kit n'importe aucun paquet privé.
- **L'écriture d'un nom appartient au fichier Figma.** Nomenclature applique la
  convention choisie (`Light` ou `light`). UCM reconnaît le concept quelle que
  soit son écriture, et garde le nom d'origine pour l'affichage.
- **Les divergences doivent être visibles.** Une vérification qui n'a pas pu
  se faire le dit ; elle ne rend jamais un succès par défaut.
- **Le contrat est portable et autosuffisant**, les tokens restent des
  références, les noms restent traçables.
- **Chaque plugin garde sa frontière d'écriture.** L'explorateur n'écrit jamais
  dans le document. L'exporteur n'y écrit que les règles d'usage. Palettes
  n'écrit que ses palettes dans `primitives`, sa recette, son suivi et ses
  planches, jamais dans `theme`, `color-brands` ni `color-utilities`.
  Nomenclature renomme et range ses règles.
- **L'interface s'adresse à un designer débutant** : mots simples, pas de
  terme technique, pas de bouton d'ajustement automatique.

## Mission 1 : vérifier le plan

Pour chaque affirmation du plan, dis si elle est exacte, en t'appuyant sur le
code et, quand c'est possible, sur une exécution.

- Rejoue le tableau « L'état actuel » de la section « Le principe retenu » :
  chaque ligne, par une sonde.
- Pour chaque lot : les fichiers et fonctions cités existent-ils ? Le
  changement corrige-t-il le défaut décrit ? Manque-t-il un lecteur de la même
  règle, que le lot laisserait diverger ? Les tests prouvent-ils la
  correction, ou seulement le cas choisi ? L'ordre et les dépendances tiennent-ils ?
- Le lot 7 propose de retirer les corrections 170a6d79, c93bff20 et 7c673dac
  pour prouver que les lois les attrapent. Dis si les lois décrites y
  suffiraient, et lesquelles manquent.
- Les lots 9 à 13 mettent dans le kit les règles des constats C05 à C09. Pour
  chacun : la liste des fonctions à déplacer est-elle complète ? Reste-t-il
  une seconde implémentation, même partielle, que le lot oublierait ? Une
  dépendance empêche-t-elle le kit de recevoir la règle sans importer un
  paquet privé ? La sortie peut-elle rester identique octet pour octet ?
- Signale tout point du plan qui contredit le concept ci-dessus.

## Mission 2 : fiabiliser UCM dans tout le dépôt

Les défauts trouvés dans la même session appartiennent à quelques familles.
Cherche les autres cas de chaque famille, dans les neuf paquets de
`packages/` et dans `tests/`.

| Famille | Exemple déjà trouvé | Où chercher |
|---|---|---|
| A. Une décision calculée à deux endroits | L'interface de Palettes annonçait un renommage que l'écriture ne faisait pas (c93bff20) | Interface et sandbox d'un même plugin ; producteur et lecteurs d'une donnée ; deux plugins qui jugent la même chose |
| B. Un nom Figma reconnu par son écriture exacte | `variableDuNom('Primary/Solid/default')` rend `null` dans l'explorateur | Toute comparaison de chaîne entre un nom lu dans Figma et un terme UCM |
| C. Le silence pris pour un succès | « L’export porte la même chose que Figma » sans comparaison (revue, C02) | Fonctions qui rendent une liste vide, `null` ou `true` faute de pouvoir juger ; écrans qui affichent un succès sur ce résultat |
| D. Deux liaisons ou deux formes traitées différemment sans raison écrite | Reprise et destination jugeaient un nom pris avec et sans casse (7c673dac) | Palettes : liaisons `reprise` et `destination`, thèmes en modes et dans le chemin, une et deux intensités ; exporteur : variantes et instances |
| E. Données partagées dans Figma | Nomenclature protège les variables de Palettes sans dire pourquoi | Chaque espace et clé de `produits.ts` : absence, JSON invalide, version ancienne, courante, future, ancienne distribution qui rouvre le fichier ; une lecture qui écrit ou migre |
| F. Écritures dans Figma | Un renommage fait par une mise à jour, sans annonce | Écriture hors de la frontière du plugin, non annoncée, sans `commitUndo`, laissée à moitié après une erreur |
| G. Fabrication et vérification | Un test racine rouge après une modification du kit vérifiée par les seuls tests des paquets | `dist` périmé, pins, galerie, scripts lancés depuis un paquet |
| H. Tests qui passent sans prouver | | Doublures de Figma (`FauxFigma` et autres) qui acceptent ce que Figma refuse, ou l'inverse (unicité des noms, casse, modes) ; fixtures qui ne ressemblent à aucun fichier réel ; tests qui recopient le code qu'ils vérifient |

Ajoute une famille si tu en trouves une autre.

## Méthode

- Prouve chaque constat par le code et, si possible, par une sonde exécutée.
  Garde les sondes dans un dossier temporaire hors du dépôt ; donne la commande
  pour les rejouer.
- Classe chaque constat : **sûr** (reproduit), **probable** (lu, non exécuté),
  **à vérifier** (soupçon). Ne présente jamais un soupçon comme un fait.
- Priorité : **P1** une conclusion fausse visible par le designer ou le
  développeur ; **P2** une autorité commune incomplète ou une couverture qui
  manque ; **P3** une description ou un point d'entrée en retard sur le code.
- Pour chaque correction proposée : le propriétaire attendu de la règle
  (kit, moteur, socle, plugin), le test qui la prouverait, et son coût
  (version publiée, migration de données Figma, changement de texte d'écran).
- Ne propose pas de migration du fichier Figma, de ses composants ou du
  Playground : le mainteneur les fait lui-même.

## Interdits

- Ne lance jamais `test:ui` ni une boucle d'attente.
- Ne modifie aucun fichier hors de ton document de sortie.
- Ne prends aucun fait UCM dans l'export de `UCM-Playground` : il est périmé.
  L'architecture de référence est
  `docs/notes/Recherches/Archi Tokens Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html`.
- N'écris dans un fichier suivi aucun nom tiré de `_local/` : ce dossier porte
  un fichier client confidentiel.

## Vérifications à lancer

Depuis la racine : `npm run typecheck`, puis `npm test`, qui construit le kit,
lance les tests de chaque paquet puis les tests racine. Rapporte tout échec
avec son message exact, en distinguant ce qui préexistait.

## Livrable

Un seul document, dans le même dossier :
`REVUE-CODEX-DU-PLAN-FIABILITE.md`, avec :

1. **Verdict sur le plan** : un tableau par lot (exact, à corriger, à
   compléter), avec la raison et la source.
2. **Erreurs factuelles du plan**, avec la preuve.
3. **Nouveaux constats**, numérotés F01, F02…, chacun avec : famille,
   priorité, confiance, fichiers et fonctions, scénario concret pour le
   designer ou le développeur, sonde, correction proposée, propriétaire, test.
4. **Lots proposés** pour compléter le plan, au même format que ses lots
   (ce que voit le designer, changement, fichiers, tests, fini quand).
5. **Questions au mainteneur** : les choix qui touchent au concept ou à
   l'interface, avec ta recommandation.

Termine par `node scripts/controle-style.mjs` sur ce document.
