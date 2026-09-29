/**
 * Le graphe de l'éditeur de dérive, en SVG ([DER-01] à [DER-05], [ARC-08]) :
 * la ligne brisée de chaque profil, le pivot, les deux poignées, puis la bande
 * de teintes et la rampe, alignées sur les onze colonnes des crans.
 *
 * Les couleurs de trait viennent des rôles de la feuille ; seules les couleurs
 * des crans, qui sont des données, s'écrivent dans le SVG.
 */
import {
  PROFILS,
  boutsDe,
  fabriquerCran,
  normaliserTeinte,
  pivotDe,
  teinteA,
  type Ancrage,
  type Cran,
  type Grille,
  type Palette,
  type Profil,
  type Recette,
} from 'ucm-couleur';

import { suivreLaLargeur } from '../largeur';
import { memoriserVues, type Localisation, type Texte } from '../localisation';
import { abscisse, ligneBrisee, ordonnee, reperes, type Cadre } from './geometrie';

/** Ce que le graphe dessine. */
export interface EntreesDuGraphe {
  readonly recette: Recette;
  readonly palette: Palette;
  /** Le profil dont les poignées se règlent. */
  readonly profil: Profil;
  /** La rampe Light du profil réglé, peinte sous la bande ([DER-04]). */
  readonly rampe: readonly Cran[];
  /** Où la référence exacte se place ([MOT-17]) : le pivot tombe sur son rang clair. */
  readonly ancrage: Ancrage;
  /** La liste de la palette, commune ou libre : une colonne par nuance (W6). */
  readonly grille: Grille;
  /** L'échelle de l'ordonnée, en degrés ([DER-01]) : l'éditeur la fige pendant un glisser. */
  readonly echelle: number;
}

export interface GrapheUi {
  element: SVGSVGElement;
  afficher(entrees: EntreesDuGraphe): void;
  /** Les poignées dessinées, par bout ; absente quand la référence n'a pas de segment de ce côté ([DER-14]). */
  poignees(): { clair: SVGGElement | null; sombre: SVGGElement | null };
  /** Une largeur nouvelle de la colonne : l'éditeur redessine, et rend le focus à sa poignée (Z8.2). */
  surLargeur(action: () => void): void;
}

function construireVues(i18n: Localisation) {
  const { NOM_DU_PROFIL, TEXTES_DE_LA_DERIVE, etiquetteDePoignee, graduation, infobulleDuPivot, valeurDePoignee } = i18n.messages;

  const SVG = 'http://www.w3.org/2000/svg';

  /** Le cadre, 396 unités de large avant la première mesure : la largeur utile de la fenêtre minimale, pour 24 px par cran au moins ([DER-16]). */
  const CADRE: Cadre = { largeur: 396, hauteur: 150, gauche: 36, droite: 8, haut: 10, bas: 10 };

  /**
   * Les pixels d'une unité : l'échelle du graphe dans la fenêtre minimale,
   * 451 px pour 396 unités (Z8.1). Le graphe garde cette échelle à toute
   * largeur : ses textes, ses traits et sa hauteur restent ceux de 500 px, et
   * seules ses colonnes s'étirent.
   */
  const PIXELS_PAR_UNITE = 451 / 396;

  const Y_CRANS = 164;

  const Y_BANDE = 172;

  const Y_RAMPE = 192;

  const HAUTEUR_DE_CASE = 16;

  /** La hauteur du viewBox : un glisser convertit l'ordonnée du pointeur à cette échelle. */
  const HAUTEUR_TOTALE = Y_RAMPE + HAUTEUR_DE_CASE;

  /**
   * La clarté à laquelle la bande peint chaque teinte : celle d'un cran moyen,
   * où la chroma de `vivid` montre la teinte sans la noyer dans le blanc ou le
   * noir ([DER-04]).
   */
  const CLARTE_DE_LA_BANDE = 0.7;

  function element<K extends keyof SVGElementTagNameMap>(nom: K, attributs: Record<string, Texte | number>): SVGElementTagNameMap[K] {
    const noeud = document.createElementNS(SVG, nom);
    for (const [cle, valeur] of Object.entries(attributs)) i18n.lier(noeud, cle, typeof valeur === 'number' ? String(valeur) : valeur);
    return noeud;
  }

  function createGraphe(): GrapheUi {
    const svg = element('svg', { viewBox: `0 0 ${CADRE.largeur} ${HAUTEUR_TOTALE}`, role: 'group' });
    svg.setAttribute('class', 'derive-graphe');
    svg.style.height = `${HAUTEUR_TOTALE * PIXELS_PAR_UNITE}px`;
    let poignees: { clair: SVGGElement | null; sombre: SVGGElement | null } = { clair: null, sombre: null };
    /** Le cadre du dernier dessin : sa largeur suit la colonne mesurée, ses ordonnées ne changent pas. */
    let cadre: Cadre = CADRE;
    let apresLaLargeur: (() => void) | null = null;
    suivreLaLargeur(svg, (largeur) => {
      cadre = { ...CADRE, largeur: largeur / PIXELS_PAR_UNITE };
      apresLaLargeur?.();
    });

    /** L'échelle du dernier dessin, que les repères et les poignées lisent. */
    let echelle = 90;

    function repere(angle: number): SVGGElement {
      const groupe = element('g', {});
      const y = ordonnee(angle, cadre, echelle);
      const trait = element('line', { x1: cadre.gauche, x2: cadre.largeur - cadre.droite, y1: y, y2: y });
      if (angle === 0) trait.setAttribute('class', 'derive-axe');
      else trait.setAttribute('class', 'derive-repere');
      groupe.append(trait);
      if (angle % (echelle <= 45 ? 15 : 30) === 0) {
        const texte = element('text', { x: cadre.gauche - 4, y: y + 3, 'text-anchor': 'end' });
        texte.setAttribute('class', 'derive-graduation');
        i18n.lier(texte, 'textContent', graduation(angle));
        groupe.append(texte);
      }
      return groupe;
    }

    function poignee(bout: 'clair' | 'sombre', rang: number, angle: number, teinte: number, initiale: string, total: number): SVGGElement {
      // Une poignée est un curseur au sens WAI-ARIA : focalisable, bornée, et qui dit sa valeur ([DER-09]).
      const groupe = element('g', {
        tabindex: 0,
        role: 'slider',
        'aria-label': TEXTES_DE_LA_DERIVE.deriveAuBout[bout],
        'aria-valuemin': -90,
        'aria-valuemax': 90,
        'aria-valuenow': angle,
        'aria-valuetext': valeurDePoignee(angle, teinte),
      });
      groupe.setAttribute('class', 'derive-poignee');
      groupe.dataset.bout = bout;
      const x = abscisse(rang, cadre, total);
      const y = ordonnee(angle, cadre, echelle);
      const rond = element('circle', { cx: x, cy: y, r: 7 });
      rond.setAttribute('class', 'derive-poignee-rond');
      const lettre = element('text', { x, y: y + 3, 'text-anchor': 'middle' });
      lettre.setAttribute('class', 'derive-poignee-lettre');
      i18n.lier(lettre, 'textContent', initiale);
      // Près du haut du cadre, l'étiquette passe sous la poignée : au-dessus, elle sortirait du graphe.
      const dessous = angle > echelle * 0.66;
      const etiquette = element('text', { x: bout === 'clair' ? x + 11 : x - 11, y: dessous ? y + 18 : y - 10, 'text-anchor': bout === 'clair' ? 'start' : 'end' });
      etiquette.setAttribute('class', 'derive-graduation');
      i18n.lier(etiquette, 'textContent', etiquetteDePoignee(angle, teinte));
      groupe.append(rond, lettre, etiquette);
      return groupe;
    }

    return {
      element: svg,
      poignees: () => poignees,
      surLargeur(action) {
        apresLaLargeur = action;
      },
      afficher(entrees) {
        const { recette, palette, profil, rampe, ancrage, grille } = entrees;
        const courbe = grille.courbes.light;
        const total = courbe.length;
        const bouts = boutsDe(recette);
        // Chaque profil pivote autour de son départ réglé (Z10.5) : sa teinte, et la clarté du départ.
        const pivot = (profil: Profil | 'unique') => pivotDe(recette, palette, profil);
        const porteurDuPivot = ancrage.profil;
        const reference = pivot(porteurDuPivot);
        const lie = palette.derive.lien;
        echelle = entrees.echelle;
        svg.setAttribute('viewBox', `0 0 ${cadre.largeur} ${HAUTEUR_TOTALE}`);
        const enfants: SVGElement[] = reperes(echelle).map(repere);

        // Synchronisés, les profils partagent la ligne du porteur. Déliés, deux lignes, pleine et tiretée ([DER-05]).
        // La rampe unique d'une palette à une intensité range sa dérive sous la clé `vivid` comme sous `soft` ([ENT-14]).
        const porteur = ancrage.profil === 'unique' ? 'vivid' : ancrage.profil;
        for (const trace of lie ? [porteur] : PROFILS) {
          const rangAncre = trace === porteur ? ancrage.rangs.light : null;
          const sommets = ligneBrisee(courbe, pivot(trace), palette.derive[trace], bouts, rangAncre);
          const points = sommets.map(({ rang, angle }) => `${abscisse(rang, cadre, total)},${ordonnee(angle, cadre, echelle)}`);
          const ligne = element('polyline', { points: points.join(' ') });
          if (!lie && trace === 'soft') ligne.setAttribute('class', 'derive-trait derive-trait-soft');
          else ligne.setAttribute('class', 'derive-trait derive-trait-vivid');
          enfants.push(ligne);
          // Déliées, chaque courbe porte le nom de son profil, lisible sans la couleur ni le trait ([DER-05]).
          if (!lie) {
            const avantDernier = sommets.filter(({ rang }) => Number.isInteger(rang))[total - 2];
            const nom = element('text', { x: abscisse(total - 2, cadre, total), y: ordonnee(avantDernier.angle, cadre, echelle) - 6, 'text-anchor': 'middle' });
            nom.setAttribute('class', 'derive-graduation derive-nom-de-courbe');
            i18n.lier(nom, 'textContent', NOM_DU_PROFIL[trace]);
            enfants.push(nom);
          }
        }

        // Le pivot est la référence exacte, sur son rang clair ([DER-02]).
        const x = abscisse(ancrage.rangs.light, cadre, total);
        const y = ordonnee(0, cadre, echelle);
        const losange = element('path', { d: `M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z` });
        losange.setAttribute('class', 'derive-pivot');
        const titre = element('title', {});
        i18n.lier(titre, 'textContent', infobulleDuPivot(reference.H, ancrage));
        losange.append(titre);
        enfants.push(losange);

        // Un bout que la référence dépasse n'a pas de segment à régler ([DER-14]). Une poignée se pose sur la colonne
        // de son numéro, 50 ou 950 ; une liste qui ne le porte pas la pose au bord, du côté de son bout (W6).
        const derive = palette.derive[profil];
        const initiale = lie ? '' : profil[0];
        const colonneDe = (numero: number, bord: number): number => (grille.crans.includes(numero) ? grille.crans.indexOf(numero) : bord);
        poignees = {
          clair: reference.L > bouts.clair ? null
            : poignee('clair', colonneDe(50, 0), derive.clair, teinteA(bouts.clair, pivot(profil), derive, bouts), initiale, total),
          sombre: reference.L < bouts.sombre ? null
            : poignee('sombre', colonneDe(950, total - 1), derive.sombre, teinteA(bouts.sombre, pivot(profil), derive, bouts), initiale, total),
        };
        if (poignees.clair) enfants.push(poignees.clair);
        if (poignees.sombre) enfants.push(poignees.sombre);

        const largeur = (cadre.largeur - cadre.gauche - cadre.droite) / total;
        courbe.forEach((clarte, rang) => {
          const x = abscisse(rang, cadre, total);
          const numero = element('text', { x, y: Y_CRANS, 'text-anchor': 'middle' });
          numero.setAttribute('class', 'derive-graduation');
          i18n.lier(numero, 'textContent', String(grille.crans[rang]));
          const teinte = normaliserTeinte(teinteA(clarte, pivot(porteurDuPivot === 'unique' ? 'unique' : 'vivid'), palette.derive.vivid, bouts));
          const bande = element('rect', { x: x - largeur / 2, y: Y_BANDE, width: largeur, height: HAUTEUR_DE_CASE });
          bande.setAttribute('fill', fabriquerCran(CLARTE_DE_LA_BANDE, teinte, recette.profils.vivid.part, recette.gamut).hexa);
          const cran = element('rect', { x: x - largeur / 2 + 1, y: Y_RAMPE, width: largeur - 2, height: HAUTEUR_DE_CASE, rx: 3 });
          cran.setAttribute('fill', rampe[rang].hexa);
          enfants.push(numero, bande, cran);
        });

        svg.replaceChildren(...enfants);
      },
    };
  }
  return { CADRE, HAUTEUR_TOTALE, createGraphe };
}

export const creerVuesGraphe = memoriserVues(construireVues);
