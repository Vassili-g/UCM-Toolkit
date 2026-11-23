/**
 * Les chemins et les noms qu'`ucm init` écrit chez le consommateur, et que la CLI relit.
 */

/** Le rapport de `ucm check --report`, réécrit à chaque exécution. */
export const RAPPORT_CI = "ci-report.md";

/** La feuille des tokens que `ucm tokens css` génère dans le repository. */
export const FEUILLE_DES_TOKENS = "src/generated/tokens.css";

export const WORKFLOW_GITHUB = ".github/workflows/ucm.yml";

/** Le fichier qu'`init` écrit pour GitLab, et que `.gitlab-ci.yml` inclut. */
export const CI_GITLAB = ".gitlab/ucm.gitlab-ci.yml";

export const CI_GITLAB_RACINE = ".gitlab-ci.yml";

/** Les deux relais qu'un agent découvre ; ils épinglent la version de la CLI. */
export const RELAIS_D_AGENT = [
  ".agents/skills/ucm-implementer/SKILL.md",
  ".claude/skills/ucm-implementer/SKILL.md",
];

/** Les fichiers écrits qui portent le numéro de la CLI. */
export const FICHIERS_EPINGLES = [...RELAIS_D_AGENT, WORKFLOW_GITHUB, CI_GITLAB];

/** L'artefact qui transmet le rapport au job qui le publie. */
export const ARTEFACT_DU_RAPPORT = "ucm-rapport";

/** Le job GitHub qui exécute le code du repository, sans droit d'écriture. */
export const JOB_CONTROLE_GITHUB = "contrats";

/** Le job GitLab qui exécute le contrôle. */
export const JOB_CONTROLE_GITLAB = "ucm";

/** Le job GitLab qui publie la note sur la merge request. */
export const JOB_NOTE_GITLAB = "ucm-rapport";

/** La variable CI/CD qui porte le jeton de la note GitLab. */
export const VARIABLE_DU_JETON_GITLAB = "UCM_GITLAB_TOKEN";

/** La version majeure de Node que les CI écrites installent. */
export const VERSION_DE_NODE = "22";

/** Le fichier de conventions : sa marche à suivre et son exemple, en commentaire que la lecture retire. */
export const CONVENTIONS = [
  "<!-- ucm : marche à suivre, retirée à la lecture.",
  "",
  "Le texte avant la première section décrit la stack, l'architecture et le",
  "gabarit ou le composant de référence du repository.",
  "",
  "Une section « ## <aide> » remplace l'écriture par défaut de cette aide, ou",
  "répond à un ancrage. `ucm aides` liste les aides ; `ucm aides <aide>",
  "--personnaliser` ajoute la section, à éditer.",
  "",
  "Une ligne « Contrôle : `commande` » ajoute la commande à la preuve de l'aide.",
  "",
  "« ecritures-par-defaut: non » en première ligne retire les écritures par",
  "défaut, pour un repository qui n'écrit pas de CSS.",
  "",
  "Exemple :",
  "",
  "Stack : React 19, styles en objets `style` typés `CSSProperties`. Un composant par dossier, tests à côté.",
  "Composant de référence : `src/components/Button/Button.tsx`.",
  "",
  "## contour-ring",
  "",
  "Classe `ring` de `src/styles/contours.module.css`.",
  "",
  "Contrôle : `npm run lint:css`",
  "-->",
  "",
].join("\n");
