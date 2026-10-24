# Plan : accélérer l'analyse d'Architect et montrer sa progression

Sources : [RECHERCHE-VITESSE-ANALYSE.md](./RECHERCHE-VITESSE-ANALYSE.md) (leviers V1 à V9, décisions Q1 à Q3) et [MAQUETTE-PROGRESSION.html](./MAQUETTE-PROGRESSION.html).

Chaque lot nomme son agent. La conversation principale relit le diff, fait
relancer les vérifications par un `verificateur`, lance `npm run agents:diff`
et commite par chemins explicites. Un lot qui change `packages/kit/src/`
reçoit un bump et les tests racine.

Critère commun à tous les lots : mêmes constats, mêmes corrections, mêmes
questions, comparés en profondeur sur les fixtures existantes. Une différence
n'est admise que pour un bug documenté, avec son test.

## Ordre

| Lot | Contenu | Agent | Dépend de |
|---|---|---|---|
| L0 | Trace de l'analyse (V5) | `implementeur` | — |
| M0 | Traces dans Figma | mainteneur | L0 |
| L1 | Avancement envoyé par le sandbox | `implementeur` | L0 |
| L2 | Barre, phase et Annuler dans le panneau | `implementeur-exigeant` | L1, maquette validée |
| L3 | Rendre la main à l'horloge (V6) | `implementeur` | L0 |
| L4 | Constats du kit avant ceux du moteur (V1) | `implementeur-exigeant` | L1, L2 |
| M1 | Recette dans Figma de L0 à L4 | mainteneur | L4 |
| L5 | Moteur réduit pour Architect (V2) | `implementeur-exigeant` | M1 |
| L6 | Mémoire des parcours par racine (V3) | `implementeur-exigeant` | M1 |
| L7 | Mémoire entre deux analyses (V7) | `implementeur` | L4 |
| L8 | Contrôles dans un Web Worker (V8) | décision, puis `implementeur-exigeant` | M1 |
| L9 | Documents | `executant` | chaque lot |

## L0 · Trace de l'analyse · `implementeur`

- [ ] Ouvrir la trace de `plugin-socle/src/composant/contract/mesure.ts` dans `analyser` (`plugin-architect/src/sandbox/analyse.ts`), avec des étapes propres à Architect : `sujet`, `releve`, `catalogue`, les étapes du moteur, `regles-d-usage`, `controles`, `corrections`.
- [ ] Une étape par contrôle du kit dans `controlesDuKit`.
- [ ] Compter les calques lus, les variables lues et `getStyledTextSegments`.
- [ ] Fermer la trace au rendu et l'imprimer dans la console ; l'abandonner sur annulation ou arrêt.
- [ ] Test : la trace ne change ni les constats ni le message `analyse`.
- [ ] `verificateur` : `npm run test:paquet -- architect`, `npm run typecheck`.

## M0 · Traces dans Figma · mainteneur

- [ ] `npm run build:plugin -- architect`, puis dix analyses du Button à l'ouverture du plugin et dix sans le fermer.
- [ ] Copier les traces de la console dans ce dossier, sous `Mesures/`.
- [ ] Dans la console : `typeof scheduler`, `typeof requestIdleCallback`.

## L1 · Avancement envoyé par le sandbox · `implementeur`

- [ ] Message `analyse-avancement` dans `messages/analyse.ts` : identité, phase, fraction, fait, total, temps restant.
- [ ] Le relevé appelle `avancer` à chaque variant lu.
- [ ] Le moteur reçoit un `annoncer` réel au lieu de `async () => {}` ; sa phase passe dans le message.
- [ ] Envoi au plus une fois par point de pourcentage, comme `signalerAvancement` de l'exporteur.
- [ ] Poids des étapes tirés de M0 ; poids provisoires si M0 n'est pas encore là.
- [ ] Tests : ordre des messages, aucun avancement après une annulation.
- [ ] `verificateur` : `npm run test:paquet -- architect`, `npm run typecheck`.

## L2 · Barre, phase et Annuler · `implementeur-exigeant`

- [ ] Conversation principale : faire valider la maquette et les textes par le mainteneur avant l'appel.
- [ ] `ui/analyse/index.ts` : la barre, la phase et le temps restant au-delà de 10 s remplacent la note `attendreLesConstats`.
- [ ] Bouton Annuler qui envoie `annuler-analyse` ; l'écran « annulée » existant suit.
- [ ] Textes dans `ui/textes/analyse.ts` ; feuille dans `ui/styles/`.
- [ ] États de galerie : relevé à 34 sur 90, moteur à 58 % avec temps restant.
- [ ] `verificateur` : tests du paquet, `npm run galerie:plugin -- architect`, contrôle de style des textes.

## L3 · Rendre la main à l'horloge · `implementeur`

- [ ] Le relevé respire selon le temps écoulé (`respirerSiBesoin` ou un budget propre), plus tous les 400 calques.
- [ ] `controlesDuKit` et `proposerLesCorrections` : une respiration entre deux contrôles.
- [ ] Compter `plusLongSilenceMs` dans la trace de L0.
- [ ] Test : constats identiques ; une annulation pendant les contrôles rend `annulee`.
- [ ] `verificateur` : `npm run test:paquet -- architect`, `npm run typecheck`.

## L4 · Constats du kit avant ceux du moteur · `implementeur-exigeant`

- [ ] Le sandbox rend les constats du kit dès les corrections calculées, sous un statut provisoire, puis le résultat entier après le moteur et les règles d'usage.
- [ ] Le panneau range les constats provisoires par élément, montre la mention de la maquette et ne marque aucun élément « tenu » avant la fin.
- [ ] Corrections, questions et Ignorer restent fermés tant que l'analyse est provisoire, sauf avis contraire du mainteneur.
- [ ] Lecteurs à vérifier : `ui/panneau/elements.ts`, `ui/composant/analyse.ts`, `sandbox/analyse.ts` (`retenirLesCorrections`), `ui/corrections/`.
- [ ] Tests : ordre des deux messages, résultat final identique à aujourd'hui.
- [ ] `verificateur` : tests du paquet, galerie, `npm run typecheck`.

## M1 · Recette dans Figma · mainteneur

- [ ] Rejouer M0 sur le build de L4 ; noter le temps total, le temps jusqu'aux premiers points, `plusLongSilenceMs`.
- [ ] Vérifier que Figma ne gèle plus et que la barre avance.

## L5 · Moteur réduit · `implementeur-exigeant`

- [ ] Option du moteur (`plugin-socle/src/composant/contract/exportComponent.ts`) qui saute échantillons, compaction et sérialisation.
- [ ] Les règles d'usage (`plugin-architect/src/regles.ts`) lisent ce dont elles ont besoin sans le contrat complet.
- [ ] L'exporteur garde le chemin complet ; son banc de parité reste vert.
- [ ] Test : constats C30 à C45 identiques avec et sans l'option.
- [ ] `verificateur` : `npm run test:paquet -- architect`, `npm run test:paquet -- exporter`, `npm run typecheck`.

## L6 · Mémoire des parcours par racine · `implementeur-exigeant`

- [ ] Garder `getAllNodes` et `textSlots` par racine dans la portée d'analyse, comme proposé en L9.8 de l'exporteur.
- [ ] L'avertissement du calque masqué porteur de variables sort encore à chaque appel servi.
- [ ] Contrat identique octet pour octet, hors date.
- [ ] `verificateur` : `npm run test:paquet -- exporter`, `npm run test:paquet -- architect`.

## L7 · Mémoire entre deux analyses · `implementeur`

- [ ] Garder le résultat du moteur et des règles par jeu de variants, tant qu'aucun `nodechange` ne touche ses nœuds et qu'aucune écriture du plugin n'a eu lieu.
- [ ] Un changement de library ne périme pas cette mémoire (Q3) ; le dire dans le commentaire d'en-tête.
- [ ] Test : seconde analyse sans changement servie par la mémoire ; un `nodechange` sur un calque la jette.
- [ ] `verificateur` : `npm run test:paquet -- architect`.

## L8 · Contrôles dans un Web Worker · décision

- [ ] Conversation principale : décider sur la trace de M1. Le lot s'ouvre si contrôles et corrections passent une seconde dans Figma.
- [ ] Si ouvert : écrire la note de conception (copie du relevé, retour des constats, build du worker), puis un appel `implementeur-exigeant`.

## L9 · Documents · `executant`

- [ ] `packages/plugin-architect/CARTE.md` : lignes des fichiers touchés par chaque lot.
- [ ] `packages/plugin-architect/SPEC.md` : statut provisoire et mémoire entre analyses, si L4 et L7 sont faits.
- [ ] Cocher ce plan avec le hash de chaque commit.
