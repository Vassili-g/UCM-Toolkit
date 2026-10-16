# Suivi de la recherche sur l'architecture globale UCM

**Direction retenue : la [version minimale](./VERSION-MINIMALE.md)**, sans
nouveau plugin. Le reste du dossier devient des pistes pour plus tard. La
prochaine étape est sa mise en œuvre, sur décision du mainteneur.

Note de reprise pour l'agent qui poursuit ce chantier. Elle dit où en est
chaque sujet, ce qui a été établi et le prochain geste. La supprimer quand la
proposition d'architecture sera décidée.

## La demande du mainteneur

Repenser le rôle de chaque produit UCM (Contract Exporter, Palettes, Token
Explorer, kit et CLI) et le propriétaire de chaque information, pour un
design system fiable et automatisé, piloté par un designer. Points posés :
où ranger le contrôle des noms de tokens, le sort de l'onglet Intégrations de
l'explorateur, un plugin de vérification global, le lieu des définitions
propres à UCM, les icônes Font Awesome, la typographie. Le mainteneur a
ensuite demandé des axes de recherche par sujet, puis de les mener jusqu'à
pouvoir proposer le début d'une architecture globale.

## Orientation du mainteneur

Chaque outil UCM distingue deux périmètres : agnostique, utile à toute
structure, et full UCM, pour l'équipe qui suit toute l'architecture. Cette
orientation précède les autres décisions (proposition, en tête ; pistes,
section 13). Réponses du mainteneur : périmètre réglé par outil ; contrôles
plus stricts en full UCM ; Palettes doit pouvoir désactiver ses fonctions
propres à UCM ; l'Architecte comme hub qui montre le niveau d'adoption et
les étapes suivantes (pistes, section 14).

## Décision prise

L'onglet Intégrations de l'explorateur est retiré. Le moment du retrait de
chaque intégration reste ouvert (question 3 de la proposition).

## Les documents du dossier

```text
Architecture globale UCM/
  VERSION-MINIMALE.md           la direction retenue, à lire en premier
  ARCHITECTURE-GLOBALE-UCM.md   la proposition complète, pistes pour plus tard
  PLAN-DE-RECHERCHE.md          les sujets R1 à R13 et le corpus C1 à C6
  SUIVI.md                      cette note
  PISTES-DE-REFLEXION.md        options et questions des sujets ouverts, sans contenu rédigé
  VUE-D-ENSEMBLE.html           la présentation visuelle, sans interaction
  Maquettes/MAQUETTE-ARCHITECTE.html  le plugin d'architecture en seize écrans, thème sombre, piste pour plus tard
  Recherches/
    R2-REFERENTIEL.md           inventaire du code, contradictions, marché
    R3-NOMENCLATURE.md          mesures sur C1 et C2, concordance du marché
    R4-R6-DECLARATION-ET-BILAN.md  lieu de la déclaration, catalogue du bilan
    R4-R8-R11-R13-QUESTIONS-COURTES.md  données partagées, descriptions, typographie, agents
    R1-R9-RELEVES-LOCAUX.md     poids des plugins, ce que touche le retrait de l'onglet
    LECTURE-DES-DOCUMENTS.md    ce que les documents d'autorité confirment, complètent, contraignent
    Nomenclature initiale/      la première recherche, venue de l'explorateur,
                                et ses trois rapports bruts
  Mesures/
    mesurer-positions.mjs       vocabulaire par position, synonymes à la même place
    rapprocher-termes.mjs       six relevés de synonymie et de forme
    inventorier-noms.mjs        inventaire des termes d'un tokens.json
    generer-section-pistes.mjs  régénère la section 13 de la page depuis PISTES-DE-REFLEXION.md
    tokens-slice-exemple.json   C2, fichier client : jamais commité
```

La présentation visuelle reprend les documents ; une modification se fait
d'abord dans le document, puis dans la page.

## L'état de chaque sujet

Statuts : **documenté**, sources lues ou mesures faites ; **éprouvé**, essayé
en situation de travail ; **décidé**, tranché par le mainteneur. Aucun sujet
n'est encore éprouvé.

| Sujet | État | Prochain geste |
|---|---|---|
| R1 Découpage en plugins | Poids des plugins relevé | Mesurer l'ouverture dans Figma après `npm run build` ; observer des designers |
| R2 Référentiel | Documenté | Attendre la question 4 (langues) ; proposer le schéma d'entrée en détail |
| R3 Nomenclature | Mesuré et documenté | Décisions du mainteneur : `error`/`danger`, singulier des groupes, forme des tailles |
| R4 Déclaration | Documenté ; essais faits ; limite de 100 ko par entrée | Gestes Figma : duplication, branche, lecture depuis un fichier consommateur |
| R5 Plugin d'architecture | Non commencé | Exporter C3 ; relever avec le mainteneur comment il a remappé son fichier |
| R6 Bilan | Mesuré sur C1 et C2 | Mesurer la complétude de `theme` et le profil sur C3 |
| R7, R10, R12 | Non commencés, sauf la documentation des icônes | Selon l'ordre du plan |
| R8, R11, R13 | Documenté ; R8 essayé | Essais Figma de R4-R8-R11-R13-QUESTIONS-COURTES.md |
| R9 Retrait de l'onglet | Inventorié | Choisir l'ordre du retrait (question 3) |
| Icônes (R10) | Recherche documentaire faite, résumée en section 7 de la proposition | Les trois essais de la section 7.2 |

## Ce qui est établi

1. Les relevés de forme (mots soudés, séparateurs, modes dans les noms) sont
   justes sans nomenclature déclarée.
2. La détection de synonymes échoue tant que la grammaire de chaque
   collection n'est pas déclarée : les composants rangent leurs segments dans
   des ordres différents. Ordre retenu : forme, grammaire, termes.
3. Le message de l'exporteur pour un état inconnu recommande `press` et
   `disable`, contre `pressed` et `disabled` dans la table du kit.
4. L'export des tokens ne publie aucune `$description` ; Palettes marque
   chaque variable qu'il écrit (`setSharedPluginData`), ce qui rend inutile
   l'association manuelle de l'explorateur.
5. Aucun design system public ne traduit ses définitions. Spectrum publie
   positions, vocabulaires et règles comme des données.
6. La déclaration peut voyager dans `tokens.json`, sous `$extensions`, sans
   changer la règle « un fichier par export ».

## La couverture de la demande initiale

La section 12 de [VUE-D-ENSEMBLE.html](./VUE-D-ENSEMBLE.html) confronte
chaque point de la demande aux documents. Le mainteneur ne veut aucun contenu
rédigé à ce stade (ni nomenclature, ni référentiel, ni parcours écrit) :
seulement des pistes. [PISTES-DE-REFLEXION.md](./PISTES-DE-REFLEXION.md) les
liste pour quinze sujets ; la page en reprend le détail, section 13, générée depuis ce document. La suite consiste à approfondir une piste à la demande
du mainteneur, par une mesure ou une recherche, jamais par la rédaction du
contenu lui-même.

Le mainteneur ne tranche aucune question pour l'instant : les consigner,
sans les décider.

## Les axes à creuser en priorité

L'ordre est celui de la section « Ordre proposé » du
[plan](./PLAN-DE-RECHERCHE.md#ordre-proposé), repris de la revue : d'abord un
changement réel de composant, de Figma jusqu'au code, sur la bibliothèque
Intencial ; puis la reprise d'un existant et la création selon le profil ; le
bilan ; `theme` ; le renommage ; le découpage en produits. Les essais Figma de
R4, R7 et R8 sont faits : la donnée suit la duplication mais pas la
bibliothèque ; la description s'affiche entière en infobulle ; le renommage
garde les liaisons.

## La revue externe

[REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md](./REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md)
relit le dossier. Ses arbitrages (section 12) attendent la réponse du
mainteneur (question 16 de la proposition). Ses corrections sont appliquées
au dossier :

- le catalogue du bilan qualifie de « juste » un mode écrit dans un nom, alors
  que les primitives de l'architecture multimarque portent elles-mêmes
  `light` et `dark` dans leur chemin : une observation n'est pas un défaut ;
- les statuts « Fait » du suivi et de la page se lisent comme une validation ;
  il faut distinguer documenté, éprouvé en situation et décidé ;
- « un écrivain par collection » ne tient pas : `primitives` porte aussi des
  espacements, des durées et la typographie ; la proposition dit désormais
  que chaque outil entretient ce qu'il a produit ;
- le cycle d'un changement manquait : pistes, section 15 ;
- l'ordre des recherches part d'un changement réel de composant.

## Contraintes pour l'agent qui reprend

- `tokens-slice-exemple.json` (C2) est un fichier client : ne pas le commiter,
  ne citer ni ses marques ni ses termes métier.
- Le quota du mainteneur est bas : lancer un agent seulement pour une
  recherche documentaire, sur Sonnet, effort bas ou moyen, à la demande du
  mainteneur.
- Un hook de style relit chaque document écrit ; charger d'abord la skill
  `.agents/skills/rediger-sans-tics-ia/SKILL.md`. Un sigle absent de
  `ACRONYMES` dans `scripts/controle-style.mjs` est refusé.
- Rien de ce dossier n'est commité. Commiter par chemins explicites, sur
  `main`, seulement à la demande du mainteneur.
