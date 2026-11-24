/**
 * `ucm rapport-github` : publie le rapport de `ucm check` en commentaire d'une
 * pull request GitHub, et remplace au push suivant le commentaire qu'il a déjà
 * écrit.
 *
 * La commande remplace le script `gh api … --jq` que le workflow recopiait : un
 * script écrit dans le YAML du repository ne se teste pas, et il portait la
 * règle du commentaire à remplacer à côté de celle de GitLab.
 *
 * **Le jeton se lit dans `GITHUB_TOKEN`, jamais dans un argument**, et
 * n'apparaît dans aucune sortie. Sans jeton, la commande le dit et sort en 0 :
 * le rapport reste dans les artefacts du job, et le contrôle a déjà rendu son
 * verdict.
 *
 * **Seul le commentaire de ce compte portant le marqueur est remplacé.** Un
 * commentaire d'un autre compte qui recopie le marqueur reste intact : le
 * remplacer écraserait le texte d'un humain. Le jeton d'intégration d'une
 * Action répond 403 à `GET /user` : le compte est alors `github-actions[bot]`,
 * l'auteur des commentaires qu'il écrit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { MARQUEUR_RAPPORT, rapportPrecedent, rapportSansObjet } from "@ucm-kit/core/lecteurs";
import { API_GITHUB } from "@ucm-kit/core/protocoles";

import { VARIABLE_DU_JETON_GITHUB } from "./fichiers-du-consommateur.mjs";

const USAGE = "ucm rapport-github --depot <propriétaire/nom> --demande <numéro> --fichier <chemin> [--api <url>]";

const OPTIONS = { "--depot": "depot", "--demande": "demande", "--fichier": "fichier", "--api": "api" };

/** Le compte d'un jeton que GitHub refuse de décrire : celui des commentaires d'une Action. */
const COMPTE_DES_ACTIONS = "github-actions[bot]";

const PAR_PAGE = 100;

/** Lit les arguments ; rend `erreur` pour une invocation fautive. */
export function lireArgumentsRapportGithub(arguments_) {
  const valeurs = { api: API_GITHUB };
  for (let i = 0; i < arguments_.length; i += 1) {
    const cle = OPTIONS[arguments_[i]];
    if (!cle) return { erreur: `Argument inconnu : ${arguments_[i]}` };
    const valeur = arguments_[i + 1];
    if (valeur === undefined || valeur.startsWith("--") || valeur === "") {
      return { erreur: `${arguments_[i]} attend une valeur.` };
    }
    valeurs[cle] = valeur;
    i += 1;
  }
  for (const [option, cle] of Object.entries(OPTIONS)) {
    if (valeurs[cle] === undefined) return { erreur: `${option} est obligatoire.` };
  }
  if (!/^[^/\s]+\/[^/\s]+$/.test(valeurs.depot)) {
    return { erreur: `--depot attend <propriétaire>/<nom> : ${valeurs.depot} n'a pas cette forme.` };
  }
  if (!/^[1-9]\d*$/.test(valeurs.demande)) {
    return { erreur: `--demande attend le numéro de la pull request : ${valeurs.demande} n'en est pas un.` };
  }
  if (!/^https:\/\//.test(valeurs.api)) return { erreur: `--api attend une adresse https : ${valeurs.api} n'en est pas une.` };
  return { valeurs: { ...valeurs, api: valeurs.api.replace(/\/+$/, "") } };
}

/** Une réponse d'API refusée, avec son statut. */
class RefusGithub extends Error {
  constructor(statut, geste) {
    super(geste);
    this.statut = statut;
  }
}

/** Le geste qu'un statut demande, écrit pour la personne qui lit le journal du job. */
function gesteDuStatut(statut, action) {
  if (statut === 401) {
    return `GitHub refuse le jeton de ${VARIABLE_DU_JETON_GITHUB} (401) en voulant ${action}. `
      + "Un mainteneur du repository doit vérifier le secret que le workflow passe à cette variable.";
  }
  if (statut === 403) {
    return `Le jeton de ${VARIABLE_DU_JETON_GITHUB} n'a pas le droit de ${action} (403). `
      + "Le job doit déclarer `pull-requests: write` ; sur une pull request venue d'un fork, GitHub réduit le jeton à la lecture.";
  }
  if (statut === 404) {
    return `GitHub ne trouve pas la pull request en voulant ${action} (404). `
      + "Vérifiez --depot et --demande, et que le jeton a accès à ce repository.";
  }
  return `GitHub a répondu ${statut} en voulant ${action}. Relancez le job ; si la réponse ne change pas, un développeur doit la regarder.`;
}

/**
 * Publie ou remplace le commentaire du rapport.
 *
 * Codes : 0 commentaire écrit ou jeton absent, 1 refus de GitHub ou rapport
 * illisible, 2 invocation fautive.
 */
export async function rapportGithub(arguments_, {
  racine = process.cwd(),
  env = process.env,
  fetch: requete = globalThis.fetch,
  ecrire = console.log,
  alerter = console.error,
} = {}) {
  const { valeurs, erreur } = lireArgumentsRapportGithub(arguments_);
  if (erreur) {
    alerter(`${erreur}\n\n${USAGE}`);
    return 2;
  }

  const jeton = env[VARIABLE_DU_JETON_GITHUB]?.trim();
  if (!jeton) {
    ecrire(`${VARIABLE_DU_JETON_GITHUB} est absente : le rapport n'est pas publié sur la pull request. `
      + "Il reste dans les artefacts du job. Le workflow doit passer `secrets.GITHUB_TOKEN` à cette variable.");
    return 0;
  }

  let rapport;
  try {
    rapport = readFileSync(resolve(racine, valeurs.fichier), "utf8");
  } catch (erreurLecture) {
    alerter(`Le rapport ${valeurs.fichier} ne se lit pas (${erreurLecture?.code ?? erreurLecture?.message}) : aucun commentaire n'est publié.`);
    return 1;
  }
  // `ucm check` écrit le marqueur en tête du rapport, et le compte dans la
  // borne d'un commentaire. Le préfixe qui subsiste ici ne sert qu'à un fichier
  // venu d'ailleurs : sans marqueur, le commentaire ne serait jamais retrouvé,
  // donc jamais remplacé, et chaque push en empilerait un de plus.
  const corps = rapport.startsWith(MARQUEUR_RAPPORT) ? rapport : `${MARQUEUR_RAPPORT}\n${rapport}`;
  const sansObjet = rapportSansObjet(corps);
  const depot = `${valeurs.api}/repos/${valeurs.depot}`;

  async function appeler(url, action, init = {}) {
    let reponse;
    try {
      reponse = await requete(url, {
        ...init,
        redirect: "manual",
        headers: {
          Authorization: `Bearer ${jeton}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "ucm-cli",
          "Content-Type": "application/json",
        },
      });
    } catch {
      throw new RefusGithub(null, `La requête vers GitHub n'a pas abouti en voulant ${action}. Relancez le job.`);
    }
    if (reponse.status >= 300 && reponse.status < 400) {
      throw new RefusGithub(reponse.status, `GitHub a redirigé la requête en voulant ${action}.`);
    }
    if (!reponse.ok) throw new RefusGithub(reponse.status, gesteDuStatut(reponse.status, action));
    return reponse;
  }

  async function lireJson(reponse, objet) {
    try {
      return await reponse.json();
    } catch {
      throw new RefusGithub(null, `GitHub a rendu une réponse illisible en lisant ${objet}. Relancez le job.`);
    }
  }

  try {
    // Un jeton d'intégration n'a pas de compte à décrire : seul ce 403 donne le
    // compte des Actions. Tout autre refus arrête la commande, car un compte
    // deviné à tort ferait empiler un second commentaire.
    let compte = COMPTE_DES_ACTIONS;
    try {
      compte = (await lireJson(await appeler(`${valeurs.api}/user`, "lire le compte du jeton"), "le compte du jeton")).login;
    } catch (refus) {
      if (!(refus instanceof RefusGithub) || refus.statut !== 403) throw refus;
    }

    const notes = [];
    for (let page = 1; ; page += 1) {
      const reponse = await appeler(
        `${depot}/issues/${valeurs.demande}/comments?per_page=${PAR_PAGE}&page=${page}`,
        "lire les commentaires de la pull request",
      );
      const lues = await lireJson(reponse, "les commentaires de la pull request");
      for (const note of lues) {
        notes.push({ id: note.id, auteur: note.user?.login, corps: note.body, systeme: false });
      }
      if (lues.length < PAR_PAGE) break;
    }

    const existante = rapportPrecedent(notes, compte);
    if (existante !== null) {
      await appeler(`${depot}/issues/comments/${existante}`, "remplacer le commentaire du rapport", {
        method: "PATCH",
        body: JSON.stringify({ body: corps }),
      });
      ecrire(`Rapport remplacé dans le commentaire ${existante} de la pull request #${valeurs.demande}.`);
    } else if (sansObjet) {
      // Un rapport qui ne demande aucun geste remplace un commentaire, il n'en
      // ouvre jamais un : une pull request étrangère à UCM reste vierge.
      ecrire("Cette demande de fusion ne touche aucun fichier suivi par UCM : aucun commentaire n'est créé.");
    } else {
      await appeler(`${depot}/issues/${valeurs.demande}/comments`, "écrire le commentaire du rapport", {
        method: "POST",
        body: JSON.stringify({ body: corps }),
      });
      ecrire(`Rapport publié en commentaire de la pull request #${valeurs.demande}.`);
    }
    return 0;
  } catch (refus) {
    if (!(refus instanceof RefusGithub)) throw refus;
    alerter(refus.message);
    return 1;
  }
}
