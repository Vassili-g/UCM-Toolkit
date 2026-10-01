/**
 * Relevés : exporter le relevé courant, en comparer un autre, et simuler une
 * substitution dans une copie en mémoire. La simulation s'annonce tant
 * qu'elle est active ; réinitialiser rend le relevé lu dans Figma.
 */
import { nomDeMode } from '../../copie';
import { indexer } from '../../indexation';
import type { Releve } from '../../modele';
import { comparerReleves, exporterReleve, importerReleve, type ComparaisonDeReleves } from '../../releves';
import { effetsDeLaSimulation, lireSaisie, simuler } from '../../simulation';
import type { Application, Composant } from '../application';
import { poserReleve } from '../etat';
import { TEXTES } from '../textes';
import { telecharger } from '../telechargement';
import { nomDeCible, rendreResultat } from '../valeurs';
import { boutonDiscret, choixDeFichier, lienVersVariable, note, titreDeVue } from './outils';

function sousTitre(texte: string): HTMLHeadingElement {
  const titre = document.createElement('h3');
  titre.className = 'surtitre';
  titre.textContent = texte;
  return titre;
}

/** Vrai quand l'état affiche une simulation plutôt que le relevé lu dans Figma. */
export function simulationActive(app: Application): boolean {
  return app.etat.releve !== null && app.etat.releve !== app.etat.releveOriginal;
}

export function creerVueReleves(app: Application): Composant {
  const element = document.createElement('div');
  element.className = 'vue';
  let autre: { nom: string; releve: Releve } | null = null;
  let refus: string | null = null;
  const manuels = new Map<string, string>();
  let simulee: { variable: string; refus: string | null } | null = null;
  let mode = '';
  let saisie = '';

  const champ = document.createElement('input');
  champ.type = 'file';
  champ.accept = '.json,application/json';
  champ.className = 'champ-fichier';
  champ.setAttribute('aria-label', TEXTES.importerReleve);
  champ.addEventListener('change', async () => {
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    const issue = importerReleve(await fichier.text());
    if ('refus' in issue) refus = TEXTES.importRefuse(fichier.name, TEXTES.releveRefus[issue.refus]);
    else {
      autre = { nom: fichier.name, releve: issue.releve };
      manuels.clear();
      refus = null;
    }
    app.rendre(['vue']);
  });

  function sectionComparaison(): HTMLElement[] {
    const { index, releveOriginal } = app.etat;
    const parties: HTMLElement[] = [sousTitre(TEXTES.relevesTitre)];
    const gestes = document.createElement('div');
    gestes.className = 'gestes';
    gestes.append(boutonDiscret(TEXTES.exporterReleve, () => {
      if (releveOriginal) telecharger('releve-explorateur.json', exporterReleve(releveOriginal), 'application/json');
    }));
    parties.push(gestes, choixDeFichier(champ, TEXTES.importerReleve));
    if (refus) parties.push(note(refus));
    if (!autre || !index || !releveOriginal) return parties;
    const comparaison: ComparaisonDeReleves = comparerReleves(releveOriginal, autre.releve, manuels);
    const autreIndex = indexer(autre.releve);
    parties.push(note(TEXTES.comparaisonDeReleves(autre.nom)));
    if (comparaison.ecarts.length === 0 && comparaison.nonRapprochees.courantes.length === 0 && comparaison.nonRapprochees.autres.length === 0) {
      parties.push(note(TEXTES.aucunEcartDeReleves));
      return parties;
    }
    const liste = document.createElement('ul');
    liste.className = 'liens';
    for (const ecart of comparaison.ecarts.slice(0, 300)) {
      const ligne = document.createElement('li');
      ligne.className = 'ligne-de-lien';
      const nature = document.createElement('span');
      nature.className = 'note';
      const dansLeMode = ecart.mode ? ` · ${nomDeMode(index, ecart.mode)}` : '';
      nature.textContent = TEXTES.ecartsDeReleves[ecart.nature] + dansLeMode;
      const ancien = document.createElement('span');
      ancien.className = 'note';
      ancien.textContent = `← ${nomDeCible(autreIndex, ecart.autre)}`;
      ligne.append(lienVersVariable(app, ecart.courante, undefined, 'inspecter'), nature, ancien);
      liste.append(ligne);
    }
    parties.push(liste);
    if (comparaison.nonRapprochees.autres.length + comparaison.nonRapprochees.courantes.length > 0) {
      parties.push(sousTitre(`${TEXTES.nonRapprochee} · ${comparaison.nonRapprochees.autres.length + comparaison.nonRapprochees.courantes.length}`));
      const propositions = new Map(comparaison.propositions.map((proposition) => [proposition.autre, proposition.courante]));
      const nonRapprochees = document.createElement('ul');
      nonRapprochees.className = 'liens';
      for (const id of comparaison.nonRapprochees.autres.slice(0, 100)) {
        const ligne = document.createElement('li');
        ligne.className = 'ligne-de-lien';
        const nom = document.createElement('span');
        nom.textContent = `${nomDeCible(autreIndex, id)} · ${TEXTES.ecartsDeReleves.retiree}`;
        ligne.append(nom);
        const proposee = propositions.get(id);
        if (proposee) {
          ligne.append(boutonDiscret(`${TEXTES.rapprocher} : ${nomDeCible(index, proposee)}`, () => {
            manuels.set(id, proposee);
            app.rendre(['vue']);
          }));
        }
        nonRapprochees.append(ligne);
      }
      for (const id of comparaison.nonRapprochees.courantes.slice(0, 100)) {
        const ligne = document.createElement('li');
        ligne.className = 'ligne-de-lien';
        const nature = document.createElement('span');
        nature.className = 'note';
        nature.textContent = TEXTES.ecartsDeReleves.ajoutee;
        ligne.append(lienVersVariable(app, id, undefined, 'inspecter'), nature);
        nonRapprochees.append(ligne);
      }
      parties.push(nonRapprochees);
    }
    return parties;
  }

  function sectionSimulation(): HTMLElement[] {
    const { etat } = app;
    const { index, position } = etat;
    const parties: HTMLElement[] = [sousTitre(TEXTES.simulationTitre), note(TEXTES.simulationAide)];
    if (simulationActive(app)) {
      const bandeau = document.createElement('div');
      bandeau.className = 'bandeau-simulation';
      bandeau.setAttribute('role', 'status');
      const texte = document.createElement('span');
      texte.textContent = TEXTES.simulationActive;
      bandeau.append(texte, boutonDiscret(TEXTES.reinitialiser, () => {
        if (etat.releveOriginal) poserReleve(etat, etat.releveOriginal);
        simulee = null;
        app.rendre();
      }));
      parties.push(bandeau);
      if (simulee && etat.releveOriginal && index) {
        const effets = effetsDeLaSimulation(indexer(etat.releveOriginal), index, simulee.variable, etat.contexte);
        parties.push(note(TEXTES.simulationEffets(effets.length)));
        const liste = document.createElement('ul');
        liste.className = 'liens';
        for (const effet of effets.slice(0, 200)) {
          const ligne = document.createElement('li');
          ligne.className = 'ligne-de-lien';
          ligne.append(lienVersVariable(app, effet.id, undefined, 'inspecter'), rendreResultat(effet.avant), document.createTextNode('→'), rendreResultat(effet.apres));
          liste.append(ligne);
        }
        parties.push(liste);
      }
      return parties;
    }
    const variable = position.inspectee;
    const trouvee = variable ? index?.variables.get(variable) : undefined;
    if (!index || !variable || !trouvee) {
      parties.push(note(TEXTES.choisirUnToken));
      return parties;
    }
    const collection = index.collections.get(trouvee.collection);
    if (!collection) return parties;
    if (!collection.modes.some((candidat) => candidat.id === mode)) mode = collection.modeParDefaut;
    const ligne = document.createElement('div');
    ligne.className = 'ligne-de-champs';
    const choixDuMode = document.createElement('select');
    choixDuMode.className = 'choix';
    choixDuMode.setAttribute('aria-label', TEXTES.simulationMode);
    for (const candidat of collection.modes) {
      const option = document.createElement('option');
      option.value = candidat.id;
      option.textContent = candidat.nom;
      option.selected = candidat.id === mode;
      choixDuMode.append(option);
    }
    choixDuMode.addEventListener('change', () => {
      mode = choixDuMode.value;
    });
    const champDeSaisie = document.createElement('input');
    champDeSaisie.type = 'text';
    champDeSaisie.className = 'saisie';
    champDeSaisie.value = saisie;
    champDeSaisie.setAttribute('aria-label', TEXTES.simulationValeur);
    champDeSaisie.placeholder = TEXTES.simulationValeur;
    champDeSaisie.addEventListener('input', () => {
      saisie = champDeSaisie.value;
    });
    const lancer = boutonDiscret(TEXTES.simuler, () => {
      const lue = lireSaisie(index, trouvee.type, saisie);
      if ('refus' in lue) {
        simulee = { variable, refus: TEXTES.simulationRefusee[lue.refus] };
        app.rendre(['vue']);
        return;
      }
      const issue = simuler(etat.releve!, variable, mode, lue, etat.contexte);
      if (issue.statut === 'refuse') {
        simulee = { variable, refus: TEXTES.simulationRefusee[issue.raison] };
        app.rendre(['vue']);
        return;
      }
      simulee = { variable, refus: null };
      poserReleve(etat, issue.releve, false);
      app.rendre();
    });
    ligne.append(choixDuMode, champDeSaisie, lancer);
    parties.push(ligne);
    if (simulee?.refus) parties.push(note(simulee.refus));
    return parties;
  }

  return {
    element,
    mettreAJour() {
      if (!app.etat.index) {
        element.replaceChildren();
        return;
      }
      element.replaceChildren(titreDeVue(TEXTES.onglets.releves), ...sectionComparaison(), ...sectionSimulation());
    },
  };
}
