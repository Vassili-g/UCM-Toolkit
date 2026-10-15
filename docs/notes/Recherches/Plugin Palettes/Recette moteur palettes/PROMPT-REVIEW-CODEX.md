# Revue critique de la seconde passe sur le moteur de Palettes

Tu fais une revue en lecture seule. Elle porte sur les solutions proposées pour
deux défauts du moteur d'UCM Palettes. Le but est de trouver ce que la passe a
oublié avant que le mainteneur choisisse : une interaction avec le reste de la
génération, une régression de qualité dans un profil ou un thème, une garantie
de contraste qui casse, une mesure fausse.

Le moteur vient d'être refondu pendant plusieurs semaines (recette critique de
qualité, vagues 0 à 3 et H0 à H1). Chaque décision de cette refonte a été
validée au banc visuel par le mainteneur. Une solution qui défait l'une d'elles
sans le dire est un défaut grave.

## À lire, dans cet ordre

1. `AGENTS.md`, puis `CONTRIBUTING.md` (règles de code, de test et de
   rédaction).
2. `docs/notes/Recherches/Plugin Palettes/Recette moteur palettes/README.md` :
   les deux défauts, les mesures de la première passe et la seconde passe.
3. `docs/notes/Recherches/Plugin Palettes/Recette moteur palettes/Maquettes/MAQUETTE-MOTEUR.html`,
   à ouvrir dans un navigateur, et `Mesures/mesurer-regles.ts`, qui produit ses
   données et `Mesures/MESURES-REGLES.json`.
4. `docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/DECISIONS.md` :
   toutes les décisions arrêtées de la refonte. Il fait foi.
5. `docs/notes/Recherches/Plugin Palettes/Recette CRITIQUE de qualité/SOLUTION-RAMPES.md`
   et `ROBUSTESSE-DES-RAMPES.md` : les raisons de la règle de chroma, de la
   marge des jaunes, des bornes Dark et de la table des rôles.
6. Le moteur, `packages/couleur/src/` : `rampe.ts` (`cranVise`,
   `fabriquerRampe`, `facteurSombre`), `palette.ts` (`partsDesProfils`,
   `profilAutomatique`, `profilPorteur`, `ancrageDe`, `rampesDe`,
   `partDeLaReference`), `recette.ts` (`PROFILS_PAR_DEFAUT`, validation, lecture
   des anciens formats), `alertes.ts`, `promesses.ts`, `limites.ts`,
   `reglages.ts`, `harmonisation.ts`, `tailwind.ts`.
7. Le kit, `packages/kit/src/emplois/` : `dossiers.ts` (table des rôles par
   thème et par sens) et `garanties.ts` (G1 à G7).
8. Les lecteurs dans le plugin : `packages/plugin-palettes/src/` (aperçu,
   planche, Réglage global, onglet Harmonisation, repère ≈) et ses tests.

## Les propositions à juger

| Id | Proposition | Ce qui change |
|---|---|---|
| K65 | Soft = Vivid × 0,65 | Valeurs par défaut du format 11 seulement : Soft prend l'enveloppe de Vivid (Light a 1,1, b 0,48, jaunes 0,5 ; Dark a 1,1, b 0,30, jaunes 0) et part = p0 = 0,6175 |
| K75, D, Z | Variantes de Soft | Voir le README ; Z change le moteur |
| Alerte | `profils-confondus` | Chaque thème juge les seules nuances que ses variables visent, et seulement là où Vivid a au moins 0,06 de chroma ; seuil 0,02 et déclenchement à trois inchangés |
| Bosse | Voisines de la référence | Après la règle de chroma, les crans proches en clarté du cran ancré se rapprochent de la chroma de la référence (poids gaussien, σ 0,10), sans dépasser la référence ni part × plafond ; deux profils et l'intensité unique |
| Message | Référence au plafond de l'écran | Le plugin signale une référence plus vive que sa rampe et renvoie à la saturation du Réglage global |

La seconde passe recommande K65, l'alerte proposée, la bosse σ 0,10 et le
message.

## Ce que tu dois vérifier

Pour chaque point, donne un verdict (confirmé, infirmé, non vérifiable) avec la
preuve : la commande lancée et les nombres, ou le fichier et la ligne.

### 1. La chaîne de mesure

- `mesurer-regles.ts` affirme reproduire `rampesDe` et `verifierPromesses` à
  l'octet près. Relis le contrôle : couvre-t-il assez de cas (palettes à une
  intensité, parts du designer, Color shift de saturation et de luminosité,
  `reglages.part`, dérive non liée, préréglage à 13 nuances, liste libre) ?
- La règle Z et la bosse sont des prototypes. Leur comportement est-il bien
  défini dans ces cas ?
- Les métriques : la frontière entre fonds et textes (`loinDeLaPage` < 0,35),
  la comparaison des textes Soft avec Tailwind 3.4 alors que Tailwind 4 a plus
  de chroma, la « saillie ». Sont-elles justes, et font-elles dire aux tableaux
  ce qu'ils disent ?
- La recette du mainteneur (`Recette CRITIQUE de qualité/Mesures/references/recette-mainteneur.json`)
  n'est pas mesurée par ce script. Mesure-la.

### 2. K65 et les décisions déjà prises

Ces points ont été repérés et ne sont pas encore mesurés. Confirme-les ou
infirme-les, puis cherche les autres.

- **Marge des jaunes de Soft.** Le banc visuel a retenu +100 % pour Soft et
  +50 % pour Vivid. Avec K65, Soft hérite de +50 %. Que deviennent les fonds
  clairs Soft des jaunes et des ambres ?
- **Borne vers le blanc de Soft.** Aujourd'hui p0 × a vaut 0,85 × 0,6 = 0,51.
  Avec K65, elle vaut 0,6175 × 1,1 = 0,68. Les fonds clairs Soft des verts, des
  cyans et des jaunes gagnent-ils de la chroma ? Rejoue la mesure qui a fait
  choisir l'enveloppe : l'écart de chroma entre les quatre utilitaires du
  mainteneur, Soft, fonds 50 à 300, ramené de ×4,2 à ×1,2
  (`Recette CRITIQUE de qualité/Mesures/`, scripts de la repasse et du banc).
- **Profil porteur.** `profilAutomatique` compare la part de la référence aux
  parts communes. Avec une part Soft de 0,6175, des références passent de Soft
  à Vivid (le rouge `#EF4444`, par exemple). Que change ce passage : le cran
  ancré, les alertes `reference-plus-terne` et `reference-plus-vive`, la rampe
  de l'autre profil, l'aperçu ?
- **Références ternes.** `aDesProfilsTernes` et `partsDesProfils` dépendent de
  la part de Soft. Le rapport Vivid / Soft passe de 1,12 à 1,54 :
  `min(1, p × v / s)` atteint-il 1 et écrase-t-il des Vivid ?
- **Fonds Dark.** `facteurSombre` multiplie la part ; vérifie que Soft reste
  sous Vivid sur toutes les nuances Dark, et que les fonds 300 à 500 gardent la
  séparation contre la carte décidée (fond contre carte 1,39).
- **Recettes déjà rangées au format 11.** Elles portent les anciens profils.
  Les nouvelles valeurs par défaut ne les touchent pas. Faut-il une migration,
  ou le bouton « Par défaut » suffit-il ? Que montrent les marques « par
  défaut » des réglettes de saturation (P6) ?
- **Color shift de saturation et `limites.ts`.** Les bornes calculées des
  réglages changent-elles ? Une promesse tenue à l'ouverture peut-elle tomber ?

### 3. L'alerte proposée

- `confusionsDe` sert aussi le repère ≈ de l'aperçu et de la planche
  ([PLA-15]). Le repère doit-il suivre l'alerte ? Sinon, l'aperçu montre des ≈
  sans alerte.
- Le seuil de 0,06 est-il cohérent avec `CHROMA_DES_PALETTES_COLOREES` (0,05)
  et avec l'alerte `palettes-proches` ?
- Avec K65, l'alerte proposée se tait-elle aussi sur une recette où le
  designer a réglé des parts proches ? Elle doit encore servir à ce cas.

### 4. La bosse

- Elle ne change que la chroma, et la luminance WCAG bouge avec la chroma à
  clarté OKLab fixe. Mesure les garanties sur le balayage complet :
  `Recette CRITIQUE de qualité/Mesures/garanties-regles.ts` (72 teintes, deux
  clartés de référence, quatre combinaisons du texte des boutons, page et
  carte), et `verifier-implementation.ts` en `MODE=produit`. Point de départ
  connu : 144 promesses manquées, toutes G1 en Dark inversé. Un écart d'une
  seule promesse est à signaler.
- En Dark, une référence de clarté moyenne tombe sur un fond teinté (le cran
  500 de `#0013FF`), et la bosse colore les fonds voisins. Mesure la chroma et
  le contraste des fonds Dark contre la carte, et l'appui du fond teinté contre
  l'appui du bouton plein (point ouvert de DECISIONS.md, section 7).
- Interactions : Color shift de saturation, `reglages.part` et sa référence
  refabriquée, pivot et départ réglés, dérive non liée, profil non porteur,
  intensité unique, palettes figées et libres, ordre des nuances ([DER-19]).
- L'alerte `palettes-proches` (C6) compare le plein Vivid ; la bosse change des
  crans pleins. Le nombre de paires change-t-il sur la galerie de 20 palettes
  et sur la recette du mainteneur ?
- L'onglet Harmonisation et ses constats de saturation lisent-ils des chromas
  que la bosse modifie ?

### 5. La qualité, profil par profil et thème par thème

Pour K65 et la bosse, dresse un tableau Soft Light, Soft Dark, Vivid Light,
Vivid Dark. Pour chaque case : ce qui change, sur quelles nuances, de combien,
et si cela touche une décision arrêtée. Vivid ne devrait pas bouger avec K65 ;
vérifie-le à l'octet.

Compare au moins les 17 couleurs 500 de Tailwind, le tour de teinte de
`#C59735`, les cinq références saturées du README, la recette du mainteneur et
les 20 palettes de la galerie (`packages/plugin-palettes/galerie/`).

### 6. Ce que la passe n'a pas vu

Cherche tout autre lecteur des profils, des parts ou des rampes que ces
changements toucheraient : planche, export des variables, explorateur, `ucm
check`, tests à valeurs figées (hexadécimaux attendus), textes du designer en
français et en anglais, spécifications [MOT-*], [ENT-*], [VER-*]. Liste les
tests qui changeraient de résultat.

## Règles

- Ne modifie rien dans `packages/` ni dans les documents existants. Une autre
  session travaille sur `packages/plugin-palettes/` : n'y touche pas.
- Tu peux ajouter des scripts de mesure dans
  `docs/notes/Recherches/Plugin Palettes/Recette moteur palettes/Mesures/`, sur
  le modèle de `mesurer-regles.ts`, lancés par `npx tsx` depuis ce dossier.
- Ne commite rien. Les fichiers du dépôt sont en fins de ligne LF.
- Ne tranche aucune valeur : le mainteneur décide. Tu peux recommander, avec
  tes raisons.
- Rédige en français, phrases courtes et factuelles, sans formule de
  présentation (`.agents/skills/rediger-sans-tics-ia/SKILL.md`).

## Livrable

Écris `docs/notes/Recherches/Plugin Palettes/Recette moteur palettes/REVIEW-CODEX.md` :

1. Un verdict d'une phrase par proposition (K65, alerte, bosse, message) :
   sûre, sûre sous condition, ou à reprendre.
2. Les constats, du plus grave au moins grave. Chacun donne le profil et le
   thème touchés, la preuve (commande et nombres, ou fichier et ligne), la
   décision arrêtée qu'il contredit s'il y en a une, et une correction possible.
3. Le tableau du point 5.
4. Les erreurs trouvées dans le README, la maquette ou `mesurer-regles.ts`.
5. Les scripts ajoutés et la commande pour les relancer.
