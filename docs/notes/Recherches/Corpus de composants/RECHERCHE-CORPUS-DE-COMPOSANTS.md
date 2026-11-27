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

## Les kits candidats

Un chercheur a comparé onze kits. Les pages Figma Community lui ont répondu 403 : licences, dates et nombres viennent des pages des éditeurs, de leurs dépôts GitHub ou d'extraits de recherche, et chaque point reste à vérifier en ouvrant le fichier.

Figma publie par défaut un fichier gratuit de la Community sous licence Creative Commons Attribution 4.0 : copie, redistribution et adaptation permises, crédit obligatoire ([aide Figma](https://help.figma.com/hc/en-us/articles/360042296374-Figma-Community-copyright-and-licensing)). Un créateur peut ajouter sa propre licence. Une capture JSON entre donc probablement dans le dépôt public avec un crédit, si le fichier n'ajoute aucune clause.

| Kit | Gratuit et complet | Construction | Licence du fichier | Code des mêmes composants |
|---|---|---|---|---|
| Simple Design System (Figma) | « 400+ composants » annoncés | variables, primitives et compositions, icônes en composants, Code Connect ([dépôt](https://github.com/figma/sds)) | non indiquée, donc Creative Commons Attribution 4.0 par défaut | React, MIT |
| Material 3 (Google), v1.25 du 19 mai 2026 | gratuit, nombre inconnu | variables et styles mêlés, slots depuis la 1.25 | Creative Commons Attribution 4.0, d'après une source tierce | non vérifié |
| Carbon v11 (IBM) | gratuité non affirmée par IBM ([page](https://carbondesignsystem.com/designing/kits/figma/)) | tout en variables, 67 modes | non confirmée | Apache-2.0 |
| USWDS, bêta 0.3 de janvier 2025 | 42 composants ([dépôt](https://github.com/uswds/uswds-for-designers)) | variables sur tous les tokens | Creative Commons Attribution 4.0 annoncée | CC0 |
| Fluent 2 Web (Microsoft) | gratuit | variables, imbrication peu profonde | non indiquée, marque et icônes restreintes | non vérifié |

Écartés : Untitled UI, dont la version gratuite n'a ni variables ni propriétés de composant ([page](https://www.untitledui.com/free-figma-ui-kit)). Obra shadcn/ui gratuit, limité à 30 composants en clair. Primer et Atlassian, dont seule une partie est publique. Polaris, Ant Design, Radix et GOV.UK, sans kit officiel maintenu.

Le mainteneur a ouvert Simple Design System et Material 3, et retient Material 3, plus complet et plus précis. Material 3 mêle styles et variables, ce qui teste aussi la lecture d'un fichier qui ne déclare pas UCM. Simple Design System reste le second choix : il publie le code React des mêmes composants, ce qui servira à la parité.

À vérifier dans Figma, sur le fichier dupliqué :

- le panneau de licence du fichier, et toute clause ajoutée à la licence Creative Commons Attribution 4.0 ;
- le nombre de jeux de variants dans Assets, et l'absence de composant verrouillé ou réservé à une offre payante ;
- les collections et les modes du panneau Variables, et les styles de texte restants ;
- sur un composant, les propriétés booléennes, de texte et d'échange d'instance, et les slots.

## Questions au mainteneur
