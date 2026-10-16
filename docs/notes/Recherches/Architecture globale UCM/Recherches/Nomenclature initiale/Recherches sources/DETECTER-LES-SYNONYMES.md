# Détecter que deux termes d'un vocabulaire structuré nomment le même concept, sans liste de synonymes préalable

**Question** : quelles techniques établies détectent que deux segments de chemins de variables (`error`/`danger`, `contained`/`filled`, `text`/`foreground`, `big`/`large`) désignent le même concept quand la distance d'édition échoue, et à quel coût dans un plugin Figma sans serveur ?

**Statut de lecture.** Je distingue trois niveaux. [lu] : page ouverte et exploitable. [résumé] : je n'ai lu que le résultat de recherche ou un résumé produit par l'outil de lecture, pas le texte de l'article. [illisible] : PDF ouvert mais non décodé. Les PDF de Similarity Flooding, Cupid, COMA, Valentine, Yang & Tan, Howard et al., Tian et al. et Parciak et al. étaient illisibles. Aucun chiffre de précision de ces articles n'a donc été lu, sauf mention contraire.

## Tableau comparatif

| Technique | Principe | Données nécessaires | Coût navigateur | Précision connue | Référence |
|---|---|---|---|---|---|
| 1. Appariement de schémas (COMA, Cupid, Similarity Flooding) | Similarité de noms combinée à la structure : deux éléments sont proches si leurs voisins le sont | Arbre de noms, thésaurus optionnel | Faible à moyen (propagation itérative sur un graphe de paires). Coût mesuré : inconnu | Pas de chiffre lu | Rahm & Bernstein 2001 ; Melnik 2002 ; Madhavan 2001 |
| 2. Similarité distributionnelle | Deux termes présents dans les mêmes contextes sont liés | Corpus interne (chemins, frères, parents) | Faible : comptages et cosinus, sans modèle | Aucun chiffre lu (voir limites) | Yang & Tan 2012 ; Howard 2013 ; Tian 2014 |
| 3a. WordNet | Synsets et relations lexicales | Base de 117 659 synsets, 10 Mo compressée côté Princeton | Moyen (taille de la base) | Couverture faible sur le vocabulaire logiciel (voir ci-dessous) | Princeton |
| 3b. Vecteurs GloVe, fastText, Numberbatch réduits | Proximité cosinus de mots | Sous-ensemble de vocabulaire | Faible une fois réduit | Inconnu sur des mots d'UI | Pages des projets |
| 3c. Embeddings dans le navigateur | Modèle de phrases exécuté en WASM ou WebGPU | Modèle ONNX de 23 à 90 Mo | Élevé au premier chargement, ensuite modéré | Inconnu sur des mots d'UI | transformers.js, Xenova/all-MiniLM-L6-v2 |
| 4. LLM | Regroupement des termes en concepts | Liste de termes, accès réseau | Réseau et latence ; pas d'inférence locale | Narayan : F1 45,2 en appariement de schémas avec 3 exemples, 0,5 sans exemple | Narayan 2022 ; Parciak 2024 |
| 5. Signaux par valeur et par usage | Même cible d'alias, mêmes valeurs par mode, mêmes propriétés liées | Variables Figma (déjà disponibles) | Très faible | Aucune mesure publiée trouvée | Outils de lint (TokenOps, Mendly) |
| 6. Boucle humaine | Apprentissage actif, mémoire des refus | Verdicts de l'utilisateur | Très faible | Tolérance aux erreurs de l'utilisateur : 20 % (ER) à 30 % (LogMap) | dedupe, OAEI interactive |

## 1. Appariement de schémas

**Principe.** Rahm & Bernstein classent les méthodes en niveau schéma ou instance, niveau élément ou structure, fondées sur la langue ou sur les contraintes [lu : résumé de l'article sur [dbs.uni-leipzig.de](https://dbs.uni-leipzig.de/research/publications/a-survey-of-approaches-to-automatic-schema-matching)].

**Cupid.** Un coefficient linguistique `lsim` s'appuie sur un thésaurus (abréviations, acronymes, synonymes comme Bill/Invoice). Un coefficient structurel `ssim` évalue le contexte : deux feuilles sont proches si leurs ancêtres et leurs frères le sont, et deux nœuds internes si leurs ensembles de feuilles le sont. Le score est `wsim = w_struct·ssim + (1 − w_struct)·lsim`, avec deux seuils qui relèvent ou abaissent la similarité structurelle des feuilles [résumé : [recherche](https://dbs.uni-leipzig.de/research/publications/generic-schema-matching-with-cupid) ; PDF illisible].

**Similarity Flooding.** Les deux schémas deviennent des graphes étiquetés. Un calcul de point fixe sur le graphe des paires propage une part de la similarité de chaque paire vers les paires voisines, selon l'idée que deux éléments sont proches si leurs voisins le sont [résumé : [Stanford InfoLab](http://ilpubs.stanford.edu:8090/730/) ; le PDF était illisible].

**COMA et COMA++.** Combinaison de plusieurs matchers et réutilisation de correspondances antérieures. Les stratégies avec réutilisation ont amélioré la qualité de plus de 10 % par rapport aux meilleures stratégies sans réutilisation. COMA++ exécute d'abord un matcher rapide, puis réserve les matchers coûteux aux paires déjà proches [résumé : [ACM](https://dl.acm.org/doi/10.1145/1066157.1066283) ; évolution de COMA en PDF illisible].

**Application à `button/error/…` et `alert/error/…`.** Déduction de ma part, non documentée : ces méthodes supposent que les voisins sont déjà alignés ou que le nom est assez proche pour amorcer la propagation. Cupid et COMA ont un thésaurus ; Similarity Flooding part d'un appariement initial par chaînes (non lu, mémoire de l'article). Aucune de ces sources ne traite le cas `error`/`danger` sans thésaurus ni amorce.

**Données** : arbre de noms. **Faux positifs connus** : non lus. **Coût** : aucune mesure sur des arbres de la taille d'un design system.

## 2. Similarité distributionnelle appliquée au code

**Yang & Tan (MSR 2012, puis SWordNet, EMSE 2014).** Deux mots ou expressions utilisés dans le même contexte, dans les commentaires ou les identifiants, sont probablement liés. Les auteurs soutiennent que WordNet et les dictionnaires anglais sont insuffisants, car des mots liés en logiciel ne le sont pas en anglais, et inversement. L'abstract annonce une « précision raisonnable » sur neuf bases de code C et Java. Un algorithme de classement améliore la précision. Les paires communes à plusieurs projets de même fonction sont plus souvent correctes [résumé : [ACM](https://dl.acm.org/doi/10.1007/s10664-013-9264-x) et recherche ; PDF illisible]. **Aucun pourcentage de précision n'a été lu.**

**Howard et al. (MSR 2013).** Ils exploitent les commentaires de tête de méthode et les conventions des programmeurs, en se concentrant sur les verbes. Ils rapportent que les paires mises au jour absentes de WordNet sont jugées sémantiquement proches « dans de fortes proportions ». Le taux de 87 % d'accord entre annotateurs que j'ai rencontré concerne uniquement l'étape de classification des commentaires descriptifs [résumé, via diapositives citées par la recherche]. **Pas de pourcentage de précision des paires lu.**

**Tian, Lo & Lawall (WCRE 2014).** Co-occurrences pondérées dans Stack Overflow. Sur des mots propres au logiciel, 55 % des requêtes ne donnent aucun résultat avec WordNet. Pour les autres, le score moyen sur une échelle de Likert à 3 points est de 1,53 (WordNet) contre 2,31 (leur base). La base contient 5 636 534 paires [résumé : [ACM](https://dl.acm.org/doi/10.1145/2591062.2591071) et recherche].

**Données** : un corpus assez grand pour que les contextes se recoupent. Les trois travaux utilisent des commentaires, des identifiants de milliers de projets ou Stack Overflow ; **le seul vocabulaire d'un design system n'a pas été testé** dans ce que j'ai trouvé. **Faux positifs** : non lus. Les couples antonymes sont un risque connu de l'approche distributionnelle en général, mais je ne l'ai pas vu documenté dans ces papiers.

## 3. Ressources lexicales embarquables

**WordNet 3.0.** 155 287 chaînes uniques, 117 659 synsets, 206 941 couples mot-sens. Archive de données seule : `WNdb-3.0.tar.gz` à 10 Mo [résumé : [Princeton](https://wordnet.princeton.edu/documentation/wnstats7wn), liste de fichiers vue via la recherche]. Les pages de consultation WordNet ont répondu 403, donc je n'ai pas vérifié directement `error` et `danger`. Les listes de synsets obtenues par recherche (non ouvertes) donnent « mistake, error, fault » pour `error` et « risk, peril, danger » et « hazard, jeopardy, peril, risk, endangerment » pour `danger/risk` : **aucun synset commun** dans ce que j'ai vu. Le chemin hypernymique entre eux est **inconnu**.

**Vecteurs.**
- GloVe : 400 000 à 2,2 millions de mots, 50 à 300 dimensions, de 290 Mo à 2,03 Go à l'état brut [lu : [GloVe](https://nlp.stanford.edu/projects/glove/)].
- fastText : 300 dimensions, réductible à 100 par un script ; pas de taille de fichier sur la page [lu : [fastText](https://fasttext.cc/docs/en/crawl-vectors.html)].
- Numberbatch (ConceptNet) : 516 782 termes anglais, 300 dimensions, version « mini » sous 150 Mo en RAM ; il surpasse word2vec et GloVe sur des benchmarks de similarité de mots selon le README [lu : [GitHub](https://github.com/commonsense/conceptnet-numberbatch)].

Ordre de grandeur après réduction à un vocabulaire de 5 000 mots : **calcul de ma part, non sourcé**, 5 000 × 50 × 1 octet ≈ 250 Ko en entiers 8 bits, ≈ 1 Mo en flottants 32 bits. Qualité sur des mots courts d'UI : **inconnu**. Efstathiou et al. proposent un word2vec de 200 dimensions entraîné sur 15 Go de texte Stack Overflow, en réponse au constat que les modèles généralistes valent peu sur un domaine spécialisé [résumé : [recherche](https://2018.msrconf.org/details/msr-2018-Data-Showcase-Papers/6/Word-Embeddings-for-the-Software-Engineering-Domain)].

**Modèles dans le navigateur.** transformers.js s'exécute sans serveur via ONNX Runtime ; par défaut, le CPU via WASM, avec WebGPU expérimental ; la quantification `q8` est la valeur par défaut en WASM [lu : [doc](https://huggingface.co/docs/transformers.js/index)]. `Xenova/all-MiniLM-L6-v2` produit des vecteurs de 384 dimensions, sous licence Apache-2.0 ; les fichiers ONNX vont de 22,8 Mo (uint8) à 90,4 Mo (fp32), 23 Mo en int8/quantisé [lu : [fiche](https://huggingface.co/Xenova/all-MiniLM-L6-v2), [dossier onnx](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main/onnx)]. Compatibilité avec le bac à sable d'un plugin Figma, temps d'inférence, mise en cache du modèle : **inconnus**, à vérifier.

## 4. Modèle de langage

**Résultats.** Narayan et al. (VLDB 2022) : GPT-3 175B en appariement de schémas sur Synthea atteint F1 45,2 avec 3 exemples, contre 38,5 pour SMAT et 0,5 sans exemple [résumé via recherche ; [PDF VLDB](https://www.vldb.org/pvldb/vol16/p738-narayan.pdf) non décodé]. Parciak et al. (2024) travaillent à partir des seuls noms et descriptions : la qualité baisse quand le contexte du prompt est trop faible ou trop abondant, et les modèles récents sont plus décisifs [lu : [arXiv](https://arxiv.org/abs/2407.11852)].

**Dans Figma.** « Rename layers with AI » nomme un calque d'après son contenu, sa position et sa relation aux autres calques sélectionnés ; offre payante, droit d'édition requis ; ne touche que les calques à nom par défaut [lu : [aide Figma](https://help.figma.com/hc/en-us/articles/24004711129879-Rename-layers-with-AI)]. Sur la confidentialité, la recherche indique que les entrées et sorties de Figma AI sont du « contenu client » et que l'entraînement dépend d'un réglage d'équipe, désactivé par défaut en Organisation et Entreprise [résumé : [aide Figma](https://help.figma.com/hc/en-us/articles/17725942479127-Manage-AI-settings-and-content-training-for-your-team-or-organization), non ouverte]. Les plugins tiers (Figma Autoname, ai-naming) sont apparus dans les résultats mais leur fiche a répondu 403 : **je ne sais pas quel fournisseur ils appellent ni quelles données ils envoient**.

**Cadre technique pour un plugin.** `networkAccess.allowedDomains` limite les domaines joignables ; `["none"]` coupe tout accès ; un `*` impose un champ `reasoning` [lu : [manifeste](https://developers.figma.com/docs/plugins/manifest/)]. `figma.clientStorage` offre 5 Mo par plugin, stockés sur la machine de l'utilisateur, non synchronisés, et peut être effacé par un nettoyage du navigateur [lu : [clientStorage](https://developers.figma.com/docs/plugins/api/figma-clientStorage/)].

**Bornes du non-déterminisme.** Les articles lus mentionnent le besoin de vérification (Parciak : effort de vérification mesuré). Température nulle, cache du verdict : pratiques courantes, **non sourcées ici**.

## 5. Signaux par valeur et par usage

- **TokenOps** (plugin Figma) annonce la détection de valeurs dupliquées par mode, de boucles d'alias et de violations de nomenclature [résumé : listing de recherche, fiche 403].
- **Mendly 2.0** fusionne plusieurs variables en une cible et met à jour les références dans les calques et les alias [résumé : même source].
- **Article « Linting your design tokens »** : une règle « pas de valeurs dupliquées » recommande de transformer le doublon en alias ; elle est classée comme avertissement, au niveau standard, et cite `spacing.medium`/`spacing.md` et `color.feedback.errorDark`/`color.status.error-dark` [lu : [alwaystwisted.com](https://www.alwaystwisted.com/articles/linting-your-design-tokens)].
- **Penpot** : une demande ouverte réclame un audit signalant correspondances exactes, approchées et valeurs orphelines [résumé : [issue #11734](https://github.com/penpot/penpot/issues/11734), non ouverte].

Ces outils comparent des valeurs, pas des noms. Je n'ai trouvé **aucune mesure de précision** ni **aucun outil qui compare les propriétés de calque liées** pour déduire une équivalence de termes. Faux positif évident par déduction (non sourcé) : deux variables de même valeur par coïncidence (`0` en espacement et en rayon).

## 6. Boucle humaine

- **dedupe** : `uncertain_pairs()` fournit les paires les plus incertaines, `mark_pairs()` enregistre les réponses ; l'interface console propose oui, non, indécis [résumé : [documentation](https://docs.dedupe.io/_/downloads/en/latest/pdf/)].
- **Interaction en alignement d'ontologies** : la validation reste utile jusqu'à environ 20 % d'erreurs de l'utilisateur ; une simulation avec 30 % d'erreurs a donné les mêmes résultats que l'appariement non interactif (LogMap) [résumé : [Cambridge](https://www.cambridge.org/core/journals/knowledge-engineering-review/article/user-validation-in-ontology-alignment-functional-assessment-and-impact/F68413CC283DAC0F3DF36C46000EC593) et [Springer ISWC 2016](https://link.springer.com/chapter/10.1007/978-3-319-46523-4_13), via la recherche].
- **Mémoire des refus** : les auteurs de Cruz et al. (signature vectors) notent que les systèmes antérieurs ne retiennent pas les mappings validés ou réfutés, d'où un risque de boucle infinie ; ALIN rejette des mappings par motifs négatifs [résumé : [Cruz ICDE 2012](http://www.dit.unitn.it/~p2p/RelatedWork/Matching/Cruz_ICDE12_demo_697.pdf), non ouvert].

## Limites de cette recherche

1. Huit PDF clés étaient illisibles : aucun chiffre de précision de Yang & Tan, Howard et al., Cupid, COMA, Similarity Flooding ou Valentine n'a été lu.
2. Plusieurs affirmations reposent sur des résumés de recherche non vérifiés dans le texte (Springer, ACM, COMA, dedupe, OAEI, Figma AI, Mendly, TokenOps).
3. Aucune évaluation trouvée sur un vocabulaire de design system ; toute transposition est une déduction.
4. `error`/`danger` dans WordNet : non vérifié directement.
5. Qualité d'embeddings sur des mots courts d'UI et compatibilité des modèles avec le bac à sable Figma : non établies.
6. Les plugins Figma d'IA tiers n'ont pas pu être ouverts.

## Sources

Ouvertes et lues : [dbs.uni-leipzig.de (Rahm & Bernstein)](https://dbs.uni-leipzig.de/research/publications/a-survey-of-approaches-to-automatic-schema-matching) ; [arXiv 2407.11852](https://arxiv.org/abs/2407.11852) ; [arXiv 2010.07386](https://arxiv.org/abs/2010.07386) (abstract seul, sans résultat) ; [transformers.js](https://huggingface.co/docs/transformers.js/index) ; [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) et [dossier onnx](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main/onnx) ; [fastText](https://fasttext.cc/docs/en/crawl-vectors.html) ; [GloVe](https://nlp.stanford.edu/projects/glove/) ; [Numberbatch](https://github.com/commonsense/conceptnet-numberbatch) ; [aide Figma, rename layers](https://help.figma.com/hc/en-us/articles/24004711129879-Rename-layers-with-AI) ; [manifeste Figma](https://developers.figma.com/docs/plugins/manifest/) ; [clientStorage](https://developers.figma.com/docs/plugins/api/figma-clientStorage/) ; [Linting your design tokens](https://www.alwaystwisted.com/articles/linting-your-design-tokens).

Connues par résumé de recherche seulement : [Springer Rahm & Bernstein](https://link.springer.com/article/10.1007/s007780100057) ; [Similarity Flooding](http://ilpubs.stanford.edu:8090/730/) ; [Cupid](https://dbs.uni-leipzig.de/research/publications/generic-schema-matching-with-cupid) ; [COMA++](https://dl.acm.org/doi/10.1145/1066157.1066283) ; [SWordNet](https://dl.acm.org/doi/10.1007/s10664-013-9264-x) ; [SEWordSim](https://dl.acm.org/doi/10.1145/2591062.2591071) ; [Narayan](https://www.vldb.org/pvldb/vol16/p738-narayan.pdf) ; [Efstathiou](https://2018.msrconf.org/details/msr-2018-Data-Showcase-Papers/6/Word-Embeddings-for-the-Software-Engineering-Domain) ; [Princeton wnstats](https://wordnet.princeton.edu/documentation/wnstats7wn) ; [dedupe](https://docs.dedupe.io/_/downloads/en/latest/pdf/) ; [ISWC 2016](https://link.springer.com/chapter/10.1007/978-3-319-46523-4_13) ; [KER 2020](https://www.cambridge.org/core/journals/knowledge-engineering-review/article/user-validation-in-ontology-alignment-functional-assessment-and-impact/F68413CC283DAC0F3DF36C46000EC593) ; [Cruz ICDE 2012](http://www.dit.unitn.it/~p2p/RelatedWork/Matching/Cruz_ICDE12_demo_697.pdf) ; [Penpot #11734](https://github.com/penpot/penpot/issues/11734) ; [aide Figma, paramètres IA](https://help.figma.com/hc/en-us/articles/17725942479127-Manage-AI-settings-and-content-training-for-your-team-or-organization).
