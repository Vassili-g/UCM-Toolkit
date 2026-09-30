#!/usr/bin/env node
/**
 * Écrit PROPOSITION-TROIS-ETAPES.html à côté de ce script :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/04 Parcours en trois étapes/generer-proposition-trois-etapes.mjs"
 *
 * Les rampes, les contrastes et les corrections viennent du moteur, sur la
 * recette par défaut. Une rampe existante se juge comme des retouches sur les
 * nuances qui diffèrent de la rampe calculée.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ancrageDe,
  associationDe,
  atteintLeSeuil,
  contraste,
  distanceDePalettes,
  ecrireHexa,
  lireHexa,
  rampesDe,
  recetteParDefaut,
  verifierPromesses,
} from '../../../../../../packages/couleur/src/index.ts';
import { nouvellePalette } from '../../../../../../packages/plugin-palettes/src/edition.ts';

const ICI = dirname(fileURLToPath(import.meta.url));
const R = recetteParDefaut();
const CRANS = R.crans;
const FONDS = R.fonds;

// ---------------------------------------------------------------- moteur
function palette(nom, hexa, intensites, id) {
  const p = nouvellePalette(R, id, hexa, intensites);
  const recette = { ...R, palettes: [p] };
  const brutes = rampesDe(recette, p);
  const rampes = {};
  for (const [profil, parMode] of Object.entries(brutes)) {
    rampes[profil] = { light: parMode.light.map((c) => ecrireHexa(c.couleur)), dark: parMode.dark.map((c) => ecrireHexa(c.couleur)) };
  }
  const ancrage = ancrageDe(recette, p);
  const porteur = intensites === 1 ? 'unique' : ancrage.profil;
  return { nom, hexa, p, recette, rampes, rang: ancrage.rangs, porteur, vive: (rampes.vivid ?? rampes.unique) };
}
const cle = (profil, mode, cran) => `${profil}/${mode}/${cran}`;
/** Les paires jugées sur les valeurs finales : la rampe du moteur et les nuances remplacées. */
function paires(pal, remplacees = {}) {
  return verifierPromesses(pal.recette, pal.p).map((x) => {
    const couleur = (m) => (m.nature === 'cran' && remplacees[cle(x.profil, x.mode, m.cran)] ? lireHexa(remplacees[cle(x.profil, x.mode, m.cran)]) : m.couleur);
    const valeur = contraste(couleur(x.premier), couleur(x.second));
    return { ...x, contraste: valeur, tenue: atteintLeSeuil(valeur, x.seuil) };
  });
}
const sousLeSeuil = (liste) => liste.filter((x) => !x.tenue);
const virgule = (x, n = 2) => x.toFixed(n).replace('.', ',');

const bleu = palette('Bleu A', '#1E6FD9', 1, 'p-00000001');
const rouge = palette('Rouge', '#DC2626', 2, 'p-00000002');
const ambre = palette('Ambre', '#D97706', 2, 'p-00000003');
const vert = palette('Vert', '#16A34A', 2, 'p-00000004');
const azur = palette('Azur', '#2563EB', 2, 'p-00000005');
const orange = palette('Orange A', '#E08A00', 1, 'p-00000006');
const bleuK = palette('Bleu K', '#1D4ED8', 1, 'p-00000007');
const neutre = palette('Neutre', '#808080', 1, 'p-00000008');

const PAIRES_BLEU = paires(bleu).length;

// Une rampe faite à l'œil, lue dans la sélection : le 600 est la couleur de la charte.
const OEIL = ['#E8F1FD', '#C7DCFA', '#9DC2F6', '#6FA5F0', '#4A8EEA', '#3480E6', '#1E6FD9', '#1B63C4', '#1856A9', '#134385', '#0D2E5C'];
const calculee = bleu.rampes.unique.light;
const remplaceesOeil = Object.fromEntries(OEIL.map((h, i) => [cle('unique', 'light', CRANS[i]), h]).filter(([, h], i) => h !== calculee[i]));
const ecartsOeil = sousLeSeuil(paires(bleu, remplaceesOeil));
/** La plus petite correction : rétablir une à une les nuances qui rendent le plus de paires. */
function corriger(remplacees) {
  const courant = { ...remplacees };
  const rendues = [];
  const cible = sousLeSeuil(paires(bleu)).length;
  while (sousLeSeuil(paires(bleu, courant)).length > cible) {
    let meilleur = null;
    for (const k of Object.keys(courant)) {
      const essai = { ...courant };
      delete essai[k];
      const n = sousLeSeuil(paires(bleu, essai)).length;
      if (!meilleur || n < meilleur.n) meilleur = { k, n };
    }
    delete courant[meilleur.k];
    rendues.push(Number(meilleur.k.split('/')[2]));
  }
  return rendues.sort((a, b) => a - b);
}
const CORRIGEES = corriger(remplaceesOeil);
const apresCorrection = OEIL.map((h, i) => (CORRIGEES.includes(CRANS[i]) ? calculee[i] : h));
const gardees = Object.keys(remplaceesOeil).length - CORRIGEES.length;
const MOTS = { text: 'texte', surface: 'fond coloré', 'surface-card': 'carte colorée', 'border-control': 'bordure de champ', solid: 'bouton plein', focus: 'anneau de focus', 'on-solid': 'texte sur bouton' };
/** « texte 800 sur fond coloré 200 : 3,90:1 » */
function enMots(x) {
  const a = associationDe(x.paire);
  const nom = (emploi, membre) => `${MOTS[emploi] ?? emploi}${membre.nature === 'cran' ? ` ${membre.cran}` : ''}`;
  return `${nom(a.premier, x.premier)} sur ${a.second === 'fond' ? 'le fond de page' : nom(a.second, x.second)} : ${virgule(x.contraste)}:1`;
}
const listeCrans = (c) => c.join(', ').replace(/, (\d+)$/, ' et $1');

// Une couleur de Rouge changée dans Figma : la référence collée au 700 Vivid Light.
const RETOUCHE = { cran: 700, figma: '#DC2626' };
const rouge700 = rouge.rampes.vivid.light[CRANS.indexOf(RETOUCHE.cran)];
const perduesRetouche = sousLeSeuil(paires(rouge, { [cle('vivid', 'light', RETOUCHE.cran)]: RETOUCHE.figma }));

// Deux palettes qui se ressemblent.
const distance = (a, b) => distanceDePalettes({ ...R, palettes: [a.p, b.p] }, a.p, b.p);
const dAmbreOrange = distance(ambre, orange);
const dBleuBleuK = distance(bleu, bleuK);

// Le scénario de la relecture : Bleu A, faite à l'œil, corrige 3 nuances ; l'intensité Soft
// passe à 0,50 (Ambre et Vert) ; une couleur de Rouge a été modifiée dans Figma.
function hexasDe(recette, p) {
  const r = rampesDe({ ...recette, palettes: [p] }, p);
  return Object.values(r).flatMap((parMode) => [...parMode.light, ...parMode.dark].map((c) => ecrireHexa(c.couleur)));
}
const differences = (a, b) => a.filter((h, i) => h !== b[i]).length;
const recetteSoft = { ...R, profils: { ...R.profils, soft: { part: 0.5 } } };
const CHANGEMENTS = {
  bleu: CORRIGEES.length,
  ambre: differences(hexasDe(R, ambre.p), hexasDe(recetteSoft, ambre.p)),
  vert: differences(hexasDe(R, vert.p), hexasDe(recetteSoft, vert.p)),
};
const COULEURS_QUI_CHANGENT = CHANGEMENTS.bleu + CHANGEMENTS.ambre + CHANGEMENTS.vert;

// ---------------------------------------------------------------- briques
const encre = (hexa) => (contraste(lireHexa(hexa), lireHexa('#000000')) >= contraste(lireHexa(hexa), lireHexa('#FFFFFF')) ? '#111' : '#FFF');
const rampe = (hexas, { h = 22, marques = {}, points = [] } = {}) => `<div class="rampe" style="--h:${h}px">${hexas.map((x, i) => `<i style="background:${x};color:${encre(x)}">${marques[i] ?? ''}${points.includes(CRANS[i]) ? '<b class="point"></b>' : ''}</i>`).join('')}</div>`;
const numeros = `<div class="rampe numeros">${CRANS.map((c) => `<span>${c}</span>`).join('')}</div>`;
const surface = (contenu, mode = 'light') => `<div class="surface" style="background:${FONDS[mode]};color:${mode === 'light' ? '#1E1E1E' : '#EDEDED'}">${contenu}</div>`;
const b = (texte, sorte = '') => `<span class="b ${sorte}">${texte}</span>`;
const section = (titre, resume = '', ouverte = false, contenu = '') => `<div class="sect${ouverte ? ' ouverte' : ''}"><div class="sect-tete"><span class="chev">${ouverte ? '▾' : '▸'}</span><b>${titre}</b><span class="sec">${resume}</span></div>${ouverte ? `<div class="sect-corps">${contenu}</div>` : ''}</div>`;
const code = (t) => `<code>${t}</code>`;

/** Un écran du plugin, 600 × 720, avec ses trois onglets et sa barre d'action. */
function plugin({ onglet = 'Palettes', corps, pied = '', piedAide = '', selecteur = 'Bleu A', voile = '', sansSelecteur = false }) {
  const onglets = ['Palettes', 'Vérifier', 'Appliquer'].map((o, i) => `<span class="${o === onglet ? 'on' : ''}"><em>${i + 1}</em>${o}</span>`).join('');
  return `<div class="plugin">
    <div class="p-tete"><b>UCM Palettes</b><span class="sec">⚙ Réglages</span></div>
    <div class="p-onglets">${onglets}</div>
    <div class="p-corps">
      ${sansSelecteur ? '' : `<div class="p-select"><div class="champ"><span>${selecteur}</span><span class="sec">▾</span></div>${b('+ Nouvelle')}</div>`}
      ${corps}
    </div>
    ${pied ? `<div class="p-pied"><span class="sec">${piedAide}</span>${pied}</div>` : ''}
    ${voile}
  </div>`;
}

// ---------------------------------------------------------------- écrans
const ecranDepart = plugin({
  onglet: 'Palettes',
  sansSelecteur: true,
  corps: `<h3>D'où partez-vous ?</h3>
    <p class="sec">Choisissez ce que vous avez déjà. Tout se règle ensuite.</p>
    <div class="choix-grand"><b>D'une couleur</b><span class="sec">Une couleur de charte, saisie ou prise dans la sélection. Le plugin calcule la rampe.</span></div>
    <div class="choix-grand"><b>De couleurs existantes</b><span class="sec">Les pastilles sélectionnées, ou un groupe de variables du fichier. Le plugin les mesure et propose des corrections.</span></div>
    <div class="choix-grand"><b>D'un jeu de départ</b><span class="sec">Un neutre, quatre couleurs de statut et une ligne par marque. Pour un design system neuf.</span></div>`,
  pied: '',
});

const ecranPalettes = plugin({
  onglet: 'Palettes',
  corps: `<div class="titre"><h3>Bleu A</h3><span class="sec">Marque A · primary · ${Object.keys(remplaceesOeil).length} nuances reprises de vos couleurs</span></div>
    <div class="deux"><div><span class="lib">Nom</span><div class="champ">Bleu A</div></div><div><span class="lib">Couleur de référence</span><div class="champ"><i class="pastille" style="background:${bleu.hexa}"></i>${bleu.hexa}</div></div></div>
    <div class="carte">
      <div class="ligne"><span class="bascule"><span class="on">Light</span><span>Dark</span></span><span class="sec">Fond ${FONDS.light}</span></div>
      ${surface(`${numeros}${rampe(OEIL, { marques: { [bleu.rang.light]: '◆' } })}<div class="ligne petit"><span>◆ Votre couleur, exacte</span></div>`)}
    </div>
    ${section('Destination dans Figma', 'Marque A · primary')}
    ${section('Réglages de couleur', 'Teinte, saturation, luminosité')}
    ${section('En contexte', 'Un écran peint avec cette palette')}`,
  piedAide: `${PAIRES_BLEU} paires de contraste · 2 thèmes`,
  pied: b('Vérifier →', 'principal'),
});

const ecranVerifier = plugin({
  onglet: 'Vérifier',
  corps: `<div class="titre"><h3>Vérifier Bleu A</h3><span class="sec">${PAIRES_BLEU} contrastes mesurés, Light et Dark</span></div>
    <div class="verdict ko"><b>${ecartsOeil.length} contrastes trop faibles, Thème Light</b>${ecartsOeil.map((x) => `<span>${enMots(x)}, minimum ${virgule(x.seuil, 1)}:1</span>`).join('')}</div>
    <div class="carte correction">
      <b>Correction proposée : changer ${CORRIGEES.length} nuances sur ${OEIL.length}</b>
      <span class="sec">Les nuances ${listeCrans(CORRIGEES)} prennent la valeur calculée. Les ${gardees} autres gardent votre dessin.</span>
      <div class="avap">
        <span class="sec petit">Avant</span>${surface(rampe(OEIL, { h: 18, points: CORRIGEES, marques: { 6: '◆' } }))}
        <span class="sec petit">Après</span>${surface(rampe(apresCorrection, { h: 18, marques: { 6: '◆' } }))}
      </div>
      <div class="ligne"><span class="ok">Après : toutes les paires atteignent leur seuil</span>${b('Corriger ces nuances')}</div>
    </div>
    ${section('Toutes les paires', `${PAIRES_BLEU} paires, Light et Dark`)}
    ${section('Distinguer les statuts', 'Avec Marque A · daltonisme')}
    ${section('Comparer à une autre palette')}`,
  selecteur: 'Bleu A',
  piedAide: 'La correction ne touche que la recette. Figma change à l’étape 3.',
  pied: b('Préparer l’application →', 'principal'),
});

const ecranAppliquer = plugin({
  onglet: 'Appliquer',
  corps: `<div class="titre"><h3>Appliquer</h3><span class="sec">Ce qui sera mis à jour dans ce fichier</span></div>
    <div class="bascule large"><span>Bleu A seulement</span><span class="on">Toutes les palettes modifiées (4)</span></div>
    <div class="carte liste">
      ${[['Bleu A', bleu.hexa, `${CORRIGEES.length} nuances corrigées`], ['Rouge', rouge.hexa, '1 couleur modifiée dans Figma'], ['Ambre', ambre.hexa, 'Réglages communs'], ['Vert', vert.hexa, 'Réglages communs']].map(([n, h, d]) => `<div class="ligne-pal"><span class="case on">✓</span><i class="pastille" style="background:${h}"></i><b>${n}</b><span class="sec">${d}</span></div>`).join('')}
    </div>
    <div class="carte liste">
      <div class="ligne-pal"><span class="case on">✓</span><b>Variables</b><span class="sec">les couleurs que les composants utilisent</span></div>
      <div class="ligne-pal"><span class="case on">✓</span><b>Planches</b><span class="sec">la documentation sur la page « Palettes »</span></div>
    </div>`,
  selecteur: 'Bleu A',
  piedAide: 'Rien n’est écrit avant la relecture.',
  pied: b('Relire les changements →', 'principal'),
});

const ecranRelire = plugin({
  onglet: 'Appliquer',
  corps: '',
  voile: `<div class="voile"><div class="feuille">
    <div class="f-tete"><b>Relire avant d'appliquer</b><span class="sec">4 palettes</span></div>
    <div class="f-corps">
      <p><b>${COULEURS_QUI_CHANGENT} couleurs changent dans Figma, et 4 planches sont redessinées.</b> Aucune couleur n'est créée ni supprimée.</p>
      <div class="carte decision">
        <b>Rouge : une couleur a été modifiée dans Figma</b>
        <span class="sec">Vivid · Light · nuance ${RETOUCHE.cran}. Elle sert au texte et aux boutons pleins.</span>
        <div class="deux-couleurs"><div><i style="background:${rouge700}"></i><span>Plugin</span><code>${rouge700}</code></div><div><i style="background:${RETOUCHE.figma}"></i><span>Figma</span><code>${RETOUCHE.figma}</code></div></div>
        <div class="option"><span class="radio"></span><div><b>Garder la couleur de Figma</b><span class="ko">${perduesRetouche.length} textes passent sous 4,5:1</span></div></div>
        <div class="option"><span class="radio"></span><div><b>Remettre la couleur du plugin</b><span class="ok">Tous les contrastes tiennent</span></div></div>
        <span class="sec petit">Sans choix, cette couleur reste telle quelle et le reste s'applique.</span>
      </div>
      ${section('Détail technique', 'collections, variables, valeurs par mode')}
    </div>
    <div class="f-pied">${b('Annuler')}${b('Appliquer à Figma', 'principal')}</div>
  </div></div>`,
});

const ecranDestination = plugin({
  onglet: 'Palettes',
  corps: `<div class="titre"><h3>Bleu</h3></div>
    ${section('Destination dans Figma', '', true, `
      <span class="lib">Où vont ces couleurs ?</span>
      <div class="option"><span class="radio"></span><div><b>Dans le système UCM</b><span class="sec">Une marque et une famille : le plugin crée les variables et leurs alias.</span></div></div>
      <div class="option on"><span class="radio on"></span><div><b>Dans mes variables</b><span class="sec">Le plugin remplit des variables qui existent déjà.</span></div></div>
      <div class="deux"><div><span class="lib">Collection</span><div class="champ">Colors ▾</div></div><div><span class="lib">Nom des variables</span><div class="champ">color/blue/{nuance}</div></div></div>
      <div class="deux"><div><span class="lib">Light dans le mode</span><div class="champ">Light ▾</div></div><div><span class="lib">Dark dans le mode</span><div class="champ">Dark ▾</div></div></div>
      <span class="ok">10 variables trouvées sur 11.</span> <span class="sec">color/blue/950 n'existe pas : elle sera créée si vous le demandez.</span>
      <div class="option"><span class="radio"></span><div><b>Nulle part</b><span class="sec">Seulement une planche de documentation.</span></div></div>`)}
    ${section('Réglages de couleur')}
    ${section('En contexte')}`,
  selecteur: 'Bleu',
  piedAide: `${PAIRES_BLEU} paires · 2 thèmes`,
  pied: b('Vérifier →', 'principal'),
});

const statut = (pal, texte, icone) => { const r = pal.vive.light; return `<div class="statut" style="background:${r[1]};border-color:${r[6]};color:${r[7]}"><span>${icone}</span>${texte}</div>`; };
const ecranStatuts = plugin({
  onglet: 'Vérifier',
  corps: `<div class="titre"><h3>Vérifier Orange A</h3><span class="sec">Marque A · secondary</span></div>
    <div class="verdict ok-fond"><b>Toutes les paires atteignent leur seuil</b></div>
    ${section('Distinguer les statuts', 'Vision normale · avec Marque A', true, `
      <div class="deux"><div><span class="lib">Vision</span><div class="champ">Normale ▾</div></div><div><span class="lib">Avec</span><div class="champ">Marque A ▾</div></div></div>
      <div class="statuts" style="background:${FONDS.light}">${statut(rouge, 'Paiement refusé', '✕')}${statut(ambre, 'Session bientôt expirée', '!')}${statut(vert, 'Profil enregistré', '✓')}${statut(azur, 'Nouvelle version', 'i')}${statut(bleu, 'Action · Bleu A', '→')}${statut(orange, 'Mise en avant · Orange A', '★')}</div>
      <div class="verdict att"><b>Orange A ressemble à Ambre, votre couleur d'avertissement</b><span>Écart ${virgule(dAmbreOrange, 3)}, seuil ${virgule(R.seuils.palettesProches)}. Un avertissement risque d'être lu comme une mise en avant.</span></div>`)}
    ${section('Comparer à une autre palette', `Bleu K, d'une autre marque : écart ${virgule(dBleuBleuK, 3)}, jamais affichés ensemble`)}`,
  selecteur: 'Orange A',
  piedAide: 'Ces écarts n’empêchent pas d’appliquer.',
  pied: b('Préparer l’application →', 'principal'),
});

const ecranExistantes = plugin({
  onglet: 'Palettes',
  sansSelecteur: true,
  corps: `<h3>De couleurs existantes</h3>
    <p class="sec">11 pastilles lues dans la sélection, rangées du plus clair au plus foncé.</p>
    ${surface(`${numeros}${rampe(OEIL, { marques: { 6: '◆' } })}`)}
    <div class="deux"><div><span class="lib">Nom</span><div class="champ">Bleu A</div></div><div><span class="lib">Votre couleur de référence</span><div class="champ"><i class="pastille" style="background:${OEIL[6]}"></i>600 · ${OEIL[6]} ▾</div></div></div>
    <p class="sec">La palette garde vos couleurs. L'étape Vérifier dira lesquelles posent un problème de contraste.</p>`,
  piedAide: '',
  pied: b('Créer et vérifier →', 'principal'),
});

const ecranDepartJeu = plugin({
  onglet: 'Palettes',
  sansSelecteur: true,
  corps: `<h3>Jeu de départ</h3>
    <span class="lib">Couleurs communes à toutes les marques</span>
    <div class="carte liste">${[['Neutre', neutre], ['Danger', rouge], ['Avertissement', ambre], ['Succès', vert], ['Information', azur]].map(([n, p]) => `<div class="ligne-jeu"><b>${n}</b><span class="mono">${p.hexa}</span>${rampe(p.vive.light, { h: 10 })}</div>`).join('')}</div>
    <span class="lib">Marques</span>
    <div class="carte liste">
      <div class="ligne-jeu entete"><span class="sec">Marque</span><span class="sec">Principale</span><span class="sec">Secondaire</span></div>
      <div class="ligne-jeu"><b>Marque A</b><span><i class="pastille" style="background:${bleu.hexa}"></i> ${bleu.hexa}</span><span><i class="pastille" style="background:${orange.hexa}"></i> ${orange.hexa}</span></div>
      <span class="lien">+ Ajouter une marque</span>
    </div>
    <p class="sec">Un design system à une marque garde une seule ligne.</p>`,
  piedAide: '7 palettes',
  pied: b('Créer et vérifier →', 'principal'),
});

// ---------------------------------------------------------------- situations
const etapes = (p, v, a) => `<div class="etapes"><div><em>1</em><b>Palettes</b><span>${p}</span></div><div><em>2</em><b>Vérifier</b><span>${v}</span></div><div><em>3</em><b>Appliquer</b><span>${a}</span></div></div>`;
const SITUATIONS = [
  ['Un design system neuf', etapes('« D’un jeu de départ » : les couleurs communes, une ligne par marque.', 'Chaque palette, une par une, ou seulement celles qui ont un écart.', '« Toutes les palettes modifiées » : variables et planches d’un coup.'), '#jeu'],
  ['Un système multi-marques à créer', etapes('Le jeu de départ avec une ligne par marque. Une marque ajoutée plus tard : « + Nouvelle », destination « Marque C ».', '« Distinguer les statuts » avec chaque marque : une couleur de marque proche d’un statut se voit ici.', 'Toutes les palettes de la marque en une relecture.'), '#statuts'],
  ['Un système multi-marques à mettre à jour', etapes('Ouvrir la palette, changer la couleur de référence.', 'Voir si la nouvelle couleur tient les contrastes.', '« Bleu A seulement », relire, appliquer.'), '#parcours'],
  ['Light et Dark, à créer ou à mettre à jour', etapes('Chaque palette porte ses deux thèmes ; la bascule Light · Dark de l’aperçu les montre.', 'Les paires se jugent sur les deux thèmes ; le verdict dit lequel pose problème.', 'Les deux modes s’écrivent ensemble.'), '#parcours'],
  ['Une structure de tokens non conventionnelle', etapes('Destination « Dans mes variables » : une collection, un nom avec {nuance}, un mode par thème.', 'Comme toute palette.', 'Le plugin remplit ces variables et n’en crée aucune sans le demander.'), '#destination'],
  ['Des palettes faites à l’œil', etapes('« De couleurs existantes » : les pastilles sélectionnées ou les variables du fichier.', 'Le plugin propose la plus petite correction : ici, 3 nuances sur 11.', 'Les variables existantes prennent les couleurs corrigées.'), '#oeil'],
  ['Une palette pour un nouveau composant', etapes('« + Nouvelle », « D’une couleur ». Destination : une nouvelle famille, ou nulle part tant que c’est un essai.', '« En contexte » et « Distinguer les statuts » montrent si elle se confond avec une couleur existante.', 'Seulement cette palette.'), '#destination'],
  ['Plusieurs palettes proches mais différentes', etapes('Dupliquer, puis régler.', '« Comparer à une autre palette » : les deux rampes nuance par nuance. Deux marques différentes ne sont jamais signalées comme trop proches.', 'Les palettes gardées.'), '#statuts'],
  ['Des palettes « jolies »', etapes('« Réglages de couleur » sous l’aperçu, « En contexte » pour juger sur un écran.', 'Vérifier ne dit que si c’est lisible : la beauté se juge à l’étape 1.', '—'), '#parcours'],
  ['Une couleur modifiée à la main dans Figma', etapes('Rien à faire.', 'Rien à faire.', 'La relecture montre la couleur, les deux choix et leur effet sur les contrastes.'), '#parcours'],
];

// ---------------------------------------------------------------- page
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UCM Palettes, trois étapes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400&display=swap">
<style>
:root { --sol: #F4F3EF; --papier: #FFFFFF; --encre: #1B1D1F; --encre-2: #5E6368; --filet: #DEDCD5; --accent: #0D99FF; --vert: #1A7F4B; --rouge: #C23A22; --ambre: #9A5B00; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --sol: #16171A; --papier: #1F2125; --encre: #ECEDEF; --encre-2: #A2A7AE; --filet: #34373D; --vert: #5CCB8E; --rouge: #FF8A73; --ambre: #F2B24C; } }
:root[data-theme="dark"] { --sol: #16171A; --papier: #1F2125; --encre: #ECEDEF; --encre-2: #A2A7AE; --filet: #34373D; --vert: #5CCB8E; --rouge: #FF8A73; --ambre: #F2B24C; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--sol); color: var(--encre); font: 16px/1.6 Inter, system-ui, sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 56px 16px 96px; display: grid; gap: 88px; }
h1 { font-size: clamp(34px, 6vw, 56px); line-height: 1.05; letter-spacing: -0.02em; margin: 0; }
h2 { font-size: 28px; line-height: 1.2; margin: 0; letter-spacing: -0.01em; }
p { margin: 0; max-width: 66ch; }
.sur { font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--encre-2); }
.bloc { display: grid; gap: 22px; }
.intro { display: grid; gap: 20px; }
.lead { font-size: 20px; color: var(--encre-2); max-width: 52ch; }
.trois-q { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
.q { background: var(--papier); border: 1px solid var(--filet); border-radius: 14px; padding: 20px; display: grid; gap: 6px; }
.q em { font-style: normal; font-weight: 700; color: var(--accent); }
.q b { font-size: 19px; }
.q span { color: var(--encre-2); font-size: 15px; }
.regles { margin: 0; padding-left: 1.3em; display: grid; gap: 10px; max-width: 70ch; }
.regles b { font-weight: 600; }
.defile { overflow-x: auto; padding-bottom: 8px; }
.rangee { display: flex; gap: 20px; align-items: flex-start; width: max-content; }
.ecran { display: grid; gap: 10px; width: 420px; }
.legende { font-size: 14px; color: var(--encre-2); }
.legende b { color: var(--encre); display: block; }
.fleche { align-self: center; font-size: 26px; color: var(--encre-2); }
.situations { display: grid; gap: 14px; }
.sit { background: var(--papier); border: 1px solid var(--filet); border-radius: 14px; padding: 18px 20px; display: grid; gap: 12px; }
.sit-tete { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; flex-wrap: wrap; }
.sit-tete b { font-size: 18px; }
.sit-tete a { font-size: 14px; color: var(--encre-2); }
.etapes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.etapes > div { display: grid; gap: 2px; font-size: 14px; align-content: start; }
.etapes em { font-style: normal; font-size: 12px; font-weight: 700; color: var(--accent); }
.etapes b { font-size: 14px; }
.etapes span { color: var(--encre-2); }
@media (max-width: 720px) { .etapes { grid-template-columns: 1fr; } }
.deux-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.boite { background: var(--papier); border: 1px solid var(--filet); border-radius: 14px; padding: 20px; display: grid; gap: 8px; align-content: start; }
.boite h3 { margin: 0; font-size: 17px; }
.boite ul { margin: 0; padding-left: 1.2em; display: grid; gap: 6px; font-size: 15px; }
.table { background: var(--papier); border: 1px solid var(--filet); border-radius: 14px; overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 15px; }
th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--filet); vertical-align: top; }
tr:last-child td { border-bottom: 0; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--encre-2); }

/* Le plugin, thème clair de Figma */
.plugin { position: relative; width: 420px; height: 560px; background: #FFF; color: #1E1E1E; border: 1px solid #E3E3E3; border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.12); font: 11px/16px Inter, system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden; }
.plugin .sec { color: #6B6B6B; }
.p-tete { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #EDEDED; }
.p-tete b { font-size: 12px; }
.p-onglets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 8px 14px; border-bottom: 1px solid #EDEDED; }
.p-onglets span { height: 26px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px; font-weight: 600; color: #6B6B6B; }
.p-onglets em { font-style: normal; font-size: 10px; width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #C9C9C9; }
.p-onglets .on { background: #F0F0F0; color: #1E1E1E; }
.p-onglets .on em { background: #1E1E1E; color: #FFF; border-color: #1E1E1E; }
.p-corps { flex: 1; overflow: hidden; padding: 12px 14px; display: grid; gap: 10px; align-content: start; }
.p-corps h3 { margin: 0; font-size: 15px; }
.p-corps p { font-size: 11px; }
.p-pied { border-top: 1px solid #EDEDED; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.p-select { display: flex; gap: 8px; }
.p-select .champ { flex: 1; justify-content: space-between; }
.titre { display: grid; gap: 0; }
.champ { height: 28px; border: 1px solid #E3E3E3; border-radius: 6px; padding: 0 8px; display: flex; align-items: center; gap: 6px; }
.lib { display: block; color: #6B6B6B; margin-bottom: 3px; }
.deux { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.b { height: 28px; padding: 0 12px; border: 1px solid #E3E3E3; border-radius: 6px; display: inline-flex; align-items: center; font-weight: 600; white-space: nowrap; background: #FFF; }
.b.principal { background: var(--accent); border-color: var(--accent); color: #FFF; }
.pastille { width: 12px; height: 12px; border-radius: 3px; display: inline-block; flex: none; vertical-align: -2px; }
.carte { border: 1px solid #EDEDED; background: #FAFAFA; border-radius: 8px; padding: 10px; display: grid; gap: 8px; }
.ligne { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.petit { font-size: 10px; }
.bascule { display: inline-flex; background: #F0F0F0; border-radius: 6px; padding: 2px; gap: 2px; }
.bascule span { padding: 3px 10px; border-radius: 4px; color: #6B6B6B; font-weight: 600; }
.bascule .on { background: #FFF; color: #1E1E1E; box-shadow: 0 1px 2px rgba(0,0,0,.1); }
.bascule.large { display: grid; grid-template-columns: 1fr 1fr; text-align: center; }
.surface { border-radius: 6px; padding: 8px; display: grid; gap: 4px; }
.rampe { display: grid; grid-template-columns: repeat(${CRANS.length}, minmax(0, 1fr)); gap: 2px; }
.rampe i { height: var(--h); border-radius: 3px; font-style: normal; display: grid; place-items: center; font-size: 10px; position: relative; }
.rampe .point { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: #F5A524; box-shadow: 0 0 0 1.5px #FFF; }
.rampe.numeros span { text-align: center; font-size: 9px; opacity: .6; }
.sect { border: 1px solid #EDEDED; border-radius: 8px; }
.sect-tete { display: flex; gap: 8px; align-items: center; padding: 9px 10px; }
.sect-tete .sec { margin-left: auto; text-align: right; }
.chev { color: #6B6B6B; width: 10px; }
.sect-corps { padding: 0 10px 10px; display: grid; gap: 8px; }
.verdict { border-radius: 8px; padding: 8px 10px; display: grid; gap: 2px; }
.verdict.ko { background: #FDECEA; color: #8A2414; }
.verdict.att { background: #FFF4DE; color: #7A4B00; }
.verdict.ok-fond { background: #E8F6EE; color: #17603A; }
.correction { border-color: #BFE0FF; background: #F3F9FF; }
.avap { display: grid; grid-template-columns: 40px 1fr; gap: 4px 8px; align-items: center; }
.avap .surface { padding: 4px; }
.plugin .ok { color: #17784A; font-weight: 600; }
.plugin .ko { color: #B42318; font-weight: 600; }
.lien { color: var(--accent); font-weight: 600; }
.choix-grand { border: 1px solid #E3E3E3; border-radius: 8px; padding: 12px; display: grid; gap: 2px; }
.choix-grand b { font-size: 12px; }
.liste { gap: 0; padding: 4px 10px; background: #FFF; }
.ligne-pal { display: flex; gap: 8px; align-items: center; padding: 6px 0; border-top: 1px solid #F0F0F0; }
.ligne-pal:first-child { border-top: 0; }
.ligne-pal .sec { margin-left: auto; }
.case { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #BDBDBD; display: grid; place-items: center; font-size: 9px; color: #FFF; }
.case.on { background: var(--accent); border-color: var(--accent); }
.ligne-jeu { display: grid; grid-template-columns: 90px 70px 1fr; gap: 8px; align-items: center; padding: 5px 0; border-top: 1px solid #F0F0F0; }
.ligne-jeu:first-child { border-top: 0; }
.mono, .plugin code { font-family: "IBM Plex Mono", monospace; font-size: 10px; }
.voile { position: absolute; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-end; }
.feuille { background: #FFF; width: 100%; max-height: 92%; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; }
.f-tete { padding: 12px 14px; border-bottom: 1px solid #EDEDED; display: flex; justify-content: space-between; }
.f-tete b { font-size: 13px; }
.f-corps { padding: 12px 14px; display: grid; gap: 10px; overflow: hidden; }
.f-pied { padding: 10px 14px; border-top: 1px solid #EDEDED; display: flex; justify-content: flex-end; gap: 8px; }
.decision { background: #FFFBF2; border-color: #F3D9A4; }
.deux-couleurs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.deux-couleurs div { display: grid; grid-template-columns: 28px 1fr; grid-template-rows: auto auto; column-gap: 8px; align-items: center; }
.deux-couleurs i { grid-row: span 2; width: 28px; height: 28px; border-radius: 6px; }
.option { display: grid; grid-template-columns: 14px 1fr; gap: 8px; border: 1px solid #E3E3E3; border-radius: 6px; padding: 7px 8px; background: #FFF; }
.option > div { display: grid; }
.option.on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.radio { width: 14px; height: 14px; border-radius: 50%; border: 1px solid #BDBDBD; margin-top: 1px; }
.radio.on { border: 4px solid var(--accent); }
.statuts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 8px; border-radius: 6px; }
.statut { border: 1px solid; border-radius: 6px; padding: 5px 7px; font-weight: 600; display: flex; gap: 6px; align-items: center; font-size: 10px; }
</style>
</head>
<body>
<main>

<section class="intro">
  <span class="sur">UCM Palettes · proposition d'expérience</span>
  <h1>Palettes.<br>Vérifier.<br>Appliquer.</h1>
  <p class="lead">Un plugin en trois étapes, toujours les mêmes, toujours dans cet ordre. Chaque situation de travail d'un designer devient un chemin dans ces trois écrans, pas une fonction de plus.</p>
  <p>Cette page reprend le parcours de <a href="../02%20Revue%20atelier/REVUE-ET-PROTOTYPE-ATELIER.html">la proposition de l'atelier</a>, qui était le bon, et le complète là où les situations de travail l'exigent. Elle remplace les pistes et les décisions des propositions précédentes pour tout ce qui touche au parcours. Les couleurs et les contrastes affichés viennent du moteur du plugin.</p>
</section>

<section class="bloc">
  <span class="sur">Le constat</span>
  <h2>Trois questions, quelle que soit la situation</h2>
  <p>Créer un système neuf, ajouter une marque, corriger des palettes faites à l'œil ou remplir une structure de tokens existante : le designer se pose chaque fois les mêmes trois questions, dans le même ordre.</p>
  <div class="trois-q">
    <div class="q"><em>1</em><b>D'où je pars ?</b><span>De rien, d'une couleur de charte, ou de couleurs qui existent déjà dans le fichier.</span></div>
    <div class="q"><em>2</em><b>Est-ce que ça marche ?</b><span>Les textes sont-ils lisibles, en Light et en Dark ? La palette se distingue-t-elle des autres ?</span></div>
    <div class="q"><em>3</em><b>Qu'est-ce que ça change dans Figma ?</b><span>Quelles couleurs bougent, lesquelles ont été retouchées à la main, et qu'est-ce que je décide.</span></div>
  </div>
  <p>Les propositions précédentes rangeaient l'interface selon ce que le plugin produit : planche, variables, collections <code>primitives</code>, <code>brand</code>, <code>theme</code>. Le designer devait traduire sa question en structure technique avant d'agir. La dernière version ajoutait quatorze pistes et vingt décisions à cette structure : chaque situation y gagnait sa fonction, et le plugin devenait plus difficile à comprendre.</p>
</section>

<section class="bloc">
  <span class="sur">Les règles</span>
  <h2>Cinq règles, et rien d'autre</h2>
  <ol class="regles">
    <li><b>Trois onglets numérotés : Palettes, Vérifier, Appliquer.</b> Ils suivent les trois questions. Réglages communs reste derrière l'engrenage.</li>
    <li><b>Un seul bouton principal par écran, en bas, qui mène à l'étape suivante.</b> Le designer n'a jamais à chercher quoi faire ensuite. Il peut aussi sauter une étape par les onglets.</li>
    <li><b>Les mots du designer à l'écran, les mots techniques dans le détail.</b> « Marque A · primary », « Dans mes variables », « 89 couleurs changent ». Collections, chemins et alias se lisent dans « Détail technique », replié.</li>
    <li><b>Un problème vient avec sa correction.</b> Vérifier ne se contente pas de compter les paires sous leur seuil : il propose la plus petite modification qui les corrige, avec l'avant et l'après.</li>
    <li><b>Rien ne s'écrit dans Figma sans relecture, et rien n'est choisi à la place du designer.</b> Une couleur modifiée à la main dans Figma se décide dans la relecture ; sans choix, elle reste telle quelle et le reste s'applique.</li>
  </ol>
</section>

<section class="bloc" id="parcours">
  <span class="sur">Le parcours</span>
  <h2>Le même chemin pour tout</h2>
  <p>Régler la palette, la vérifier, voir ce qui va changer, appliquer. L'aperçu reste en haut de l'étape 1 ; les réglages, la destination et l'écran de démonstration sont repliés dessous.</p>
  <div class="defile"><div class="rangee">
    <div class="ecran">${ecranPalettes}<div class="legende"><b>1 · Palettes</b>Bleu A, reprise des pastilles d'une charte faite à l'œil. Le nom, la couleur, l'aperçu ; trois sections repliées. En bas : « Vérifier ».</div></div>
    <span class="fleche">→</span>
    <div class="ecran">${ecranVerifier}<div class="legende"><b>2 · Vérifier</b>Le verdict en mots, puis la plus petite correction : ${CORRIGEES.length} nuances sur ${OEIL.length}. Le designer garde ses foncés.</div></div>
    <span class="fleche">→</span>
    <div class="ecran">${ecranAppliquer}<div class="legende"><b>3 · Appliquer</b>Bleu A, ou toutes les palettes qui ont changé depuis la dernière application. Variables et planches, cochées.</div></div>
    <span class="fleche">→</span>
    <div class="ecran">${ecranRelire}<div class="legende"><b>Relire</b>Une phrase qui dit ce qui change. Une couleur retouchée dans Figma se décide ici, avec l'effet de chaque choix.</div></div>
  </div></div>
</section>

<section class="bloc" id="situations">
  <span class="sur">Les situations</span>
  <h2>Chaque situation, dans les trois étapes</h2>
  <p>Aucune situation n'ajoute d'onglet ni de bouton principal. Chacune utilise les mêmes écrans, avec au plus un choix qui lui est propre.</p>
  <div class="situations">
    ${SITUATIONS.map(([t, e, lien]) => `<div class="sit"><div class="sit-tete"><b>${t}</b><a href="${lien}">Voir l'écran</a></div>${e}</div>`).join('')}
  </div>
</section>

<section class="bloc" id="jeu">
  <span class="sur">Étape 1 · le point de départ</span>
  <h2>« D'où partez-vous ? »</h2>
  <p>La seule question que pose un fichier vide, et « + Nouvelle » ensuite. Trois réponses couvrent toutes les situations : une couleur, des couleurs existantes, un jeu de départ.</p>
  <div class="defile"><div class="rangee">
    <div class="ecran">${ecranDepart}<div class="legende"><b>Fichier vide, ou « + Nouvelle »</b>Trois choix, décrits par ce que le designer a déjà.</div></div>
    <div class="ecran">${ecranDepartJeu}<div class="legende"><b>Jeu de départ</b>Les couleurs communes remplies d'avance, une ligne par marque.</div></div>
    <div class="ecran" id="oeil">${ecranExistantes}<div class="legende"><b>Couleurs existantes</b>Les pastilles d'une palette faite à l'œil. Le plugin les garde ; l'étape 2 dit ce qui ne va pas et propose la correction.</div></div>
  </div></div>
</section>

<section class="bloc" id="destination">
  <span class="sur">Étape 1 · la destination</span>
  <h2>« Où vont ces couleurs ? »</h2>
  <p>Une section repliée de l'étape 1, qui répond par une phrase. Le système UCM pour un design system construit avec le plugin. Mes variables pour une structure de tokens qui existe déjà. Nulle part pour un essai. Le designer choisit sa couleur d'abord, et la range ensuite.</p>
  <div class="defile"><div class="rangee">
    <div class="ecran">${ecranDestination}<div class="legende"><b>Une structure de tokens existante</b>Une collection, un nom avec {nuance}, un mode par thème. Le plugin dit ce qu'il a trouvé avant d'écrire quoi que ce soit.</div></div>
  </div></div>
</section>

<section class="bloc" id="statuts">
  <span class="sur">Étape 2 · les autres palettes</span>
  <h2>« Est-ce qu'elle se distingue ? »</h2>
  <p>Une palette ne vit jamais seule. « Distinguer les statuts » la montre avec les couleurs d'alerte et celles de sa marque, en vision normale ou simulée. « Comparer à une autre palette » pose deux rampes nuance par nuance. Deux palettes de deux marques ne sont jamais signalées comme trop proches : elles ne s'affichent jamais ensemble.</p>
  <div class="defile"><div class="rangee">
    <div class="ecran">${ecranStatuts}<div class="legende"><b>Une couleur de marque proche d'un statut</b>Orange A et Ambre, écart ${virgule(dAmbreOrange, 3)} : le plugin le dit avec les mots du problème.</div></div>
  </div></div>
</section>

<section class="bloc">
  <span class="sur">Par rapport aux propositions précédentes</span>
  <h2>Ce qui est gardé, ajouté, retiré</h2>
  <div class="deux-col">
    <div class="boite"><h3>Gardé de l'atelier</h3><ul>
      <li>Les trois onglets Palettes, Vérifier, Appliquer, et la barre d'action en bas.</li>
      <li>La destination dans Figma, séparée de la palette.</li>
      <li>Deux sorties cochables, variables et planches.</li>
      <li>La relecture, sans choix par défaut, relue au moment d'écrire.</li>
    </ul></div>
    <div class="boite"><h3>Ajouté pour les situations</h3><ul>
      <li>« D'où partez-vous ? » avec les couleurs existantes, pour les palettes faites à l'œil.</li>
      <li>La correction proposée dans Vérifier.</li>
      <li>« Dans mes variables », pour une structure de tokens existante.</li>
      <li>« Toutes les palettes modifiées » dans Appliquer, pour les réglages communs et les marques.</li>
      <li>La marque à côté des statuts, et la comparaison de deux palettes.</li>
    </ul></div>
    <div class="boite"><h3>Retiré</h3><ul>
      <li>Le rôle en quatre segments à la création. La destination le remplace, après le choix de la couleur.</li>
      <li>Le rangement par collections dans le travail courant.</li>
      <li>L'onglet Système, les cases vides, le bouton dans chaque fiche, la rampe témoin.</li>
      <li>Les pistes et les décisions numérotées comme cadre de lecture.</li>
    </ul></div>
  </div>
</section>

<section class="bloc">
  <span class="sur">L'essai</span>
  <h2>Ce que ton essai doit montrer</h2>
  <p>Tu testes seul. Avant chaque clic, dis ce qui va se passer ; après, compare. Un écart est un défaut de l'interface, pas une erreur de ta part.</p>
  <div class="table"><table>
    <thead><tr><th>Tâche</th><th>Réussie si</th></tr></thead>
    <tbody>
      <tr><td>Créer un design system à deux marques depuis un fichier vide</td><td>Chaque étape se trouve par le bouton du bas, sans chercher</td></tr>
      <tr><td>Reprendre une palette faite à l'œil et la corriger</td><td>Tu sais avant d'appliquer quelles nuances changent, et pourquoi</td></tr>
      <tr><td>Changer la couleur d'une marque et l'appliquer</td><td>Aucun changement d'onglet en dehors des trois étapes</td></tr>
      <tr><td>Remplir une collection de variables existante</td><td>Tu sais quelles variables seront écrites avant de relire</td></tr>
      <tr><td>Décider d'une couleur retouchée dans Figma</td><td>Tu dis quelle couleur restera et ce que devient le contraste</td></tr>
      <tr><td>Redessiner une planche sans toucher aux variables</td><td>Aucune variable modifiée</td></tr>
    </tbody>
  </table></div>
</section>

<section class="bloc">
  <span class="sur">À trancher</span>
  <h2>Trois questions pour toi</h2>
  <ol class="regles">
    <li><b>Trois onglets au lieu de deux.</b> La règle actuelle en fixe deux. Cette proposition la change : la vérification devient une étape visible.</li>
    <li><b>« Dans mes variables ».</b> Le plugin écrirait hors de l'architecture UCM. Utile pour les systèmes existants, plus coûteux à construire.</li>
    <li><b>La correction proposée.</b> Le plugin choisit les nuances à changer ; le designer accepte ou non. Faut-il aussi permettre de corriger nuance par nuance dans Vérifier ?</li>
  </ol>
</section>

</main>
</body>
</html>
`;

writeFileSync(join(ICI, 'PROPOSITION-TROIS-ETAPES.html'), html);
console.log(`Écrit : PROPOSITION-TROIS-ETAPES.html (${Math.round(html.length / 1024)} Ko)`);
console.log(`  Rampe à l'œil : ${ecartsOeil.length} paires sous le seuil ; corriger ${listeCrans(CORRIGEES)} ; ${gardees} nuances gardées`);
console.log(`  Relecture : ${COULEURS_QUI_CHANGENT} couleurs (Bleu A ${CHANGEMENTS.bleu}, Ambre ${CHANGEMENTS.ambre}, Vert ${CHANGEMENTS.vert})`);
console.log(`  Retouche de Rouge : ${perduesRetouche.length} paires perdues`);
console.log(`  Ambre / Orange A : ${virgule(dAmbreOrange, 3)} ; Bleu A / Bleu K : ${virgule(dBleuBleuK, 3)}`);
