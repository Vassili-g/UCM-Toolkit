# Plan de fiabilité d'UCM Nomenclature

Ce plan corrige les défauts de deux audits du plugin :
[l'audit complet](./AUDIT-COMPLET-ARCHITECT.md), codes AC1 à AC13, et
[l'audit d'intégrité des tokens](./AUDIT-INTEGRITE-TOKENS.md), codes AI1 à
AI12 (ses codes A1 à A12 y prennent le préfixe AI). Il s'exécute après N1 du
[plan de la recette](./PLAN-IMPLEMENTATION.md) : le plugin vit alors dans
`packages/plugin-architect/`, paquet `ucm-nomenclature-plugin`. Les chemins
`src/…` et `tests/…` partent de ce dossier.

## Lecture des deux audits

Les deux audits concordent sur l'essentiel : aucun chemin ne supprime une
variable, une valeur, un mode ou un alias. Le plugin ne change que des noms,
et les dommages possibles sont un token absent de `tokens.json`, un groupe
changé, une annulation fausse ou impossible, et des règles perdues.

| Sujet | Audit complet | Audit d'intégrité |
|---|---|---|
| Journal borné en caractères | AC3 | AI2 |
| Journal mélangé entre deux lots | AC4 | AI3 |
| Annulation qui efface les entrées sautées | AC9 | AI4 |
| Doublon dans `tokens.json` après renommage | AC1, AC2 | AI10 |
| Fenêtre entre relecture et écriture | AC13 | AI6 |
| Noms changés avant le journal | | AI1 |
| Annulation de cycle interrompue | | AI5 |
| Signature des règles comparée trop tôt | | AI7 |
| Erreur de relecture affichée comme un refus | | AI8 |
| `\|` dans une paire de termes | | AI9 |
| Import partiel après une exception | | AI11 |
| Annuler une réponse écrase un ajout | | AI12 |
| `/` dans un terme | AC5 | |
| Séparateur perdu par un terme de deux mots | AC6 | |
| Variables reprises par Palettes non protégées | AC7 | |
| Nom final non contrôlé | AC8 | |
| « Annuler » sans confirmation | AC10 | |
| Entrée `terme:` vide | AC11 | |
| Import qui remplace sans retour | AC12 | |

L'audit d'intégrité élargit AC1 sur un point qui change la correction : le
chemin d'un token inclut le préfixe de sa collection (`joinTokenPath`,
`packages/plugin-socle/src/cheminsDeTokens.ts:45`). Deux variables de
collections différentes peuvent donc converger, quand une collection est
renommée. Le contrôle porte sur tout le document, pas sur une collection.

Ses reproductions de AI1, AI6 et AI7 injectent la panne ou la course dans un
port en mémoire : elles prouvent le défaut du code, pas sa fréquence dans
Figma. AI1 n'arrive en pratique que par AI2 ; corriger AI2 seul ne suffit
pourtant pas, car toute autre exception du stockage laisserait le même état.
Le plan les corrige ensemble.

Le banc de l'audit d'intégrité (`Mesures/auditer-integrite.ts`) réussit tant
que les défauts existent. Chaque lot reprend ses cas comme tests de
régression dans `tests/`, avec l'attente inverse ; le lot B retire le banc.

## Décisions

- **Journal préparé avant le premier nom.** Le lot écrit le journal prévu,
  sous des clés propres au lot, puis publie sa référence, puis renomme. Si
  le journal ne peut pas être écrit, aucun nom ne change. Après les
  écritures, le journal est réécrit avec les noms constatés ; si cette
  réécriture échoue, le journal prévu reste valide, car l'annulation compare
  chaque nom courant au nom écrit et au nom provisoire.
- **Taille en octets UTF-8.** Un calcul pur compte les octets, sans
  `TextEncoder` (le sandbox n'en garantit pas). Budget d'une entrée :
  100 000 octets moins l'espace, la clé et une marge de 1 000 octets.
- **Chemins publiés.** Le contrôle des doublons d'Architect emploie
  `joinTokenPath` du socle, sur tout le document, pour les objets cochés et
  non cochés, collections exclues comprises. Il refuse un chemin égal à un
  autre et un chemin qui est le groupe d'un autre. Le contrôle exact sur les
  noms Figma reste en place.
- **Le kit ne change que pour AC6.** Le post-contrôle des chemins vit dans
  la session du plugin, qui marque bloqués les renommages en cause, comme le
  fait déjà `avecLesCollectionsRenommees`.
- **Protection Palettes.** Une variable est protégée quand sa donnée
  `palette` est posée, ou quand son identifiant figure dans le suivi de la
  donnée `variables` de la racine, dans l'espace `ESPACE_PARTAGE`.
- **Mots d'un terme.** Un mot refuse le blanc, `/`, `|`, `.`, `{`, `}` et
  `$`, au geste, à la réponse, à l'import et à la relecture. La relecture
  ignore une entrée déjà rangée qui ne passe plus, sans la réécrire.

## Textes

Les agents recopient ces textes dans `src/ui/textes.ts`. Un texte qui manque
arrête le lot et remonte à la conversation principale.

| Clé | Texte |
|---|---|
| `journalImpossible` | Rien n'a été renommé : le fichier ne peut pas garder de quoi remettre ces noms. Cochez moins de noms, puis appliquez de nouveau. |
| `bilanIllisible` | Les noms sont changés, mais le plugin n'a pas pu relire le fichier. Relancez l'analyse. |
| `confirmerLAnnulation(nombre, heure)` | Annuler le renommage de {heure} ? {1 nom reprend son / N noms reprennent leur} ancien nom. |
| `remettreLesAnciensNoms` | Remettre les anciens noms |
| `garderLesNoms` | Garder |
| `annulationDuRenommagePartielle(retablis, sautes)` | {N noms} rétablis, {sautes} n'ont pas pu l'être : un autre nom occupe leur place ou ils ont changé depuis. Le plugin les garde ; annulez de nouveau après avoir corrigé. |
| `memeToken(apres, autre)` | `{apres}` et `{autre}` donneraient le même token dans tokens.json : renommez l'une des deux dans Figma. |
| `tokenEtGroupe(apres, autre)` | `{apres}` serait à la fois un token et le groupe de `{autre}` dans tokens.json : renommez l'une des deux dans Figma. |
| `erreur['mot-refuse']` | Ce terme ne peut pas s'écrire ainsi : retirez les espaces et les caractères / \| . { } $. |
| `dernierImport` | Dernier import |
| `importALHeure(heure)` | Règles importées à {heure} |
| `annulerLImport` | Annuler l'import |
| `erreur['import-partiel']` | L'import s'est arrêté en route : les règles du fichier sont revenues à leur état d'avant. |

## Règles d'exécution

- Un lot par appel d'agent, deux agents au plus en même temps, sur des
  fichiers disjoints. L'ordre ci-dessous dit lesquels tournent ensemble.
- L'agent reçoit dans son appel l'extrait des défauts de son lot, ses
  fichiers et ses commandes de fin. Il ne lit ni les audits ni ce plan en
  entier : la conversation principale lui recopie ce qu'il faut.
- Chaque défaut corrigé reçoit un test de régression dans `tests/`, repris du
  banc quand il y en a un.
- Un `verificateur` lance les commandes de fin. La conversation principale
  relit le diff du lot seul (`git diff -- <fichiers du lot>`), compare les
  fins de ligne au fichier de `HEAD` sur les octets, puis commite par chemins
  explicites sur `main`. Rien n'est poussé avant la fin de U.
- Commandes du plugin : `npm test -w ucm-nomenclature-plugin`,
  `npm run typecheck -w ucm-nomenclature-plugin`,
  `npm run build -w ucm-nomenclature-plugin`.

## Ordre

| Vague | Lots | Pourquoi ensemble |
|---|---|---|
| 1 | J, K | J touche le journal du plugin ; K, le kit seul |
| 2 | C | session et écriture, après J |
| 3 | S, T | S touche la lecture ; T est l'essai Figma du mainteneur |
| 4 | R | règles et session, après S |
| 5 | U | l'écran, quand les codes de J, C et R existent |
| 6 | B, P | le banc retiré, puis les versions et la vérification |

## Lots

### J · Le journal durable (AI1, AI2, AI3, AI4, AI5)

Agent : `implementeur-exigeant`. Fichiers : `src/ecriture.ts`,
`src/regles.ts`, `tests/ecriture.test.ts`, `tests/regles.test.ts`,
`src/messages.ts` pour le motif de refus.

- [x] Compter les octets UTF-8 d'un texte par une fonction pure ;
  `preparerJournal` découpe sur ce compte et refuse un renommage qui ne tient
  pas seul dans une entrée. (ba62041)
- [x] Clés du lot : `journal:<lot>:<rang>`, puis la référence `journal` qui
  porte le lot et le nombre d'entrées, écrite en dernier. `lireJournal`
  exige que chaque entrée porte le même lot et son rang ; une incohérence
  rend le journal illisible et l'annulation refusée, journal conservé. Lire
  aussi l'ancienne forme `journal:<n>` tant qu'aucune référence n'existe. (ba62041)
- [x] `appliquerLesRenommages` écrit le journal prévu avant le premier
  setter. Une exception à cette étape efface les clés neuves, ne change
  aucun nom et répond `refuse` avec le motif `journal-impossible`. Après les
  setters, réécrire le journal avec les noms constatés. Les clés de l'ancien
  lot s'effacent après la publication de la nouvelle référence. (ba62041)
- [x] L'annulation garde chaque entrée non rétablie, avec son nom courant
  relu (nom provisoire compris), et n'efface que les entrées rétablies. Une
  entrée dont l'objet porte déjà son ancien nom compte comme rétablie : c'est
  le cas d'un renommage prévu que le lot n'a pas écrit. Le nom attendu d'une entrée gardée ne prend le nom courant que si celui-ci est le nom du lot ou un nom provisoire : un nom donné depuis par le designer n'est jamais écrasé par une seconde annulation. (ba62041)
- [x] Tests : panne de chaque entrée du journal et de la référence ; panne
  de chaque setter d'un cycle, à l'application et à l'annulation ; noms en
  `é`, en idéogrammes et en emoji contre un port qui refuse au-delà de
  102 400 octets ; deux lots dont le second échoue en route. (ba62041)

Fin : commandes du plugin.

### K · Le séparateur d'un terme de plusieurs mots (AC6)

Agent : `implementeur`. Fichiers :
`packages/kit/src/referentiel/ecriture-des-mots.ts` et ses tests.

- [x] Quand le séparateur est « inchangé » et que le remplacement change le
  nombre de mots, `assembler` joint les mots par le premier séparateur du
  segment d'origine (`-`, `_` ou espace) ; un segment sans séparateur garde
  les mots soudés, avec la casse de leur frontière. (6e6e2e8)
- [x] Tests : `foo-bar-baz` avec `qux` pour `bar baz` donne `foo-qux` ;
  `foo_bar_baz` donne `foo_qux` ; `foo-qux-x` dans l'autre sens donne
  `foo-bar-baz-x` ; `fooBarBaz` donne toujours `fooQux`. (6e6e2e8)

Fin : `npm test -w @ucm-kit/core`, `npm run typecheck -w @ucm-kit/core`,
puis la conversation principale lance `npm run build -w @ucm-kit/core`.

### C · Le contrôle du nom final (AC1, AC2, AC8, AI10)

Agent : `implementeur-exigeant`. Fichiers : `src/session.ts`,
`src/ecriture.ts`, un module pur `src/cheminsPublies.ts`, `src/projection.ts`
et `src/messages.ts` pour le motif d'un nom bloqué, `src/ui/textes.ts` pour
`memeToken` et `tokenEtGroupe`, leurs tests.

- [x] `src/cheminsPublies.ts` projette tout l'inventaire en chemins par
  `joinTokenPath` du socle, avant et après les renommages retenus, et rend
  les renommages qui créent un chemin égal à un autre ou un chemin qui est le
  groupe d'un autre. Un doublon déjà présent avant le lot ne bloque rien. (937b82f)
- [x] La session applique ce contrôle après le kit et après
  `avecLesCollectionsRenommees` : les renommages en cause deviennent des
  collisions, avec leur motif (`meme-token` ou `token-et-groupe`). L'écran
  les montre bloqués avec le texte de leur motif. (937b82f)
- [x] `executer` refait le même contrôle sur le document relu, et refuse un
  nom final vide, qui commence ou finit par `/`, contient `//`, `.`, `{`,
  `}` ou un segment qui commence par `$`. Pour une collection, seul le nom vide est refusé : Figma accepte `Brand 2.0`. L'annulation ne passe pas par ce contrôle, car elle rend des noms que le fichier a déjà portés. (937b82f)
- [x] Tests : les deux parcours de AI10, `bg/primary` à côté de
  `Background/primary`, `colors` à côté de `color/primary`, une collection
  renommée dont les variables convergent avec celles d'une autre. (937b82f)

Fin : commandes du plugin.

### S · Une seule lecture avant d'écrire (AC7, AC13, AI6, AI7)

Agent : `implementeur`. Fichiers : `src/session.ts` (`appliquer`,
`annulerLeDernier`), `src/lecture.ts`, `src/lectureFigma.ts`,
`src/ecriture.ts` (`creerPortEcriture`), leurs tests.

- [x] `port.ecriture.ouvrir()` rend les objets et l'inventaire tirés de la
  même lecture ; `relireInventaireAvantEcriture` disparaît de ce chemin.
  Aucun `await` entre cette lecture et le dernier setter. (04c1145)
- [x] La signature des règles se compare après cette lecture, juste avant
  d'écrire. (04c1145)
- [x] `protegee` lit aussi le suivi de Palettes : la donnée `variables` de
  la racine, dans `ESPACE_PARTAGE`, dont chaque palette liste les
  identifiants suivis. Un suivi illisible ne protège rien de plus et ne
  bloque pas la lecture. (04c1145)
- [x] Tests : les deux courses de AI6 et celle de AI7 refusent le lot ou
  suivent l'état final ; une variable d'origine d'une palette reprise n'est
  pas proposée. (04c1145)

Fin : commandes du plugin.

### T · L'essai dans Figma

Mainteneur, sur un fichier de test. Les six points de « À trancher dans
Figma » de l'audit complet, puis les points 3 à 6 de l'audit d'intégrité.
Le résultat décide si C doit aussi refuser deux noms qui ne diffèrent que par
la casse dans Figma, au-delà de `tokens.json`. Il ne bloque aucun autre lot.

### R · Les règles (AC5, AC11, AC12, AI9, AI11, AI12)

Agent : `implementeur`. Fichiers : `src/regles.ts`, `src/session.ts`
(`ecrituresDuGeste`, `ecrituresDeLaReponse`, `importer`, `modifierLesRegles`),
`src/messages.ts` si un code d'erreur s'ajoute, leurs tests.

- [x] `estMot` refuse les caractères de la décision « Mots d'un terme ». Un
  geste ou une réponse dont un mot est refusé répond par l'erreur
  `mot-refuse`, sans rien écrire ; un terme vide aussi. (7f433f7)
- [x] Les écritures d'un geste, d'une réponse ou d'un import se rangent avec
  leur texte d'avant ; une exception remet chaque clé déjà écrite et répond
  `import-partiel` pour un import. (7f433f7)
- [x] `preparerReponse` garde aussi le texte écrit ; `defaireReponse` ne
  remet une clé que si son texte courant est encore celui-là, et retire
  sinon les seules formes que la réponse a ajoutées. (7f433f7)
- [x] Un import qui change l'écriture ou un terme existant range une entrée
  `reponse:import:<heure>` avec les textes d'avant, que l'écran de Règles
  propose d'annuler comme une réponse. (7f433f7)
- [x] Tests : les cas AI9, AI11 et AI12 du banc ; `a/b` refusé au geste et à
  l'import ; `par` blanc refusé. (7f433f7)

Fin : commandes du plugin.

### U · L'écran (AI8, AC10, textes de J, C et R)

Agent : `implementeur`. Fichiers : `src/ui/aAppliquer.ts`,
`src/ui/configuration.ts`, `src/ui/frontiere.ts`, `src/ui/textes.ts`,
`src/ui/regles.ts` pour `motRefuse`, la logique pure dans un module testé,
`galerie/etats.cjs` et `galerie/donnees.cjs`.

- [x] Une `application` reçue est gardée ; une `erreur` qui la suit pour la
  même demande ajoute `bilanIllisible` au lieu de `rienNAEteRenomme`. (a1bb373)
- [x] « Annuler » de la Configuration ouvre la confirmation du socle déjà
  employée par Appliquer, avec `confirmerLAnnulation`,
  `remettreLesAnciensNoms` et `garderLesNoms`, et se désactive jusqu'à la
  réponse. (a1bb373)
- [x] Les codes `journal-impossible`, `mot-refuse` et `import-partiel` ont
  leur texte ; `annulationDuRenommagePartielle` prend le nouveau texte. (a1bb373)
- [x] Un état de galerie par nouveau texte. (a1bb373)

Fin : commandes du plugin, `npm run galerie -w ucm-nomenclature-plugin`.

### B · Le banc de l'audit retiré

Agent : `executant`. Supprimer `Mesures/auditer-integrite.ts` et
`Mesures/resultats-audit-integrite.tap` ; dans `AUDIT-INTEGRITE-TOKENS.md`,
remplacer les liens vers le banc par une phrase qui renvoie aux tests du
plugin. Fin : `tests/docLinks.test.ts`.

### P · Versions et vérification

Conversation principale, puis `verificateur`.

- [x] Monter `@ucm-kit/core` (K), puis `@ucm-kit/cli` et
  `@ucm-kit/adapter-typescript` qui en dépendent ; publier. (ce7efda)
- [x] Racine : `npm test`, `npm run typecheck`, `npm run build`. (ee2aa3e)
- [x] Cocher chaque case avec son hash, puis pousser. (ee2aa3e)
- [ ] Recette Figma par le mainteneur : un lot de noms accentués, une
  annulation, un export après renommage sans token perdu.

## Coût

Deux lots demandent `implementeur-exigeant` (J et C) : ils touchent plusieurs
lecteurs d'une même règle, le journal ou le chemin publié. Quatre lots vont à
`implementeur` (K, S, R, U), un à `executant` (B), et chaque vérification à
`verificateur`. La conversation principale garde les textes, la relecture des
diffs, les commits et la publication.
