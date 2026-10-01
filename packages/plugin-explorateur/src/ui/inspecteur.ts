/**
 * L'inspecteur épinglé : la variable choisie par son nom, dans le contexte de
 * la barre. Il garde la même variable quand le contexte change ; son résultat
 * se recalcule. Les copies impossibles sont désactivées, les autres restent
 * accessibles même quand la chaîne n'aboutit pas.
 */
import { SEUILS, jugerContraste } from '../contraste';
import { nomComplet, type FormatDeCopie } from '../copie';
import { dependantsDirects } from '../indexation';
import { modePour, valeurPourLeMode } from '../resolution';
import type { Application, Composant } from './application';
import { constatDeChaine, rendreChaine, rendreConstat } from './chaine';
import { TEXTES } from './textes';
import { rendreResultat, rendreSource } from './valeurs';

function section(titre: string): HTMLElement {
  const element = document.createElement('section');
  element.className = 'section';
  const entete = document.createElement('h3');
  entete.className = 'surtitre';
  entete.textContent = titre;
  element.append(entete);
  return element;
}

function ligneDeProvenance(libelle: string, valeur: string): HTMLDivElement {
  const ligne = document.createElement('div');
  ligne.className = 'propriete';
  const nom = document.createElement('dt');
  nom.className = 'propriete-nom';
  nom.textContent = libelle;
  const contenu = document.createElement('dd');
  contenu.className = 'propriete-valeur';
  contenu.textContent = valeur;
  ligne.append(nom, contenu);
  return ligne;
}

export function creerInspecteur(app: Application): Composant {
  const element = document.createElement('aside');
  element.className = 'inspecteur';
  element.setAttribute('aria-label', TEXTES.inspecteur);
  let fondChoisi = '';
  let seuil: number = SEUILS[1];

  function boutonDeCopie(variable: string, format: FormatDeCopie, desactive: boolean, principal = false): HTMLButtonElement {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-discret';
    bouton.classList.toggle('bouton-principal', principal);
    bouton.textContent = TEXTES.copies[format];
    bouton.disabled = desactive;
    bouton.addEventListener('click', () => void app.copier(variable, format));
    return bouton;
  }

  function sectionContraste(variable: string): HTMLElement | null {
    const { index } = app.etat;
    if (!index || index.variables.get(variable)?.type !== 'COLOR') return null;
    const bloc = section(TEXTES.contrasteTitre);
    const choix = document.createElement('select');
    choix.className = 'choix';
    choix.setAttribute('aria-label', TEXTES.contrasteAvec);
    const vide = document.createElement('option');
    vide.value = '';
    vide.textContent = TEXTES.choisirUnFond;
    choix.append(vide);
    for (const candidate of index.releve.variables) {
      if (candidate.type !== 'COLOR' || candidate.id === variable) continue;
      const option = document.createElement('option');
      option.value = candidate.id;
      option.textContent = nomComplet(index, candidate.id);
      option.selected = candidate.id === fondChoisi;
      choix.append(option);
    }
    choix.addEventListener('change', () => {
      fondChoisi = choix.value;
      app.rendre(['inspecteur']);
    });
    const seuils = document.createElement('select');
    seuils.className = 'choix';
    seuils.setAttribute('aria-label', TEXTES.contrasteSeuil);
    for (const valeur of SEUILS) {
      const option = document.createElement('option');
      option.value = String(valeur);
      option.textContent = `${String(valeur).replace('.', ',')}:1`;
      option.selected = valeur === seuil;
      seuils.append(option);
    }
    seuils.addEventListener('change', () => {
      seuil = Number(seuils.value);
      app.rendre(['inspecteur']);
    });
    const ligne = document.createElement('div');
    ligne.className = 'ligne-de-champs';
    ligne.append(choix, seuils);
    bloc.append(ligne);
    if (fondChoisi && index.variables.has(fondChoisi)) {
      const jugement = jugerContraste(app.resultat(variable), app.resultat(fondChoisi), seuil);
      const verdict = document.createElement('p');
      verdict.className = 'verdict';
      verdict.dataset.contraste = jugement.statut === 'juge' ? (jugement.atteint ? 'atteint' : 'manque') : 'non-juge';
      verdict.textContent = jugement.statut === 'juge' ? TEXTES.contrasteRatio(jugement.affiche, jugement.seuil, jugement.atteint) : TEXTES.contrasteNonJuge[jugement.raison];
      bloc.append(verdict);
    }
    return bloc;
  }

  return {
    element,
    mettreAJour() {
      const { etat } = app;
      const { index } = etat;
      const variable = etat.position.inspectee;
      element.classList.toggle('inspecteur-ouvert', Boolean(variable));
      if (!index || !variable) {
        const vide = document.createElement('p');
        vide.className = 'note';
        vide.textContent = TEXTES.aucunToken;
        element.replaceChildren(vide);
        return;
      }
      const trouvee = index.variables.get(variable);
      const resultat = app.resultat(variable);

      const tete = document.createElement('div');
      tete.className = 'inspecteur-tete';
      const titre = document.createElement('h2');
      titre.className = 'inspecteur-titre';
      titre.textContent = trouvee ? trouvee.nom : TEXTES.cibleInconnue(variable);
      const fermer = document.createElement('button');
      fermer.type = 'button';
      fermer.className = 'bouton-discret';
      fermer.classList.add('fermer-inspecteur');
      fermer.textContent = TEXTES.fermer;
      fermer.addEventListener('click', () => {
        etat.position = { ...etat.position, inspectee: null };
        app.rendre(['inspecteur', 'table', 'vue']);
      });
      const type = document.createElement('span');
      type.className = 'pastille-texte';
      type.textContent = trouvee ? TEXTES.types[trouvee.type] : '';
      type.hidden = !trouvee;
      tete.append(type, fermer);
      const sousTitre = document.createElement('p');
      sousTitre.className = 'note';
      sousTitre.textContent = trouvee ? index.collections.get(trouvee.collection)?.nom ?? '' : '';

      const valeur = section(TEXTES.valeurTerminale);
      valeur.classList.add('carte-valeur');
      const resultatRendu = rendreResultat(resultat);
      resultatRendu.classList.add('valeur-grande');
      valeur.append(resultatRendu);
      const constat = constatDeChaine(app, resultat);
      if (constat) valeur.append(rendreConstat(constat));
      const copies = document.createElement('div');
      copies.className = 'copies';
      copies.setAttribute('role', 'group');
      copies.setAttribute('aria-label', TEXTES.copier);
      const resolu = resultat.statut === 'resolu';
      const couleur = resolu && resultat.valeur.nature === 'couleur';
      const copier = document.createElement('span');
      copier.className = 'note';
      copier.textContent = TEXTES.copier;
      copier.setAttribute('aria-hidden', 'true');
      copies.append(
        copier,
        boutonDeCopie(variable, 'valeur', !resolu, true),
        ...(couleur ? [boutonDeCopie(variable, 'hexa', false), boutonDeCopie(variable, 'composantes', false)] : []),
        boutonDeCopie(variable, 'nom', !trouvee),
        boutonDeCopie(variable, 'chaine', false),
        boutonDeCopie(variable, 'source', resultat.etapes.length === 0),
      );
      const haut = document.createElement('div');
      haut.className = 'inspecteur-haut';
      haut.append(tete, titre, sousTitre);

      const chaine = section(TEXTES.chaineDeResolution);
      chaine.append(rendreChaine(app, resultat, (cible) => app.suivre(cible)));

      const parties: HTMLElement[] = [haut, valeur, copies, chaine];

      if (trouvee) {
        const collection = index.collections.get(trouvee.collection);
        const modes = section(TEXTES.valeursParMode);
        const liste = document.createElement('dl');
        liste.className = 'proprietes';
        const actif = collection ? modePour(index, collection, etat.contexte).mode : null;
        for (const mode of collection?.modes ?? []) {
          const ligne = document.createElement('div');
          ligne.className = 'propriete';
          ligne.classList.toggle('propriete-active', mode.id === actif);
          const nom = document.createElement('dt');
          nom.className = 'propriete-nom';
          nom.textContent = mode.id === collection?.modeParDefaut ? TEXTES.defautDeFamille(mode.nom) : mode.nom;
          const contenu = document.createElement('dd');
          contenu.className = 'propriete-valeur';
          const source = valeurPourLeMode(index, variable, trouvee.collection, mode.id)?.valeur;
          if (source) contenu.append(rendreSource(index, source, (cible) => app.suivre(cible), { variable, mode: mode.id }));
          const resultatDuMode = app.resultat(variable, mode.id);
          const rendu = rendreResultat(resultatDuMode);
          rendu.dataset.chaine = variable;
          rendu.dataset.mode = mode.id;
          contenu.append(rendu);
          ligne.append(nom, contenu);
          liste.append(ligne);
        }
        modes.append(liste);
        parties.push(modes);

        const provenance = section(TEXTES.provenance);
        const proprietes = document.createElement('dl');
        proprietes.className = 'proprietes';
        proprietes.append(
          ligneDeProvenance(TEXTES.collection, collection?.nom ?? trouvee.collection),
          ligneDeProvenance(TEXTES.provenance, trouvee.distante ? TEXTES.distanteBibliotheque : TEXTES.locale),
          ligneDeProvenance(TEXTES.identifiant, trouvee.id),
          ligneDeProvenance(TEXTES.clePubliee, trouvee.cle ?? TEXTES.aucune),
          ligneDeProvenance(TEXTES.portees, trouvee.portees.length ? trouvee.portees.join(', ') : TEXTES.aucune),
          ligneDeProvenance(TEXTES.syntaxe, Object.entries(trouvee.syntaxe).map(([plateforme, code]) => `${plateforme} ${code}`).join(' · ') || TEXTES.aucune),
          ...(trouvee.masqueeALaPublication ? [ligneDeProvenance(TEXTES.masquee, TEXTES.vrai)] : []),
          ...(trouvee.description ? [ligneDeProvenance(TEXTES.description, trouvee.description)] : []),
        );
        provenance.append(proprietes);
        parties.push(provenance);

        const modesDuContexte = new Set(index.releve.collections.map((candidate) => modePour(index, candidate, etat.contexte).mode));
        const dansLeContexte = dependantsDirects(index, variable, modesDuContexte);
        const tous = dependantsDirects(index, variable);
        const dependants = section(TEXTES.dependantsTitre);
        const compte = document.createElement('p');
        compte.className = 'note';
        compte.textContent = TEXTES.dependantsDirects(dansLeContexte.length, tous.length);
        dependants.append(compte);
        const liens = document.createElement('ul');
        liens.className = 'liens';
        for (const id of dansLeContexte.slice(0, 50)) {
          const element = document.createElement('li');
          const bouton = document.createElement('button');
          bouton.type = 'button';
          bouton.className = 'lien';
          bouton.textContent = nomComplet(index, id);
          bouton.dataset.chaine = id;
          bouton.dataset.mode = '';
          bouton.addEventListener('click', () => app.suivre(id));
          element.append(bouton);
          liens.append(element);
        }
        dependants.append(liens);
        parties.push(dependants);
      }

      const contraste = sectionContraste(variable);
      if (contraste) parties.push(contraste);
      for (const fabrique of app.sectionsDeLInspecteur) {
        const ajoutee = fabrique(variable);
        if (ajoutee) parties.push(ajoutee);
      }
      const defilement = element.scrollTop;
      element.replaceChildren(...parties);
      element.scrollTop = defilement;
    },
  };
}

