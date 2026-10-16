# Ce que les documents d'autorité apportent à la proposition

**Statut :** relevé de lecture. Il confronte la proposition
[ARCHITECTURE-GLOBALE-UCM.md](../ARCHITECTURE-GLOBALE-UCM.md) aux documents
qui font autorité, et consigne ce qui la confirme, la complète ou la
contraint. Aucune décision n'est prise.

Lecteur : le mainteneur, et l'agent qui poursuit la proposition.

Documents relus : [CONCEPT.md](../../../../../CONCEPT.md),
[FORMAT.md](../../../../format/FORMAT.md) (nommer un token, hypothèses,
tokens de variantes, export des tokens), la
[SPEC de l'exporteur](../../../../../packages/plugin-exporter/SPEC.md) (objet,
contexte, export des tokens, hors périmètre),
[l'architecture multimarque](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md)
en entier, la [SPEC de l'explorateur](../../../../../packages/plugin-explorateur/SPEC.md)
(lecture seule, architecture libre), les README du dépôt, du kit, du CLI, de
l'adaptateur TypeScript, de Palettes, de l'explorateur, de l'exporteur, du
moteur de couleur et du socle, le [plan du diff sémantique](../../Diff%20S%C3%A9mantique/PLAN-DIFF-SEMANTIQUE.md)
et la [conformité du rendu](../../Linter%20Dev/PLAN-CONFORMITE-RENDU.md).
La [spécification Palettes](../../Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
a été relue pour son vocabulaire, ses décisions, son périmètre, la planche
(section 9.4) et les variables (section 17). Non relus en entier : le détail
champ par champ de FORMAT.md et de la SPEC de l'exporteur, l'optimisation des
tokens.

## 1. Ce qui confirme la proposition

| Fait | Document | Ce qu'il confirme |
|---|---|---|
| L'explorateur « ne range aucune donnée de plugin dans le fichier », et aucun nom de collection n'y a de sens réservé | SPEC de l'explorateur, « Lecture seule » et « Architecture libre » | L'explorateur ne peut pas porter la déclaration ; il reste agnostique |
| L'exporteur exclut le multi-composant et le scoring | SPEC de l'exporteur, « Hors périmètre MVP » | Le bilan des composants du fichier entier n'appartient pas à l'exporteur |
| L'analyse d'un composant lit déjà l'état des tokens du dépôt (`lireAvantEcriture`) | SPEC de l'exporteur, « Analyses et publication » | L'aperçu de ce que l'export des tokens change dans le dépôt peut partir d'une lecture existante |
| `theme` « ne contient aucun choix du designer » ; « un script peut donc vérifier `theme` contre sa règle » ; UCM Palettes ne l'écrit pas | Architecture multimarque, section 2 | Le rôle de l'Architecte : vérifier `theme` et, plus tard, le poser |
| CONCEPT.md range les noms de l'API visuelle dans Figma, « accord designer–développeur » | CONCEPT.md, section 3 | La nomenclature se range dans le document Figma |

## 2. Ce qui complète la proposition

### 2.1 Des règles UCM déjà écrites, absentes de l'inventaire de R2

| Règle | Document | Où elle irait |
|---|---|---|
| Chaque propriété d'un composant Figma est liée à une variable de `components` | Architecture multimarque, section 2, règle 2 | Référentiel, règles des composants (R12) |
| Un composant lit une propriété `--theme-*` ou celle de son token de composant, jamais `--color-brands-*`, `--color-utilities-*` ni `--primitives-*` | Architecture multimarque, section 8 | Référentiel ; contrôle du code, par l'adaptateur ou une règle de lint (piste 3.2 des évolutions globales) |
| Les primitives suivent l'ordre palette, intensité, thème, cran : `primitives.colors.grass.soft.light.700` | Architecture multimarque, section 2 ; destination par défaut de Palettes | Première grammaire déclarée du référentiel |
| Les rôles `background`, `foreground`, `icon`, `border`, `ring`, lus sur le dernier segment d'un token, font autorité quand ils sont déclarés | FORMAT.md, section 2 | Référentiel : l'exporteur emploie déjà ce vocabulaire de rôles |
| Une `STRING` sous un segment `fontweight` ou `font-weight` devient une graisse | FORMAT.md, Partie 2 | Référentiel : un nom de segment qui change un type publié |
| Les noms `color-brands.params.*` et `exception.*` sont réservés aux réglages et aux exceptions de marque | Architecture multimarque, section 2 | Grammaire de `color-brands` ; domaine de l'Architecte |
| Un état sélectionné change de dossier ; la table ne lui donne pas de cible | Architecture multimarque, section 4 | Définition de `selected` dans le référentiel, à côté de sa reconnaissance par l'exporteur |

### 2.2 Des contrôles que l'architecture demande et qu'aucun produit ne fait

La section 10 de l'architecture multimarque les liste ; ils rejoignent le
catalogue du bilan ([R4-R6](./R4-R6-DECLARATION-ET-BILAN.md#22-le-catalogue-proposé)).

| Contrôle | Données lues | Lieu possible |
|---|---|---|
| Chaque marque et chaque thème ont une valeur pour toute variable de `theme` | Variables | Bilan de l'Architecte |
| Une colonne de marque ajoutée vise encore les palettes de la première marque | Variables : colonne identique à la première | Bilan ; même mesure que les colonnes de modes identiques |
| Une variable posée sur ce qu'elle ne peint pas | Contrats : la peinture située de chaque token | `ucm check`, ou l'exporteur à l'analyse |
| Un état qui ne vise pas sa variable (`hover` qui vise `solid/default`) | Contrats et table du kit | `ucm check`, sur option |

Les deux derniers lisent les contrats : ils ne relèvent pas du bilan des
variables mais du contrôle des composants.

### 2.3 Le renommage et le diff sémantique

Le plan du diff sémantique exclut la détection automatique d'un renommage de
token : une prop ou un token renommé y donne un retrait et un ajout, « aucun
renommage supposé ». La table de l'ancien nom vers le nouveau que R7 étudie
lui fournirait cette information sans deviner.

## 3. Ce qui contraint la proposition

| Contrainte | Document | Effet sur la proposition |
|---|---|---|
| Le format n'exige aucun renommage : « l'exiger imposerait au design system un renommage que rien ne justifie » | FORMAT.md, sections « Hypothèses » et 2 | La nomenclature reste facultative ; elle ne devient jamais une précondition de l'export ni un blocage de `ucm check` |
| « Aucun contrôle ne cite le nom d'un composant » | Conformité du rendu, section 2 ; ROADMAP | Les règles de l'Architecte portent sur des positions de grammaire, jamais sur `button` ou `alert` |
| Les noms de collections et le nombre de niveaux d'alias sont libres ; le fichier de référence n'impose pas sa structure | SPEC de l'exporteur, « Hypothèses » | Le profil d'architecture reste une option déclarée collection par collection |

## 4. Un fait à consigner pour la question 9

L'architecture multimarque nomme les quatre statuts `success`, `warning`,
`info` et `danger`, et `color-utilities` du Playground écrit `danger`. Les
tokens de composants du Playground écrivent `error`. La cible documentée
emploie donc `danger` ; le mainteneur n'a pas tranché la nomenclature pour
autant (question 9 de la proposition).

## 5. Ce que la spécification Palettes ajoute

| Fait | Section | Ce qu'il apporte |
|---|---|---|
| La planche porte une section « Quelle nuance pour quelle variable » : par dossier, le rôle, des exemples d'emploi, la nuance de chaque état et ses garanties | 9.4 | La définition des crans existe déjà dans Figma, par palette ; elle n'atteint ni `tokens.json` ni le dépôt |
| La recette rangée dans le fichier fait autorité ; le JSON exporté en est une copie (D10) | 3 | Le même modèle que la déclaration proposée : le document fait autorité, le dépôt reçoit une copie |
| Le plugin n'a aucun accès réseau ; la recette exportée se range à la main dans un dépôt (D6) | 3 | Aucun chemin automatique ne porte la recette jusqu'au dépôt aujourd'hui |
| Le plugin ne nomme jamais une couleur `primary` ou `danger` ; il ne devine pas à quoi sert une palette (D3, périmètre) | 3, 5 | Le rôle des palettes manque à la recette ; l'Architecte devrait le déclarer |
| Le plugin reconnaît ses variables par identifiant et range la dernière couleur écrite ; Gestion distingue « À jour », « Modifiés dans Figma », « Introuvables » | 17.2 | Un modèle pour l'Architecte : reconnaître une variable générée et une modification faite à la main (R5) |
| Les variables écrites s'exportent par UCM Exporter comme les autres, sans changement de son moteur | 17.5 | Palettes et exporteur restent découplés ; l'Architecte peut suivre la même règle |
