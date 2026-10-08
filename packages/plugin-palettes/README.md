# UCM Palettes

UCM Palettes est le plugin de [UCM Toolkit](../../README.md) consacré aux
palettes de couleurs. Il calcule les rampes Light et Dark depuis une couleur
de référence, affiche les contrastes des associations d'usage, écrit chaque
palette dans les variables de couleur du fichier et dessine sa planche.

## Ouvrir le plugin

Le manifeste porte l'identifiant que Figma a attribué au plugin. Depuis la
racine du dépôt, avec Node 22 :

```sh
npm install
npm run build --workspace ucm-palettes-plugin
```

Dans Figma Desktop, ouvrez `Plugins > Development > Import plugin from manifest`
et choisissez `packages/plugin-palettes/dist/manifest.json`.

## Trois onglets

Le plugin s'ouvre sur **Création** dans un fichier sans palette, sur
**Gestion** sinon.

| Onglet | Portée | Ce que le designer y fait |
|---|---|---|
| Création | La palette ouverte | Nommer, choisir la référence, régler, essayer sur l'interface de test |
| Vérification | La palette ouverte, le verdict de toutes | Lire le verdict, les messages et les garanties de contraste |
| Gestion | Le fichier | Écrire chaque palette dans les variables, créer sa planche, suivre leur état |

## Composer une palette

Dans **Création**, créez une palette avec un nom, une couleur de référence
et un modèle de nuances. Choisissez une intensité unique ou deux intensités,
Soft et Vivid. Le sélecteur de couleur accepte Hex, RGB et HSL.

L'aperçu montre les nuances sur le fond de la page de chaque thème. Trois
bandes, `solid`, `surface` et `page`, nomment sous les rampes les variables
de chaque dossier ; survoler une nuance, une variable ou un dossier surligne
ce qui les relie. Sélectionnez une nuance pour examiner ses valeurs, les
variables qu'elle porte et leurs garanties. Les cartes « Réglage global » et
« Color shift » règlent la saturation, la teinte et la luminosité le long des
rampes. Le pied compte les garanties et les points à vérifier ;
« Vérifier » ouvre l'onglet suivant sur la même palette.

Les réglages communs, derrière l'engrenage, définissent le fond de la page et
le texte des boutons, blanc ou noir, de chaque thème, les intensités, les
courbes de luminosité et les seuils de signalement. Un texte des boutons qui
n'a pas la couleur de la page inverse la table des nuances du thème et
remplace les luminosités des nuances 500 à 800 par celles de la courbe
inversée, après confirmation si le designer les a réglées.

## Vérifier une palette

**Vérification** montre le verdict de la palette ouverte, ses messages et la
carte des garanties de contraste : sept garanties, jugées contre le fond de la
page, chacune sur ses fonds `default`, `hover` et `pressed`. Le lien d'un message nomme le geste et
ouvre le réglage où il se fait. Le sélecteur porte le verdict de chaque
palette.

Les contrastes portent sur les sept garanties affichées. Ils ne constituent pas
un audit d'accessibilité de l'interface qui utilisera ces couleurs.

## Écrire dans Figma : deux sorties

**Gestion** porte une fiche par palette, avec une ligne par sortie.

| Sortie | Ce que le plugin écrit | États |
|---|---|---|
| Tokens Figma | Les variables de couleur de la palette, une par intensité, thème et nuance | Pas encore écrits, À jour, À mettre à jour, Modifiés dans Figma, Introuvables |
| Planche | Un cadre par palette, sur la page des planches | Pas encore créée, À jour, À actualiser, Introuvable, Lecture impossible |

Gestion regroupe la connexion, les palettes du plugin, celles du fichier,
celles des bibliothèques et la recette dans des sections repliables. Seules
les palettes du plugin sont ouvertes par défaut. Les mises à jour se font
depuis la fiche de chaque palette : la liste montre une ligne par palette, et
un clic sur la ligne déplie sa fiche. Une palette qui attend une décision se
déplie seule.

« Connexion à Figma » présente la destination des tokens et la page des
planches. « Synchroniser » relit le fichier sans rien écrire. Les choix de
sections ouvertes sont conservés sur le poste dans `figma.clientStorage`.

### La destination des tokens

Une destination vaut pour toutes les palettes : une collection, un groupe et
la forme des thèmes. Par défaut, le plugin crée la collection `primitives`
et écrit sous `colors/{palette}/{soft, vivid}/{light, dark}/{nuance}` : 44
variables pour deux intensités et onze nuances. Avec les thèmes en modes, la
collection porte les modes Light et Dark, et la même palette crée 22
variables. « Changer », sur la ligne « Tokens », ouvre la carte de la
destination et sa simulation.

Avant une première écriture, la fiche dit combien de variables elle crée,
dans quelle collection et sous quels noms. Quand des couleurs ont été
changées à la main dans Figma, la fiche les liste et propose « Remettre les
couleurs du plugin » ou « Laisser les couleurs de Figma ».

### Les palettes déjà dans le fichier

Après les palettes du plugin, « Déjà dans le fichier » liste les palettes que
les variables locales portent déjà : des variables de couleur dont le dernier
segment du nom est un nombre, cinq au moins sous le même chemin. « Modifier
dans le plugin » en reprend une : « Mettre à jour » remplace les couleurs de
ses variables d'origine et les renomme sous leur thème et leur intensité,
sans rompre leurs liaisons. Les nuances, le thème Dark et l'intensité que la
palette porte de plus se créent sous le même chemin. La reprise conserve la
collection ; un changement du groupe de « Destination des tokens » change
ses chemins lors de l'écriture. Sa fiche indique la forme réellement utilisée
pour Light et Dark. Une collision de nom laisse la palette partiellement
écrite et nomme la variable à renommer. Si Figma ne change que la casse des segments, la reprise
suit les noms actuels des variables. Si toutes les variables d'origine ont
disparu, le plugin les recrée sous le chemin d'origine. Un suffixe non vide
ajouté après un tiret au dernier segment d'une nuance, comme `600-base`, est
conservé lors de ces renommages et ne déclenche pas à lui seul « À mettre à
jour ». Un tiret final seul n'est pas un suffixe. Les palettes des
bibliothèques activées suivent, sous « Dans les bibliothèques » ;
« Copier dans le plugin » en fait
une palette du plugin, qui s'écrit dans la destination.

Après un changement de destination, Gestion conserve une carte pour les
anciennes variables. « Supprimer les variables… » demande confirmation et
laisse les variables de la destination actuelle. Si Figma interrompt un
retrait, synchronisez puis réessayez pour retirer les variables restantes.

### Les planches

« Créer la planche » dessine le cadre d'une palette. Les réglages du contenu
choisissent les thèmes, les lignes de dossiers `solid`, `surface` et `page`,
et les grilles. Le plugin remplace ses
cadres à leur emplacement ; des calques étrangers demandent confirmation
avant leur remplacement. Une copie de cadre faite par le designer reste
distincte du cadre suivi. « Changer », sur la ligne « Planches », choisit la
page et y déplace les planches déjà créées.

### Limites de l'écriture

- Il n'écrit ni `color-brands`, ni `color-utilities`, ni `theme`, ni alias.
- La reprise d'une palette locale peut renommer ses variables sous leur thème
  et leur intensité. Elle conserve leurs identifiants et leurs liaisons.
- Il ne supprime une variable que par « Supprimer les variables… », sur la
  carte d'une palette supprimée du plugin.
- Il n'écrit jamais dans une bibliothèque.
- Il n'écrase pas une couleur changée dans Figma sans le choix du designer.
- Il ne lie aucune pastille de planche à une variable.

## Conserver et échanger la recette

Les modifications de palette sont enregistrées dans les données du document.
L'écriture des tokens et le dessin des planches restent des gestes distincts.
La recette courante utilise le format **10**, défini dans [le moteur de
couleur](../couleur/README.md). Une recette au format 9 se lit telle quelle ;
au format 8, le plugin lui ajoute le texte des boutons par défaut. Les deux se
rangent au format 10 au prochain enregistrement. Une recette antérieure ne se
convertit pas.

En bas de Gestion, la carte « Palettes et réglages » propose l'export de la
recette JSON et du rapport de vérification. L'import présente les différences
et demande confirmation avant de remplacer la recette. Il ne redessine aucun
cadre et n'écrit aucune variable. Une modification concurrente du document
suspend l'enregistrement pour éviter d'écraser une recette plus récente.

Le plugin fonctionne sans accès réseau. Son manifest déclare la permission
`teamlibrary`, pour lire les collections des bibliothèques activées. Il ne
produit pas de `tokens.json` : l'export des variables locales appartient à
[UCM Contract Exporter](../plugin-exporter/README.md).

## Vérifier une modification

Depuis la racine du dépôt :

```sh
npm run test --workspace ucm-palettes-plugin
npm run typecheck --workspace ucm-palettes-plugin
npm run galerie --workspace ucm-palettes-plugin
npm run test:ui --workspace ucm-palettes-plugin
```

Les tests d'interface demandent Chromium : `npx playwright install chromium`.
La galerie est générée dans `dist/galerie/index.html` et sa version étroite dans
`dist/galerie-minimale/index.html`, sous ce paquet ; `dist/galerie-en/` et
`dist/galerie-en-minimale/` en donnent la version anglaise. Elle présente les états de
l'interface en thèmes clair, sombre et sombre sans variables Figma.

Le [socle](../plugin-socle/README.md) fournit les composants d'interface et le
banc de galerie. Le [moteur de couleur](../couleur/README.md) porte les calculs.
Les règles du produit sont dans [AGENTS.md](../../AGENTS.md), les règles de
contribution dans [CONTRIBUTING.md](../../CONTRIBUTING.md).

## État du produit

L'interface s'ouvre en anglais, quelle que soit la langue de Figma ou du
système. Le champ « Language » des Réglages communs propose l'anglais et le
français ; le choix prend effet sans recharger et se range dans
`figma.clientStorage`, sous la clé `ucm-palettes.langue`, sur le poste du
designer. Il n'écrit rien dans le document. Les textes des planches dessinées
restent en français.

Le parcours Création, Vérification et Gestion, le Color shift, les palettes
désaturées et la localisation sont implémentés. Le
[bilan des recherches](../../docs/notes/Recherches/Plugin%20Palettes/README.md)
indique les références conservées et les validations encore à consigner.

## Ajouter une langue

1. Copier `src/i18n/en.ts` sous le code de la langue, puis traduire chaque
   entrée. Une fonction garde ses paramètres ; une phrase se traduit entière,
   sans recoller des fragments.
2. Écrire les pluriels et les ordinaux de la langue dans les fonctions qui
   comptent (`nombreDePalettes`, `nommerChamp` et leurs voisines).
   `pluriel` de `src/i18n/nombres.ts` donne la catégorie `Intl` d'un nombre.
3. Inscrire la langue dans `LANGUES` de `src/i18n/langues.ts` : code, nom
   dans sa propre langue, direction et séparateur décimal. Associer ensuite le
   code à son catalogue dans `CATALOGUES` de `src/i18n/index.ts` ; sans
   cette entrée, la compilation échoue.
4. Lancer `npm run test` : `tests/i18n.test.ts` refuse un catalogue dont une
   clé manque ou change de type. Ajouter à ce fichier les attentes des messages
   dynamiques de la langue, avec les valeurs 0, 1 et 2.
5. Ajouter une galerie de la langue dans `galerie/build-galerie.cjs` et
   relire ses états à 500 et à 600 px.

Une direction `rtl` se déclare dans le registre, mais la mise en page n'a été
relue qu'en `ltr` : une langue de droite à gauche demande sa propre relecture
visuelle.

## Licence

[MIT](../../LICENSE).
