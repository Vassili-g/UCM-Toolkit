#!/usr/bin/env node
/**
 * Mesure (lot 3a de la recette v8) : les réglages d'une palette à deux
 * intensités se reconstruisent-ils depuis ses seules rampes ?
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/Recette v8/Mesures/mesurer-reconstruction.mjs"
 *
 * Lancé depuis la racine du dépôt. Aucun build : `tsx` lit les sources du
 * moteur (`packages/couleur/src`). Options : `--n=30` (palettes), `--graine=N`,
 * `--seul=N`.
 *
 * Étapes, par palette :
 *  1. Tirage de réglages variés (référence, Color shift, parts propres, palette
 *     de base, carte « Réglage global »), validés par `validerRecette`.
 *  2. Rampes d'origine : `rampesDe`, le chemin du plugin (`variables/plan.ts`).
 *     Seuls les hexa par intensité, thème et nuance passent à l'étape 3.
 *  3. Reconstruction. Chaque hexa que le thème Light et le thème Dark d'une
 *     même intensité partagent est un ancrage possible de la référence (MOT-17).
 *     Pour chacun : ajustement par moindres carrés sur un modèle flottant du
 *     moteur (pivot, parts, Color shift, décalage de clarté) ; recherche locale
 *     aléatoire sur l'erreur en octets mesurée avec `rampesDe` ; si le
 *     porteur a un décalage de clarté, balayage de ses multiples de 0,005 qui
 *     fixent la clarté du départ ; enfin calage sur les grains des réglages
 *     (degré, 0,005, 0,01, 0,001) et sur les octets du départ.
 *  4. Écart maximal : distance max sur les canaux 0 à 255 entre les rampes
 *     d'origine et les rampes de la palette reconstruite, passée au moteur.
 *
 * Durée : de 2 à 40 s par palette, 10 minutes pour trente. `--seul=N` ne
 * relance que la palette N, avec la même graine de recherche.
 *
 * Le moteur n'est pas modifié. La recette globale (courbes, parts communes,
 * fonds sombres, relevé Tailwind) est celle par défaut et reste connue.
 */
import {
  MODES,
  PROFILS,
  boutsDe,
  ecrireHexa,
  encoder,
  fabriquerCran,
  facteurSombre,
  fondsSombresDe,
  grilleDe,
  lireHexa,
  normaliserTeinte,
  oklchVersLineaire,
  partsDe,
  plafond,
  poidsA,
  prereglageTailwind,
  profilPorteur,
  rampesDe,
  rangPorteur,
  recetteParDefaut,
  referenceReglee,
  rgb8VersOklch,
  validerRecette,
} from '../../../../../../packages/couleur/src/index.ts';

const argument = (nom, defaut) => {
  const trouve = process.argv.find((a) => a.startsWith(`--${nom}=`));
  return trouve ? Number(trouve.split('=')[1]) : defaut;
};
const NOMBRE = argument('n', 30);
const GRAINE = argument('graine', 20261008);

/** Générateur à graine fixe (mulberry32). */
function generateur(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const arrondi = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const borner = (x, bas = 0, haut = 1) => Math.min(haut, Math.max(bas, x));
const ecartAngle = (a, b) => ((a - b + 540) % 360) - 180;
const hexa = (couleur) => ecrireHexa(couleur);

// ---------------------------------------------------------------- tirage

const RECETTE = recetteParDefaut();
const GRILLE = grilleDe(RECETTE, {});
const BOUTS = boutsDe(RECETTE);
const SOMBRE = fondsSombresDe(RECETTE);
const NUANCES = GRILLE.crans.length;

function tirerPalette(hasard, rang) {
  const u = (a, b) => a + (b - a) * hasard();
  const signe = () => (hasard() < 0.5 ? -1 : 1);
  const L = u(0.38, 0.82);
  const H = u(0, 360);
  const part = hasard() < 0.15 ? u(0.05, 0.2) : u(0.3, 1);
  const depart = fabriquerCran(L, H, part, 'srgb').couleur;
  const luDepart = rgb8VersOklch(depart);

  const genre = hasard();
  let soft;
  let vivid;
  let lien = true;
  const libre = () => {
    const derive = { clair: arrondi(u(-40, 40), 2), sombre: arrondi(u(-40, 40), 2), origine: 'libre' };
    if (hasard() < 0.4) {
      const saturation = { clair: arrondi(u(-0.4, 0.4), 2), sombre: arrondi(u(-0.4, 0.4), 2) };
      if (saturation.clair !== 0 || saturation.sombre !== 0) derive.saturation = saturation;
    }
    if (hasard() < 0.4) {
      const clarte = { clair: arrondi(u(-0.06, 0.06) / 0.005, 0) * 0.005, sombre: arrondi(u(-0.06, 0.06) / 0.005, 0) * 0.005 };
      const propre = { clair: arrondi(clarte.clair, 3), sombre: arrondi(clarte.sombre, 3) };
      if (propre.clair !== 0 || propre.sombre !== 0) derive.clarte = propre;
    }
    return derive;
  };
  let nature;
  if (genre < 0.4) {
    const d = prereglageTailwind(luDepart, BOUTS, RECETTE.derives);
    soft = vivid = { clair: d.clair, sombre: d.sombre, origine: 'tailwind' };
    nature = 'tailwind';
  } else if (genre < 0.55) {
    soft = vivid = { clair: 0, sombre: 0, origine: 'constante' };
    nature = 'constante';
  } else if (hasard() < 0.5) {
    soft = vivid = libre();
    nature = 'libre liée';
  } else {
    soft = libre();
    vivid = libre();
    lien = false;
    nature = 'libre déliée';
  }
  if (soft.clair === 0 && soft.sombre === 0 && !soft.saturation && !soft.clarte && lien === false) lien = false;

  let palette = {
    id: `p-${(0x10000000 + rang).toString(16)}`,
    nom: `Tirage ${rang + 1}`,
    reference: hexa(depart),
    derive: { lien, soft, vivid },
  };
  const traits = [nature];
  if (hasard() < 0.3) {
    palette = { ...palette, parts: { soft: arrondi(u(0.2, 0.6), 3), vivid: arrondi(u(0.7, 1), 3), origine: 'designer' } };
    traits.push('parts propres');
  }
  if (hasard() < 0.3) {
    palette = { ...palette, base: hasard() < 0.5 ? 'soft' : 'vivid' };
    traits.push(`base ${palette.base}`);
  }
  if (hasard() < 0.45) {
    const porteur = profilPorteur(RECETTE, palette);
    const teinte = {};
    const clarte = {};
    for (const profil of PROFILS) {
      if (hasard() < 0.5) teinte[profil] = signe() * Math.round(u(1, 20));
      if (hasard() < 0.5) clarte[profil] = signe() * 0.005 * Math.round(u(1, 14));
    }
    const reglages = {};
    if (Object.keys(teinte).length) reglages.teinte = teinte;
    if (Object.keys(clarte).length) reglages.clarte = Object.fromEntries(Object.entries(clarte).map(([k, v]) => [k, arrondi(v, 3)]));
    if (hasard() < 0.25) reglages.part = arrondi(u(0.2, 1), 3);
    if (!reglages.teinte && !reglages.clarte && reglages.part === undefined) reglages.teinte = { [porteur]: signe() * Math.round(u(1, 20)) };
    if (!palette.base) reglages.porteur = porteur;
    const sur = (cle) => reglages[cle]?.[porteur];
    const touche = reglages.part !== undefined || sur('teinte') !== undefined || sur('clarte') !== undefined;
    if (touche) {
      const reference = referenceReglee(depart, sur('teinte') ?? 0, sur('clarte') ?? 0, reglages.part, 'srgb');
      palette = { ...palette, reference: hexa(reference), originale: hexa(depart), reglages };
    } else {
      palette = { ...palette, reglages };
    }
    traits.push(`réglages ${[reglages.teinte && 'teinte', reglages.clarte && 'clarté', reglages.part !== undefined && 'part'].filter(Boolean).join('+')}${touche ? ' (porteur)' : ' (autre profil)'}`);
  }
  return { palette, traits };
}

function tirerLesPalettes() {
  const hasard = generateur(GRAINE);
  const palettes = [];
  let essais = 0;
  while (palettes.length < NOMBRE) {
    essais += 1;
    const tirage = tirerPalette(hasard, palettes.length);
    const verdict = validerRecette({ ...RECETTE, palettes: [tirage.palette] });
    if ('refus' in verdict) {
      if (essais > NOMBRE * 20) throw new Error(`Tirages refusés : ${JSON.stringify(verdict.refus)}`);
      continue;
    }
    palettes.push(tirage);
  }
  return palettes;
}

// ---------------------------------------------------------------- observation

/** Ce que contiennent les variables : l'hexa de chaque nuance, par intensité et thème. */
function observer(palette) {
  const rampes = rampesDe({ ...RECETTE, palettes: [palette] }, palette);
  const sortie = {};
  for (const profil of PROFILS) {
    sortie[profil] = {};
    for (const mode of MODES) sortie[profil][mode] = rampes[profil][mode].map((cran) => cran.hexa);
  }
  return sortie;
}

function ecartEntre(observe, palette) {
  const rampes = rampesDe({ ...RECETTE, palettes: [palette] }, palette);
  let max = 0;
  let somme = 0;
  const ecarts = [];
  for (const profil of PROFILS) {
    for (const mode of MODES) {
      rampes[profil][mode].forEach((cran, rang) => {
        const voulu = lireHexa(observe[profil][mode][rang]);
        const d = Math.max(...cran.couleur.map((canal, i) => Math.abs(canal - voulu[i])));
        for (let i = 0; i < 3; i += 1) somme += (cran.couleur[i] - voulu[i]) ** 2;
        if (d > 0) ecarts.push(`${profil}/${mode}/${GRILLE.crans[rang]}:${d}`);
        max = Math.max(max, d);
      });
    }
  }
  return { max, somme, ecarts };
}

// ---------------------------------------------------------------- modèle flottant

const NOMS = ['Hp', 'delta', 'p', 'dc', 'ds', 'sc', 'ss', 'lc', 'ls'];
const BORNES = { Hp: [-1e9, 1e9], delta: [-0.15, 0.15], p: [0, 1], dc: [-90, 90], ds: [-90, 90], sc: [-1, 1], ss: [-1, 1], lc: [-0.15, 0.15], ls: [-0.15, 0.15] };
const PAS = { Hp: 0.5, delta: 0.002, p: 0.005, dc: 0.5, ds: 0.5, sc: 0.01, ss: 0.01, lc: 0.003, ls: 0.003 };
const indice = (profil, nom) => 1 + (profil === 'soft' ? 0 : NOMS.length) + NOMS.indexOf(nom);
const NB_PARAMETRES = 1 + 2 * NOMS.length;

/** Une rampe en canaux flottants 0 à 255, calculée comme `fabriquerRampe` sans l'arrondi final. */
function rampeFlottante(x, profil, mode) {
  const lire = (nom) => x[indice(profil, nom)];
  const pivot = { L: x[0], C: 0, H: 0 };
  return GRILLE.courbes[mode].map((L) => {
    const { bout, poids } = poidsA(L, pivot, BOUTS);
    const clair = bout === 'clair';
    const part = borner(lire('p') * (1 + (clair ? lire('sc') : lire('ss')) * poids));
    const clarte = borner(L + lire('delta') + (clair ? lire('lc') : lire('ls')) * poids);
    const teinte = normaliserTeinte(lire('Hp') + (clair ? lire('dc') : lire('ds')) * poids);
    const C = part * (mode === 'dark' ? facteurSombre(L, SOMBRE) : 1) * plafond(clarte, teinte, 'srgb');
    return oklchVersLineaire({ L: clarte, C, H: teinte }).map((v) => 255 * encoder(borner(v)));
  });
}

function residus(x, contexte) {
  const sortie = [];
  for (const profil of PROFILS) {
    for (const mode of MODES) {
      const modele = rampeFlottante(x, profil, mode);
      modele.forEach((canaux, rang) => {
        if (contexte.ancres.has(`${profil}/${mode}/${rang}`)) return;
        const voulu = contexte.octets[profil][mode][rang];
        for (let i = 0; i < 3; i += 1) sortie.push(canaux[i] - voulu[i]);
      });
    }
  }
  return sortie;
}

function resoudre(A, b) {
  const n = b.length;
  const M = A.map((ligne, i) => [...ligne, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let pivot = c;
    for (let l = c + 1; l < n; l += 1) if (Math.abs(M[l][c]) > Math.abs(M[pivot][c])) pivot = l;
    if (Math.abs(M[pivot][c]) < 1e-18) return null;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    for (let l = c + 1; l < n; l += 1) {
      const f = M[l][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[l][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let l = n - 1; l >= 0; l -= 1) {
    let s = M[l][n];
    for (let k = l + 1; k < n; k += 1) s -= M[l][k] * x[k];
    x[l] = s / M[l][l];
  }
  return x;
}

function limiter(x, libres, fenetreL) {
  const y = x.slice();
  for (const i of libres) {
    if (i === 0) {
      y[0] = borner(y[0], fenetreL[0], fenetreL[1]);
      continue;
    }
    const nom = NOMS[(i - 1) % NOMS.length];
    y[i] = borner(y[i], BORNES[nom][0], BORNES[nom][1]);
  }
  return y;
}

/** Levenberg-Marquardt sur les paramètres `libres`, jacobienne par différences finies. */
function ajuster(x0, libres, contexte, iterations, fenetreL) {
  let x = limiter(x0, libres, fenetreL);
  let r = residus(x, contexte);
  let cout = r.reduce((s, v) => s + v * v, 0);
  let lambda = 1e-2;
  for (let it = 0; it < iterations; it += 1) {
    const J = libres.map((i) => {
      const h = 1e-5 * (1 + Math.abs(x[i]));
      const y = x.slice();
      y[i] += h;
      return residus(y, contexte).map((v, k) => (v - r[k]) / h);
    });
    const A = libres.map((_, a) => libres.map((__, b) => J[a].reduce((s, v, k) => s + v * J[b][k], 0)));
    const g = libres.map((_, a) => J[a].reduce((s, v, k) => s + v * r[k], 0));
    let accepte = false;
    for (let essai = 0; essai < 8 && !accepte; essai += 1) {
      const B = A.map((ligne, a) => ligne.map((v, b) => (a === b ? v + lambda * (v + 1e-9) + 1e-12 : v)));
      const dx = resoudre(B, g.map((v) => -v));
      if (!dx) {
        lambda *= 10;
        continue;
      }
      const y = x.slice();
      libres.forEach((i, a) => { y[i] += dx[a]; });
      const z = limiter(y, libres, fenetreL);
      const rz = residus(z, contexte);
      const coutZ = rz.reduce((s, v) => s + v * v, 0);
      if (coutZ < cout) {
        const gain = cout - coutZ;
        x = z;
        r = rz;
        cout = coutZ;
        lambda = Math.max(lambda / 4, 1e-9);
        accepte = true;
        if (gain < 1e-9) return { x, cout };
      } else {
        lambda *= 5;
      }
    }
    if (!accepte) break;
  }
  return { x, cout };
}

// ---------------------------------------------------------------- reconstruction

/** Valeurs de départ lues dans les rampes observées, d'après la structure du moteur (poids 0 près du pivot, 1 aux bouts). */
function initialiser(x, profil, contexte, variante) {
  const y = x.slice();
  const lus = contexte.oklch[profil].light;
  const courbe = GRILLE.courbes.light;
  let k0 = -1;
  let meilleur = Infinity;
  courbe.forEach((L, k) => {
    if (contexte.ancres.has(`${profil}/light/${k}`)) return;
    const d = Math.abs(L - x[0]);
    if (d < meilleur) { meilleur = d; k0 = k; }
  });
  const proche = lus[k0];
  const teinteProche = proche.C < 1e-3 ? contexte.reference.H : proche.H;
  const base = Math.max(plafond(proche.L, teinteProche, 'srgb'), 1e-6);
  const mise = (nom, valeur) => { y[indice(profil, nom)] = valeur; };
  mise('Hp', teinteProche);
  mise('delta', borner(proche.L - courbe[k0], -0.15, 0.15));
  mise('p', borner(proche.C / base));
  for (const nom of ['dc', 'ds', 'sc', 'ss', 'lc', 'ls']) mise(nom, 0);
  if (variante === 'estimee') {
    const bout = (rang, nomH, nomS, nomL) => {
      const o = lus[rang];
      if (o.C > 2e-3) mise(nomH, borner(ecartAngle(o.H, teinteProche), -90, 90));
      const plaf = Math.max(plafond(o.L, o.C > 2e-3 ? o.H : teinteProche, 'srgb'), 1e-6);
      const p = y[indice(profil, 'p')];
      if (p > 0.02 && o.C > 2e-3) mise(nomS, borner(o.C / plaf / p - 1, -1, 1));
      mise(nomL, borner(o.L - courbe[rang] - y[indice(profil, 'delta')], -0.15, 0.15));
    };
    bout(0, 'dc', 'sc', 'lc');
    bout(NUANCES - 1, 'ds', 'ss', 'ls');
  }
  return y;
}

/** Une couleur à 8 bits dont la clarté OKLCH approche `L`, de teinte proche de `H` (le départ d'un réglage de clarté). */
function departParClarte(L, H, C) {
  const lisse = fabriquerCran(L, H, borner(C / Math.max(plafond(L, H, 'srgb'), 1e-6)), 'srgb').couleur;
  let meilleur = lisse;
  let ecart = Infinity;
  for (let dr = -3; dr <= 3; dr += 1) {
    for (let dg = -3; dg <= 3; dg += 1) {
      for (let db = -3; db <= 3; db += 1) {
        const c = [lisse[0] + dr, lisse[1] + dg, lisse[2] + db];
        if (c.some((v) => v < 0 || v > 255)) continue;
        const lu = rgb8VersOklch(c);
        const e = Math.abs(lu.L - L) * 1000 + Math.abs(ecartAngle(lu.H, H)) * 0.001;
        if (e < ecart) { ecart = e; meilleur = c; }
      }
    }
  }
  return meilleur;
}

/** Paramètres de recherche vers une palette du moteur, dans la forme que la recette range. */
function construirePalette(x, contexte, depart) {
  const lu = rgb8VersOklch(depart);
  const reglagesTeinte = {};
  const reglagesClarte = {};
  const derive = {};
  const lecture = (profil, nom) => x[indice(profil, nom)];
  for (const profil of PROFILS) {
    const t = ecartAngle(lecture(profil, 'Hp'), lu.H);
    if (Math.abs(t) > 1e-9) reglagesTeinte[profil] = t;
    if (Math.abs(lecture(profil, 'delta')) > 1e-12) reglagesClarte[profil] = lecture(profil, 'delta');
    const d = { clair: lecture(profil, 'dc'), sombre: lecture(profil, 'ds'), origine: 'libre' };
    if (lecture(profil, 'sc') !== 0 || lecture(profil, 'ss') !== 0) d.saturation = { clair: lecture(profil, 'sc'), sombre: lecture(profil, 'ss') };
    if (lecture(profil, 'lc') !== 0 || lecture(profil, 'ls') !== 0) d.clarte = { clair: lecture(profil, 'lc'), sombre: lecture(profil, 'ls') };
    derive[profil] = d;
  }
  const reglages = {};
  if (Object.keys(reglagesTeinte).length) reglages.teinte = reglagesTeinte;
  if (Object.keys(reglagesClarte).length) reglages.clarte = reglagesClarte;
  const porteur = contexte.porteur;
  let palette = {
    id: 'p-00000000',
    reference: hexa(contexte.reference.octets),
    derive: { lien: false, soft: derive.soft, vivid: derive.vivid },
    parts: { soft: x[indice('soft', 'p')], vivid: x[indice('vivid', 'p')], origine: 'designer' },
    base: porteur,
  };
  if (Object.keys(reglages).length) palette = { ...palette, reglages };
  if (reglagesTeinte[porteur] !== undefined || reglagesClarte[porteur] !== undefined) palette = { ...palette, originale: hexa(depart) };
  return palette;
}

/** Recherche locale aléatoire sur les valeurs continues, à pas décroissants, qui garde tout essai d'erreur égale ou moindre. */
function polir(x0, contexte, depart, libres, hasard, essais) {
  let x = x0.slice();
  let courant = ecartEntre(contexte.observe, construirePalette(x, contexte, depart));
  for (let essai = 0; essai < essais && courant.somme > 0; essai += 1) {
    const y = x.slice();
    const mouvements = hasard() < 0.5 ? 1 : 2;
    for (let m = 0; m < mouvements; m += 1) {
      const i = libres[Math.floor(hasard() * libres.length)];
      if (i === 0) continue;
      const nom = NOMS[(i - 1) % NOMS.length];
      y[i] += PAS[nom] * 10 ** (-3 * hasard()) * (hasard() < 0.5 ? -1 : 1);
    }
    const z = limiter(y, libres, [0, 1]);
    const mesure = ecartEntre(contexte.observe, construirePalette(z, contexte, depart));
    if (mesure.somme <= courant.somme) {
      x = z;
      courant = mesure;
    }
  }
  return { x, depart, ...courant };
}

/** Le grain de chaque réglage : ce que la carte et le Color shift permettent d'écrire (pas des réglettes, arrondis de la recette). */
const GRAINS = { t: 1, delta: 0.005, p: 0.001, dc: 0.01, ds: 0.01, sc: 0.01, ss: 0.01, lc: 0.005, ls: 0.005 };
const CLES = Object.keys(GRAINS);
const ESSAIS_DE_PLATEAU = 1500;

/**
 * Cale l'ajustement continu sur les grilles des réglages : chaque valeur
 * s'arrondit à son grain, puis une descente par coordonnées (un grain à la
 * fois) et par octet du départ (un octet à la fois) réduit l'erreur mesurée
 * avec `rampesDe`. L'erreur est celle du moteur, pas celle du modèle flottant.
 */
function caler(x0, contexte, depart0, hasard) {
  let depart = depart0.slice();
  const lecture = (d) => rgb8VersOklch(d);
  const versEntiers = (x, d) => {
    const H = lecture(d).H;
    const n = {};
    for (const profil of PROFILS) {
      n[profil] = {};
      for (const cle of CLES) {
        const brut = cle === 't' ? ecartAngle(x[indice(profil, 'Hp')], H) : x[indice(profil, cle)];
        n[profil][cle] = Math.round(brut / GRAINS[cle]);
      }
    }
    return n;
  };
  const versX = (n, d) => {
    const lu = lecture(d);
    const x = new Array(NB_PARAMETRES).fill(0);
    x[0] = lu.L;
    for (const profil of PROFILS) {
      for (const cle of CLES) {
        const valeur = n[profil][cle] * GRAINS[cle];
        x[indice(profil, cle === 't' ? 'Hp' : cle)] = cle === 't' ? normaliserTeinte(lu.H + valeur) : valeur;
      }
    }
    return x;
  };
  const evaluer = (n, d) => ecartEntre(contexte.observe, construirePalette(versX(n, d), contexte, d));
  let n = versEntiers(x0, depart);
  let courant = evaluer(n, depart);
  for (let tour = 0; tour < 60 && courant.somme > 0; tour += 1) {
    let progres = false;
    for (const profil of PROFILS) {
      for (const cle of CLES) {
        for (const pas of [1, -1, 3, -3]) {
          const essai = { ...n, [profil]: { ...n[profil], [cle]: n[profil][cle] + pas } };
          const mesure = evaluer(essai, depart);
          if (mesure.somme < courant.somme) {
            n = essai;
            courant = mesure;
            progres = true;
            break;
          }
        }
        if (courant.somme === 0) break;
      }
      if (courant.somme === 0) break;
    }
    if (!progres && courant.somme > 0) {
      // Le départ est un triplet d'octets : on cherche dans le cube de rayon 3 autour du départ courant.
      let meilleur = null;
      const absolu = versX(n, depart);
      for (let dr = -3; dr <= 3; dr += 1) {
        for (let dg = -3; dg <= 3; dg += 1) {
          for (let db = -3; db <= 3; db += 1) {
            if (dr === 0 && dg === 0 && db === 0) continue;
            const d = [depart[0] + dr, depart[1] + dg, depart[2] + db];
            if (d.some((v) => v < 0 || v > 255)) continue;
            // Les teintes absolues des pivots restent celles de l'ajustement : les réglages de teinte relatifs au nouveau départ s'en déduisent.
            const relatif = versEntiers(absolu, d);
            const mesure = evaluer(relatif, d);
            if (mesure.somme < (meilleur?.mesure.somme ?? courant.somme)) meilleur = { d, mesure, relatif };
          }
        }
      }
      if (meilleur) {
        depart = meilleur.d;
        n = meilleur.relatif;
        courant = meilleur.mesure;
        progres = true;
      }
    }
    if (!progres) break;
  }
  // Plateaux : des réglages différents donnent presque les mêmes octets. Des déplacements groupés, acceptés à erreur égale ou moindre, les traversent.
  for (let essai = 0; essai < ESSAIS_DE_PLATEAU && courant.somme > 0; essai += 1) {
    const candidat = { soft: { ...n.soft }, vivid: { ...n.vivid } };
    const mouvements = 1 + Math.floor(hasard() * 3);
    for (let m = 0; m < mouvements; m += 1) {
      const profil = PROFILS[Math.floor(hasard() * 2)];
      const cle = CLES[Math.floor(hasard() * CLES.length)];
      candidat[profil][cle] += (hasard() < 0.5 ? -1 : 1) * (1 + Math.floor(hasard() * 3));
    }
    let d = depart;
    if (hasard() < 0.25) {
      const canal = Math.floor(hasard() * 3);
      d = depart.slice();
      d[canal] = Math.min(255, Math.max(0, d[canal] + (hasard() < 0.5 ? -1 : 1)));
    }
    const mesure = evaluer(candidat, d);
    if (mesure.somme <= courant.somme) {
      n = candidat;
      depart = d;
      courant = mesure;
    }
  }
  return { x: versX(n, depart), depart, ...courant };
}

/** Reconstruit une palette candidate pour un ancrage donné : intensité porteuse, rang Light, rang Dark. */
function essayerCandidat(observe, porteur, rangLight, rangDark, hasard) {
  const octetsDe = (h) => lireHexa(h);
  const octets = {};
  const oklch = {};
  for (const profil of PROFILS) {
    octets[profil] = {};
    oklch[profil] = {};
    for (const mode of MODES) {
      octets[profil][mode] = observe[profil][mode].map(octetsDe);
      oklch[profil][mode] = octets[profil][mode].map(rgb8VersOklch);
    }
  }
  const couleur = octets[porteur].light[rangLight];
  const lu = rgb8VersOklch(couleur);
  const contexte = {
    observe,
    octets,
    oklch,
    porteur,
    reference: { octets: couleur, L: lu.L, C: lu.C, H: lu.H },
    ancres: new Set([`${porteur}/light/${rangLight}`, `${porteur}/dark/${rangDark}`]),
  };
  const rangsOk = (L) => rangPorteur(GRILLE.courbes.light, L) === rangLight && rangPorteur(GRILLE.courbes.dark, L) === rangDark;
  const libresSansL = [...Array(NB_PARAMETRES - 1).keys()].map((i) => i + 1);
  const resultat = [];

  const depart1 = contexte.reference.octets;
  const lancer = (variante, L0, depart, iterations) => {
    let x = new Array(NB_PARAMETRES).fill(0);
    x[0] = L0;
    for (const profil of PROFILS) x = initialiser(x, profil, contexte, variante);
    return ajuster(x, libresSansL, contexte, iterations, [L0, L0]);
  };

  // Départ structuré : pivot à la référence, parts par défaut du moteur, Color shift Tailwind ou nul.
  const structuree = (tailwind) => {
    const x = new Array(NB_PARAMETRES).fill(0);
    x[0] = lu.L;
    const nul = { clair: 0, sombre: 0, origine: 'constante' };
    const parts = partsDe(RECETTE, { id: 'p-00000000', reference: hexa(couleur), derive: { lien: true, soft: nul, vivid: nul }, base: porteur });
    const derive = tailwind ? prereglageTailwind(lu, BOUTS, RECETTE.derives) : nul;
    for (const profil of PROFILS) {
      x[indice(profil, 'Hp')] = lu.C < 1e-3 ? 0 : lu.H;
      x[indice(profil, 'p')] = parts[profil];
      x[indice(profil, 'dc')] = derive.clair;
      x[indice(profil, 'ds')] = derive.sombre;
    }
    return x;
  };
  const sansPivot = libresSansL.filter((i) => !['Hp', 'delta'].includes(NOMS[(i - 1) % NOMS.length]));

  if (rangsOk(lu.L)) {
    const essais1 = [
      ['structuree Tailwind', () => structuree(true), sansPivot],
      ['structuree nulle', () => structuree(false), sansPivot],
      ['structuree libre', () => structuree(true), libresSansL],
      ['estimee', () => lancer('estimee', lu.L, depart1, 40).x, libresSansL],
      ['nulle', () => lancer('nulle', lu.L, depart1, 40).x, libresSansL],
    ];
    for (const [, depart, libres] of essais1) {
      const brut = depart();
      const mesureBrute = ecartEntre(observe, construirePalette(brut, contexte, depart1));
      if (mesureBrute.max === 0) return { x: brut, ...mesureBrute, depart: depart1, passe: 1, contexte };
      const ajuste = ajuster(brut, libres, contexte, 40, [lu.L, lu.L]);
      const continu = polir(ajuste.x, contexte, depart1, libres, hasard, ajuste.cout > 0 ? 1500 : 0);
      resultat.push({ ...continu, passe: 1, contexte });
      if (continu.max === 0) return resultat.at(-1);
      const poli = caler(continu.x, contexte, depart1, hasard);
      resultat.push({ ...poli, passe: 1, contexte });
      if (poli.max === 0) return resultat.at(-1);
    }
  }

  // Passe 2 : le porteur porte un réglage de clarté, donc le départ n'est pas la référence. Le réglage est un multiple de 0,005
  // (pas de la réglette) : chaque multiple fixe le décalage du porteur et la clarté du départ, et les autres réglages se
  // cherchent par ajustement. Les trois meilleurs ajustements passent au calage.
  const sansDecalage = libresSansL.filter((i) => i !== indice(porteur, 'delta'));
  const essais = [];
  for (let k = -20; k <= 20; k += 1) {
    if (k === 0) continue;
    const L0 = lu.L - k * 0.005;
    if (!rangsOk(L0)) continue;
    const depart = departParClarte(L0, lu.H, lu.C);
    const L1 = rgb8VersOklch(depart).L;
    let x = new Array(NB_PARAMETRES).fill(0);
    x[0] = L1;
    for (const profil of PROFILS) x = initialiser(x, profil, contexte, 'estimee');
    x[indice(porteur, 'Hp')] = lu.C < 1e-3 ? 0 : lu.H;
    x[indice(porteur, 'delta')] = k * 0.005;
    const ajuste = ajuster(x, sansDecalage, contexte, 15, [L1, L1]);
    essais.push({ depart, ...ajuste });
  }
  essais.sort((p, q) => p.cout - q.cout);
  for (const essai of essais.slice(0, 3)) {
    const continu = polir(essai.x, contexte, essai.depart, sansDecalage, hasard, 1500);
    resultat.push({ ...continu, passe: 2, contexte });
    if (continu.max === 0) return resultat.at(-1);
    const poli = caler(continu.x, contexte, essai.depart, hasard);
    resultat.push({ ...poli, passe: 2, contexte });
    if (poli.max === 0) return resultat.at(-1);
  }
  return resultat.sort((a, b) => a.somme - b.somme)[0] ?? null;
}

function reconstruire(observe, hasard) {
  let meilleur = null;
  const candidats = [];
  for (const porteur of PROFILS) {
    observe[porteur].light.forEach((h, rl) => {
      observe[porteur].dark.forEach((d, rd) => { if (h === d) candidats.push({ porteur, rl, rd }); });
    });
  }
  for (const { porteur, rl, rd } of candidats) {
    const essai = essayerCandidat(observe, porteur, rl, rd, hasard);
    if (!essai) continue;
    if (!meilleur || essai.somme < meilleur.somme) meilleur = { ...essai, candidat: { porteur, rl, rd }, candidats: candidats.length };
    if (meilleur.max === 0) break;
  }
  if (!meilleur) return { max: 255, somme: Infinity, ecarts: ['aucun ancrage trouvé'], palette: null, candidats: candidats.length };
  return { ...meilleur, palette: construirePalette(meilleur.x, meilleur.contexte, meilleur.depart) };
}

// ---------------------------------------------------------------- mesure

function main() {
  const debut = Date.now();
  const seul = argument('seul', 0);
  const tirages = tirerLesPalettes().map((t, i) => ({ ...t, numero: i + 1 })).filter((t) => !seul || t.numero === seul);
  console.log(`Mesure de reconstruction : ${tirages.length} palettes, graine ${GRAINE}, ${NUANCES} nuances, recette par défaut.\n`);
  console.log('#   écart  nuances≠  passe  schéma  tirage');
  const lignes = [];
  tirages.forEach(({ palette, traits, numero }, rang) => {
    const observe = observer(palette);
    // Une graine par palette : `--seul=N` rend le même résultat que la série complète.
    const r = reconstruire(observe, generateur((GRAINE ^ 0x9e3779b9) + numero));
    let schema = '-';
    if (r.palette) {
      const verdict = validerRecette({ ...RECETTE, palettes: [r.palette] });
      schema = 'refus' in verdict ? verdict.refus.map((f) => f.regle).join(',') : 'valide';
    }
    const porteurVrai = profilPorteur(RECETTE, palette);
    const note = r.candidat ? (r.candidat.porteur === porteurVrai ? '' : ` porteur lu ${r.candidat.porteur}, vrai ${porteurVrai}`) : '';
    lignes.push({ rang: numero, max: r.max, nb: r.ecarts.length, passe: r.passe ?? '-', schema, traits, ecarts: r.ecarts, note });
    console.log(`${String(numero).padStart(2)}  ${String(r.max).padStart(5)}  ${String(r.ecarts.length).padStart(8)}  ${String(r.passe ?? '-').padStart(5)}  ${schema.padEnd(6)}  ${traits.join(' ; ')}${note}`);
  });
  const nuls = lignes.filter((l) => l.max === 0);
  const maxTotal = Math.max(...lignes.map((l) => l.max));
  console.log(`\nPalettes à écart nul : ${nuls.length} sur ${lignes.length}`);
  console.log(`Écart maximal observé : ${maxTotal}`);
  console.log(`Écart ≤ 1 : ${lignes.filter((l) => l.max <= 1).length} sur ${lignes.length}`);
  console.log(`Schéma valide (reconstruction exacte) : ${lignes.filter((l) => l.max === 0 && l.schema === 'valide').length} sur ${nuls.length}`);
  const inexactes = lignes.filter((l) => l.max > 0);
  if (inexactes.length) {
    console.log('\nNuances en écart (profil/thème/numéro:écart) :');
    for (const l of inexactes) console.log(`  ${l.rang} : ${l.ecarts.slice(0, 12).join(' ')}${l.ecarts.length > 12 ? ' …' : ''}`);
  }
  console.log(`\nDurée : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
}

main();
