---
name: relire-le-style
description: "Relire un texte déjà écrit (document, plan, maquette, rapport long) pour y trouver les tours fautifs. Les règles d'écriture sont dans le bloc « Écrire » d'AGENTS.md et les exemples dans paires.md. Ne remplace pas rediger-diagnostics-ucm."
---

# Relire le style

Liste de relecture d'un texte écrit. Les règles d'écriture sont dans le bloc « Écrire » d'`AGENTS.md`, les exemples dans [`paires.md`](paires.md). Un message affiché au designer suit aussi `rediger-diagnostics-ucm`.

Première règle : une phrase qui n'apporte aucun fait se supprime. Elle ne se reformule pas.

## Tours à repérer

### Le binôme rythmique

Test : couper à la virgule. Si le premier bloc porte déjà le fait, le second est une cadence.
Avant : « Un même composant existe à plusieurs endroits, et rien ne garantit qu'ils disent la même chose. »
Après : « Le composant existe dans deux fichiers. `tests/contrat.test.ts` les compare et échoue au premier écart. »

### Le prédicat vague

Test : nommer les deux objets comparés et le contrôle qui constate l'écart. Sans eux, la phrase n'énonçait pas de fait.
Avant : « Rien ne garantit qu'ils disent la même chose. »
Après : « `tests/contrat.test.ts` compare les deux fichiers et échoue au premier écart. »

### La négation d'une objection absente

Test : chercher plus haut où le document introduit la charge niée. Sans cet endroit, elle vient du rédacteur.
Avant : « Deux commandes, et aucun script à écrire. »
Après : « Lancer `ucm init`, puis `ucm check`. »

### Le témoin anonyme

Test : remplacer « personne », « quelqu'un » ou « on » par l'acteur réel, ou décrire l'état vérifiable.
Avant : « Une version que personne n'a essayée. »
Après : « Une version que le dépôt n'a pas testée. »

### Le mécanisme qui pense

Test : remplacer le verbe mental (« changer d'avis », « savoir », « décider ») par l'entrée, l'opération et le verdict. Un fichier ne « vit » pas quelque part : écrire « le module `names.ts` porte la règle ».
Avant : « Le contrôle changerait d'avis sans qu'un fichier ait bougé. »
Après : « Le contrôle rendrait un verdict différent sur le même contrat. »

### La périphrase à la place de l'instruction

Test : réécrire à l'impératif avec l'objet nommé. Si rien ne se perd, la forme abstraite n'apportait rien.
Avant : « Un chemin choisi trop tard se corrige donc à la main, dans le fichier. »
Après : « Pour modifier un chemin manuellement il faut modifier ucm.config.json. »

### Le « qui » sans antécédent

Test : remplacer par un nom de rôle du vocabulaire du dépôt (designer, développeur consommateur, contributeur du moteur, agent). Une colonne de tableau garde la même forme sur toutes ses lignes.
Avant : « Qui branche un repository »
Après : « Développeur consommateur »

### La phrase à trois étages

Test : compter les verbes conjugués. Au-delà de deux, couper. Chaque relative suit le nom auquel elle se rattache.
Avant : « Qui répare dépend du sens de l'écart, et non de la personne qui a ouvert la pull request, que la CI ne connaît pas. »
Après : « La CI désigne la personne qui sera chargée de s'occuper du problème en fonction de son rôle. »

### Le diptyque sans verbe

Test : chercher le verbe principal d'un titre ou d'un sous-titre, puis l'objet de chaque verbe transitif. Dans un texte affiché au designer, nommer l'action ou le bouton ; « geste » appartient aux contributeurs.
Avant : « Ce qui écarte ces palettes, et le geste qui corrige »
Après : « Ces palettes sont trop proches, veuillez modifier la teinte de l'une d'elles. »

## Relecture finale

Relire du point de vue d'un lecteur qui ne connaît pas la session.

1. Chaque phrase ajoute-t-elle un fait, une règle, une conséquence ou une action vérifiable ? Sinon, la supprimer.
2. Le lecteur sait-il qui agit, sur quoi et pourquoi, sans deviner ?
3. Un commentaire paraphrase-t-il le code, ou une documentation répète-t-elle son autorité ? Déplacer ou supprimer.
4. Le rythme cherche-t-il à convaincre par une formule, une opposition, une triade ou une métaphore ? Écrire une phrase déclarative.
5. Les tests ci-dessus passent-ils sur chaque paragraphe ?

Contexte et raisons de ces choix : [`references/recherches.md`](references/recherches.md), seulement pour faire évoluer cette skill ou lors d'une revue rédactionnelle importante.
