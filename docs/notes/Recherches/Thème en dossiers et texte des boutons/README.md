# Le thème en dossiers et le texte des boutons

**Statut :** plan d'implémentation écrit, maquettes validées, en attente d'exécution.

Ce dossier réunit deux chantiers validés par le mainteneur, pour les livrer
dans un seul ordre :

- **le texte des boutons**, blanc ou noir par thème, et le thème inversé :
  [dossier du texte des boutons](../Plugin%20Palettes/Texte%20des%20boutons/README.md) ;
- **le thème en dossiers** `solid`, `surface` et `page`, et les changements
  du moteur qu'il demande :
  [collection usage](../Archi%20Tokens%20Multi-marques/Collection%20usage/README.md).

Le texte des boutons s'écrit directement sur la table en dossiers : les
lecteurs de la table ne changent qu'une fois. Le plan du texte des boutons
(`Plugin Palettes/Texte des boutons/PLAN-IMPLEMENTATION-TEXTE-DES-BOUTONS.md`),
écrit sur l'ancienne table, est remplacé par celui-ci.

| Document | Rôle |
|---|---|
| [PLAN-IMPLEMENTATION.md](./PLAN-IMPLEMENTATION.md) | Le plan pour les agents : spécification, lots, modèle et effort de chaque tâche |
| `Maquettes/` | Les maquettes M1 à M3 de la porte du plan |

## Les maquettes de la porte

Les lots 7 à 9 du plan attendent ces maquettes. Le mainteneur passe une ligne
à « validée » quand il a validé la maquette.

| Maquette | Écran | État |
|---|---|---|
| [M1](./Maquettes/M1-CARTE-DES-GARANTIES.html) | La carte des garanties (I4) | validée |
| [M2](./Maquettes/M2-PLANCHE.html) | La planche dessinée dans Figma (I6) | validée |
| [M3](./Maquettes/M3-INTERFACE-DE-TEST.html) | L'Interface de test (I8) | validée |

## Questions en suspens

### Le bouton plein basculable : l'état activé et son survol

**État :** ouverte, aucune décision. Le plan ne la traite pas.

**Le cas.** Un bouton plein qu'on peut activer et désactiver, comme un bouton
bascule. Désactivé, il suit `solid/default`, `solid/hover` et
`solid/pressed`. Activé, il reste sur `solid/pressed`. Survolé quand il est
activé, il n'a plus de variable : `solid/hover` lui donnerait la couleur du
bouton désactivé survolé, et le survol effacerait la différence entre les
deux états. Le modèle à trois états (`default`, `hover`, `pressed`) ne
couvre pas ce cas, que l'ancien quatrième rang `active-hover` couvrait. Le
mainteneur a de tels composants dans son design system.

**Les pistes proposées :**

1. Deux variables de plus dans `solid`, `solid/selected` et
   `solid/selected-hover` : 900 et 950 dans le thème normal, 500 et 400 dans
   le thème inversé. Les crans 950 et 400 redeviennent requis, et le texte
   des boutons doit tenir sur ces deux fonds. Limite connue : en Light
   inversé, la 400 et la 500 ne sont qu'à 0,014 ΔEok l'une de l'autre, et le
   survol de l'état activé s'y voit à peine. Les tokens d'Atlassian suivent
   ce modèle, avec une famille `selected` qui a ses propres `hovered` et
   `pressed` (de mémoire, à vérifier). Recommandée.
2. Garder trois états et marquer l'état activé autrement que par la couleur
   (coche, icône, contour intérieur en `solid/foreground`) ; le survol
   activé prend `solid/hover`. WCAG 1.4.1 demande de toute façon de ne pas
   signaler un état par la couleur seule. Se combine avec la piste 1.
3. Un calque d'état translucide, comme dans Material : survol et appui
   posent une couche de `solid/foreground` à faible opacité sur n'importe
   quel fond. Sort du modèle opaque : ni UCM Palettes ni `ucm check` ne
   mesurent un contraste composé.
4. L'état activé survolé reprend `solid/hover`. Garde l'ambiguïté ;
   déconseillée.

**Ce qu'une décision changerait :** la table des dossiers (S2 du
[plan](./PLAN-IMPLEMENTATION.md)), les crans requis, les garanties (texte
des boutons sur les nouveaux fonds), l'aperçu en bandes, la carte des
garanties (M1), la planche (M2) et la vue États de l'Interface de test (M3).
