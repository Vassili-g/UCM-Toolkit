# Corpus de composants

P35 capture tous les composants de trois kits UI publics et les rejoue hors de Figma, pour tester le moteur du contrat et Architect sur des centaines de composants réels au lieu de trois.

## Ce qui existe

Architect a un build de capture (`packages/plugin-architect/src/sandbox/capture.ts`). Il relève en JSON chaque nœud atteint par l'analyse, les variables, les styles et les règles de page, et `packages/plugin-architect/tests/outils/capture.ts` rebâtit un double de Figma depuis ce fichier. `npm run recette:architect` rejoue une capture et compare les constats à un fichier `<capture>.attendus.json`. Les captures de Button et de Groupe sont dans `_local/`, parce qu'elles contiennent des données de documents.

Trois limites viennent de cet outil :

- La capture relève les propriétés que le code lit aujourd'hui. Si le moteur lit une propriété de plus, toutes les captures deviennent incomplètes et il faut repasser dans Figma.
- Une capture se prend sur un composant analysé, un par un. Un kit de plusieurs centaines de composants demande une capture du fichier entier.
- La capture du Button pèse 5,5 Mo. Trois kits complets dépasseraient plusieurs centaines de mégaoctets dans ce format.

## Les questions à trancher avant le plan

1. Licence. Un kit gratuit à l'usage peut interdire la redistribution d'un fichier dérivé. Si la capture ne peut pas entrer dans le dépôt public, le banc tourne seulement en local, hors du CI. La recherche des kits classe donc les candidats par licence du fichier Figma.
2. Complétude. Beaucoup de kits gratuits n'ouvrent qu'une partie des composants. Le choix vérifie que la version gratuite contient tout, et que les composants utilisent des variables, des propriétés de composant et l'auto layout, pas seulement des styles.
3. Format de capture. Deux options. Soit la capture relève toutes les propriétés que l'API Plugin expose sur chaque nœud, ce qui garde le corpus valable quand le moteur évolue, au prix de la taille. Soit elle relève ce que le code lit, ce qui oblige à recapturer. La taille se traite par compression, et le stockage par le dépôt, le stockage des gros fichiers de Git ou un fichier publié à part.
4. Attentes. Écrire à la main le contrat attendu de chaque composant est impossible à cette échelle. La méthode proposée fige la sortie d'aujourd'hui comme référence, relit un échantillon pour y trouver les erreurs déjà présentes, puis fait relire chaque écart futur.
5. Place dans les tests. Un petit sous-ensemble peut tourner dans `npm test`. Le corpus entier tourne par une commande à part, comme `npm run stress:rejeu`.

## Questions au mainteneur
