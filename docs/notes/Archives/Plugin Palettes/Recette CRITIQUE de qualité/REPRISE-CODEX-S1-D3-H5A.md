# Reprise de S1, D3 et H5a

Les changements sont à relire par Claude avant de cocher les tâches.
Codex n'a effectué aucun commit ni push.

## S1

Fichiers modifiés :

- `packages/plugin-socle/src/ui/Onglets.ts`
- `packages/plugin-palettes/src/ui/socleLocalise.ts`
- `docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`
- `packages/plugin-exporter/src/ui/components/ConfigurationPage.ts`

Fichier créé : `packages/plugin-socle/tests/onglets.test.ts`.

`definirDisponible(id, disponible)` pose `disabled` et `aria-disabled`.
Le clic et la sélection programmée refusent les onglets indisponibles.
Les flèches, Début et Fin les sautent. Désactiver l'actif sélectionne le
premier disponible ; son focus suit seulement s'il était sur l'onglet désactivé.

Sans disponible, les panneaux sont masqués et `actif()` rend `undefined`.
La première réactivation rétablit la sélection. Le rappel reçoit uniquement
un identifiant disponible. La clause `[UI-45]` est ajoutée dans SPEC-PAL.

Le fichier d'Exporter est un raccordement supplémentaire au bloc S1 :
son interface exige un onglet actif défini. `ongletActif` conserve le retour
`general` par défaut avec `onglets.actif() ?? 'general'`.
Le premier typecheck global signalait cette incompatibilité ; le second passe.

Pour H1, appeler `onglets.definirDisponible('harmonisation', nombreDePalettes >= 2)`
à chaque changement du nombre de palettes. Le vidage de l'état d'Harmonisation
reste dans H1.

| Vérification | Résultat |
|---|---|
| `npm run build --workspace @ucm-kit/core` | Réussi, prérequis des tests |
| `npm test --workspace ucm-plugin-socle` | 17 tests réussis, dont 6 nouveaux `[UI-45]` |
| `npm run typecheck --workspace ucm-plugin-socle` | Réussi |
| `npm run typecheck` | Réussi après le raccordement d'Exporter |
| `npm run test:ui --workspace ucm-exporter-plugin` | 39 tests réussis, y compris après le raccordement |
| `npm run test:ui --workspace ucm-architect-plugin` | 24 tests réussis |
| `npm run test:ui --workspace ucm-palettes-plugin` | Interrompu à réception des consignes de coordination ; aucun verdict global |

Les suites d'interface ont été lancées avant réception des consignes de
coordination. Elles reconstruisent les artefacts partagés. Claude doit
les relancer ensemble en fin de vague ; ces résultats ne remplacent pas
cette vérification. Aucun fichier source de galerie ou test d'interface
n'a été modifié par Codex.

## D3

Fichier modifié :
`docs/notes/Recherches/Archi Tokens Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md`.

La table distingue les quatre combinaisons de thème et de sens. Les crans
requis, `ring`, G7 contre page et carte, le cran 50 Dark à L 0,145 et la page
`#0A0A0A` sont reportés. Les sections sur l'enveloppe, la part Soft 0,85,
la dérive Tailwind et la lecture du format 11 suivent les décisions.
Le bandeau est retiré ; les mesures anciennes sont remplacées par les
références de la recette critique.

Les chemins des collections sont conservés. Le modèle de tokens emploie
une page au neutre 50 et une carte au neutre 100 en Dark. La déduction de
la carte à partir d'un autre fond réglé dans Palettes n'écrit aucun alias :
le designer doit accorder ces fonds aux tokens du composant.
Le contraste des états du bouton basculable reste à remesurer dans la
recherche correspondante.

Vérifications : `node scripts/controle-style.mjs` sur ce document et
`git diff --check` réussis. Un contrôle ponctuel compare les 52 cellules
à `TABLE_DES_DOSSIERS`, vérifie les cibles des liens locaux, les fins de
ligne LF et l'absence des mentions obsolètes. Tous passent.

## H5a

Les 27 coefficients ci-dessous sont ceux de la
  ligne `1.0` de la table 1 du [tutoriel des auteurs](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html#Tutorial),
  relue directement dans son HTML. Les six décimales sont la précision
  publiée ; aucune interpolation n'est nécessaire.

  ```ts
  const deuteranopie = [
    [ 0.367322,  0.860646, -0.227968],
    [ 0.280085,  0.672501,  0.047413],
    [-0.011820,  0.042940,  0.968881],
  ] as const;

  const protanopie = [
    [ 0.152286,  1.052583, -0.204868],
    [ 0.114503,  0.786281,  0.099216],
    [-0.003882, -0.048116,  1.051998],
  ] as const;

  const tritanomalieSevere = [
    [ 1.255528, -0.076749, -0.178779],
    [-0.078411,  0.930809,  0.147602],
    [ 0.004733,  0.691367,  0.303900],
  ] as const;
  ```

**Borne de la source pour H5.** La troisième colonne du tutoriel se
  nomme `Tritanomaly`. Dans l'[article corrigé, sections 4.2.1 et 4.3](https://profs.ic.uff.br/~laffernandes/content/publications/journal/2009_tvcg_15%286%29/machado_oliveira_fernandes-tvcg-15%286%29-2009-corrected.pdf),
  les auteurs excluent la tritanopie de leur modèle et présentent la
  tritanomalie comme une approximation. La troisième matrice répond au
  choix Machado à sévérité 1 du plan ; ne pas la présenter dans le code
  comme un modèle validé de tritanopie. Opus doit reprendre cette limite
  lors du choix du libellé de vision de H5.
**Raccordement de H5.** Multiplier chaque ligne par le vecteur colonne
  `[R, G, B]` linéaire, dans cet ordre : `sortie[i] = somme(M[i][j] * entree[j])`.
  Depuis une couleur `Rgb8`, employer `rgb8VersLineaire`, multiplier, puis
  appeler `lineaireVersRgb8` pour borner à `[0, 1]`, encoder en sRGB et
  arrondir à l'octet. Ces fonctions sont déjà exportées par `ucm-couleur`.
  Conserver les coefficients négatifs jusqu'au bornage du résultat.
  La simulation repeint les points ; elle ne modifie ni la recette ni les
  garanties (SPEC, section 7.8). H5 reste à implémenter.

Vérification : comparaison automatique des 27 coefficients avec la ligne 1.0
du HTML primaire téléchargé par curl.exe : identiques. Aucun code de simulation
ajouté. Opus doit reprendre la limite sur la tritanopie lors de H5.
