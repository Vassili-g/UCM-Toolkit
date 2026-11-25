/**
 * Génère `INVENTAIRE-UCM.html`, la page qui montre ce que contient le dépôt : le concept UCM, les outils, le parcours d'un composant,
 * l'architecture des variables Figma, le contrat, ce qui est vérifié, la feuille de route. La page est autonome : ses données y sont écrites, elle
 * ne charge aucune ressource. Elle n'a autorité sur rien ; chaque section nomme le fichier qui définit ce qu'elle montre.
 *
 * Le gabarit (`gabarit.html`), la feuille de style (`page.css`) et le script (`page.js`) portent le texte écrit à la main. Un
 * `{{nom}}` y est un trou rempli par une lecture du dépôt (`releves.ts`) : un nom qui n'a pas de valeur fait échouer la génération,
 * comme une valeur que le gabarit n'emploie pas pour un paquet ou un point d'entrée. `genererInventaire` ne lit que le dépôt ; seul
 * le lancement direct du script écrit le fichier. La lecture de la CLI passe par `import()`, d'où une fonction asynchrone.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { donneesDeLaChaine } from './chaine/calculs';
import * as releves from './releves';

const dossier = path.dirname(fileURLToPath(import.meta.url));
export const CHEMIN_DE_L_INVENTAIRE = path.join(dossier, '..', '..', 'INVENTAIRE-UCM.html');
export const CHEMIN_DE_LA_CHAINE = path.join(dossier, '..', '..', 'CHAINE-UCM.html');

const MOTS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'];
const motDuNombre = (nombre: number): string => {
  if (!MOTS[nombre]) throw new Error(`Pas de mot pour le nombre ${nombre} dans generer-inventaire.ts`);
  return MOTS[nombre];
};
const premiereMajuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);
const echapper = (texte: string): string => texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const avecCode = (texte: string): string => echapper(texte).replace(/`([^`]+)`/g, '<code>$1</code>');
const nombreEspace = (nombre: number): string => String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const listeDeCodes = (noms: readonly string[]): string => noms.map((nom) => `<code>${nom}</code>`).join(', ');
/** Une donnée de script : le JSON ne ferme jamais la balise `script`. */
const pourLeScript = (donnee: unknown): string => JSON.stringify(donnee).replace(/</g, '\\u003c');

function lireDuDossier(nom: string): string {
  return readFileSync(path.join(dossier, nom), 'utf8').replace(/\r\n/g, '\n');
}

/** Comment chaque signal du langage visuel se dessine dans la page, avec les classes `sg-*` de page.css. Un signal sans rendu fait échouer la génération. */
const RENDU_DES_SIGNAUX: Readonly<Record<string, string>> = {
  'terme-figma': '<i class="sg-figma">Variant</i>',
  'terme-ucm': '<b>solid</b>',
  variant: '<span class="chemin"><span class="v">Size=md</span></span>',
  groupe: '<span class="chemin">theme/primary/<span class="sg-groupe">solid</span>/default</span>',
  variable: '<span class="chemin">theme/primary/solid/<span class="sg-variable">default</span></span>',
  'groupe-mis-en-avant': '<span class="chemin">theme/primary/<span class="sg-groupe sg-avant">solid</span>/default</span>',
  'variable-mise-en-avant': '<span class="chemin">theme/primary/solid/<span class="sg-variable sg-avant">default</span></span>',
  'chemin-dans-une-phrase': 'La variable <span class="chemin">theme/info/page</span> vise…',
  collection: '<span class="sg-puce">theme</span>',
  couleur: '<span class="cran-reel"><i style="background:var(--bleu)"></i>#1D4ED8</span>',
  arrive: '<span class="sg-arrive">background</span>',
  part: '<span class="sg-part">bg</span>',
  'carte-ciblee': '<span class="sg-carte">Button/bg</span>',
  fait: '<span class="sg-fait">8 layers liés</span>',
  alerte: '<span class="ft-corriger"><b>⚠ À corriger</b></span>',
  decision: '<span class="sg-decision">✓ Renommé</span>',
  recherche: '<span class="sg-champ">terme:background</span>',
  'filtre-arbre': '<span class="sg-puce">Interface ×</span>',
  action: '<span class="sg-bouton">Appliquer</span> <span class="sg-bouton second">Analyser</span> <span class="sg-bouton danger">Supprimer</span>',
};

/** Les plis de la partie Annexes : un par élément qui a un visuel (icônes, alertes, signaux, marque, références, outillage), avec sa description. */
function annexes(): string {
  const { familles, alertes } = releves.signesEtAlertes();
  const nombreDeSignes = familles.reduce((somme, famille) => somme + famille.signes.length, 0);
  const signaux = releves.signauxDuLangage();
  const sansRendu = signaux.filter((signal) => !(signal.id in RENDU_DES_SIGNAUX)).map((signal) => signal.id);
  const sansSignal = Object.keys(RENDU_DES_SIGNAUX).filter((id) => !signaux.some((signal) => signal.id === id));
  if (sansRendu.length || sansSignal.length) {
    throw new Error(`RENDU_DES_SIGNAUX (generer-inventaire.ts) ne suit plus signaux.ts. Sans rendu : ${sansRendu.join(', ') || 'aucun'}. Sans signal : ${sansSignal.join(', ') || 'aucun'}.`);
  }
  const iconesDeComposant = releves.iconesDuContratDeRecette();
  const marque = releves.marque();
  const logos = marque.fichiers.filter((fichier) => fichier.nature === 'logo');
  const cartes = marque.fichiers.filter((fichier) => fichier.nature === 'carte');
  const references = releves.references();
  const outils = releves.outillage();

  // Les attributs de tracé communs aux signes passent dans page.css (`.signes-grille figure > svg`) : écrits dans chaque SVG, ils pèseraient 20 Ko.
  const COMMUNS = ' xmlns="http://www.w3.org/2000/svg"';
  const TRACE = ' fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';
  const allegerLeSigne = (svg: string): string => {
    if (!svg.includes(COMMUNS) || !svg.includes(TRACE)) throw new Error('Le SVG d\x27un signe n\x27a plus les attributs communs que page.css reprend (generer-inventaire.ts, allegerLeSigne)');
    return svg.replace(COMMUNS, '').replace(TRACE, '');
  };
  const figureDeSigne = (signe: { id: string; libelle: string; svg: string }): string =>
    `<figure>${allegerLeSigne(signe.svg)}<figcaption>${echapper(signe.libelle)}<br><code>${signe.id}</code></figcaption></figure>`;
  const famillesHtml = familles
    .map((famille) => {
      const reprises = famille.reprises.length
        ? `<p class="doux">Reprend ${listeDeCodes(famille.reprises.map((reprise) => reprise.id))}, définis dans ${[...new Set(famille.reprises.map((reprise) => reprise.origine))].map((origine) => `« ${echapper(origine)} »`).join(', ')}.</p>`
        : '';
      return `<div class="signes-famille"><h5>${echapper(famille.libelle)} <code>${famille.id}</code></h5><div class="signes-grille">${famille.signes.map(figureDeSigne).join('')}</div>${reprises}</div>`;
    })
    .join('\n    ');
  const alertesHtml = `<div class="signes-grille">${alertes
    .map((alerte) => `<figure><span class="forme-alerte ft-${alerte.id}">${alerte.svg}</span><figcaption>${echapper(alerte.libelle)}<br><code>${alerte.id}</code></figcaption></figure>`)
    .join('')}</div>`;
  const lignesDesSignaux = signaux
    .map((signal) => `<tr><td>${RENDU_DES_SIGNAUX[signal.id]}</td><td>${echapper(signal.libelle)}<br><code>${signal.id}</code></td><td>${echapper(signal.sens)}</td></tr>`)
    .join('');
  const lignesDesIcones = iconesDeComposant.icones
    .map((icone) => `<tr><td><code>${icone.nom}</code></td><td><code>${icone.emplacement}</code></td><td>${icone.propriete === null ? '' : `<code>${icone.propriete}</code>`}</td></tr>`)
    .join('');
  const figureDeMarque = (fichier: { svg: string; titre: string }): string => `<figure>${fichier.svg}<figcaption>${echapper(fichier.titre)}</figcaption></figure>`;
  const lignesDesRoles = Object.entries(references.roles).map(([role, apport]) => `<tr><td><code>${role}</code></td><td>${avecCode(apport)}</td></tr>`).join('');
  const lignesDesSystemes = references.systemes
    .map((systeme) => `<tr><td>${echapper(systeme.nom)}</td><td>${systeme.roles.map((role) => `<code>${role}</code>`).join(' ')}</td><td>${systeme.composants.length ? `oui, ${listeDeCodes(systeme.composants)}` : 'non'}</td></tr>`)
    .join('');
  const declencheur = (job: { declencheurs: string[]; branches: string | null }): string =>
    job.declencheurs.map((nom) => (nom === 'push' ? `push sur ${job.branches}` : nom === 'pull_request' ? 'pull request' : nom === 'workflow_dispatch' ? 'lancement à la main' : nom)).join(', ');

  return `<!-- Un pli par élément visuel, lu dans le dépôt par releves.ts : signesEtAlertes (kit : signes.ts, svgDuSigne ; socle : Alerte.ts), signauxDuLangage (kit : signaux.ts), iconesDuContratDeRecette (fixture Button 13.0), marque, references, outillage (docs/marque/, docs/references/, .agents/skills/, .claude/agents/, package.json, .github/workflows/). -->
  <details class="pli" id="annexe-icones"><summary>Jeu d'icônes UCM <span class="doux">${nombreDeSignes} icônes en ${familles.length} familles</span></summary><div class="contenu">
    <p>Le jeu d'icônes que les trois plugins dessinent dans leur interface dans leur interface : types de variables, usages, objets Figma, rubriques, verdicts, pictogrammes de Palettes et interface. Le kit porte le tracé, le libellé et l'emploi de chaque signe, et un tracé appartient à un seul signe. Le socle les dessine en 14, 16 ou 24 px. Le dépôt n'en fournit aucun à une application.</p>
    <p class="defini">Défini dans <code>packages/kit/src/referentiel/signes.ts</code> et dessiné par <code>packages/plugin-socle/src/ui/Signe.ts</code>. La planche <code>packages/plugin-socle/galerie/planche/</code> montre tous les signes.</p>
    ${famillesHtml}
  </div></details>
  <details class="pli" id="annexe-alertes"><summary>Formes d'alerte <span class="doux">${alertes.length}</span></summary><div class="contenu">
    <p>Les formes que les plugins dessinent pour chaque type d'alerte d'un constat, avec une couleur, un signe et un mot. Elles servent à lire la gravité d'un constat d'un coup d'œil, de la même façon dans chaque plugin.</p>
    <p class="defini">Défini dans <code>packages/plugin-socle/src/ui/Alerte.ts</code> et <code>packages/kit/src/referentiel/signaux.ts</code>.</p>
    ${alertesHtml}
  </div></details>
  <details class="pli" id="annexe-signaux"><summary>Signaux du langage visuel <span class="doux">${signaux.length}</span></summary><div class="contenu">
    <p>Un signal dit ce qu'un texte désigne : un terme, un chemin, un changement, une alerte, une action. Chaque plugin le dessine de la même façon.</p>
    <p class="defini">Défini dans <code>packages/kit/src/referentiel/signaux.ts</code>. La planche <code>packages/plugin-socle/galerie/planche/</code> les dessine avec les composants du socle.</p>
    <div class="defile"><table><tr><th>Rendu</th><th>Signal</th><th>Sens</th></tr>${lignesDesSignaux}</table></div>
  </div></details>
  <details class="pli" id="annexe-icones-composants"><summary>Icônes des composants <span class="doux">aucune fournie</span></summary><div class="contenu">
    <p>Les icônes qu'emploie le contrat de recette du Button, lues dans son champ <code>icons</code>. Elles montrent ce que le développeur fournit lui-même. Le designer place les icônes comme instances du composant <code>Icon</code> de son fichier, et Architect le vérifie (C66). Le contrat liste celles qu'un composant emploie. <code>ucm icons</code> en donne la liste au développeur, qui fournit lui-même les fichiers.</p>
    <p class="defini">Défini dans <code>packages/kit/src/format/types.ts</code> (champ <code>icons</code>) et <code>packages/cli/src/</code>.</p>
    <p class="source">${iconesDeComposant.icones.length} icônes du contrat de recette <code>${iconesDeComposant.chemin.replace('packages/kit/fixtures/contrats/', '')}</code>.</p>
    <div class="defile"><table><tr><th>Nom dans Figma</th><th>Emplacement</th><th>Propriété d'affichage</th></tr>${lignesDesIcones}</table></div>
  </div></details>
  <details class="pli" id="annexe-marque"><summary>Marque <span class="doux">${logos.length} logos et ${cartes.length} cartes</span></summary><div class="contenu">
    <p>Les fichiers SVG de la marque. Les logos et les cartes du toolkit, de l'Exporter, de Palettes et d'Architect présentent les outils sur la Community et dans les README.</p>
    <p class="defini">Défini dans <code>docs/marque/logos/</code> et <code>docs/marque/cartes/</code>. Les fichiers sont générés par <code>${marque.script}</code>.</p>
    <div class="marques-grille">${logos.map(figureDeMarque).join('')}</div>
    <div class="marques-grille cartes">${cartes.map(figureDeMarque).join('')}</div>
  </div></details>
  <details class="pli" id="annexe-references"><summary>Références des design systems <span class="doux">${references.systemes.length} systèmes, ${references.analyses.length} guide</span></summary><div class="contenu">
    <p>Les design systems du marché que le dépôt a relevés, avec le rôle de chacun. Les noms et les valeurs de chaque système sont figés. Ils servent à fixer la nomenclature UCM et à écrire le guide d'un composant avant de le dessiner.</p>
    <p class="defini">Défini dans <code>docs/references/systemes.json</code>, <code>docs/references/README.md</code>, <code>docs/references/composants/</code> et <code>docs/references/analyses/</code>.</p>
    <div class="defile"><table><tr><th>Rôle</th><th>Apport</th></tr>${lignesDesRoles}</table></div>
    <div class="defile"><table><tr><th>Système</th><th>Rôles</th><th>Fiches de composants</th></tr>${lignesDesSystemes}</table></div>
    <p>Guides de <code>docs/references/analyses/</code> : ${listeDeCodes(references.analyses)}. La skill <code>guide-composant</code> les écrit. ${echapper(references.skillGuide)}</p>
  </div></details>
  <details class="pli" id="annexe-outillage"><summary>Outillage des agents du dépôt <span class="doux">${outils.skills.length} skills, ${outils.agents.length} agents, ${outils.scripts.length} scripts</span></summary><div class="contenu">
    <p>Les skills, les agents, les scripts npm et les jobs de CI qui font travailler les agents de code sur UCM-Toolkit, lus dans le dépôt à la génération. Un guide <code>AGENTS.md</code> et une carte par paquet, un domicile par fichier source et un contrôle de style rejoué à chaque écriture font travailler les agents sans perdre les règles du dépôt. L'agent d'une application reçoit autre chose : la skill <code>ucm-implementer</code>, les gabarits, les aides et le guide d'un contrat.</p>
    <p class="defini">Défini dans <code>AGENTS.md</code>, <code>.agents/skills/</code>, <code>.claude/agents/</code>, <code>package.json</code> et <code>.github/workflows/</code>.</p>
    <h4>Skills</h4>
    <div class="defile"><table><tr><th>Skill</th><th>Rôle</th></tr>${outils.skills.map((skill) => `<tr><td><code>${skill.nom}</code></td><td>${avecCode(skill.description)}</td></tr>`).join('')}</table></div>
    <h4>Agents</h4>
    <div class="defile"><table><tr><th>Agent</th><th>Modèle</th><th>Rôle</th></tr>${outils.agents.map((agent) => `<tr><td><code>${agent.nom}</code></td><td>${agent.modele}</td><td>${avecCode(agent.description)}</td></tr>`).join('')}</table></div>
    <h4>Scripts npm de la racine</h4>
    <div class="defile"><table><tr><th>Script</th><th>Ce qu'il fait</th><th>Source de la phrase</th></tr>${outils.scripts.map((script) => `<tr><td><code>npm run ${script.nom}</code></td><td>${avecCode(script.phrase)}</td><td class="doux">${echapper(script.source)}</td></tr>`).join('')}</table></div>
    <h4>Jobs des workflows</h4>
    <div class="defile"><table><tr><th>Job</th><th>Déclencheur</th><th>Ce qu'il lance</th></tr>${outils.jobs.map((job) => `<tr><td><code>${job.fichier}</code>, job <code>${job.id}</code></td><td>${echapper(declencheur(job))}</td><td>${job.lances.map((commande) => `<code>${echapper(commande)}</code>`).join(', ')}</td></tr>`).join('')}</table></div>
  </div></details>`;
}

/** Un identifiant de piste dans un texte devient un lien vers sa fiche ; un identifiant inconnu fait échouer la génération. */
function avecPistes(texte: string, identifiants: ReadonlySet<string>, ou: string): string {
  return avecCode(texte).replace(/\bP\d{1,2}\b/g, (identifiant) => {
    if (!identifiants.has(identifiant)) throw new Error(`${ou} : la piste ${identifiant} n'existe pas dans pistes.json`);
    return `<a href="#piste-${identifiant}">${identifiant}</a>`;
  });
}

/** Les termes du glossaire qu'emploient les règles décidées : leur première occurrence renvoie à sa définition. */
const TERMES_DES_REGLES: readonly [string, string][] = [['<code>CODEOWNERS</code>', 'g-codeowners'], ['dérogation', 'g-derogation']];
const avecTermes = (html: string): string =>
  TERMES_DES_REGLES.reduce((texte, [terme, ancre]) => texte.replace(terme, `<a class="terme" href="#${ancre}">${terme}</a>`), html);

/** Les règles décidées que la page rend : un trou par règle de carte, des lignes pour les règles des contrôles et pour les autres règles. Une règle transverse va dans la fiche de ses pistes (`releves.roadmap`). */
function blocsDesRegles(decisions: releves.Decisions, identifiants: ReadonlySet<string>): Record<string, string> {
  const rendu: Record<string, string> = {};
  for (const regle of decisions.regles) {
    if (regle.genre === 'carte') rendu[`regle:${regle.id}`] = avecPistes(regle.texte, identifiants, `decisions.json, règle ${regle.id}`);
  }
  const lignes = (genre: releves.Regle['genre']): string =>
    decisions.regles
      .filter((regle) => regle.genre === genre)
      .map((regle) => `<li>${avecTermes(avecPistes(regle.texte, identifiants, `decisions.json, règle ${regle.id}`))}</li>`)
      .join('\n    ');
  rendu['lignes-decidees'] = lignes('tableau');
  rendu['lignes-regles'] = lignes('liste');
  return rendu;
}

/** Les registres du référentiel et ses listes fermées, en lignes de deux tableaux. */
function lignesDesRegistres(): { registres: string; listes: string } {
  return {
    registres: releves
      .registresDuReferentiel()
      .map((registre) => `<tr><td><code>${registre.id}</code></td><td class="n">${registre.termes}</td><td>${registre.extensible ? 'oui' : 'non'}</td></tr>`)
      .join('\n      '),
    listes: releves
      .listesDuReferentiel()
      .map((liste) => `<tr><td><code>${liste.nom}</code></td><td>${echapper(liste.phrase)}</td><td>${listeDeCodes(liste.ids)}</td></tr>`)
      .join('\n      '),
  };
}

/** Les lignes du tableau des garanties : numéro, variable, fonds, seuil. */
function lignesDesGaranties(): string {
  return releves
    .lignesDesGaranties()
    .map((ligne) => `<tr><td>G${ligne.numero}</td><td><span class="chemin">${ligne.variable}</span></td><td>${ligne.fonds}</td><td>${ligne.seuil}</td></tr>`)
    .join('\n    ');
}

/** Une ligne de tableau par commande de la CLI : son rôle, sa note et ses options. */
async function lignesDesCommandes(): Promise<string> {
  const lignes = (await releves.commandes()).map((commande) => {
    const phrases = [`${premiereMajuscule(commande.role)}.`, commande.note].filter(Boolean).join(' ');
    const options = commande.options.length ? ` Options : ${listeDeCodes(commande.options.map(echapper))}.` : '';
    return `<tr><td><code>ucm ${commande.nom}</code></td><td>${avecCode(phrases)}${options}</td></tr>`;
  });
  return lignes.join('\n        ');
}

/** Le verdict d'une demande, avec son signe : un état qui bloque ou qui passe. */
const verdictEnHtml = (bloque: boolean): string => (bloque ? '<span class="verdict v-bloque">bloque</span>' : '<span class="verdict v-passe">passe</span>');

/** Une ligne par état de composant : sa phrase, trois verdicts calculés par `verdictDeLaDemande`, sa raison et ce qui décide. */
function lignesDesEtats(): string {
  return releves
    .etatsDeComposant()
    .map((ligne) => {
      const autorite = ligne.autorite.length ? ligne.autorite.map(avecCode).join(', ') : 'rien';
      const colonnes = releves.DEMANDES.map((demande, rang) => `<td data-l="${DEMANDES_EN_MOTS[demande]}">${verdictEnHtml(ligne.verdicts[rang])}</td>`).join('');
      return `<tr><td>${premiereMajuscule(echapper(ligne.phrase))}<span class="nota"><code>${ligne.etat}</code></span></td>${colonnes}<td data-l="Pourquoi">${avecCode(ligne.raison)}</td><td data-l="Ce qui bloque">${autorite}</td></tr>`;
    })
    .join('\n    ');
}

const DEMANDES_EN_MOTS: Readonly<Record<(typeof releves.DEMANDES)[number], string>> = {
  code: 'Demande de code',
  'contrats-et-tokens': 'Demande de contrats',
  'tokens-seuls': 'Demande de tokens seuls',
};

/** Une ligne par code du juge du code : ses règles, son niveau, sa raison et les coordonnées de sa dérogation. */
function lignesDesCodesDuLinter(): string {
  return releves
    .controleDuCode()
    .codes.map((entree) => {
      const derogeable = entree.derogeable === null ? 'non' : `oui, par ${listeDeCodes(entree.derogeable)}`;
      return `<tr><td><code>${entree.code}</code></td><td data-l="Règles">${listeDeCodes(entree.regles)}</td><td data-l="Niveau">${entree.niveau}</td><td data-l="Pourquoi">${avecCode(entree.raison)}</td><td data-l="Dérogeable">${derogeable}</td></tr>`;
    })
    .join('\n    ');
}

/** Les tables du pli « Les listes du linter » : une chaîne par trou du gabarit. */
function tablesDuLinter(): Record<string, string> {
  const controle = releves.controleDuCode();
  const ligne = (...cellules: string[]): string => `<tr>${cellules.map((cellule) => `<td>${cellule}</td>`).join('')}</tr>`;
  return {
    'linter:familles': controle.familles.map((famille) => ligne(`<code>${famille.famille}</code>`, avecCode(famille.raison))).join('\n    '),
    'linter:proprietes': controle.proprietes.map((propriete) => ligne(`<code>${propriete.propriete}</code>`, listeDeCodes(propriete.familles), avecCode(propriete.raison))).join('\n    '),
    'linter:neutres': controle.neutres.map((neutre) => ligne(`<code>${neutre.valeur}</code>`, avecCode(neutre.raison))).join('\n    '),
    'linter:listes': controle.listes.map((liste) => ligne(echapper(liste.titre), avecCode(liste.raison), `${liste.valeurs.length}`, `<span class="mono">${liste.valeurs.map(echapper).join(', ')}</span>`)).join('\n    '),
    'linter:champs-publies': controle.champsPublies.map((champ) => ligne(`<code>${champ.champ}</code>`, `<code>${champ.famille}</code>`, avecCode(champ.raison))).join('\n    '),
    'linter:champs-hors-famille': controle.champsHorsFamille.map((champ) => ligne(`<code>${champ.champ}</code>`, avecCode(champ.raison))).join('\n    '),
    'linter:limites': controle.limites.map((limite) => ligne(`<code>${limite.code}</code>`, avecCode(limite.raison))).join('\n    '),
    'linter:nombre-proprietes': String(controle.proprietes.length),
    'linter:nombre-codes': String(controle.codes.length),
  };
}

function lignesDesFamilles(): string {
  return releves
    .famillesParCollection()
    .map(({ collection, familles }) => `<tr><td>${collection}</td><td class="mono">${familles.join(', ')}</td></tr>`)
    .join('\n      ');
}

/** Toutes les valeurs que les trous du gabarit, de la feuille de style et du script réclament. */
async function valeurs(): Promise<{ liste: Record<string, string>; idsTermines: ReadonlySet<string> }> {
  const versions = releves.versions();
  const extraits = releves.extraitsDesDocuments(versions);
  const reference = releves.referencePourLePanneau();
  const couleurs = releves.donneesDesPalettes();
  const clarte = releves.clarteDesCrans();
  const codes = releves.codesDesConstats();
  const numerosDeCodes = codes.map(([code]) => Number(code.slice(1)));
  const paquets = releves.paquets();
  const entrees = await releves.pointsDEntree();
  const noms = releves.nomsExportes(entrees);
  const bouton = releves.contratDuButton();
  const rapport = releves.rapportDuButton();
  const recette = releves.contratsDeRecette();
  const tailles = releves.registreDesTailles();
  const identifiantsDePistes = new Set(releves.pistes().map((piste) => piste.id));
  const decisions = releves.decisions(identifiantsDePistes);
  // Une piste livrée, archivée ou écartée quitte la Roadmap pour la partie « Terminés ».
  const { pistes: pistesASuivre, terminees } = releves.roadmap(decisions.regles.filter((regle) => regle.genre === 'transverse'));
  const palettes = releves.reglagesDePalettes();
  const composant = releves.sectionsDuComposant();
  const registres = lignesDesRegistres();
  const fautes = releves.longueursDeFaute();
  const accessibilite = releves.seuilsDAccessibilite();

  const liste: Record<string, string> = {
    // Versions
    'version:kit': versions.kit,
    'version:cli': versions.cli,
    'version:adaptateur': versions.adaptateur,
    contrat: versions.contrat,
    'contrat:minimal': versions.contratMinimal,
    'contrats:lus': `${versions.contratMinimal} et ${versions.contrat}`,
    'contrats:fenetre': `${versions.contratMinimal} à ${versions.contrat}`,
    'tokens:format': String(versions.tokens),
    'tokens:lus': versions.tokensLus.join(' et '),
    recette: String(versions.recette),
    'recette:lue': `${versions.recettePremiere} à ${versions.recette}`,
    classes: String(extraits.classesDeCompatibilite),
    // Le référentiel
    'collections:nombre': String(reference.collections.length),
    'crans:nombre': String(clarte.crans.length),
    'theme:variables': String(reference.theme.length),
    'garanties:nombre': String(reference.garanties.length),
    'tailles:nombre': String(tailles.nombre),
    'tailles:premiere': tailles.premiere,
    'tailles:derniere': tailles.derniere,
    'proprietes:nombre': String(releves.nombreDeProprietesDeComposant()),
    'lignes-garanties': lignesDesGaranties(),
    'lignes-familles': lignesDesFamilles(),
    // Les fonds de page
    'fond:light': couleurs.fonds.light,
    'fond:dark': couleurs.fonds.dark,
    // Les registres du référentiel
    'fautes:court': String(fautes.court),
    'fautes:court-max': String(fautes.uneLettre - 1),
    'fautes:une-lettre': String(fautes.uneLettre),
    'fautes:deux-lettres': String(fautes.deuxLettres),
    'accessibilite:cible': String(accessibilite.cible),
    'accessibilite:tactile': String(accessibilite.tactile),
    'accessibilite:texte': String(accessibilite.texte),
    'imbriques:nombre': String(releves.nombreDeSortesDImbrique()),
    'registres:nombre': String(releves.registresDuReferentiel().length),
    'lignes-registres': registres.registres,
    'lignes-listes': registres.listes,
    // Les réglages de Palettes et les sections d'Architect
    'palettes:part-soft': palettes.partSoft,
    'palettes:part-vivid': palettes.partVivid,
    'palettes:seuil-confondues': palettes.seuilConfondues,
    'palettes:seuil-proches': palettes.seuilProches,
    'palettes:nuances': palettes.nuances,
    'composant:sections': String(composant.nombre),
    'composant:sections-liste': composant.liste,
    // Les pistes et les règles décidées
    'pistes:nombre': String(pistesASuivre.length),
    ...blocsDesRegles(decisions, identifiantsDePistes),
    // Les codes de constat
    'codes:nombre': String(codes.length),
    'codes:plage': `C${Math.min(...numerosDeCodes)} à C${Math.max(...numerosDeCodes)}`,
    // Les paquets et leurs points d'entrée
    'paquets:mot': motDuNombre(paquets.length),
    'entrees:nombre': String(entrees.length),
    'entrees:mot': motDuNombre(entrees.length),
    'entrees:Mot': premiereMajuscule(motDuNombre(entrees.length)),
    'noms:uniques': String(noms.uniques),
    'noms:total': String(noms.total),
    'noms:importes': String(releves.symbolesImportes()),
    aides: String(releves.nombreDAides()),
    'lignes-commandes': await lignesDesCommandes(),
    // Le contrat du Button et les contrats de recette
    'bouton:chemin': bouton.chemin,
    'bouton:version': bouton.version,
    'bouton:octets': nombreEspace(bouton.octets),
    'bouton:props': String(bouton.props),
    'bouton:variants': String(bouton.variants),
    'recette-contrats:nombre': String(recette.nombre),
    'recette-contrats:version': recette.version,
    // Le rapport d'ucm check
    'rapport:vert': rapport.vert,
    'rapport:rouge': rapport.rouge,
    'rapport:titre': avecCode(rapport.titre.replace(/`src\/components\/Button\//, '`')),
    'rapport:ecart': avecCode(rapport.ecart),
    'rapport:action': avecCode(rapport.action),
    'rapport:fin': avecCode(rapport.fin),
    'lignes-etats': lignesDesEtats(),
    'etat:en-retard-sur-les-tokens': echapper(releves.phraseDeLEtat('en-retard-sur-les-tokens')),
    'lignes-codes-linter': lignesDesCodesDuLinter(),
    ...tablesDuLinter(),
    // Les blocs d'annexes
    annexes: annexes(),
    // Les données du script
    'js:crans': pourLeScript(clarte.crans),
    'js:clarte': pourLeScript(clarte.clarte),
    'js:DONNEES': pourLeScript(couleurs),
    'js:REFERENCE': pourLeScript(reference),
    'js:C': pourLeScript(codes),
    'js:PISTES': pourLeScript(pistesASuivre),
    'js:TERMINEES': pourLeScript(terminees),
    'js:SUJETS': pourLeScript(releves.SUJETS),
  };
  for (const paquet of paquets) liste[`tests:${paquet.dossier}`] = String(paquet.fichiersDeTest);
  for (const entree of entrees) liste[`export:${entree.entree}`] = String(entree.noms.length);
  for (const logo of releves.logosDesOutils()) {
    const signe = logo.signe === null ? '' : `<span class="logo-signe">${logo.signe}</span>`;
    liste[`logo:${logo.outil}`] = `<span class="logo" aria-hidden="true">${logo.svg}${signe}</span>`;
  }
  return { liste, idsTermines: new Set(terminees.map(({ id }) => id)) };
}

const PREFIXES_A_EMPLOYER = ['tests:', 'export:', 'regle:', 'logo:'];

/** Remplace chaque `{{nom}}` par sa valeur et marque le nom comme employé. */
function remplir(texte: string, fichier: string, liste: Record<string, string>, employes: Set<string>): string {
  return texte.replace(/\{\{([^{}\s]+)\}\}/g, (_trou, nom: string) => {
    if (!(nom in liste)) throw new Error(`${fichier} : le trou {{${nom}}} n'a pas de valeur dans generer-inventaire.ts`);
    employes.add(nom);
    return liste[nom];
  });
}

/** Un univers dont la page doit montrer chaque élément : ce qu'on attend, ce que la page montre, et où le compléter. */
export interface UniversDeCouverture {
  attendus: string[];
  montres: string[];
  /** Les noms que l'inventaire a lus, pour un univers qui est un export du kit. */
  lus?: string[];
  aCompleter: string;
}

export interface Couverture {
  univers: Record<string, UniversDeCouverture>;
}

const nomme = (page: string, nom: string): boolean => new RegExp(`(?<![\\w-])${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(page);

/** Ce que la page montre de chaque univers que `couverture.ts` contrôle. */
async function couvertureDeLaPage(page: string, employes: ReadonlySet<string>): Promise<Couverture> {
  const univers: Record<string, UniversDeCouverture> = {};
  for (const nom of ['referentiel', 'emplois', 'controles'] as const) {
    const attendus = Object.keys(await import(`@ucm-kit/core/${nom}`)).sort();
    const lus = [...releves.NOMS_LUS[nom]].sort();
    // Un nom que deux points d'entrée exportent est une seule valeur : lu par l'un, il est montré pour les deux.
    const luParUnPoint = new Set(Object.values(releves.NOMS_LUS).flatMap((noms) => [...noms]));
    univers[`export ./${nom}`] = {
      attendus,
      montres: attendus.filter((cle) => luParUnPoint.has(cle)),
      lus,
      aCompleter: "docs/inventaire/releves.ts (lire le nom) et docs/inventaire/gabarit.html (le montrer), ou docs/inventaire/couverture.ts (l'exclure)",
    };
  }
  const entrees = (await releves.pointsDEntree()).map(({ entree }) => entree);
  univers["points d'entrée du kit"] = { attendus: entrees, montres: entrees.filter((entree) => employes.has(`export:${entree}`)), aCompleter: "l'annexe « Les points d'entrée du kit » de docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts" };
  const paquets = releves.dossiersDesWorkspaces();
  univers.paquets = { attendus: paquets, montres: paquets.filter((dossier) => employes.has(`tests:${dossier}`)), aCompleter: 'PAQUETS dans docs/inventaire/releves.ts et le gabarit, ou docs/inventaire/couverture.ts' };
  const dossiersDeDocs = releves.dossiersDe('docs');
  univers['dossiers de docs/'] = { attendus: dossiersDeDocs, montres: dossiersDeDocs.filter((dossier) => page.includes(`docs/${dossier}`)), aCompleter: 'la section qui montre ce dossier dans docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts' };
  const recherches = releves.dossiersDe('docs/notes/Recherches');
  univers['dossiers de docs/notes/Recherches/'] = { attendus: recherches, montres: recherches.filter((dossier) => page.includes(dossier)), aCompleter: "la section « Autres sources » de docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts" };
  const skills = releves.dossiersDeSkills();
  univers.skills = { attendus: skills, montres: skills.filter((nom) => page.includes(`<code>${nom}</code>`)), aCompleter: "l'annexe « Outillage des agents du dépôt » (releves.ts, outillage), ou docs/inventaire/couverture.ts" };
  const commandes = (await releves.commandes()).map((commande) => commande.nom);
  univers['commandes de la CLI'] = { attendus: commandes, montres: commandes.filter((nom) => page.includes(`<code>ucm ${nom}</code>`)), aCompleter: 'COMMANDES dans packages/cli/src/ucm.mjs et la carte de la CLI dans docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts' };
  const codes = releves.codesDesConstats().map(([code]) => code);
  univers['codes de constat'] = { attendus: codes, montres: codes.filter((code) => nomme(page, code)), aCompleter: 'CODES_DES_CONSTATS dans packages/kit/src/controles/codes.ts, ou docs/inventaire/couverture.ts' };
  const codesDuLinter = releves.controleDuCode().codes.map(({ code }) => code);
  univers['codes du linter'] = { attendus: codesDuLinter, montres: codesDuLinter.filter((code) => page.includes(`<td><code>${code}</code></td>`)), aCompleter: 'CODES_DU_CONTROLE_DU_CODE dans packages/kit/src/lecteurs/controle-du-code-listes.mjs, ou docs/inventaire/couverture.ts' };
  return { univers };
}

/** Le contenu exact de `INVENTAIRE-UCM.html`, et ce que la page montre de chaque univers couvert. */
export async function genererInventaireEtCouverture(): Promise<{ page: string; couverture: Couverture }> {
  const { liste, idsTermines } = await valeurs();
  const employes = new Set<string>();
  const css = remplir(lireDuDossier('page.css'), 'page.css', liste, employes);
  const js = remplir(lireDuDossier('page.js'), 'page.js', liste, employes);
  // Une piste terminée n'a plus de fiche : un renvoi écrit à la main dans le gabarit reste du texte.
  const html = remplir(lireDuDossier('gabarit.html'), 'gabarit.html', { ...liste, css, js }, employes)
    .replace(/<a href="#piste-(P\d+)">([^<]*)<\/a>/g, (lien, id: string, texte: string) => (idsTermines.has(id) ? texte : lien));
  const oublies = Object.keys(liste).filter((nom) => PREFIXES_A_EMPLOYER.some((prefixe) => nom.startsWith(prefixe)) && !employes.has(nom));
  if (oublies.length) {
    throw new Error(`Le gabarit n'emploie pas : ${oublies.join(', ')}. Un paquet, un point d'entrée du kit, une règle décidée ou un logo d'outil n'a pas sa place dans la page.`);
  }
  return { page: html, couverture: await couvertureDeLaPage(html, employes) };
}

/** Le contenu exact de `INVENTAIRE-UCM.html`. */
export async function genererInventaire(): Promise<string> {
  return (await genererInventaireEtCouverture()).page;
}

/**
 * Un logo de la marque pour la chaîne : un `<img>` dont le SVG est écrit dans la page (URI `data:`), donc rien n'est chargé. Un SVG
 * en ligne se rastérise autrement qu'un `<img>` et déplace des pixels du contour ; l'image garde le rendu de la maquette.
 */
function logoDeLaChaine(fichier: string, classe?: string): string {
  const { svg } = releves.svgDeMarque(`docs/marque/logos/${fichier}.svg`, '', true);
  return `<img${classe === undefined ? '' : ` class="${classe}"`} src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" alt="">`;
}

/** Le contenu exact de `CHAINE-UCM.html`, la chaîne UCM en pleine page. Elle ne charge aucune ressource : logos, style et script y sont écrits. */
export function genererChaine(): string {
  const donnees = donneesDeLaChaine();
  const logos: Record<string, string> = { zone: logoDeLaChaine('ucm-toolkit') };
  for (const { logo } of donnees.NOEUDS) if (logo !== undefined) logos[logo] = logoDeLaChaine(logo, 'logo');
  const employes = new Set<string>();
  const liste = {
    css: remplir(lireDuDossier('chaine/chaine.css'), 'chaine.css', {}, employes),
    rendu: remplir(lireDuDossier('chaine/rendu.js'), 'rendu.js', {}, employes),
    donnees: pourLeScript({ ...donnees, logos }),
    'logo-entete': logoDeLaChaine('ucm-toolkit'),
  };
  return remplir(lireDuDossier('chaine/plein-ecran.html'), 'plein-ecran.html', liste, employes);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  genererInventaire().then((page) => {
    writeFileSync(CHEMIN_DE_L_INVENTAIRE, page);
    console.log(`Écrit : ${CHEMIN_DE_L_INVENTAIRE}`);
    writeFileSync(CHEMIN_DE_LA_CHAINE, genererChaine());
    console.log(`Écrit : ${CHEMIN_DE_LA_CHAINE}`);
  });
}
