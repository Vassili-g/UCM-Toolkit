# Décision sur le verdict de ucm check

Ce document tranche les questions techniques de la piste P19 de
[pistes.json](../Evolutions%20globales/pistes.json) pour le mainteneur. La
partie 1 se lit seule. Les parties 2 et 3 donnent les preuves et le travail à
faire, découpé pour des agents.

Les décisions déjà prises par le mainteneur ne sont pas rouvertes. Elles sont
écrites au [§7 du plan de conformité du rendu](./PLAN-CONFORMITE-RENDU.md#7-règle-de-sévérité)
et au [§6 du guide des designers](../../../guides/POUR-LES-DESIGNERS.md#6-ce-qui-bloque-la-fusion-et-ce-qui-avertit).

## 1. En une page, pour le mainteneur

### Le problème

Une image aide à voir la question. Un livre a un original et une traduction.
Quand l'auteur réécrit un chapitre, la traduction devient fausse, et personne
n'accuse le traducteur. Elle est seulement en retard. Quand le traducteur
retouche ensuite ce chapitre et laisse un écart, l'écart est une faute du
traducteur. Pour juger, il suffit de savoir lequel des deux textes a changé en
dernier.

Dans UCM, le contrat est l'original et le code est la traduction. `ucm check`
est le contrôle automatique qui tourne sur chaque demande de fusion, c'est-à-dire
chaque proposition de modification du dépôt (pull request sur GitHub, merge
request sur GitLab). Aujourd'hui, il signale un écart entre le code et son
contrat sans jamais refuser la fusion. Le mainteneur a décidé qu'un écart du
code doit bloquer, sauf quand le designer vient de changer le contrat. Il reste
à dire comment le contrôle reconnaît ce cas, sans geste de personne.

### Pourquoi il compte pour UCM

UCM promet la robustesse, c'est-à-dire qu'un écart est vu avant la fusion
([CONCEPT.md](../../../../CONCEPT.md), section 6). Un contrôle qui ne refuse rien
ne tient pas cette promesse, et `bilanEstBloquant` ne compte aujourd'hui ni la
parité ni les tokens absents. La parité est la comparaison entre les propriétés
du contrat et l'API réelle du composant dans le code.

Un contrôle qui refuse à tort coûte autant. Un développeur bloqué pour un
composant qu'il n'a pas touché, ou un designer bloqué par du code, cherche un
moyen de contourner le contrôle. Les agents de code des développeurs le
trouvent vite.

### Les décisions

1. **Le dernier modifié répond.** Le contrôle lit l'historique Git, le journal
   de toutes les modifications du dépôt. Si le contrat d'un composant a changé
   après son code, le composant est « en retard sur son contrat » et rien ne
   bloque. Si le code a changé en même temps ou après, l'écart bloque. Un envoi
   direct sur `main` sans demande de fusion suit la même règle, donc la fusion
   d'une variante par le designer ne rend jamais `main` rouge.
2. **Une demande du designer ne bloque jamais sur le code.** Une demande qui ne
   modifie que des contrats et `tokens.json` n'est refusée que pour ses propres
   fichiers. Une demande de tokens seuls n'est refusée que si `tokens.json` est
   illisible.
3. **Un adaptateur manquant bloque le code TypeScript.** L'adaptateur est le
   paquet qui apprend au contrôle à lire le code d'une technologie. Un
   repository écrit en TypeScript sans adaptateur chargé ne prouve rien, et le
   contrôle le refuse dans les demandes des développeurs. Une technologie pour
   laquelle aucun adaptateur n'existe reçoit un avertissement, qui dit que le
   code n'est pas vérifié.
4. **La dérogation vit dans `.ucm/derogations.json` et tombe au prochain
   export.** Une dérogation est une exception écrite par un développeur pour un
   écart précis, avec son motif et son nom. Elle vaut pour l'export du contrat
   qu'elle nomme. Votre prochain export de ce composant la fait tomber, et le
   rapport de cet export vous montre son motif. Elle n'a pas de date
   d'expiration.
5. **Un token retiré ne bloque pas votre demande de tokens.** Les contrats qui
   le citent deviennent « en retard sur les tokens », et le rapport les nomme
   pour que vous les réexportiez. Un contrat qui cite un token absent bloque
   seulement quand il est exporté après les tokens.
6. **Le retard n'a pas de délai en jours.** Il dure jusqu'à la prochaine demande
   d'un développeur qui modifie le code de ce composant. Cette demande rattrape
   le contrat ou pose une dérogation. Le rapport affiche depuis combien de jours
   chaque composant est en retard.
7. **P19 se fait avant P18.** intencial-library ne contient encore ni contrat ni
   code. Pour que son premier composant soit jugé par la nouvelle règle dès le
   premier jour, son socle épingle la CLI qui contient P19.

### Ce que la demande modifie, et le verdict

Chaque ligne porte un identifiant. Le test du verdict porte un cas par ligne,
sous le même identifiant (partie 3).

| Id | La demande modifie… | Verdict | Ce que le rapport dit |
|---|---|---|---|
| V-01 | seulement `tokens.json`, qui change des valeurs | passe | rien de plus qu'aujourd'hui |
| V-02 | seulement `tokens.json`, qui retire un token qu'un contrat cite | passe | les contrats à réexporter, « en retard sur les tokens » |
| V-03 | seulement `tokens.json`, devenu illisible ou d'une version que le repository ne lit pas | bloque | le geste, comme aujourd'hui |
| V-04 | seulement `tokens.json`, alors qu'un écart du code existe déjà | passe | l'écart, adressé à un développeur |
| V-05 | un contrat qui ajoute une variante que le code n'a pas | passe | le composant est « en retard sur son contrat » |
| V-06 | un contrat dont le composant n'a pas encore de code | passe | « pas encore d'implémentation », comme aujourd'hui |
| V-07 | un contrat qui cite un token absent de `tokens.json` | bloque | fusionner d'abord une demande de tokens ouverte, sinon remplacer les variables dans Figma et réexporter |
| V-08 | un contrat illisible, incomplet ou d'une version non lue | bloque | le geste, comme aujourd'hui |
| V-09 | le contrat d'un composant qui porte une dérogation | passe | la dérogation tombe, avec son motif et son auteur |
| V-10 | le code d'un composant, en laissant un écart avec son contrat, y compris quand la demande change aussi le contrat | bloque | l'écart, et le geste du développeur |
| V-11 | le code d'un composant en retard, sans rattraper le contrat (une correction de bug, par exemple) | bloque | l'écart à rattraper, ou la dérogation à poser |
| V-12 | du code partagé, qui crée un écart sur un composant dont le fichier n'a pas changé | bloque | l'écart et le composant touché |
| V-13 | du code sans lien avec un composant en retard | passe | le retard, listé avec son âge |
| V-14 | du code, avec une dérogation valide pour l'écart | passe | la dérogation, « à valider par le designer » |
| V-15 | une dérogation sans motif, sans auteur, mal formée ou qui couvre un écart non dérogeable | bloque | l'entrée fautive |
| V-16 | du code TypeScript, sans adaptateur chargé ou avec un fichier que l'adaptateur ne lit pas | bloque | le geste d'installation |
| V-17 | le code d'une technologie qu'aucun adaptateur ne lit | passe | « code présent, non vérifié » |
| V-18 | rien, c'est un envoi direct sur `main` sans demande de fusion | juge l'état de `main` | bloque sur un écart du code ni en retard ni dérogé, un contrat invalide, ou un contrat non en retard qui cite un token absent |
| V-19 | rien, c'est un contrôle lancé sur une copie sans historique complet | erreur d'invocation (code 2) | récupérer l'historique complet |
| V-20 | rien, c'est un contrôle lancé en local par un développeur ou son agent | comme V-18 | les fichiers non enregistrés comptent comme les plus récents |

### Ce qui change pour le mainteneur

Vous n'avez aucun nouveau geste. Vos exports et vos demandes de tokens passent
comme aujourd'hui. Le rapport de chaque export vous dit quel composant il met en
retard, et vous montre les dérogations que les développeurs ont posées. Vous
relisez une dérogation en lisant son motif dans ce rapport. Si vous la refusez,
vous dites à un développeur, ou à votre agent, de retirer la ligne du composant
dans `.ucm/derogations.json`. Si vous l'acceptez, vous changez Figma pour que le
contrat dise ce que fait le code, et l'export suivant la fait tomber.

### Ce qui change pour les développeurs

Une demande qui modifie le code d'un composant doit le laisser conforme à son
contrat. Un composant que le designer a mis en retard n'arrête personne, tant
que personne ne modifie son code. Le développeur qui le modifie le rattrape, ou
pose une dérogation motivée. Un repository TypeScript doit installer
l'adaptateur et enregistrer son fichier de verrouillage des dépendances
(`package-lock.json`).

## 2. Les décisions, une par question

### Les faits relevés

| Fait | Source |
|---|---|
| `bilanEstBloquant` refuse un contrat illisible, incomplet, hors de la fenêtre de version, au graphe incohérent ou aux types typographiques faux, et rien d'autre | `packages/kit/src/lecteurs/verdict-bilan.mjs` |
| Le verdict vaut `fautifs.length > 0 \|\| echecsDeTests.echoue`, et le terminal écrit « signalés sans bloquer » | `packages/kit/src/lecteurs/controle-repository.mjs`, `controlerRepository` |
| `bilan.manquants` liste les références du contrat absentes de `tokens.json` ; aucun contrôle ne lit les références de tokens écrites dans le code | `controle-repository.mjs` `analyser` ; recherche de `var(--` dans `packages/cli/src`, `packages/kit/src/lecteurs`, `packages/adapter-typescript/src` |
| Sans `--base`, le périmètre ouvre tous les bilans au rapport | `packages/kit/src/lecteurs/perimetre-rapport.mjs`, `perimetreDeLaDemande` |
| Un bilan entre dans le périmètre par son contrat ou par le fichier d'implémentation que le motif de `ucm.config.json` résout, un seul fichier par contrat | `perimetre-rapport.mjs` ; `packages/kit/src/lecteurs/implementation.mjs` `cheminImplementation` |
| Le workflow GitHub passe `--base` seulement sur une pull request ; l'envoi sur `main` lance `ucm check` sans base | `packages/cli/src/init.mjs`, `workflow` |
| Le job GitLab passe `--base` seulement dans une merge request (`CI_MERGE_REQUEST_DIFF_BASE_SHA`) ; le pipeline de la branche par défaut tourne sans base | `init.mjs`, `workflowGitlab` |
| Les deux workflows récupèrent l'historique complet (`fetch-depth: 0`, `GIT_DEPTH: "0"`), et deux tests le gardent | `init.mjs` ; `packages/cli/tests/cli.test.mjs`, `packages/cli/tests/gitlab.test.mjs` |
| `ucm rapport-gitlab` publie le fichier du rapport et ne calcule aucun verdict | `packages/cli/src/rapport-gitlab.mjs` |
| `ucm check` sort en 0, 1 (contrôles rouges) ou 2 (invocation ou configuration fautive) ; un `git diff` raté sort en 2 | `packages/cli/src/check.mjs` |
| La CLI ne découvre qu'un adaptateur, `@ucm-kit/adapter-typescript`, depuis la racine du repository | `packages/cli/src/adaptateur.mjs` |
| Sans adaptateur, un fichier présent devient `implementationNonLue` et le terminal écrit « implémentation présente, non lue », sans bloquer | `controle-repository.mjs` `ADAPTATEUR_VIDE` |
| Un adaptateur installé qui ne se charge pas fait sortir `ucm check` en 2, avant tout rapport, y compris sur la demande d'un designer | `packages/cli/src/ucm.mjs` |
| Le workflow saute `npm ci` quand `package-lock.json` manque, donc l'adaptateur ne se charge pas | `init.mjs`, étape « Installer la stack déclarée » |
| intencial-library suit 10 fichiers, dont `src/tokens/tokens.json`, aucun contrat et aucun code ; son workflow lance la CLI en version 0.1.48 avec `fetch-depth: 0` | `git ls-files` et `.github/workflows/ucm.yml` de la bibliothèque |
| `meta.exportedAt` est obligatoire dans un contrat | `packages/kit/src/lecteurs/validation-contrat.mjs` |
| L'Exporter n'ouvre aucune demande quand seul `meta.exportedAt` diffère, donc un nouvel `exportedAt` sur la base signale un vrai changement du contrat | `packages/plugin-exporter/src/depot.ts`, `sameContent` |
| `ucm.config.json` est lu par le plugin et par la CI, et refuse un champ de version | `packages/kit/src/format/configuration.ts` |
| `lireConfiguration` est dans la prise des modules | `packages/kit/invariants/versionnage.md` |
| L'écart de composition compte les occurrences sans suivre une boucle, et le message le dit | `packages/kit/src/lecteurs/diagnostic-parite.mjs` |
| `ucm guide` imprime `packages/cli/procedure.md` à l'agent du consommateur, dont la section « Ce qui ne se fait pas » | `packages/cli/procedure.md` ; relais écrit par `init.mjs` |
| Un verdict qui change sans changement de format relève de la classe 6 et se traite en semver de paquet | `docs/format/COMPATIBILITE.md` |
| Le kit est en 0.17.0, la CLI en 0.1.152, l'adaptateur en 0.2.10 | leurs `package.json` |

### Les critères

| Code | Critère | Origine |
|---|---|---|
| R | Robustesse. Un écart du code est refusé avant la fusion | CONCEPT.md, section 6 ; règle `ecart-de-code-bloque` de [decisions.json](../Evolutions%20globales/decisions.json) |
| D | Le designer n'est jamais bloqué par ce qu'il ne peut pas corriger, et fusionne seul ses tokens | règles `demande-de-tokens-sans-blocage` et `composant-en-retard-passe` |
| F | Aucune fausse alerte. Un refus vise la personne qui peut corriger, sinon elle contourne | situation des développeurs et de leurs agents |
| G | Aucun geste manuel à retenir, aucune configuration à écrire | consigne du mainteneur |
| U | Un seul verdict, le même en local, sur une demande et sur `main`, sur GitHub et sur GitLab | CONCEPT.md, section 5 ; risque GitLab de P19 |
| A | Un agent de code ne peut ni masquer un écart ni partir corriger un composant qui n'est pas sa tâche | situation des développeurs |
| M | Coût pour le mainteneur, à mi-temps et absent des revues techniques | règle `coeur-un-seul-mainteneur` |

Chaque case dit « bon », « moyen » ou « faible », avec sa raison.

### Question 1. Que juge ucm check sans demande de fusion ?

Un envoi direct sur `main` et un contrôle local n'ont pas de `--base`. Le
contrôle ne sait donc pas ce que « la demande » a modifié.

| Option | R | D | F | G | U | A |
|---|---|---|---|---|---|---|
| A. Sans base, tout écart du code bloque | bon | moyen, rien n'arrête une demande du designer, mais `main` rougit après elle | faible, `main` rouge après chaque variante ajoutée | bon | moyen, la demande et `main` divergent | faible, l'agent local corrige tous les composants en retard |
| B. Sans base, aucun écart du code ne bloque (règle actuelle) | faible, un écart fusionné de force reste vert sur `main`, et un agent local s'arrête au vert avec des écarts | bon | bon | bon | faible, le local est plus laxiste que la demande | faible, l'agent ne voit pas son propre écart |
| C. L'historique décide, le dernier modifié répond, avec ou sans base | bon, un écart que le code introduit bloque partout | bon | bon, le retard du designer n'arrête personne | bon, Git a déjà l'information | bon, une règle pour tous les cas | bon, l'agent bloque sur ce qu'il modifie |
| D. Le workflow passe le commit d'avant l'envoi comme base | moyen, le local reste sans règle | bon | bon | moyen, chaque consommateur réécrit son workflow, et un premier envoi n'a pas de commit d'avant | faible, le local diffère de la CI | moyen |

**L'option C est retenue.** Pour chaque composant, le contrôle compare deux
rangs, celui de la dernière modification du contrat et celui de la dernière
modification du fichier d'implémentation. Le rang se lit ainsi.

- Un fichier que la demande modifie (avec `--base`), ou modifié et non
  enregistré dans la copie de travail (sans `--base`), a le rang 0, le plus
  récent.
- Un autre fichier a le rang de son dernier commit sur la ligne principale,
  comptée en suivant le premier parent de chaque commit (`git log
  --first-parent`), depuis la base de la demande, ou depuis `HEAD` sans base.
  Le premier parent d'un commit de fusion est la branche qui reçoit, donc la
  ligne principale de `main` reste une suite simple.
- À rang égal, le code compte comme modifié. Une demande qui change le contrat
  et le code d'un même composant juge donc le code.

Le composant est en retard quand son contrat est plus récent que son code.
Sinon, son écart bloque. Le rapport d'un envoi sur `main` porte la liste des
composants en retard, avec le nombre de jours depuis la modification du contrat.

La CLI mesure les rangs avec Git, comme elle mesure déjà le diff. Le kit reçoit
ces rangs et décide. Une copie sans historique complet (`git rev-parse
--is-shallow-repository` répond `true`) sort en 2 et dit de récupérer
l'historique, comme un diff raté aujourd'hui. Un dossier qui n'est pas un dépôt
Git n'a pas de rangs. Aucun composant n'y est alors en retard, et le terminal le
dit.

Les autres options perdent pour ces raisons.

- **A** rend `main` rouge après chaque fusion d'une variante. C'est le premier
  risque écrit dans P19. Un `main` toujours rouge apprend à l'équipe à ignorer
  le rouge.
- **B** garde le défaut que P19 existe pour fermer, sur `main` et en local. Un
  agent qui boucle jusqu'au vert local s'arrête avec ses écarts.
- **D** demande de modifier le workflow de chaque consommateur, et laisse le
  contrôle local sans règle.

Le diff d'une demande ne suffit pas seul, même avec base. Une demande qui
modifie un fichier de types partagé peut créer un écart sur `Button` sans
modifier `Button.tsx`. Le diff ne voit pas ce composant. Le rang le voit, car
le code de `Button` est plus récent que son contrat (ligne V-12).

#### Ce qui ferait changer d'avis

- Un composant se répartit entre plusieurs fichiers (`Button.tsx`,
  `Button.module.css`) et un développeur modifie seulement le second. Le rang ne
  voit que le fichier que le motif résout. Il faut alors compter tous les
  fichiers du dossier dont le nom commence par l'identifiant du composant.
- La recette sur UCM-Playground montre qu'une forge fabrique un commit de fusion
  dont le premier parent n'est pas la base. Le rang avec `--base` ne dépend pas
  de ce commit, mais celui de `main` en dépend.
- Le calcul des rangs dépasse quelques secondes sur un dépôt réel. Il faut alors
  limiter l'historique lu aux chemins des contrats, du code et des tokens.

### Question 2. Un code présent sans adaptateur bloque-t-il ?

Le §7 du plan de conformité classe « la vérification n'a pas pu avoir lieu »
en avertissement, un trou de preuve. Le cas de intencial-library montre la
limite. Sans `package-lock.json`, le workflow saute `npm ci`, l'adaptateur ne se
charge pas, et chaque composant TypeScript serait déclaré « non lu » sans qu'un
seul écart puisse bloquer.

| Option | R | D | F | G | M |
|---|---|---|---|---|---|
| A. Avertissement toujours | faible, une installation cassée rend tout vert | bon | bon | bon | faible, la panne passe inaperçue |
| B. Blocage toujours | bon | faible, une demande du designer bloque pour une panne du code | faible, un repository Vue reste rouge à jamais | bon | moyen |
| C. Blocage quand un adaptateur officiel lit l'extension du code et ne lit pas le fichier ; avertissement sinon ; jamais sur une demande du designer | bon, une panne d'installation se voit à la première demande de code | bon | bon, le refus vise le développeur, qui l'installe | bon | bon |
| D. Sortie en erreur d'invocation (code 2) | bon | faible, la demande du designer échoue aussi, sans rapport | moyen, le filet du workflow écrit un message générique | bon | moyen |

**L'option C est retenue.** La CLI porte la table des extensions qu'un adaptateur
officiel lit, `.ts` et `.tsx` pour `@ucm-kit/adapter-typescript`, dans
`packages/cli/src/adaptateur.mjs`. L'extension du motif d'implémentation de
`ucm.config.json` décide si un adaptateur est attendu. Le noyau ne connaît
toujours aucune technologie. Trois cas bloquent une demande de code et un
contrôle sans base, avec le geste à faire :

- l'adaptateur attendu n'est pas installé ;
- il est installé et ne se charge pas, ce qui sort aujourd'hui en 2 avant tout
  rapport ;
- il est chargé et ne lit pas le fichier, par exemple un fichier hors de
  `tsconfig.json`.

Le deuxième cas cesse de sortir en 2. Le kit le reçoit comme un constat et
l'écrit dans le rapport, pour qu'une demande du designer passe malgré la panne.

Deux autres limites de lecture restent des avertissements, parce qu'elles sont
des trous de preuve et pas des écarts constatés :

- un type que l'adaptateur n'a pas résolu (`typesNonAnalyses`), comme
  aujourd'hui ;
- un compte d'occurrences de composition différent du contrat, quand le code en
  rend au moins une. Le comptage est statique et ne suit pas une boucle. Une
  composition jamais rendue (zéro occurrence) reste un écart qui bloque.

Les autres options perdent pour ces raisons.

- **A** laisse intencial-library dans l'état exact que P18 veut corriger, sans
  qu'aucun rapport ne le fasse savoir.
- **B** refuse sans fin un repository dont la technologie n'a pas d'adaptateur.
  Le développeur ne peut rien installer et pose des dérogations partout.
- **D** fait échouer la demande du designer sur une panne qu'il ne peut pas
  réparer, et sans rapport qui nomme la cause.

#### Ce qui ferait changer d'avis

- Un second adaptateur officiel existe. Sa ligne entre dans la table des
  extensions de la CLI.
- Les avertissements de composition reviennent sur des compositions qui ne
  viennent pas d'une boucle. L'adaptateur doit alors reconnaître une boucle, et
  le compte redevient bloquant.

### Question 3. Quelle forme pour la dérogation ?

#### Où elle vit

| Option | R | D | F | A | U |
|---|---|---|---|---|---|
| A. Un fichier `.ucm/derogations.json` | bon, chaque ajout se voit dans le diff | bon, une seule liste à montrer au designer | bon | bon, un seul fichier à surveiller et à interdire aux agents | bon, lu par le kit sur les deux forges |
| B. Une section de `ucm.config.json` | moyen | moyen | moyen | moyen | moyen, le plugin lit ce fichier, et `lireConfiguration` est dans la prise des modules, donc la changer engage une entrée de journal |
| C. Un commentaire dans le code, à la façon de `eslint-disable` | faible, dispersé dans les fichiers | faible, aucune liste | moyen | faible, c'est le geste qu'un agent fait par réflexe pour faire taire un contrôle | moyen |
| D. Un fichier à côté de chaque contrat | bon | moyen, la liste demande de parcourir les dossiers | bon | moyen, un fichier par composant à surveiller | bon |
| E. Une étiquette ou le texte de la demande de fusion | faible, perdue à la fusion | faible | moyen | moyen | faible, GitHub et GitLab diffèrent, et la CI devrait appeler leur API |

**L'option A est retenue.** Le chemin est fixe et ne se configure pas. Le dossier
`.ucm/` existe déjà chez le consommateur, il porte `conventions.md`.

#### Ce qu'elle couvre

| Option | R | F | A |
|---|---|---|---|
| Le composant entier | faible, tout écart futur passe | bon | faible, une ligne masque tout |
| Une famille d'écart (couleurs, structure) | moyen | bon | moyen, un écart nouveau de la même famille passe |
| Un écart exact, par son genre, sa prop et sa valeur | bon, un écart nouveau bloque | moyen, une ligne par écart | bon |
| Une combinaison de variantes | bon | moyen | bon |

**L'écart exact est retenu.** Il se nomme par son genre et ses coordonnées, tels
que le kit les rend pour chaque écart de parité :

| Genre | Coordonnées | Écart |
|---|---|---|
| `prop-absente` | `prop` | une prop du contrat absente du code |
| `type-incorrect` | `prop` | une prop dont le type du code diffère |
| `valeur-non-implementee` | `prop`, `valeur` | une valeur de variante absente du code |
| `booleen-sans-effet` | `prop` | une prop oui ou non sans effet sur l'affichage |
| `enum-sans-effet` | `prop` | une prop à variantes sans effet sur l'affichage |
| `composition-non-rendue` | `composant` | un composant imbriqué que le code ne rend jamais |

Une interface absente et une fonction introuvable ne se dérogent pas. Elles
empêchent toute autre comparaison, donc une dérogation sur elles masquerait
tout le composant. La combinaison de variantes entrera comme coordonnée quand le
vérificateur de rendu existera (P10, P20). Le kit refuse aujourd'hui une
coordonnée qu'il ne connaît pas.

#### Ce qu'elle contient

Chaque entrée porte cinq champs, tous obligatoires :

- `composant`, l'identifiant du contrat, comme `Button` ;
- `ecart`, l'objet qui porte le genre et les coordonnées ;
- `export`, la valeur de `meta.exportedAt` du contrat au moment de la pose ;
- `motif`, une phrase qui dit pourquoi le code s'écarte ;
- `par`, le nom de la personne qui en répond.

```json
{
  "derogations": [
    {
      "composant": "Button",
      "ecart": { "genre": "valeur-non-implementee", "prop": "variant", "valeur": "danger" },
      "export": "<valeur de meta.exportedAt dans Button.contract.json>",
      "motif": "La variante danger attend la validation du texte d'erreur par le produit.",
      "par": "Nom du développeur"
    }
  ]
}
```

La date de pose n'est pas écrite. Git la garde, et une seconde copie
divergerait. Un champ inconnu fait refuser l'entrée. Un champ ignoré laisserait
croire qu'il compte, la règle que `configuration.ts` applique déjà à un numéro
de version.

#### Quand elle tombe

| Option | R | D | F | G |
|---|---|---|---|---|
| Une date d'expiration | moyen | bon | faible, le contrôle rougit un jour où personne n'a rien touché, pour un développeur qui n'est pas concerné | faible, une date à choisir et à repousser |
| Un nombre de jours | moyen | bon | faible, même défaut | moyen |
| Jamais | faible, l'exception devient permanente sans relecture | moyen | bon | bon |
| Au prochain export du composant, par `meta.exportedAt` | bon, un changement du design la fait tomber | bon, le geste habituel du designer fait la relecture | bon, rien ne rougit sans demande | bon, aucune date à écrire |

**La chute au prochain export est retenue.** Une entrée dont `export` diffère du
`meta.exportedAt` du contrat ne s'applique plus. L'Exporter n'ouvre pas de
demande pour un export identique, donc un nouvel `exportedAt` signale un vrai
changement du composant. L'écart redevient alors un retard, puisque le contrat
est plus récent que le code, et la prochaine demande de code sur ce composant le
rattrape ou pose une dérogation nouvelle.

#### Comment le designer la relit

- Le rapport de la demande qui pose la dérogation l'affiche en tête.
- Le rapport de chaque demande de contrat ou de tokens finit par la liste des
  dérogations à valider, une ligne chacune, avec le composant, l'écart, le
  motif et l'auteur. Cette demande est la seule que le designer lit, et la
  liste lui demande un geste, ce qui fonde un message.
- Le rapport de l'export qui fait tomber une dérogation la cite, avec son
  motif, et dit que le prochain développeur qui modifie ce composant devra
  rattraper l'écart.

Le designer accepte une dérogation en changeant Figma pour que le contrat dise
ce que fait le code. Il la refuse en demandant à un développeur, ou à son agent,
de retirer l'entrée. Le rapport donne cette demande en une phrase à recopier.

Une entrée qui ne correspond plus à aucun écart (code corrigé, export plus
récent) est signalée « sans objet » en information. Elle ne bloque rien, pour
ne pas rougir un contrôle à cause d'un nettoyage oublié.

#### Comment un agent ne peut pas s'en servir pour masquer un écart

- Un écart nouveau n'est couvert par aucune ligne existante, puisque la portée
  est l'écart exact.
- Une interface absente et une fonction introuvable ne se dérogent pas.
- Un `motif` ou un `par` vide fait refuser l'entrée, donc la demande.
- La dérogation tombe au prochain export, donc elle ne survit pas à un
  changement du design.
- Le rapport de la demande qui la pose l'affiche en tête, devant le relecteur
  humain de la demande.
- `packages/cli/procedure.md`, que `ucm guide` imprime à tout agent qui
  implémente un contrat, interdit d'écrire dans `.ucm/derogations.json` et
  demande de rapporter l'écart au développeur.

Une limite reste. Un agent auquel un développeur demande de poser une
dérogation la pose. Le champ `par` nomme alors ce développeur, qui en répond.

#### Ce qui ferait changer d'avis

- Une même dérogation est reposée après chaque export du composant. Le contrat
  et le code divergent alors durablement, et la question revient au designer en
  réunion, pas à un mécanisme.
- La liste des dérogations à valider dépasse cinq lignes dans les rapports du
  designer pendant plusieurs semaines. Le rapport passe alors à un compte et à
  un lien vers la liste.
- P20 décide d'une dérogation sur une capture de référence. Le genre et la
  coordonnée `combinaison` s'ajoutent au même fichier.

### Question 4. Que devient un token retiré par une demande de tokens seuls ?

| Option | R | D | F | G |
|---|---|---|---|---|
| A. La demande passe. Un contrat qui cite le token devient « en retard sur les tokens ». Un contrat qui cite un token absent bloque seulement s'il est plus récent que les tokens ou modifié en même temps | bon, l'export qui cite un token inexistant est refusé | bon | bon | bon |
| B. La demande de tokens bloque tant qu'un contrat cite le token | moyen | faible, le designer ne fusionne plus seul | faible | faible, voir l'impasse ci-dessous |
| C. La demande passe, et un token absent ne bloque jamais (règle actuelle) | faible, un contrat peut citer un token qui n'a jamais existé | bon | bon | bon |
| D. La demande passe, puis tout contrat qui cite un token absent bloque toutes les demandes jusqu'au réexport | bon | moyen | faible, chaque développeur est bloqué par un export qu'il ne peut pas faire | bon |

**L'option A est retenue.** Elle applique la règle du dernier modifié au couple
contrat et tokens. Le contrat dépend des tokens comme le code dépend du contrat.

L'option B crée une impasse. L'Exporter ouvre une demande par fichier. Le
designer qui renomme un token doit fusionner soit les tokens, soit les contrats
en premier. La demande des tokens bloquerait parce que les contrats citent
l'ancien nom. La demande des contrats bloquerait parce que le nouveau nom n'est
pas encore dans `tokens.json`. Aucun ordre ne passerait.

Avec l'option A, l'ordre est celui que le rapport décrit déjà quand
`tokens.json` manque. Le designer fusionne les tokens, qui passent toujours. Les
contrats deviennent en retard sur les tokens. Il réexporte les composants que le
rapport nomme, et chaque export cite des tokens qui existent.

La demande de tokens seuls est élargie ainsi. Elle passe toujours, sauf si
`tokens.json` lui-même est illisible ou d'une version que le repository ne lit
pas. Ni un contrat invalide déjà présent, ni un écart du code, ni l'échec
relayé des tests du repository ne la bloquent. Le rapport les adresse à un
développeur. Un job de tests que le repository exige garde sa propre couleur.

L'état des composants touchés suit le rang. Un contrat qui cite le token retiré
est « en retard sur les tokens » jusqu'à son prochain export. Le code ne cite
aujourd'hui aucun token qu'un contrôle lise. Quand la règle « token inconnu » du
linter existera (P6), elle tournera sur les fichiers que le développeur
modifie, ce qui applique la même règle du dernier modifié.

#### Ce qui ferait changer d'avis

- L'Exporter apprend à déposer les tokens et les contrats dans une même demande.
  Un retrait pourrait alors bloquer tant qu'un contrat de la même demande cite
  l'ancien nom.
- Des contrats restent en retard sur les tokens pendant plusieurs exports. Le
  rapport des tokens doit alors nommer ces contrats plus haut.

### Question 5. Combien de temps un composant reste-t-il en retard ?

La question vient d'une phrase du §7 : « la prochaine demande d'un développeur
sur ce composant bloque ». Il reste à dire si cette demande peut encore passer
pendant un délai, et si un retard sans demande finit par bloquer quelque chose.

| Option | R | F | G | M |
|---|---|---|---|---|
| A. Pas de délai. La prochaine demande qui modifie le code du composant rattrape le contrat ou pose une dérogation. Le rapport affiche l'âge du retard | bon | bon, seul celui qui touche le composant est concerné | bon, rien à régler | bon |
| B. Un délai en jours après l'export, puis toute demande bloque | moyen | faible, le jour du délai, des développeurs étrangers au composant sont bloqués | moyen, un nombre à choisir | moyen |
| C. Un délai en jours pendant lequel la demande sur le composant passe encore | faible, un écart fusionné pendant le délai devient une dette | moyen | moyen | moyen |
| D. Le retard bloque la publication de la bibliothèque | moyen | moyen, une correction urgente d'un autre composant ne sort plus | faible, il faut un workflow de publication et une option nouvelle | moyen |

**L'option A est retenue.** Le délai est donc « jusqu'à la prochaine demande de
code sur ce composant ». La règle est automatique, puisque le rang la calcule.
Elle ne demande aucun réglage.

Le retard ne ment pas à l'utilisateur de la bibliothèque. Un écart de parité
est une partie de l'API absente du code, comme une variante, une prop ou un
type. La bibliothèque publiée n'offre pas encore ce que le contrat ajoute, et
TypeScript refuse qu'on l'appelle. Aucune variante existante n'est rendue faux
par ce retard.

Le retard reste visible :

- le rapport de l'export qui le crée nomme le composant et ce qui manque ;
- le rapport de chaque envoi sur `main` et de chaque contrôle local liste les
  composants en retard, avec le nombre de jours ;
- le rapport d'une demande qui modifie le composant le nomme en tête.

#### Ce qui ferait changer d'avis

- Le vérificateur de rendu (P10, P20) mesure les variantes déjà publiées. Un
  contrat qui change la couleur d'une variante existante rend alors la
  bibliothèque fausse pour ses utilisateurs. Il faudra un blocage avant la
  publication, l'option D, pour ces écarts de rendu seulement.
- Plus de trois composants restent en retard plus d'un mois. L'équipe ne
  rattrape pas les contrats au fil des demandes. Le mainteneur choisit alors
  entre l'option D et un temps de rattrapage planifié.
- Le mainteneur veut un rythme fixe (une version de la bibliothèque par
  sprint). L'option D s'attache alors au workflow de cette version.

### Question 6. P19 attend-elle P18 ?

| Option | R | F | M |
|---|---|---|---|
| A. Garder la dépendance, P18 puis P19 | faible, les premiers composants d'intencial-library sont écrits sous la règle laxiste, et leurs écarts deviennent une dette que la nouvelle CLI rougira d'un coup | faible, la montée de version rougit tout | moyen |
| B. P19 en parallèle de P18, sans ordre | moyen, l'ordre dépend du hasard | moyen | bon |
| C. P19 d'abord. P18 épingle la CLI qui contient P19 avant le premier composant | bon, le premier composant est jugé par la règle finale | bon, aucune dette à rattraper | bon, les tests du toolkit prouvent P19 sans intencial-library |

**L'option C est retenue.** P19 se prouve entièrement dans le toolkit. Les tests
du kit et de la CLI, dont `packages/cli/tests/recette.test.mjs` sur des
repositories temporaires, couvrent chaque ligne de la table. intencial-library
ne contient aucun contrat, donc elle ne prouverait rien de plus aujourd'hui.

Le dernier critère de fin de P19, « intencial-library épingle la nouvelle CLI »,
passe dans P18. P18 reçoit la dépendance inverse, vers P19.

#### Ce qui ferait changer d'avis

- Un composant entre dans intencial-library avant la fin de P19. Il faut alors
  le faire passer par une demande sous la nouvelle CLI dès sa publication, et
  traiter ses écarts dans cette demande.

### Ce que P19 ne change pas

La validité des contrats, la fenêtre de version, le graphe de composition, les
types typographiques et la lisibilité de `tokens.json` gardent leur verdict. Les
contrastes, l'architecture des tokens et les avertissements de l'export restent
des informations. Le rapport sans objet garde sa règle, sauf quand la demande
crée un écart bloquant, par exemple dans du code partagé (V-12). Un refus
s'écrit alors en entier.

## 3. Ce que la piste P19 devient

### Les fichiers

| Chemin | Action | Quoi |
|---|---|---|
| `packages/kit/src/lecteurs/diagnostic-parite.mjs` | modifier | Rendre les écarts identifiés (genre et coordonnées) ; composition rendue au moins une fois en avertissement ; textes qui disent que l'écart bloque |
| `packages/kit/src/lecteurs/derogations.mjs` | créer | Lire et valider `.ucm/derogations.json`, appliquer une entrée à un écart par `composant`, `ecart` et `export` |
| `packages/kit/src/lecteurs/perimetre-rapport.mjs` | modifier | Classer la demande en tokens seuls, contrats et tokens, code, ou sans base |
| `packages/kit/src/lecteurs/verdict-bilan.mjs` | modifier | Fonction du verdict par composant et par repository, selon le genre de demande, les rangs, les dérogations et l'adaptateur attendu ; en-tête du fichier |
| `packages/kit/src/lecteurs/controle-repository.mjs` | modifier | Nouvelles options `rangs`, `adaptateurAttendu` ; `bloquant` ; sections du rapport (retards, dérogations, adaptateur) ; phrase finale du terminal |
| `packages/kit/src/lecteurs/diagnostic-tokens.mjs` | modifier | Sévérité selon le rang du contrat et des tokens ; « en retard sur les tokens » |
| `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts` | modifier | Exporter et déclarer les nouveaux noms |
| `packages/kit/CARTE.md` | modifier | Ligne de `derogations.mjs` |
| `packages/cli/src/check.mjs` | modifier | Mesurer les rangs par Git (diff, `--first-parent`, copie de travail) ; refuser une copie sans historique complet en 2 |
| `packages/cli/src/adaptateur.mjs` | modifier | Table des extensions par adaptateur officiel ; rendre « absent » ou « cassé » comme un fait |
| `packages/cli/src/ucm.mjs` | modifier | Un adaptateur cassé ne sort plus en 2 ; le fait passe au kit |
| `packages/cli/procedure.md` | modifier | Ajouter à « Ce qui ne se fait pas » l'écriture dans `.ucm/derogations.json`, et dire qu'un composant en retard n'est pas la tâche de l'agent |
| `packages/cli/README.md`, `packages/kit/README.md` | modifier | Annoncer le verdict resserré, classe 6 de COMPATIBILITE.md ; décrire `.ucm/derogations.json` |
| `packages/plugin-exporter/invariants/diagnostics.md` | modifier | Règle du dernier modifié, demande du designer, adaptateur attendu, dérogation ; exception au rapport sans objet |
| `docs/guides/POUR-LES-DESIGNERS.md` | modifier | Écrire au §6 la règle appliquée, la table des cas et la relecture d'une dérogation ; retirer les quatre points ouverts sauf celui du linter |
| `CONCEPT.md`, `docs/format/COMPATIBILITE.md`, `docs/notes/Recherches/Linter Dev/PLAN-CONFORMITE-RENDU.md`, `VALIDATIONS-MVP.md` | modifier | Retirer « la CLI publiée avertit encore » ; §7 renvoie à ce document |
| `packages/kit/package.json`, `packages/cli/package.json`, `packages/adapter-typescript/package.json` | modifier | Montée de version et publication (skill `publier-paquets`) |

### Les tests

| Chemin | Action | Quoi |
|---|---|---|
| `packages/kit/tests/verdict-demande.test.mjs` | créer | Un cas par ligne V-01 à V-20, nommé par son identifiant, sur la fonction du verdict seule |
| `packages/kit/tests/derogations.test.mjs` | créer | Chaque refus d'entrée, chaque cas de masquage, l'entrée sans objet, la chute par `export` |
| `packages/kit/tests/diagnostic-parite.test.mjs` | modifier | Un écart identifié par genre ; interface et fonction absentes non dérogeables ; composition rendue zéro fois ou plus |
| `packages/kit/tests/perimetre-rapport.test.mjs` | modifier | Classement des demandes |
| `packages/kit/tests/verdict-bilan.test.mjs` | modifier | Retirer « une référence absente des tokens ne bloque pas le contrat », la remplacer par les cas du rang |
| `packages/kit/tests/controleRepository.test.mjs` | modifier | Rapport et terminal de chaque verdict ; un rapport bloquant ne contient ni « n'empêche pas la fusion » ni « ne bloque pas la fusion » pour un écart qui bloque |
| `packages/kit/tests/diagnostic-tokens.test.mjs` | modifier | Sévérité selon le rang |
| `packages/cli/tests/check.test.mjs` | modifier | Codes de sortie sur des dépôts Git temporaires, pour V-05 puis envoi sans base (0), V-10 (1), V-11 (1), V-12 (1), V-02 (0), V-16 (1), V-19 (2), V-20 avec un fichier non enregistré |
| `packages/cli/tests/cli.test.mjs`, `packages/cli/tests/gitlab.test.mjs` | vérifier | L'historique complet reste exigé ; GitLab lance la même commande |
| `packages/cli/tests/guide.test.mjs` | modifier | La procédure imprimée contient l'interdiction d'écrire dans `.ucm/derogations.json` |
| `packages/cli/tests/recette.test.mjs` | modifier | Attendus du dépôt temporaire, dont un écart qui bloque |

### Les lots

Un lot par appel d'agent. Chaque prompt d'implémenteur reçoit la note du lot, la
sortie de `npm run agents:lire -- <chemins du lot>`, les fichiers et les
critères de fin. Les phrases du rapport destinées au designer s'écrivent dans la
conversation principale, avec la skill `rediger-diagnostics-ucm`, et entrent
dans la note des lots 4 et 6.

| Lot | Agent | Périmètre | Critères de fin |
|---|---|---|---|
| 1. Écarts identifiés | `implementeur` | `diagnostic-parite.mjs`, `index.mjs`, `index.d.mts` des lecteurs, `diagnostic-parite.test.mjs` | Chaque genre du tableau de la question 3 a un test ; une interface absente rend un écart non dérogeable ; une composition rendue une fois pour trois attendues est un avertissement, zéro fois un écart ; `npm run test --workspace @ucm-kit/core` passe |
| 2. Dérogations | `implementeur` | `derogations.mjs` (créé), `index.mjs`, `index.d.mts`, `packages/kit/CARTE.md`, `derogations.test.mjs` (créé) | Fichier absent égale aucune dérogation ; JSON illisible, champ manquant, vide ou inconnu, genre inconnu et genre non dérogeable sont refusés avec leur chemin ; `export` différent ne s'applique pas ; une entrée ne couvre aucune autre valeur ; tests du kit verts |
| 3. Règle du verdict | `implementeur-exigeant` | `verdict-bilan.mjs`, `perimetre-rapport.mjs`, `verdict-demande.test.mjs` (créé), `perimetre-rapport.test.mjs` | Une fonction pure rend l'état de chaque composant et `bloquant` à partir des bilans, du genre de demande, des rangs, des dérogations et de l'adaptateur attendu ; les 20 cas V-01 à V-20 passent ; supprimer l'exception de la demande du designer fait échouer V-04, mutation vérifiée une fois ; supprimer la comparaison des rangs fait échouer V-05 ou V-12, mutation vérifiée une fois |
| 4. Branchement et rapport | `implementeur-exigeant` | `controle-repository.mjs`, `diagnostic-tokens.mjs`, `diagnostic-parite.mjs` (textes), `controleRepository.test.mjs`, `diagnostic-tokens.test.mjs`, `verdict-bilan.test.mjs`, `packages/plugin-exporter/invariants/diagnostics.md` | Les quatre critères de fin de P19 passent sur `controlerRepository` ; aucun texte d'un écart bloquant ne dit qu'il ne bloque pas ; le rapport d'une demande de contrat liste les dérogations à valider ; l'invariant cite l'autorité et `verdict-demande.test.mjs` |
| 5. Mesures de la CLI | `implementeur-exigeant` | `check.mjs`, `adaptateur.mjs`, `ucm.mjs`, `check.test.mjs`, `cli.test.mjs`, `gitlab.test.mjs` | Les codes de sortie de la table des tests passent sur des dépôts Git temporaires ; une copie superficielle sort en 2 avec le geste ; un adaptateur cassé n'empêche pas une demande de contrat de passer ; `npm run test:paquet -- cli` passe |
| 6. Consommateur | `implementeur` | `procedure.md`, `packages/cli/README.md`, `packages/kit/README.md`, `guide.test.mjs`, `recette.test.mjs` | La procédure porte les deux interdictions et un test les lit ; les README annoncent le verdict resserré ; `recette.test.mjs` passe |
| 7. Documents | `implementeur` | `POUR-LES-DESIGNERS.md`, `CONCEPT.md`, `COMPATIBILITE.md`, `PLAN-CONFORMITE-RENDU.md`, `VALIDATIONS-MVP.md` | Aucune phrase ne dit plus que la CLI avertit sans bloquer ; le §6 du guide reprend la table de la partie 1 ; `npm run agents:diff` ne liste aucun document périmé ; `node scripts/controle-style.mjs` rend « Style conforme » sur chaque fichier |
| 8. Publication | conversation principale, skill `publier-paquets` | trois `package.json` | `npm test` passe à la racine, dont `versionSuitLeContenu` ; le kit monte le dernier chiffre, car la prise ne change pas ; la CLI monte le chiffre du milieu, car un repository vert peut devenir rouge ; les trois paquets sont servis par le registre |

L'ordre suit les dépendances. Les lots 1 et 2 sont indépendants, le lot 3 les
attend, le lot 4 attend le lot 3, le lot 5 attend le lot 4. Les lots 6 et 7
viennent après le lot 5, le lot 8 en dernier.

### Les critères de fin de P19, à jour

- Un test montre qu'une demande qui modifie `Button.tsx` avec un écart de parité rend
  `bloquant: true` (V-10).
- Un test montre qu'une demande qui modifie seulement `Button.contract.json` et ajoute
  une variante rend `bloquant: false` et l'état « en retard sur son contrat »
  (V-05), puis l'envoi sur `main` sans base reste à `bloquant: false`.
- Un test montre qu'une demande de tokens seuls qui retire un token cité rend
  `bloquant: false` (V-02).
- Un test montre qu'une dérogation valide rend `bloquant: false` et l'affiche « à
  valider » (V-14) ; la même dérogation tombe quand `meta.exportedAt` change
  (V-09).
- Un test montre que du code TypeScript sans adaptateur chargé bloque une demande de code
  et laisse passer une demande de contrat (V-16, V-04).
- `node scripts/run-tests.cjs` passe dans `packages/kit`, `packages/cli` et à la
  racine, dont `versionSuitLeContenu`.
- Le kit, la CLI et l'adaptateur sont servis par le registre.

Le critère « intencial-library épingle la nouvelle CLI » passe dans P18.

### Ce qu'un test impose pour qu'aucun agent ne dévie

- `verdict-demande.test.mjs` porte la table de la partie 1. Un agent qui change
  une ligne du verdict fait échouer le cas qui porte son identifiant.
- Deux mutations vérifiées au lot 3 prouvent que le test garde l'exception du
  designer et la comparaison des rangs.
- `derogations.test.mjs` refuse chaque forme de masquage listée à la question 3.
- `controleRepository.test.mjs` refuse un rapport qui annonce « ne bloque pas »
  pour un écart qui bloque. La CLI publiée aujourd'hui écrit cette phrase, donc
  un retour en arrière se voit.
- `check.test.mjs` rejoue les cas sur de vrais dépôts Git, donc la mesure des
  rangs est prouvée avec la règle.
- `cli.test.mjs` et `gitlab.test.mjs` gardent l'historique complet dans les deux
  workflows, sans lequel le rang ne se calcule pas.
- `guide.test.mjs` garde l'interdiction faite aux agents du consommateur.
- L'invariant de `packages/plugin-exporter/invariants/diagnostics.md` nomme
  l'autorité et ces tests. `npm run agents:lire` le donne à tout agent qui
  touche `packages/kit/src/lecteurs/`.

Une limite reste. Un composant réparti entre plusieurs fichiers n'est suivi que
par le fichier que le motif résout (question 1). Aucun test ne peut la fermer
tant que la règle ne compte que ce fichier.

### Les questions de P19

Les cinq questions de P19 disparaissent, et la partie 2 y répond. Les trois
risques changent.

- « Après la fusion d'une variante par le designer, le CI de `main` devient
  rouge » se ferme par le rang (V-05, V-18).
- « Un délai en retard non encodé n'est jamais appliqué » se ferme, car le délai
  est la prochaine demande de code sur le composant, que le rang calcule.
- « Le parcours GitLab doit suivre le même verdict » se ferme, car
  `rapport-gitlab.mjs` publie le rapport sans le juger et le job GitLab lance la
  même commande.

Un risque nouveau s'ajoute. Monter la CLI dans un repository qui porte déjà des
écarts dont le code est plus récent que le contrat rend la demande de montée
rouge. Cette demande est le bon endroit pour les corriger ou les déroger.
UCM-Playground est dans ce cas possible, intencial-library ne l'est pas.

Les transverses T2, T3 et T4 de decisions.json reçoivent leur réponse, aux
questions 4, 5 et 3.

## 4. Glossaire

| Terme | Sens dans ce document |
|---|---|
| Demande de fusion | une proposition de modification du dépôt, pull request sur GitHub, merge request sur GitLab |
| Envoi direct | un `git push` sur `main`, sans demande de fusion |
| `--base` | l'option qui donne à `ucm check` le commit de départ de la demande, donc ce qu'elle modifie |
| Demande du designer | une demande qui ne modifie que des contrats et `tokens.json` |
| Demande de code | une demande qui modifie au moins un autre fichier |
| Parité | la comparaison entre les props du contrat et l'API du composant dans le code |
| Écart | une différence constatée entre le contrat et le code |
| Trou de preuve | une vérification qui n'a pas pu avoir lieu ; elle avertit sans bloquer |
| Adaptateur | le paquet qui apprend au contrôle à lire le code d'une technologie |
| Historique Git | le journal de toutes les modifications enregistrées du dépôt |
| Commit | une modification enregistrée dans l'historique |
| Ligne principale | la suite des commits d'une branche, en suivant le premier parent de chaque commit |
| Rang | la place de la dernière modification d'un fichier sur la ligne principale ; 0 pour un fichier que la demande modifie |
| En retard sur son contrat | le contrat a changé après le code, et le code ne le suit pas encore |
| En retard sur les tokens | `tokens.json` a changé après le contrat, et le contrat cite un token qui n'y est plus |
| Dérogation | une exception écrite par un développeur pour un écart précis, avec son motif et son nom |
| `meta.exportedAt` | le champ du contrat qui porte le moment de l'export |
| Copie superficielle | un clone qui n'a pas tout l'historique |
