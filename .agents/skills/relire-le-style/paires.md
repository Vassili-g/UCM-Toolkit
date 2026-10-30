# Paires avant/après

Ces exemples se lisent avant d'écrire un document, un plan, une maquette ou un rapport long. Pour en ajouter une, le mainteneur écrit « paire : » suivi du texte rejeté, avec sa version s'il en a une ; sans version, Claude propose l'« Après » et attend son accord.

### P-01 · commentaire

Avant : « Une instruction en mémoire est du contexte, que le défaut verbeux d'un modèle recouvre ; un hook est de la configuration, et il s'exécute. »
Après : « Un hook sera exécuté à chaque écriture plutôt que d'utiliser une consigne en mémoire. »
Changé : l'aphorisme et le binôme deviennent un fait.
Source : `scripts/hook-style.mjs`, en-tête.

### P-02 · document

Avant : « La table ci-dessus ne dit pas où une règle atterrira : elle dit où elle est. »
Après : « La table donne l'endroit où chaque règle est écrite. »
Changé : l'opposition à deux-points disparaît, le fait reste.
Source : `CONTRIBUTING.md`, section « Une règle, un domicile ».

### P-03 · document

Avant : « Qui répare dépend du sens de l'écart, et non de la personne qui a ouvert la pull request, que la CI ne connaît pas. »
Après : « La CI désigne la personne qui sera chargée de s'occuper du problème en fonction de son rôle. »
Changé : une phrase à trois verbes devient une phrase avec un sujet et un verbe.
Source : relevé de la skill.

### P-04 · document

Avant : « Un chemin choisi trop tard se corrige donc à la main, dans le fichier. »
Après : « Pour modifier un chemin manuellement il faut modifier ucm.config.json. »
Changé : l'instruction et le nom du fichier remplacent la périphrase.
Source : relevé de la skill.

### P-05 · maquette

Avant : « Ce qui écarte ces palettes, et le geste qui corrige »
Après : « Ces palettes sont trop proches, veuillez modifier la teinte de l'une d'elles. »
Changé : le sous-titre sans verbe devient une phrase avec l'action du designer.
Source : relevé de la skill.

### P-06 · réponse

Avant : « Excellente question ! J'ai creusé en profondeur. **Le cœur du problème** : le build embarque un kit périmé. **Bonne nouvelle** : la correction est simple. N'hésitez pas si vous voulez que j'aille plus loin ! »
Après : « Le build embarque un kit périmé. `npm run build:plugin -- palettes` reconstruit le kit, puis le plugin. Je le lance ? »
Changé : l'ouverture, les étiquettes en gras et l'offre finale disparaissent. La commande est donnée.
Source : tour typique d'une réponse.

### P-07 · rapport d'agent

Avant : « ✅ Lot 3 terminé avec succès ! **Robustesse** : la fonction gère désormais tous les cas limites. **Tests** : couverture complète. En résumé, le lot est prêt. »
Après : « Lot 3 fait. `palette.ts` refuse une teinte hors de 0 à 360. Deux tests de régression sont dans `palette.test.ts`. `npm test` passe. Rien n'est commité. »
Changé : chaque qualificatif devient un fait vérifiable.
Source : tour typique d'un rapport d'agent.

### P-08 · commentaire

Avant : « Un contrôle qui refuse une phrase exacte se fait désarmer. »
Après : « Ces deux mots restent hors de la liste, car le dépôt les emploie au sens littéral. »
Changé : la maxime devient la raison de la décision.
Source : `scripts/controle-style.mjs`, commentaire d'`INTENSIFICATEURS`.

### P-09 · règle du mainteneur

Avant : une phrase qui répète ou décore sans apporter de fait.
Après : rien. La phrase se supprime, elle ne se reformule pas.
Source : relevé des phrases de `CONCEPT.md`, `CONTRIBUTING.md`, `FORMAT.md` et `COMPATIBILITE.md`, jugées impossibles à corriger par le mainteneur.
