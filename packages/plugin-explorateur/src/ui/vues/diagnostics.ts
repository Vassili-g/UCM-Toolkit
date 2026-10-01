/**
 * Diagnostics : les chaînes qui n'aboutissent pas, regroupées par cause, puis
 * l'analyse partielle et les limites du relevé. Chaque constat nomme la
 * variable en cause et un geste ; aucune réparation n'est faite.
 */
import { nomDeMode } from '../../copie';
import { diagnostiquer, variablesConcernees, type Constat, type Diagnostic } from '../../diagnostics';
import { rapportDeDiagnostic } from '../../rapport';
import { BORNE_DES_ETAPES, signatureDeContexte } from '../../resolution';
import type { Application, Composant } from '../application';
import { TEXTES } from '../textes';
import { telecharger } from '../telechargement';
import { nomDeCible } from '../valeurs';
import { boutonDiscret, lienVersVariable, note, titreDeVue } from './outils';

/** Le détail d'un constat groupé, dans les mots du designer. */
function detailDuConstat(app: Application, constat: Constat): string {
  const index = app.etat.index!;
  const nom = (id: string) => nomDeCible(index, id);
  switch (constat.nature) {
    case 'cycle':
      return TEXTES.constat.cycle.detail([...constat.boucle, constat.boucle[0]].map(nom).join(' → '));
    case 'inaccessible':
      return TEXTES.constat.inaccessible.detail(nom(constat.enCause));
    case 'mode-absent':
      return TEXTES.constat['mode-absent'].detail(nom(constat.enCause), nomDeMode(index, constat.mode ?? ''));
    case 'type-incompatible': {
      const variable = index.variables.get(constat.enCause);
      const depart = index.variables.get(constat.occurrences[0]?.depart ?? '');
      return TEXTES.constat['type-incompatible'].detail(nom(constat.enCause), variable ? TEXTES.types[variable.type] : '', depart ? TEXTES.types[depart.type] : '');
    }
    case 'non-pris-en-charge':
      return TEXTES.constat['non-pris-en-charge'].detail(nom(constat.enCause));
    case 'interrompu':
      return TEXTES.constat.interrompu.detail(BORNE_DES_ETAPES);
  }
}

/** Le rapport en texte, une ligne par constat puis ses départs. */
export function rapportTexte(app: Application, diagnostic: Diagnostic): string {
  const index = app.etat.index!;
  const heure = new Date(index.releve.luA).toLocaleTimeString('fr');
  const lignes = [`${TEXTES.produit} · ${index.releve.fichier} · ${TEXTES.fraicheur(heure, index.releve.revision)}`, TEXTES.diagnosticsPortee(diagnostic.resolutions), ''];
  for (const constat of diagnostic.constats) {
    lignes.push(`${TEXTES.constat[constat.nature].titre} : ${detailDuConstat(app, constat)}`, `  ${TEXTES.constat[constat.nature].action}`);
    for (const occurrence of constat.occurrences.slice(0, 50)) lignes.push(`  - ${nomDeCible(index, occurrence.depart)} [${nomDeMode(index, occurrence.mode)}]`);
    lignes.push('');
  }
  return lignes.join('\n');
}

export function creerVueDiagnostics(app: Application): Composant {
  const element = document.createElement('div');
  element.className = 'vue';
  let memoire: { cle: string; diagnostic: Diagnostic } | null = null;

  /** Le diagnostic du relevé et du contexte courants, recalculé seulement quand l'un d'eux change. */
  function diagnosticCourant(): Diagnostic {
    const { resolveur, releve, contexte } = app.etat;
    const cle = `${releve?.revision}:${releve === app.etat.releveOriginal}:${signatureDeContexte(contexte)}`;
    if (memoire?.cle !== cle || !resolveur) memoire = { cle, diagnostic: diagnostiquer(resolveur!, contexte) };
    return memoire.diagnostic;
  }

  function blocDeConstat(constat: Constat): HTMLElement {
    const index = app.etat.index!;
    const bloc = document.createElement('article');
    bloc.className = 'constat';
    bloc.dataset.nature = constat.nature;
    const titre = document.createElement('strong');
    titre.className = 'constat-titre';
    titre.textContent = TEXTES.constat[constat.nature].titre;
    const detail = document.createElement('p');
    detail.className = 'constat-detail';
    detail.textContent = detailDuConstat(app, constat);
    const action = document.createElement('p');
    action.className = 'constat-action';
    action.textContent = TEXTES.constat[constat.nature].action;
    const liens = document.createElement('div');
    liens.className = 'gestes';
    liens.append(lienVersVariable(app, constat.enCause, TEXTES.inspecterLaCible));
    const premier = constat.occurrences[0];
    if (premier && premier.depart !== constat.enCause) liens.append(lienVersVariable(app, premier.depart, TEXTES.voirLeDepart));
    const departs = document.createElement('ul');
    departs.className = 'liens';
    for (const occurrence of constat.occurrences.slice(0, 20)) {
      const ligne = document.createElement('li');
      ligne.append(lienVersVariable(app, occurrence.depart, `${nomDeCible(index, occurrence.depart)} [${nomDeMode(index, occurrence.mode)}]`, 'inspecter'));
      departs.append(ligne);
    }
    bloc.append(titre, detail, action, note(TEXTES.occurrences(constat.occurrences.length)), liens, departs);
    return bloc;
  }

  return {
    element,
    mettreAJour() {
      const { index } = app.etat;
      if (!index) {
        element.replaceChildren();
        return;
      }
      const diagnostic = diagnosticCourant();
      app.etat.concernees = variablesConcernees(diagnostic.constats);
      const gestes = document.createElement('div');
      gestes.className = 'gestes';
      gestes.append(
        boutonDiscret(TEXTES.exporterJson, () => telecharger('rapport-explorateur.json', `${JSON.stringify(rapportDeDiagnostic(index, app.etat.contexte, diagnostic), null, 2)}\n`, 'application/json')),
        boutonDiscret(TEXTES.exporterTexte, () => telecharger('rapport-explorateur.txt', rapportTexte(app, diagnostic), 'text/plain')),
      );
      const parties: HTMLElement[] = [titreDeVue(TEXTES.diagnosticsTitre(diagnostic.constats.length)), note(TEXTES.diagnosticsPortee(diagnostic.resolutions)), gestes, ...diagnostic.constats.map(blocDeConstat)];
      const limites = document.createElement('section');
      limites.className = 'section';
      const titreLimites = document.createElement('h3');
      titreLimites.className = 'surtitre';
      titreLimites.textContent = TEXTES.limitesTitre;
      limites.append(titreLimites, note(TEXTES.limitesLecture));
      if (diagnostic.partiel) limites.append(note(TEXTES.diagnosticsPartiel));
      for (const manquee of index.releve.manquees) {
        const nom = manquee.depuis ? `${nomDeCible(index, manquee.depuis)} → ${manquee.id}` : manquee.id;
        limites.append(note(manquee.issue === 'introuvable' ? TEXTES.manqueeIntrouvable(nom) : TEXTES.manqueeRefusee(nom, manquee.message)));
      }
      if (index.releve.capacites.collectionsEtendues) limites.append(note(TEXTES.limitesEtendues));
      parties.push(limites);
      element.replaceChildren(...parties);
    },
  };
}
