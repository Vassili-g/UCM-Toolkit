/**
 * Calques : les consommateurs des variables dans Figma, sur le périmètre que
 * le designer choisit, et la sélection courante avec ses modes effectifs.
 * Rien n'est proposé à la suppression : une absence ne vaut que pour le
 * périmètre et les propriétés lus.
 */
import type { OccurrenceDeVariable, PerimetreDAnalyse } from '../../consommateurs';
import { nomComplet, nomDeMode } from '../../copie';
import { valeursEgales } from '../../modele';
import { consommateursDistincts, occurrencesDuToken } from '../../occurrences';
import { resoudre } from '../../resolution';
import type { Application, Composant } from '../application';
import { versSandbox } from '../pont';
import { TEXTES } from '../textes';
import { rendreResultat, rendreValeur } from '../valeurs';
import { boutonDiscret, lienVersVariable, note, titreDeVue } from './outils';

const AFFICHEES = 200;

export function creerVueCalques(app: Application): Composant {
  const element = document.createElement('div');
  element.className = 'vue';
  let perimetre: PerimetreDAnalyse = 'selection';

  function analyser(): void {
    const demande = app.nouvelleDemande();
    app.etat.analyse = { statut: 'en-cours', demande, fait: 0, total: 0, resultat: null, perimee: false };
    versSandbox({ type: 'chercher-consommateurs', demande, perimetre });
    app.rendre(['vue']);
  }

  function afficher(calque: string): void {
    versSandbox({ type: 'afficher-calque', demande: app.nouvelleDemande(), calque });
  }

  function ligneDOccurrence(occurrence: OccurrenceDeVariable, via: string | null): HTMLElement {
    const ligne = document.createElement('li');
    ligne.className = 'occurrence';
    const nom = document.createElement('span');
    nom.className = 'occurrence-nom';
    nom.textContent = occurrence.nom;
    const details = document.createElement('span');
    details.className = 'note';
    details.textContent = [occurrence.page?.nom, occurrence.propriete, via ? TEXTES.parAlias(app.etat.index?.variables.get(via)?.nom ?? via) : TEXTES.direct].filter(Boolean).join(' · ');
    ligne.append(nom, details);
    if (occurrence.genre === 'calque') ligne.append(boutonDiscret(TEXTES.afficherDansFigma, () => afficher(occurrence.consommateur)));
    return ligne;
  }

  function sectionAnalyse(): HTMLElement[] {
    const { etat } = app;
    const parties: HTMLElement[] = [];
    const commandes = document.createElement('div');
    commandes.className = 'gestes';
    const champ = document.createElement('label');
    champ.className = 'filtre';
    const nom = document.createElement('span');
    nom.className = 'filtre-nom';
    nom.textContent = TEXTES.perimetreEtiquette;
    const choix = document.createElement('select');
    choix.className = 'choix';
    for (const valeur of ['selection', 'page', 'document'] as const) {
      const option = document.createElement('option');
      option.value = valeur;
      option.textContent = TEXTES.perimetres[valeur];
      option.selected = valeur === perimetre;
      choix.append(option);
    }
    choix.addEventListener('change', () => {
      perimetre = choix.value as PerimetreDAnalyse;
    });
    champ.append(nom, choix);
    const enCours = etat.analyse.statut === 'en-cours';
    const lancer = boutonDiscret(TEXTES.analyser, analyser);
    lancer.disabled = enCours;
    commandes.append(champ, lancer);
    if (enCours) commandes.append(boutonDiscret(TEXTES.annuler, () => versSandbox({ type: 'annuler', demande: etat.analyse.demande })));
    parties.push(commandes);
    if (enCours) parties.push(note(etat.analyse.total > 0 ? TEXTES.progression(TEXTES.phase.calques, etat.analyse.fait, etat.analyse.total) : TEXTES.analyseEnCours));
    if (etat.analyse.statut === 'annulee') parties.push(note(TEXTES.analyseAnnulee));
    const resultat = etat.analyse.resultat;
    if (etat.analyse.statut !== 'lue' || !resultat) return parties;
    if (etat.analyse.perimee) parties.push(note(TEXTES.analysePerimee));
    parties.push(
      note(TEXTES.resumeAnalyse(resultat.calques, consommateursDistincts(resultat.occurrences), resultat.occurrences.length)),
      note(TEXTES.pagesAnalysees(resultat.pages.map((page) => page.nom).join(', '))),
      note(TEXTES.nonInspecte),
    );
    if (resultat.erreurs.length > 0) parties.push(note(TEXTES.erreursDeLecture(resultat.erreurs.length)));
    const variable = etat.position.inspectee;
    if (!variable || !etat.index) {
      parties.push(note(TEXTES.choisirUnToken));
      return parties;
    }
    const trouvees = occurrencesDuToken(etat.index, resultat.occurrences, variable, etat.contexte);
    const titre = document.createElement('h3');
    titre.className = 'surtitre';
    titre.textContent = nomComplet(etat.index, variable);
    parties.push(titre);
    if (trouvees.directes.length + trouvees.indirectes.length === 0) {
      const portee = resultat.perimetre === 'selection' ? TEXTES.perimetres.selection : resultat.pages.map((page) => page.nom).join(', ');
      parties.push(note(TEXTES.aucunConsommateur(portee)));
      return parties;
    }
    parties.push(note(TEXTES.consommateursDuToken(trouvees.directes.length, trouvees.indirectes.length)));
    const liste = document.createElement('ul');
    liste.className = 'liens';
    for (const occurrence of trouvees.directes.slice(0, AFFICHEES)) liste.append(ligneDOccurrence(occurrence, null));
    for (const { occurrence, via } of trouvees.indirectes.slice(0, AFFICHEES)) liste.append(ligneDOccurrence(occurrence, via));
    parties.push(liste);
    return parties;
  }

  function comparaisonFigma(calque: string, variable: string): HTMLElement | null {
    const { etat } = app;
    const verification = etat.verification;
    if (!verification || verification.calque !== calque || !verification.valeurs || !etat.index) return null;
    const lue = verification.valeurs.find((valeur) => valeur.variable === variable);
    if (!lue) return null;
    const bloc = document.createElement('div');
    bloc.className = 'verification';
    if ('erreur' in lue) {
      bloc.append(note(TEXTES.erreurFigma(lue.erreur)));
      return bloc;
    }
    const calqueLu = etat.selection.find((candidat) => candidat.id === calque);
    const notre = resoudre(etat.index, variable, etat.contexte, { calque: calqueLu?.modes ?? {} });
    const figma = lue.valeur;
    const ligneFigma = document.createElement('span');
    ligneFigma.className = 'ligne-de-lien';
    const etiquetteFigma = document.createElement('span');
    etiquetteFigma.className = 'note';
    etiquetteFigma.textContent = TEXTES.valeurFigma;
    ligneFigma.append(etiquetteFigma, figma.nature === 'alias' ? document.createElement('span') : rendreValeur(figma));
    const ligneNotre = document.createElement('span');
    ligneNotre.className = 'ligne-de-lien';
    const etiquetteNotre = document.createElement('span');
    etiquetteNotre.className = 'note';
    etiquetteNotre.textContent = TEXTES.valeurExplorateur;
    ligneNotre.append(etiquetteNotre, rendreResultat(notre));
    const concordent = notre.statut === 'resolu' && figma.nature !== 'alias' && valeursEgales(notre.valeur, figma);
    bloc.append(ligneFigma, ligneNotre, note(concordent ? TEXTES.concordance : TEXTES.divergence));
    return bloc;
  }

  function sectionSelection(): HTMLElement[] {
    const { etat } = app;
    const titre = document.createElement('h3');
    titre.className = 'surtitre';
    titre.textContent = TEXTES.selectionTitre;
    const parties: HTMLElement[] = [titre];
    if (etat.selection.length === 0) {
      parties.push(note(TEXTES.selectionVide));
      return parties;
    }
    if (etat.selection.length > 1) parties.push(note(TEXTES.selectionMultiple(etat.selection.length)));
    for (const calque of etat.selection.slice(0, 20)) {
      const bloc = document.createElement('article');
      bloc.className = 'calque';
      const nom = document.createElement('strong');
      nom.className = 'calque-nom';
      nom.textContent = calque.nom;
      bloc.append(nom);
      const modes = Object.entries(calque.modes);
      if (modes.length > 0 && etat.index) {
        const index = etat.index;
        bloc.append(note(`${TEXTES.modesDuCalque} : ${modes.map(([collection, mode]) => `${index.collections.get(collection)?.nom ?? collection} ${nomDeMode(index, mode.mode)} (${mode.explicite ? TEXTES.explicite : TEXTES.herite})`).join(' · ')}`));
      }
      const liaisons = document.createElement('ul');
      liaisons.className = 'liens';
      for (const liaison of calque.liaisons.slice(0, 50)) {
        const ligne = document.createElement('li');
        ligne.className = 'occurrence';
        const propriete = document.createElement('span');
        propriete.className = 'note';
        propriete.textContent = liaison.propriete;
        ligne.append(propriete, lienVersVariable(app, liaison.variable, undefined, 'inspecter'));
        const comparaison = comparaisonFigma(calque.id, liaison.variable);
        if (comparaison) ligne.append(comparaison);
        liaisons.append(ligne);
      }
      bloc.append(liaisons);
      if (calque.liaisons.length > 0) {
        bloc.append(boutonDiscret(TEXTES.verifierAvecFigma, () => {
          const demande = app.nouvelleDemande();
          app.etat.verification = { demande, calque: calque.id, valeurs: null };
          versSandbox({ type: 'verifier-sur-calque', demande, calque: calque.id, variables: [...new Set(calque.liaisons.map((liaison) => liaison.variable))] });
        }));
      }
      parties.push(bloc);
    }
    return parties;
  }

  return {
    element,
    mettreAJour() {
      if (!app.etat.index) {
        element.replaceChildren();
        return;
      }
      element.replaceChildren(titreDeVue(TEXTES.calquesTitre), ...sectionAnalyse(), ...sectionSelection());
    },
  };
}
