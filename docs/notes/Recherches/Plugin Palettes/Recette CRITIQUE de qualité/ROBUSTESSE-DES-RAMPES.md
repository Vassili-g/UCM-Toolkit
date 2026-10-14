# Robustesse des rampes : toutes les teintes, tous les cas

**Statut : décisions prises au banc visuel ; la règle de chroma et le focus sont arrêtés.** Ce dossier rouvre la règle
de chroma S1 de la [solution](./SOLUTION-RAMPES.md) : l'enveloppe corrigeait les
verts clairs, mais elle ternissait les jaunes et les ambres clairs, absents du
fichier du mainteneur et du test à l'aveugle. Il teste chaque règle sur toutes
les familles de teinte, compare au marché, vérifie les garanties, et répond aux
questions du mainteneur sur le cran des fonds, le focus et `ring`. Le
[banc visuel](./Maquettes/BANC-VISUEL.html) sert à noter à l'œil.

## 1. Ce que fait le marché

Part du maximum que l'écran affiche (le plafond sRGB) employée par Tailwind
3.4.17 et Radix Colors 3.0.0, selon la teinte et la clarté
([caler-retenue.ts](./Mesures/caler-retenue.ts)) :

| Familles | Tailwind, crans clairs (50 à 300) | Tailwind, crans foncés (700 à 950) | Radix clair, fonds (pas 2 à 5) |
|---|---|---|---|
| Rouge, orange, ambre, jaune | 0,90 à 1,00 | 0,83 à 0,98 | 0,77 à 1,00 |
| Lime, vert, émeraude, turquoise | 0,59 à 0,81 | 0,86 à 0,99 | 0,27 à 0,40 |
| Cyan, ciel | 0,86 à 1,00 | 0,86 à 0,99 | 0,55 à 0,85 pour le ciel |
| Bleu, indigo | 0,93 à 1,00 | 0,46 à 0,76 | 0,93 à 1,00 |
| Violet, pourpre, fuchsia, rose | 0,79 à 1,00 | 0,84 à 0,96 | 0,92 à 1,00 |

Les deux références retiennent la chroma au même endroit : les verts clairs et
les bleus foncés. Ce sont les deux zones où l'écran affiche bien plus de chroma
qu'ailleurs, parce que son vert primaire est très clair et son bleu primaire
très foncé. Partout ailleurs, et notamment pour les jaunes clairs, elles
restent près du plafond.

Une borne qui ne dépend que de la clarté, comme l'enveloppe, ne peut pas
reproduire cette forme : elle traite le jaune clair comme le vert clair.

## 2. Trois règles comparées au marché

- **Part constante** (le moteur actuel) : chaque cran prend une part fixe du
  plafond.
- **Enveloppe par thème** (S1) : la part, plafonnée par une borne de clarté.
- **Retenue par teinte** (proposée) : la part, multipliée par un facteur qui
  vaut 1 partout, sauf dans deux bosses lisses calées sur le marché.

`C = part(zone) × retenue(L, H) × plafond(L, H)`, avec
`retenue = 1 − kv × bosse(H ; 157°, 31°) × montée(L ; 0,76 → 0,90) − kb × bosse(H ; 269°, 14°) × descente(L ; 0,69 → 0,21)`.
Calée sur Tailwind : `kv` 0,32 pour les verts clairs, `kb` 0,57 pour les bleus
foncés. Calée sur Radix clair, la retenue des verts vaut 0,675 et commence dès
L 0,56. Vivid prend la retenue de Tailwind et une part de 0,95. Soft prend
0,6 dans les fonds et 0,85 dans les textes, la retenue de Radix en Light et
celle de Tailwind en Dark, où ces clartés sont des textes.

Crans hors de ×0,8 à ×1,25 de la référence, à leur clarté et leur teinte :

| Règle | Tailwind (173 crans) | Radix clair (122 pas) |
|---|---|---|
| Part constante 0,95 | 21 | 48 |
| Enveloppe Vivid | 12, surtout des jaunes et des ambres trop ternes | 53 |
| Retenue calée sur Tailwind | 0 | 45 |
| Retenue calée sur Radix clair | 75 | 13 |

Sur les crans clairs, famille par famille (Vivid, à la clarté et la teinte de
Tailwind) :

| Familles | Part constante | Enveloppe | Retenue |
|---|---|---|---|
| Rouge, orange, cyan, bleu, violet, rose | ×1,0 à 1,2 | ×1,0 à 1,2 | ×1,0 à 1,2 |
| Lime, vert, émeraude, turquoise | ×1,2 à 1,6 | ×0,5 à 1,2 | ×0,9 à 1,1 |
| Ambre, jaune | ×1,0 | ×0,4 à 0,8 | ×1,0 |

La retenue est une seule formule pour toutes les teintes, comme les autres
règles. Elle ne mord que là où les deux références retiennent.

## 3. Les garanties

Les sept garanties sur le balayage de 72 teintes à deux clartés de référence,
dans les quatre combinaisons du texte des boutons, contre la page et la carte
([garanties-regles.ts](./Mesures/garanties-regles.ts)) :

| Table | Part constante | Enveloppe | Retenue |
|---|---|---|---|
| Fonds Light 50, Dark 200, texte Dark 900 | 144 | 144 | 144 |
| Fonds Light 100, Dark 200 | 144 | 164 | 164 |
| Fonds Light 100, Dark 300, texte Dark 900 | 720 | 740 | 740 |
| Fonds Light 100, Dark 300, texte Dark 950 | 144 | 164 | 164 |

Les 144 échecs existent avec le moteur actuel : le texte blanc sur un plein où
une référence de clarté 0,62 est ancrée, en Dark inversé. Les 20 de plus avec
un fond Light 100 sont le focus 600 contre ce fond (2,98 à 3,00:1), et ne
comptent que si le focus touche le fond : un anneau décalé les retire. Un fond
Dark 300 demande un texte 950 ; avec 900, l'appui 500 manque 4,5:1 partout.

Les trois règles tiennent donc les mêmes garanties. Le choix se fait à l'œil.

## 4. La dérive de teinte : l'autre cause des jaunes beiges

Les jaunes et les ambres clairs paraissaient beiges avec toutes les règles. La
chroma n'en est qu'une cause ; la teinte en est une autre. Le préréglage
Tailwind du moteur (`prereglageTailwind`) se trompe de teinte sur les familles
qui tournent le plus le long de leur rampe :

| Référence | Préréglage actuel | Dérive corrigée |
|---|---|---|
| Cran 500 de Tailwind | pire 22° (orange, ambre) | pire 12° |
| Cran 600 | pire 28° (orange, ambre ; jaune, rose, cyan, rouge 10 à 14°) | pire 12°, médiane 1° |
| Cran 700 | pire 38° | pire 10° |

Deux causes, dans `deriveTailwind` : il choisit les rampes voisines d'après la
teinte de leur cran 50, alors que la référence est un cran moyen ; et il
répartit la dérive au prorata de la clarté, alors que Tailwind tourne surtout
dans les clairs (l'ambre passe de 58° au cran 600 à 96° au cran 100). La
correction choisit les rampes voisines d'après leur teinte à la clarté de la
référence, et lit sur elles la dérive à chaque bout. Au cran 100, l'ambre passe
de 69° à 93° (Tailwind 96°), l'orange de 47° à 71° (75°), le jaune de 91° à
101° (103°).

Entre deux familles, la dérive change vite (rouge +9°, orange −37°) : une
référence qui n'appartient à aucune rampe de Tailwind garde un écart de 16 à
29° au pire, sur les teintes de transition. Le changement touche le format du
relevé de la recette (`derives`) : il porte la teinte de chaque cran, pas
seulement celles des deux bouts.

La clarté reste une limite assumée : UCM donne la même clarté à un cran de
toutes les teintes, pour l'harmonie entre palettes. Tailwind éclaircit ses
jaunes (yellow-100 à L 0,97, contre 0,95 pour le cran 100 d'UCM).

## 5. Le cran des fonds : 50 ou 100, 200 ou 300

Le mainteneur trouve désormais les fonds 100 meilleurs, et les badges discrets
trop discrets. C'est cohérent avec le changement du moteur : l'enveloppe a
retiré une partie de la chroma des crans clairs (Grass Soft 100 : C 0,044 →
0,026), sans changer leur clarté. Le fond 100 est devenu plus calme. Avec la
retenue par teinte, les fonds Soft gardent un peu plus de couleur que sous
l'enveloppe : le jugement se refait avec la règle retenue, dans le banc visuel.

| Fond | Contre la carte | Marché |
|---|---|---|
| Light 50 | 1,07 | 1,04 à 1,09 (Figma, Tailwind, Untitled UI) |
| Light 100 | 1,16 | 1,12 à 1,17 (Primer, Atlassian, Radix) |
| Dark 200 | 1,15 | 1,08 à 1,22 (Primer, Atlassian, Fluent) |
| Dark 300 | 1,39 | 1,17 à 1,40 (Radix, Figma SDS) |

Les deux choix tiennent la même règle générale, à un cran près : le fond se
tient à un cran de sa carte (50 et 200), ou à deux (100 et 300). Le second
choix tranche aussi la question du texte Dark : 950. Il a un défaut en sens
inversé : l'appui du fond teinté, 500, prend la couleur de l'appui du bouton
plein.

## 6. Le focus

**Ce que dit le W3C.** Le critère 1.4.11 (niveau AA) demande 3:1 entre un
indicateur de focus et ses couleurs voisines. Pour un indicateur dessiné hors
du composant, l'Understanding précise que c'est le fond qui l'entoure qui
compte, pas le composant (figures 9 et 10). Un halo pâle seul, collé au
bouton, échoue donc (1,1 à 1,5:1 contre le blanc), même s'il contraste avec le
bouton. Le 2.4.13 (niveau AAA) demande en plus 3:1 entre l'état avec et sans
focus. Une lecture plus souple existe chez un tiers (Level Access, « usually
both ») ; elle contredit l'Understanding.

**La couleur la plus claire qui passe.** Contre une carte blanche, la
luminance relative de l'indicateur doit valoir 0,30 au plus : une clarté OKLCH
d'environ 0,67, le gris `#949494`. Dans UCM, c'est le cran 600, parfois le 500
(bleu, rouge, violet). En Dark, contre la carte au neutre 100, il faut le cran
600 environ.

**Qui emploie un halo pâle.** Le mainteneur a raison : le halo pâle collé est
répandu, et notre relevé précédent l'avait manqué faute de lire les bons
systèmes. Contrastes contre la page claire ([Collecte/Focus/](./Collecte/Focus/README.md)) :

| Système | Halo collé | Contre la page |
|---|---|---|
| Bootstrap 5.3 | 4 px, 25 à 50 % de la teinte, sur les boutons et les champs | 1,4 à 2,1:1 |
| Flowbite 4 | `ring-4` d'un cran 200, ou 100 en gris | 1,1 à 1,8:1 |
| shadcn/ui | 3 px, le gris `--ring` à 50 % | 1,5:1 |
| Ant Design 5 | 2 px de `controlOutline`, sur les champs | 1,1:1 |
| Kit Figma d'Untitled UI | 4 px de `#F4EBFF` | 1,16:1 |
| Radix Themes | un trait de 2 px collé, sur quatre variantes de bouton | 2,3:1 |

Aucun n'atteint 3:1. Bootstrap a reconnu l'écart et a choisi de ne pas le
corriger. Trois d'entre eux rattrapent les champs par une bordure qui change
de couleur avec le focus : Ant Design la porte à 4,1:1, ce qui suffit ; shadcn
(2,6:1) et Bootstrap (2,1:1) restent sous le seuil en Light. Primer, Carbon,
Spectrum, Polaris, Fluent, le Simple Design System de Figma, Untitled UI React
et Mantine emploient un trait franc, le plus souvent décalé ; Chakra, un trait
décalé gris à 2,6:1 dans son thème par défaut.

**Ce que cela donne pour UCM.** La variable de focus d'UCM reste conforme
(600 en sens normal, 700 en sens inversé, dans les deux thèmes). La forme se règle dans les composants : un
anneau décalé est conforme ; un halo pâle ne l'est pas. Une équipe qui choisit
le halo pâle prend pour couleur un cran clair qui existe déjà (le fond teinté
ou son survol), sans variable nouvelle, et sort de la garantie G7. Sur un
champ, elle peut rester conforme en changeant aussi la bordure vers `ring`,
comme Ant Design. Le banc
visuel montre le halo pâle, un halo collé au cran conforme le plus proche du
fond, et l'anneau décalé.

## 7. `ring` dans chaque dossier, ou une seule fois

Le dossier `page` porte aussi des éléments interactifs : le lien
(`page/foreground`), le bouton à contour et le bouton fantôme (`page/border`,
`page/foreground`), le champ de saisie, la case à cocher, le bouton radio,
l'interrupteur, les onglets et les entrées de navigation. Tous ont un focus.

Mais les trois `ring` vaudraient le même cran : la redondance ne sert qu'à
retrouver la variable en reliant un composant dossier par dossier. Trois
rangements tiennent :

| Rangement | Variables par palette | Effet |
|---|---|---|
| `ring` dans chaque dossier | 15 | Trois alias de même valeur |
| `ring` à la racine de la palette, à côté des trois dossiers | 13 | Une seule variable, visible en ouvrant la palette |
| Un focus unique pour tout le thème | 12, plus 1 | Une seule couleur, souvent la marque ; sept des dix systèmes relevés font ainsi |

Recommandé : `ring` à la racine de la palette. Il règle le problème de départ
(la variable introuvable dans `solid`) sans redondance, garde un focus rouge
pour un bouton de danger, et laisse aux composants le choix d'un focus unique.

## 8. Le premier tour du banc

Notes du mainteneur, de 1 à 5, sur les dix-sept familles et les sept cas
limites ; A, B et C étaient cachées :

| Règle | Couleurs justes | Cohérence | Fonds | Textes |
|---|---|---|---|---|
| A, enveloppe : Soft Light, Soft Dark | 4, 4 | 5, 5 | 5, 5 | 5, 5 |
| A, enveloppe : Vivid Light, Vivid Dark | 4, 4 | 5, 3 | 5, 4 | 5, 5 |
| B, retenue par teinte : Soft Light, Soft Dark | 5, 4 | 2, 1 | 2, 4 | 5, 3 |
| B, retenue par teinte : Vivid Light, Vivid Dark | 5, 4 | 4, 1 | 3, 4 | 5, 3 |
| C, moteur actuel : Soft Light, Soft Dark | 3, 2 | 2, 2 | 1, 3 | 2, 2 |
| C, moteur actuel : Vivid Light, Vivid Dark | 5, 4 | 1, 1 | 2, 4 | 4, 2 |

Ce que les notes disent :

- **L'enveloppe gagne**, par sa cohérence. Elle donne à tous les crans clairs
  la même chroma au plus : l'écart entre familles au cran 100 vaut ×1,4 en Soft,
  contre ×4,3 avec la retenue par teinte. Le mainteneur préfère des fonds
  uniformes à des couleurs fidèles au marché.
- **Son défaut : les jaunes clairs**, « plus marron clair que jaune »,
  surtout en Soft Light (C 0,025 au cran 100). Remarque du mainteneur :
  « Règle A, un cran plus marqué et dérive de teinte corrigée, c'est vraiment
  pas mal. »
- **Sa cohérence de 3 en Vivid Dark** vient des fonds : au cran 300, les bleus
  et les violets montent à 0,15 de chroma, les turquoises restent à 0,04.
- **La retenue par teinte** a les couleurs les plus justes (5 en Light), mais
  des fonds inégaux et, en Dark, des textes verts et jaunes trop colorés.

Décisions prises :

- La règle de chroma reste l'enveloppe par thème (Q1), avec deux réglages à
  juger au second tour.
- La dérive de teinte corrigée (Q10).
- Le fond teinté un cran plus marqué : 100 en Light (survol 200, appui 300),
  300 en Dark (survol 400, appui 500), texte Dark 950 (Q5). Le fond se tient à
  deux crans de sa carte dans les deux thèmes. Le badge discret suffit : le
  badge plus marqué n'a plus d'usage.
- Focus Light : halo pâle collé au cran 200 noté 5, halo au cran 100 et
  anneau décalé 3, halo au cran conforme 1. Le mainteneur : « le halo collé en
  cran 200 est le plus esthétique, mais ça m'embête que le moteur propose un
  cran de couleur pour un usage et que ça ne suive pas la réglementation ».

## 9. Le second tour

Le [second tour](./Maquettes/BANC-VISUEL-TOUR-2.html) fixe ce qui est
décidé et ne fait juger que trois choses ([generer-banc-tour-2.ts](./Mesures/generer-banc-tour-2.ts)) :

- **La marge des jaunes clairs**, en Light : la borne de l'enveloppe s'élargit
  autour du jaune seulement (100°, écart type 12°), de 0 à +150 %. Au cran 100,
  le jaune Soft passe de C 0,025 à 0,038, 0,051 ou 0,064, le niveau de la
  retenue par teinte ; les autres familles ne bougent pas.
- **La borne des fonds Dark en Vivid** : 0,48, 0,38 (celle de Soft) ou 0,30.
  L'écart entre familles au cran 300 passe de ×3,5 à ×2,8 ou ×2,2.
- **Le focus conforme qui garde l'aspect du halo** : le halo prend le survol
  du fond teinté (`surface/hover`, exactement le cran 200 en Light avec la
  table retenue), et un liseré de 1 ou 2 px au cran du focus (`ring`) l'entoure.
  Le liseré touche la carte et la contraste de 3,9 à 5,2:1 : l'indicateur est
  conforme au niveau AA, et n'emploie que des variables qui existent. Sur les
  champs et les boutons à contour, passer la bordure au cran du focus suffit
  aussi. Le moteur ne propose donc aucune couleur non conforme pour le focus.

## 10. Le second tour et la règle retenue

Choix du mainteneur : la marge des jaunes clairs à +100 % en Soft et +50 % en
Vivid, la borne des fonds Dark de Vivid à 0,30. La règle de chroma retenue est
donc l'enveloppe par thème, élargie autour du jaune
([variantes.ts](./Mesures/variantes.ts), `REGLE_FINALE`) :

| Profil | Part | Light : a, b | Dark : a, b | Marge des jaunes clairs |
|---|---|---|---|---|
| Soft | 0,85 | 0,6 · 0,38 | 1,1 · 0,38 | +100 % |
| Vivid, intensité unique | 0,95 | 1,1 · 0,48 | 1,1 · 0,30 | +50 % |

Avec la table retenue (fonds Light 100, Dark 300, texte Dark 950), elle tient
les garanties comme les autres règles : 144 échecs, ceux du moteur actuel, plus
20 si le focus touche le fond 100. Ces 20 viennent de la garantie G7, qui juge
le focus contre `surface/default` ; le W3C ne juge un indicateur extérieur que
contre le fond qui l'entoure. Décidé par le mainteneur : G7 juge le focus
contre la page et la carte, et non plus contre `surface/default`, ce qui retire
ces 20 cas. La page est le pire cas en Light (le neutre 50, plus foncé que la
carte blanche), la carte en Dark (le neutre 100, plus clair que la page) : les
deux comptent. Le plugin doit donc connaître la couleur de la carte, blanche en
Light et au neutre 100 en Dark comme `elevation/raised` ; aujourd'hui, il ne
mesure que le réglage « Fond de la page ».

Avec G7 jugé contre la page et la carte, le cran le plus discret de l'anneau
décalé est celui de la table actuelle, dans les quatre combinaisons du texte
des boutons ([mesurer-anneau.ts](./Mesures/mesurer-anneau.ts), balayage de 72
teintes, règle retenue) :

| Thème et sens | Un cran plus discret | Cran de la table | Pire contraste |
|---|---|---|---|
| Light, sens normal | 500 : 422 échecs sur 576 | 600 | 3,17:1 |
| Light, sens inversé | 600 : 574 échecs | 700 | 3,17:1 |
| Dark, sens normal | 500 : 576 échecs | 600 | 3,59:1 |
| Dark, sens inversé | 600 : 548 échecs | 700 | 3,18:1 |

Le focus Dark à 800 du modèle des niveaux ne servait qu'à l'ancienne G7, qui
jugeait le focus contre le fond teinté : il revient au cran d'aujourd'hui, un
ou deux crans plus discret. En Light, aucun cran plus clair ne tient.

Focus Light, second tour : halo pâle collé 5 ; halo et liseré de 1 ou 2 px,
halo et bordure au cran du focus 1 ; anneau décalé 2. Le mainteneur : « je
préfère le halo pâle collé, mais ça ne passe pas les normes d'accessibilité ».
Aucune variante conforme ne garde l'aspect du halo sur un bouton. Le W3C admet
un indicateur pâle sur un champ de texte, où le curseur signale déjà le focus
(Understanding de 1.4.11, figure 33), pas sur un bouton. Trois choix restent :

| Choix | Boutons | Champs | Ce qu'UCM promet |
|---|---|---|---|
| Halo pâle partout | Non conforme au niveau AA | Conforme, par le curseur | Incompatible avec le plugin (ci-dessous) |
| Halo sur les champs, anneau sur les boutons | Conforme | Conforme | Un rôle de plus pour le halo des champs, validé sur un autre critère que le contraste |
| Anneau décalé partout | Conforme | Conforme | Un seul rôle, `ring`, validé comme aujourd'hui |

Le plugin donne à chaque cran ses rôles, et à chaque rôle son contraste et son
badge WCAG (« AAA », « AA » ou « AA ✗ »). Un rôle de focus posé sur un cran
pâle s'afficherait « AA ✗ », et à raison. Emprunter `surface/hover` pour le
halo ne fait que cacher l'échec : le plugin valide ce cran comme un fond, pas
comme un focus. Le halo pâle sur les boutons sort donc du principe du plugin :
chaque usage d'un cran a un rôle, et chaque rôle est validé.

Le halo des champs y reste possible, à une condition : un rôle propre (par
exemple `ring-subtle`), dont la validation ne mesure pas le contraste mais
rappelle que le curseur porte le focus du champ (Understanding de 1.4.11,
figure 33). Le plugin l'afficherait comme un rôle décoratif, sans badge rouge.
C'est un cas de validation nouveau, à concevoir.

**Décidé par le mainteneur : l'anneau décalé partout**, 2 px du fond puis
2 px de trait, au cran d'aujourd'hui (600 en sens normal, 700 en sens
inversé). Un seul rôle, `ring`, validé comme aujourd'hui ; ni halo, ni rôle de
halo de champ. Le plugin dessine déjà cette forme ; ce que l'implémentation met
à jour est listé dans la [solution](./SOLUTION-RAMPES.md), section 4, « Le
focus, fichier par fichier ».

## 11. Limites

- Les références du marché sont Tailwind 3.4.17 et Radix Colors 3.0.0 ;
  Tailwind 4 définit ses rampes en OKLCH, en partie hors sRGB.
- La retenue de Soft hérite de Radix clair, qui retient les verts plus que
  Tailwind ; elle n'a pas encore été notée à l'œil.
- La dérive corrigée reste imprécise entre deux familles de Tailwind, là où la
  dérive change vite.
