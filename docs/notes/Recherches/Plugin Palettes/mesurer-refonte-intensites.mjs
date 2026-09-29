#!/usr/bin/env node
/**
 * Mesure Z10.2 du sixième plan : l'effet des modèles candidats de la refonte
 * des intensités, aux bornes de leurs contrôles, sur cinq références.
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/mesurer-refonte-intensites.mjs"
 *
 * Aucun modèle n'existe dans le moteur. Le script fabrique leurs rampes par
 * `fabriquerRampe`, puis juge les paires de la table des emplois comme
 * `verifierPromesses` : même table, mêmes seuils, même comparaison
 * (`atteintLeSeuil`). La mesure témoin compare ce jugement à celui du moteur
 * sur la palette non réglée : un écart arrête le script.
 */
import {
  PAIRES,
  TABLE_DES_EMPLOIS,
  ancrageDe,
  atteintLeSeuil,
  boutsDe,
  compterManquees,
  contraste,
  distanceOk,
  ecrireHexa,
  fabriquerCran,
  fabriquerRampe,
  fondsSombresDe,
  grilleDe,
  lireHexa,
  paireJugeable,
  partDeChroma,
  partsDesProfils,
  plafond,
  profilAutomatique,
  rangsDesEmplois,
  recetteParDefaut,
  rgb8VersOklch,
  verifierPromesses,
} from '../../../../packages/couleur/src/index.ts';
import { ajouter, appliquerLAjustement, nouvellePalette } from '../../../../packages/plugin-palettes/src/edition.ts';

const REFERENCES = [
  ['Bleu', '#1E6FD9'],
  ['Vert', '#16A34A'],
  ['Rouge', '#DC2626'],
  ['Sauge', '#A0B599'],
  ['Gris', '#6B7280'],
];
const MODES = ['light', 'dark'];
const PROFILS = ['soft', 'vivid'];
const NOM_COURT = { soft: 'Soft', vivid: 'Vivid' };
const RECETTE_VIDE = recetteParDefaut();

const virgule = (x, n = 2) => x.toFixed(n).replace('.', ',').replace(/^-/, '−');
const signe = (x, n = 0) => `${x > 0 ? '+' : ''}${virgule(x, n)}`;
const ecrire = (texte) => process.stdout.write(`${texte}\n`);

function paletteDe(hexa) {
  const palette = nouvellePalette(RECETTE_VIDE, 'p-00000001', hexa, 2);
  return { recette: ajouter(RECETTE_VIDE, palette), palette };
}

/**
 * Les rampes d'une palette à deux intensités, chaque profil décalé de
 * `reglages[profil]` : `teinte` en degrés sur le pivot, `luminosite` en
 * clarté OKLCH sur chaque cran de la courbe. `ancrer` pose les octets de la
 * référence au cran porteur, comme `rampesDe`.
 */
function rampesReglees(recette, palette, reglages, ancrer = true) {
  const reference = lireHexa(palette.reference);
  const pivot = rgb8VersOklch(reference);
  const { courbes } = grilleDe(recette, palette);
  const parts = partsDesProfils(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  const rampes = {};
  for (const profil of PROFILS) {
    const { teinte = 0, luminosite = 0 } = reglages[profil] ?? {};
    rampes[profil] = {};
    for (const mode of MODES) {
      const crans = fabriquerRampe({
        courbe: courbes[mode].map((L) => Math.min(1, Math.max(0, L + luminosite))),
        bouts: boutsDe(recette),
        reference: { L: pivot.L + luminosite, C: pivot.C, H: pivot.H + teinte },
        derive: palette.derive[profil],
        part: parts[profil],
        gamut: recette.gamut,
        sombre: mode === 'dark' ? fondsSombresDe(recette) : undefined,
      });
      if (ancrer && profil === ancrage.profil) {
        const lu = rgb8VersOklch(reference);
        crans[ancrage.rangs[mode]] = { couleur: reference, hexa: ecrireHexa(reference), ...lu };
      }
      rampes[profil][mode] = crans;
    }
  }
  return rampes;
}

/** Les promesses manquées par profil, jugées comme `verifierPromesses`. */
function manquees(recette, rampes) {
  const fonds = { light: lireHexa(recette.fonds.light), dark: lireHexa(recette.fonds.dark) };
  const designer = (membre, mode, profil) => {
    if ('fond' in membre) return fonds[mode];
    const cible = TABLE_DES_EMPLOIS[membre.emploi];
    if (cible === 'fond') return fonds[mode];
    return rampes[profil][mode][recette.crans.indexOf(cible) + membre.decalage].couleur;
  };
  const paires = PAIRES.filter((paire) => paireJugeable(paire, recette.crans));
  const compte = { soft: 0, vivid: 0 };
  for (const mode of MODES) {
    for (const profil of PROFILS) {
      for (const paire of paires) {
        const valeur = contraste(designer(paire.premier, mode, profil), designer(paire.second, mode, profil));
        if (!atteintLeSeuil(valeur, recette.seuils[paire.seuil])) compte[profil] += 1;
      }
    }
  }
  return compte;
}

/** Les nuances des emplois où Soft et Vivid se confondent, fonds atténués du thème Dark compris. */
function confondues(recette, rampes) {
  return MODES.flatMap((mode) => rangsDesEmplois(recette)
    .filter((rang) => distanceOk(rampes.soft[mode][rang].couleur, rampes.vivid[mode][rang].couleur) < recette.seuils.profilsConfondus)).length;
}

/** Distance moyenne Soft ↔ Vivid sur 500, 600 et 700 en Light. */
function ecartDesProfils(recette, rampes) {
  const rangs = [500, 600, 700].map((numero) => recette.crans.indexOf(numero));
  return rangs.reduce((somme, rang) => somme + distanceOk(rampes.soft.light[rang].couleur, rampes.vivid.light[rang].couleur), 0) / rangs.length;
}

const ecrireManquees = ({ soft, vivid }) => `Soft ${soft === 0 ? '✓' : `✗ ${soft}`} · Vivid ${vivid === 0 ? '✓' : `✗ ${vivid}`}`;

/** La référence tournée de `delta` degrés, à clarté égale, chroma bornée au plafond. */
function referenceTournee(hexa, delta, recette) {
  const { L, C, H } = rgb8VersOklch(lireHexa(hexa));
  const maximum = plafond(L, H + delta, recette.gamut);
  const cran = fabriquerCran(L, H + delta, maximum > 0 ? Math.min(1, C / maximum) : 0, recette.gamut);
  return { hexa: cran.hexa, perte: C > 0 ? Math.max(0, 1 - cran.C / C) : 0 };
}

/** La référence dont la part de chroma devient `part`, clarté et teinte gardées. */
function referenceSaturee(hexa, part, recette) {
  const { L, H } = rgb8VersOklch(lireHexa(hexa));
  return fabriquerCran(L, H, part, recette.gamut).hexa;
}

// Témoin : le jugement du script égale celui du moteur sur chaque palette non réglée.
for (const [, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  const moteur = verifierPromesses(recette, palette);
  const script = manquees(recette, rampesReglees(recette, palette, {}));
  const attendu = { soft: 0, vivid: 0 };
  for (const promesse of moteur) if (promesse.verdict === 'manquee') attendu[promesse.profil] += 1;
  if (attendu.soft !== script.soft || attendu.vivid !== script.vivid || compterManquees(moteur) !== script.soft + script.vivid) {
    throw new Error(`Témoin en échec pour ${hexa} : moteur ${JSON.stringify(attendu)}, script ${JSON.stringify(script)}.`);
  }
}
ecrire('Témoin : le jugement du script égale verifierPromesses sur les cinq références.\n');

ecrire('État de départ, recette par défaut, deux intensités, dérive Tailwind');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  const ancrage = ancrageDe(recette, palette);
  const rampes = rampesReglees(recette, palette, {});
  ecrire(`  ${nom} ${hexa} : porteur ${ancrage.profil}, ${ancrage.crans.light} Light, ${ancrage.crans.dark} Dark · part ${virgule(partDeChroma(lireHexa(hexa)), 3)} · ${ecrireManquees(manquees(recette, rampes))} · confondues ${confondues(recette, rampes)} · écart Soft/Vivid ${virgule(ecartDesProfils(recette, rampes), 3)}`);
}

ecrire('\nE1. Teinte de la référence tournée (les deux profils suivent), dérive Tailwind recalculée ([ENT-01])');
for (const [nom, hexa] of REFERENCES) {
  const ligne = [-20, -10, -5, 5, 10, 20].map((delta) => {
    const { recette, palette } = paletteDe(hexa);
    const tournee = referenceTournee(hexa, delta, recette);
    const apres = appliquerLAjustement(recette, palette, tournee.hexa);
    const recetteApres = { ...recette, palettes: [apres] };
    const porteur = ancrageDe(recetteApres, apres).profil;
    const compte = manquees(recetteApres, rampesReglees(recetteApres, apres, {}));
    return `${signe(delta)}° ${tournee.hexa}${tournee.perte > 0.005 ? ` (−${Math.round(tournee.perte * 100)} % chroma)` : ''} ${porteur}${compte.soft + compte.vivid > 0 ? ` ${ecrireManquees(compte)}` : ''}`;
  });
  ecrire(`  ${nom} : ${ligne.join(' | ')}`);
}

ecrire('\nE2. Teinte du profil non porteur décalée, référence fixe');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  const autre = ancrageDe(recette, palette).profil === 'vivid' ? 'soft' : 'vivid';
  const ligne = [-20, -10, -5, 5, 10, 20].map((delta) => {
    const rampes = rampesReglees(recette, palette, { [autre]: { teinte: delta } });
    const compte = manquees(recette, rampes);
    return `${signe(delta)}° écart ${virgule(ecartDesProfils(recette, rampes), 3)}, confondues ${confondues(recette, rampes)}${compte[autre] > 0 ? `, ✗ ${compte[autre]}` : ''}`;
  });
  ecrire(`  ${nom} (${autre}) : ${ligne.join(' | ')}`);
}

ecrire('\nE3. Modèle « référence fixe » : teinte du profil porteur décalée, octets de la référence gardés à leur cran');
ecrire('    rupture = distance entre le cran de la référence et le cran que la rampe aurait posé à sa place ; départ = même mesure sans décalage');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  const ancrage = ancrageDe(recette, palette);
  const rupture = (delta) => {
    const libres = rampesReglees(recette, palette, { [ancrage.profil]: { teinte: delta } }, false);
    return distanceOk(lireHexa(hexa), libres[ancrage.profil].light[ancrage.rangs.light].couleur);
  };
  const voisins = (() => {
    const rampes = rampesReglees(recette, palette, {});
    const rang = ancrage.rangs.light;
    const rampe = rampes[ancrage.profil].light;
    return [rang - 1, rang + 1].filter((r) => r >= 0 && r < rampe.length).map((r) => distanceOk(rampe[r].couleur, rampe[rang].couleur));
  })();
  ecrire(`  ${nom} : départ ${virgule(rupture(0), 3)} · ±5° ${virgule(rupture(5), 3)} · ±10° ${virgule(rupture(10), 3)} · ±20° ${virgule(rupture(20), 3)} · pas voisins ${voisins.map((d) => virgule(d, 3)).join(' et ')}`);
}

ecrire('\nE4. Luminosité d’un profil décalée sur toute sa rampe (les deux thèmes, même signe)');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  const ligne = [-0.05, -0.02, 0.02, 0.05].map((delta) => {
    const parProfil = PROFILS.map((profil) => manquees(recette, rampesReglees(recette, palette, { [profil]: { luminosite: delta } }))[profil]);
    return `${signe(delta, 2)} Soft ${parProfil[0] === 0 ? '✓' : `✗ ${parProfil[0]}`} Vivid ${parProfil[1] === 0 ? '✓' : `✗ ${parProfil[1]}`}`;
  });
  ecrire(`  ${nom} : ${ligne.join(' | ')}`);
}

/**
 * Le modèle C tel que la revue Z10.3 le précise : le porteur figé, la
 * référence déplacée avec sa rampe, la courbe, le pivot et les bouts de chaque
 * profil translatés ensemble, l'ancrage lu sur la courbe décalée. `attenuee`
 * ramène le décalage à zéro aux deux extrémités de chaque courbe, sur 0,15 de
 * clarté, pour que le 50 et le dernier cran ne sortent pas de [0, 1].
 */
function rampesDuModeleC(recette, palette, { ecart = 0, clarte = {} }, attenuee = false) {
  const origine = rgb8VersOklch(lireHexa(palette.reference));
  const porteur = ancrageDe(recette, palette).profil;
  const dP = clarte[porteur] ?? 0;
  const maximum = plafond(origine.L + dP, origine.H, recette.gamut);
  const reference = fabriquerCran(origine.L + dP, origine.H, maximum > 0 ? Math.min(1, origine.C / maximum) : 0, recette.gamut);
  const { courbes } = grilleDe(recette, palette);
  const parts = partsDesProfils(recette, palette);
  const bouts = boutsDe(recette);
  const rampes = {};
  for (const profil of PROFILS) {
    const d = clarte[profil] ?? 0;
    rampes[profil] = {};
    for (const mode of MODES) {
      const [bas, haut] = [Math.min(...courbes[mode]), Math.max(...courbes[mode])];
      const poids = (L) => (attenuee ? Math.min(1, Math.max(0, Math.min(L - bas, haut - L) / 0.15)) : 1);
      const courbe = courbes[mode].map((L) => Math.min(1, Math.max(0, L + d * poids(L))));
      const crans = fabriquerRampe({
        courbe,
        bouts: { clair: bouts.clair + d, sombre: bouts.sombre + d },
        reference: { L: reference.L + (d - dP), C: origine.C, H: origine.H + (profil === porteur ? 0 : (profil === 'soft' ? ecart : -ecart)) },
        derive: palette.derive[profil],
        part: parts[profil],
        gamut: recette.gamut,
        sombre: mode === 'dark' ? fondsSombresDe(recette) : undefined,
      });
      if (profil === porteur) {
        let rang = 0;
        courbe.forEach((L, r) => { if (Math.abs(L - reference.L) < Math.abs(courbe[rang] - reference.L)) rang = r; });
        crans[rang] = { ...reference };
      }
      rampes[profil][mode] = crans;
    }
  }
  return rampes;
}

/** Les nuances voisines d'une même rampe qui rendent le même hexa. */
function confonduesDansLaRampe(rampes) {
  return PROFILS.flatMap((p) => MODES.flatMap((m) => rampes[p][m].slice(1).filter((cran, r) => cran.hexa === rampes[p][m][r].hexa))).length;
}

ecrire('\nE4 bis. Modèle C : luminosité d’un profil, référence déplacée avec le porteur, pivot, bouts et ancrage translatés');
ecrire('    par profil décalé : garanties manquées de ce profil, puis nuances voisines confondues ; « atténuée » garde les extrémités des courbes');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  for (const attenuee of [false, true]) {
    const ligne = [-0.05, -0.02, 0.02, 0.05].map((delta) => {
      const parProfil = PROFILS.map((profil) => {
        const rampes = rampesDuModeleC(recette, palette, { clarte: { [profil]: delta } }, attenuee);
        const compte = manquees(recette, rampes)[profil];
        const doubles = confonduesDansLaRampe(rampes);
        return `${NOM_COURT[profil]} ${compte === 0 ? '✓' : `✗ ${compte}`}${doubles > 0 ? ` (${doubles} ≡)` : ''}`;
      });
      return `${signe(delta, 2)} ${parProfil.join(' ')}`;
    });
    ecrire(`  ${nom}${attenuee ? ', atténuée' : ''} : ${ligne.join(' | ')}`);
  }
}
{
  // Témoin du modèle C : à réglages nuls, il rend les hexas du moteur.
  for (const [, hexa] of REFERENCES) {
    const { recette, palette } = paletteDe(hexa);
    const a = rampesDuModeleC(recette, palette, {});
    const b = rampesReglees(recette, palette, {});
    for (const p of PROFILS) for (const m of MODES) a[p][m].forEach((cran, r) => { if (cran.hexa !== b[p][m][r].hexa) throw new Error(`Modèle C à zéro : ${hexa} ${p} ${m} ${r}`); });
  }
  ecrire('  Témoin : à réglages nuls, le modèle C rend les hexas du moteur.');
}

ecrire('\nE5. Luminosité de la référence seule (« Ajuster la référence »), pas de 0,01');
for (const [nom, hexa] of REFERENCES) {
  const ligne = [-5, -2, 2, 5].map((pas) => {
    const { recette, palette } = paletteDe(hexa);
    const { L, C, H } = rgb8VersOklch(lireHexa(hexa));
    const maximum = plafond(L + pas * 0.01, H, recette.gamut);
    const proposee = fabriquerCran(L + pas * 0.01, H, maximum > 0 ? Math.min(1, C / maximum) : 0, recette.gamut).hexa;
    const apres = appliquerLAjustement(recette, palette, proposee);
    const recetteApres = { ...recette, palettes: [apres] };
    const ancrage = ancrageDe(recetteApres, apres);
    const compte = manquees(recetteApres, rampesReglees(recetteApres, apres, {}));
    return `${signe(pas * 0.01, 2)} ${ancrage.profil} ${ancrage.crans.light}/${ancrage.crans.dark}${compte.soft + compte.vivid > 0 ? ` ${ecrireManquees(compte)}` : ''}`;
  });
  ecrire(`  ${nom} : ${ligne.join(' | ')}`);
}

ecrire('\nE6. Saturation du profil porteur écrite dans la référence : part de la référence posée, classement automatique relu');
for (const [nom, hexa] of REFERENCES) {
  const { recette } = paletteDe(hexa);
  const ligne = [0.5, 0.6, 0.7, 0.8, 1].map((part) => {
    const saturee = referenceSaturee(hexa, part, recette);
    const palette = nouvellePalette(RECETTE_VIDE, 'p-00000001', saturee, 2);
    return `${virgule(part, 1)} ${saturee} ${profilAutomatique(ajouter(RECETTE_VIDE, palette), palette)}`;
  });
  ecrire(`  ${nom} : ${ligne.join(' | ')}`);
}

ecrire('\nE7. Coût d’un calcul : rampes réglées et jugement, 44 crans, médiane de 400 appels');
{
  const { recette, palette } = paletteDe('#1E6FD9');
  const chrono = (reglages) => {
    const durees = [];
    for (let i = 0; i < 400; i += 1) {
      const debut = performance.now();
      manquees(recette, rampesReglees(recette, palette, reglages));
      durees.push(performance.now() - debut);
    }
    durees.sort((a, b) => a - b);
    return durees[200];
  };
  chrono({});
  ecrire(`  sans réglage ${virgule(chrono({}), 3)} ms · teinte et luminosité des deux profils ${virgule(chrono({ soft: { teinte: 7, luminosite: 0.02 }, vivid: { teinte: -3, luminosite: -0.01 } }), 3)} ms · [MOT-13] 5 ms`);
}
