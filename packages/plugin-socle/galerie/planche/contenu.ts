/**
 * La planche des signaux du socle : chaque signal du langage visuel, dessiné
 * avec les composants du socle. Elle reproduit le cadre `s-planche` de
 * MAQUETTE-ARCHITECT.html, moins la section Variants et la mesure de contraste,
 * qui ne sont pas des signaux du langage. Les coques (carte, intertitre) n'ont
 * de style que dans `planche.css` : un plugin dessine les siennes.
 */
import { creerAlerte, creerGravite, creerLienExterne, creerPastilleDeCompte, marquerDuTon } from '../../src/ui/Alerte';
import { creerColonnes, creerLigneDeDiff, creerResultat, marquerCarteCiblee } from '../../src/ui/Changement';
import { creerChemin, creerCheminEnPhrase, creerCheminLigne, creerSegmentAncien, creerSegmentNouveau, creerVariantEnPhrase } from '../../src/ui/Chemin';
import { createButton as creerButton } from '../../src/ui/Button';
import { creerChevron } from '../../src/ui/Chevron';
import { creerPuceFiltre, creerRechercheActive } from '../../src/ui/Filtre';
import { creerRenommage } from '../../src/ui/Jeton';

type Partie = string | Node;

function paragraphe(...parties: Partie[]): HTMLParagraphElement {
  const element = document.createElement('p');
  element.append(...parties);
  return element;
}

function groupe(...parties: Partie[]): HTMLSpanElement {
  const element = document.createElement('span');
  element.append(...parties);
  return element;
}

function intertitre(texte: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'intertitre';
  const titre = document.createElement('h2');
  titre.textContent = texte;
  element.append(titre);
  return element;
}

function lien(texte: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'btn-texte';
  element.textContent = texte;
  return element;
}

/** Une carte dont la tête porte une case, des jetons et un compte, ouverte sur un diff. */
function carteOuverte(): HTMLDivElement {
  const carte = document.createElement('div');
  carte.className = 'carte';
  marquerCarteCiblee(carte);
  const tete = document.createElement('div');
  tete.className = 'tete';
  const caseACocher = document.createElement('input');
  caseACocher.type = 'checkbox';
  caseACocher.className = 'case';
  caseACocher.checked = true;
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'tete-bouton';
  bouton.setAttribute('aria-expanded', 'true');
  const pile = document.createElement('div');
  pile.className = 'pile';
  const regle = document.createElement('span');
  regle.className = 'regle-ligne';
  regle.append(...creerRenommage('bg', 'background'));
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = '12 variables';
  pile.append(regle, meta);
  const droite = document.createElement('span');
  droite.className = 'droite';
  droite.append(creerChevron());
  bouton.append(pile, droite);
  tete.append(caseACocher, bouton);
  const corps = document.createElement('div');
  corps.className = 'corps';
  corps.append(
    creerColonnes('Aujourd’hui', 'Après l’application'),
    creerLigneDeDiff(groupe('Button/', creerSegmentAncien('bg'), '/default'), groupe('Button/', creerSegmentNouveau('background'), '/default')),
  );
  carte.append(tete, corps);
  return carte;
}

/** La tête d'un constat dans une liste : le type, la phrase, le lieu, ce qu'il reste à faire. */
function constat(): HTMLDivElement {
  const carte = document.createElement('div');
  carte.className = 'carte constat';
  marquerDuTon(carte, 'verifier');
  const tete = document.createElement('div');
  tete.className = 'tete sans-coche';
  const pile = document.createElement('div');
  pile.className = 'pile';
  const titre = document.createElement('span');
  titre.className = 'constat-titre';
  const phrase = document.createElement('span');
  phrase.className = 'phrase-regle';
  phrase.append(creerVariantEnPhrase('Severity=warning', 'Variant=filled'), ' n’existe pas.');
  titre.append(creerGravite('verifier'), phrase);
  const meta = document.createElement('span');
  meta.className = 'meta';
  const lieu = document.createElement('span');
  lieu.className = 'constat-lieu';
  lieu.textContent = 'Section Variants';
  const statut = document.createElement('span');
  statut.className = 'constat-statut';
  statut.textContent = 'Créez le variant, ou ignorez ce constat';
  meta.append(lieu, document.createElement('br'), statut);
  pile.append(titre, meta);
  tete.append(pile);
  carte.append(tete);
  return carte;
}

function boutonDuPanneau(): HTMLButtonElement {
  const bouton = creerButton({ label: 'Constats', variant: 'secondary', compact: true });
  bouton.classList.add('bouton-panneau');
  bouton.setAttribute('aria-pressed', 'false');
  const espace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(espace, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.3');
  const cadre = document.createElementNS(espace, 'rect');
  for (const [nom, valeur] of Object.entries({ x: '1.5', y: '2.5', width: '13', height: '11', rx: '1.5' })) cadre.setAttribute(nom, valeur);
  const trait = document.createElementNS(espace, 'path');
  trait.setAttribute('d', 'M10 2.5v11');
  svg.append(cadre, trait);
  bouton.prepend(svg);
  bouton.append(creerPastilleDeCompte(19, 'corriger'));
  return bouton;
}

export function montrerLaPlanche(hote: HTMLElement): void {
  const recherche = creerRechercheActive('terme:background', 'Recherche');
  for (const [nom, valeur] of Object.entries({ width: '220px', height: '28px', padding: '0 8px', borderRadius: '5px', background: 'transparent', color: 'inherit', border: '1px solid' })) {
    (recherche.style as unknown as Record<string, string>)[nom] = valeur;
  }
  const rangee = (...parties: Partie[]): HTMLParagraphElement => {
    const element = paragraphe(...parties);
    element.className = 'planche-rangee';
    return element;
  };

  hote.append(
    intertitre('Chemins'),
    paragraphe('Un chemin seul dans sa colonne : ', creerChemin('theme/primary/surface/default')),
    paragraphe('Un chemin dans une phrase : la variable ', creerCheminEnPhrase('theme/info/soft/page/foreground'), ' vise ', creerCheminEnPhrase('brands/info/light/700'), '.'),
    paragraphe('Un variant dans une phrase : le texte de ', creerVariantEnPhrase('Severity=warning', 'Variant=standard'), ' manque de contraste.'),
    paragraphe('Un groupe mis en avant : ', creerChemin('Modal/backgrond/default', { vus: ['backgrond'] })),
    paragraphe('Une variable mise en avant : ', creerChemin('Card/bg/default', { vus: ['default'] })),
    paragraphe('Un renommage dans une liste : ', creerChemin('Button/background/hover', { ajouts: ['background'], lien: true })),
    paragraphe(
      'Un changement en deux colonnes : ',
      creerCheminLigne('colors/', creerSegmentAncien('info'), '/standard/icon'),
      ' → ',
      creerCheminLigne('colors/', creerSegmentNouveau('success'), '/standard/icon'),
    ),
    paragraphe('Un terme isolé dans une règle : ', ...creerRenommage('bg', 'background')),
    intertitre('Échelle des alertes'),
    rangee(creerGravite('bloquant'), creerGravite('corriger'), creerGravite('verifier'), creerGravite('info'), creerGravite('tenu')),
    creerAlerte('bloquant', { titre: 'L’analyse s’est arrêtée.', texte: 'Deux variant properties s’écrivent State et state.' }),
    creerAlerte('info', { titre: 'Ces variables viennent de la library Intencial Tokens.', actions: [creerLienExterne('Ouvrir Intencial Tokens')] }),
    creerAlerte('tenu', { titre: 'Aucun constat sur les 11 variants.' }),
    intertitre('Constat dans une liste'),
    constat(),
    intertitre('Carte ciblée'),
    carteOuverte(),
    intertitre('Fait'),
    creerResultat('8 layers liés', 'Ctrl+Z dans Figma défait ce lot.'),
    intertitre('Filtres'),
    paragraphe(recherche, ' ', creerPuceFiltre('collection', 'Interface', 'Enlever le filtre')),
    intertitre('Actions'),
    rangee(
      creerButton({ label: 'Appliquer', variant: 'primary', compact: true }),
      creerButton({ label: 'Analyser', variant: 'secondary', compact: true }),
      lien('Plus tard'),
      creerButton({ label: 'Supprimer', variant: 'danger', compact: true }),
      boutonDuPanneau(),
    ),
  );
}
