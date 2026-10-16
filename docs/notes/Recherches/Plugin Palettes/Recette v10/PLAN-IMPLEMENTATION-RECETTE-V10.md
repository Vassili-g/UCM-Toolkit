# Plan d'implémentation de la recette v10

Ce plan met en œuvre les décisions du mainteneur sur le
[dossier](./DOSSIER-RECETTE-V10.md). Chaque tâche se donne telle quelle à un
agent : elle nomme les fichiers, les valeurs exactes, les tests et le critère
de fin. Cocher la case d'une tâche quand son commit est fait.

## Avancement

- [x] M1. Le moteur compare les fonds et calcule les zones quel que soit le départ (fait, relu, commit avec M2)
- [ ] M2. Les lecteurs du plugin passent au rôle `fond` (en cours)
- [x] H1. Un message ne déplace plus la page (abf3c88)
- [ ] R1. La roue des teintes à la largeur de la carte (en cours chez Codex)
- [x] T1. L'onglet s'appelle « Comparaison » (82434ac)
- [ ] S1. La spécification et les documents suivent
- [ ] V1. Vérification finale

## Décisions

| Point | Décision |
|---|---|
| R1 nuancier | En attente : le mainteneur n'a pas tranché D1. Aucune tâche. |
| R2 nom | Onglet « Comparaison » (anglais « Comparison »). La carte « Comparaison » devient « Aperçu » (anglais « Preview »), le mot des bascules « Intensité de l’aperçu » et « Thème de l’aperçu ». Les identifiants de code ne changent pas. |
| R3 alerte | Pleins (`solid/default`) et fonds (`surface/default`), en Light et en Dark. Les fonds se comparent à 20 % du seuil `palettesProches`, soit 0,010 par défaut (24 % signalait Terracota et Poppy, fonds Light à 0,0120, sur la recette du mainteneur). Aucun champ de recette ne s'ajoute. |
| R4 messages | Les trois règles de la maquette, dans l'onglet Harmonisation seulement. Création ne change pas. |
| R5 zones | Les zones hachurées se calculent quelle que soit la position de départ. |
| R6 roue | La maquette, avec 15 px au moins entre un nom et le bord de la plaque. Les noms de familles disparaissent de la roue. |

## Règles communes à toutes les tâches

- Lire `AGENTS.md`, puis la skill `.agents/skills/rediger-sans-tics-ia/SKILL.md`
  avant d'écrire un commentaire ou un texte.
- Ne jamais lancer `test:ui` ni une boucle d'attente `until`.
- Ne pas commiter : la conversation principale commite par chemins explicites.
- Écrire les fichiers en LF. Ne pas toucher un fichier hors de la liste de la
  tâche sans le signaler dans le compte rendu.
- Une autre session ou Codex peut modifier le même arbre : relire un fichier
  juste avant de l'éditer.
- Finir par `npm run typecheck` et les tests du ou des workspaces touchés
  (`npm test --workspace ucm-couleur`, `npm test --workspace ucm-palettes-plugin`),
  puis rendre la liste des fichiers modifiés et le résultat des commandes.

## Ordre et parallélisme

```
M1 (moteur) ──► M2 (lecteurs du rôle) ──┐
H1 (messages) ──────────────────────────┼──► S1 (spécification) ──► V1 (vérification)
R1 (roue) ──────────────────────────────┤
T1 (nom) ───────────────────────────────┘
```

M1, H1 et R1 touchent des fichiers disjoints, sauf `styles.css` pour H1 et R1
(sections différentes). M2 attend M1 et H1 : elle touche `cartePaires.ts`,
`fr.ts` et `en.ts`, que H1 modifie aussi.

## M1. Le moteur compare les fonds et calcule les zones quel que soit le départ

- [x] **Agent** : `implementeur` (Sonnet). Fait, relu, commit avec M2.
- **Fichiers** : `packages/couleur/src/alertes.ts`,
  `packages/couleur/src/harmonisation.ts`, `packages/couleur/src/index.ts` si
  un export s'ajoute, `packages/couleur/tests/alertes.test.ts`,
  `packages/couleur/tests/harmonisation.test.ts`, et tout test de
  `packages/couleur/tests/` qui casse.

**Dans `alertes.ts`.**

1. `export type RoleDeProximite = 'plein' | 'fond';`
2. `MESURES_DE_PROXIMITE` devient, dans cet ordre :
   `plein solid/default light`, `plein solid/default dark`,
   `fond surface/default light`, `fond surface/default dark`. Mettre à jour le
   commentaire : « Les quatre couleurs que deux palettes se disputent : le plein
   et le fond teinté, dans les deux thèmes. »
3. Ajouter et exporter :
   ```ts
   /** Les fonds teintés, pâles, se comparent à cette part du seuil `palettesProches` ([VER-22]). */
   export const PART_DU_SEUIL_DES_FONDS = 0.2;
   /** Sous cette part du seuil de leur rôle, deux palettes sont presque identiques ([VER-22]). */
   const PART_PRESQUE_IDENTIQUES = 0.2;
   /** Le seuil d'un rôle : `palettesProches` pour le plein, sa part pour le fond. */
   export function seuilDeProximite(palettesProches: number, role: RoleDeProximite): number {
     return role === 'plein' ? palettesProches : palettesProches * PART_DU_SEUIL_DES_FONDS;
   }
   ```
   Supprimer `DISTANCE_DES_PALETTES_PRESQUE_IDENTIQUES`.
4. `Proximite` gagne deux champs :
   `readonly seuil: number;` (le seuil du rôle retenu) et
   `readonly tropProche: boolean;` (`distance < seuil`).
5. `proximiteDeNuances(a, b, palettesProches: number): Proximite` : pour chaque
   rang, `distance = distanceOk(...)`, `seuil = seuilDeProximite(palettesProches, role)`,
   `rapport = distance / seuil`. Retenir le rang de plus petit rapport (à
   égalité, le premier). Rendre `{ distance, role, mode, seuil, tropProche: distance < seuil,
   presqueIdentiques: distance < PART_PRESQUE_IDENTIQUES * seuil }`.
6. `proximiteDePalettes` et `pairesTropProches` passent
   `recette.seuils.palettesProches`. `pairesTropProches` garde une paire quand
   `proximite.tropProche` est vrai, et trie par rapport croissant
   (`distance / seuil`), à égalité dans l'ordre de la recette.
7. Dans `alertesDeRecette`, l'alerte `palettes-proches` porte
   `seuil: proximite.seuil`.
8. Mettre à jour le commentaire de `proximiteDePalettes` (« la plus petite des
   distances… texte sur fond teinté en Light ») pour dire : le plus petit
   rapport distance sur seuil parmi le plein et le fond teinté, en Light et en
   Dark.

**Dans `harmonisation.ts`.**

1. `positionsDeLaPaire` : `separe` devient
   `nuances === null || !proximiteDeNuances(nuances, immobiles, recette.seuils.palettesProches).tropProche`.
   Supprimer la sortie anticipée `if (separe(courantes)) return [{ ecartCommun: 0, proche: false }];`.
2. `zonesTropProches` : supprimer la ligne
   `if (!positions?.find((position) => position.ecartCommun === 0)?.proche) return [];`
   et la remplacer par `if (!positions) return [];`. Mettre à jour son
   commentaire : les zones se calculent même quand la paire est séparée à la
   position actuelle, pour que la réglette les montre avant que le curseur y
   entre ([UI-42]).
3. `sortieLaPlusProche` rend exactement les mêmes valeurs qu'avant : si la
   paire est séparée à la position actuelle, rendre `0` sans balayer (garder ce
   test en tête de fonction).
4. Mémoriser le dernier balayage : `balayerLaCourse(recette, palette)` garde
   dans une variable de module le dernier `{ recette, palette, resultat }` et le
   rend quand `recette` et `palette` sont les mêmes objets (`===`). Le
   commentaire dit pourquoi : `calculerLaCourseEtLesZones` appelle
   `courseDeTeinte` puis `zonesTropProches` pour chaque autre palette cochée,
   sur la même recette et la même palette.
5. Chercher dans `packages/couleur/src` et `packages/plugin-palettes/src` tout
   autre appel de `proximiteDeNuances` et toute comparaison
   `distance < …palettesProches` ou `distance >= …palettesProches`, et les
   passer à `.tropProche`. Lister ces endroits dans le compte rendu.

**Tests à écrire ou adapter** (préfixe `[VER-22]` ou `[UI-42]` comme les tests voisins) :

- une paire dont seuls les fonds Light sont sous 0,010 est signalée, rôle
  `fond`, mode `light` (prendre `#a855f7` et `#d946ef`, purple et fuchsia
  Tailwind, réglages par défaut : leur fond Light est à 0,0084, leurs pleins
  au-dessus de 0,05) ;
- une paire dont le texte sur fond teinté était trop proche, mais ni les pleins
  ni les fonds, n'est plus signalée (prendre `#14b8a6` et `#06b6d4`, teal et
  cyan Tailwind : texte Light 0,045, fonds 0,018 et 0,032, pleins au-dessus
  de 0,05) ;
- `seuilDeProximite(0.05, 'fond')` vaut 0,010 à 1e-12 près, et
  `seuilDeProximite(0.08, 'plein')` vaut 0,08 ;
- `zonesTropProches` rend des zones non vides pour une paire séparée à la
  position actuelle dont la course traverse une zone trop proche (construire
  la paire en décalant la teinte d'une palette d'une paire trop proche hors de
  sa zone, avec `sortieLaPlusProche`) ;
- `sortieLaPlusProche` rend `0` pour une paire séparée.

Adapter les tests existants qui attendent le rôle `texte` ou une paire que la
nouvelle règle ne signale plus. Chaque attente changée se justifie par la
nouvelle règle dans le compte rendu (paire, ancien et nouveau verdict).

**Fini quand** : typecheck vert, `npm test --workspace ucm-couleur` vert. Les
erreurs de type dans `packages/plugin-palettes` sont attendues et laissées à
M2 : les lister dans le compte rendu sans les corriger.

## M2. Les lecteurs du plugin passent au rôle `fond`

- [ ] **Agent** : `implementeur` (Sonnet). Après M1 et H1. En cours.
- **Fichiers** : `packages/plugin-palettes/src/i18n/fr.ts`, `en.ts`,
  `src/ui/harmonisation/cartePaires.ts`, `galerie/etats.cjs`, les tests de
  `packages/plugin-palettes/tests/` qui cassent,
  `tests/interface/interface.test.mjs` (textes seulement).

1. Textes français, remplacer le sujet « texte » par le sujet « fond » :
   - `paires.constat` : `role === 'plein' ? 'Boutons pleins' : 'Fonds teintés'` ;
   - `comparaison.constats.paire` : `role === 'plein' ? 'boutons pleins' : 'fonds teintés'` ;
   - `SUJET_DE_PROXIMITE = { plein: 'Boutons pleins', fond: 'Fonds teintés' }` ;
   - `aidePalettesProches` : « Compare les boutons pleins et les fonds teintés, en Light et en Dark, en Vivid ou dans l’intensité unique. Les fonds teintés se comparent à 20 % de ce seuil. »
2. Textes anglais, mêmes clés : « Filled buttons » / « Tinted fills »,
   « filled buttons » / « tinted fills », et
   `aidePalettesProches` : « Compares filled buttons and tinted fills in Light and Dark, using Vivid or the single intensity. Tinted fills are compared at 20% of this threshold. »
3. `cartePaires.ts`, fonction `pastilles` : la condition reste
   `paire.proximite.role === 'plein'`, la branche `fond` garde
   `['surface/default', 'surface/foreground']`. Mettre à jour le commentaire
   (« le plein et son texte, ou le fond teinté et son texte »).
4. Lancer `npm test --workspace ucm-palettes-plugin`. Pour chaque test qui casse
   sur un nombre de paires, un rôle ou un texte : recalculer la valeur attendue
   avec le code, vérifier qu'elle suit la nouvelle règle, et mettre à jour
   l'attente. Lister chaque attente changée dans le compte rendu.
5. Galerie et tests d'interface : lancer `npm run galerie --workspace ucm-palettes-plugin`,
   puis lire les nombres réels des états `harmonisation-*` et
   `verification-bilan-*` dans `packages/plugin-palettes/dist/galerie/sombre/<état>.html`
   avec un script Playwright lancé depuis `packages/plugin-palettes`. La galerie
   rejoue ses gestes après le chargement : attendre 2,5 s avant de lire le DOM.
   Relever le texte de `.ligne-fixe-texte`, du compteur
   `#onglet-harmonisation .compteur-de-verification`, des onglets
   `.bilan-onglets .bascule-option`, et les lignes `.paire`. Mettre à jour les
   textes `quand` et `regarder` de ces états dans `etats.cjs` (paires citées,
   nombres, « textes sur fond teinté » devenu « fonds teintés »), puis les
   attentes correspondantes de `interface.test.mjs`. Ne pas lancer
   `test:ui`.

**Fini quand** : typecheck vert, `npm test --workspace ucm-palettes-plugin`
vert, `npm run build --workspace ucm-palettes-plugin` vert, plus aucune
occurrence de `'texte'` comme rôle de proximité
(`grep -rn "Textes sur fond teinté\|text on tinted background" packages/plugin-palettes/src`
ne rend rien hors des libellés de variables `surface/foreground`).

## H1. Un message ne déplace plus la page

- [x] **Agent** : `implementeur` (Sonnet). Fait, commit abf3c88.
- **Fichiers** : `packages/plugin-palettes/src/harmonisation.ts`,
  `src/ui/ongletHarmonisation.ts`, `src/ui/harmonisation/cartePaires.ts`,
  `src/ui/harmonisation/carteComparaison.ts`,
  `src/ui/harmonisation/carteReglages.ts`, `src/ui/styles.css` (section des
  paires et des constats seulement), `src/i18n/fr.ts`, `src/i18n/en.ts` (clés
  `TEXTES_DE_L_HARMONISATION` seulement), `tests/harmonisation.test.ts`.
- **Référence visuelle** : section 1 de
  `docs/notes/Recherches/Plugin Palettes/Recette v10/Maquettes/MAQUETTE-RECETTE-V10.html`,
  fonction `regler(doc, true)`.

**1. Les paires de la visite (état).** Dans `src/harmonisation.ts` :

- `EtatHarmonisation` gagne
  `readonly pairesDeLaVisite: readonly PaireTropProche[];` avec le commentaire
  « Les paires trop proches vues depuis l'entrée dans l'onglet, dans l'ordre où
  elles sont apparues : une paire séparée garde sa rangée jusqu'à la sortie. »
- `harmonisationInitiale()` et `entrerEnHarmonisation()` le posent à `[]`.
- Nouvelle fonction exportée
  `retenirLesPaires(etat: EtatHarmonisation, paires: readonly PaireTropProche[]): EtatHarmonisation` :
  pour chaque paire de `paires`, si une paire de mêmes identifiants (même
  ensemble, ordre indifférent) est déjà dans la liste, la remplacer à sa place
  ; sinon l'ajouter à la fin. Rendre `etat` lui-même (même objet) si rien ne
  change.
- `constatsDeLaComparaison` : pour chaque couple de palettes cochées (même
  boucle qu'aujourd'hui), si le couple est dans `paires`, constat
  `avertissement` comme aujourd'hui ; sinon, s'il est dans
  `etat.pairesDeLaVisite`, constat
  `{ ton: 'succes', genre: 'separee', palettes: [a.id, b.id] }`. Le constat
  `distinctes` ne s'ajoute que s'il n'y a ni avertissement ni `separee`.
  Ajouter `| { readonly ton: 'succes'; readonly genre: 'separee'; readonly palettes: readonly [string, string] }`
  au type `ConstatDeComparaison`.

**2. L'onglet retient les paires.** Dans `ongletHarmonisation.ts`, fonction
`relire()`, juste après le calcul de `paires` : `etat = retenirLesPaires(etat, paires);`.

**3. La carte des paires garde les rangées de la visite.** `cartePaires.ts` :

- `afficher(recette, paires, visite)` reçoit en plus
  `visite: readonly PaireTropProche[]` (l'appel de `peindreLesCartes` passe
  `etat.pairesDeLaVisite`).
- Les rangées suivent l'ordre de `visite` ; une paire de `paires` absente de
  `visite` (cas impossible après `retenirLesPaires`, garder un repli) va à la
  fin.
- Une rangée dont la paire n'est plus dans `paires` reçoit
  `element.dataset.separee = ''` ; son texte secondaire devient
  `TEXTES.separee` ; le bouton « Comparer » reste.
- `carte.element.hidden = visite.length === 0 && paires.length === 0`. Le
  résumé compte `paires.length`.
- La garde « même recette et mêmes paires » compare aussi `visite`.
- CSS : `.paire[data-separee] .paire-couleurs { opacity: 0.5; }` et
  `.paire[data-separee] .paire-texte span { color: var(--texte-succes); }`.

**4. Le constat change de ton à sa place.** `carteComparaison.ts`, fonction
`segments` : `case 'separee': return TEXTES.constats.separee(nom(recette, constat.palettes[0]), nom(recette, constat.palettes[1]));`.

**5. Textes.** Dans `TEXTES_DE_L_HARMONISATION` :

| Clé | Français | Anglais |
|---|---|---|
| `paires.separee` | `Se distinguent maintenant` | `Now distinct` |
| `comparaison.constats.separee` | `(a, b) => ['', \`${a} et ${b}\`, ' se distinguent maintenant.']` | `(a, b) => ['', \`${a} and ${b}\`, ' are now distinct.']` |

L'icône du constat `succes` reste « ✓ » (`ICONES`).

**6. Les zones de messages ne rétrécissent pas pendant la visite.**

- Poser l'attribut `data-hauteur-tenue` sur la liste `.paires`
  (`cartePaires.ts`) et sur `.constats-de-comparaison` (`carteComparaison.ts`).
- Dans `ongletHarmonisation.ts`, nouvelle fonction appelée à la fin de
  `peindreLesCartes()`, après `garderLesCartes()` :
  ```ts
  /**
   * Les zones de messages gardent leur plus grande hauteur depuis l'entrée
   * dans l'onglet ([UI-20]) : un constat qui raccourcit ou une rangée qui se
   * sépare ne remonte pas les réglettes.
   */
  function tenirLesHauteurs(): void {
    for (const zone of element.querySelectorAll<HTMLElement>('[data-hauteur-tenue]')) {
      const hauteur = zone.getBoundingClientRect().height;
      if (hauteur > (Number.parseFloat(zone.style.minHeight) || 0)) zone.style.minHeight = `${hauteur}px`;
    }
  }
  ```
- Dans `montrer(suivant)`, à l'entrée (`suivant && !actif`), avant `rendre()`,
  effacer les hauteurs : `zone.style.minHeight = ''` pour chaque
  `[data-hauteur-tenue]`.
- Une zone dans une carte repliée mesure 0 : la règle ne la touche pas.

**7. « Annuler les modifications » reste affiché.** `carteReglages.ts` :

- Garder le bouton visible : `tete.hidden = rigide;` (palette figée seulement).
- `boutonAnnuler.disabled = !depart || !modifieeDepuisLeDepart(recette, palette, depart);`,
  mis à jour à chaque rendu, aussi pendant un glisser (un changement d'état
  inactif ne déplace rien).
- Le clic : après `gestes.annulerLesModifications()`, si le bouton est devenu
  inactif, rendre le focus à la première réglette
  (`rangees[0].reglette.curseur.focus()`). Adapter le commentaire de la ligne
  « Le bouton se cache avec la modification ».
- Supprimer le commentaire « Pendant un glisser, « Annuler les modifications »
  garde sa place… » devenu sans objet, et le remplacer par une phrase : le
  bouton reste affiché, inactif tant que la palette n'a pas changé ([UI-42]).

**Tests** (`tests/harmonisation.test.ts`, préfixe `[UI-41]` ou `[UI-40]`) :

- `retenirLesPaires` ajoute une nouvelle paire à la fin, remplace une paire
  connue à sa place quel que soit l'ordre des identifiants, et rend le même
  objet quand rien ne change ;
- `constatsDeLaComparaison` rend `separee` (et pas `distinctes`) pour deux
  palettes cochées séparées dont la paire est dans `pairesDeLaVisite`, et
  `distinctes` quand elle n'y est pas ;
- `entrerEnHarmonisation` vide `pairesDeLaVisite`.

**Fini quand** : typecheck vert, `npm test --workspace ucm-palettes-plugin`
vert, `npm run build --workspace ucm-palettes-plugin` vert.

## R1. La roue des teintes à la largeur de la carte

- [ ] **Agent** : `implementeur-exigeant` (interface à reproduire au pixel). Délégable à Codex. En cours chez Codex.
- **Fichiers** : `packages/plugin-palettes/src/roueDesTeintes.ts`,
  `src/ui/harmonisation/carteRoue.ts`, `src/ui/styles.css` (section « Roue des
  teintes » seulement), `tests/roueDesTeintes.test.ts`,
  `galerie/etats.cjs` (texte `regarder` de l'état `harmonisation-roue`).
- **Référence visuelle** : section 2 de la maquette, fonction
  `dessinerLaRoue(lue, W)`. Une seule différence avec la maquette : les noms
  s'arrêtent à 15 px du bord de la plaque (6 px dans la maquette).

**Géométrie (`roueDesTeintes.ts`).** Remplacer les constantes
`LARGEUR_DE_LA_ROUE`, `HAUTEUR_DE_LA_ROUE`, `CENTRE_DE_LA_ROUE`,
`RAYON_DE_LA_ROUE`, `RAYON_DES_FAMILLES`, `INTERLIGNE_DES_NOMS`,
`NOMBRE_DE_NOMS_COMPLETS` par :

```ts
/** L'épaisseur de l'anneau des teintes. */
export const EPAISSEUR_DE_L_ANNEAU = 16;
/** L'écart minimal entre un nom et le bord de la plaque. */
export const MARGE_DES_NOMS = 15;
/** L'écart minimal entre deux noms d'une même colonne. */
export const INTERLIGNE_DES_NOMS = 13;
/** La place réservée à un nom, de son bord à l'anneau. */
const PLACE_DES_NOMS = 88;
/** Le plus petit rayon : une carte plus étroite déborde, comme aujourd'hui. */
const RAYON_MINIMAL = 70;

export interface GeometrieDeLaRoue {
  readonly largeur: number;
  readonly hauteur: number;
  readonly centre: { readonly x: number; readonly y: number };
  readonly rayon: number;
}

/** La roue à la largeur `largeur` de la carte ([UI-43]). */
export function geometrieDeLaRoue(largeur: number): GeometrieDeLaRoue {
  const rayon = Math.max(RAYON_MINIMAL, Math.floor(largeur / 2 - PLACE_DES_NOMS));
  const largeurVue = Math.max(largeur, 2 * (rayon + PLACE_DES_NOMS));
  const hauteur = 2 * rayon + 48;
  return { largeur: largeurVue, hauteur, centre: { x: largeurVue / 2, y: hauteur / 2 }, rayon };
}
```

À 351 px de carte (fenêtre de 400 px), le rayon vaut 87 et la hauteur 222.

- `pointDeLaRoue(teinte, rayon, centre)`, `teinteDuPointeur(dx, dy)` (inchangée),
  `arcDeLaRoue(de, a, rayon, centre)`, `arcDeLaPaire(teinteA, teinteB, rayon, centre)` :
  même calcul qu'aujourd'hui avec le centre en paramètre.
- `couleurDeLAnneau(teinte: number, mode: Mode): Rgb8` : OKLCH de clarté
  0,78 en Light et 0,62 en Dark, chroma 0,12, teinte `teinte`, converti par
  `oklchVersLineaire` puis `lineaireVersRgb8` (exports de `ucm-couleur`).
- `palettesNommees` reste, mais ne sert plus que de repli (voir les noms).
- `poserLesNoms(points, geometrie): NomPose[]` remplace l'ancienne fonction.
  Entrée : `{ teinte: number; largeurDuNom: number }[]`. Sortie, dans l'ordre
  d'entrée : `{ x, y, ancre: 'start' | 'end', trait: string }` où `trait` est
  l'attribut `points` d'une `polyline`. Algorithme :
  1. `rayonDuCoude = rayon + EPAISSEUR_DE_L_ANNEAU / 2 + 14`,
     `rayonDuDepart = rayon + EPAISSEUR_DE_L_ANNEAU / 2 + 1` ;
  2. colonne droite si `teinte < 180`, gauche sinon ;
  3. dans chaque colonne, trier par ordonnée du coude ; `haut = MARGE_DES_NOMS + 6`,
     `bas = hauteur - MARGE_DES_NOMS - 6` ; première ligne `y = max(yCoude, haut)`,
     puis `y[i] = max(yCoude[i], y[i-1] + INTERLIGNE_DES_NOMS)` ; si la
     dernière dépasse `bas`, remonter toute la colonne de l'excès ; puis du bas
     vers le haut `y[i] = min(y[i], y[i+1] - INTERLIGNE_DES_NOMS)` ;
  4. `x = droite ? largeur - MARGE_DES_NOMS : MARGE_DES_NOMS`, ancre `end` à
     droite et `start` à gauche ; ligne de base `y + 4` ;
  5. fin du trait : à droite `max(x - largeurDuNom - 4, coude.x)`, à gauche
     `min(x + largeurDuNom + 4, coude.x)` ; `trait` = départ, puis
     `(coude.x, y)`, puis `(finDuTrait, y)`, chaque nombre arrondi au dixième.
- `colonnesTiennent(nombreParColonne: number, geometrie): boolean` :
  `(nombreParColonne - 1) * INTERLIGNE_DES_NOMS <= hauteur - 2 * (MARGE_DES_NOMS + 6)`.

**Dessin (`carteRoue.ts`).**

- La plaque se dessine à la largeur du corps de la carte :
  `largeur = carte.corps.clientWidth - paddingLeft - paddingRight` (lus par
  `getComputedStyle`). Un `ResizeObserver` sur `carte.corps` redessine avec la
  dernière recette et le dernier état quand la largeur arrondie change, hors
  d'un glisser. Poser `width`, `height` et `viewBox` à chaque dessin.
- Supprimer le cercle gris, les huit noms de familles et les constantes
  `CERCLE` et `FAMILLES`, ainsi que l'import de `FAMILLES_DE_TEINTE` s'il ne
  sert plus.
- L'anneau : un groupe de 90 arcs, un tous les 4°, `arcDeLaRoue(t, t + 4.6, rayon, centre)`,
  `fill="none"`, `stroke-width="16"`, trait
  `ecrireHexa(simulerLaVision(couleurDeLAnneau(t, mode), vision))`. Ne
  recalculer les 90 couleurs que si le mode ou la vision change.
- Les paires trop proches : `arcDeLaPaire` au rayon `rayon + 13`,
  `stroke-width="4"`, `stroke-linecap="round"`, `stroke-opacity="0.75"`,
  couleur `AMBRE[mode]`, avec le `title` d'aujourd'hui.
- La course et la zone de la palette à régler : au rayon `rayon - 14`,
  `stroke-width="6"`. La course en `ENCRE_D_APERCU[mode]`,
  `stroke-opacity="0.18"`, `stroke-linecap="round"`. Chaque zone trop proche
  est remplie d'un motif de hachures ambre : un `pattern` d'identifiant
  `roue-hachures`, `width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"`,
  contenant `<rect width="2" height="4" fill="<AMBRE[mode]>">`, posé dans un
  `defs` de la plaque et recoloré avec le mode.
- Les points, au rayon `rayon` : rayon 7, 9 pour une palette cochée. Contour
  : encre pour une cochée, ambre pour une palette d'une paire, sinon le fond
  de la plaque ; épaisseur 2,5 pour une cochée ou une palette d'une paire,
  sinon 2. Le remplissage, le focus, le clavier et le glisser restent ceux
  d'aujourd'hui.
- Les noms : toutes les palettes colorées si `colonnesTiennent` vaut vrai pour
  la colonne la plus chargée, sinon les seules `palettesNommees(...)`. Taille
  11 px, graisse 700 pour une cochée et 600 sinon. Couleur : ambre pour une
  palette d'une paire, encre pour une cochée, sinon `#5E5E5E` en Light et
  `#A0A0A0` en Dark. Le trait de chaque nom : une `polyline` d'épaisseur 1,
  ambre pour une paire, sinon `#A0A0A0` en Light et `#5E5E5E` en Dark, posée
  sous les points. `largeurDuNom` se mesure avec `getComputedTextLength()`
  après insertion ; à défaut, `nom.length * 6.4`.
- Le pointeur : l'échelle se lit sur la géométrie du dernier dessin au lieu des
  constantes.
- `styles.css` : `.roue text { font: 600 11px Inter, sans-serif; }`, supprimer
  `.roue .roue-famille`, et mettre à jour le commentaire de la section (« un
  SVG à la largeur de la carte »).

**Tests** (`tests/roueDesTeintes.test.ts`, préfixe `[UI-43]`) : adapter les
tests de géométrie au centre en paramètre ; remplacer le test « 11 px du
point » par : à 351 px, rayon 87 et hauteur 222 ; deux noms d'une colonne
sont à 13 px au moins ; tout nom est entre 15 px et `largeur - 15` px
horizontalement et entre `15 + 6` et `hauteur - 15 - 6` verticalement ; une
teinte de 90° va à droite et une de 270° à gauche ; `couleurDeLAnneau(0, 'light')`
est stable (valeur relevée une fois). Le test des huit palettes nommées reste
tant que `palettesNommees` existe.

**Fini quand** : typecheck vert, `npm test --workspace ucm-palettes-plugin`
vert, `npm run galerie --workspace ucm-palettes-plugin` puis `npm run build
--workspace ucm-palettes-plugin` verts, et une capture Playwright de l'état
`harmonisation-roue` à 400 px (attente 2,5 s) montre la roue sans débord
horizontal : `document.documentElement.scrollWidth <= 400`.

## T1. L'onglet s'appelle « Comparaison »

- [x] **Agent** : `executant` (Haiku). Après H1, qui modifie aussi `fr.ts` et `en.ts`. Fait, commit 82434ac.
- **Fichiers** : `packages/plugin-palettes/src/i18n/fr.ts`, `en.ts`,
  `galerie/etats.cjs`, `tests/interface/interface.test.mjs`.

| Fichier | Avant | Après |
|---|---|---|
| `fr.ts` | `ongletHarmonisation: 'Harmonisation'` | `ongletHarmonisation: 'Comparaison'` |
| `en.ts` | `ongletHarmonisation: 'Harmony'` | `ongletHarmonisation: 'Comparison'` |
| `fr.ts` | `comparaison: { titre: 'Comparaison'` | `comparaison: { titre: 'Aperçu'` |
| `en.ts` | `comparaison: { titre: 'Comparison'` | `comparaison: { titre: 'Preview'` |
| `etats.cjs` | « dans Harmonisation » dans les `titre`, `quand` et `regarder` | « dans Comparaison » |
| `etats.cjs` | la carte « Comparaison » dans les `regarder` | la carte « Aperçu » |
| `interface.test.mjs` | `'Harmonisation'` et `'Harmony'` pris comme nom de l'onglet ou de son titre | `'Comparaison'` et `'Comparison'` |

Ne pas renommer les identifiants (`ongletHarmonisation`, `harmonisation.ts`,
classes CSS, `data-` attributs, identifiants d'état de la galerie).
Vérifier ensuite par `grep -rn "Harmonisation\|Harmony" packages/plugin-palettes/src/i18n`
qu'il ne reste que des identifiants et des commentaires.

**Fini quand** : `npm test --workspace ucm-palettes-plugin` vert et
`npm run build --workspace ucm-palettes-plugin` vert.

## S1. La spécification et les documents suivent

- [ ] **Agent** : `implementeur` (Sonnet). Après M2, H1, R1 et T1.
- **Fichiers** : `docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`,
  `AGENTS.md` (si une règle d'Harmonisation y est écrite), `DOSSIER-RECETTE-V10.md`
  et `README.md` de ce dossier.

1. `[VER-22]` : les quatre couleurs comparées, `PART_DU_SEUIL_DES_FONDS`
   (0,2), le rapport distance sur seuil qui choisit le rôle dit,
   « presque identiques » sous 20 % du seuil du rôle.
2. `[UI-20]` : les zones de messages d'Harmonisation gardent leur plus grande
   hauteur depuis l'entrée dans l'onglet ; elles se recalent à l'entrée.
3. `[UI-40]` : une paire séparée garde sa rangée jusqu'à la sortie de l'onglet,
   avec « Se distinguent maintenant ».
4. `[UI-41]` : le constat `separee` ; la carte s’appelle « Aperçu ».
5. `[UI-42]` : les zones hachurées se montrent même quand la paire est séparée ;
   « Annuler les modifications » reste affiché, inactif tant que la palette n'a
   pas changé.
6. `[UI-43]` : la géométrie à la largeur de la carte, l'anneau, les colonnes de
   noms, la marge de 15 px, les familles retirées.
7. Le nom visible de l'onglet, « Comparaison », partout où la spécification et
   `AGENTS.md` nomment l'onglet par son libellé.
8. Dossier : l'état de R2 à R6 devient « implémenté, recette Figma à faire » ;
   README : même état.

Lancer `node scripts/controle-style.mjs` sur chaque fichier modifié.

**Fini quand** : contrôle de style conforme.

## V1. Vérification finale

- [ ] **Agent** : `verificateur` (Haiku).
- `npm run typecheck`, `npm test --workspace ucm-couleur`,
  `npm test --workspace ucm-palettes-plugin`, `npm run galerie --workspace ucm-palettes-plugin`,
  puis `npm run build --workspace ucm-palettes-plugin` (dans cet ordre : la
  galerie ne reconstruit que `ui.html`), et `node scripts/controle-style.mjs`
  sur les documents modifiés. Rendre un tableau commande, code, résumé.
