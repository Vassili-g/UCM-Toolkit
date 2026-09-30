# Mission : la direction globale de l'intégration du marché dans UCM Palettes

Ce document est la consigne donnée à un agent IA. Il se lit en entier avant
de commencer.

Tu es chargé d'assembler cinq propositions successives en une direction
unique pour UCM Palettes, de mener les recherches qui manquent pour la
trancher, et de la démontrer. Le mainteneur, designer UX/UI et seul testeur,
veut être sûr de la solution avant qu'un développement commence. Ta
direction doit donc couvrir les cas limites autant que le parcours nominal,
et chaque affirmation doit se vérifier.

## Ce que tu produis

Tous les fichiers vont dans ce dossier, `06 Direction globale/` :

| Fichier | Contenu |
|---|---|
| `DIRECTION-GLOBALE.md` | La direction, ses décisions, et l'inventaire de **toutes** les modifications qu'elle entraîne, décrit plus bas |
| `MAQUETTE-DIRECTION-GLOBALE.html` | Une maquette interactive qui démontre le parcours du designer et chaque fonctionnalité, cas limites compris, décrite plus bas |
| `generer-maquette-direction-globale.mjs` | Le script qui écrit la maquette et y embarque le moteur du dépôt |
| `verifier-maquette-direction-globale.mjs` | Le script qui joue chaque scénario de la maquette dans Chromium et imprime le résultat des contrôles |
| `mesurer-direction-globale.mjs` | Le script qui imprime chaque mesure du moteur que `DIRECTION-GLOBALE.md` cite |

Mets aussi à jour la ligne `06 Direction globale` de [README.md](../README.md)
quand tes livrables existent : son lien vise `DIRECTION-GLOBALE.md`, son statut
dit « À valider ».

Tu ne modifies ni le code des paquets, ni la spécification, ni
l'architecture, ni `CONTRIBUTING.md`, ni `AGENTS.md`. Ta direction décrit ces
modifications ; le mainteneur les appliquera après validation. Tu ne commites
rien.

## Le contexte

UCM Palettes est un plugin Figma du dépôt. Il fabrique des palettes de
couleurs à partir d'une couleur de référence, juge leurs garanties de
contraste sur une table fixe d'emplois, range tous ses nombres dans une
recette stockée dans le document, et dessine une planche de documentation.
Il n'écrit aucune variable Figma aujourd'hui.

L'architecture multi-marques range les couleurs en trois collections :
`primitives` (le neutre et les quatre utilitaires), `brand` (un mode par
marque) et `theme` (les alias que les composants citent, en `light` et
`dark`). Pour six marques, le designer saisit aujourd'hui 710 valeurs à la
main. La [comparaison avec les outils du
marché](../../RECHERCHE-CONCURRENCE-PALETTES.md) est la demande initiale : elle
retient l'écriture de ces variables comme apport principal, puis la couleur
de la sélection, le jeu de départ et la vision simulée. Elle juge toute
proposition sur quatre questions de sa section 1 ; ta direction y répond.

Cinq documents ont suivi, rangés dans ce dossier et résumés dans
[README.md](../README.md). Le dernier, [la revue
critique](../05%20Revue%20critique/REVUE-CRITIQUE-TROIS-ETAPES.md), conclut ainsi :
garder l'organisation des écrans et le vocabulaire de [la proposition en trois
étapes](../04%20Parcours%20en%20trois%20%C3%A9tapes/PROPOSITION-TROIS-ETAPES.html),
y reloger les règles d'écriture et les cas limites de [la proposition
finale](../03%20Proposition%20finale/PROPOSITION-FINALE.md), puis éprouver le
résultat sur un prototype interactif. C'est ton point de départ.

## À lire avant d'écrire

Lis dans cet ordre. Les documents du dossier se lisent en entier ; pour le
reste, les sections nommées suffisent.

1. [AGENTS.md](../../../../../../AGENTS.md) : la carte du code, en particulier
   `packages/couleur/` et `packages/plugin-palettes/`, et les invariants
   d'UCM Palettes.
2. [CONTRIBUTING.md](../../../../../../CONTRIBUTING.md) : « Interface du
   plugin », « Les surfaces d'UCM Palettes », « Le protocole de relecture »,
   « Rédiger un document ».
3. La skill [`rediger-sans-tics-ia`](../../../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md),
   avant d'écrire la moindre phrase.
4. [La spécification](../../RECHERCHE-PLUGIN-PALETTES.md) : décisions D1 à
   D10, sections 5, 6.7, 8, 9, 11, 16, 17 et 18, et toutes les exigences
   `[UI-*]`, `[ENT-*]`, `[PLA-*]`, `[REC-*]` et `[VER-*]`.
5. [L'architecture
   multi-marques](../../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
   sections 1 à 4, puis les décisions D1 à D17 de sa [vue
   illustrée](../../../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html),
   qui la modifient, et le lot A3 du [plan
   d'intégration](../../../Archi%20Tokens%20Multi-marques/PLAN-INTEGRATION-ARCHITECTURE.md) :
   six collections de couleur au lieu de trois. La section « Le contexte »
   ci-dessous décrit encore l'ancienne forme.
6. [La comparaison avec le marché](../../RECHERCHE-CONCURRENCE-PALETTES.md).
7. Ce dossier, dans l'ordre de [README.md](../README.md) : la proposition
   initiale pour l'origine des pistes, la revue de l'atelier et le code de son
   prototype, la proposition finale en entier avec son annexe, la proposition
   en trois étapes et son générateur, la revue critique et son script.
8. Le code que les propositions citent : dans `packages/couleur/src/`,
   `index.ts`, `promesses.ts`, `emplois.ts`, `ajustement.ts`, `palette.ts`,
   `recette.ts` ; dans `packages/plugin-palettes/src/`, `edition.ts`,
   `ajustementDeLaReference.ts`, `ui/ongletPalettes.ts`,
   `ui/ongletPlanche.ts`, `planche/fraicheur.ts`, `ecriture/`, `lecture.ts`,
   `fenetre.ts`, `messages.ts`.
9. L'interface réelle, dans sa galerie :
   `npm run galerie --workspace ucm-palettes-plugin`, puis la page produite
   dans `packages/plugin-palettes/dist/`. Ta maquette en reprend la facture.

## Ce qui ne se négocie pas

Ces règles viennent de la spécification et de l'architecture. Ta direction
les garde ; si l'une t'en empêche, dis-le dans la section « Ce qui reste à
prouver » au lieu de la contourner.

- La recette rangée fait autorité (D10). Toute valeur écrite dans Figma se
  rattache à elle, retouches adoptées comprises.
- Un numéro de cran vaut un contraste, et la table des emplois reste fixe
  (D9).
- La couleur de référence garde ses octets dans le profil porteur
  (`[MOT-17]`).
- Le plugin assemble les noms que le designer donne et n'en invente aucun
  (D3).
- Les garanties se jugent en WCAG 2. Une garantie manquée n'empêche pas
  d'écrire (`[VER-07]`). Une alerte mène au réglage qui la lève (`[VER-08]`).
- Rien ne s'écrit dans Figma sans un geste du designer, et une valeur de
  Figma que le plugin n'a pas écrite ne s'écrase jamais sans décision.
- Le plugin reconnaît ses ressources par identifiant, jamais par leur nom.
- La fenêtre s'ouvre à 600 × 720 et descend jusqu'à 500 × 520
  (`packages/plugin-palettes/src/fenetre.ts`) ; `[UI-03]` fixe ce qui se lit
  sans défiler à chaque taille.

## Les retours à intégrer

La revue critique liste ses constats et huit recommandations. Traite chacun :
adopte-le, modifie-le ou écarte-le, avec la preuve qui fonde ton choix. Un
constat sans réponse est une faute du livrable. Voici la liste à couvrir.

**Les onze cas limites** que la proposition en trois étapes ne dessine pas.
Chacun reçoit une règle, un écran de la maquette et un scénario jouable :

1. la recette et Figma ont changé tous deux (comparaison à trois valeurs) ;
2. une valeur sans provenance : variable créée à la main au bon chemin, mode
   ajouté hors du plugin, première liaison à des variables existantes ;
3. le fichier change pendant la relecture ;
4. une sortie échoue : police absente, limite de modes de l'offre du
   fichier ; bilan, reprise sans doublon ;
5. une famille existe dans une marque et manque dans une autre ;
6. un mode de `brand` créé hors du plugin ;
7. une retouche sur le cran de la référence, ou sur `brand.identity` ;
8. plusieurs retouches dans une palette ;
9. le nombre de nuances change, une palette est supprimée, une destination
   change : variables créées et variables laissées sans palette ;
10. deux palettes visent la même destination, ou une collection homonyme
    existe ;
11. l'annulation d'une écriture.

**La vue du système.** Reloge chaque fonction de l'onglet Palettes actuel :
état du cadre de chaque palette, « Afficher dans Figma », garanties lues côte
à côte, carte d'une palette supprimée (`[PLA-27]`), export et import de la
recette (`[REC-07]`, `[REC-08]`), export du rapport (`[VER-01]`), résultat
d'un dessin (calques étrangers, écarts de peinture). Une retouche faite dans
Figma doit se voir sans aller jusqu'à l'étape d'écriture. La revue propose de
faire de l'onglet Appliquer cette vue ; tu peux proposer mieux.

**La correction proposée.** Sur l'exemple de Bleu A, la plus petite
correction rend les garanties mais laisse les nuances 50 et 100 à 1,01:1 et
crée un saut de 2,07:1 entre 300 et 400. Définis un critère de régularité de
la rampe, mesure-le sur plusieurs rampes, et décris la correction qui le
respecte. Traite aussi la palette calculée qui manque une garantie (Vert
`#16A34A`, Vivid, Thème Light) : articule la correction avec le lien vers le
réglage (`[VER-15]`) et « Ajuster la référence » (`[UI-15]`). Dis ce que
l'écran affiche quand aucune correction n'atteint le résultat de la rampe
calculée. Traite la charte dont la couleur tombe sur un autre cran que celui
où le moteur l'ancre, et la rampe lue sur un seul thème.

**La destination.** Elle remplace le rôle de la proposition finale sans en
porter les contraintes. Dis où se choisissent les intensités, comment une
palette rejoint `primitives` ou une marque, où paraît « Référence exacte
dans », et comment une palette existante change de destination (aperçu de
conversion de la proposition finale, piste 1).

**Le périmètre.** Tranche la place de « Dans mes variables » (piste 12 de la
proposition finale) et de la reprise d'une rampe existante (piste 11) dans
l'ordre des lots.

**Le parcours.** Tranche le nombre, les noms et la numérotation des onglets ;
la portée de chaque onglet, palette ouverte ou fichier ; l'accès court au
dessin de la planche seule ; le sélecteur de palette dans une étape qui porte
sur le fichier.

**Les chiffres et les mots.** Définis l'unité affichée au designer, et garde
les trois unités de la proposition finale dans le détail : variables créées,
valeurs par mode écrites, cadres dessinés. Remplace le libellé « Garder la
couleur de Figma » par un libellé qui dit l'effet sur la recette.

**Les points secondaires** de la section 10 de la revue : palettes proches et
marque inconnue, plusieurs designers dans le même fichier, effet d'un réglage
commun au moment du geste, aperçu hors de vue pendant un réglage, fonds lus
sur le neutre, statuts vérifiés palette par palette, essai sans cas limite.

Enfin, donne un verdict sur chacune des quatorze pistes et des dix-neuf
décisions V0 à V18 de la proposition finale : gardée, modifiée ou écartée,
avec la raison.

## Les recherches à mener

Cherche ce qui manque pour trancher, dans la documentation officielle, le
code des outils ouverts et les articles de praticiens. Cite chaque source.
Sépare ce qui est documenté de ce qui reste à essayer dans Figma.

1. **L'API des variables de Figma.** `createVariable`, `setValueForMode`,
   `addMode` et ses limites par offre, `createVariableAlias`, `scopes`,
   `setVariableCodeSyntax`, les données de plugin sur une variable et leur
   survie à la publication, `variableCollectionId` en lecture seule, les
   collections étendues, les collections d'une bibliothèque distante, le
   comportement de `commitUndo` sur une écriture de variables, le coût
   d'écriture de 716 valeurs. Confronte le résultat aux huit essais dans
   Figma de la proposition finale et complète-les.
2. **La revue avant écriture et les conflits.** Comment le dialogue de mise à
   jour des bibliothèques de Figma, Tokens Studio et sa synchronisation, les
   outils de fusion à trois versions et les gestionnaires de tokens
   présentent une différence à trois valeurs, une décision groupée, un échec
   partiel et une reprise. Retiens ce qui tient dans 500 px de large.
3. **L'organisation d'un plugin étroit.** Onglets, étapes, vue d'ensemble et
   détail dans les plugins de palettes relevés par la recherche et dans les
   plugins Figma à forte audience. Mesure ce qu'un pied fixe laisse de hauteur
   utile à 520 px.
4. **La correction d'une rampe sous contraintes.** Comment Leonardo,
   Harmonizer, Huetone et la littérature sur les échelles perceptives
   gardent une rampe régulière : clarté monotone, écart borné entre
   voisines. Propose un critère mesurable, et mesure-le avec le moteur sur
   Bleu A de la proposition en trois étapes et sur au moins trois autres
   rampes, dont une où la rampe calculée manque une garantie.
5. **Plusieurs designers dans un fichier.** Ce qu'un plugin sait de l'auteur
   d'une modification, ce que coûte la permission `currentuser`, ce que les
   données partagées d'un document permettent de tracer.

## Ce que la direction doit trancher

Pour chaque question, `DIRECTION-GLOBALE.md` donne l'option recommandée, les
options écartées, la preuve et ce qu'un refus entraîne :

- les onglets : nombre, noms, ordre, numérotation, onglet ouvert au lancement
  dans un fichier vide et dans un fichier qui a des palettes ;
- la vue du système et la place de chaque fonction de l'onglet Palettes
  actuel ;
- le modèle de destination, ses contraintes et sa conversion ;
- les règles d'écriture des variables, reprises de la proposition finale ou
  modifiées ;
- la correction proposée et son critère ;
- la reprise d'une rampe existante et la liaison à des variables existantes ;
- l'unité affichée et le calcul de chaque compte ;
- le dessin de la planche seule ;
- les marques : ajout, renommage, retrait, limite de modes ;
- le jeu de départ et la règle d'une famille commune à toutes les marques ;
- l'alerte des palettes proches et sa portée ;
- la vision simulée et sa place ;
- les réglages communs et l'affichage de leur effet ;
- les fonds lus sur le neutre ;
- plusieurs designers dans un fichier ;
- les aides et la langue des planches ;
- l'ordre des lots.

## Livrable 1 : `DIRECTION-GLOBALE.md`

Le document suit ce plan.

1. **En-tête.** Objet, lecteur, statut (le document ne décide rien),
   commandes de régénération et de vérification.
2. **Synthèse.** La direction en une page : le parcours, les écrans, les cinq
   décisions qui fixent la forme du plan, ce que le designer y gagne par
   rapport au plugin actuel.
3. **Le parcours.** Un tableau par scénario : les douze scénarios de la
   proposition finale, les dix situations de la proposition en trois étapes
   et un scénario par cas limite, fusionnés sans doublon. Pour chacun, les
   gestes, les écrans, les changements d'onglet, et l'identifiant du scénario
   dans la maquette.
4. **Les écrans.** Chaque écran et chaque état : contenu, rang de chaque
   objet selon la table de CONTRIBUTING, compte d'objets du protocole de
   relecture, ce qui se lit sans défiler à 600 × 720 et à 500 × 520.
5. **L'écriture des variables.** Chemins, comparaison à trois valeurs,
   provenance, propriété par identifiant, relecture au clic, étapes de
   l'écriture, bilan, reprise, annulation. Chaque règle dit si elle vient de
   la proposition finale telle quelle ou modifiée.
6. **Les cas limites.** Un tableau : le cas, la règle, l'écran, le texte
   affiché au designer, le scénario de la maquette.
7. **Les décisions.** Un tableau numéroté : la question, l'option
   recommandée, les options écartées, l'origine, ce qu'un refus entraîne.
   Puis le verdict sur les quatorze pistes et les dix-neuf décisions de la
   proposition finale.
8. **L'inventaire des modifications.** Voir plus bas.
9. **Les textes.** Chaque texte nouveau ou changé de l'interface, en
   français et en anglais, avec l'écran où il paraît. Ces textes passeront
   par [TEXTES-A-VALIDER.md](../../TEXTES-A-VALIDER.md).
10. **Les lots.** L'ordre, le contenu de chaque lot, ses prérequis, les
    essais dans Figma qui le précèdent.
11. **L'essai du mainteneur.** Le protocole de la proposition finale
    (prédire avant chaque clic qui écrit, comparer au bilan), les tâches du
    parcours nominal et au moins une tâche par cas limite, les critères, dont
    « aucune écriture non voulue ».
12. **Ce qui reste écarté, et ce qui reste à prouver.**
13. **Les retours de la revue critique.** Un tableau : chaque constat et
    chaque recommandation, la réponse, la section ou la modification qui la
    porte.
14. **Sources.**
15. **Annexe : vérifications.** Chaque affirmation factuelle, sa preuve
    (`chemin:ligne`, mesure du moteur imprimée par
    `mesurer-direction-globale.mjs`, ou source externe).

### L'inventaire des modifications

Le mainteneur veut **toutes** les modifications en un seul endroit. Une
modification oubliée ici sera oubliée au développement. L'inventaire est un
tableau, une ligne par modification, avec ces colonnes :

| Colonne | Contenu |
|---|---|
| Identifiant | `M-001`, `M-002`… stable, cité par les décisions, les lots et la maquette |
| Domaine | Un des domaines listés ci-dessous |
| Endroit | Le fichier, la section ou l'exigence exacte : `[UI-05]`, `recette.ts`, `CONTRIBUTING.md` « Les surfaces d'UCM Palettes »… |
| Aujourd'hui | Ce que l'endroit dit ou fait, avec sa preuve |
| Après | Ce qu'il dira ou fera |
| Raison | La décision ou le constat qui l'impose |
| Écran | L'écran ou le scénario de la maquette qui la montre, s'il y en a un |
| Lot | Le lot qui la livre |
| Coût | Faible, moyen ou élevé, avec une phrase |

Les domaines à parcourir, un par un, pour ne rien oublier :

- la spécification, exigence par exigence : décisions D1 à D10, questions
  ouvertes, chaque `[UI-*]`, `[ENT-*]`, `[PLA-*]`, `[REC-*]`, `[VER-*]`,
  `[MOT-*]` et `[ARC-*]` touché, sections 5, 16, 17 et 18 ;
- la recette : chaque champ du format 7, sa validation, son empreinte, la
  migration depuis le format 6 ;
- le moteur `ucm-couleur` : fonctions nouvelles ou changées (correction,
  vision simulée, comptes), leurs tests ;
- le sandbox du plugin : lecture de la sélection et des variables, écriture
  des variables, suivi des ressources, portes d'écriture ;
- l'interface : chaque onglet, carte, modale, geste et état ;
- la frontière `messages.ts` : chaque message ajouté ou changé ;
- la planche et le rapport ;
- les textes et les deux catalogues de langue ;
- la galerie : chaque état nouveau ;
- les tests et les lois, dont la loi d'écriture et ses motifs ;
- `CONTRIBUTING.md`, `AGENTS.md` et l'architecture multi-marques ;
- la documentation : README du plugin, sommaire de `docs/`.

Termine l'inventaire par deux contrôles écrits : chaque décision renvoie à au
moins une modification, et chaque constat de la revue critique renvoie à une
modification ou à un refus motivé.

## Livrable 2 : la maquette interactive

La maquette démontre le parcours et chaque fonctionnalité. Le mainteneur y
joue seul chaque scénario, prédit ce qui va s'écrire et compare au résultat.
Le prototype de [la revue de
l'atelier](../02%20Revue%20atelier/REVUE-ET-PROTOTYPE-ATELIER.html) montre la
technique ; ta maquette va plus loin sur les points suivants.

**Construction.**

- Un seul fichier HTML autonome, sans script, feuille ni police externe, qui
  s'ouvre d'un double clic.
- `generer-maquette-direction-globale.mjs` l'écrit en entier et y embarque le
  moteur avec esbuild, comme `integrer-moteur-prototype-atelier.mjs`. Il
  exporte au moins `recetteParDefaut`, `rampesDe`, `ancrageDe`,
  `verifierPromesses`, `contraste`, `atteintLeSeuil`, `distanceDePalettes`,
  `nouvellePalette` et `changerReference`.
- Chaque couleur, chaque garantie, chaque distance et chaque compte se
  calcule à l'exécution. Aucun résultat que le moteur sait calculer n'est
  écrit en dur ; la revue critique en a relevé six dans la proposition en
  trois étapes.
- La correction proposée s'exécute dans la maquette, avec le critère de
  régularité que tu retiens.

**Le cadre du plugin.**

- À la taille réelle : 600 × 720 par défaut, une bascule vers 500 × 520. Le
  thème clair et le thème sombre de Figma, repris de
  `packages/plugin-socle/src/ui/socle.css`.
- Le corps défile, avec sa barre visible ; le pied, s'il existe, reste hors
  du défilement. Rien n'est coupé sans défilement.
- De vrais boutons et champs : clavier, focus visible, Tab retenu dans une
  modale, Échap qui la ferme sans rien écrire, étiquettes accessibles.

**Le document Figma simulé.** Un état en mémoire, hors du cadre du plugin :
les collections, leurs modes et leurs variables avec leur valeur par mode et
leur provenance ; les cadres de la planche et leur état ; les polices
disponibles ; la limite de modes de l'offre ; les modifications d'un autre
designer. Un panneau « Document », à côté du plugin, montre cet état. Un
journal liste ce que chaque écriture a créé, changé ou laissé, dans les trois
unités.

**Les scénarios.** Une liste, hors du cadre du plugin, charge chaque
scénario dans son état de départ, avec « Recommencer ». Chaque scénario
affiche sa consigne et le résultat attendu, que le mainteneur compare au
journal. Au minimum :

1. fichier vide, jeu de départ à deux marques, première écriture du système ;
2. une marque ajoutée à un système écrit ;
3. une référence changée, puis l'écriture de cette seule palette ;
4. un réglage commun changé (intensité Soft à 0,50), puis l'écriture de tout
   le système ;
5. une retouche faite dans Figma, adoptée ou remise ;
6. trois retouches dans une palette ;
7. une retouche sur le cran de la référence, et sur `brand.identity` ;
8. une variable créée à la main au bon chemin ;
9. un mode de `brand` créé hors du plugin ;
10. une famille qui manque dans une marque ;
11. le fichier modifié pendant la relecture ;
12. une police absente au moment d'écrire ;
13. la limite de modes atteinte, puis la reprise ;
14. le nombre de nuances passé de 11 à 13, puis de 13 à 11 ;
15. une palette supprimée qui a des variables et un cadre ;
16. une rampe faite à l'œil, reprise et corrigée ;
17. une rampe faite à l'œil que la correction ne ramène pas au résultat de
    la rampe calculée ;
18. une palette calculée qui manque une garantie ;
19. la planche seule redessinée, sans toucher aux variables ;
20. deux palettes proches de deux marques, et une couleur de marque proche
    d'un statut, en vision normale et simulée ;
21. une palette reliée à des variables existantes, si ta direction la garde.

**La page autour du cadre.** Un titre, le mode d'emploi en quelques lignes,
la liste des scénarios, le panneau « Document » et le journal. Une bascule
« Afficher les notes » montre, à côté de chaque état, la décision ou
l'identifiant `M-xxx` qui le fonde dans `DIRECTION-GLOBALE.md`.

## Vérifier avant de rendre

1. Lance le générateur, puis `mesurer-direction-globale.mjs`. Chaque nombre
   cité dans `DIRECTION-GLOBALE.md` doit sortir de l'un d'eux.
2. Lance `verifier-maquette-direction-globale.mjs`, écrit avec Playwright,
   installé dans le dépôt. Il joue chaque scénario à 600 × 720 et à
   500 × 520, dans les deux thèmes, et contrôle : aucune erreur JavaScript,
   aucun débordement horizontal, aucun contenu masqué sans défilement, le
   bouton principal lisible sans défiler, le focus retenu dans une modale,
   l'état final attendu de chaque scénario atteint. Il imprime un tableau
   des résultats ; tous passent.
3. Lance `node scripts/controle-style.mjs` sur chaque fichier que tu écris,
   puis `npx tsx --test tests/docLinks.test.ts`.
4. Relis `DIRECTION-GLOBALE.md` contre la liste « Les retours à intégrer » :
   chaque point a sa réponse.

## Écrire

- Suis la skill `rediger-sans-tics-ia` et la section « Rédiger un document »
  de CONTRIBUTING. Un contrôle refuse à l'écriture le tiret cadratin en
  incise, les capitales d'emphase, l'opposition en deux temps, les
  qualificatifs que rien n'établit et les dates posées sur une décision.
- Un sigle en capitales absent de la liste `ACRONYMES` de
  `scripts/controle-style.mjs` passe pour une emphase. Écris « expérience »
  plutôt que son sigle anglais.
- Un lien vers un dossier dont le nom porte des espaces ou des accents les
  encode : `%20`, `%C3%A9`.
- Garde les termes du dépôt : recette, planche, cadre, cran (« nuance » à
  l'écran), intensité, garantie, retouche, sortie, revue.

## Le rendu

Ton dernier message donne, dans cet ordre : les fichiers produits ; les cinq
décisions que le mainteneur doit prendre en premier ; les points où tu
t'écartes de la revue critique, avec leur raison ; ce qui reste à prouver
dans Figma ; les contrôles lancés et leur résultat, échecs compris.
