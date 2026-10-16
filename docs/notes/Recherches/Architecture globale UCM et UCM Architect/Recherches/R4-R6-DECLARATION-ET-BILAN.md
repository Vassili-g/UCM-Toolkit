# R4 et R6. La déclaration du design system et le bilan du fichier

**Statut :** résultats de recherche des sujets R4 et R6 de
[PLAN-DE-RECHERCHE.md](../PLAN-DE-RECHERCHE.md). Les comportements à observer
dans Figma restent à faire ; la section 3 les liste.

Lecteur : le mainteneur, pour décider où ranger la déclaration et quels
contrôles le bilan porte.

## 1. R4. Où ranger la déclaration

### 1.1 Les faits

| Fait | Source |
|---|---|
| La déclaration des vocabulaires par position pèse environ 4 ko pour C1 et 13 ko pour C2, avant les termes et les refus | Estimation tirée de `mesurer-positions.mjs --json` |
| L'exporteur publie une branche, un fichier et une demande de fusion par export | [ROADMAP.md](../../../../../ROADMAP.md), ligne Forges |
| `tokens.json` porte déjà des données d'UCM à sa racine : `com.ucm.formatVersion`, `com.ucm.axes` | [FORMAT.md](../../../../format/FORMAT.md#partie-2--export-tokens) |
| DTCG admet `$extensions` à la racine et sur un groupe, sous un nom de domaine inversé | Brouillon DTCG, cité dans [R2-REFERENTIEL.md](./R2-REFERENTIEL.md#22-les-autres-systèmes) |
| La recette de Palettes vit déjà dans l'espace partagé `ucm_palettes` du document, que l'explorateur lit | [protocole.ts](../../../../../packages/couleur/src/protocole.ts) |

### 1.2 Ce qu'ils établissent

Une déclaration publiée dans un fichier séparé demanderait une seconde
demande de fusion à chaque export de tokens, ou un changement de la règle
« un fichier par export ». Rangée sous `$extensions["com.ucm.declaration"]` à
la racine de `tokens.json`, elle part dans la même demande que les tokens
qu'elle décrit. La CI lit alors la déclaration et les noms dans le même
fichier, au même commit : aucune empreinte n'est nécessaire pour détecter une
copie décalée.

Un développeur qui modifierait cette extension à la main la verrait écrasée
au prochain export, comme le reste de `tokens.json`. La règle existe déjà
pour les tokens.

La taille mesurée tient dans une entrée de donnée partagée, limitée à 100 ko
([R4-R8-R11-R13-QUESTIONS-COURTES.md](./R4-R8-R11-R13-QUESTIONS-COURTES.md#r4-les-données-partagées-dun-plugin)).

### 1.3 Proposition

| Élément | Lieu |
|---|---|
| Déclaration de travail | Espace partagé de l'Architecte, dans le document de la bibliothèque |
| Déclaration publiée | `$extensions["com.ucm.declaration"]` à la racine de `tokens.json`, écrite par l'export des tokens |
| Lecture par la CI | `ucm check` lit l'extension, sans fichier de plus dans `ucm.config.json` |
| Nomenclature par défaut | `@ucm-kit/core`, étendue ou remplacée par la déclaration |

## 2. R6. Les contrôles du bilan

### 2.1 Les mesures

| Relevé | C1 (760 feuilles) | C2 (2 415 feuilles) | Ce qu'il établit |
|---|---|---|---|
| Mode écrit dans un nom | 44 feuilles : les noms de marque servent de groupe dans `color-brands` alors qu'un axe porte ces modes | 1 443 feuilles | Une observation exacte. Pas un défaut en soi : les primitives de l'architecture UCM portent `light` et `dark` dans leur chemin. Un écart seulement contre une règle adoptée |
| Colonnes de modes identiques | 0 sur 10 feuilles à plusieurs modes | 1 160 sur 2 127 | Une observation exacte : ces feuilles ne varient pas entre les modes observés. Elle ne prouve pas que les modes sont inutiles |
| Valeur absente dans un mode | 0 | 256 feuilles | Une observation exacte, à conséquence certaine : `ucm tokens css` déclare ces valeurs `initial` |
| Collision de `normalizeName` | 0 | 0 | Aucun constat sur ces corpus ; l'exporteur la signale déjà |
| Terme à plusieurs profondeurs d'une collection | 17 | 72 | Signal de grammaire ; à juger avec une grammaire déclarée |
| Mots soudés | Non compté | 59 | Une observation exacte ; un écart contre une convention de forme adoptée |
| Séparateurs | Non compté | 36 formes | Une observation exacte ; un écart contre une convention de forme adoptée |
| Synonyme à la même place, couleurs | 7, aucun vrai | 79, trois vrais | Une hypothèse du détecteur, à juger |
| Complétude de `theme` contre la table du kit | Sans objet : C1 n'a pas de `theme` | Sans objet | À mesurer sur C3 |
| Écarts au profil d'architecture | Non mesuré | Non mesuré | À mesurer sur C3 avec les couches associées |

### 2.2 Le catalogue proposé

Trois natures de résultat se distinguent, indépendamment de la sévérité :

- **une observation** : un fait exact, qui ne demande rien par lui-même ;
- **un écart** : un fait contraire à une règle que l'équipe a adoptée, ou
  une conséquence certaine sur ce qui est publié ;
- **une hypothèse** : un rapprochement proposé par un détecteur, à juger.

La certitude d'un résultat, sa conséquence et l'obligation de le traiter
sont trois informations distinctes ([revue](../REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md#82-séparer-gravité-certitude-et-décision-de-publication)).

| Contrôle | Profil | Nature | Lieu | Sévérité |
|---|---|---|---|---|
| Mode écrit dans un nom | Socle | Observation ; écart si une règle adoptée l'interdit | Bilan, `ucm check` | Information |
| Colonnes de modes identiques | Socle | Observation | Bilan | Information |
| Valeur absente dans un mode | Socle | Écart : le CSS produit change | Bilan, `ucm check` | Avertissement |
| Chaîne d'alias qui n'aboutit pas | Socle | Écart : la valeur ne se résout pas | Explorateur (Diagnostics), bilan | Avertissement |
| Collision de `normalizeName` | Socle | Écart : deux variables, un chemin publié | Exporteur, bilan | Bloquant à l'export, comme aujourd'hui |
| Mots soudés, séparateurs, casse mélangée | Nomenclature, niveau forme | Observation ; écart contre une convention de forme adoptée | Bilan, `ucm check` sauf la casse | Information |
| Intrus ou flexion à une position déclarée | Nomenclature, niveau grammaire | Écart à la grammaire adoptée | Bilan, `ucm check` | Information ; avertissement en full UCM |
| Terme remplacé par un terme retenu | Nomenclature, niveau termes | Écart au terme adopté | Bilan, `ucm check` | Information ; avertissement en full UCM |
| Synonyme candidat | Nomenclature | Hypothèse | Boucle de jugement de l'Architecte | Aucune : une proposition |
| Couches, valeurs directes, portées, nuances | Profil d'architecture | Écart au profil adopté | Bilan, `ucm check` sur option | Information ; avertissement en full UCM |
| Complétude de `theme` | Profil d'architecture | Écart au profil adopté | Bilan | Information ; avertissement en full UCM |
| Garanties des palettes | Profil d'architecture | Écart à une garantie | Palettes ; résumé dans le bilan | Information |

Les sévérités suivent la règle d'`ucm check` : seule une variable manquante
bloque, et ce qui relève d'une architecture reste en information. Le full UCM
relève la sévérité des écarts à une règle adoptée, selon l'orientation du
mainteneur (pistes, section 13).

Chaque résultat dit aussi sa portée : les données examinées, les contextes
couverts et ce qui reste inconnu. Une palette conforme à sa recette ne prouve
pas que les variables du fichier suivent encore cette recette.

## 3. Les comportements à observer dans Figma

Ces gestes demandent le mainteneur ; aucun agent ne peut les faire.

1. Dupliquer le fichier du Playground, puis créer une branche Figma : la
   donnée partagée d'un plugin suit-elle ? Une fusion de branche la
   garde-t-elle ?
2. Exporter un relevé de l'explorateur (C6) pour lire la casse réelle des
   noms Figma.
3. Exporter le fichier remappé (C3), pour mesurer la complétude de `theme` et
   le profil.
