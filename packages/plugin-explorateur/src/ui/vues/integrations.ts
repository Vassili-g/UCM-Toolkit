/**
 * Intégrations : contrats et tokens UCM importés, recette UCM Palettes et
 * profil d'architecture UCM. Chacune s'active explicitement ; désactivée,
 * elle ne produit aucun constat et ne change ni la table ni la navigation.
 * Leurs sections de l'inspecteur s'enregistrent ici.
 */
import { nomComplet } from '../../copie';
import {
  classerImport,
  correspondance,
  ecartsAvecLExport,
  occurrencesDeLaVariable,
  variablesParChemin,
  type ContratImporte,
  type RefusDImport,
  type TokensImportes,
} from '../../integrations/contrats';
import { cransDeLaPalette, variablesDeLAssociation, intensitesDeLaPalette, lireLaRecette, validerAssociation, type AssociationDeCran } from '../../integrations/palettes';
import { COUCHES, controlerLeProfil, coucheRangee, variableDuNom, type AssociationDesCouches, type ConstatDuProfil } from '../../integrations/profilUcm';
import type { Recette } from 'ucm-couleur';
import type { Application, Composant } from '../application';
import { versSandbox } from '../pont';
import { TEXTES } from '../textes';
import { nomDeCible } from '../valeurs';
import { boutonDiscret, choixDeFichier, lienVersVariable, note, titreDeVue } from './outils';

function sousTitre(texte: string): HTMLHeadingElement {
  const titre = document.createElement('h3');
  titre.className = 'surtitre';
  titre.textContent = texte;
  return titre;
}

function texteDuRefus(refus: RefusDImport): string {
  switch (refus.raison) {
    case 'taille':
      return TEXTES.importTropGrand(refus.limite);
    case 'ensemble':
      return TEXTES.importEnsembleTropGrand(refus.limite);
    case 'illisible':
      return TEXTES.importIllisible;
    case 'inconnu':
      return TEXTES.importInconnu;
    case 'version':
      return TEXTES.importVersion(refus.version);
    case 'structure':
      return TEXTES.importInvalide(refus.detail);
  }
}

/** La recette courante, quand l'intégration Palettes est active et que la recette se lit. */
export function recetteLue(app: Application): Recette | null {
  const { preferences, recette } = app.etat;
  if (!preferences.palettes || !recette?.texte) return null;
  const classement = lireLaRecette(recette.texte);
  return classement.etat === 'courante' ? classement.recette : null;
}

/** L'association des couches du fichier ouvert, d'après les préférences. */
export function couchesDuFichier(app: Application): AssociationDesCouches {
  const fichier = app.etat.releve?.fichier ?? '';
  const brute = app.etat.preferences.associations[fichier] ?? {};
  return Object.fromEntries(Object.entries(brute).flatMap(([collection, couche]) => {
    const lue = coucheRangee(couche);
    return lue ? [[collection, lue]] : [];
  }));
}

/** Les écarts au profil, quand le profil est actif. */
export function constatsDuProfil(app: Application): ConstatDuProfil[] {
  const { index, preferences, releve } = app.etat;
  if (!index || !preferences.profilUcm) return [];
  const exceptions = new Set(preferences.exceptions[releve?.fichier ?? ''] ?? []);
  return controlerLeProfil(index, couchesDuFichier(app), { recette: recetteLue(app), exceptions });
}

export function creerVueIntegrations(app: Application): Composant {
  const element = document.createElement('div');
  element.className = 'vue';
  let refus: string | null = null;

  const champ = document.createElement('input');
  champ.type = 'file';
  champ.accept = '.json,application/json';
  champ.multiple = true;
  champ.className = 'champ-fichier';
  champ.setAttribute('aria-label', TEXTES.importer);
  champ.addEventListener('change', async () => {
    const fichiers = Array.from(champ.files ?? []);
    champ.value = '';
    const messages: string[] = [];
    for (const fichier of fichiers) {
      const texte = await fichier.text();
      const tailleDesAutres = app.etat.imports.reduce((total, importe) => total + importe.taille, 0);
      const issue = classerImport(fichier.name, texte, tailleDesAutres);
      if ('refus' in issue) messages.push(TEXTES.importRefuse(fichier.name, texteDuRefus(issue.refus)));
      else app.etat.imports = [...app.etat.imports.filter((importe) => importe.fichier !== fichier.name), issue.import];
    }
    refus = messages.length > 0 ? messages.join(' ') : null;
    app.rendre(['vue', 'inspecteur']);
  });

  function interrupteur(libelle: string, aide: string, actif: boolean, changer: (actif: boolean) => void): HTMLElement {
    const ligne = document.createElement('label');
    ligne.className = 'interrupteur-ligne';
    const caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.setAttribute('role', 'switch');
    caseACocher.checked = actif;
    caseACocher.addEventListener('change', () => changer(caseACocher.checked));
    const textes = document.createElement('span');
    const nom = document.createElement('strong');
    nom.className = 'interrupteur-nom';
    nom.textContent = libelle;
    textes.append(nom, note(aide));
    ligne.append(caseACocher, textes);
    return ligne;
  }

  function sectionContrats(): HTMLElement[] {
    const parties: HTMLElement[] = [sousTitre(TEXTES.contratsTitre), note(TEXTES.importerAide), choixDeFichier(champ, TEXTES.importer)];
    if (refus) parties.push(note(refus));
    const liste = document.createElement('ul');
    liste.className = 'liens';
    for (const importe of app.etat.imports) {
      const ligne = document.createElement('li');
      ligne.className = 'ligne-de-lien';
      const description = document.createElement('span');
      description.textContent = importe.genre === 'contrat' ? TEXTES.contratImporte(importe.fichier, importe.version, importe.composant) : TEXTES.tokensImportes(importe.fichier, importe.version, importe.feuilles.size);
      ligne.append(description, boutonDiscret(TEXTES.retirer(importe.fichier), () => {
        app.etat.imports = app.etat.imports.filter((candidat) => candidat !== importe);
        app.rendre(['vue', 'inspecteur']);
      }));
      liste.append(ligne);
    }
    parties.push(liste);
    return parties;
  }

  function sectionPalettes(): HTMLElement[] {
    const { preferences, recette } = app.etat;
    const parties: HTMLElement[] = [sousTitre(TEXTES.palettesTitre), interrupteur(TEXTES.palettesActiver, TEXTES.palettesAide, preferences.palettes, (actif) => {
      app.rangerPreferences({ ...app.etat.preferences, palettes: actif });
      if (actif) versSandbox({ type: 'lire-recette-palettes', demande: app.nouvelleDemande() });
      app.rendre(['vue', 'inspecteur']);
    })];
    if (!preferences.palettes || recette === null) return parties;
    const classement = lireLaRecette(recette.texte ?? '');
    if (classement.etat === 'absente') parties.push(note(TEXTES.recetteAbsente));
    else if (classement.etat === 'illisible') parties.push(note(TEXTES.recetteIllisible));
    else if (classement.etat === 'future') parties.push(note(TEXTES.recetteFuture(classement.version)));
    else parties.push(note(TEXTES.recetteLue(classement.recette.palettes.length)));
    return parties;
  }

  function sectionProfil(): HTMLElement[] {
    const { preferences, index, releve } = app.etat;
    const parties: HTMLElement[] = [sousTitre(TEXTES.profilTitre), interrupteur(TEXTES.profilActiver, TEXTES.profilAide, preferences.profilUcm, (actif) => {
      app.rangerPreferences({ ...app.etat.preferences, profilUcm: actif });
      app.rendre(['vue', 'inspecteur']);
    })];
    if (!preferences.profilUcm || !index || !releve) return parties;
    const couches = couchesDuFichier(app);
    const grille = document.createElement('div');
    grille.className = 'grille-de-couches';
    for (const collection of index.releve.collections) {
      const champCouche = document.createElement('label');
      champCouche.className = 'filtre';
      const nom = document.createElement('span');
      nom.className = 'filtre-nom';
      nom.textContent = collection.nom;
      const choix = document.createElement('select');
      choix.className = 'choix';
      choix.setAttribute('aria-label', TEXTES.coucheDe(collection.nom));
      for (const valeur of ['', ...COUCHES]) {
        const option = document.createElement('option');
        option.value = valeur;
        option.textContent = valeur || TEXTES.sansCouche;
        option.selected = (couches[collection.id] ?? '') === valeur;
        choix.append(option);
      }
      choix.addEventListener('change', () => {
        const actuelles: Record<string, string> = { ...(app.etat.preferences.associations[releve.fichier] ?? {}) };
        if (choix.value) actuelles[collection.id] = choix.value;
        else delete actuelles[collection.id];
        app.rangerPreferences({ ...app.etat.preferences, associations: { ...app.etat.preferences.associations, [releve.fichier]: actuelles } });
        app.rendre(['vue', 'inspecteur']);
      });
      champCouche.append(nom, choix);
      grille.append(champCouche);
    }
    parties.push(grille);
    const constats = constatsDuProfil(app);
    parties.push(note(TEXTES.profilConstats(constats.length)));
    const liste = document.createElement('ul');
    liste.className = 'liens';
    for (const constat of constats.slice(0, 200)) {
      const ligne = document.createElement('li');
      ligne.className = 'constat';
      ligne.dataset.regle = constat.regle;
      const detail = document.createElement('p');
      detail.className = 'constat-detail';
      detail.textContent = texteDuConstatDuProfil(app, constat);
      const action = document.createElement('p');
      action.className = 'constat-action';
      action.textContent = TEXTES.profilRegles[constat.regle].action;
      ligne.append(detail, action, lienVersVariable(app, constat.variable, undefined, 'inspecter'), boutonDiscret(TEXTES.exception, () => {
        const actuelles = app.etat.preferences.exceptions[releve.fichier] ?? [];
        app.rangerPreferences({ ...app.etat.preferences, exceptions: { ...app.etat.preferences.exceptions, [releve.fichier]: [...actuelles, constat.cle] } });
        app.rendre(['vue']);
      }));
      liste.append(ligne);
    }
    parties.push(liste);
    if (constats.length > 0) parties.push(note(TEXTES.exceptionAide));
    return parties;
  }

  app.sectionsDeLInspecteur.push((variable) => sectionContratsDeLInspecteur(app, variable), (variable) => sectionPalettesDeLInspecteur(app, variable), (variable) => sectionProfilDeLInspecteur(app, variable));

  return {
    element,
    mettreAJour() {
      if (!app.etat.index) {
        element.replaceChildren();
        return;
      }
      element.replaceChildren(titreDeVue(TEXTES.integrationsTitre), note(TEXTES.integrationsNote), ...sectionContrats(), ...sectionPalettes(), ...sectionProfil());
    },
  };
}

/** Le texte d'un écart au profil, avec les noms du fichier. */
function texteDuConstatDuProfil(app: Application, constat: ConstatDuProfil): string {
  const index = app.etat.index!;
  const nom = nomDeCible(index, constat.variable);
  switch (constat.regle) {
    case 'couche':
      return TEXTES.profilRegles.couche.detail(nom, nomDeCible(index, constat.cible ?? ''), constat.coucheCible ?? '');
    case 'valeur-directe':
      return TEXTES.profilRegles['valeur-directe'].detail(nom);
    case 'portee':
      return TEXTES.profilRegles.portee.detail(nom, constat.attendue || TEXTES.aucune);
    case 'nuance':
      return TEXTES.profilRegles.nuance.detail(nom, constat.attendue ?? '');
  }
}

function section(titre: string): HTMLElement {
  const element = document.createElement('section');
  element.className = 'section';
  element.append(sousTitre(titre));
  return element;
}

function sectionContratsDeLInspecteur(app: Application, variable: string): HTMLElement | null {
  const { index, imports } = app.etat;
  if (!index || imports.length === 0) return null;
  const bloc = section(TEXTES.contratsTitre);
  const tokens = imports.filter((importe): importe is TokensImportes => importe.genre === 'tokens');
  const contrats = imports.filter((importe): importe is ContratImporte => importe.genre === 'contrat');
  if (tokens.length > 0) {
    const parChemin = variablesParChemin(index);
    for (const fichier of tokens) {
      const trouve = correspondance(index, parChemin, fichier, variable);
      if (!trouve) continue;
      if (trouve.statut === 'ambigue') bloc.append(note(TEXTES.correspondanceAmbigue(trouve.variables.map((id) => nomComplet(index, id)).join(', '))));
      else if (trouve.statut === 'absente') bloc.append(note(TEXTES.correspondanceAbsente));
      else {
        const reference = `{${trouve.chemin}}`;
        bloc.append(note(TEXTES.correspondanceUnique(reference)));
        const copie = boutonDiscret(TEXTES.copies.reference, () => void app.copier(variable, 'reference', reference));
        bloc.append(copie);
        const ecarts = ecartsAvecLExport(index, variable, fichier.feuilles.get(trouve.chemin)!);
        bloc.append(note(ecarts.length === 0 ? TEXTES.aucunEcartExport : ecarts.map((ecart) => `${TEXTES.ecartExport[ecart.ecart]}${ecart.mode ? ` (${ecart.mode})` : ''}`).join(' · ')));
        if (ecarts.length > 0) bloc.append(note(TEXTES.fraicheurExport));
      }
    }
  }
  if (contrats.length > 0) {
    const occurrences = occurrencesDeLaVariable(index, contrats, variable);
    bloc.append(note(occurrences.length === 0 ? TEXTES.aucuneOccurrenceContrat : TEXTES.occurrencesContrat(occurrences.length)));
    const liste = document.createElement('ul');
    liste.className = 'liens';
    for (const { contrat, occurrence } of occurrences.slice(0, 50)) {
      const ligne = document.createElement('li');
      ligne.className = 'note';
      ligne.textContent = TEXTES.occurrenceContrat(contrat.composant, occurrence.variants.join(' ; ') || occurrence.adresse, occurrence.adresse);
      liste.append(ligne);
    }
    bloc.append(liste);
  }
  return bloc;
}

function sectionPalettesDeLInspecteur(app: Application, variable: string): HTMLElement | null {
  const recette = recetteLue(app);
  const { index, crans } = app.etat;
  if (!recette || !index || recette.palettes.length === 0) return null;
  if (index.variables.get(variable)?.type !== 'COLOR') return null;
  const bloc = section(TEXTES.palettesTitre);
  const actuelle = crans.get(variable) ?? null;
  const palette = recette.palettes.find((candidate) => candidate.id === actuelle?.palette) ?? recette.palettes[0];
  const choix = (etiquette: string, valeurs: ReadonlyArray<[string, string]>, retenue: string, changer: (valeur: string) => void) => {
    const champ = document.createElement('label');
    champ.className = 'filtre';
    const nom = document.createElement('span');
    nom.className = 'filtre-nom';
    nom.textContent = etiquette;
    const liste = document.createElement('select');
    liste.className = 'choix';
    for (const [valeur, libelle] of valeurs) {
      const option = document.createElement('option');
      option.value = valeur;
      option.textContent = libelle;
      option.selected = valeur === retenue;
      liste.append(option);
    }
    liste.addEventListener('change', () => changer(liste.value));
    champ.append(nom, liste);
    return champ;
  };
  const brouillon: AssociationDeCran = actuelle ?? { palette: palette.id, intensite: intensitesDeLaPalette(palette)[0], theme: 'light', cran: cransDeLaPalette(recette, palette)[0] };
  const poser = (partielle: Partial<AssociationDeCran>) => {
    const suivante = { ...brouillon, ...partielle };
    if (validerAssociation(index, recette, variable, suivante) === null) crans.set(variable, suivante);
    app.rendre(['inspecteur']);
  };
  const ligne = document.createElement('div');
  ligne.className = 'ligne-de-champs';
  ligne.append(
    choix(TEXTES.associationPalette, recette.palettes.map((candidate) => [candidate.id, candidate.nom ?? candidate.id]), brouillon.palette, (valeur) => {
      const nouvelle = recette.palettes.find((candidate) => candidate.id === valeur)!;
      poser({ palette: valeur, intensite: intensitesDeLaPalette(nouvelle)[0], cran: cransDeLaPalette(recette, nouvelle)[0] });
    }),
    choix(TEXTES.associationIntensite, intensitesDeLaPalette(palette).map((intensite) => [intensite ?? '', intensite ?? '·']), brouillon.intensite ?? '', (valeur) => poser({ intensite: valeur === '' ? null : (valeur as 'soft' | 'vivid') })),
    choix(TEXTES.associationTheme, [['light', 'Light'], ['dark', 'Dark']], brouillon.theme, (valeur) => poser({ theme: valeur as 'light' | 'dark' })),
    choix(TEXTES.associationCran, cransDeLaPalette(recette, palette).map((cran) => [String(cran), String(cran)]), String(brouillon.cran), (valeur) => poser({ cran: Number(valeur) })),
  );
  bloc.append(note(TEXTES.associer), ligne);
  if (actuelle) {
    bloc.append(note(TEXTES.associationEnMemoire), note(TEXTES.sourceRecette));
    const variables = variablesDeLAssociation(recette, actuelle);
    bloc.append(sousTitre(TEXTES.variablesDuCran(String(actuelle.cran))));
    bloc.append(note(variables.length === 0 ? TEXTES.aucuneVariableDuCran : variables.join(', ')));
  }
  return bloc;
}

function sectionProfilDeLInspecteur(app: Application, variable: string): HTMLElement | null {
  const { index, preferences } = app.etat;
  if (!index || !preferences.profilUcm) return null;
  const trouvee = index.variables.get(variable);
  if (!trouvee || couchesDuFichier(app)[trouvee.collection] !== 'theme') return null;
  const lue = variableDuNom(trouvee.nom);
  if (!lue) return null;
  const bloc = section(TEXTES.profilTitre);
  bloc.append(note(TEXTES.variableDuTheme(lue.variable, lue.support.peint.join(', '), lue.support.portees.join(', '))));
  const constats = constatsDuProfil(app).filter((constat) => constat.variable === variable);
  for (const constat of constats) bloc.append(note(texteDuConstatDuProfil(app, constat)));
  return bloc;
}
