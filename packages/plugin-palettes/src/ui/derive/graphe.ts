/**
 * Le graphe du Color shift, en SVG ([DER-01] à [DER-05], [ARC-08]) : la ligne
 * brisée de chaque profil pour la grandeur choisie, le pivot, les deux
 * poignées sur leurs rails, puis la rampe sans Color shift et la rampe avec,
 * alignées sur les colonnes des crans.
 *
 * Les couleurs de trait viennent des rôles de la feuille ; seules les couleurs
 * des crans, qui sont des données, s'écrivent dans le SVG.
 */
import {
  BORNES_DU_COLOR_SHIFT,
  PROFILS,
  boutsDe,
  decalageRange,
  pivotDe,
  teinteA,
  type Ancrage,
  type Bout,
  type Cran,
  type GrandeurDuColorShift,
  type Grille,
  type Palette,
  type Profil,
  type Recette,
} from 'ucm-couleur';

import { suivreLaLargeur } from '../largeur';
import { memoriserVues, type Localisation, type Texte } from '../localisation';
import { abscisse, ligneBrisee, ordonnee, reperes, type Cadre, type Sommet } from './geometrie';
import type { Intervalle } from './reglette';

/** Le nom d'une courbe déliée, et les sommets de la courbe qu'il suit. */
interface NomDeCourbe {
  readonly nom: SVGTextElement;
  readonly sommets: readonly Sommet[];
}

const seCoupent = (a: DOMRect, b: DOMRect): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Le segment de `a` à `b` traverse-t-il la boîte ? Découpage de Liang et Barsky. */
function traverse(a: DOMPoint, b: DOMPoint, boite: DOMRect): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let entree = 0;
  let sortie = 1;
  for (const [p, q] of [[-dx, a.x - boite.x], [dx, boite.x + boite.width - a.x], [-dy, a.y - boite.y], [dy, boite.y + boite.height - a.y]]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    if (p < 0) entree = Math.max(entree, q / p);
    else sortie = Math.min(sortie, q / p);
    if (entree > sortie) return false;
  }
  return true;
}

/** Ce que le graphe dessine. */
export interface EntreesDuGraphe {
  readonly recette: Recette;
  readonly palette: Palette;
  /** La grandeur que l'onglet choisi règle ([DER-18]). */
  readonly grandeur: GrandeurDuColorShift;
  /** Le profil dont les poignées se règlent. */
  readonly profil: Profil;
  /** Les rampes du profil réglé dans le thème de l'aperçu, sans Color shift puis avec ([DER-04]). */
  readonly rampes: { readonly sans: readonly Cran[]; readonly avec: readonly Cran[] };
  /** Où la référence exacte se place ([MOT-17]) : le pivot tombe sur son rang clair. */
  readonly ancrage: Ancrage;
  /** La liste de la palette, commune ou libre : une colonne par nuance (W6). */
  readonly grille: Grille;
  /** L'échelle de l'ordonnée ([DER-01]) : l'éditeur la fige pendant un glisser. */
  readonly echelle: number;
  /** Les bornes permises de chaque bout ([DER-19]) ; `null` tant que la limite se calcule. */
  readonly permises: { readonly [B in Bout]: Intervalle | null };
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
  const { NOM_DU_PROFIL, TEXTES_DE_LA_DERIVE, etiquetteDePoignee, graduation, grandeurAuBout, infobulleDuPivot, valeurDePoignee } = i18n.messages;

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

  /** La rampe sans Color shift, puis la rampe avec ([DER-04]). */
  const Y_SANS = 172;

  const Y_AVEC = 192;

  const HAUTEUR_DE_CASE = 16;

  /** La hauteur du viewBox : un glisser convertit l'ordonnée du pointeur à cette échelle. */
  const HAUTEUR_TOTALE = Y_AVEC + HAUTEUR_DE_CASE;

  /** La largeur d'un rail, centré sur sa poignée ([DER-03]). */
  const LARGEUR_DE_RAIL = 10;

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

    /** L'échelle et la grandeur du dernier dessin, que les repères et les poignées lisent. */
    let echelle = 90;
    let grandeur: GrandeurDuColorShift = 'teinte';

    function repere({ valeur, gradue }: { readonly valeur: number; readonly gradue: boolean }): SVGGElement {
      const groupe = element('g', {});
      const y = ordonnee(valeur, cadre, echelle);
      const trait = element('line', { x1: cadre.gauche, x2: cadre.largeur - cadre.droite, y1: y, y2: y });
      if (valeur === 0) trait.setAttribute('class', 'derive-axe');
      else trait.setAttribute('class', 'derive-repere');
      groupe.append(trait);
      if (gradue) {
        const texte = element('text', { x: cadre.gauche - 4, y: y + 3, 'text-anchor': 'end' });
        texte.setAttribute('class', 'derive-graduation');
        i18n.lier(texte, 'textContent', graduation(grandeur, valeur));
        groupe.append(texte);
      }
      return groupe;
    }

    /**
     * Le rail d'une poignée ([DER-03]) : la partie permise, puis les parties
     * interdites, hachurées, dans l'échelle visible. Une limite en calcul ne
     * hachure rien.
     */
    function rail(x: number, permises: Intervalle | null): SVGGElement {
      const groupe = element('g', { 'aria-hidden': 'true' });
      const borne = BORNES_DU_COLOR_SHIFT[grandeur];
      const bas = Math.max(-echelle, permises?.bas ?? -borne);
      const haut = Math.min(echelle, permises?.haut ?? borne);
      const bande = (de: number, a: number, interdite: boolean): void => {
        if (a <= de) return;
        const y = ordonnee(a, cadre, echelle);
        const rectangle = element('rect', { x: x - LARGEUR_DE_RAIL / 2, y, width: LARGEUR_DE_RAIL, height: ordonnee(de, cadre, echelle) - y, rx: 2 });
        if (interdite) rectangle.setAttribute('class', 'derive-rail-interdit');
        else rectangle.setAttribute('class', 'derive-rail');
        groupe.append(rectangle);
      };
      bande(bas, haut, false);
      bande(-echelle, Math.min(echelle, bas), true);
      bande(Math.max(-echelle, haut), echelle, true);
      return groupe;
    }

    /**
     * Pose le nom de chaque courbe où il ne touche ni l'étiquette d'une
     * poignée, ni l'autre nom, ni une ligne, et nettement plus près de sa
     * courbe que de l'autre : au-dessus puis au-dessous de sa courbe, de l'avant-dernière colonne vers le milieu, puis depuis la
     * deuxième. Sans place libre, il garde la première. Un graphe qu'on ne
     * voit pas ne se mesure pas : ses noms restent où le dessin les a posés.
     */
    function placerLesNoms(noms: readonly NomDeCourbe[], etiquettes: readonly SVGTextElement[], lignes: readonly SVGPolylineElement[], total: number): void {
      if (noms.length === 0 || noms[0].nom.getBBox().width === 0) return;
      const occupees = etiquettes.map((etiquette) => etiquette.getBBox());
      const traits = lignes.map((ligne) => Array.from(ligne.points));
      const coupeUnTrait = (boite: DOMRect): boolean => traits.some((points) => points.some((point, rang) => rang > 0 && traverse(points[rang - 1], point, boite)));
      const milieu = Math.floor(total / 2);
      const colonnes = [...Array.from({ length: total - 1 - milieu }, (_, rang) => total - 2 - rang), ...Array.from({ length: milieu - 1 }, (_, rang) => rang + 1)];
      for (const { nom, sommets } of noms) {
        const autres = noms.filter((autre) => autre.nom !== nom).map((autre) => autre.sommets);
        const places = colonnes.flatMap((colonne) => {
          const sommet = sommets.find(({ rang }) => rang === colonne);
          if (!sommet) return [];
          const courbe = ordonnee(sommet.valeur, cadre, echelle);
          const x = abscisse(colonne, cadre, total);
          const autresCourbes = autres.flatMap((autre) => autre.filter(({ rang }) => rang === colonne).map(({ valeur }) => ordonnee(valeur, cadre, echelle)));
          return [{ x, y: courbe - 6, courbe, autresCourbes }, { x, y: courbe + 14, courbe, autresCourbes }];
        });
        const libre = places.find(({ x, y, courbe, autresCourbes }) => {
          nom.setAttribute('x', String(x));
          nom.setAttribute('y', String(y));
          const boite = nom.getBBox();
          // Au croisement des courbes, ou l'autre courbe entre le nom et la sienne, le nom se lirait sur l'autre.
          const centre = boite.y + boite.height / 2;
          const ambigu = autresCourbes.some((autre) => Math.abs(centre - courbe) + 4 > Math.abs(centre - autre));
          return !ambigu && !occupees.some((occupee) => seCoupent(occupee, boite)) && !coupeUnTrait(boite);
        }) ?? places[0];
        if (!libre) continue;
        nom.setAttribute('x', String(libre.x));
        nom.setAttribute('y', String(libre.y));
        occupees.push(nom.getBBox());
      }
    }

    /** `voisin` : la valeur de la ligne au cran voisin, vers l'intérieur du graphe ; l'étiquette se pose du côté qu'elle quitte. */
    function poignee(bout: Bout, rang: number, angle: number, teinte: number, initiale: string, total: number, voisin: number | null, permises: Intervalle | null): { groupe: SVGGElement; etiquette: SVGTextElement } {
      const borne = BORNES_DU_COLOR_SHIFT[grandeur];
      // Une poignée est un curseur au sens WAI-ARIA : focalisable, bornée aux bornes permises, et qui dit sa valeur ([DER-09]).
      const groupe = element('g', {
        tabindex: 0,
        role: 'slider',
        'aria-label': grandeurAuBout(grandeur, bout),
        'aria-valuemin': permises?.bas ?? -borne,
        'aria-valuemax': permises?.haut ?? borne,
        'aria-valuenow': angle,
        'aria-valuetext': valeurDePoignee(grandeur, angle, teinte, permises),
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
      // L'étiquette se pose du côté que la ligne quitte : au-dessus quand elle descend vers l'intérieur, dessous
      // quand elle monte. Près d'un bord du cadre, elle passe de l'autre côté pour rester dans le graphe.
      const dessusPossible = y - 17 >= 0;
      const dessousPossible = y + 18 <= Y_CRANS - 12;
      const vers = voisin === null ? (angle > echelle * 0.66 ? 'dessous' : 'dessus') : voisin < angle ? 'dessus' : 'dessous';
      const dessous = vers === 'dessous' ? dessousPossible || !dessusPossible : !dessusPossible;
      const ancre = bout === 'clair' ? 'start' : 'end';
      const ex = bout === 'clair' ? x + 11 : x - 11;
      const ey = dessous ? y + 18 : y - 10;
      const etiquette = element('text', { x: ex, y: ey, 'text-anchor': ancre });
      etiquette.setAttribute('class', 'derive-graduation derive-etiquette-de-poignee');
      i18n.lier(etiquette, 'textContent', etiquetteDePoignee(grandeur, angle, teinte));
      groupe.append(rond, lettre, etiquette);
      return { groupe, etiquette };
    }

    return {
      element: svg,
      poignees: () => poignees,
      surLargeur(action) {
        apresLaLargeur = action;
      },
      afficher(entrees) {
        const { recette, palette, profil, rampes, ancrage, grille, permises } = entrees;
        const courbe = grille.courbes.light;
        const total = courbe.length;
        const bouts = boutsDe(recette);
        // Chaque profil pivote autour de son départ réglé (Z10.5) : sa teinte, et la clarté du départ.
        const pivot = (profil: Profil | 'unique') => pivotDe(recette, palette, profil);
        const reference = pivot(ancrage.profil);
        const lie = palette.derive.lien;
        echelle = entrees.echelle;
        grandeur = entrees.grandeur;
        svg.setAttribute('viewBox', `0 0 ${cadre.largeur} ${HAUTEUR_TOTALE}`);
        // Le motif des hachures des rails ; un seul graphe existe, son identifiant est unique dans la fenêtre.
        const motif = element('pattern', { id: 'hachures-du-color-shift', width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
        const fondDuMotif = element('rect', { width: 4, height: 4 });
        fondDuMotif.setAttribute('class', 'derive-hachures-fond');
        const traitDuMotif = element('line', { x1: 0, y1: 0, x2: 0, y2: 4 });
        traitDuMotif.setAttribute('class', 'derive-hachures-trait');
        motif.append(fondDuMotif, traitDuMotif);
        const definitions = element('defs', {});
        definitions.append(motif);
        const enfants: SVGElement[] = [definitions, ...reperes(grandeur, echelle).map(repere)];

        // Synchronisés, les profils partagent la ligne du porteur. Déliés, deux lignes, pleine et tiretée ([DER-05]).
        // La rampe unique d'une palette à une intensité range sa dérive sous la clé `vivid` comme sous `soft` ([ENT-14]).
        const porteur = ancrage.profil === 'unique' ? 'vivid' : ancrage.profil;
        const sommetsDesTraces = new Map<Profil, readonly Sommet[]>();
        const noms: NomDeCourbe[] = [];
        const lignes: SVGPolylineElement[] = [];
        for (const trace of lie ? [porteur] : PROFILS) {
          const rangAncre = trace === porteur ? ancrage.rangs.light : null;
          const sommets = ligneBrisee(grandeur, courbe, pivot(trace), palette.derive[trace], bouts, rangAncre);
          const points = sommets.map(({ rang, valeur }) => `${abscisse(rang, cadre, total)},${ordonnee(valeur, cadre, echelle)}`);
          const ligne = element('polyline', { points: points.join(' ') });
          if (!lie && trace === 'soft') ligne.setAttribute('class', 'derive-trait derive-trait-soft');
          else ligne.setAttribute('class', 'derive-trait derive-trait-vivid');
          enfants.push(ligne);
          lignes.push(ligne);
          sommetsDesTraces.set(trace, sommets);
          // Déliées, chaque courbe porte le nom de son profil, lisible sans la couleur ni le trait ([DER-05]).
          if (!lie) {
            const avantDernier = sommets.filter(({ rang }) => Number.isInteger(rang))[total - 2];
            // Sa place ne se lie pas à la langue : `placerLesNoms` la déplace après le dessin, et un changement de
            // langue la remettrait à la première.
            const nom = element('text', { 'text-anchor': 'middle' });
            nom.setAttribute('x', String(abscisse(total - 2, cadre, total)));
            nom.setAttribute('y', String(ordonnee(avantDernier.valeur, cadre, echelle) - 6));
            nom.setAttribute('class', 'derive-graduation derive-nom-de-courbe');
            i18n.lier(nom, 'textContent', NOM_DU_PROFIL[trace]);
            enfants.push(nom);
            noms.push({ nom, sommets });
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
        const valeurs = grandeur === 'teinte' ? { clair: derive.clair, sombre: derive.sombre } : decalageRange(derive, grandeur);
        const initiale = lie ? '' : profil[0];
        const colonneDe = (numero: number, bord: number): number => (grille.crans.includes(numero) ? grille.crans.indexOf(numero) : bord);
        const ligneDesPoignees = sommetsDesTraces.get(lie ? porteur : profil) ?? [];
        const valeurAuCran = (colonne: number): number | null => ligneDesPoignees.find(({ rang }) => rang === colonne)?.valeur ?? null;
        const colonnes: Record<Bout, number> = { clair: colonneDe(50, 0), sombre: colonneDe(950, total - 1) };
        const voisines: Record<Bout, number> = { clair: colonnes.clair + 1, sombre: colonnes.sombre - 1 };
        // Un bout que la référence dépasse n'a pas de segment à régler ([DER-14]).
        const sansSegment: Record<Bout, boolean> = { clair: reference.L > bouts.clair, sombre: reference.L < bouts.sombre };
        const dessinees: Record<Bout, ReturnType<typeof poignee> | null> = { clair: null, sombre: null };
        for (const bout of ['clair', 'sombre'] as const) {
          if (sansSegment[bout]) continue;
          enfants.push(rail(abscisse(colonnes[bout], cadre, total), permises[bout]));
          dessinees[bout] = poignee(bout, colonnes[bout], valeurs[bout], teinteA(bouts[bout], pivot(profil), derive, bouts), initiale, total, valeurAuCran(voisines[bout]), permises[bout]);
        }
        const { clair, sombre } = dessinees;
        poignees = { clair: clair?.groupe ?? null, sombre: sombre?.groupe ?? null };
        if (clair) enfants.push(clair.groupe);
        if (sombre) enfants.push(sombre.groupe);

        const largeur = (cadre.largeur - cadre.gauche - cadre.droite) / total;
        // Les deux rampes portent leur nom dans la marge des graduations, et leur titre au survol.
        const lignesDeRampe = [
          { cle: 'sans', y: Y_SANS, rampe: rampes.sans, nom: TEXTES_DE_LA_DERIVE.rampeSans, titre: TEXTES_DE_LA_DERIVE.titreDeLaRampeSans },
          { cle: 'avec', y: Y_AVEC, rampe: rampes.avec, nom: TEXTES_DE_LA_DERIVE.rampeAvec, titre: TEXTES_DE_LA_DERIVE.titreDeLaRampeAvec },
        ];
        for (const { y, nom, titre } of lignesDeRampe) {
          const texte = element('text', { x: cadre.gauche - 4, y: y + HAUTEUR_DE_CASE - 4, 'text-anchor': 'end' });
          texte.setAttribute('class', 'derive-graduation');
          i18n.lier(texte, 'textContent', nom);
          const infobulle = element('title', {});
          i18n.lier(infobulle, 'textContent', titre);
          texte.append(infobulle);
          enfants.push(texte);
        }
        courbe.forEach((_, rang) => {
          const x = abscisse(rang, cadre, total);
          const numero = element('text', { x, y: Y_CRANS, 'text-anchor': 'middle' });
          numero.setAttribute('class', 'derive-graduation');
          i18n.lier(numero, 'textContent', String(grille.crans[rang]));
          enfants.push(numero);
          for (const { y, rampe, cle } of lignesDeRampe) {
            const cran = element('rect', { x: x - largeur / 2 + 1, y, width: largeur - 2, height: HAUTEUR_DE_CASE, rx: 3 });
            cran.setAttribute('class', 'derive-cran');
            cran.dataset.rampe = cle;
            cran.setAttribute('fill', rampe[rang].hexa);
            enfants.push(cran);
          }
        });

        svg.replaceChildren(...enfants);
        const etiquettes = [clair?.etiquette, sombre?.etiquette].filter((etiquette): etiquette is SVGTextElement => etiquette !== undefined);
        placerLesNoms(noms, etiquettes, lignes, total);
      },
    };
  }
  return { CADRE, HAUTEUR_TOTALE, createGraphe };
}

export const creerVuesGraphe = memoriserVues(construireVues);
