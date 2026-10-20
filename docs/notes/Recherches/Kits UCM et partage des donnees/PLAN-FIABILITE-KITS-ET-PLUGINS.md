# Plan de fiabilité du kit et des plugins

## La demande

Le mainteneur a demandé, à la suite de la
[revue des kits et du partage des données](./REVIEW-KITS-UCM-ET-PARTAGE-DES-DONNEES.md) :

> analyse ce document et réfléchis y profondemment pour fiabiliser le kit et
> les plugins

Puis, après une première réponse :

> En soit on veut certaines conventions d'écriture dans les tokens figma mais
> ce n'est pas forcément important pour UCM en général, sauf pour les plugins
> qui interviennent aussi dans les tokens figma (comme UCM Palettes).
> Réfléchis de nouveau à tout et propose moi un plan complet, que tu
> m'expliqueras simplement avec des exemples.

Codex a vérifié la première version de ce plan et cherché d'autres défauts
dans tout le dépôt : [revue de Codex](./REVUE-CODEX-DU-PLAN-FIABILITE.md). Ses
corrections et ses constats F01 à F12 sont intégrés ici ; chaque lot cite ce
qu'il en reprend.

Dans la même session, quatre défauts ont été trouvés et corrigés dans Palettes
et le kit. Ils ont servi de cas réels pour ce plan :

| Défaut | Commit |
|---|---|
| Une palette reprise (Titanium) demandait le renommage `light` → `Light`, alors que les palettes créées par le plugin, sous le même écart, restaient « à jour » | 170a6d79 |
| « Passer au format du plugin » annonçait `Light` → `light`, alors que l'écriture garde `Light` : l'interface calculait sans les règles de nommage | c93bff20 |
| Une reprise jugeait un nom pris à la casse près, l'écriture d'une destination sans casse | 7c673dac |
| `SEUIL_DE_PALETTE` était écrit deux fois ; sa remontée dans le kit a laissé `versionSuitLeContenu` rouge jusqu'au passage du kit en 0.9.10 | 7d7d8102, cc9c78fe |

Les trois premiers ont la même cause : une même décision calculée à deux
endroits, qui finit par diverger. Le quatrième vient d'une vérification
incomplète : les tests des paquets ont été lancés, pas ceux de la racine.

## Les trois principes

**1. UCM reconnaît le concept, pas son écriture.** L'écriture d'un nom
(`Light` ou `light`, `Soft` ou `soft`) est un choix du fichier Figma, que
Nomenclature applique. Un outil qui lit des noms Figma reconnaît un terme UCM
quelle que soit sa casse ou son séparateur, et garde le nom d'origine pour
l'affichage.

**2. Ne pas pouvoir conclure se voit.** Une comparaison rend « égal »,
« différent » ou « non comparable ». Un contrôle qui ne peut pas se faire
(rôle inconnu, mode non lu, lecture refusée) le dit. Une liste vide d'écarts
n'est jamais une preuve d'égalité.

**3. Une décision se calcule à un seul endroit.** Ce qu'un écran annonce et ce
que l'écriture fait viennent du même calcul. Deux plugins qui jugent la même
chose appellent la même fonction du kit.

L'état du premier principe, vérifié en exécutant le code et confirmé par
Codex :

| Lecteur | Entrée en PascalCase | État |
|---|---|---|
| Code exporté (`normalizeName`, `tokenCssVariable`) | `Color/Ocean/Soft/Light/500` donne `--color-ocean-soft-light-500`, comme la forme en minuscules | Correct |
| Exporteur, valeurs de variantes | `normalizePropValue` met `Hover` en minuscules avant `STATE_SELECTORS` | Correct |
| Palettes, détection des palettes du fichier | Compare en minuscules (`detection.ts`) | Correct |
| Explorateur, couches | `collectionUcmReconnue` découpe et met en minuscules | Correct |
| Explorateur, rôles du thème | `variableDuNom('Primary/Solid/default')` rend `null` | **Défaut** |
| Kit, `termeRetenu` et `cheminConforme` | `cheminConforme('primitives', ['Color','Ocean','Soft','Light','500'])` rend `false` | Défaut latent : aucun lecteur ne l'applique encore à des noms Figma |

## Décisions

| Point | Décision du mainteneur |
|---|---|
| D1. Palettes à 13 nuances | Les numéros `1000` et `1050` entrent dans la grammaire de `primitives` |
| D2. Renommage à l'écriture (Codex Q1) | Une palette créée par Palettes ne renomme pas ses variables suivies : Nomenclature s'en charge. L'encart d'écriture annonce un renommage seulement quand l'écriture le fait, c'est-à-dire pour une palette reprise |
| D3. Constats C05 à C09 (Codex Q5) | Tout entre dans le kit : lots 9 à 13 |
| D4. Marque de nommage posée à l'ouverture (Codex Q2) | Gardée. L'exception à « ouvrir un plugin n'écrit rien » est documentée, et Nomenclature explique la protection |
| D5. Destination de Palettes (Codex Q6) | En full UCM, Palettes refuse d'écrire dans une collection reconnue comme `theme`, `brands` ou `utility` (noms du lot 17). Dans un fichier libre, le nom d'une collection ne prouve rien : pas de refus. Le full UCM se déclare par un interrupteur de la Configuration d'UCM Nomenclature, au même format que ceux de la Configuration de l'exporteur, rangé dans les données partagées du fichier et lu par Palettes : le nom d'une collection seul ne départage pas les deux cas, et les règles v2 ne portent plus l'interrupteur « termes UCM » de la v1 |
| D6. Mode ou rôle renommé par un mot personnel (Codex Q3) | L'explorateur lit les termes personnalisés rangés par Nomenclature ; sans règle, il dit « non reconnu, non vérifié » |
| D7. Portée de la grammaire (Codex Q4) | La grammaire valide le profil UCM, avec le contexte des modes de la collection. Une sortie libre de Palettes reste agnostique : jamais bloquée, jamais déclarée fautive |
| D8. Noms des couches UCM | Les couches de référence deviennent `primitives`, `utility`, `brands`, `theme`, `layout`, `typography`, `components`. Les anciens `color-utilities`, `color-brands` et `layouts` restent reconnus comme formes anciennes : lot 17 |

## Avancement

Dans l'ordre d'exécution (section [Ordre](#ordre)).

- [x] Lot 8. La fabrication et la vérification (b805f6a5)
- [x] Lot 17. Les nouveaux noms des couches UCM (0ccbff70)
- [x] Lot 1. L'explorateur reconnaît le thème quelle que soit son écriture (42dd8719)
- [ ] Lot 2. Une comparaison qui n'a pas pu se faire le dit
- [ ] Lot 3. Une couleur de composant vise le thème
- [ ] Lot 5. Palettes annonce ce qu'il écrit, sur un lot entier
- [ ] Lot 4. Les protections de Nomenclature tiennent et s'expliquent
- [ ] Lot 6. La grammaire décrit toutes les palettes du profil UCM
- [ ] Lot 14. La destination de Palettes en full UCM
- [x] Lot 15. La CLI distingue une erreur de Git d'un changement (0ccbff70)
- [x] Lot 16. L'adaptateur TypeScript refuse un type incompatible (0ccbff70)
- [ ] Lot 9. Les chemins de tokens et les axes dans le kit
- [ ] Lot 10. Les rôles de rendu dans le kit
- [ ] Lot 11. Les protocoles entre plugins dans le kit
- [ ] Lot 12. Le calcul du nommage dans le kit
- [ ] Lot 13. La grammaire du kit de règles Figma dans le référentiel
- [ ] Lot 7. Des lois entre produits

## Règles communes à tous les lots

- Lire `AGENTS.md`, puis la skill `rediger-sans-tics-ia` avant d'écrire un
  commentaire ou un texte ; la skill `rediger-diagnostics-ucm` pour un message
  destiné au designer.
- Une définition UCM se modifie dans `packages/kit/src/referentiel/` ou
  `packages/kit/src/emplois/`, jamais dans un paquet. Le kit n'importe aucun
  paquet privé (`ucm-couleur`, `ucm-plugin-socle`, un plugin).
- Le périmètre agnostique reste le défaut : aucun lot ne transforme une
  collection libre, un groupe personnalisé ou un nom propre en erreur.
- Ne jamais lancer `test:ui`. Garder les fins de ligne du fichier, et comparer
  les octets à `HEAD` avant le commit.
- Une modification de `packages/kit/src` monte la version du kit dans le même
  envoi, avec les pins de la CLI et de l'adaptateur, sans publier. Le
  mainteneur a demandé une seule publication, à la fin du plan, dans l'ordre
  core, cli, adapter (skill `.agents/skills/publier-paquets`).
- Chaque lot finit par la vérification du lot 8 : typecheck, tests des paquets
  touchés **et** tests racine.
- Un test qui prouve une correction doit échouer sans elle : le compte rendu du
  lot cite le test rouge obtenu en retirant la correction.
- La conversation principale commite par chemins explicites et coche le lot
  avec son hash.

## Lot 8. La fabrication et la vérification

Premier lot, sur la recommandation de Codex : les autres en dépendent.

**Ce qui peut arriver aujourd'hui (revue, C11).** On modifie le kit, puis on
construit Palettes seul (`npm run build --workspace ucm-palettes-plugin`) : le
bundle embarque l'ancien `packages/kit/dist`, sans erreur. Un oubli voisin a
laissé un test racine rouge (voir la demande).

**Changement.**

1. Une commande racine construit un plugin après le kit, par exemple
   `npm run build:plugin -- palettes`, et la même pour la galerie et pour les
   tests ciblés d'un paquet. Les documents de travail et l'agent
   `verificateur` l'emploient.
2. Un contrôle compare une empreinte des entrées réellement compilées du kit
   et de sa configuration de build à celle de `packages/kit/dist`, et refuse un
   build de plugin sur un kit périmé.
3. La vérification standard d'un agent inclut les tests racine.
4. C10 : étendre `tests/referentielUnique.test.ts` aux objets et unions de
   types ; nommer et tester les différences voulues (`SIZE_VALUES` accepte
   `tiny` et `huge`, que `REGISTRE_TAILLES` ne reconnaît pas). Le seuil AAA est
   déjà dans le kit, écrit `7` dans le corps de `niveauxWcag`
   (`kit/src/referentiel/contraste.ts`) : il y prend un nom, et la
   liste `SEUILS = [3, 4.5, 7]` de l'explorateur
   (`plugin-explorateur/src/contraste.ts`) en est dérivée (correction de Codex).
5. C12 : README du kit (porte `referentiel`), README du socle (modules de
   nommage), spécification de l'explorateur (sept collections), registre
   `PRODUITS` (Palettes lit les règles de nommage), statut de
   `RECOMMANDATIONS`. Un test refuse une porte publique du kit absente de son
   README.

**Tests.** Dans un répertoire temporaire, modifier une valeur du référentiel,
lancer la commande du point 1 : le bundle contient la nouvelle valeur. Le
contrôle du point 2 échoue sur un `dist` périmé.

**Fini quand** : commandes documentées dans `AGENTS.md` et `CONTRIBUTING.md` ;
tests verts.

## Lot 17. Les nouveaux noms des couches UCM

Décision D8. Le mainteneur a renommé les collections de son fichier Figma pour
suivre une écriture PascalCase, et ces noms deviennent la référence UCM.

| Ancien nom de référence | Nouveau nom de référence | Écrit dans le fichier du mainteneur |
|---|---|---|
| `primitives` | `primitives` | `Primitives` |
| `color-utilities` | `utility` | `Utility` |
| `color-brands` | `brands` | `Brands` |
| `theme` | `theme` | `Theme` |
| `layouts` | `layout` | `Layout` |
| `typography` | `typography` | `Typography` |
| `components` | `components` | `Components` |

Le kit garde les identifiants en minuscules ; l'écriture `Primitives` ou
`primitives` relève de la convention du fichier (premier principe). Seuls
trois noms changent de mots : `utility`, `brands` et `layout`.

**Ce que cela change pour un projet UCM.**

- Le chemin d'un token commence par le nom de sa collection mis en
  minuscules : à l'export suivant, `color-brands.primary.solid` devient
  `brands.primary.solid`, `--color-utilities-danger-solid` devient
  `--utility-danger-solid`, `layouts.*` devient `layout.*`. Les alias du
  fichier de tokens restent cohérents entre eux, puisqu'ils sont réécrits
  ensemble.
- Une collection de marques à plusieurs modes donne un axe nommé d'après elle :
  l'attribut HTML `data-color-brands` devient `data-brands`.
- Un repository consommateur qui cite directement ces variables CSS ou cet
  attribut doit les suivre. Le dépôt de recette `intencial-library` ne les
  cite que dans `src/tokens/tokens.json`, que la pull request d'export
  réécrit.

**Changement.**

1. `packages/kit/src/referentiel/architecture.ts` : `COLLECTIONS`,
   `CIBLES_DES_COLLECTIONS`, `CIBLES_DES_COULEURS_DE_COMPOSANT`,
   `COLLECTIONS_SANS_PORTEE`, les clés de `FORMES_DES_CHEMINS`, les familles
   (`FAMILLES_COLOR_BRANDS`, `FAMILLES_COLOR_UTILITIES`, `FAMILLES_LAYOUTS` et
   leurs identifiants de registre) et `AXES_DES_COLLECTIONS` (collection `brands`, attribut
   `data-brands`). `DESTINATION_DES_PALETTES` garde `primitives`.
2. Les anciens noms deviennent des formes anciennes reconnues :
   `collectionUcmReconnue` (`normalisation.ts`) rend `brands` pour
   `color-brands`, `utility` pour `color-utilities`, `layout` pour `layouts`.
   Un fichier qui n'a pas été renommé garde ses contrôles full UCM, et
   Nomenclature, avec les termes UCM, propose le renommage vers le nouveau nom,
   écrit selon la convention des collections. Aujourd'hui `proposer`
   (`kit/src/referentiel/lexique.ts`) rend l'identifiant en minuscules sans
   cette convention : sous PascalCase, il propose `Primitives` → `primitives`
   et `Theme` → `theme`. Ce lot le corrige.
3. L'explorateur relit les associations de couches rangées sous les anciens
   noms (`coucheRangee`, `profilUcm.ts`, qui lit déjà `brand` comme ancienne
   forme) : `color-brands` se lit `brands`, `color-utilities` se lit
   `utility`, `layouts` se lit `layout`. Ses textes, sa spécification et son
   README suivent.
4. La CLI n'écrit aucun nom de couche : l'attribut d'un axe sans clé `modes`
   est `data-` suivi du nom de l'axe (`attributDeMode`,
   `kit/src/format/names.ts`), et une collection `Brands` donne déjà
   `data-brands`. Seule la transition change : une clé `modes.color-brands`
   d'un `ucm.config.json` existant est lue comme `modes.brands`, avec une
   notice qui demande de la renommer, quand le fichier de tokens n'a plus
   d'axe `color-brands` mais un axe `brands`. Aujourd'hui cette clé donne
   l'erreur « aucun axe du fichier de tokens ne porte ce nom ».
5. Ne pas confondre la collection `layouts` avec le champ `layouts` des
   contrats (`docs/format/FORMAT.md`, `format/types.ts`) : le champ du contrat
   ne change pas, et `CONTRACT_VERSION` non plus.
6. Documents : `CONCEPT.md`, `AGENTS.md` (frontière d'écriture de Palettes :
   jamais dans `theme`, `brands` ni `utility`), `FORMAT.md` et
   `CHANGELOG-FORMAT.md` là où ils nomment une couche, les README et
   spécifications des plugins, les galeries (`plugin-nomenclature/galerie`,
   `plugin-palettes/galerie`, `plugin-explorateur/galerie`), et la vue de
   l'architecture de référence
   (`docs/notes/Recherches/Archi Tokens Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html`).
   Régénérer la vue illustrée du référentiel (`generer-donnees-referentiel.ts`).
7. Les migrations des fichiers Figma et du Playground restent au mainteneur ;
   ce lot n'en planifie aucune.

**Tests.**

- Kit : `collectionUcmReconnue` rend le nouveau nom pour chaque écriture du
  nouveau nom (`Brands`, `brands`, `BRANDS`) et pour l'ancien nom
  (`color-brands`, `Color Brands`, `ColorBrands`) ; `Layout` et `layouts`
  rendent `layout`.
- Nomenclature, avec les termes UCM : `color-brands` est proposé en `brands`
  écrit selon la convention des collections ; `Brands` n'appelle aucune
  question de collection.
- Explorateur : une association rangée sous `color-brands` se relit `brands`.
- Exporteur : un fichier de test dont les collections portent les nouveaux
  noms donne les chemins `brands.*`, `utility.*`, `layout.*` ; l'ancien nom
  donne toujours l'ancien chemin (le chemin suit le nom du fichier, pas le
  référentiel).
- CLI : axe `brands` et attribut `data-brands` ; clé `modes.color-brands`
  relue avec sa notice.
- `tests/referentielUnique.test.ts` refuse toute copie des anciens noms hors
  du référentiel.

**Fini quand** : plus aucun ancien nom hors des formes anciennes du
référentiel, des lecteurs de transition et de l'historique ; tests verts ;
vue illustrée régénérée ; kit publié en version mineure (`0.10.0`), CLI et
adaptateur avec lui. Le changement de nom se décrit dans le README du kit, avec
ce qu'un repository consommateur doit suivre.

## Lot 1. L'explorateur reconnaît le thème quelle que soit son écriture

**Ce que voit le designer aujourd'hui.** Nomenclature a passé les groupes du
thème en PascalCase : `primary/solid/default` est devenu
`Primary/Solid/default`. L'explorateur ne reconnaît plus le rôle de cette
variable et saute, sans le dire, deux contrôles : la portée (la variable
apparaît-elle dans le bon sélecteur de Figma) et la nuance (vise-t-elle le
cran attendu).

**Changement.**

1. Dans `packages/kit/src/referentiel/termes.ts`, ajouter
   `termeReconnu(registre, segment)` : le segment est découpé par
   `decouperSegment`, ses mots mis en minuscules et joints par `-`, puis
   comparés à l'identifiant du terme et à ses formes tolérées, ramenés à la
   même forme. Les segments séparés par `/` restent distincts. `termeRetenu`
   reste pour les appels qui veulent la forme exacte (l'exporteur l'emploie
   pour dire qu'une valeur s'écrit autrement).
2. `cheminConforme` (`architecture.ts`) emploie `termeReconnu`, et compare
   `valeurs` et `exclues` sous la même forme.
3. Le kit expose la reconnaissance d'une variable du thème par la fin de son
   nom, sous la même forme. Sa liste est dérivée des définitions du kit
   (`VARIABLES_DE_PALETTE`, `VARIABLES_DU_NEUTRE`, `VARIABLES_GLOBALES` et les
   deux niveaux `elevation/*`, déjà définis), au lieu d'être construite dans
   `profilUcm.ts`.
4. `variableDuNom` et `nuanceAttendue`
   (`packages/plugin-explorateur/src/integrations/profilUcm.ts`) appellent ces
   fonctions. Le nom affiché reste celui du fichier.
5. Décision D6 : l'explorateur lit les termes personnalisés rangés par
   Nomenclature (par le lecteur commun du lot 12, ou celui du socle en
   attendant) ; un mode `Jour` déclaré comme `light` est reconnu. Sans règle,
   le lot 2 affiche la limite.

**Tests.**

- Kit : `termeReconnu` accepte `Soft`, `SOFT`, `soft`, une forme tolérée en
  PascalCase et un suffixe composé (`foreground-main`, `ForegroundMain`,
  `foregroundmain`) ; refuse un terme absent. Deux termes qu'une convention
  pourrait confondre restent distincts.
- `cheminConforme` accepte `color/ocean/soft/light/500` sous chaque convention
  de `CONVENTIONS`.
- Explorateur : un thème renommé selon chaque convention donne les mêmes
  constats de portée et de nuance que le thème en minuscules.

**Fini quand** : tests verts, kit publié.

## Lot 2. Une comparaison qui n'a pas pu se faire le dit

Reprend le lot A de Codex et ses constats F01 à F03.

**Ce que voit le designer aujourd'hui.** L'explorateur affiche « L’export
porte la même chose que Figma pour ce token » dans plusieurs cas où il n'a
rien comparé :

| Cas | Exemple | Source |
|---|---|---|
| Courbe d'animation | `[0.1, 0.2, 0.3, 0.4]` dans Figma, `[0.9, 0.8, 0.7, 0.6]` dans l'export | revue C02 |
| Espace de couleur | La même couleur en Display P3 et en sRGB | F01 |
| Unité | `1 s` contre `1 ms`, `1` contre `1 rem` | F02 |
| Mode non lu | Deux modes déclarés, une seule valeur lue | F03 |
| Mode nommé librement | Un mode `Jour` : la nuance n'est pas contrôlée, sans message | F03 |

**Changement.**

1. La comparaison rend l'un de trois états : égal, différent, non comparable
   (`packages/plugin-explorateur/src/integrations/contrats.ts` :
   `valeurDtcg`, `memeValeur`, `ecartsAvecLExport`). `valeurDtcg` reçoit le
   `$type` et le contexte, pas la valeur seule.
2. Les règles de comparaison des valeurs DTCG vont dans les lecteurs purs du
   kit (`lecteurs/navigateur`) : courbe, durée avec conversion d'unités
   compatibles (`1 s` égale `1000 ms`), dimension (une unité relative sans
   contexte est non comparable), graisse, couleur avec son espace.
3. L'explorateur garde le profil colorimétrique du document dans son relevé
   (`src/lecture.ts`, `Releve`, `PortDeLecture`) ; les copies CSS et le
   contraste l'emploient (F01).
4. Le résultat d'un contrôle relève séparément les contrôles faits, les
   différences et les contrôles impossibles avec leur cause : valeur absente
   d'un mode, mode non associé, rôle inconnu. Un rôle volontairement non jugé
   (`identity`) ne produit pas de constat.
5. L'interface (`src/ui/vues/integrations.ts`, `sectionContratsDeLInspecteur`,
   `src/ui/textes.ts`) affiche le texte d'égalité seulement si chaque mode
   annoncé a été comparé, et un texte pour chaque limite, par exemple « La
   comparaison de cette valeur n’est pas prise en charge » ou « Mode Jour non
   reconnu : nuance non vérifiée ».

**Tests.** Les sondes de Codex deviennent des tests : `C02-courbe`,
`espace-ignore`, `unite-ignoree`, `duree-unite-ignoree`, `mode-non-lu`,
`theme-mode-inconnu`. Plus : courbes identiques, forme inconnue, rendu réel de
l'inspecteur et pas seulement le modèle pur, import d'un relevé antérieur si sa
forme change.

**Fini quand** : aucune égalité affichée sans comparaison faite pour tous les
modes ; tests verts ; kit publié.

## Lot 3. Une couleur de composant vise le thème

**Ce que voit le designer aujourd'hui (revue, C01).** La variable couleur
`components/button/background` pointe vers une variable de `layouts`. Aucun
constat : `controlerLeProfil` lit `CIBLES_DES_COLLECTIONS.components`, qui
admet `theme`, `layouts` et `typography`. Le kit définit pourtant
`CIBLES_DES_COULEURS_DE_COMPOSANT` (`['theme']`), qu'aucun lecteur n'emploie.

**Changement.** Le kit expose une fonction qui rend les cibles admises selon
la collection et la nature de la variable (couleur, dimension, typographie).
`controlerLeProfil` (`profilUcm.ts`) l'appelle pour les variables `COLOR`.
Une cible sans couche associée donne une limite affichée (lot 2), jamais une
faute.

**Tests** (correction de Codex : le profil ne lit que les couleurs). La
fonction du kit est testée directement pour les trois natures. Dans
l'explorateur : une couleur de composant vers `theme` est acceptée ; vers
`layouts`, `typography` ou `primitives`, elle produit un constat de couche.

**Fini quand** : la sonde C01 est un test qui passe ; kit publié.

## Lot 5. Palettes annonce ce qu'il écrit, sur un lot entier

Réécrit selon la décision D2 et le lot B de Codex (F05, F06).

**Ce qui se passe aujourd'hui.**

- Une palette **reprise** dont une variable s'écrit `light` sous des règles qui
  disent `Light` : la prochaine écriture renomme la variable
  (`ecriture/variables.ts`, branche de la reprise). L'encart le dit déjà
  (`paragrapheDuRenommage`, `ui/ongletGestion.ts`) ; la ligne « Tokens
  Figma » de la fiche ne le dit que si le renommage est la seule chose à
  faire.
- Une palette **créée par Palettes** garde ses noms : la branche destination
  retrouve chaque variable par sa clé et ne la renomme pas. C'est la règle
  retenue (D2).
- **F05.** Deux palettes `Ocean-Blue` et `OceanBlue` reçoivent, sous des
  groupes en PascalCase, le même nom `Color/OceanBlue/Soft/Light/50`. Chacune
  annonce 44 créations. À l'écriture, le contrôle des noms pris lit
  `variablesLocales`, figé au début du geste, et ne voit pas les variables que
  la première palette vient de créer : la seconde échoue, ou crée des doublons
  si Figma les accepte.
- **F06.** Si Figma refuse d'enregistrer le suivi à la fin de l'écriture, les
  variables créées restent, le suivi reste vide et aucun `commitUndo` n'est
  appelé : Palettes ne les connaît plus.

**Changement.**

1. Un plan du lot entier, pur, calcule pour toutes les palettes demandées :
   les noms finaux, les réservations de noms (une palette réserve ses noms
   avant la suivante), les refus (`nom-pris`), les créations, les
   remplacements et les renommages réellement exécutés. L'annonce de Gestion
   et l'écriture consomment ce même plan. L'écriture revalide l'inventaire
   avant la première mutation.
2. L'état des tokens distingue trois listes : les renommages que l'écriture
   fera (reprise), les écarts laissés à Nomenclature (destination), et les
   noms du plan. Seuls les premiers apparaissent dans l'encart :
   « Écrire 3 couleurs, et renommer 22 variables selon vos règles de nommage,
   par exemple Color/Titanium/light/50 devient Color/Titanium/Light/50. »
   Vérifier d'abord ce que `texteDeLEcriture` reçoit déjà
   (`ui/ongletGestion.ts`, `i18n/fr.ts`, `i18n/en.ts`).
3. F06 : avant la première mutation, préparer ce qu'il faut pour défaire les
   créations et les renommages du geste. Si le rangement du suivi échoue,
   défaire, puis rendre une issue qui décrit ce qui reste ; toute mutation
   conservée est close par `commitUndo` et décrite au designer.

**Tests.** Deux palettes dont les noms convergent, dans les deux ordres, en
destination et en reprise ; un occupant tiers ; un refus injecté à chaque
étape (création, valeur, marqueur d'une variable, rangement du suivi,
restauration). Les assertions portent sur les identifiants conservés, les
mutations faites, le suivi rangé et l'annonce. Les tests tournent sur un double
de Figma qui accepte les doublons (F09) : c'est le plan qui doit refuser.

**Fini quand** : sur un lot entier, l'annonce, les refus et les mutations
concordent ; aucune mutation n'est conservée sans suivi ni explication ;
galerie de l'encart mise à jour.

## Lot 4. Les protections de Nomenclature tiennent et s'expliquent

Reprend le lot C de Codex (F07) et la décision D4 (F11).

**Ce qu'a vu le mainteneur.** Nomenclature ne proposait pas de renommer
`Color/Grass/soft/light/50`. Elle protège les variables de Palettes tant que
le fichier ne porte pas la marque `nommage`, que Palettes pose à son ouverture
(`plugin-palettes/src/ecriture/marque.ts`), et tant que les règles ne sont pas
rangées (`palettesLibres`, `plugin-socle/src/inventaireDeNoms.ts`). L'interface
montre un compte « protégés » et une seule explication, « Ouvrez UCM Palettes
une fois dans ce fichier… » (`ui/aAppliquer.ts`), qui ne vaut que pour la
marque absente ; la Configuration écrit « palettes protégées » sans raison.

**F07.** Dans `lecteurDeVariablesFigma`
(`plugin-nomenclature/src/lectureFigma.ts`), un échec de lecture du suivi de
Palettes donne un ensemble vide. Une variable reprise ne porte pas le marqueur
individuel `palette` : elle paraît alors non protégée, et Nomenclature
pourrait la renommer.

**Changement.**

1. Une lecture refusée est distincte d'une absence. Tant qu'une protection
   reste indécidable, Nomenclature suspend le renommage des variables
   concernées et le dit.
2. Quand des variables de Palettes sont protégées, Nomenclature affiche la
   raison et le geste. Exemples : « Les variables d’UCM Palettes gardent leur
   nom : ouvrez UCM Palettes une fois dans ce fichier pour qu’elles suivent
   vos règles. » ; marque posée sans règles rangées : l'enregistrement des
   règles les libère. Les comptes et les explications désignent la même cause.
3. D4 : `AGENTS.md` documente l'exception. Palettes écrit la marque à son
   ouverture, sans geste du designer, parce qu'elle déclare une capacité du
   code ouvert ; elle ne s'efface pas ; une ancienne version de Palettes
   rouverte ensuite ne la retire pas, et ne suit pas les règles. Ce risque est
   écrit, avec la conduite à tenir.
4. Les lecteurs du suivi et de la marque passent dans le kit au lot 11.

**Tests.** Marque absente, courante, invalide, future ; règles absentes,
rangées, illisibles ; suivi futur ; lecture refusée, puis rétablie ; reprise
sans marqueur individuel. Le refus est vérifié au moment d'écrire. Un état de
galerie par cas.

**Fini quand** : une lecture impossible n'autorise aucun renommage concerné ;
la raison s'affiche dans chaque cas ; tests verts.

## Lot 6. La grammaire décrit toutes les palettes du profil UCM

Reprend D1, D7 et F08.

**Ce que montre la sonde de Codex** (`matrice-grammaire`), sur les chemins que
`planDesVariables` produit réellement :

| Intensités | Nuances | Thèmes dans le chemin | Thèmes en modes |
|---|---|---|---|
| Une | Onze | 0 refus sur 22 | 22 refus sur 22 |
| Une | Treize | 4 sur 26 | 26 sur 26 |
| Deux | Onze | 0 sur 44 | 0 sur 44 |
| Deux | Treize | 8 sur 52 | 8 sur 52 |

Deux défauts : `1000` et `1050` sont refusés ; une palette à une intensité en
modes est refusée dès onze nuances. Et à deux intensités en modes,
`color/Ocean/soft/50` passe pour une erreur de raison : la grammaire prend
`soft` pour un mode, parce que le registre des modes est extensible.

**Changement.**

1. Le kit définit les numéros qu'une palette de `primitives` peut porter :
   `CRANS`, puis `1000` et `1050`. Le moteur
   (`packages/couleur/src/nuances.ts`, `PREREGLAGES[13]`) les lit du kit. Les
   dossiers du thème gardent `CRANS`.
2. Les formes de chemin de `primitives` (`architecture.ts`) tiennent compte
   des modes de la collection : quand les thèmes sont en modes, la forme omet
   le segment de thème.
3. Le kit publie une reconnaissance structurée d'un chemin, qui dit quelle
   forme est reconnue et ce que chaque segment est (palette, intensité, thème,
   cran). `cheminConforme` en dérive son booléen.
4. D7 : cette grammaire décrit le profil UCM. Une destination libre, un groupe
   personnalisé ou une reprise libre restent agnostiques, sans erreur.

**Tests.** La matrice ci-dessus, avec la forme reconnue et le rôle de chaque
segment ; des contre-exemples ambigus (`soft` à la place d'un mode).

**Fini quand** : zéro refus sur la matrice du profil UCM ; planche du moteur
et vue illustrée du référentiel régénérées ; kit publié.

## Lot 14. La destination de Palettes en full UCM

Reprend F12 et la décision D5.

**Ce qui se passe aujourd'hui.** Palettes accepte comme destination une
collection nommée `theme`, et y crée 44 variables. `validerLaDestination` et
`rangerLaDestination` vérifient une adresse et une collection locale, jamais
une couche.

**Changement.**

1. UCM Nomenclature gagne, dans sa Configuration, un interrupteur « Ce
   fichier suit l'architecture UCM », au format des interrupteurs de la
   Configuration de l'exporteur (`createInterrupteur` du socle, libellé et
   phrase d'aide, effet immédiat). Son état se range dans les données
   partagées du fichier, sous une clé que le kit déclare avec sa forme et sa
   version (`produits.ts`, puis le module `nommage` du lot 11). Désactivé par
   défaut : le périmètre agnostique reste le défaut.
2. Quand cet interrupteur est activé et que la collection visée est reconnue
   comme `theme`, `brands` ou `utility` (`collectionUcmReconnue`), Palettes
   refuse d'écrire, avant toute mutation, avec un message pour le designer.
   Interrupteur désactivé, absent ou illisible : aucun refus, une collection
   appelée `theme` reste une destination possible. La liste des couches où une
   palette n'écrit pas vient du kit (`architecture.ts`).

**Tests.** Interrupteur activé : une collection par couche interdite est
refusée avant mutation ; `primitives` et une collection libre sont admises.
Interrupteur désactivé ou absent : aucune collection n'est refusée. La lecture
de l'interrupteur : absent, courant, illisible, futur.

**Fini quand** : tests verts ; message relu avec la skill
`rediger-diagnostics-ucm`.

## Lot 15. La CLI distingue une erreur de Git d'un changement

Reprend F10.

**Ce qui se passe aujourd'hui.** `releveDuDiff` (`packages/cli/src/check.mjs`)
interprète toute exception de `git diff --quiet` comme « tokens modifiés ».
Une erreur de Git (statut 128, dépôt superficiel, base absente) produit un
rapport de CI qui parle d'un changement de tokens inexistant.

**Changement.** Seul le statut 1 vaut « différence ». Tout autre statut, et un
échec de lancement, rendent un échec de relevé, affiché comme tel par le
message terminal existant.

**Tests.** Statuts 0, 1 et 128, et erreur de lancement, sur chacun des deux
appels à Git.

**Fini quand** : tests verts ; CLI publiée.

## Lot 16. L'adaptateur TypeScript refuse un type incompatible

Reprend F04.

**Ce qui se passe aujourd'hui.** Un composant déclare `tone: number`, alors que
le contrat attend `primary | danger`. `ecartsDeParite`
(`packages/adapter-typescript/src/parite.mjs`) ne compare le type que pour les
booléens, et les valeurs que pour une union de littéraux reconnue : aucun
écart.

**Changement.** Distinguer trois cas : un type incompatible (écart), un type
plus large mais compatible, comme `string` ou une union qui contient les
valeurs du contrat (accepté selon la politique actuelle), une analyse
impossible, comme un alias non résolu (limite affichée).

**Tests.** Enum contre `number`, `boolean`, `string`, union plus large, alias
non résolu.

**Fini quand** : tests verts ; adaptateur publié, avec le kit et la CLI si la
forme du diagnostic change.

## Le principe des lots 9 à 13

Les constats C05 à C09 de la revue portent sur des règles rangées dans le
socle privé ou dans un plugin. Codex a montré que plusieurs d'entre elles ont
déjà une seconde implémentation, partielle :

| Constat | Seconde implémentation relevée par Codex |
|---|---|
| C05 | La décision des axes et de leurs collisions est calculée dans l'exporteur (`axesDesCollections`) et reproduite dans le socle (`axesPrevus`, `axesDeLExport`) ; `tests/axesDeModes.test.ts` compare les deux |
| C06 | `ROLES_DE_PEINTURE` et `ROLES_DE_CONTOUR` du diagnostic des contrastes redéfinissent la classification des rôles |
| C07 | Le suivi des variables a deux lecteurs aux politiques différentes |
| C08 | Nomenclature construit les préfixes `terme:`, `ecart:`, `ordinaire:` que le socle interprète de son côté |
| C09 | `.componentRules` et `.componentrules`, `.ruleItem` et `.ruleitem` sont écrits séparément dans `extractRules.ts` |

Ces doublons sont la première cible de chaque lot. Le reste du déplacement sert
un outil hors du dépôt (un autre plugin, un script de CI, un adaptateur), qui
ne peut pas importer une règle du socle.

Chaque lot suit les mêmes règles :

- la règle déplacée garde son comportement exact : les sorties sérialisées
  (contrats, tokens, noms calculés, octets rangés dans Figma) sont identiques
  avant et après ;
- l'ancien emplacement réexporte la fonction du kit le temps que ses clients
  migrent ; le lot finit quand plus aucun client ne passe par le réexport,
  puis le réexport est retiré ;
- ce qui touche à Figma ou au DOM reste dans le socle ou le plugin ;
- une sortie identique ne change ni `CONTRACT_VERSION` ni la version des
  tokens ; elle change la version du paquet `@ucm-kit/core` ;
- une nouvelle porte du kit est déclarée dans `packages/kit/package.json`
  (`exports`), couverte par `paquetPublie.test.mjs`, ajoutée à
  `porteNavigateur.test.mjs` si elle est pure, et décrite dans le README du
  kit.

## Lot 9. Les chemins de tokens et les axes dans le kit

**Revue, C05.** La règle qui fabrique le chemin d'un token est dans le socle
(`packages/plugin-socle/src/cheminsDeTokens.ts` : `cheminCitable`,
`prefixeDeCollection`, `joinTokenPath`). Exemple : la collection `Primitives`
et la variable `color/blue/500` donnent `primitives.color.blue.500` ; une
variable `primitives/color/blue/500` de la collection `Primitives` ne répète
pas le préfixe. La décision des axes de modes est écrite deux fois (socle et
exporteur).

**Changement.**

1. Déplacer les trois fonctions dans `packages/kit/src/format/`, à côté de
   `normalizeName` et `tokenCssVariable`.
2. Écrire une seule fois, dans le kit, la décision des axes et de leurs
   collisions, sur un inventaire portable (noms, collections, modes,
   identifiants). L'exporteur (`tokens/exportTokens.ts`, `axesDesCollections`)
   et le socle (`cheminsPublies.ts`, `axesPrevus`, `axesDeLExport`)
   l'appellent ; le relevé des objets Figma reste chez eux.
3. Migrer les clients : exporteur, explorateur, Palettes (`cheminCitable`),
   socle.

**Tests.** Les tests actuels passent sans changement d'attente : préfixes
répétés, accents, accolades, `$`, chemins vides, collisions entre un token et
un groupe, axes étendus. `tests/axesDeModes.test.ts` devient un test de la
fonction unique.

**Fini quand** : une seule implémentation des axes ; aucun client n'importe
ces fonctions depuis le socle ; kit publié.

## Lot 10. Les rôles de rendu dans le kit

**Revue, C06.** La table des cinq rôles (fond, texte, icône, contour, anneau
de focus), leurs propriétés CSS et le repli de `ring` sont construits par
l'exporteur (`plugin-exporter/src/contract/semantics.ts` :
`defaultRenderingSemantics`, `renderableRoles`, `roleKind`). Le diagnostic des
contrastes (`kit/src/lecteurs/diagnostic-contrastes.mjs`) tient ses propres
listes. Exemple : un rôle ajouté dans l'exporteur reste inconnu du diagnostic,
qui l'ignore sans erreur.

**Changement.**

1. Définir la table des rôles dans le kit (`format/`) : identifiant, nature
   (peinture ou contour), propriétés CSS, repli.
2. `defaultRenderingSemantics` construit la table du contrat depuis celle du
   kit. L'élection d'un rôle à partir d'un calque Figma reste dans
   l'extracteur.
3. Le diagnostic des contrastes dérive ses deux ensembles de la nature des
   rôles.
4. Un lecteur d'un contrat déjà publié interprète la table que ce contrat
   porte, jamais la table courante à sa place : le contrat reste
   autosuffisant.

**Tests.** Les contrats des tests de l'exporteur sont identiques octet pour
octet. Les deux ensembles du diagnostic sont dérivés de la table. Un rôle sans
nature fait échouer un test. Un contrat ancien se lit avec sa propre table.

**Fini quand** : aucune liste de rôles hors de la table du kit ; kit publié.

## Lot 11. Les protocoles entre plugins dans le kit

**Revue, C07.** Le kit porte les adresses des données partagées
(`kit/src/referentiel/produits.ts`), mais ni leur forme ni leur version. La
recette est définie et classée dans le moteur (`packages/couleur/src/recette.ts`,
`classerRecette`, commun au moteur et à l'explorateur). Le suivi des variables
a deux lecteurs : `lireLeSuivi` (`plugin-palettes/src/variables/suivi.ts`)
refuse une version future ; `variablesSuiviesParPalettes`
(`plugin-socle/src/inventaireDeNoms.ts`) relève les identifiants de toute
version. Codex a dressé la politique de chaque adresse (section « Les données
partagées, par adresse » de sa revue) : ce tableau sert de spécification de
départ.

**Changement.**

1. Créer la porte pure `@ucm-kit/core/protocoles`, avec un module par
   domaine : `palettes` (recette, suivi, marque de nommage, marqueurs `palette`
   et `cle` d'une variable), `nommage` (lot 12), `regles-usage` (lot 13).
   Chaque module porte l'adresse, la forme, les versions reconnues et le
   classement d'un contenu lu : absent, illisible, refusé, ancien, courant,
   futur. `produits.ts` garde le registre des produits et renvoie à ces
   modules.
2. Recette : extraire le modèle d'échange et `classerRecette`. Les migrations
   qui calculent des valeurs (courbes par défaut, bornes du moteur, relevé
   Tailwind) reçoivent ces paramètres, ou restent dans `ucm-couleur`
   au-dessus du lecteur du kit. Le calcul des rampes reste dans le moteur.
3. Suivi : deux lecteurs nommés du même protocole, la lecture complète, qui
   refuse une version future, et le relevé conservateur des identifiants
   protégés, qui lit toute version. Ils ne fusionnent pas : la fusion
   effacerait la protection.
4. Marque de nommage : sa forme et son lecteur (`marqueDeNommageLue`) passent
   dans le module `palettes`.
5. Aucune lecture ne migre ni ne réécrit le document.

**Tests.** Les octets qu'écrit chaque producteur sont lus par tous ses
lecteurs. Pour chaque contenu : absence, JSON invalide, lecture refusée,
version ancienne, courante et future. Les tests actuels de la recette et du
suivi passent sans changement d'attente.

**Fini quand** : Palettes, l'explorateur, Nomenclature et le socle lisent ces
contenus par le kit ; `ucm-couleur` ne porte plus que le calcul et ses
migrations ; kit publié.

## Lot 12. Le calcul du nommage dans le kit

**Revue, C08.** Le socle porte la lecture des règles rangées par Nomenclature
(`ecriture`, `terme:`, `ecart:`, `ordinaire:`, `exclues` :
`plugin-socle/src/reglesDeNommage.ts`) et le calcul `nomsSelonLesRegles`
(`plugin-socle/src/nomsSelonLesRegles.ts`), avec l'inventaire et la protection
(`inventaireDeNoms.ts` : `estProtegee`, `palettesLibres`). Nomenclature
construit les mêmes clés elle-même (`plugin-nomenclature/src/regles.ts`).

**Changement.**

1. Placer dans le module `nommage` de `@ucm-kit/core/protocoles` la forme des
   règles qui changent un nom, leurs constructeurs de clés (une seule
   définition des préfixes, pour l'écrivain et le lecteur) et leur lecture.
   Classer la version d'une entrée avant le prochain changement de protocole :
   une exclusion d'une version future ne doit pas être ignorée en silence.
2. Placer dans le kit le calcul sur un inventaire portable : le type
   `Inventaire` et ses entrées, `estProtegee`, `palettesLibres`,
   `nomsSelonLesRegles` et sa version synchrone, la décision de collision du
   lot 9.
3. Le socle garde l'acquisition de l'inventaire depuis Figma
   (`inventaireDeLectures` et les ports de lecture) et les composants
   d'interface. Nomenclature garde ses réponses d'écran, son journal
   d'annulation et les règles qui ne servent qu'à son parcours.
4. Palettes (`variables/nommeur.ts`), Nomenclature (`session.ts`,
   `ecriture.ts`) et l'explorateur (lot 1, D6) importent le calcul et la
   lecture du kit.

**Tests.** Idempotence, remplacements personnalisés, exclusions, collisions,
protection avec et sans marque, octets sérialisés par Nomenclature lus par le
kit. `tests/nomsDePalettes.test.ts` et
`plugin-nomenclature/tests/nomsDePalettes.test.ts` passent sans changement
d'attente.

**Fini quand** : Palettes et Nomenclature appellent la même fonction du kit ;
le socle ne garde que l'acquisition Figma ; kit publié.

## Lot 13. La grammaire du kit de règles Figma dans le référentiel

**Revue, C09.** Les tags des règles d'usage sont dans le kit
(`TAGS_DES_REGLES`), mais les noms des maîtres et des calques sont dans
l'exporteur (`plugin-exporter/src/contract/extractRules.ts` :
`RULES_CONTAINER_NAME`, `RULE_ITEM_NAME`, `COMPONENT_NAME_LAYER`,
`MARQUEUR_A_COMPLETER`, et les formes compactées écrites à part). Le guide
`docs/guides/KIT-DE-REGLES.md` décrit les mêmes calques à la main. Le modèle
des règles à poser (`template/modele.ts`) dépend de modules de l'exporteur.

**Changement.**

1. Définir dans le référentiel la grammaire des maîtres : noms des trois
   maîtres, calques attendus, tags requis, marqueur à compléter. Les formes
   compactées en sont dérivées.
2. Exposer un validateur pur d'un relevé des maîtres, une structure portable
   que l'exporteur construit depuis Figma : il dit ce qui manque, ce qui est
   en trop, et si une instance est vierge.
3. L'exporteur (`extractRules.ts`, `template/modele.ts`, `template/sources.ts`)
   lit la grammaire et appelle le validateur. `template/modele.ts` ne dépend
   plus que du kit.
4. Un numéro de compatibilité classe le modèle du kit Figma. Il ne modifie
   jamais une instance déjà remplie. Écarté par le mainteneur : aucune mention de
   version à écrire à la main dans Figma.
5. La liste de vérification du mainteneur, dans le guide, est produite depuis
   la grammaire, ou un test refuse un écart entre les deux.

**Tests.** Chaque tag requis et chaque calque attendu ; une instance vierge et
une instance remplie, qui reste intacte. À la publication du kit sur Figma
Community, le mainteneur compare un relevé réel à la grammaire.

**Fini quand** : aucun nom de calque du kit de règles dans l'exporteur ; le
guide et la grammaire tenus d'accord par un test ; kit publié.

## Lot 7. Des lois entre produits

Dernier lot : ses lois appellent les fonctions que les autres lots ont
rassemblées. Corrigé selon la revue de Codex.

**Pourquoi.** Les trois défauts de Palettes cités en tête auraient échoué à
une loi entre produits, alors que chaque test de paquet passait. Les tests
existants (`tests/nomsDePalettes.test.ts`, `tests/axesDeModes.test.ts`)
couvrent des cas choisis ; ce lot les généralise.

**Changement.** Un fichier de tests racine, `tests/loisEntreProduits.test.ts`,
qui croise chaque convention de `CONVENTIONS` avec chaque forme de palette
(une et deux intensités, thèmes dans le chemin et en modes, 11 et 13 nuances,
liaison destination et reprise). Les lois :

1. **Avant écriture.** À couleurs identiques, changer seulement la convention
   ne fait pas passer une palette « à mettre à jour », ni en destination ni en
   reprise ; un changement de forme réel reste signalé. C'est la loi qui
   attrape 170a6d79.
2. **Après écriture.** Avec des règles rangées, une collection non exclue et
   la marque présente, Nomenclature ne propose aucun renommage des variables
   de Palettes. Cas ajouté : la convention change après une première écriture ;
   la destination garde ses noms jusqu'au passage de Nomenclature (D2).
3. **Annonce et écriture.** Le nom que chaque écran de Palettes annonce
   (création, mise à jour, reprise, conversion, remplacement, noms occupés)
   est celui que l'écriture donne. La loi passe par le vrai calcul de l'écran,
   pas par la fonction du modèle seule : sinon elle n'attrape pas c93bff20.
   Extraire si besoin le calcul d'annonce dans une fonction pure que l'écran
   appelle.
4. **Nom pris.** Une variable non suivie porte le nom final dans une autre
   casse : destination, reprise, conversion et remplacement refusent de la
   même façon, sans doublon ni mutation d'un tiers. C'est la loi qui attrape
   7c673dac.
5. **Grammaire, dans le profil.** Chaque nom écrit vers la destination de
   référence est reconnu par la grammaire, avec la bonne forme (lot 6).
6. **Agnostique.** Une sortie de Palettes vers un groupe libre n'est jamais
   bloquée ni déclarée fautive.
7. **Explorateur.** Sur des variables du thème fabriquées selon chaque
   convention (Palettes n'écrit que des primitives), l'explorateur reconnaît
   la couche et le rôle, et ses constats sont les mêmes qu'en minuscules.
8. **Lot entier.** Deux palettes dont les noms convergent : annonce, refus et
   mutations concordent (lot 5).

Les tests emploient un double de Figma qui accepte les doublons de noms (F09) :
c'est UCM qui doit refuser, pas le double.

**Preuve que les lois servent.** Retirer une à une les corrections de
170a6d79, c93bff20 et 7c673dac : une loi nommée doit échouer pour chacune. Le
compte rendu cite le test rouge, puis les corrections sont remises.

**Fini quand** : la suite passe, et la preuve est consignée.

## Ordre

```
Lot 8 (fabrication)
  │
Lot 17 (noms des couches)
  │
  ├─► Lot 1 ─► Lot 2 ─► Lot 3                    l'explorateur
  ├─► Lot 5 ─► Lot 4                              Palettes et Nomenclature
  ├─► Lot 6                                       la grammaire
  ├─► Lot 14, Lot 15, Lot 16                      destination, CLI, adaptateur : indépendants
  └─► Lot 9 ─► Lot 11 ─► Lot 12 ─► Lot 13         le kit prend les règles du socle et de l'exporteur
       Lot 10 (indépendant)
                    │
                    ▼
                 Lot 7 (lois entre produits)
```

Le lot 17 passe avant les autres : les lots 3, 6, 9 et 14 citent les noms des couches. Le lot 14 s'appuie sur `collectionUcmReconnue`, que le lot 17 étend aux formes anciennes. Le lot 12 attend le lot 9
(la décision de collision) et le lot 11 (la porte `protocoles`). Les lots qui
changent le kit se regroupent dans une même version publiée quand leurs
commits se suivent.
