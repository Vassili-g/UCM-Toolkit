# Audit des règles dupliquées

Une règle est dupliquée quand au moins deux endroits la décident chacun de leur côté. Chaque fiche nomme les copies, prouve la divergence quand elle existe, propose un propriétaire et une loi anticopie. Une divergence « exécutée » vient d'un script lancé avec `tsx` sur les fonctions exportées du kit, ou sur le corps recopié de `HEAD` quand la fonction est privée. Une divergence « lue » vient de la lecture du code.

## Méthode

### Arbre de travail

L'audit lit `HEAD` (`abb21b6f`). D'autres sessions ont modifié le kit, Architect et Palettes pendant l'audit. Quand une fiche porte sur un fichier modifié, elle décrit `abb21b6f` et signale ce que le correctif change. Les correctifs de D-01 (wrappers) et de D-02 sont commités depuis.

### Carte de ce qui est déjà unique

| Source | Contenu |
|---|---|
| `packages/kit/src/referentiel/index.ts` | registres de termes, `formeReconnue`, `termeReconnu`, `termePourCategorie`, `variableDuThemeReconnue`, `modeDuThemeReconnu`, `collectionUcmReconnue`, `sorteDeLImbrique` |
| `packages/kit/src/emplois/` | `VARIABLES_DU_THEME`, `TABLE_DES_DOSSIERS`, `cranDeLaVariable`, `GARANTIES`, `contraste`, `aDixDecimales`, `atteintLeSeuil` |
| `packages/kit/src/format/names.ts` | `normalizeName`, `codeIdentifier`, `estUneValeurDesactivee` |
| `packages/couleur/src/index.ts` | réexporte `@ucm-kit/core/emplois` ; `ecrireContraste`, `ecrireTronque`, `estPaletteGrise`, conversions |
| Lois existantes | `tests/referentielUnique.test.ts` (listes du référentiel), `packages/kit/tests/controlesSansTermeId.test.ts` (segment comparé à `terme.id`), `packages/plugin-socle/tests/imbriquesParLeKit.test.ts` et `packages/plugin-architect/tests/imbriquesParLeKit.test.ts` (sorte d'un imbriqué) |

### Motifs lancés

Sur chaque paquet, hors `dist/`, `node_modules/` et `_local/` :

- termes : `toLowerCase\(\)`, `localeCompare`, `formeReconnue`, `termeReconnu`, `memeValeur`, littéraux `'(Pressed|press|Disabled|disable|hover|Hovered|Danger|error)'` ;
- noms : `split\('/'\)`, `endsWith\(\`/`, `VARIABLES_DU_THEME`, `cleDuTheme`, `STATE_AXIS_NAMES`, `AXE_D_ETAT`, `SIZE_VALUES` ;
- normalisation : `normalizePropKey`, `normalizePropValue`, `normalizeName`, `codeIdentifier`, `normalize\('NFKD'\)` ;
- classifications : `/font\|text`, `lineHeight\|letterSpacing\|paragraph`, `estUneProprieteDeTexte`, `estUneValeurDesactivee`, `disabled` ;
- couleur : `0\.2126`, `0\.03928`, `0\.04045`, `\+ 0\.05\)`, `contraste\(`, `aDixDecimales`, `toFixed`, `:1`, `Math\.floor\(.*100`, `C < 0\.0`, `CHROMA_` ;
- garanties : `GARANTIES`, `endsWith\('/hover'\)`, `ETATS\.find`.

### Fichiers lus par paquet

| Paquet | Fichiers lus | Mode |
|---|---|---|
| `packages/kit/src/controles/` | `corrections.ts`, `mapping.ts`, `oublis.ts`, `nommage.ts`, `theme.ts`, `structure.ts`, `accessibilite.ts`, `couche.ts`, `propagation.ts`, `typographie.ts` (extraits) | audit direct |
| `packages/kit/src/controles/` (suite) | `preparation.ts`, `releve.ts`, `catalogue.ts`, `candidatsDeLongueur.ts` (extraits sur les motifs) | audit direct |
| `packages/plugin-socle/src/` | `composant/analyse/proprietesEtEtats.ts`, `composant/contract/nodeBindings.ts`, `componentTree.ts`, `extractSlotTokens.ts`, `extractRules.ts`, `compactVariants.ts`, `template/ecriture.ts` (extraits) | audit direct, motifs sur tout `src/` |
| `packages/plugin-architect/src/` | `imbriquesDuReleve.ts`, `releveDuComposant.ts`, `lectureDuComposant.ts`, `catalogue.ts`, `composant.ts`, `consommateurs.ts`, `contraste.ts`, `modele.ts`, `ui/valeurs.ts`, `ui/ignores/modele.ts`, `integrations/profilUcm.ts`, `nomenclature/session.ts`, `nomenclature/projection.ts`, `sandbox/projectionsDesControles.ts`, `sandbox/analyse.ts` (extraits) | audit direct, motifs sur tout `src/` |
| `packages/plugin-palettes/src/` | `ui/modeleDesGaranties.ts`, `ui/nuancier.ts`, `planche/modele.ts`, `presentation.ts`, `i18n/nombres.ts`, `variables/*.ts`, `ecriture/variables.ts`, `lecture.ts` (extraits) | audit direct, motifs sur tout `src/` hors `i18n/` |
| `packages/plugin-exporter/src/` | 31 fichiers parcourus par les motifs ; `config.ts` lu | audit direct ; l'exporteur délègue ses lectures au socle |
| `packages/kit/src/referentiel/`, `emplois/`, `format/names.ts` | `reconnaissance.ts`, `vocabulaire.ts`, `architecture.ts`, `theme.ts`, `normalisation.ts`, `dossiers.ts`, `garanties.ts`, `contraste.ts`, `names.ts` | audit direct |
| `packages/cli` | 12 sur 25 | balayage `Explore`, puis vérification directe des candidats |
| `packages/adapter-typescript` | 4 sur 24 | idem |
| `packages/hub` | 5 sur 5 | idem |
| `scripts/` | 4 sur 11 | idem |
| `tests/` racine | 7 sur 26 | idem |
| `packages/couleur/` | `src/` : 22 fichiers par motifs, 14 lus en partie ; `planche/` : 2 ; `scripts/` : 5 ; `tests/` : 33 par motifs | balayage `Explore`, puis vérification directe |
| `packages/kit/src/lecteurs/` | 27 par motifs, 9 lus en partie | idem |
| `packages/kit/scripts/` | 3 lus | idem ; aucune règle locale |

Le balayage `Explore` a lu les fichiers où les motifs donnaient un résultat. Les fichiers sans occurrence n'ont pas été ouverts.

## Inventaire

| Fiche | Règle | Famille | Copies | Divergence | Gravité |
|---|---|---|---|---|---|
| [D-01](#d-01) | Une valeur d'axe d'un variant correspond à un segment de token | termes | 4 | oui, exécutée | haute |
| [D-02](#d-02) | Une fin de nom de `theme` désigne une variable du thème | noms | 2 à `HEAD`, 1 dans l'arbre | oui, exécutée | haute |
| [D-03](#d-03) | Une propriété de variant est l'axe d'états | termes | 4 | oui, exécutée | haute |
| [D-04](#d-04) | Une valeur d'état est interactive | termes | 2 | oui, exécutée | haute |
| [D-05](#d-05) | Une valeur d'état est `disabled` | termes | 2 | partielle, exécutée | basse |
| [D-06](#d-06) | Une valeur d'axe est une taille | termes | 2 | oui, exécutée | moyenne |
| [D-07](#d-07) | Un champ lié est une propriété de typographie | classifications | 6 | oui, lue | haute |
| [D-08](#d-08) | Un contraste s'affiche tronqué à deux décimales | couleur | 6 | oui, exécutée | moyenne |
| [D-09](#d-09) | Luminance relative et contraste WCAG | couleur | 1 hors tests, 4 dans les tests | non | basse |
| [D-10](#d-10) | L'encre lisible sur un fond, noir ou blanc | couleur | 5 | partielle, lue | basse |
| [D-11](#d-11) | Un fond de garantie porte un état | garanties | 2 | non | basse |
| [D-12](#d-12) | Une couleur de référence est un gris | couleur | 3 | oui, lue | moyenne |
| [D-13](#d-13) | Le nom TypeScript d'un nom libre, en Pascal | normalisation | 2 | oui, exécutée | moyenne |
| [D-14](#d-14) | Un nom de palette désigne un rôle de statut | termes | 2 | oui, lue | basse |
| [D-15](#d-15) | Libellés des états | termes | 2 | oui, lue | basse |
| [D-16](#d-16) | Règles recopiées dans les tests racine | tests | 4 | partielle, lue | moyenne |
| [D-17](#d-17) | Un nom de variable se compare par sa forme de chemin | noms | 5 | non | basse |
| [D-18](#d-18) | Le deuxième segment d'un token de composant est la famille `color` | noms | 3 | oui, lue | haute |
| [D-19](#d-19) | Un token appartient au composant par son premier segment | noms | 4 | non | basse |
| [D-20](#d-20) | Une peinture est visible | classifications | 6 | oui, lue | haute |
| [D-21](#d-21) | Une instance imbriquée a des dimensions de layout liées | liaisons | 2 | oui, documentée | moyenne |
| [D-22](#d-22) | Deux noms de variable sont le même nom dans Figma | noms | 8 | non | basse |
| [D-23](#d-23) | Un nom de mode désigne `light` ou `dark` | termes | 4 | partielle, lue | basse |
| [D-24](#d-24) | L'hexa à 8 bits d'une couleur Figma | couleur | 7 | oui, lue | moyenne |
| [D-25](#d-25) | Les mots d'un texte tapé dans Nomenclature | normalisation | 3 | oui, lue | moyenne |
| [D-26](#d-26) | Le nom `identity` d'une palette du thème | termes | 2 | partielle, lue | basse |
| [D-27](#d-27) | Les variables du thème rangées par dossier | garanties | 3 | non | basse |
| [D-28](#d-28) | La version du contrat que le kit lit au plus | format | 3 | non, latente | moyenne |
| [D-29](#d-29) | Les noms réservés du format des tokens | format | 6 | non | moyenne |

## Fiches

### D-01

**Une valeur d'axe d'un variant correspond à un segment de token.** `Color=Error` d'un variant correspond au segment `Danger` d'un token, parce que `error` est une forme tolérée de `danger` dans `REGISTRE_PALETTES_COMPOSANT`.

| Copie | Fonction | Axes reconnus par terme |
|---|---|---|
| `packages/kit/src/controles/corrections.ts:206` | `memeValeurDAxe` | état, taille, palette |
| `packages/kit/src/controles/mapping.ts:27` | `memeValeur` | état, taille |
| `packages/kit/src/controles/oublis.ts:9` | `memeValeur` | état, taille |
| `packages/kit/src/controles/nommage.ts:226-228` | en ligne, dans `controlerNommageParEtapes` | état, taille ; deux valeurs inconnues sont égales |

**Divergence exécutée.** Corps recopiés de `HEAD`, registres du kit :

| Entrée | `corrections` | `mapping`, `oublis` | `nommage` (C7) |
|---|---|---|---|
| palette `Danger` / `Error` | vrai | faux | faux |
| état `Pressed` / `press` | vrai | vrai | vrai |
| état `Zorglub` / `Bidule` | faux | faux | vrai |
| taille `Big` / `Huge` | faux | faux | faux |

La copie de `nommage.ts` compare `termeReconnu(…)?.id` des deux côtés sans exiger un terme reconnu. Deux valeurs absentes du registre rendent `undefined === undefined`. Une valeur d'état inconnue du registre est donc couverte dès qu'un token porte un segment d'état inconnu, et C7 se tait.

**Lecteurs touchés.** C7 (`nommage.ts`), C17 et C18 (`mapping.ts`, `porteLesValeursDeSonVariant`), C32 et C33 (`oublis.ts`), les corrections de taille (`corrections.ts`, `tokensDeTailleDuLayer`). Les 57 faux constats C32, C33 et C7 d'un jeu `Color=Error` lié à `Color/Danger/…` viennent des trois copies sans l'axe palette.

**Correctif voisin.** `oublis.ts` appelle maintenant `memeValeur` aussi pour les axes des wrappers. La copie reste, avec un appelant de plus.

**Propriétaire proposé.** `packages/kit/src/controles/nommage.ts`, à côté de `segmentDAxe` :

```ts
export function registreDeLAxe(axe: AxeDuComposant): Registre | undefined;
export function memeValeurDAxe(axe: AxeDuComposant, segment: string, valeur: string): boolean;
```

`memeValeurDAxe` reprend le corps de `corrections.ts` : égalité de `formeReconnue`, puis même terme reconnu des deux côtés. `registreDeLAxe` rend le registre d'un axe (`REGISTRE_ETATS`, `REGISTRE_TAILLES`, `REGISTRE_PALETTES_COMPOSANT`, `REGISTRE_STYLES_COMPOSANT`).

**Loi proposée.** `packages/kit/tests/valeurDAxeUnique.test.ts`, sur le modèle de `imbriquesParLeKit.test.ts` : aucun fichier de `packages/kit/src/controles/` hors de `nommage.ts` ne contient `termeReconnu(REGISTRE_ETATS`, `termeReconnu(REGISTRE_TAILLES` ni `axe === 'etat' ? REGISTRE_`. Un second test fixe la table ci-dessus sur `memeValeurDAxe`.

**Migration.** Correction. C7, C17, C18, C32 et C33 disparaissent sur les jeux dont l'axe palette écrit une forme tolérée. C7 apparaît sur les valeurs d'état inconnues que la copie de `nommage.ts` taisait.

**Risques.** Les constats changent : montée de version du kit. `projectionsDesControles.ts` reprend une session d'Architect avec des constats calculés par l'ancien kit ; la reprise doit recalculer ou accepter l'écart. Le format publié n'est pas touché.

### D-02

**Une fin de nom de `theme` désigne une variable du thème.** `Primary/Solid/Default` porte `solid/default`, quelle que soit l'écriture.

| Copie à `HEAD` | Fonction | Écriture |
|---|---|---|
| `packages/kit/src/referentiel/theme.ts:82` | `variableDuThemeReconnue` | toute écriture, par `formeReconnue` |
| `packages/kit/src/controles/theme.ts:201` | `cleDuTheme`, exportée | casse et séparateurs exacts |
| `packages/kit/src/controles/structure.ts:333` | `cleDuTheme`, privée | casse et séparateurs exacts |

**Divergence exécutée.**

| Nom | `cleDuTheme` de `HEAD` | `variableDuThemeReconnue` |
|---|---|---|
| `primary/solid/default` | `solid/default` | `solid/default` |
| `Primary/Solid/Default` | `undefined` | `solid/default` |
| `Primary/Surface/Foreground` | `undefined` | `surface/foreground` |
| `neutral/page/foregroundMain` | `undefined` | `page/foreground-main` |
| `Elevation/Raised` | `undefined` | `elevation/raised` |

**Lecteurs touchés.** `controles/theme.ts` (C59, C60, `estFondDeSurface`), `controles/structure.ts` (scopes du thème), `controles/accessibilite.ts:564` (rôle du fond mesuré), `plugin-architect/src/catalogue.ts:286` et `:315` (fonds de la page et de la carte).

**Correctif commité.** La copie privée de `structure.ts` disparaît ; `cleDuTheme` devient un alias de `variableDuThemeReconnue`. `controles/theme.ts` compare aussi les noms de cibles par `formeDuNom`, une forme de chemin segment par segment. Le test `themeReconnu.test.ts` vérifie l'égalité des deux fonctions sous chaque convention.

**Propriétaire proposé.** `variableDuThemeReconnue`, déjà dans `referentiel/theme.ts`. `cleDuTheme` reste un alias exporté tant qu'Architect l'importe, ou disparaît (Q-02).

**Loi proposée.** `packages/kit/tests/themeParLeReferentiel.test.ts` : aucun fichier de `packages/*/src/` ne contient `VARIABLES_DU_THEME` suivi de `.find(`, `.sort(` ou `endsWith(`, hors `referentiel/theme.ts` et `emplois/dossiers.ts`. Le motif `endsWith(\`/${` est refusé dans `controles/`. L'égalité `cleDuTheme === variableDuThemeReconnue` sous chaque convention, déjà écrite dans l'arbre, reste.

**Migration.** Correction, commitée ; la loi anticopie reste à poser. Les fichiers écrits en Pascal ou en camel gagnent C59, C60 et les fonds de garantie qu'ils perdaient.

**Risques.** `formeDuNom` de `controles/theme.ts` est une deuxième forme de chemin, voisine de `signatureDeCible` (`mapping.ts:68`) et de `structure.ts:167` et `:316` ([D-17](#d-17)).

### D-03

**Une propriété de variant est l'axe d'états.**

| Copie | Fonction | Noms reconnus |
|---|---|---|
| `packages/kit/src/referentiel/vocabulaire.ts:40` | `STATE_AXIS_NAMES` | `state`, `states`, `status` |
| `packages/kit/src/referentiel/vocabulaire.ts:116` | `REGISTRE_AXES_ETAT` | `state`, tolérés `states`, `status` |
| `packages/kit/src/controles/nommage.ts:21` | `axeDePropriete` | `STATE_AXIS_NAMES` par `formeReconnue` |
| `packages/kit/src/controles/accessibilite.ts:105` | `AXE_D_ETAT` | `/^(state\|etat\|état)$/i` |
| `packages/plugin-socle/src/composant/analyse/proprietesEtEtats.ts:122` | `isStateProperty` | `STATE_AXIS_NAMES` sur `normalizePropKey` |

**Divergence exécutée.**

| Nom d'axe | `axeDePropriete` | `AXE_D_ETAT` | `isStateProperty(normalizePropKey)` |
|---|---|---|---|
| `States` | état | faux | vrai |
| `Status` | état | faux | vrai |
| `État` | aucun | vrai | faux |

**Lecteurs touchés.** Avec `Status`, les contrôles d'accessibilité ne lisent aucun état : `estInteractif` rend faux et la cible tactile n'est pas contrôlée, alors que le nommage lit l'axe d'états. Avec `État`, l'accessibilité lit l'axe et le contrat publié n'en fait pas un `stateModel`.

**Propriétaire proposé.** `REGISTRE_AXES_ETAT` et une fonction `estLAxeDEtats(nom: string): boolean` dans `referentiel/vocabulaire.ts`, par `termeReconnu`. `STATE_AXIS_NAMES` devient une projection du registre (`[id, ...toleres]`) ou disparaît.

**Loi proposée.** `tests/axeDEtatsUnique.test.ts` à la racine : aucun fichier de `packages/*/src/` ne contient une expression régulière qui cite `state` ou `etat` comme nom d'axe, ni `STATE_AXIS_NAMES.includes`, hors `referentiel/vocabulaire.ts`.

**Migration.** Correction pour l'accessibilité (constats ajoutés sur les jeux `Status` et `States`). Pour le socle, la sortie reste identique tant que la liste ne change pas. Ajouter `etat` aux tolérés changerait le contrat publié : Q-03.

**Risques.** Le socle écrit le contrat. Un axe reconnu en plus déplace des props vers `stateModel` : champ publié, version du format.

### D-04

**Une valeur d'état est interactive.** Un jeu dont l'axe d'états porte autre chose que `default` est interactif, et la taille de sa cible se contrôle.

| Copie | Fonction | Valeurs reconnues |
|---|---|---|
| `packages/kit/src/controles/accessibilite.ts:171` | `estInteractif` | `hover`, `pressed`, en minuscules exactes (`ETATS` de `emplois/dossiers.ts`) |
| `packages/kit/src/controles/accessibilite.ts:166` | `etatDuVariant` | `toLowerCase()` de la valeur |
| `packages/kit/src/referentiel/vocabulaire.ts:104` | `REGISTRE_ETATS` | six termes et leurs formes tolérées |
| `packages/kit/src/controles/corrections.ts:277`, `:450` | littéraux `'hover'`, `'default'` | `formeReconnue` exacte |

**Divergence exécutée.** `Hovered`, `Press` et `Focus` : `estInteractif` rend faux, `REGISTRE_ETATS` reconnaît `hover`, `pressed` et `focus`. Un bouton dont les variants sont `Default`, `Hovered`, `Press` n'a pas de contrôle de cible tactile. `ETATS` sert ailleurs aux dossiers du thème (`default`, `hover`, `pressed`) ; l'accessibilité l'emprunte pour une autre question.

**Propriétaire proposé.** `termeReconnu(REGISTRE_ETATS, valeur)?.id` pour lire un état, partout. `estInteractif` lit le terme et le compare à `default`.

**Loi proposée.** Dans `controles/`, refuser `ETATS` importé de `emplois/dossiers.js` hors de `theme.ts`, `preparation.ts` et `structure.ts`, et refuser la comparaison de `formeReconnue(…)` à un littéral d'état (`'hover'`, `'pressed'`, `'default'`, `'disabled'`, `'focus'`).

**Migration.** Correction : contrôles de cible ajoutés sur les jeux à états tolérés. `corrections.ts:277` et `:450` reconnaissent `Hovered`.

### D-05

**Une valeur d'état est `disabled`.**

| Copie | Fonction |
|---|---|
| `packages/kit/src/format/names.ts:119` | `estUneValeurDesactivee`, `/^disabl(?:e\|ed)$/i` |
| `packages/kit/src/referentiel/vocabulaire.ts:104` | terme `disabled` de `REGISTRE_ETATS`, toléré `disable` |

**Divergence exécutée.** `Disabled`, `disable`, `DISABLED ` : les deux répondent oui. `Is Disabled`, `disabled-true` : les deux répondent non. Aucune entrée trouvée ne les sépare. Une forme tolérée ajoutée au registre ne passerait pas dans le format.

**Lecteurs touchés.** Socle (`proprietesEtEtats.ts`, `extractSamples.ts`, `template/modele.ts`) : la prop `disabled` du contrat. Hub : `ETATS_DU_BOUTON` (`page.ts:187`) écrit `disabled` en littéral pour la démonstration.

**Propriétaire proposé.** `estUneValeurDesactivee` reste dans `format/names.ts`, autorité du format. Son corps devient `termeReconnu(REGISTRE_ETATS, valeur)?.id === 'disabled'`.

**Loi proposée.** Un test du kit fixe l'égalité des deux sur les termes et tolérés de `REGISTRE_ETATS` et sur une liste d'entrées. Pas de loi anticopie de fichier : une seule copie existe hors du registre.

**Migration.** Sortie identique.

**Risques.** `format/` importerait `referentiel/` : vérifier que le sens d'import est admis par `packages/kit/invariants/`.

### D-06

**Une valeur d'axe est une taille.**

| Copie | Fonction | Valeurs |
|---|---|---|
| `packages/kit/src/referentiel/vocabulaire.ts:43` | `SIZE_VALUES` | `tiny`, `huge`, `big`, `xxl`… et les abréviations |
| `packages/kit/src/referentiel/vocabulaire.ts:131` | `REGISTRE_TAILLES` | abréviations ; tolérés `small`, `medium`, `large`, `big`, `xxl`, `xxxl` |
| `packages/plugin-socle/src/composant/analyse/proprietesEtEtats.ts:131` | `semanticEnumName` | `SIZE_VALUES` sur `normalizePropValue` |
| `packages/kit/src/controles/nommage.ts:24` | `axeDePropriete` | noms d'axe `size`, `sizes`, `taille` |

**Divergence exécutée.** `Huge` et `tiny` : `SIZE_VALUES` vrai, `REGISTRE_TAILLES` aucun terme. Un axe `Size=Tiny|Huge` devient `size` dans le contrat, et le contrôle de nommage ne reconnaît aucune de ses valeurs comme taille.

**Propriétaire proposé.** `REGISTRE_TAILLES`. `SIZE_VALUES` devient une projection du registre (ids et tolérés), ou le registre reçoit `tiny` et `huge` (Q-04).

**Loi proposée.** `tests/referentielUnique.test.ts` reçoit `SIZE_VALUES` : la liste doit égaler la projection du registre.

**Migration.** Selon Q-04 : sortie du contrat identique si le registre s'élargit ; contrat changé si `SIZE_VALUES` se réduit.

### D-07

**Un champ lié est une propriété de typographie.**

| Copie | Fonction | Champs |
|---|---|---|
| `packages/kit/src/controles/couche.ts:17` | `natureDeLaLiaison` | `/font\|text/i` : `lineHeight`, `letterSpacing`, `paragraphSpacing` tombent en dimension |
| `packages/kit/src/controles/couche.ts:24` | `estUneProprieteDeTexte` | `/font\|text\|lineHeight\|letterSpacing\|paragraph/i` |
| `packages/kit/src/controles/propagation.ts:84` | `sorteDeLaLiaison` | même expression que `estUneProprieteDeTexte`, recopiée |
| `packages/kit/src/controles/typographie.ts:17` | `CHAMPS_DE_TYPOGRAPHIE` | six champs, sans `paragraphSpacing` ni `paragraphIndent` |
| `packages/plugin-architect/src/composant.ts:87` | `POLICES` | huit champs |
| `packages/plugin-architect/src/consommateurs.ts:126` | `CHAMPS_DE_TEXTE` | les mêmes huit |
| `packages/kit/src/lecteurs/typography-token-types.mjs:17` | `TYPES_TYPOGRAPHIQUES` | sept champs du contrat et leurs types de token |
| `packages/kit/src/lecteurs/validation-contrat.mjs:560-569` | `CHAMPS_TYPOGRAPHIQUES`, `TOKENS_TYPOGRAPHIQUES_130` | les mêmes sept champs |

**Divergence lue.** `lineHeight` : `natureDeLaLiaison` rend `dimension`, les cinq autres le rangent en typographie. Le commentaire de `estUneProprieteDeTexte` constate l'écart et le compense pour C80. `paragraphSpacing` : absent de `CHAMPS_DE_TYPOGRAPHIE`, présent ailleurs. L'expression régulière accepte aussi un champ inconnu qui contient `text` (`textRangeFills`, lu ailleurs comme une peinture par `consommateurs.ts:125`).

**Lecteurs touchés.** C80 (`couche.ts`), propositions de propagation (`propagation.ts`), contrôles de typographie, natures affichées par Architect.

Les deux lecteurs `.mjs` lisent les champs du contrat, pas les champs Figma. Leurs noms coïncident, et `types.ts` en est l'autorité.

**Propriétaire proposé.** `packages/kit/src/referentiel/` ou `controles/releve.ts` : une liste `CHAMPS_DE_TYPOGRAPHIE` des champs Figma liables d'un texte, et `natureDuChamp(champ: string, type: string): 'couleur' | 'typographie' | 'dimension'`. Architect importe la liste.

**Loi proposée.** Refuser, dans `packages/*/src/`, une expression régulière qui contient `font` et `text`, et toute liste littérale contenant `'letterSpacing'` hors du propriétaire et du socle (le socle porte le contrat, Q-05).

**Migration.** Correction : `natureDeLaLiaison` range `lineHeight` en typographie, ce qui change la nature de C80 sur ces liaisons. Le reste est à sortie identique.

### D-08

**Un contraste s'affiche tronqué à deux décimales.** 4,499 s'affiche `4,49` et n'atteint pas 4,5 ([MOT-22]).

| Copie | Fonction | Calcul |
|---|---|---|
| `packages/couleur/src/contraste.ts:28` | `ecrireTronque`, `ecrireContraste` | `aDixDecimales`, coupe, virgule |
| `packages/plugin-architect/src/contraste.ts:30` | `ratioAffiche` | même calcul, recopié |
| `packages/kit/src/lecteurs/diagnostic-contrastes.mjs:204` | `contrasteEcrit` | même calcul par expression régulière |
| `packages/kit/src/controles/accessibilite.ts:629` | `sansArrondi` | `Math.floor(rapport * 100) / 100` |
| `packages/plugin-architect/src/ui/ignores/modele.ts:160` | `rapportEnTexte` | `String(valeur)` et virgule, sans troncature |
| `packages/plugin-palettes/src/i18n/nombres.ts:15` | `contraste` | appelle `ecrireContraste`, change le séparateur |

**Divergence exécutée.**

| Ratio | `aDixDecimales` tronqué | `Math.floor(r * 100) / 100` | `String(r)` |
|---|---|---|---|
| 4.35 | `4,35` | 4.34 | `4,35` |
| 4.499999999999 | `4,50` | 4.49 | `4,499999999999` |

`sansArrondi` reproduit l'erreur que `aDixDecimales` évite. Le fait `rapport` du constat de contraste vaut donc parfois un centième de moins que l'affichage de Palettes pour la même paire. `rapportEnTexte` affiche le fait tel quel : il hérite de l'écart de `sansArrondi`, et afficherait toutes les décimales d'un fait non tronqué.

**Lecteurs touchés.** Constats d'accessibilité (fait `rapport`, `rapports`), panneau des constats ignorés d'Architect, diagnostic des contrastes du CLI.

**Propriétaire proposé.** `packages/kit/src/emplois/contraste.ts` : `contrasteTronque(x: number, decimales = 2): number` et `ecrireContraste(x: number, separateur = ','): string`. `ucm-couleur` les réexporte déjà par `emplois`.

**Loi proposée.** Refuser, hors de `emplois/contraste.ts`, `aDixDecimales(…).split('.')`, `aDixDecimales(…).replace(` et `Math.floor(… * 100) / 100` dans `packages/*/src/`.

**Migration.** Correction pour `sansArrondi` : quelques faits `rapport` gagnent un centième. Sortie identique pour les autres.

**Risques.** `rapport` est un fait de constat, lu par Architect et par la reprise de session (`projectionsDesControles.ts`).

### D-09

**Luminance relative et contraste WCAG.** Le kit les porte une fois (`emplois/contraste.ts:15-40`), et `ucm-couleur`, Architect et le hub l'importent.

| Copie | Rôle |
|---|---|
| `packages/couleur/planche/page.js:6-18` | script de la planche, copié tel quel dans la page HTML |
| `packages/plugin-palettes/tests/interface/interface.test.mjs:263`, `:5497` | contrôle dans le navigateur |
| `packages/plugin-palettes/tests/roueDesTeintes.test.ts:98` | test |
| `packages/kit/tests/accessibilite.test.ts:157`, `:170`, `:798` | fabrique de couleurs au contraste voulu |

**Divergence.** Aucune : mêmes constantes, même formule.

**Propriétaire.** `emplois/contraste.ts`, inchangé. `page.js` tourne dans la page générée, sans import : `generer-planche.ts` peut y injecter le corps de `contraste` comme il injecte les données (Q-06). Les tests du navigateur ont la même contrainte.

**Loi proposée.** Refuser `0.2126` hors de `emplois/contraste.ts`, sauf dans une liste d'exceptions qui nomme chaque fichier et sa raison.

**Migration.** Sortie identique.

### D-10

**L'encre lisible sur un fond, noir ou blanc.**

| Copie | Fonction | À égalité |
|---|---|---|
| `packages/hub/src/vues/page.ts:127` | `encreSur` | blanc |
| `packages/couleur/planche/page.js:19` | `encreSur` | noir |
| `packages/plugin-palettes/src/planche/modele.ts:204` | sans nom | noir |
| `packages/plugin-palettes/src/ui/nuancier.ts:827` | pastille | noir |
| `packages/plugin-palettes/src/ui/nuancier.ts:113` | `sombre` | compare `[30,30,30]` et `[245,245,245]` |

**Divergence lue.** L'égalité exacte n'arrive pas sur des octets : l'écart est théorique. `nuancier.ts:113` pose une autre question, avec d'autres encres ; ce n'est pas la même règle.

**Propriétaire proposé.** `emplois/contraste.ts` : `encreLisible(fond: Rgb8): 'noir' | 'blanc'`.

**Loi proposée.** Refuser `contraste(…, [0, 0, 0]) >= contraste(…, [255, 255, 255])` et l'inverse hors du propriétaire.

**Migration.** Sortie identique.

### D-11

**Un fond de garantie porte un état.** `surface/hover` est le fond de l'état `hover`.

| Copie | Fonction |
|---|---|
| `packages/plugin-palettes/src/ui/modeleDesGaranties.ts:24` | `colonneDuFond`, `ETATS.find(… endsWith)` |
| `packages/hub/src/modele/modele.ts:258` | `fondsGardes`, `endsWith('/hover')`, `endsWith('/pressed')` |
| `packages/kit/src/controles/theme.ts:93` | `estFondDeSurface`, `/^surface\/(default\|hover\|pressed)$/` |

**Divergence.** Aucune aujourd'hui : les noms viennent de `GARANTIES`, en minuscules.

**Propriétaire proposé.** `emplois/garanties.ts` : `etatDuFond(fond: FondDeGarantie): Etat | 'page' | 'carte'`.

**Loi proposée.** Refuser `endsWith('/hover')` et `endsWith('/pressed')` dans `packages/*/src/`.

**Migration.** Sortie identique.

### D-12

**Une couleur de référence est un gris.**

| Copie | Seuil |
|---|---|
| `packages/couleur/src/palette.ts:140` | `estPaletteGrise` : R, G et B égaux sur toutes les rampes |
| `packages/hub/src/modele/modele.ts:112` | `CHROMA_DES_GRIS = 0.05` |
| `packages/hub/src/modele/modele.ts:418` | `familleTailwindProche` : `C < 0.04` |
| `packages/hub/src/modele/modele.ts:411`, `packages/couleur/planche/generer-planche.ts:39` | `FAMILLES_GRISES`, les cinq familles grises de Tailwind recopiées |

**Divergence lue.** Une référence de chroma 0,045 est grise pour `modele.ts:211` et colorée pour `familleTailwindProche`. Le hub la range avec les gris et lui cherche une famille Tailwind colorée.

**Propriétaire proposé.** `ucm-couleur` : `estReferenceGrise(reference: Rgb8): boolean`, un seul seuil. `estPaletteGrise` répond à une autre question (rampes déjà calculées) et reste.

**Loi proposée.** Refuser `.C < 0.0` dans `packages/hub/src/` et `packages/plugin-*/src/`.

**Migration.** Correction dans le hub seulement.

### D-13

**Le nom TypeScript d'un nom libre, en Pascal.**

| Copie | Fonction |
|---|---|
| `packages/kit/src/format/names.ts:12` | `codeIdentifier` |
| `packages/adapter-typescript/src/generation.mjs:11` | `pascal` |

**Divergence exécutée.** `libellé` : `pascal` rend `Libell`, `codeIdentifier` rend `Libelle`. `2xl` : `pascal` rend `2xl`, un identifiant TypeScript invalide ; `codeIdentifier` rend `Component2xl`.

**Lecteurs touchés.** Noms des types d'enum générés par l'adaptateur (`${composant}${pascal(prop)}`).

**Propriétaire proposé.** `codeIdentifier`, autorité du format.

**Loi proposée.** Refuser une fonction `pascal` ou `toUpperCase()` après `[^a-zA-Z0-9]` dans `packages/adapter-typescript/src/` et `packages/cli/src/`.

**Migration.** Correction : un type d'enum nommé depuis une prop accentuée change de nom dans le code généré. Le paquet adaptateur monte de version.

### D-14

**Un nom de palette désigne un rôle de statut.**

| Copie | Fonction |
|---|---|
| `packages/kit/src/referentiel/architecture.ts` | `REGISTRE_STATUTS`, tolérés comme `error` |
| `packages/hub/src/vues/page.ts:61` | `ROLES`, expressions régulières par teinte (`red`, `poppy`, `crimson`…) |

**Divergence lue.** Le hub reconnaît par teinte, le registre par terme. `Poppy` est `danger` pour le hub et inconnu du registre. Le hub est une page de démonstration ; le rôle n'y produit aucun constat.

**Propriétaire proposé.** Le registre pour les termes. Les teintes restent au hub si le mainteneur garde cette devinette de démonstration (Q-07).

**Migration.** Sortie identique si les termes passent par le registre et les teintes restent au hub.

### D-15

**Libellés des états.**

| Copie | Libellés |
|---|---|
| `packages/kit/src/referentiel/vocabulaire.ts:104` | Par défaut, Survol, Focus, Pressé, Désactivé |
| `packages/hub/src/vues/page.ts:187` | Repos, Survol, Focus, Appui, Désactivé |

**Divergence lue.** Deux libellés sur cinq diffèrent.

**Propriétaire proposé.** `libelle.fr` de `REGISTRE_ETATS`.

**Loi proposée.** `tests/referentielUnique.test.ts` couvre déjà les listes de termes ; y ajouter les libellés.

**Migration.** Texte du hub changé.

### D-16

**Règles recopiées dans les tests racine.**

| Copie | Règle |
|---|---|
| `tests/loisEntreProduits.test.ts:51`, `:99`, `:206-208`, `:260`, `:297`, `:402` | égalité de noms par `toLowerCase()`, à la place de `formeReconnue` |
| `tests/fabriquesDeFichiers.ts:194` | cinq variables du thème en littéral |
| `tests/nomsDePalettes.test.ts:32` | les onze crans en littéral |
| `tests/referentielUnique.test.ts:23` | `ETATS`, sept mots en littéral |
| `packages/couleur/tests/` (`architecture`, `enveloppe`, `proprietes`, `rampe`, `recette`, `vecteurs`), `packages/couleur/scripts/mesurer-temps.mjs:22` | les onze crans en littéral, au lieu de `CRANS` |
| `packages/couleur/tests/promesses.test.ts:177` | `COULEUR_DU_TEXTE_DES_BOUTONS` recopiée |
| `packages/couleur/tests/base.test.ts:177`, `ancrage.test.ts:134`, `intensites.test.ts:62`, `reconstruction.test.ts:68` | `ecrireHexa` recopiée |

**Divergence lue.** `toLowerCase()` ne reconnaît pas `foregroundMain` comme `foreground-main`. Une loi entre produits qui compare ainsi passe sur des fixtures en minuscules et ne dit rien d'un fichier en camel.

**Propriétaire proposé.** Les tests importent `formeReconnue`, `VARIABLES_DU_THEME` et `CRANS`.

**Loi proposée.** Étendre `tests/referentielUnique.test.ts` aux fichiers de `tests/` racine, avec une liste d'exceptions nommées (le détecteur lui-même).

**Migration.** Tests seulement.

### D-17

**Un nom de variable se compare par sa forme de chemin.** Chaque segment passe par `formeReconnue`, puis les segments se rejoignent par `/`.

| Copie | Fonction |
|---|---|
| `packages/kit/src/controles/mapping.ts:68` | `signatureDeCible` (sans le premier segment pour `theme`) |
| `packages/kit/src/controles/structure.ts:167` | signature d'un token, palette remplacée par `*` |
| `packages/kit/src/controles/structure.ts:316` | `signatureSansPalette`, même calcul que la ligne 167 |
| `packages/kit/src/controles/structure.ts:322` | `remplacerSegment`, segment cherché par forme |
| `packages/kit/src/controles/theme.ts` (depuis le correctif de D-02) | `formeDuNom`, `formeDuNomRemplace` |

**Divergence.** Aucune : même calcul. `structure.ts` le porte deux fois dans le même fichier.

**Propriétaire proposé.** `packages/kit/src/referentiel/reconnaissance.ts` : `formeDuChemin(nom: string | readonly string[]): string`.

**Loi proposée.** Refuser `.map(formeReconnue).join('/')` hors de `reconnaissance.ts`.

**Migration.** Sortie identique.

### D-18

**Le deuxième segment d'un token de composant est la famille `color`.**

| Copie | Fonction | Formes reconnues |
|---|---|---|
| `packages/kit/src/controles/nommage.ts:158`, `:249` | `calculerLesTokensParEtapes`, C8 | `termeReconnu(FAMILLES_PRIMITIVES, …)` : `color`, `colors`, `colour` |
| `packages/kit/src/controles/corrections.ts:110` | `couleursDuComposant` | `formeReconnue(…) === 'color'` |
| `packages/kit/src/controles/structure.ts:102` | un segment quelconque vaut `color` | `formeReconnue(…) === 'color'` |

**Divergence lue.** `Button/Colors/Primary/background` : le nommage lit `Colors` comme la famille `color` et propose C8 (forme tolérée). `couleursDuComposant` écarte le token, et les corrections de couleur ne le proposent pas comme cible. `formeReconnue('Colors')` vaut `colors`.

**Lecteurs touchés.** Corrections de liaisons de couleur (C16, C22, C24), contrôle de structure.

**Propriétaire proposé.** `termeReconnu(FAMILLES_PRIMITIVES, segment)?.id === 'color'`, sous un nom : `estLaFamilleCouleur(segment: string): boolean` dans `referentiel/architecture.ts`.

**Loi proposée.** La loi de D-04 (refus de `formeReconnue(…) === '<littéral>'` dans `controles/`) couvre aussi ce cas.

**Migration.** Correction : les jeux écrits `Colors` reçoivent des corrections de couleur.

### D-19

**Un token appartient au composant quand son premier segment a la forme du nom du jeu.**

| Copie | Fonction |
|---|---|
| `packages/kit/src/controles/nommage.ts:136-153` | `calculerLesTokensParEtapes` |
| `packages/kit/src/controles/corrections.ts:109` | `couleursDuComposant` |
| `packages/kit/src/controles/mapping.ts:215` | C19 |
| `packages/kit/src/controles/preparation.ts:124` | `segmentDe(releve.jeu.nom)` |

**Divergence.** Aucune : même comparaison par `formeReconnue`.

**Propriétaire proposé.** `packages/kit/src/controles/nommage.ts` : `estDuComposant(nom: string, jeu: string): boolean`, employé par `calculerLesTokensParEtapes`.

**Loi proposée.** Refuser `formeReconnue(variable.nom.split('/')[0])` hors de `nommage.ts`.

**Migration.** Sortie identique.

### D-20

**Une peinture est visible.**

| Copie | Fonction | Opacité nulle |
|---|---|---|
| `packages/plugin-architect/src/releveDuComposant.ts:109` (`HEAD`) | `PeintureLue.visible` du relevé | visible |
| `packages/kit/src/controles/accessibilite.ts:192` | `aUnePeintureVisible`, lit `p.visible` | visible |
| `packages/plugin-architect/src/releveDuComposant.ts:171` | contour visible | invisible |
| `packages/plugin-architect/src/lectureDuComposant.ts:158` | `peintureVisible` | invisible |
| `packages/plugin-socle/src/composant/contract/extractSlotTokens.ts:158` | `peint` | invisible |
| `packages/plugin-architect/src/catalogue.ts:331` | fond de la page | visible, l'opacité devient l'alpha |

**Divergence lue.** Un contour `SOLID` visible d'opacité 0 : le relevé le marque `visible: true` et garde `opacite: 0` à part. `aUnePeintureVisible` le compte, et l'accessibilité mesure un contour que le designer ne voit pas. `releveDuComposant.ts:171` le juge invisible et n'écrit pas l'épaisseur.

**Lecteurs touchés.** C50 (contour et anneau, `accessibilite.ts:613`), contraste d'une icône peinte (`accessibilite.ts:607`), épaisseurs de contour du relevé, slots du contrat.

**Propriétaire proposé.** `packages/kit/src/controles/releve.ts` : `peintureVisible(p: PeintureLue): boolean` (`visible && opacite > 0`). Le socle garde sa version sur les objets Figma bruts, ou importe une variante `peintureFigmaVisible` du kit (Q-08).

**Loi proposée.** Refuser `.visible !== false && ` suivi de `opacity` hors du propriétaire.

**Migration.** Correction : moins de constats de contraste sur des peintures d'opacité nulle.

**Risques.** Les tests qui comptent les accès Figma d'Architect ne changent pas : la règle porte sur des données déjà lues.

### D-21

**Une instance imbriquée a des dimensions de layout liées.**

| Copie | Fonction | Calques lus |
|---|---|---|
| `packages/plugin-socle/src/composant/contract/componentTree.ts:333-353` | `LAYOUT_BINDING_PATTERNS`, `countLayoutBindings` | tout le sous-arbre rendable |
| `packages/plugin-architect/src/imbriquesDuReleve.ts:26`, `:46` | `DIMENSIONS_DE_LAYOUT`, `dimensionsLiees` | l'instance et les calques que sa surcharge vise |

**Divergence lue, documentée.** L'en-tête de `imbriquesDuReleve.ts` la décrit : un wrapper dont les liaisons de layout vivent sur un calque non surchargé est un wrapper pour le contrat et une instance sans sorte pour Architect. La liste des quatre motifs est recopiée telle quelle.

**Propriétaire proposé.** La liste : `packages/plugin-socle/src/composant/contract/nodeBindings.ts`, `DIMENSIONS_DE_LAYOUT` exportée. Le comptage reste double tant qu'Architect ne parcourt pas les calques (Q-09).

**Loi proposée.** Étendre `packages/plugin-architect/tests/imbriquesParLeKit.test.ts` : refuser `BINDING_PATTERNS.gap, BINDING_PATTERNS.paddingX` hors de `nodeBindings.ts`.

**Migration.** Sortie identique pour la liste.

### D-22

**Deux noms de variable sont le même nom dans Figma.** Palettes compare par `toLowerCase()`.

| Copie |
|---|
| `packages/plugin-palettes/src/ecriture/variables.ts:165` |
| `packages/plugin-palettes/src/variables/lot.ts:308` |
| `packages/plugin-palettes/src/variables/conversion.ts:69` |
| `packages/plugin-palettes/src/variables/etat.ts:146` |
| `packages/plugin-palettes/src/variables/plan.ts:91`, `:96`, `:199` |
| `packages/plugin-palettes/src/variables/reprise.ts:271` |

**Divergence.** Aucune entre les copies. La règle diffère de `formeReconnue` par choix : elle porte sur l'identité d'un nom dans Figma, pas sur la reconnaissance d'un terme.

**Propriétaire proposé.** `packages/plugin-palettes/src/variables/` : `memeNomFigma(a: string, b: string): boolean`.

**Loi proposée.** Refuser `.toLowerCase() === ` et `.toLowerCase() !== ` sur `nom` ou `name` dans `packages/plugin-palettes/src/variables/` et `src/ecriture/`, hors du propriétaire.

**Migration.** Sortie identique.

### D-23

**Un nom de mode désigne `light` ou `dark`.**

| Copie | Fonction |
|---|---|
| `packages/kit/src/referentiel/theme.ts:92` | `modeDuThemeReconnu`, par `formeReconnue` et l'index du vocabulaire |
| `packages/plugin-palettes/src/ecriture/variables.ts:107` | `trim().toLowerCase() ===` |
| `packages/plugin-palettes/src/variables/lot.ts:169` | idem |
| `packages/kit/src/controles/theme.ts:159` | `modeUcmDepuisNom`, `formeReconnue` sans index |

**Divergence lue.** Un mode renommé par le vocabulaire du fichier (un terme ordinaire de Nomenclature qui remplace `dark`) : `modeDuThemeReconnu` le reconnaît avec l'index, Palettes non. Sans index, aucune entrée trouvée ne les sépare. `modeUcmDepuisNom` est une troisième copie, sans index.

**Propriétaire proposé.** `modeDuThemeReconnu`.

**Loi proposée.** Refuser `mode.name.trim().toLowerCase()` et `mode.nom.trim().toLowerCase()` dans `packages/*/src/`.

**Migration.** Sortie identique sans vocabulaire du fichier.

### D-24

**L'hexa à 8 bits d'une couleur Figma, composantes de 0 à 1.**

| Copie | Fonction | Casse | Borne | Alpha |
|---|---|---|---|---|
| `packages/kit/src/controles/accessibilite.ts:581`, `:625` | `versRgb8`, `hexa` | minuscules | oui | non |
| `packages/kit/src/controles/preparation.ts:93` | `hexaDe` | majuscules | oui | non |
| `packages/plugin-architect/src/modele.ts:177` | `hexaDeCouleur` | majuscules | oui, signalée | oui |
| `packages/plugin-palettes/src/variables/releve.ts:44`, `:52` | `octet`, `hexaDeFigma` | majuscules | oui | oui |
| `packages/plugin-palettes/src/lecture.ts:352` | en ligne | selon `ecrireHexa` | non | non |
| `packages/plugin-architect/src/contraste.ts:25` | `enOctets` | sans objet | non, gamut contrôlé avant | non |
| `packages/plugin-architect/src/ui/valeurs.ts:20` | `canal`, vers `rgba()` | sans objet | non, composantes contrôlées avant | non |

Trois lecteurs d'un hexa acceptent des formes différentes. `lireHexa` (`packages/couleur/src/conversions.ts:37`) lit `#RGB` et `#RRGGBB` sans alpha, sur une saisie du designer. `packages/kit/src/lecteurs/comparaison-dtcg.mjs:43` lit `#RRGGBB` et un alpha ; `packages/kit/src/lecteurs/diagnostic-contrastes.mjs:58` lit `#rrggbb` seul. Les deux lecteurs du kit lisent la valeur publiée, dont `FORMAT.md` fixe la forme : ils partagent une question, que `lireHexa` ne pose pas.

**Divergence lue.** Le fait `premierPlan` d'un constat de contraste s'écrit `#1a2b3c` ; la même couleur s'écrit `#1A2B3C` dans Architect et Palettes. `lecture.ts:352` sans borne rendrait `100` pour une composante à 1,002.

**Propriétaire proposé.** `packages/kit/src/emplois/contraste.ts` ou un module `emplois/couleur.ts` : `versRgb8(c: { r: number; g: number; b: number }): Rgb8` (borné) et `hexaDeFigma(c, { alpha?: boolean }): string` en majuscules. `ucm-couleur` garde `lireHexa` et `ecrireHexa` sur `Rgb8`.

**Loi proposée.** Refuser `Math.round(… * 255)` hors du propriétaire et de `packages/couleur/src/conversions.ts`.

**Migration.** Correction de casse sur les faits `premierPlan` et `fond` des constats de contraste.

**Risques.** Les faits sont lus par la reprise d'Architect et par ses états de galerie.

### D-25

**Les mots d'un texte que le designer tape dans Nomenclature.**

| Copie | Fonction | Découpe |
|---|---|---|
| `packages/kit/src/referentiel/ecriture-des-mots.ts:20` | `decouperSegment` | séparateurs, casse camel, chiffres |
| `packages/plugin-architect/src/nomenclature/session.ts:92` | `motsDe` | espaces et tirets seulement, en minuscules |
| `packages/plugin-architect/src/nomenclature/session.ts:95` | `motsDuTermeUcm` | parcourt `REGISTRES` pour retrouver un terme par `id.toLowerCase()` |

**Divergence lue.** Le designer tape `foregroundMain` : `motsDe` rend un mot, `decouperSegment` en rend deux. Le lexique du fichier, découpé par `decouperSegment`, ne contient pas la suite d'un seul mot, et `employe` rend faux. `motsDuTermeUcm` refait la recherche de terme que `termeReconnu` indexe déjà.

**Propriétaire proposé.** `decouperSegment` pour les mots ; `termeReconnu` sur `REGISTRES` pour retrouver un terme.

**Loi proposée.** Refuser `.split(/[\s-]+/` dans `packages/plugin-architect/src/nomenclature/`.

**Migration.** Correction, à confirmer par le mainteneur : un terme saisi en camel change de découpe (Q-10).

### D-26

**Le nom `identity` d'une palette du thème.**

| Copie | Fonction |
|---|---|
| `packages/kit/src/referentiel/architecture.ts:67` | terme `identity` de `FAMILLES_BRANDS` |
| `packages/plugin-architect/src/integrations/profilUcm.ts:124` | `estIdentite`, `toLowerCase() === 'identity'` |

**Divergence lue.** `Primary/Identity-color` ou un vocabulaire du fichier qui renomme `identity` : le registre peut les reconnaître, `estIdentite` non.

**Propriétaire proposé.** `termeReconnu(FAMILLES_BRANDS, segment)?.id === 'identity'`.

**Loi proposée.** Celle de D-04 étendue à `packages/plugin-architect/src/` : pas de `toLowerCase() === '<terme>'`.

**Migration.** Sortie identique sur les noms trouvés.

### D-27

**Les variables du thème rangées par dossier.**

| Copie | Contenu |
|---|---|
| `packages/kit/src/emplois/dossiers.ts:13-18` | `DOSSIERS`, `ETATS`, `VARIABLES_DE_PALETTE` |
| `packages/plugin-palettes/src/planche/modele.ts:361-363` | `solid`, `surface`, `page` et leurs variables, en littéral |
| `packages/plugin-palettes/src/presentation.ts:285-292` | groupes de la carte, en littéral |

**Divergence.** Aucune aujourd'hui. Une variable ajoutée au dossier `page` ne paraîtrait pas sur la planche.

**Propriétaire proposé.** `emplois/dossiers.ts` : `variablesDuDossier(dossier): readonly VariableDePalette[]`.

**Loi proposée.** `tests/referentielUnique.test.ts` refuse déjà les listes recopiées ; y ajouter le motif `'solid/default', 'solid/hover'` et `'page/foreground', 'page/border'` hors des domiciles.

**Migration.** Sortie identique.

### D-28

**La version du contrat que le kit lit au plus.**

| Copie | Valeur |
|---|---|
| `packages/kit/src/format/version.ts:16` | `CONTRACT_VERSION = '14.0'`, la version écrite |
| `packages/kit/src/lecteurs/version-contrat.mjs:14` | `VERSION_CONTRAT_MAXIMALE = "14.0"`, la version lue au plus |
| `packages/kit/tests/version-contrat.test.mjs:32` | `"14.0"` en littéral |

**Divergence latente, lue.** Aucun test ne lie les deux constantes. Une montée de `CONTRACT_VERSION` à `15.0` sans celle de la fenêtre ferait juger `recent` les contrats que l'exporteur du même kit écrit, et `ucm check` les refuserait.

**Propriétaire proposé.** `format/version.ts`. `VERSION_CONTRAT_MAXIMALE` vaut `CONTRACT_VERSION`, et `VERSION_CONTRAT_MINIMALE` se déclare à côté.

**Loi proposée.** Un test du kit : `VERSION_CONTRAT_MAXIMALE === CONTRACT_VERSION`. Le littéral du test disparaît.

**Migration.** Sortie identique.

**Risques.** Les lecteurs sont des `.mjs` publiés. Ils importent déjà `@ucm-kit/core/emplois` ; l'import de `format` est du même ordre.

### D-29

**Les noms réservés du format des tokens.** Les clés `com.ucm.modes` et `com.ucm.extensions` de `$extensions`, et le nom `base` de la collection elle-même.

| Copie | Rôle |
|---|---|
| `packages/kit/src/format/tokens.ts:84-98` | `EXTENSION_AXES_TOKENS`, pour `com.ucm.axes` seulement |
| `packages/plugin-exporter/src/tokens/exportTokens.ts:365-368`, `:792-795` | écrit les deux clés en littéral |
| `packages/kit/src/lecteurs/modes-tokens.mjs:22-25`, `:56-70` | constantes locales ; `base` en littéral |
| `packages/kit/src/lecteurs/typography-token-types.mjs:47-49` | les deux clés en littéral |
| `packages/cli/src/tokens-css.mjs:246-248`, `:295`, `:353-396` | les deux clés et `base` en littéral |
| `packages/cli/src/init.mjs:374` | `com.ucm.axes` en littéral, au lieu de `EXTENSION_AXES_TOKENS` |

**Divergence.** Aucune aujourd'hui. Un renommage dans l'exporteur produirait des tokens que le CLI ne lit plus, sans erreur de compilation.

**Propriétaire proposé.** `packages/kit/src/format/tokens.ts` : `EXTENSION_MODES_TOKENS`, `EXTENSION_SURCHARGES_TOKENS` et `MODE_DE_BASE`, à côté de `EXTENSION_AXES_TOKENS`.

**Loi proposée.** Refuser les littéraux `'com.ucm.` et `"com.ucm.` dans `packages/*/src/` hors de `format/tokens.ts`.

**Migration.** Sortie identique.

## Non-doublons

| Apparence | Raison |
|---|---|
| Forge du CLI (`packages/cli/src/init.mjs:166`) et hôtes de l'exporteur (`packages/plugin-exporter/src/config.ts:85`) | Le CLI accepte une instance GitLab auto-hébergée ; le réseau du plugin se limite à `gitlab.com`. Deux règles différentes |
| Pin du CLI (`packages/cli/src/guide.mjs:195`) et pins servis (`scripts/pins-servis.mjs:37`) | Le premier lit le numéro de `@ucm-kit/cli` dans un repository consommateur ; le second relève tous les pins des documents de ce dépôt |
| `normalizePropKey` (socle) et `formeReconnue` (kit) | Le premier produit la clé camel publiée dans le contrat, le second une forme de reconnaissance. Ils ne répondent pas à la même question ; D-03 traite le seul cas où l'un remplace l'autre |
| `estPaletteGrise` et le seuil de chroma du hub | Rampes calculées contre couleur de référence (D-12 garde le seul seuil du hub) |
| `nuancier.ts:113` et l'encre lisible | Autres encres, autre question (D-10) |
| `identifiantDansLeMaitre` (`plugin-architect/src/imbriquesDuReleve.ts:67`) et `finCommune` (`plugin-socle/src/composant/contract/compactVariants.ts:149`) | Le premier traduit un identifiant `I<instance>;<calque>` vers le maître ; le second cherche la fin commune de plusieurs identifiants. Deux questions |
| `GABARITS` de `plugin-architect/src/sandbox/projectionsDesControles.ts` | Recopie ce que chaque famille du kit lit. `tests/projectionsDesControles.test.ts` garde la copie par l'enregistrement des accès. Chaque correction des fiches qui fait lire un champ de plus à une famille doit y ajouter ce champ |
| `porteLeNom` (`plugin-socle/src/composant/contract/extractRules.ts:171`) et les noms de layer du kit (`formeReconnue(layer.nom) === 'title'`) | Le socle cherche un calque nommé par une règle du contrat ; le kit reconnaît un rôle. La comparaison du kit relève de D-04 |
| `VARIABLES_GARANTIES` (`packages/couleur/src/garantie.ts:43`) et `GARANTIES` du kit | La garantie des courbes ([ENT-10]) juge un cran contre le cran le plus léger de la même courbe ; `GARANTIES` juge des variables contre la page et la carte. Les membres se recoupent, la question diffère |
| `CHROMA_SANS_TEINTE` (`1e-4`) et les seuils `1e-3` de `packages/couleur/src/reconstruction.ts` | Le premier annule une teinte indéfinie ; les seconds bornent un ajustement numérique |
| `estObjet`, redéfini dans une douzaine de lecteurs `.mjs` | Prédicat de forme JavaScript, sans décision du produit |

## Documents en contradiction

Aucun document ne répète une de ces règles en la contredisant. Cinq passages d'autorité énoncent une règle que du code enfreint. Ils désignent le propriétaire du correctif.

| Document | Passage | Code qui s'en écarte |
|---|---|---|
| `packages/kit/invariants/referentiel.md:3` | « Une définition UCM (… états, … garanties …) se modifie dans `src/referentiel/`, jamais dans un paquet » | `AXE_D_ETAT` (D-03), `estInteractif` (D-04), `SIZE_VALUES` (D-06), dossiers de la planche (D-27) |
| `docs/format/FORMAT.md:91`, `docs/guides/POUR-LES-DESIGNERS.md:252`, `packages/plugin-exporter/invariants/portee-du-contrat.md:12` | « un axe `State`, `States` ou `Status` » | `AXE_D_ETAT` lit `État` et ignore `States` et `Status` (D-03) |
| `docs/format/FORMAT.md:183`, `packages/plugin-exporter/invariants/couleurs.md:10` | un paint d'opacité nulle ne produit aucun constat | `aUnePeintureVisible` compte une peinture d'opacité nulle (D-20) |
| `packages/plugin-exporter/invariants/tokens-et-variables.md:7` | « Projection recopiée ailleurs = faute » | `pascal` de l'adaptateur (D-13) |

## Questions au mainteneur

**Q-01.** Les constats C7, C17, C18, C32 et C33 changent avec D-01. Monter le kit en mineure et laisser la reprise de session d'Architect recalculer, ou garder les anciens constats d'une session reprise ? Recommandation : recalculer ; `projectionsDesControles.ts` relit déjà le relevé.

**Q-02.** `cleDuTheme` reste-t-il un nom exporté du kit ? Options : alias permanent ; retrait au profit de `variableDuThemeReconnue`, Architect migré dans le même lot. Recommandation : retrait, un nom par règle.

**Q-03.** L'axe d'états reconnaît-il `État` et `Etat` ? Options : oui, toléré dans `REGISTRE_AXES_ETAT`, et le contrat publie `stateModel` pour ces jeux ; non, et l'accessibilité cesse de les lire. Recommandation : oui, les fichiers français existent et l'accessibilité les lit déjà.

**Q-04.** `tiny` et `huge` sont-ils des tailles UCM ? Options : tolérés de `xs` et `xl` (ou termes à part) ; retirés de `SIZE_VALUES`, et le contrat cesse de nommer `size` ces axes. Recommandation : termes tolérés, pour garder le contrat publié.

**Q-05.** La liste des champs de typographie appartient-elle au socle (contrat) ou au kit (contrôles) ? Recommandation : au kit, dans le référentiel ; le socle et Architect l'importent.

**Q-06.** La planche et les tests du navigateur recalculent le contraste sans import. Injecter le corps du kit à la génération, ou garder ces copies sous une loi qui les compare au kit ? Recommandation : injection pour la planche, comparaison pour les tests.

**Q-07.** Le hub devine le rôle d'une palette par sa teinte. Garder cette devinette, propre à la démonstration ?

**Q-08.** Le socle lit des peintures Figma brutes ; le kit lit `PeintureLue`. Une règle pour les deux formes, dans le kit, ou une par forme sous une loi qui les compare ? Recommandation : une fonction du kit sur `{ visible?: boolean; opacity?: number }`, que les deux appellent.

**Q-09.** Architect doit-il compter les liaisons de layout de tout le sous-arbre d'un imbriqué, comme le socle ? Le parcours coûte des accès Figma que la vitesse de l'analyse a retirés. Recommandation : garder l'écart documenté, et partager seulement la liste des motifs.

**Q-10.** Un terme que le designer tape dans Nomenclature se découpe-t-il en camel (`foregroundMain` en deux mots) ? Recommandation : oui, comme les noms du fichier.

**Q-11.** Une seule loi racine, ou une loi par fiche ? Options : `tests/reglesUniques.test.ts` porte une table (motif refusé, propriétaire, exceptions nommées), sur le modèle de `referentielUnique.test.ts` ; ou une loi par fiche, comme `imbriquesParLeKit.test.ts`. Recommandation : la table racine, parce que les motifs traversent les paquets. Une loi locale reste pour une fonction privée d'un paquet.

## Ordre proposé

Les chantiers suivent la gravité, puis les dépendances. Chacun monte la version du kit quand il touche `packages/kit/src/`.

| Chantier | Fiches | Raison de l'ordre |
|---|---|---|
| 1. Termes des axes du composant | D-01, D-03, D-04, D-18, D-19 | Faux constats prouvés. D-01, D-04 et D-18 partagent la loi contre les littéraux de termes ; D-03 attend Q-03 |
| 2. Variable du thème | D-02, D-26 | Le correctif de D-02 est commité ; il reste la loi anticopie et Q-02 |
| 3. Peinture et couleur Figma | D-20, D-24, D-08 | Faits des constats de contraste. Les trois changent des faits lus par la reprise d'Architect : un seul passage sur `projectionsDesControles.ts` |
| 4. Champs de typographie | D-07 | Attend Q-05 ; change la nature de C80 |
| 5. Format et contrat | D-28, D-29, D-05, D-06, D-13 | D-06 attend Q-04 ; D-13 monte l'adaptateur |
| 6. Copies identiques du kit | D-17, D-11, D-10, D-27, D-09 | Sortie identique ; avec la loi racine (Q-11) |
| 7. Plugins et hub | D-21, D-22, D-23, D-25, D-12, D-14, D-15 | D-21 attend Q-09, D-25 attend Q-10, D-14 attend Q-07 |
| 8. Tests | D-16 | Après les propriétaires des chantiers 1 à 6, que les tests importeront |
