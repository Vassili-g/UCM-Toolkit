/**
 * Ce que le sous-chemin `lecteurs` promet à un consommateur TypeScript.
 *
 * Les modules restent du JavaScript et le resteront : compiler des lecteurs
 * n'ajouterait rien qu'un consommateur puisse utiliser, et le TypeScript n'est
 * imposé à personne. Mais « ne pas imposer TypeScript » n'est pas « ne rien
 * dire à ceux qui en font », et le premier prix de ce silence était déjà payé :
 * le plugin de ce même dépôt avait recopié à la main deux signatures dans ses
 * tests. Chaque consommateur aurait écrit les siennes, et elles auraient
 * divergé — la maladie que la déduplication des références venait de soigner un
 * étage plus bas.
 *
 * Écrit à la main plutôt que dérivé du JSDoc : dériver imposerait une passe
 * `tsc` sur des `.mjs`, donc un build là où la décision est justement de n'en
 * avoir aucun pour ce sous-chemin.
 *
 * Bornes de lecture, à connaître avant de s'y fier. Un contrat est typé
 * `unknown` là où le lecteur accepte n'importe quoi — c'est le contrat de ces
 * fonctions, elles ne lèvent pas sur une entrée malformée, elles la jugent.
 * Là où une structure de retour est riche et non figée, elle est décrite au
 * niveau où elle est stable, pas au-delà : une déclaration trop précise
 * mentirait à la première évolution, et une déclaration qui ment est pire que
 * pas de déclaration.
 */

declare module "@ucm-kit/core/lecteurs" {
  // ─── Version ──────────────────────────────────────────────────────────────

  /** Version de contrat la plus ancienne que ce paquet accepte. */
  export const VERSION_CONTRAT_MINIMALE: string;

  /** Version de contrat la plus récente que ce paquet accepte. */
  export const VERSION_CONTRAT_MAXIMALE: string;

  /**
   * Le SENS d'un écart de version, jamais un simple booléen.
   *
   * `ancien` : le contrat précède des champs dont le code dépend ; un réexport
   * depuis Figma le corrige, et le geste appartient au designer.
   * `recent` : le contrat vient d'un plugin en avance ; aucun réexport n'y
   * changera rien, c'est le repository qui doit monter de version.
   */
  export function verdictDeVersion(
    version: unknown,
    bornes?: { minimum?: string; maximum?: string },
  ): "ok" | "ancien" | "recent";

  // ─── Forme d'un contrat ───────────────────────────────────────────────────

  /**
   * Les chemins des champs absents ou mal formés, `[]` si le contrat tient.
   * Ne lève jamais : une entrée qui n'est pas un objet est un contrat invalide,
   * pas une erreur de programmation.
   */
  export function champsInvalidesDuContrat(contrat: unknown): string[];

  /**
   * Ce que le schéma ne peut pas juger : composition, doublons et collisions
   * d'identifiant sur un ENSEMBLE de contrats co-localisés.
   *
   * Rend les erreurs par chemin de fichier — un contrat sans erreur y figure
   * avec une liste vide, ce qui distingue « examiné et sain » de « absent ».
   */
  export function validerGrapheDesContrats(
    documents: ReadonlyArray<{ chemin: string; contrat: unknown }>,
  ): Map<string, string[]>;

  /** Les adresses que les échantillons visent, vérifiées contre l'arbre publié. */
  export function validerAdressesDEchantillons(
    documents: ReadonlyArray<{ chemin: string; contrat: unknown }>,
    parNom: Map<string, unknown>,
    ajouter: (chemin: string, message: string) => void,
  ): void;

  /** Les chemins des `*.contract.json` d'un dossier, `node_modules` exclu. */
  export function trouverContrats(dossier: string): string[];

  /** L'identifiant d'artefact que porte un chemin de contrat. */
  export function identifiantDuContrat(cheminContrat: string): string;

  /** Le chemin où l'implémentation de ce contrat est censée se trouver. */
  export function cheminImplementation(cheminContrat: string, motif?: string): string;

  /**
   * Où en est l'implémentation de ce contrat : présente sous le nom exact du motif,
   * présente sous une autre casse (`autreCasse` donne le nom trouvé), ou absente.
   * `lister` rend les noms d'un dossier ; son défaut lit le disque. `racine`
   * résout un motif sans `{dir}` ; sans elle, le dossier courant le résout.
   */
  export function etatDeLImplementation(
    cheminContrat: string,
    options?: { motif?: string; lister?: (dossier: string) => readonly string[]; racine?: string },
  ): { presente: true } | { presente: false; autreCasse?: string };

  /** L'implémentation de ce contrat existe-t-elle, sous le nom exact du motif ? */
  export function implementationPresente(
    cheminContrat: string,
    options?: { motif?: string; lister?: (dossier: string) => readonly string[]; racine?: string },
  ): boolean;

  /**
   * Ouvre `ucm.config.json`. Sa grammaire vit dans `@ucm-kit/core/format`,
   * également accessible au plugin Figma.
   */

  /** Un JSON du repository, BOM de tête retiré ; lève comme readFileSync et JSON.parse. */
  export function lireJsonDuDepot(chemin: string): unknown;

  /** Lit la configuration d'un repository ; rend toujours une configuration complète. */
  export function lireConfiguration(racine: string): {
    configuration: {
      components: string;
      tokens: string;
      implementation: string;
      modes?: Record<string, string>;
      css?: { fontFamilyFallback?: string };
    };
    chemin: string | null;
    erreur: string | null;
  };

  // ─── Vue exacte d'un variant ──────────────────────────────────────────────

  /**
   * Résout les cinq renvois d'un variant et rend la vue exacte. Le contrat ne
   * publie que des renvois : sans cette résolution, lire un variant demande de
   * connaître les catalogues, et chaque consommateur les relirait à sa façon.
   */
  export function vueExacteDuVariant(contrat: unknown, variant: unknown): unknown;

  /** Les dépendances composées d'un variant, dans l'ordre de son arbre. */
  export function compositionsExactesDuVariant(contrat: unknown, variant: unknown): unknown[];

  /** La projection du variant de référence, publiée elle aussi par renvoi. */
  export function projectionDeReference(contrat: unknown): unknown;

  /** Le nom Figma d'un variant, tel que le contrat le conserve. */
  export function nomFigmaDuVariant(contrat: unknown, variant: unknown): string | undefined;

  /** Le `nodeId` que porte une liaison, ou `undefined` si elle n'en a pas. */
  export function nodeIdDeLiaison(contrat: unknown, placement: unknown): string | undefined;

  /** Les messages publiés dans `meta.diagnostics`, sans filtrer sur la sévérité. */
  export function messagesDExport(contrat: unknown): string[];

  // ─── Références de token ──────────────────────────────────────────────────

  /**
   * Le contrat privé de ce qui n'est pas normatif — `samples` et `meta`.
   * À appliquer AVANT `collecterReferences` sur un contrat entier : un texte de
   * maquette peut valoir « {montant.total} » sans nommer un token.
   */
  export function sansEchantillon<T>(contrat: T): T;

  /**
   * Toute référence de token contenue dans une valeur, à profondeur quelconque.
   * Ne connaît aucun schéma : un champ qui porterait demain une référence est
   * couvert sans toucher à cette fonction.
   */
  export function collecterReferences(valeur: unknown, trouvees?: Set<string>): Set<string>;

  /**
   * Les incohérences entre un text style et les types DTCG de ses références.
   * Une incohérence qui vient d'un mode porte aussi `feuille` et `mode`, et
   * `extension` quand elle vient d'une surcharge d'extension.
   */
  export function erreursTypesTypographiques(contrat: unknown, tokens: unknown): Array<{
    chemin: string;
    reference: string;
    attendu: string;
    recu: string;
    feuille?: string;
    mode?: string;
    extension?: string;
  }>;

  // ─── Le fichier de tokens DTCG ────────────────────────────────────────────

  /**
   * Indexe les feuilles d'un arbre DTCG par leur chemin pointé. Une feuille est
   * un nœud portant `$value` ; le `$type` rendu est le sien, ou celui du groupe
   * ancêtre le plus proche.
   */
  export function indexerTokensDtcg(
    tokens: unknown,
    chemin?: string[],
    index?: Map<string, unknown>,
    typeHerite?: string,
  ): Map<string, unknown>;

  /** Les chemins de chaque nom CSS, triés ; deux chemins pour un nom sont une collision. */
  export function nomsCssDesTokens(index: Map<string, unknown>): Map<string, string[]>;

  /** Un refus de la feuille CSS : un nom vide, un préfixe réservé ou plusieurs chemins au même nom. */
  export type RefusDeNomCss = {
    genre: "vide" | "prefixe-reserve" | "meme-nom";
    nom: string;
    chemins: string[];
  };

  /** Les refus que la feuille CSS oppose à ces chemins, dans l'ordre des noms ; chaque refus porte ses chemins triés. */
  export function refusDesNomsCss(chemins: Iterable<string>): RefusDeNomCss[];

  /** Le chemin que désigne une référence, ou `null` si la chaîne n'en désigne aucun. */
  export function cheminDeReference(reference: unknown): string | null;

  /** Les références qui ne désignent aucun token du fichier DTCG, triées. */
  export function referencesAbsentes(
    references: Iterable<string>,
    index: Map<string, unknown>,
  ): string[];

  // ─── Une valeur Figma face à un token publié ──────────────────────────────

  /**
   * Une valeur Figma ramenée à ce que l'exporteur en écrirait, sans dépendre
   * des objets de Figma. Une durée est en secondes, une courbe en quatre
   * points, ou `null` quand la valeur n'en a pas.
   */
  export type ValeurFigmaPortable =
    | {
        readonly nature: "couleur";
        readonly espace: "srgb" | "display-p3";
        readonly composantes: readonly [number, number, number];
        readonly alpha: number;
      }
    | { readonly nature: "nombre"; readonly nombre: number }
    | { readonly nature: "duree"; readonly secondes: number }
    | {
        readonly nature: "courbe";
        readonly points: readonly [number, number, number, number] | null;
      }
    | { readonly nature: "texte"; readonly texte: string }
    | { readonly nature: "booleen"; readonly booleen: boolean };

  /**
   * Pourquoi une comparaison n'a pas eu lieu.
   *
   * `forme-inconnue` : la valeur publiée n'a pas la forme que son `$type`
   * annonce, ou le `$type` est absent ou inconnu. `unite-relative` : `rem` ou
   * `em`, dont la taille en pixels dépend de la page. `unite-inconnue` : une
   * unité que ni l'exporteur ni DTCG n'écrit pour ce type. `espace-inconnu` :
   * un `colorSpace` autre que `srgb` et `display-p3`. `courbe-sans-points` : la
   * valeur Figma n'a pas de points de contrôle. `type-incompatible` : la valeur
   * Figma n'est pas de la nature que le `$type` annonce.
   */
  export type CauseNonComparable =
    | "forme-inconnue"
    | "unite-relative"
    | "unite-inconnue"
    | "espace-inconnu"
    | "courbe-sans-points"
    | "type-incompatible";

  /** Le verdict d'une comparaison : égal, différent, ou non comparable avec sa cause. */
  export type Comparaison =
    | { readonly etat: "egal" }
    | { readonly etat: "different" }
    | { readonly etat: "non-comparable"; readonly cause: CauseNonComparable };

  /**
   * Compare une valeur Figma à la valeur qu'un token publié porte, selon son
   * `$type`. Une entrée qu'aucune règle ne couvre rend `non-comparable`, jamais
   * `egal`. Les alias ne passent pas ici : seul l'appelant sait calculer le
   * chemin publié de leur cible.
   */
  export function comparerAuTokenPublie(
    source: ValeurFigmaPortable,
    type: string | undefined,
    publiee: unknown,
  ): Comparaison;

  // ─── Les axes de modes du fichier de tokens ───────────────────────────────

  /** Un axe tel qu'`axesDeTokens` le rend : ses feuilles suivent l'ordre du document. */
  export interface AxeLu {
    nom: string;
    modes: string[];
    defaut: string;
    extensions: Record<string, { parent: string }>;
    feuilles: string[];
  }

  /** Ce qui empêche un fichier d'être complet, nommé pour le développeur. */
  export interface ConstatDeModes {
    code: string;
    message: string;
    chemin?: string;
    axe?: string;
  }

  /** Un contexte : un mode par axe, les axes absents prenant leur défaut. */
  export type ContexteDeModes = Record<string, string> | Map<string, string>;

  /** Le nombre de cycles énumérés au-delà duquel `cyclesActifs` s'arrête. */
  export const BORNE_DES_CYCLES: number;

  /** L'état des modes d'un document, ses axes et ce qui l'empêche d'être complet. Ne lève jamais. */
  export function axesDeTokens(document: unknown): {
    etat: "sans-modes" | "anterieur" | "incoherent" | "axe-ecarte" | "complet";
    axes: AxeLu[];
    constats: ConstatDeModes[];
  };

  /** La valeur d'une feuille dans un contexte, alias conservés ; `undefined` si rien ne la désigne. */
  export function valeurDansLeContexte(
    document: unknown,
    chemin: string,
    contexte?: ContexteDeModes,
  ): unknown;

  /**
   * Les axes et leurs axes d'extension, chacun juste après son parent. Un axe
   * d'extension a pour contextes `base` puis les extensions, et nomme son axe
   * dans `parent`.
   */
  export function contextesDesAxes(
    document: unknown,
    axes: readonly AxeLu[],
  ): Array<AxeLu & { parent?: string }>;

  /** Pour chaque feuille atteinte, les axes dont sa valeur dépend. */
  export function conesDesAxes(document: unknown, axes: readonly AxeLu[]): Map<string, Set<string>>;

  /**
   * Les axes qui touchent un contrat, composition transitive comprise. Tant que
   * `manquantes` n'est pas vide, la réponse ne conclut pas.
   */
  export function axesDuContrat(
    contrat: unknown,
    contratsParNom: Map<string, unknown>,
    cones: Map<string, Set<string>>,
  ): { axes: string[]; croisements: Array<[string, string]>; manquantes: unknown[] };

  /**
   * Le défaut, un contexte par axe touchant, un par couple croisé : au plus
   * `1 + A + C`. Les axes viennent de `contextesDesAxes`, axes d'extension compris.
   */
  export function contextesDeVerification(
    axesTouches: ReadonlyArray<Pick<AxeLu, "nom" | "modes" | "defaut">>,
    croisements?: ReadonlyArray<readonly [string, string]>,
  ): Array<Record<string, string>>;

  /** Les cycles d'alias qu'au moins un contexte réalise ; `interrompue` si la borne est atteinte. */
  export function cyclesActifs(
    document: unknown,
    axes: readonly AxeLu[],
  ): { cycles: string[][]; interrompue: boolean };

  // ─── Les caractéristiques d'un contrat ────────────────────────────────────

  /** Les caractéristiques, dans l'ordre où une aide les imprime. */
  export const CARACTERISTIQUES: ReadonlyArray<{ id: string; relevee: string }>;

  /**
   * La caractéristique que relève chaque couple (définition, propriété) du
   * schéma : un identifiant, une liste que le rôle d'une clé tranche, ou une
   * table par valeur d'énumération.
   */
  export const CHAMPS: Readonly<Record<string, string | readonly string[] | { parValeur: Record<string, string> }>>;

  /** Les couples du schéma qu'aucune aide ne couvre, et la raison de chacun. */
  export const SANS_AIDE: Readonly<Record<string, string>>;

  /** Les caractéristiques d'un contrat, dans l'ordre de `CARACTERISTIQUES`. */
  export function caracteristiquesDuContrat(
    contrat: unknown,
    contratsParNom?: Map<string, unknown>,
    cones?: Map<string, Set<string>>,
  ): string[];

  // ─── Le schéma publié ─────────────────────────────────────────────────────

  /** Chemin résolu du JSON Schema commité, pour un éditeur ou un test d'accord. */
  export const CHEMIN_DU_SCHEMA: string;

  /** Le schéma, analysé. */
  export function lireLeSchema(): Record<string, unknown>;

  /** La version de contrat que le schéma vendu décrit. */
  export function versionDuSchema(): string;

  /** Un valideur Ajv prêt à l'emploi, compilé sur le schéma publié. */
  export function valideurDeSchema(): (contrat: unknown) => boolean;

  // ─── Diagnostics lus par un humain ────────────────────────────────────────

  /** Titre de la section des avertissements d'export. */
  export const TITRE_AVERTISSEMENTS: string;

  /** Les avertissements d'un contrat sur lesquels le designer peut agir. */
  export function avertissementsCorrigeables(contrat: unknown): string[];

  /** Lignes markdown des avertissements d'export, ou tableau vide. */
  export function sectionAvertissementsExport(
    bilans: ReadonlyArray<unknown>,
    options?: { bloquant?: boolean },
  ): string[];

  /** Le résumé terminal des avertissements. */
  export function resumeTerminalAvertissements(bilans: ReadonlyArray<unknown>): string | null;

  /** « 1 contrat » / « 3 contrats » : l'accord, écrit une seule fois. */
  export function libelleNombre(nombre: number, singulier: string, pluriel?: string): string;

  /** Le rendu markdown d'un diagnostic destiné à un humain, ligne par ligne. */
  export function rendreDiagnostic(diagnostic: {
    severity?: string;
    title?: string;
    count?: number;
    itemSingular?: string;
    itemPlural?: string;
    summary?: string;
    items?: ReadonlyArray<string>;
    detailsTitle?: string;
    details?: ReadonlyArray<string>;
    action?: string;
    status?: string;
    level?: number;
  }): string[];

  // ─── Le rapport, et le contrôle qui le produit ────────────────────────────

  /**
   * Ce qu'un adaptateur doit savoir faire pour qu'une stack entre dans le
   * contrôle. Les trois fonctions sont décrites au niveau où elles sont
   * stables : le RELEVÉ qui circule entre elles n'appartient qu'à l'adaptateur,
   * qui le produit et le relit lui-même.
   */
  export interface AdaptateurDImplementation {
    /**
     * Relève d'un coup ce que l'adaptateur sait lire des implémentations citées.
     * `identifiants` donne l'identifiant du contrat de chaque implémentation.
     */
    lireApiPublique(
      implementations: readonly string[],
      racine: string,
      identifiants?: ReadonlyMap<string, string>,
    ): Map<string, unknown>;
    /** Le nom que l'API publique de cette implémentation devrait porter, d'après l'identifiant de son contrat. */
    nomInterfaceAttendue(implementation: string, identifiant?: string): string | null;
    /** Le dossier des gabarits qu'`ucm init` copie dans `.ucm/gabarits/` ; absent quand l'adaptateur n'en publie aucun. */
    cheminGabarits?: string;
    /** Compare un contrat au relevé, et rend un écart de parité. */
    ecartsDeParite(
      contrat: unknown,
      releve: unknown,
      nomInterface: string | null,
      options: { presente: boolean; chemin: string },
    ): EcartsDeParite;
    /**
     * Le lecteur du code des composants, que le contrôle appelle pour juger les
     * valeurs en dur et les tokens inconnus. Absent d'un adaptateur ancien : le
     * code n'est alors pas vérifié (`adaptateur-ancien`).
     */
    lecteurDuCode?: LecteurDuCode;
  }

  /** Chaîne relevée : `debut` et `fin` encadrent le littéral, guillemets compris ; un morceau de gabarit n'a que son texte. */
  export interface ChaineDuCode {
    texte: string;
    debut: number;
    fin: number;
    /** Attribut JSX qui porte la chaîne, `null` hors d'un attribut. */
    attribut: string | null;
  }

  /**
   * Déclaration de style. `debut` et `fin` encadrent la valeur littérale,
   * guillemets compris, ou toute la propriété quand la valeur est une expression.
   */
  export interface DeclarationDuCode {
    /** Nom CSS (`background-color`) ; `null` pour une décomposition ou une clé calculée. */
    propriete: string | null;
    /**
     * Valeur littérale ; `null` pour une expression. Un nombre reçoit `px` (sauf `0` et les propriétés
     * sans unité de React) dans un objet de style, et garde sa forme écrite dans un autre objet.
     */
    valeur: string | null;
    debut: number;
    fin: number;
    contexte: "style" | "objet";
    /** `true` quand la valeur est un nombre littéral, pour distinguer `32` de `"32"`. */
    nombre?: true;
    /** Dans un objet qui n'est pas un style, avec `nombre`, la valeur que l'adaptateur aurait rendue en contexte `style` (`15` donne `"15px"` pour `fontSize`, `"1.5"` pour `lineHeight`). */
    valeurEnStyle?: string;
  }

  export interface DirectiveDuCode {
    texte: string;
    debut: number;
    fin: number;
  }

  export interface LectureDuCode {
    complete: boolean;
    erreurs: number;
    /** Présente quand l'extension n'est pas lue. */
    extension?: string;
  }

  /** Ce qu'un fichier écrit : chaînes, déclarations de style, variables `--nom` qu'il déclare et commentaires qui nomment une règle. */
  export interface UsagesDuCode {
    chaines: ChaineDuCode[];
    declarations: DeclarationDuCode[];
    /** Clés `--nom` des objets de style. */
    variables: string[];
    directives: DirectiveDuCode[];
    lecture: LectureDuCode;
  }

  export interface FichiersDuComposant {
    /** Chemins absolus : l'implémentation, puis ses imports relatifs triés. */
    fichiers: string[];
    lecture: LectureDuCode;
  }

  export interface LecteurDuCode {
    releverUsages(texte: string, nomDuFichier: string): UsagesDuCode;
    fichiersDuComposant(implementation: string): FichiersDuComposant;
    extensions: readonly string[];
  }

  /** La règle ESLint qui affiche un constat : une par valeur. */
  export type RegleDuControle = "token-inconnu" | "valeur-en-dur";

  /** Le code d'un constat du code d'un composant. */
  export type CodeDeConstat =
    | "token-inconnu"
    | "repli-en-dur"
    | "nom-css-ambigu"
    | "valeur-en-dur"
    | "non-analyse"
    | "desactivation-interdite";

  /** Le code d'une limite : ce que le contrôle ne peut pas juger. */
  export type CodeDeLimite =
    | "configuration-absente"
    | "configuration-invalide"
    | "contrats-introuvables"
    | "fichier-sans-chemin"
    | "tokens-illisibles"
    | "tokens-format-inconnu"
    | "contrat-illisible"
    | "contrat-ancien"
    | "contrat-recent"
    | "contrats-multiples"
    | "fichier-partage"
    | "lecture-incomplete"
    | "derogations-illisibles"
    | "sans-adaptateur";

  /** Ce que tout constat porte, quel que soit son code. */
  interface ConstatCommun {
    regle: RegleDuControle;
    /** `ecart` bloque, `limite` et `non-analyse` informent. */
    niveau: "ecart" | "limite" | "non-analyse";
    composant: string;
    /** Décalage du premier caractère dans le texte jugé, sans BOM ; guillemets compris pour une chaîne. */
    debut: number;
    /** Décalage qui suit le dernier caractère. */
    fin: number;
    /** Le message complet ; il se termine par la commande de dérogation quand le constat est dérogeable et non couvert. */
    message: string;
    /** Les coordonnées de la dérogation, pour un code dérogeable. */
    coordonnees?: { fichier: string; reference?: string; valeur?: string };
    /** `npx @ucm-kit/cli deroger …` complète, motif à remplir, pour un constat dérogeable non couvert. */
    commande?: string;
    /** Présent quand une dérogation valide couvre le constat : il ne s'affiche jamais en erreur. */
    deroge?: { motif: string; par: string };
  }

  /** Un constat ; `faits` a la forme de son `code`. */
  export type Constat =
    | (ConstatCommun & { code: "token-inconnu"; faits: { reference: string } | { variable: string } })
    | (ConstatCommun & { code: "repli-en-dur"; faits: { variable: string; repli: string } })
    | (ConstatCommun & { code: "nom-css-ambigu"; faits: { variable: string; chemins: string[] } })
    | (ConstatCommun & {
      code: "valeur-en-dur";
      faits: { valeur: string; parties: string[]; propriete?: string; familles?: string[] };
    })
    | (ConstatCommun & {
      code: "non-analyse";
      faits: { forme: "gabarit" } | { forme: "decomposition" } | { forme: "expression"; propriete: string };
    })
    | (ConstatCommun & { code: "desactivation-interdite"; faits: { regle: RegleDuControle; directive: string } });

  /** Ce que le contrôle n'a pas pu juger ; `faits` a la forme de son `code`. */
  export type Limite =
    | { code: "configuration-absente" | "fichier-sans-chemin"; composant: null; message: string; faits: Record<string, never> }
    | { code: "configuration-invalide"; composant: null; message: string; faits: { erreur: string } }
    | { code: "contrats-introuvables"; composant: null; message: string; faits: { dossier: string } }
    | { code: "tokens-illisibles" | "tokens-format-inconnu"; composant: null; message: string; faits: { chemin: string } }
    | { code: "contrat-illisible"; composant: string; message: string; faits: { composant: string } }
    | { code: "contrat-ancien" | "contrat-recent"; composant: string; message: string; faits: { composant: string; version: string } }
    | { code: "contrats-multiples" | "fichier-partage"; composant: null; message: string; faits: { composants: string[] } }
    | { code: "lecture-incomplete"; composant: null; message: string; faits: { erreurs: number } }
    | { code: "derogations-illisibles"; composant: null; message: string; faits: { erreurs: string[] } }
    | { code: "sans-adaptateur"; composant: string; message: string; faits: { composant: string; extension: string } };

  /** Le jugement d'un fichier. `composants` vide : aucun contrat n'inclut ce fichier, rien à afficher. */
  export interface ControleDuFichier {
    /** La racine du repository, `null` sans `ucm.config.json`. */
    racine: string | null;
    /** Le fichier relatif à la racine, avec `/`, ou `null`. */
    fichier: string | null;
    composants: string[];
    limites: Limite[];
    /** Dans l'ordre du texte. */
    constats: Constat[];
  }

  /**
   * Juge le code d'un fichier : lit `ucm.config.json`, les contrats, `tokens.json`
   * et `.ucm/derogations.json` sur le disque à chaque appel, puis compare le
   * relevé du lecteur du code à ce que le contrat publie. Ne lève jamais : une
   * panne de lecture devient une limite.
   *
   * `texte` remplace le fichier du disque, pour juger un texte non enregistré.
   * `racine` évite de remonter jusqu'au premier `ucm.config.json`. Sans
   * `lecteur`, le fichier n'est pas lu (`sans-adaptateur`).
   */
  export function preparerControle(
    fichier: string,
    options?: { texte?: string; lecteur?: LecteurDuCode; racine?: string },
  ): ControleDuFichier;

  /**
   * Un écart de parité, tel que le rapport le lit.
   *
   * `implementationAbsente` et `implementationNonLue` ne sont pas des écarts :
   * le fichier n'est pas là — état d'avancement légitime —, ou il est là et
   * personne ne sait le lire. Aucun des deux n'appelle un geste correctif.
   */
  export interface EcartsDeParite {
    implementationAbsente: boolean;
    implementationNonLue: string | null;
    interfaceAbsente: string | null;
    fonctionAbsente: string | null;
    manquantes: string[];
    typesIncorrects: Array<{ prop: string; attendu: string; recu: string }>;
    /**
     * Types que l'adaptateur n'a pas su résoudre : une limite de lecture, pas
     * un écart. Absent d'un bilan écrit avant ce champ.
     */
    typesNonAnalyses?: Array<{ prop: string; attendu: string; recu: string }>;
    /**
     * Valeurs qu'un contrat publie et que l'union déclarée par le code n'offre
     * pas. Vide quand le type est élargi : sans littéral, aucun verdict.
     */
    valeursNonImplementees: Array<{ prop: string; valeurs: string[] }>;
    booleensNonUtilises: string[];
    /** Props enum déclarées et jamais lues ; `valeurs` sert au message. */
    enumsSansEffet: Array<{ prop: string; valeurs: string[] }>;
    compositionsIncorrectes: Array<{ component: string; attendu: number; rendu: number }>;
  }

  /**
   * Un test en échec, tel que le rapport le lit.
   *
   * `composant` et `assertion` ne se déduisent d'aucun chemin : la convention
   * qui relie un fichier de test à un composant, et les erreurs qui distinguent
   * une assertion d'une interruption, appartiennent à un lanceur donc à un
   * adaptateur.
   */
  export interface EchecDeTest {
    fichier: string | null;
    composant: string | null;
    assertion: boolean;
    test: string;
    nomErreur?: string;
    erreur?: string;
  }

  /** Le verdict d'un contrôle : ce qu'il a vu, ce qu'il en écrit, et s'il refuse. */
  export interface VerdictDeControle {
    bilans: unknown[];
    fautifs: unknown[];
    rapport: string;
    terminal: Array<{ flux: "log" | "warn" | "error"; texte: string }>;
    bloquant: boolean;
    /** Le verdict de la demande, par composant ; absent quand le contrôle s'arrête avant de juger. */
    verdict?: VerdictDeLaDemande;
    /** Une copie sans historique complet n'est pas jugée : code de sortie 2 et geste. */
    erreurDInvocation?: { code: 2; geste: string } | null;
  }

  /**
   * Contrôle un repository et rend son verdict — sans rien écrire nulle part.
   *
   * Il n'ouvre aucun fichier de sortie, ne lit aucune variable d'environnement
   * et ne sort d'aucun processus : où va le rapport appartient à l'outil qui
   * appelle.
   */
  export function controlerRepository(
    racine: string,
    options?: {
      configuration?: { components: string; tokens: string; implementation: string };
      adaptateur?: AdaptateurDImplementation;
      echecsDeTests?: { echoue: boolean; echecs: readonly EchecDeTest[] };
      cheminsModifies?: string;
      tokensModifies?: boolean;
      /**
       * Ce que la mesure de Git donne : le rang du contrat et du code de chaque
       * composant (0 : modifié par la demande), le rang des tokens, et la date ISO
       * du changement du contrat. Défaut : 0 pour un fichier de `cheminsModifies`,
       * 1 pour les autres, donc aucun retard ; `null` : inconnu, aucun retard.
       */
      rangs?: {
        tokens?: number | null;
        composants?: Record<string, { contrat?: number | null; code?: number | null; depuis?: string }>;
      };
      /** Défaut `"sans-adaptateur"` : un fichier non lu avertit sans bloquer. */
      adaptateurAttendu?: "present" | "absent" | "casse" | "sans-adaptateur";
      /** Défaut `"complet"` ; `"superficiel"` refuse de juger. */
      historique?: "complet" | "superficiel" | "aucun";
      /** La date de l'âge d'un retard ; défaut : l'heure courante. */
      maintenant?: Date;
    },
  ): VerdictDeControle;

  /**
   * Le noyau seul : il dit où une implémentation devrait être et si elle y est,
   * et ne prétend jamais avoir lu du code.
   */
  export const ADAPTATEUR_VIDE: AdaptateurDImplementation;

  /** Ce bilan refuse-t-il la fusion ? Vrai du CONTRAT, jamais du code ni des tests. */
  export function bilanEstBloquant(bilan: unknown): boolean;

  /** L'en-tête du rapport rouge, et rien d'autre que ce qui est vrai. */
  export function enteteDuVerdict(
    fautifs: ReadonlyArray<unknown> | number,
    avecAvertissements?: boolean,
  ): string[];

  /** Un état de composant ; `etat` est le premier de `constats`, du plus grave au plus léger. */
  export type EtatDeComposant =
    | "contrat-invalide"
    | "tokens-absents"
    | "ecart"
    | "code-non-verifie"
    | "en-retard-sur-son-contrat"
    | "en-retard-sur-les-tokens"
    | "deroge-a-valider"
    | "pas-encore-d-implementation"
    | "conforme";

  export const ETATS_DE_COMPOSANT: readonly EtatDeComposant[];

  /** Ce que dit chaque état : `phrase` finit la ligne du terminal, `raison` explique l'état dans l'inventaire. */
  export const TEXTES_DES_ETATS: Readonly<Record<EtatDeComposant, { readonly phrase: string; readonly raison: string }>>;

  /** Un genre d'écart du code, tel que le juge le nomme. `desactivation-interdite` ne se déroge pas. */
  export type GenreDEcartDuCode = "valeur-en-dur" | "token-inconnu" | "repli-en-dur" | "desactivation-interdite";

  /** Un genre que `.ucm/derogations.json` peut couvrir. */
  export type GenreDeDerogation = GenreDEcartDeParite | Exclude<GenreDEcartDuCode, "desactivation-interdite">;

  /**
   * Un constat de niveau `ecart` du juge du code, sous la forme d'un écart de
   * parité. `coordonnees` vaut `{}` et `derogeable` `false` pour
   * `desactivation-interdite`, que rien ne couvre.
   */
  export interface EcartIdentifieDuCode {
    genre: GenreDEcartDuCode;
    coordonnees: Record<string, string>;
    derogeable: boolean;
    niveau: "ecart";
    /** Le message du constat, commande de dérogation comprise quand l'écart se déroge. */
    texte: string;
    /** `token-inconnu` ou `valeur-en-dur`, la règle qui affiche le constat. */
    regle: string;
    /** Relatif à la racine du repository, avec `/`. */
    fichier: string;
    /** À partir de 1. */
    ligne: number;
  }

  /** Ce que le contrôle a lu du code d'un composant ; `bilan.code`. */
  export interface CodeDuComposant {
    /** Les fichiers du composant, relatifs à la racine, avec `/`. */
    fichiers: string[];
    /** Les constats de niveau `ecart`, y compris ceux qu'une dérogation couvre ; le verdict les répartit. */
    ecarts: EcartIdentifieDuCode[];
    /** Le nombre d'usages que le code calcule et que le juge ne suit pas. */
    nonAnalyses: number;
    /** Les limites du juge pour ce composant, et ses constats `nom-css-ambigu`. */
    limites: Array<{ code: string; composant: string | null; message: string; faits: Record<string, unknown>; fichier?: string | null }>;
    /** `adaptateur-ancien` : l'adaptateur n'a pas de `lecteurDuCode`. `lecture-incomplete` : un fichier a une erreur de syntaxe. */
    lecture: "adaptateur-ancien" | "lecture-incomplete" | null;
  }

  /** Ce que la demande modifie : tokens seuls, contrats et tokens, code, ou rien (contrôle sans base). */
  export type GenreDeDemande = "tokens-seuls" | "contrats-et-tokens" | "code" | "sans-base";

  /** Un composant à juger : son bilan, son export et le rang de ses deux fichiers (0 : modifié par la demande ou non enregistré ; `null` : inconnu). */
  export interface ComposantAJuger {
    id: string;
    bilan: unknown;
    /** `meta.exportedAt` du contrat. */
    exportedAt?: string;
    rangContrat?: number | null;
    rangCode?: number | null;
  }

  export interface VerdictDeComposant {
    id: string;
    etat: EtatDeComposant;
    constats: EtatDeComposant[];
    /** Vrai si la demande refuse ce composant ; un état grave ne bloque pas toute demande. */
    bloquant: boolean;
    /** La cause de chaque blocage ; `bloquant` en est la disjonction. */
    bloquantPar: { contrat: boolean; tokens: boolean; parite: boolean; code: boolean };
    /** Pourquoi le code n'a pas été comparé ou lu, `null` s'il l'a été. */
    lecture: "fichier-non-lu" | "adaptateur-absent" | "adaptateur-casse" | "sans-adaptateur" | "adaptateur-ancien" | "lecture-incomplete" | null;
    /** Les écarts qu'aucune dérogation ne couvre, de parité puis du code. */
    ecarts: Array<EcartIdentifieDeParite | EcartIdentifieDuCode>;
    /** Ceux de `ecarts` que `tokens.json`, plus récent que le code, met en retard sur les tokens. */
    ecartsEnRetardSurLesTokens: EcartIdentifieDuCode[];
    /** Le nombre d'usages que le code calcule et que le juge ne suit pas. */
    nonAnalyses: number;
    avertissements: EcartIdentifieDeParite[];
    derogations: {
      couvertes: { ecart: EcartIdentifieDeParite | EcartIdentifieDuCode; derogation: Derogation }[];
      tombees: Derogation[];
      sansObjet: Derogation[];
    };
  }

  export interface VerdictDeLaDemande {
    demande: GenreDeDemande;
    bloquant: boolean;
    composants: VerdictDeComposant[];
    erreursDeDerogations: string[];
    /** Les erreurs du fichier des dérogations refusent une demande qui répond du code. */
    bloquantParLesDerogations: boolean;
    tokensIllisibles: boolean;
    /** Une copie sans historique complet n'est pas jugée : code de sortie 2 et geste. */
    erreurDInvocation: { code: 2; geste: string } | null;
  }

  /**
   * Le verdict de `ucm check` : l'état de chaque composant et `bloquant`, par la
   * règle du dernier modifié. Pure ; les rangs, les dérogations et l'adaptateur
   * attendu sont des entrées.
   */
  export function verdictDeLaDemande(entree: {
    demande: GenreDeDemande;
    composants?: readonly ComposantAJuger[];
    rangTokens?: number | null;
    tokensIllisibles?: boolean;
    derogations?: { derogations: readonly Derogation[]; erreurs: readonly string[] };
    adaptateurAttendu?: "present" | "absent" | "casse" | "sans-adaptateur";
    historique?: "complet" | "superficiel" | "aucun";
  }): VerdictDeLaDemande;

  /** Le genre d'une demande d'après les fichiers qu'elle modifie (`undefined` : sans base). */
  export function genreDeLaDemande(
    cheminsModifies: string | undefined,
    options?: { cheminTokens?: string; tokensModifies?: boolean },
  ): GenreDeDemande;

  /**
   * Ce que la demande de fusion touche : les états informatifs qu'elle peut
   * publier, et si elle concerne UCM. Sans liste, tous les bilans restent
   * visibles et la demande concerne UCM.
   */
  export function perimetreDeLaDemande<T extends { relatif: string }>(
    bilans: readonly T[],
    cheminsModifies: string | undefined,
    options?: { motif?: string; tokensModifies?: boolean; cheminTokens?: string },
  ): { bilans: readonly T[]; concerne: boolean; genre: GenreDeDemande };

  /** Le marqueur qui identifie le commentaire du rapport sur une demande de fusion. */
  export const MARQUEUR_RAPPORT: string;

  /** Le marqueur d'un rapport sans geste : il remplace un commentaire, il n'en crée jamais. */
  export const MARQUEUR_SANS_OBJET: string;

  /** Une note d'une demande de fusion, telle que l'appelant la normalise depuis sa forge. */
  export interface NoteDeDemande {
    id: string | number;
    /** Le login (GitHub) ou l'identifiant (GitLab), dans la forme que `compte` prendra. */
    auteur: string | number;
    corps: string;
    /** Vrai pour une note que la forge écrit elle-même. */
    systeme?: boolean;
  }

  /**
   * L'`id` de la plus récente note de `compte`, non système, qui commence par `MARQUEUR_RAPPORT` ; `null` s'il n'y en a
   * pas. `notes` est dans l'ordre de création, toutes pages lues.
   */
  export function rapportPrecedent(notes: readonly NoteDeDemande[], compte: string | number): string | number | null;

  /** Vrai quand `MARQUEUR_SANS_OBJET` figure dans les deux premières lignes du rapport. */
  export function rapportSansObjet(rapport: string): boolean;

  /** La section des références que la source de tokens ne porte pas. */
  export function sectionTokensManquants(
    entrees: ReadonlyArray<{ id?: string; fichier?: string; manquants: readonly string[] }>,
    options?: { bloquant?: boolean; tokensModifies?: boolean; sourceTokens?: string },
  ): string[];

  /** Le résumé terminal des références absentes, sous le verdict de la section correspondante. */
  export function resumeTerminalTokensManquants(
    entrees: ReadonlyArray<{ manquants: readonly string[] }>,
    sourceTokens: string,
    options?: { bloquant?: boolean },
  ): string | null;

  /** Ce que le diagnostic des contrastes juge : une couleur contre son fond. */
  export type NatureDeConstatDeContraste = "contraste";

  /** Pourquoi une couleur n'est pas vérifiée : Display P3, composante hors de [0, 1], ou plus de `PROFONDEUR_D_ALIAS` alias. */
  export type CauseDeCouleurNonVerifiee = "display-p3" | "hors-limites" | "alias-trop-longs";

  /** Une couleur que le diagnostic n'a pas pu mesurer, avec sa cause. */
  export interface CouleurNonVerifiee {
    nature: "non-verifiee";
    /** Le token de la couleur écartée, tel que le contrat le cite. */
    chemin: string;
    cause: CauseDeCouleurNonVerifiee;
  }

  /** Un contraste mesuré dans un contexte de modes ; `valeur` est un nombre pour un constat. */
  export interface MesureDeContraste {
    /** Le contexte, tel que le rapport le cite : « marque acme, thème dark ». */
    contexte: string;
    valeur: number | null;
  }

  /** Une couleur d'un contrat sous le seuil de son rôle contre son fond. */
  export interface ConstatDeContraste {
    nature: NatureDeConstatDeContraste;
    /** Les coordonnées du variant : « state=hover ». */
    variant: string;
    cle: string;
    role: string;
    reference: string;
    /** Ce que la couleur vise dans `tokens.json`, ou `null` quand rien n'est lu. */
    vise: string | null;
    /** La clé du fond contre lequel la couleur est mesurée. */
    fond: string;
    /** 4,5 pour un texte ou une icône, 3 pour un contour ou un anneau. */
    seuil: number;
    /** Les contextes où la couleur passe sous le seuil. */
    mesures: MesureDeContraste[];
  }

  /** Les couleurs d'un contrat sous le seuil contre leur fond, puis les couleurs non vérifiées ; `[]` sans fond jugeable. */
  export function constatsDesContrastes(contrat: unknown, document: unknown): Array<ConstatDeContraste | CouleurNonVerifiee>;

  /** La section du rapport, non bloquante ; `[]` sans écart. */
  export function sectionContrastes(bilans: ReadonlyArray<{ fichier: string; contrastes?: Array<ConstatDeContraste | CouleurNonVerifiee> }>): string[];

  /** Le rappel du terminal, ou `null` sans écart. */
  export function resumeTerminalContrastes(bilans: ReadonlyArray<{ contrastes?: Array<ConstatDeContraste | CouleurNonVerifiee> }>): string | null;

  /** Les constats d'un genre, avec leur nombre et au plus trois exemples déjà écrits. */
  export interface GroupeDArchitecture {
    /** Le genre que le contrôle écrit : `cran`, `scopes`, `alias-supprime`… */
    genre: string;
    nombre: number;
    exemples: string[];
  }

  /**
   * L'architecture d'un `tokens.json`. `non-ucm` : aucune collection n'a le nom
   * d'une collection UCM. `non-jugee` : un contrôle n'a pas su lire le fichier.
   * `jugee` : `total` vaut zéro quand l'architecture est conforme.
   */
  export type ArchitectureDesTokens =
    | { etat: "non-ucm"; collections: number }
    | { etat: "non-jugee" }
    | { etat: "jugee"; collections: number; total: number; groupes: GroupeDArchitecture[] };

  /** Passe les contrôles d'architecture d'UCM Architect sur un `tokens.json`. Ne lève jamais. */
  export function constatsDeLArchitecture(tokens: unknown): ArchitectureDesTokens;

  /** La section du rapport, non bloquante ; `[]` sans écart ni valeur à rendre. */
  export function sectionArchitecture(architecture: ArchitectureDesTokens | null): string[];

  /** Le rappel du terminal, ou `null` sans écart. */
  export function resumeTerminalArchitecture(architecture: ArchitectureDesTokens | null): string | null;

  /** Ce relevé de parité porte-t-il un écart ? */
  export function pariteEnEcart(ecarts: EcartsDeParite): boolean;

  export type GenreDEcartDeParite =
    | "interface-absente"
    | "fonction-introuvable"
    | "prop-absente"
    | "type-incorrect"
    | "valeur-non-implementee"
    | "booleen-sans-effet"
    | "enum-sans-effet"
    | "composition-non-rendue"
    | "composition-comptage";

  /** Un écart de parité identifié ; `coordonnees` désigne l'écart exact (`prop`, `valeur`, `composant`…). */
  export interface EcartIdentifieDeParite {
    genre: GenreDEcartDeParite;
    coordonnees: Record<string, string>;
    /** `false` pour une interface absente, une fonction introuvable et un avertissement de comptage. */
    derogeable: boolean;
    niveau: "ecart" | "avertissement";
    texte: string;
  }

  /** Les écarts d'un relevé de parité, un objet par écart. */
  export function ecartsIdentifiesDeParite(ecarts: EcartsDeParite): EcartIdentifieDeParite[];

  /** Idem, sur un bilan de contrat. */
  export function aUnEcartDeParite(bilan: unknown): boolean;

  /** La section des écarts contrat ↔ code, qui s'annonce en avertissement. */
  export function sectionEcartsDeParite(bilans: ReadonlyArray<unknown>): string[];

  /** Le rappel terminal des écarts contrat ↔ code. */
  export function resumeTerminalEcartsDeParite(bilans: ReadonlyArray<unknown>): string | null;

  /** Chemin fixe du fichier des dérogations, relatif à la racine du repository. */
  export const CHEMIN_DES_DEROGATIONS: ".ucm/derogations.json";

  /** Une dérogation : elle couvre un écart exact d'un composant, pour un export donné. */
  export interface Derogation {
    composant: string;
    ecart: { genre: GenreDeDerogation } & Record<string, string>;
    /** La valeur de `meta.exportedAt` du contrat à la pose. */
    export: string;
    motif: string;
    par: string;
  }

  /** Lit le texte de `.ucm/derogations.json` (`null` si absent) ; ne lève pas, chaque refus nomme l'entrée fautive. */
  export function lireDerogations(texte: string | null | undefined): { derogations: Derogation[]; erreurs: string[] };

  /** Lit `.ucm/derogations.json` à la racine ; absent, aucune dérogation ; illisible, une erreur. */
  export function lireDerogationsDuDepot(racine: string): { derogations: Derogation[]; erreurs: string[] };

  /** Répartit les écarts d'un composant selon les dérogations valides de l'export courant. */
  export function appliquerDerogations(
    derogations: readonly Derogation[],
    composant: string,
    exportedAt: string,
    ecarts: ReadonlyArray<EcartIdentifieDeParite | EcartIdentifieDuCode>,
  ): {
    couverts: { ecart: EcartIdentifieDeParite | EcartIdentifieDuCode; derogation: Derogation }[];
    restants: Array<EcartIdentifieDeParite | EcartIdentifieDuCode>;
    tombees: Derogation[];
    sansObjet: Derogation[];
  };

  /** Les coordonnées d'un genre dérogeable, dans l'ordre de la commande ; `null` pour un genre inconnu ou non dérogeable. */
  export function coordonneesDuGenre(genre: string): string[] | null;

  /** La commande `npx @ucm-kit/cli deroger` d'un écart, motif à remplir ; une coordonnée à signes de shell s'écrit entre apostrophes. */
  export function commandeDeDerogation(composant: string, genre: string, coordonnees: Readonly<Record<string, string>>): string;

  /**
   * Ajoute une entrée au texte de `.ucm/derogations.json` (`null` si absent).
   * `texte` vaut `null` quand l'entrée est refusée (doublon, fichier invalide) ;
   * `remplacee` dit qu'une entrée du même écart, d'un export ancien, a cédé la place.
   */
  export function ajouterDerogation(
    texte: string | null,
    entree: { composant: string; ecart: { genre: string } & Record<string, string>; export: string; motif: string; par: string },
  ): { texte: string | null; erreurs: string[]; remplacee: boolean };

  /** Sépare ce qui concerne un composant exporté de ce qui concerne l'outillage. */
  export function repartirEchecs(echecs: readonly EchecDeTest[]): {
    rendu: EchecDeTest[];
    testsComposants: EchecDeTest[];
    gardeFous: EchecDeTest[];
  };

  /**
   * La section du rapport pour les tests en échec.
   *
   * `avertissements` a TROIS états : une liste vide dit « l'export n'a rien
   * signalé », `null` dit « on n'a pas pu le vérifier ». Les confondre ferait
   * disculper Figma sans l'avoir consulté.
   */
  export function diagnosticEchecsDeTests(
    resultat: { echoue: boolean; echecs: readonly EchecDeTest[]; bloquant?: boolean },
    avertissements?: readonly string[] | null,
  ): string[];

  /** Même constat, pour le terminal du développeur. */
  export function resumeTerminalEchecsDeTests(
    resultat: { echoue: boolean; echecs: readonly EchecDeTest[]; bloquant?: boolean },
  ): string[];
}
