/**
 * Le modèle candidat du Color shift, sans DOM : la rampe décalée en teinte,
 * saturation et luminosité aux deux bouts, les promesses qu'elle tient, et la
 * limite dynamique d'un réglage.
 *
 * Chaque fonction reçoit le moteur du dépôt en paramètre `M` et ne lit rien
 * d'autre que les constantes de ce module. `generer-maquette-color-shift.mjs`
 * recopie leur texte dans la page, et `mesurer-color-shift.mjs` les importe :
 * la mesure et la maquette calculent avec le même code.
 */

/** Les bornes fixes de chaque grandeur, son pas et son grand pas (Maj). */
export const GRANDEURS = {
  teinte: { bas: -90, haut: 90, pas: 1, grandPas: 5 },
  saturation: { bas: -1, haut: 1, pas: 0.01, grandPas: 0.05 },
  clarte: { bas: -0.15, haut: 0.15, pas: 0.005, grandPas: 0.02 },
};

/** L'écart de clarté minimal entre deux nuances voisines, pour que l'ordre de la rampe tienne. */
export const ECART_MINIMAL = 0.01;

/** Un décalage nul : teinte en degrés, saturation en fraction de la part, clarté en OKLCH. */
export function decalageNul() {
  return { teinte: { clair: 0, sombre: 0 }, saturation: { clair: 0, sombre: 0 }, clarte: { clair: 0, sombre: 0 } };
}

/**
 * Le bout que la clarté `L` regarde et son poids : 0 au pivot, 1 au bout.
 * C'est l'interpolation de `teinteA`, bouts sans segment compris.
 */
export function poidsA(L, pivot, bouts) {
  if (L >= pivot.L) {
    const u = bouts.clair > pivot.L ? Math.min(1, Math.max(0, (L - pivot.L) / (bouts.clair - pivot.L))) : 0;
    return { bout: 'clair', poids: u };
  }
  const v = pivot.L > bouts.sombre ? Math.min(1, Math.max(0, (pivot.L - L) / (pivot.L - bouts.sombre))) : 1;
  return { bout: 'sombre', poids: v };
}

/**
 * La rampe d'une intensité et d'un mode sous le modèle candidat. La teinte
 * suit `teinteA`. La part est multipliée par `1 + s × poids`, bornée à
 * [0, 1]. La clarté prend le décalage global de la carte, puis `c × poids`.
 * Poids et facteur des fonds se lisent sur la clarté de la courbe, comme dans
 * `fabriquerRampe`.
 */
export function rampeDecalee(M, recette, palette, intensite, mode, decalage) {
  const courbe = M.grilleDe(recette, palette).courbes[mode];
  const bouts = M.boutsDe(recette);
  const pivot = M.pivotDe(recette, palette, intensite);
  const part = M.partsDe(recette, palette)[intensite];
  const global = M.decalageDe(palette, intensite);
  const sombre = mode === 'dark' ? M.fondsSombresDe(recette) : undefined;
  return courbe.map((L) => {
    const { bout, poids } = poidsA(L, pivot, bouts);
    const H = M.teinteA(L, pivot, decalage.teinte, bouts);
    const partDecalee = Math.min(1, Math.max(0, part * (1 + decalage.saturation[bout] * poids)));
    const clarte = Math.min(1, Math.max(0, L + global + decalage.clarte[bout] * poids));
    const cran = M.fabriquerCran(clarte, H, sombre ? partDecalee * M.facteurSombre(L, sombre) : partDecalee, recette.gamut);
    return { ...cran, Lvise: clarte };
  });
}

/**
 * Les rampes d'une palette, une par intensité présente, la référence ancrée
 * comme `rampesDe`. `decalages` porte un décalage sous `soft` et `vivid` ; une
 * palette à une intensité lit celui de `vivid`, comme sa dérive.
 */
export function rampesDecalees(M, recette, palette, decalages) {
  const ancrage = M.ancrageDe(recette, palette);
  const reference = M.referenceDe(palette);
  const lue = M.rgb8VersOklch(reference);
  const rampes = {};
  for (const intensite of M.intensitesDe(palette)) {
    const decalage = decalages[intensite === 'unique' ? 'vivid' : intensite];
    rampes[intensite] = {};
    for (const mode of M.MODES) {
      const crans = rampeDecalee(M, recette, palette, intensite, mode, decalage);
      if (intensite === ancrage.profil) {
        crans[ancrage.rangs[mode]] = { couleur: reference, hexa: M.ecrireHexa(reference), L: lue.L, C: lue.C, H: lue.H, Lvise: lue.L };
      }
      rampes[intensite][mode] = crans;
    }
  }
  return rampes;
}

/** Le libellé d'un membre de paire : l'emploi et son numéro, ou le fond. */
export function libelleDuMembre(M, recette, membre) {
  if ('fond' in membre) return 'fond';
  const cible = M.TABLE_DES_EMPLOIS[membre.emploi];
  if (cible === 'fond') return 'fond';
  return `${membre.emploi} ${recette.crans[recette.crans.indexOf(cible) + membre.decalage]}`;
}

/**
 * Les promesses des rampes décalées, jugées comme `verifierPromesses` : même
 * table, mêmes seuils, même comparaison. Une palette libre n'en a pas.
 */
export function promessesDecalees(M, recette, palette, rampes) {
  if (palette.crans !== undefined) return [];
  const fonds = { light: M.lireHexa(recette.fonds.light), dark: M.lireHexa(recette.fonds.dark) };
  const designer = (membre, mode, intensite) => {
    if ('fond' in membre) return fonds[mode];
    const cible = M.TABLE_DES_EMPLOIS[membre.emploi];
    if (cible === 'fond') return fonds[mode];
    return rampes[intensite][mode][recette.crans.indexOf(cible) + membre.decalage].couleur;
  };
  const paires = M.PAIRES.filter((paire) => M.paireJugeable(paire, recette.crans));
  const promesses = [];
  for (const mode of M.MODES) {
    for (const intensite of M.intensitesDe(palette)) {
      for (const paire of paires) {
        const seuil = recette.seuils[paire.seuil];
        const contraste = M.contraste(designer(paire.premier, mode, intensite), designer(paire.second, mode, intensite));
        promesses.push({
          cle: `${mode}/${intensite}/${paire.numero}`,
          mode,
          intensite,
          libelle: `${libelleDuMembre(M, recette, paire.premier)} / ${libelleDuMembre(M, recette, paire.second)}`,
          seuil,
          contraste,
          tenue: M.atteintLeSeuil(contraste, seuil),
        });
      }
    }
  }
  return promesses;
}

/** Vrai quand chaque rampe garde l'ordre de ses nuances, avec `ECART_MINIMAL` entre voisines. */
export function ordreTenu(rampes) {
  return Object.values(rampes).every((parMode) => Object.values(parMode).every((crans) => {
    const sens = Math.sign(crans[0].Lvise - crans[crans.length - 1].Lvise);
    return crans.every((cran, rang) => rang === 0 || sens * (crans[rang - 1].Lvise - cran.Lvise) >= ECART_MINIMAL - 1e-9);
  }));
}

/** Les décalages où `grandeur` prend `valeur` au `bout`, pour chaque profil de `cibles`. */
export function decalagesAvec(decalages, cibles, grandeur, bout, valeur) {
  const suivants = { ...decalages };
  for (const profil of cibles) {
    suivants[profil] = { ...decalages[profil], [grandeur]: { ...decalages[profil][grandeur], [bout]: valeur } };
  }
  return suivants;
}

/**
 * La limite dynamique d'une grandeur à un bout : l'intervalle autour de la
 * valeur courante où aucune promesse tenue au départ ne manque, et où l'ordre
 * des nuances tient pour la clarté. `cibles` nomme les profils que le geste
 * déplace : les deux quand ils sont synchronisés. Le balayage suit le pas de
 * la grandeur. Chaque borne porte sa cause : la première promesse qui
 * manquerait au-delà, avec son contraste, ou l'ordre des nuances.
 */
export function limiteDe(M, recette, palette, decalages, cibles, grandeur, bout) {
  const { bas, haut, pas } = GRANDEURS[grandeur];
  const tenuesAuDepart = new Set(promessesDecalees(M, recette, palette, rampesDecalees(M, recette, palette, decalages))
    .filter((promesse) => promesse.tenue).map((promesse) => promesse.cle));
  const verdict = (valeur) => {
    const rampes = rampesDecalees(M, recette, palette, decalagesAvec(decalages, cibles, grandeur, bout, valeur));
    if (grandeur === 'clarte' && !ordreTenu(rampes)) return { ordre: true };
    const manquee = promessesDecalees(M, recette, palette, rampes).find((promesse) => !promesse.tenue && tenuesAuDepart.has(promesse.cle));
    return manquee ? { promesse: manquee } : null;
  };
  const courant = decalages[cibles[0]][grandeur][bout];
  const chercher = (sens) => {
    let dernier = courant;
    for (let rang = 1; ; rang += 1) {
      const valeur = Math.round((courant + sens * rang * pas) / pas) * pas;
      if (sens > 0 ? valeur > haut + 1e-9 : valeur < bas - 1e-9) return { borne: sens > 0 ? haut : bas, cause: null };
      const cause = verdict(valeur);
      if (cause) return { borne: dernier, cause };
      dernier = valeur;
    }
  };
  return { bas: chercher(-1), haut: chercher(1) };
}
