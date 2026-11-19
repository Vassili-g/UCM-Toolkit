/**
 * Génère `INVENTAIRE-UCM.html`, la page qui montre ce que contient le dépôt : le trajet d'un composant, le modèle, ce que UCM attend
 * dans Figma, le contrat, les outils, les contrôles, la feuille de route. La page est autonome : ses données y sont écrites, elle
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

import * as releves from './releves';

const dossier = path.dirname(fileURLToPath(import.meta.url));
export const CHEMIN_DE_L_INVENTAIRE = path.join(dossier, 'INVENTAIRE-UCM.html');

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

/** Les plis de l'annexe « Le reste du dépôt » : icônes, marque, références, outillage des agents. */
function annexes(): { html: string; compte: Record<string, string> } {
  const { familles, alertes } = releves.signesEtAlertes();
  const nombreDeSignes = familles.reduce((somme, famille) => somme + famille.signes.length, 0);
  const marque = releves.marque();
  const logos = marque.fichiers.filter((fichier) => fichier.nature === 'logo');
  const cartes = marque.fichiers.filter((fichier) => fichier.nature === 'carte');
  const references = releves.references();
  const outils = releves.outillage();

  const figureDeSigne = (signe: { id: string; libelle: string; svg: string }): string =>
    `<figure>${signe.svg}<figcaption>${echapper(signe.libelle)}<br><code>${signe.id}</code></figcaption></figure>`;
  const famillesHtml = familles
    .map((famille) => {
      const reprises = famille.reprises.length
        ? `<p class="doux">Reprend ${listeDeCodes(famille.reprises.map((reprise) => reprise.id))}, définis dans ${[...new Set(famille.reprises.map((reprise) => reprise.origine))].map((origine) => `« ${echapper(origine)} »`).join(', ')}.</p>`
        : '';
      return `<div class="signes-famille"><h5>${echapper(famille.libelle)} <code>${famille.id}</code></h5><div class="signes-grille">${famille.signes.map(figureDeSigne).join('')}</div>${reprises}</div>`;
    })
    .join('\n      ');
  const alertesHtml = `<div class="signes-famille"><h5>Formes d'alerte <code>Alerte.ts</code></h5><div class="signes-grille">${alertes
    .map((alerte) => `<figure><span class="forme-alerte ft-${alerte.id}">${alerte.svg}</span><figcaption>${echapper(alerte.libelle)}<br><code>${alerte.id}</code></figcaption></figure>`)
    .join('')}</div></div>`;
  const figureDeMarque = (fichier: { svg: string; titre: string }): string => `<figure>${fichier.svg}<figcaption>${echapper(fichier.titre)}</figcaption></figure>`;
  const lignesDesRoles = Object.entries(references.roles).map(([role, apport]) => `<tr><td><code>${role}</code></td><td>${avecCode(apport)}</td></tr>`).join('');
  const lignesDesSystemes = references.systemes
    .map((systeme) => `<tr><td>${echapper(systeme.nom)}</td><td>${systeme.roles.map((role) => `<code>${role}</code>`).join(' ')}</td><td>${systeme.composants.length ? `oui, ${listeDeCodes(systeme.composants)}` : 'non'}</td></tr>`)
    .join('');
  const declencheur = (job: { declencheurs: string[]; branches: string | null }): string =>
    job.declencheurs.map((nom) => (nom === 'push' ? `push sur ${job.branches}` : nom === 'pull_request' ? 'pull request' : nom === 'workflow_dispatch' ? 'lancement à la main' : nom)).join(', ');

  const html = `<!-- Annexes visuelles, lues dans le dépôt par releves.ts. Icônes : signesEtAlertes (kit : signes.ts, svgDuSigne ; socle : Alerte.ts). Marque, références, outillage : marque, references, outillage (docs/marque/, docs/references/, .agents/skills/, .claude/agents/, package.json, .github/workflows/). -->
    <details class="pli" id="annexe-icones" data-pour="toolkit"><summary>Voir le jeu d'icônes <span class="doux">${nombreDeSignes} icônes en ${familles.length} familles, ${alertes.length} formes d'alerte</span></summary><div class="contenu">
      <p class="defini">Défini dans <code>packages/kit/src/referentiel/signes.ts</code> et <code>packages/plugin-socle/src/ui/Alerte.ts</code>.</p>
      ${famillesHtml}
      ${alertesHtml}
    </div></details>
    <details class="pli" id="annexe-marque" data-pour="toolkit"><summary>Voir la marque <span class="doux">${marque.fichiers.length} fichiers de marque</span></summary><div class="contenu">
      <p class="defini">Défini dans <code>docs/marque/logos/</code> et <code>docs/marque/cartes/</code>. Les fichiers sont générés par <code>${marque.script}</code>.</p>
      <div class="marques-grille">${logos.map(figureDeMarque).join('')}</div>
      <div class="marques-grille cartes">${cartes.map(figureDeMarque).join('')}</div>
    </div></details>
    <details class="pli" id="annexe-references" data-pour="toolkit"><summary>Voir les références des design systems <span class="doux">${references.systemes.length} systèmes, ${references.analyses.length} guide</span></summary><div class="contenu">
      <p class="defini">Défini dans <code>docs/references/systemes.json</code>, <code>docs/references/README.md</code>, <code>docs/references/composants/</code> et <code>docs/references/analyses/</code>.</p>
      <div class="defile"><table><tr><th>Rôle</th><th>Apport</th></tr>${lignesDesRoles}</table></div>
      <div class="defile"><table><tr><th>Système</th><th>Rôles</th><th>Fiches de composants</th></tr>${lignesDesSystemes}</table></div>
      <p>Guides de <code>docs/references/analyses/</code> : ${listeDeCodes(references.analyses)}. La skill <code>guide-composant</code> les écrit. ${echapper(references.skillGuide)}</p>
    </div></details>
    <details class="pli" id="annexe-outillage" data-pour="toolkit"><summary>Voir l'outillage des agents <span class="doux">${outils.skills.length} skills, ${outils.agents.length} agents, ${outils.scripts.length} scripts, ${outils.jobs.length} jobs</span></summary><div class="contenu">
      <p class="defini">Défini dans <code>.agents/skills/</code>, <code>.claude/agents/</code>, <code>package.json</code> et <code>.github/workflows/</code>.</p>
      <h4>Skills</h4>
      <div class="defile"><table><tr><th>Skill</th><th>Rôle</th></tr>${outils.skills.map((skill) => `<tr><td><code>${skill.nom}</code></td><td>${avecCode(skill.description)}</td></tr>`).join('')}</table></div>
      <h4>Agents</h4>
      <div class="defile"><table><tr><th>Agent</th><th>Modèle</th><th>Rôle</th></tr>${outils.agents.map((agent) => `<tr><td><code>${agent.nom}</code></td><td>${agent.modele}</td><td>${avecCode(agent.description)}</td></tr>`).join('')}</table></div>
      <h4>Scripts npm de la racine</h4>
      <div class="defile"><table><tr><th>Script</th><th>Ce qu'il fait</th><th>Source de la phrase</th></tr>${outils.scripts.map((script) => `<tr><td><code>npm run ${script.nom}</code></td><td>${avecCode(script.phrase)}</td><td class="doux">${echapper(script.source)}</td></tr>`).join('')}</table></div>
      <h4>Jobs des workflows</h4>
      <div class="defile"><table><tr><th>Job</th><th>Déclencheur</th><th>Ce qu'il lance</th></tr>${outils.jobs.map((job) => `<tr><td><code>${job.fichier}</code>, job <code>${job.id}</code></td><td>${echapper(declencheur(job))}</td><td>${job.lances.map((commande) => `<code>${echapper(commande)}</code>`).join(', ')}</td></tr>`).join('')}</table></div>
    </div></details>`;
  return {
    html,
    compte: {
      'signes:nombre': String(nombreDeSignes),
      'signes:familles': String(familles.length),
      'alertes:nombre': String(alertes.length),
      'marque:fichiers': String(marque.fichiers.length),
      'marque:logos': String(logos.length),
      'marque:cartes': String(cartes.length),
      'systemes:nombre': String(references.systemes.length),
      'skills:nombre': String(outils.skills.length),
      'agents:nombre': String(outils.agents.length),
    },
  };
}

/** Un identifiant de piste dans un texte devient un lien vers sa fiche ; un identifiant inconnu fait échouer la génération. */
function avecPistes(texte: string, identifiants: ReadonlySet<string>, ou: string): string {
  return avecCode(texte).replace(/\bP\d{1,2}\b/g, (identifiant) => {
    if (!identifiants.has(identifiant)) throw new Error(`${ou} : la piste ${identifiant} n'existe pas dans pistes.json`);
    return `<a href="#piste-${identifiant}">${identifiant}</a>`;
  });
}

const lienDePistes = (ids: readonly string[]): string => ids.map((id) => `<a href="#piste-${id}">${id}</a>`).join(', ');
const attributPour = (pour: string | undefined): string => (pour ? ` data-pour="${pour}"` : '');

/** Les règles décidées que la page rend : un trou par règle de carte, des lignes pour la liste et pour les décisions transverses. */
function blocsDesRegles(decisions: releves.Decisions, identifiants: ReadonlySet<string>): Record<string, string> {
  const rendu: Record<string, string> = {};
  for (const regle of decisions.regles) {
    if (regle.genre === 'carte') rendu[`regle:${regle.id}`] = avecPistes(regle.texte, identifiants, `decisions.json, règle ${regle.id}`);
  }
  rendu['lignes-regles'] = decisions.regles
    .filter((regle) => regle.genre === 'liste')
    .map((regle) => `<li${attributPour(regle.pour)}>${avecPistes(regle.texte, identifiants, `decisions.json, règle ${regle.id}`)}</li>`)
    .join('\n    ');
  rendu['lignes-transverses'] = decisions.regles
    .filter((regle) => regle.genre === 'transverse')
    .map((regle) => `<tr data-decision="${regle.id}"${attributPour(regle.pour)}><td>${avecCode(regle.titre ?? regle.id)}</td><td>${avecCode(regle.texte)}</td><td>${lienDePistes(regle.pistes)}</td></tr>`)
    .join('\n    ');
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

function lignesDesFamilles(): string {
  return releves
    .famillesParCollection()
    .map(({ collection, familles }) => `<tr><td>${collection}</td><td class="mono">${familles.join(', ')}</td></tr>`)
    .join('\n      ');
}

/** Toutes les valeurs que les trous du gabarit, de la feuille de style et du script réclament. */
async function valeurs(): Promise<Record<string, string>> {
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
  const terracota = couleurs.palettes[0];
  const listeDePistes = releves.pistes();
  const identifiantsDePistes = new Set(listeDePistes.map((piste) => piste.id));
  const decisions = releves.decisions(identifiantsDePistes);
  const palettes = releves.reglagesDePalettes();
  const composant = releves.sectionsDuComposant();
  const registres = lignesDesRegistres();
  const fautes = releves.longueursDeFaute();
  const accessibilite = releves.seuilsDAccessibilite();
  const annexesDuDepot = annexes();
  const cran700 = couleurs.crans.indexOf(700);
  if (cran700 === -1) throw new Error('Le cran 700 a disparu des crans de la recette de démonstration');

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
    // Les couleurs de Terracota et les fonds
    'terracota:700': terracota.intensites.soft['light-normal'][cran700],
    'terracota:700:dark': terracota.intensites.soft['dark-normal'][cran700],
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
    // Les règles décidées
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
    // Les blocs d'annexes
    annexes: annexesDuDepot.html,
    ...annexesDuDepot.compte,
    // Les données du script
    'js:crans': pourLeScript(clarte.crans),
    'js:clarte': pourLeScript(clarte.clarte),
    'js:DONNEES': pourLeScript(couleurs),
    'js:REFERENCE': pourLeScript(reference),
    'js:C': pourLeScript(codes),
    'js:PISTES': pourLeScript(listeDePistes),
    'js:DECISIONS': pourLeScript(decisions),
  };
  for (const paquet of paquets) liste[`tests:${paquet.dossier}`] = String(paquet.fichiersDeTest);
  for (const entree of entrees) liste[`export:${entree.entree}`] = String(entree.noms.length);
  return liste;
}

const PREFIXES_A_EMPLOYER = ['tests:', 'export:', 'regle:'];

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
  univers["points d'entrée du kit"] = { attendus: entrees, montres: entrees.filter((entree) => employes.has(`export:${entree}`)), aCompleter: "la section « Les points d'entrée » de docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts" };
  const paquets = releves.dossiersDe('packages');
  univers.paquets = { attendus: paquets, montres: paquets.filter((dossier) => employes.has(`tests:${dossier}`)), aCompleter: 'PAQUETS dans docs/inventaire/releves.ts et le gabarit, ou docs/inventaire/couverture.ts' };
  const dossiersDeDocs = releves.dossiersDe('docs');
  univers['dossiers de docs/'] = { attendus: dossiersDeDocs, montres: dossiersDeDocs.filter((dossier) => page.includes(`docs/${dossier}`)), aCompleter: 'la section qui montre ce dossier dans docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts' };
  const recherches = releves.dossiersDe('docs/notes/Recherches');
  univers['dossiers de docs/notes/Recherches/'] = { attendus: recherches, montres: recherches.filter((dossier) => page.includes(dossier)), aCompleter: "la section « Autres sources » de docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts" };
  const skills = releves.dossiersDeSkills();
  univers.skills = { attendus: skills, montres: skills.filter((nom) => page.includes(`<code>${nom}</code>`)), aCompleter: "l'annexe « Voir l'outillage des agents » (releves.ts, outillage), ou docs/inventaire/couverture.ts" };
  const commandes = (await releves.commandes()).map((commande) => commande.nom);
  univers['commandes de la CLI'] = { attendus: commandes, montres: commandes.filter((nom) => page.includes(`<code>ucm ${nom}</code>`)), aCompleter: 'COMMANDES dans packages/cli/src/ucm.mjs et la section des outils de docs/inventaire/gabarit.html, ou docs/inventaire/couverture.ts' };
  const codes = releves.codesDesConstats().map(([code]) => code);
  univers['codes de constat'] = { attendus: codes, montres: codes.filter((code) => nomme(page, code)), aCompleter: 'CODES_DES_CONSTATS dans packages/kit/src/controles/codes.ts, ou docs/inventaire/couverture.ts' };
  return { univers };
}

/** Le contenu exact de `INVENTAIRE-UCM.html`, et ce que la page montre de chaque univers couvert. */
export async function genererInventaireEtCouverture(): Promise<{ page: string; couverture: Couverture }> {
  const liste = await valeurs();
  const employes = new Set<string>();
  const css = remplir(lireDuDossier('page.css'), 'page.css', liste, employes);
  const js = remplir(lireDuDossier('page.js'), 'page.js', liste, employes);
  const html = remplir(lireDuDossier('gabarit.html'), 'gabarit.html', { ...liste, css, js }, employes);
  const oublies = Object.keys(liste).filter((nom) => PREFIXES_A_EMPLOYER.some((prefixe) => nom.startsWith(prefixe)) && !employes.has(nom));
  if (oublies.length) {
    throw new Error(`Le gabarit n'emploie pas : ${oublies.join(', ')}. Un paquet, un point d'entrée du kit ou une règle décidée n'a pas sa place dans la page.`);
  }
  return { page: html, couverture: await couvertureDeLaPage(html, employes) };
}

/** Le contenu exact de `INVENTAIRE-UCM.html`. */
export async function genererInventaire(): Promise<string> {
  return (await genererInventaireEtCouverture()).page;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  genererInventaire().then((page) => {
    writeFileSync(CHEMIN_DE_L_INVENTAIRE, page);
    console.log(`Écrit : ${CHEMIN_DE_L_INVENTAIRE}`);
  });
}
