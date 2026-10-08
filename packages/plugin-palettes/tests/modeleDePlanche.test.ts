/** Le modèle de planche d'une palette ([ARC-07], section 9), sur le récit R1 de W3.6. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { contraste, lireHexa, recetteAvecTexteDesBoutons, recetteParDefaut, rgb8VersP3, verifierPromesses, type Mode, type Palette, type Recette, type Rgb8, type TexteDesBoutons } from 'ucm-couleur';

import { ajouter, choisirLesIntensites, nouvellePalette, renommer } from '../src/edition';
import { poserFond } from '../src/configuration';
import {
  COULEURS_DE_LA_PLANCHE,
  STYLES_DE_TEXTE,
  TRAME,
  compterCalques,
  modeleDeCadre,
  peinture,
  type Noeud,
  type NoeudCadre,
  type NoeudTexte,
} from '../src/planche/modele';
import { contrasteEcrit } from '../src/planche/textes';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Bleu' };
const avec = (...palettes: Palette[]): Recette => palettes.reduce(ajouter, VIDE);
const RECETTE = avec(BLEU);
/** La courbe claire monte à 0,6 au cran 700 : le texte des boutons et le texte coloré manquent 4,5:1 en clair, dans les deux profils. */
const RECETTE_EN_ECHEC: Recette = { ...RECETTE, courbes: { ...RECETTE.courbes, light: RECETTE.courbes.light.map((clarte, rang) => (rang === 7 ? 0.6 : clarte)) } };
/** La recette, sans les grilles de contrastes sur la planche ([PLA-28]). */
const SANS_GRILLES: Recette = { ...RECETTE, contenuDesPlanches: { ...RECETTE.contenuDesPlanches, grilles: false } };
const MODELE = modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB');
const AVEC_GRILLE = modeleDeCadre(RECETTE, BLEU, 'SRGB');

function tous(noeud: Noeud): Noeud[] {
  return noeud.type === 'texte' ? [noeud] : [noeud, ...noeud.enfants.flatMap(tous)];
}
const cadres = (racine: NoeudCadre) => tous(racine).filter((noeud): noeud is NoeudCadre => noeud.type === 'cadre');
const textes = (racine: NoeudCadre) => tous(racine).filter((noeud): noeud is NoeudTexte => noeud.type === 'texte');
const trouver = (racine: NoeudCadre, nom: string) => {
  const trouve = cadres(racine).find((noeud) => noeud.nom === nom);
  assert.ok(trouve, `aucun cadre ${nom}`);
  return trouve;
};
const couleur = (hexa: string): Rgb8 => lireHexa(hexa)!;
/** Les textes d'un thème que le cadre écrit lui-même : ni spécimen, ni grille, ni repère de pastille. */
function legendesDuTheme(theme: NoeudCadre): NoeudTexte[] {
  const exclus = new Set(cadres(theme).filter((noeud) => ['spécimen', 'contrastes'].includes(noeud.nom) || /^(soft|vivid)\//.test(noeud.nom) || noeud.nom === 'verdict').flatMap((noeud) => textes(noeud)));
  return textes(theme).filter((noeud) => !exclus.has(noeud));
}

test('[PLA-02] un cadre par palette, nommé du nom de la palette ou de son hexa', () => {
  assert.equal(MODELE.racine.nom, 'Bleu');
  const sansNom = renommer(BLEU, '');
  assert.equal(modeleDeCadre(avec(sansNom), sansNom, 'SRGB').racine.nom, '#1E6FD9');
});

test('[PLA-07] l’en-tête donne le nom et la référence avec son profil, sans version, empreinte ni avertissement', () => {
  const enTete = trouver(MODELE.racine, 'en-tête').enfants as NoeudTexte[];
  assert.deepEqual(enTete.map((noeud) => noeud.contenu), ['Bleu', 'Couleur de référence #1E6FD9 · Vivid · nuance 600']);
  assert.equal(enTete[0].style, 'palette');
  assert.match(MODELE.empreinte, /^[0-9a-f]{8}$/);
  assert.ok(!textes(MODELE.racine).some((noeud) => noeud.contenu.includes(MODELE.empreinte)), 'aucun texte n’imprime l’empreinte');
  assert.ok(!textes(MODELE.racine).some((noeud) => /version|SRGB|sRGB|remplac/i.test(noeud.contenu)), 'ni version, ni espace de couleur, ni avertissement');
});

test('W3.6 [UI-14] : chaque thème dit son fond, son texte des boutons et son verdict, puis les rampes, les variables et les contrastes, dans cet ordre, sans interface d’exemple', () => {
  const racine = AVEC_GRILLE.racine;
  assert.deepEqual(racine.enfants.map((noeud) => noeud.nom), ['en-tête', 'thème light', 'thème dark']);
  const sections = trouver(racine, 'thème light').enfants.map((noeud) => noeud.nom).filter((nom) => nom !== 'filet');
  assert.deepEqual(sections, ['en-tête', 'les deux rampes', 'quelle nuance pour quelle variable soft', 'quelle nuance pour quelle variable vivid', 'contrastes']);
  assert.equal(cadres(racine).some((noeud) => noeud.nom === 'écran de réglages'), false, 'l’écran de réglages est dans l’onglet Création, pas sur la planche');
  const tete = textes(trouver(trouver(racine, 'thème dark'), 'en-tête')).map((noeud) => noeud.contenu);
  assert.deepEqual(tete, ['Thème Dark · fond de la page #121212 · texte des boutons noir', '✓ Toutes les garanties tenues']);
  const echec = trouver(modeleDeCadre(RECETTE_EN_ECHEC, BLEU, 'SRGB').racine, 'thème light');
  const verdict = textes(trouver(echec, 'verdict'))[0];
  assert.match(verdict.contenu, /^\d+ garanties manquées$/);
  assert.equal(verdict.couleur.hexa, COULEURS_DE_LA_PLANCHE.dangerSombre);
});

test('[PLA-09] chaque thème est peint de son fond, bordé d’un filet visible sur le blanc comme sur le noir, et ses légendes s’y lisent, fond saturé compris', () => {
  const sature = poserFond(RECETTE, 'light', '#FFD84D')!;
  for (const [recette, modele] of [[RECETTE, AVEC_GRILLE], [sature, modeleDeCadre(sature, BLEU, 'SRGB')]] as const) {
    for (const mode of ['light', 'dark'] as const) {
      const theme = trouver(modele.racine, `thème ${mode}`);
      assert.equal(theme.fond?.hexa, recette.fonds[mode]);
      assert.equal(theme.trait?.couleur.hexa, COULEURS_DE_LA_PLANCHE.filet);
      const fond = couleur(recette.fonds[mode]);
      for (const noeud of legendesDuTheme(theme)) assert.ok(contraste(couleur(noeud.couleur.hexa), fond) >= 4.5, `${recette.fonds[mode]} ${noeud.nom} ${noeud.contenu}`);
    }
  }
  for (const fond of ['#FFFFFF', '#121212']) assert.ok(contraste(couleur(COULEURS_DE_LA_PLANCHE.filet), couleur(fond)) >= 3, fond);
});

test('[PLA-10] [MOT-17] les rampes nomment Soft et Vivid ; le ◆ de la référence est dans sa pastille, peinte de ses octets exacts', () => {
  const rampes = trouver(trouver(MODELE.racine, 'thème light'), 'les deux rampes');
  assert.deepEqual(textes(trouver(rampes, 'numéros')).map((noeud) => noeud.contenu), RECETTE.crans.map(String));
  const vivid = trouver(rampes, 'rampe vivid');
  assert.equal((vivid.enfants[0] as NoeudTexte).contenu, 'Vivid');
  assert.equal(vivid.enfants.length, 12, 'le nom et onze nuances');
  const reperes = cadres(MODELE.racine).filter((noeud) => /^(soft|vivid)\//.test(noeud.nom) && noeud.enfants.some((enfant) => enfant.nom === 'référence'));
  assert.deepEqual(reperes.map((noeud) => noeud.nom), ['vivid/light/600', 'vivid/dark/600']);
  const peinte = (nom: string) => MODELE.peints.find((candidate) => candidate.nom === nom)?.hexa;
  assert.equal(peinte('vivid/light/600'), '#1E6FD9');
  assert.equal(peinte('vivid/dark/600'), '#1E6FD9');
  assert.notEqual(peinte('soft/light/600'), '#1E6FD9');
  assert.equal(textes(trouver(vivid, 'colonne 600')).find((noeud) => noeud.nom === 'code')?.contenu, '1E6FD9');
});

test('[PLA-15] une pastille où les deux profils se confondent porte ≈, sur toute nuance, et une note l’explique', () => {
  const confondu = (nom: string) => trouver(MODELE.racine, nom).enfants.some((enfant) => enfant.nom === 'confondu');
  assert.equal(confondu('vivid/light/100'), true);
  assert.equal(confondu('vivid/light/700'), false);
  assert.match(textes(trouver(trouver(MODELE.racine, 'thème light'), 'les deux rampes')).find((noeud) => noeud.nom === 'note')!.contenu, /≈ : Soft et Vivid presque identiques/);
});

test('[PLA-13] un repère de pastille prend le noir ou le blanc, et s’y lit', () => {
  for (const pastille of cadres(MODELE.racine).filter((noeud) => /^(soft|vivid)\/(light|dark)\/\d+$/.test(noeud.nom))) {
    for (const repere of pastille.enfants as NoeudTexte[]) {
      assert.ok(['#000000', '#FFFFFF'].includes(repere.couleur.hexa), pastille.nom);
      assert.ok(contraste(couleur(repere.couleur.hexa), couleur(pastille.fond!.hexa)) >= 4.5, pastille.nom);
    }
  }
});

test('[PLA-14] quarante-quatre pastilles nommées profil/mode/cran, chacune une fois, grille comprise', () => {
  const noms = AVEC_GRILLE.peints.map(({ nom }) => nom);
  assert.equal(noms.length, 44);
  assert.equal(new Set(noms).size, 44);
  assert.equal(AVEC_GRILLE.peints.find(({ nom }) => nom === 'vivid/light/700')?.hexa, '#185EC1');
});

/** Les variables d'un profil dans un thème ([PLA-18]). */
const variablesDe = (racine: NoeudCadre, mode: Mode, profil: 'soft' | 'vivid') => trouver(trouver(racine, `thème ${mode}`), `quelle nuance pour quelle variable ${profil}`);
const garantiesLues = (racine: NoeudCadre) => textes(racine).filter((noeud) => noeud.nom.startsWith('garantie '));

test('[PLA-18] M2 : les variables de chaque profil, Soft puis Vivid, une ligne par dossier, trois états par colonne ; page n’a pas d’états', () => {
  assert.equal((variablesDe(MODELE.racine, 'light', 'soft').enfants[0] as NoeudTexte).contenu, 'Quelle nuance pour quelle variable · Soft');
  const variables = variablesDe(MODELE.racine, 'light', 'vivid');
  assert.equal((variables.enfants[0] as NoeudTexte).contenu, 'Quelle nuance pour quelle variable · Vivid');
  assert.deepEqual(textes(trouver(variables, 'états')).map((noeud) => noeud.contenu), ['default', 'hover', 'pressed']);
  const lignes = variables.enfants.filter((noeud): noeud is NoeudCadre => noeud.nom.startsWith('dossier '));
  assert.deepEqual(lignes.map((noeud) => [noeud.nom, noeud.enfants.length - 1]), [['dossier solid', 3], ['dossier surface', 3], ['dossier page', 1]]);
  assert.deepEqual(trouver(variables, 'variables').enfants.map((noeud) => noeud.nom), ['page foreground', 'page border', 'page focus', 'page divider']);
  const legendes = (ligne: string) => textes(trouver(trouver(variables, ligne), 'libellés')).map((noeud) => noeud.contenu);
  assert.deepEqual(legendes('dossier solid'), ['Fond plein', 'solid', 'bouton principal, badge plein', 'texte : solid/foreground, blanc']);
  assert.deepEqual(legendes('dossier surface'), ['Fond teinté', 'surface', 'alerte, badge doux, ligne sélectionnée', 'texte et contour : surface/foreground, surface/border · 800']);
  assert.deepEqual(legendes('dossier page'), ['Sur la page', 'page', 'lien, champ, anneau, filet']);
  const nom = (cellule: string) => textes(trouver(variables, cellule)).find((noeud) => noeud.nom === 'variable')!.contenu;
  assert.deepEqual(['solid default', 'solid hover', 'solid pressed', 'surface default', 'surface hover', 'surface pressed', 'page foreground', 'page border', 'page focus', 'page divider'].map(nom), [
    'solid/default · 700', 'solid/hover · 800', 'solid/pressed · 900', 'surface/default · 100', 'surface/hover · 200', 'surface/pressed · 300',
    'page/foreground · 700', 'page/border · 700', 'page/focus · 600', 'page/divider · 300',
  ]);
  const peint = (cran: number) => MODELE.peints.find(({ nom: calque }) => calque === `vivid/light/${cran}`)?.hexa;
  const specimen = (cellule: string) => trouver(trouver(variables, cellule), 'spécimen');
  assert.equal(specimen('solid hover').fond?.hexa, peint(800));
  assert.equal((specimen('solid hover').enfants[0] as NoeudTexte).couleur.hexa, '#FFFFFF', 'le texte des boutons, blanc pur');
  assert.equal(specimen('surface pressed').fond?.hexa, peint(300));
  assert.equal((specimen('surface pressed').enfants[0] as NoeudTexte).couleur.hexa, peint(800), 'le texte de surface');
  assert.equal(specimen('surface pressed').trait?.couleur.hexa, peint(800), 'le contour de surface');
  assert.equal((specimen('page foreground').enfants[0] as NoeudTexte).couleur.hexa, peint(700));
  assert.equal(specimen('page focus').trait?.couleur.hexa, peint(600));
  assert.equal(specimen('page divider').fond, null);
  assert.equal(textes(trouver(variables, 'page divider')).some((noeud) => noeud.contenu === 'sans minimum de contraste'), true);
  assert.ok(!textes(MODELE.racine).some((noeud) => /active|Fonds (de carte|légers|pleins)|Fond léger|Séparateurs|Bordures de champ/.test(noeud.contenu)), 'plus rien de l’ancienne table');
});

/** Les quatre combinaisons de texte des boutons : Light blanc ou noir, Dark noir ou blanc (S1). */
const COMBINAISONS: readonly (readonly [TexteDesBoutons, TexteDesBoutons])[] = [['blanc', 'noir'], ['noir', 'noir'], ['blanc', 'blanc'], ['noir', 'blanc']];

function recetteAvecLesTextes(light: TexteDesBoutons, dark: TexteDesBoutons): Recette {
  const claire = recetteAvecTexteDesBoutons(RECETTE, 'light', light);
  assert.ok('recette' in claire, `Light ${light}`);
  const sombre = recetteAvecTexteDesBoutons(claire.recette, 'dark', dark);
  assert.ok('recette' in sombre, `Dark ${dark}`);
  return sombre.recette;
}

test('S1 S2 I6 : la planche se dessine dans le sens de chaque mode, dans les quatre combinaisons de texte des boutons', () => {
  const NORMAL = { solid: [700, 800, 900], surface: [100, 200, 300], texte: 800, page: [700, 700, 600, 300] };
  const INVERSE = { solid: [700, 600, 500], surface: [100, 200, 300], texte: 900, page: [800, 800, 700, 300] };
  const PURS = { blanc: '#FFFFFF', noir: '#000000' };
  for (const [light, dark] of COMBINAISONS) {
    const recette = recetteAvecLesTextes(light, dark);
    const modele = modeleDeCadre(recette, BLEU, 'SRGB');
    for (const [mode, texteDesBoutons] of [['light', light], ['dark', dark]] as const) {
      const contexte = `Light ${light}, Dark ${dark}, ${mode}`;
      const table = texteDesBoutons === (mode === 'light' ? 'blanc' : 'noir') ? NORMAL : INVERSE;
      const theme = trouver(modele.racine, `thème ${mode}`);
      assert.equal(textes(trouver(theme, 'en-tête'))[0].contenu, `${mode === 'light' ? 'Thème Light' : 'Thème Dark'} · fond de la page ${recette.fonds[mode]} · texte des boutons ${texteDesBoutons}`, contexte);
      const variables = variablesDe(modele.racine, mode, 'vivid');
      const peint = (cran: number) => modele.peints.find(({ nom }) => nom === `vivid/${mode}/${cran}`)?.hexa;
      const cellule = (nom: string) => trouver(variables, nom);
      const nuance = (nom: string) => textes(cellule(nom)).find((noeud) => noeud.nom === 'variable')!.contenu.split(' · ')[1];
      ['solid default', 'solid hover', 'solid pressed'].forEach((nom, rang) => {
        assert.equal(nuance(nom), String(table.solid[rang]), `${contexte} ${nom}`);
        const specimen = trouver(cellule(nom), 'spécimen');
        assert.equal(specimen.fond?.hexa, peint(table.solid[rang]), `${contexte} ${nom}`);
        assert.equal((specimen.enfants[0] as NoeudTexte).couleur.hexa, PURS[texteDesBoutons], `${contexte} ${nom} : le texte des boutons`);
      });
      ['surface default', 'surface hover', 'surface pressed'].forEach((nom, rang) => {
        const specimen = trouver(cellule(nom), 'spécimen');
        assert.equal(nuance(nom), String(table.surface[rang]), `${contexte} ${nom}`);
        assert.equal((specimen.enfants[0] as NoeudTexte).couleur.hexa, peint(table.texte), `${contexte} ${nom} : texte`);
        assert.equal(specimen.trait?.couleur.hexa, peint(table.texte), `${contexte} ${nom} : contour`);
      });
      ['page foreground', 'page border', 'page focus', 'page divider'].forEach((nom, rang) => assert.equal(nuance(nom), String(table.page[rang]), `${contexte} ${nom}`));
      const dites = cadres(variables).filter((noeud) => noeud.nom === 'libellés').flatMap(textes).map((noeud) => noeud.contenu);
      assert.ok(dites.includes(`texte : solid/foreground, ${texteDesBoutons}`), contexte);
      assert.ok(dites.includes(`texte et contour : surface/foreground, surface/border · ${table.texte}`), contexte);
    }
  }
});

test('S7 : la planche lit les promesses du moteur sans rien rejuger, dans le sens de chaque mode, et n’écrit aucun numéro de garantie', () => {
  for (const [light, dark] of COMBINAISONS) {
    const recette = recetteAvecLesTextes(light, dark);
    const modele = modeleDeCadre(recette, BLEU, 'SRGB');
    const promesses = verifierPromesses(recette, BLEU);
    for (const mode of ['light', 'dark'] as const) {
      for (const profil of ['soft', 'vivid'] as const) {
        const lues = garantiesLues(variablesDe(modele.racine, mode, profil));
        const jugees = promesses.filter((promesse) => promesse.mode === mode && promesse.profil === profil);
        const contexte = `Light ${light}, Dark ${dark}, ${mode} ${profil}`;
        assert.equal(lues.length, jugees.length, contexte);
        assert.equal(lues.filter((noeud) => noeud.contenu.startsWith('✗')).length, jugees.filter((promesse) => promesse.verdict === 'manquee').length, contexte);
        const ratios = (liste: readonly string[]) => [...liste].sort();
        assert.deepEqual(
          ratios(lues.map((noeud) => /(\d+,\d\d:1)/.exec(noeud.contenu)![1])),
          ratios(jugees.map((promesse) => contrasteEcrit(promesse.contraste))),
          contexte,
        );
      }
    }
    assert.ok(!tous(modele.racine).some((noeud) => /garantie \d|\bG[1-7]\b/.test(noeud.nom) || (noeud.type === 'texte' && /\bG[1-7]\b/.test(noeud.contenu))), 'aucun numéro de garantie');
  }
  const lignes = (nom: string) => garantiesLues(trouver(variablesDe(MODELE.racine, 'light', 'vivid'), nom)).map((noeud) => noeud.contenu);
  assert.deepEqual(lignes('solid default'), ['✓ solid/foreground dessus : 6,15:1 · AA', '✓ sur la page : 5,74:1 · AA']);
  assert.deepEqual(lignes('solid pressed'), ['✓ solid/foreground dessus : 12,09:1 · AAA']);
  assert.deepEqual(lignes('surface default'), [
    '✓ texte dessus : 7,52:1 · AAA', '✓ texte sur la page : 8,10:1 · AAA', '✓ contour dessus : 7,52:1 · AA', '✓ contour sur la page : 8,10:1 · AA',
  ]);
  assert.deepEqual(lignes('surface hover'), ['✓ texte dessus : 6,55:1 · AA', '✓ contour dessus : 6,55:1 · AA']);
  assert.deepEqual(lignes('page foreground'), ['✓ sur la page : 5,74:1 · AA']);
  assert.deepEqual(lignes('page border'), ['✓ sur la page : 5,74:1 · AA']);
  assert.deepEqual(lignes('page focus'), ['✓ sur la page : 4,52:1 · AA', '✓ sur surface/default : 4,19:1 · AA']);
  assert.deepEqual(lignes('page divider'), []);
  const echec = garantiesLues(trouver(modeleDeCadre(RECETTE_EN_ECHEC, BLEU, 'SRGB').racine, 'thème light')).find((noeud) => noeud.contenu.startsWith('✗'))!;
  assert.equal(echec.style, 'chiffre');
  assert.equal(echec.couleur.hexa, COULEURS_DE_LA_PLANCHE.dangerSombre);
});

test('P9 : changer le texte des boutons d’un mode change l’empreinte, et lui seul', () => {
  const dark = recetteAvecLesTextes('blanc', 'blanc');
  assert.notEqual(modeleDeCadre(dark, BLEU, 'SRGB').empreinte, AVEC_GRILLE.empreinte, 'Dark blanc');
  const light = recetteAvecLesTextes('noir', 'noir');
  assert.notEqual(modeleDeCadre(light, BLEU, 'SRGB').empreinte, AVEC_GRILLE.empreinte, 'Light noir');
  // Le réglage rejoué à l’identique ne change rien.
  assert.equal(modeleDeCadre(recetteAvecLesTextes('blanc', 'noir'), BLEU, 'SRGB').empreinte, AVEC_GRILLE.empreinte);
  // Sans changer les courbes, le seul texte des boutons du Dark change encore l’en-tête et le sens de la table.
  const seul: Recette = { ...RECETTE, texteDesBoutons: { ...RECETTE.texteDesBoutons, dark: 'blanc' } };
  assert.notEqual(modeleDeCadre(seul, BLEU, 'SRGB').empreinte, AVEC_GRILLE.empreinte);
});

test('S2 : la palette du neutre ajoute la note de son corps de texte à la ligne page ; les autres palettes n’en ont pas', () => {
  const note = 'page/foreground-main : corps de texte, noir ou blanc purs, hors de la rampe';
  const neutre = { ...BLEU, nom: 'Neutral' };
  const libelles = (modele: ReturnType<typeof modeleDeCadre>) => textes(trouver(variablesDe(modele.racine, 'light', 'vivid'), 'dossier page')).map((noeud) => noeud.contenu);
  assert.ok(libelles(modeleDeCadre(avec(neutre), neutre, 'SRGB')).includes(note));
  assert.ok(!libelles(MODELE).includes(note));
});

test('P7 : une liste sans 50 garde les trois dossiers et ses garanties ; sans 900, la variable dont le cran manque n’est pas dessinée ni jugée', () => {
  const sans = (cran: number): Recette => {
    const rang = RECETTE.crans.indexOf(cran);
    const sauf = <T,>(liste: readonly T[]) => liste.filter((_, i) => i !== rang);
    return { ...RECETTE, crans: sauf(RECETTE.crans), courbes: { light: sauf(RECETTE.courbes.light), dark: sauf(RECETTE.courbes.dark) } };
  };
  const sans50 = variablesDe(modeleDeCadre(sans(50), BLEU, 'SRGB').racine, 'light', 'vivid');
  assert.deepEqual(sans50.enfants.filter((noeud) => noeud.nom.startsWith('dossier ')).map((noeud) => noeud.nom), ['dossier solid', 'dossier surface', 'dossier page']);
  assert.equal(garantiesLues(sans50).length, 16);
  const sans900 = variablesDe(modeleDeCadre(sans(900), BLEU, 'SRGB').racine, 'light', 'vivid');
  const noms = cadres(sans900).map((noeud) => noeud.nom);
  assert.equal(noms.includes('solid pressed'), false);
  assert.equal(noms.includes('solid hover'), true);
  assert.equal(garantiesLues(sans900).some((noeud) => noeud.nom.startsWith('garantie solid/foreground')), false, 'une garantie dont un cran manque n’est pas jugée');
});

test('[PLA-16] [VER-13] : une grille par thème et profil, alignée sur les rampes ; une paire lisible se peint de ses vraies couleurs avec son niveau de texte, une paire sous 3:1 s’efface', () => {
  assert.equal(cadres(MODELE.racine).some((noeud) => noeud.nom === 'contrastes'), false, 'sans l’option, pas de grille');
  const contrastes = trouver(trouver(AVEC_GRILLE.racine, 'thème light'), 'contrastes');
  assert.equal(textes(trouver(contrastes, 'en-tête'))[1].contenu, 'Ligne : fond · colonne : texte · gras dès 4,5:1 · maigre dès 3:1 · effacé en dessous · AA dès 4,5:1 · AAA dès 7:1');
  const grille = trouver(contrastes, 'grille light vivid');
  assert.deepEqual(grille.enfants.map((noeud) => noeud.nom), ['teintes vivid', ...RECETTE.crans.map((cran) => `fond ${cran}`)]);
  const hexa = (cran: number) => AVEC_GRILLE.peints.find(({ nom }) => nom === `vivid/light/${cran}`)!.hexa;
  const lisible = trouver(grille, '900/100');
  assert.equal(lisible.fond?.hexa, hexa(900));
  const valeur = (lisible.enfants[0] as NoeudTexte);
  assert.equal(valeur.couleur.hexa, hexa(100));
  assert.equal(valeur.style, 'chiffre');
  assert.equal(valeur.contenu, '10,47 AAA');
  const aa = cadres(grille).find((noeud) => /^\d+\/\d+$/.test(noeud.nom) && (noeud.enfants[0] as NoeudTexte | undefined)?.contenu.endsWith(' AA'));
  assert.ok(aa, 'une paire entre 4,5:1 et 7:1 porte AA');
  const sansNiveau = cadres(grille).filter((noeud) => /^\d+\/\d+$/.test(noeud.nom) && noeud.enfants.length > 0).map((noeud) => (noeud.enfants[0] as NoeudTexte).contenu).filter((contenu) => !/ AAA?$/.test(contenu));
  assert.ok(sansNiveau.length > 0 && sansNiveau.every((contenu) => /^\d+,\d\d$/.test(contenu)), 'sous 4,5:1, le ratio seul');
  const efface = trouver(grille, '100/200');
  assert.notEqual(efface.fond?.hexa, hexa(100));
  assert.equal((efface.enfants[0] as NoeudTexte).style, 'note');
  assert.equal(trouver(grille, '600/600').enfants.length, 0, 'une nuance ne se compare pas à elle-même');
  // Les colonnes de la grille ont la largeur et l'écart de celles de la rampe.
  const rampe = trouver(trouver(AVEC_GRILLE.racine, 'thème light'), 'rampe vivid');
  const ligne = trouver(grille, 'fond 700');
  assert.deepEqual([ligne.espacement, (ligne.enfants[1] as NoeudCadre).largeur], [rampe.espacement, (rampe.enfants[1] as NoeudCadre).largeur]);
});

test('W5.5 W6.6 : une palette libre n’a ni variables ni interface d’exemple ; ses rampes et ses grilles suivent sa liste, et son en-tête le dit', () => {
  const libre: Palette = { ...BLEU, crans: [100, 200, 400, 600, 800, 900] };
  const modele = modeleDeCadre(avec(libre), libre, 'SRGB');
  for (const mode of ['light', 'dark'] as const) {
    const theme = trouver(modele.racine, `thème ${mode}`);
    assert.deepEqual(theme.enfants.map((noeud) => noeud.nom).filter((nom) => nom !== 'filet'), ['en-tête', 'les deux rampes', 'contrastes']);
    assert.equal(textes(trouver(theme, 'verdict'))[0].contenu, 'Palette libre · 6 nuances');
    assert.deepEqual(textes(trouver(theme, 'numéros')).map((noeud) => noeud.contenu), ['100', '200', '400', '600', '800', '900']);
    assert.deepEqual(trouver(theme, `grille ${mode} vivid`).enfants.slice(1).map((noeud) => noeud.nom), ['fond 100', 'fond 200', 'fond 400', 'fond 600', 'fond 800', 'fond 900']);
  }
  assert.deepEqual(modele.peints.filter(({ nom }) => nom.startsWith('vivid/light/')).map(({ nom }) => nom), ['vivid/light/100', 'vivid/light/200', 'vivid/light/400', 'vivid/light/600', 'vivid/light/800', 'vivid/light/900']);
  assert.equal(modele.peints.find(({ nom }) => nom === 'vivid/light/600')?.hexa, '#1E6FD9');
});

test('[PLA-21] tout est en auto layout, sur une trame de 8 px', () => {
  for (const noeud of cadres(AVEC_GRILLE.racine)) {
    assert.ok(['VERTICAL', 'HORIZONTAL'].includes(noeud.direction), noeud.nom);
    assert.equal(noeud.espacement % TRAME, 0, `${noeud.nom} : espacement ${noeud.espacement}`);
    assert.equal(noeud.marge % TRAME, 0, `${noeud.nom} : marge ${noeud.marge}`);
    assert.equal((noeud.margeLaterale ?? 0) % TRAME, 0, `${noeud.nom} : marge latérale ${noeud.margeLaterale}`);
  }
});

test('[PLA-22] V10.8 : six styles nommés, tous employés, et un titre ou un code ne se coupe jamais', () => {
  assert.deepEqual(Object.keys(STYLES_DE_TEXTE), ['palette', 'theme', 'role', 'valeur', 'note', 'chiffre']);
  assert.deepEqual([...new Set(textes(AVEC_GRILLE.racine).map((noeud) => noeud.style))].sort(), ['chiffre', 'note', 'palette', 'role', 'theme', 'valeur']);
  for (const noeud of textes(AVEC_GRILLE.racine).filter((candidat) => ['titre', 'code', 'référence', 'résultat'].includes(candidat.nom))) {
    assert.equal(noeud.largeur, undefined, noeud.contenu);
  }
});

test('[PLA-23] l’en-tête prend les couleurs du plugin, et les légendes d’un thème jamais celles de la palette', () => {
  const constantes = new Set<string>(Object.values(COULEURS_DE_LA_PLANCHE));
  for (const noeud of textes(trouver(MODELE.racine, 'en-tête'))) assert.ok(constantes.has(noeud.couleur.hexa), noeud.nom);
  const palette = new Set(AVEC_GRILLE.peints.map(({ hexa }) => hexa));
  for (const mode of ['light', 'dark'] as const) {
    for (const noeud of legendesDuTheme(trouver(AVEC_GRILLE.racine, `thème ${mode}`))) assert.ok(!palette.has(noeud.couleur.hexa), `${noeud.nom} ${noeud.couleur.hexa}`);
  }
});

test('section 6.7 : la peinture suit le profil du document', () => {
  const bleu = couleur('#1E6FD9');
  assert.deepEqual(peinture(bleu, 'SRGB').composantes, [30 / 255, 111 / 255, 217 / 255]);
  assert.deepEqual(peinture(bleu, 'LEGACY').composantes, [30 / 255, 111 / 255, 217 / 255]);
  // Au millionième : le dernier bit de `**` change d'un moteur à l'autre, et l'empreinte du cadre le lirait ([PLA-19]).
  const composantes = peinture(bleu, 'DISPLAY_P3').composantes;
  composantes.forEach((composante, rang) => {
    assert.equal(composante, Math.round(composante * 1e6) / 1e6, `composante ${rang} au millionième`);
    assert.ok(Math.abs(composante - rgb8VersP3(bleu)[rang]) <= 5e-7, `composante ${rang} en P3`);
  });
  const p3 = modeleDeCadre(RECETTE, BLEU, 'DISPLAY_P3');
  assert.equal(p3.peints.find(({ nom }) => nom === 'vivid/light/700')?.hexa, '#185EC1', 'l’hexa annoncé ne change pas');
});

test('[PLA-19] G3.2 : un cadre dessiné avant la version 6 de la recette est périmé quand ses couleurs changent', () => {
  // Les parts d'avant se rejouent en parts du designer : mêmes nombres, mêmes couleurs, sans la règle du porteur.
  const ardoise = nouvellePalette(VIDE, 'p-0000000e', '#6B7280', 2)!;
  for (const [palette, soft, vivid] of [[BLEU, 0.45, 0.95], [ardoise, 0.094, 0.094]] as const) {
    const aujourdHui = modeleDeCadre(avec(palette), palette, 'SRGB');
    const ancienne = { ...palette, parts: { soft, vivid, origine: 'designer' as const } };
    const dessine = modeleDeCadre(avec(ancienne), ancienne, 'SRGB');
    assert.notDeepEqual(aujourdHui.peints, dessine.peints, palette.reference);
    assert.notEqual(aujourdHui.empreinte, dessine.empreinte, palette.reference);
  }
});

test('[PLA-19] E2 : l’empreinte suit ce que le cadre montre, et seulement cela', () => {
  assert.equal(modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB').empreinte, MODELE.empreinte, 'stable');
  const renomme = renommer(BLEU, 'Marine');
  assert.notEqual(modeleDeCadre(avec(renomme), renomme, 'SRGB').empreinte, MODELE.empreinte);
  assert.notEqual(modeleDeCadre(SANS_GRILLES, BLEU, 'DISPLAY_P3').empreinte, MODELE.empreinte);
  assert.notEqual(AVEC_GRILLE.empreinte, MODELE.empreinte);
  // Le cadre ne montre rien des autres palettes : les renommer ne le touche pas, même proches.
  const voisin = nouvellePalette(VIDE, 'p-0000000d', '#1D6DDB', 2)!;
  const empreinteAvec = (autre: Palette) => modeleDeCadre(avec(BLEU, autre), BLEU, 'SRGB').empreinte;
  assert.equal(empreinteAvec(voisin), empreinteAvec(renommer(voisin, 'Voisin')));
});

test('V10.10 : les styles de texte entrent dans l’empreinte, et un cadre dessiné avant ce modèle est à actualiser', () => {
  const avant = STYLES_DE_TEXTE.valeur.taille;
  (STYLES_DE_TEXTE.valeur as { taille: number }).taille = avant + 1;
  try {
    assert.notEqual(modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB').empreinte, MODELE.empreinte);
  } finally {
    (STYLES_DE_TEXTE.valeur as { taille: number }).taille = avant;
  }
  assert.equal(modeleDeCadre(SANS_GRILLES, BLEU, 'SRGB').empreinte, MODELE.empreinte);
});

test('[PLA-24] le compte de calques d’un cadre, relevé pour le temps de dessin', () => {
  const sans = compterCalques(MODELE.racine);
  const avecGrille = compterCalques(AVEC_GRILLE.racine);
  assert.ok(sans > 500 && sans < 1000, String(sans));
  assert.ok(avecGrille > sans + 4 * 110 && avecGrille < 2100, String(avecGrille));
});

/** Bleu à une intensité, la même référence. */
const BLEU_SEUL = choisirLesIntensites(RECETTE, BLEU, 1);
const RECETTE_SEULE = avec(BLEU_SEUL);

test('[PLA-14] [ENT-14] Y5.5 : une palette à une intensité ne montre ni rampe absente ni nom de profil ; ses pastilles se nomment mode/cran', () => {
  const modele = modeleDeCadre(RECETTE_SEULE, BLEU_SEUL, 'SRGB');
  const noms = modele.peints.map(({ nom }) => nom);
  assert.equal(noms.length, 22);
  assert.ok(noms.every((nom) => /^(light|dark)\/\d+$/.test(nom)), noms.join(' '));
  assert.equal(modele.peints.find(({ nom }) => nom === 'light/600')?.hexa, '#1E6FD9');
  for (const mode of ['light', 'dark'] as const) {
    const theme = trouver(modele.racine, `thème ${mode}`);
    assert.deepEqual(theme.enfants.map((noeud) => noeud.nom).filter((nom) => nom !== 'filet'), ['en-tête', 'la rampe', 'quelle nuance pour quelle variable', 'contrastes']);
    assert.equal(textes(trouver(theme, 'la rampe')).find((noeud) => noeud.nom === 'titre')?.contenu, 'La rampe');
    assert.equal((trouver(theme, 'quelle nuance pour quelle variable').enfants[0] as NoeudTexte).contenu, 'Quelle nuance pour quelle variable');
    assert.ok(cadres(theme).some((noeud) => noeud.nom === `grille ${mode}`));
  }
  assert.ok(!textes(modele.racine).some((noeud) => /\b(Soft|Vivid)\b/.test(noeud.contenu)), 'aucun nom de profil');
  assert.ok(!cadres(modele.racine).some((noeud) => /\b(soft|vivid)\b/.test(noeud.nom)), 'aucun calque de profil');
  assert.equal((trouver(modele.racine, 'en-tête').enfants[1] as NoeudTexte).contenu, 'Couleur de référence #1E6FD9 · nuance 600');
  assert.ok(!textes(trouver(trouver(modele.racine, 'thème light'), 'la rampe')).some((noeud) => noeud.contenu.includes('≈')), 'la note n’explique pas ≈');
});

test('[PLA-18] Y5.5 : deux palettes à deux intensités donnent deux cadres de même structure, quelle que soit la saturation de leur référence', () => {
  const sauge = { ...nouvellePalette(VIDE, 'p-0000000e', '#A0B599', 2)!, nom: 'Sauge' };
  const recette = avec(BLEU, sauge);
  const structure = (noeud: Noeud): unknown => (noeud.type === 'texte' ? 'texte' : [noeud.nom.replace(/^(Bleu|Sauge)$/, 'palette').replace(/\d+/g, 'n'), noeud.enfants.map(structure)]);
  const bleu = modeleDeCadre(recette, BLEU, 'SRGB');
  const deSauge = modeleDeCadre(recette, sauge, 'SRGB');
  // Le ◆ et ≈ changent de pastille d'une référence à l'autre : on compare les sections, pas le contenu des pastilles.
  const sections = (racine: NoeudCadre) => trouver(racine, 'thème light').enfants.map((noeud) => noeud.nom);
  assert.deepEqual(sections(deSauge.racine), sections(bleu.racine));
  assert.deepEqual(structure(variablesDe(deSauge.racine, 'dark', 'soft')), structure(variablesDe(bleu.racine, 'dark', 'soft')));
  assert.equal(textes(trouver(variablesDe(deSauge.racine, 'light', 'vivid'), 'surface default')).find((noeud) => noeud.nom === 'libellé')?.contenu, 'Fond teinté', 'le spécimen de surface ne se lit pas comme un profil');
});

test('[PLA-28] Y5.5 : chaque partie retirée disparaît du modèle et change l’empreinte ; l’en-tête et les rampes restent', () => {
  const complet = AVEC_GRILLE;
  const sans = (partie: 'note' | 'usages' | 'grilles' | 'light' | 'dark') =>
    modeleDeCadre({ ...RECETTE, contenuDesPlanches: { ...RECETTE.contenuDesPlanches, [partie]: false } }, BLEU, 'SRGB');
  const nomsDe = (modele: ReturnType<typeof sans>) => cadres(modele.racine).map((noeud) => noeud.nom);
  for (const partie of ['note', 'usages', 'grilles', 'light', 'dark'] as const) {
    const modele = sans(partie);
    assert.notEqual(modele.empreinte, complet.empreinte, partie);
    assert.ok(nomsDe(modele).includes('en-tête') && nomsDe(modele).includes('les deux rampes'), `${partie} : en-tête et rampes`);
  }
  assert.ok(!textes(sans('note').racine).some((noeud) => noeud.nom === 'note'));
  assert.ok(!nomsDe(sans('usages')).some((nom) => nom.startsWith('quelle nuance')));
  assert.ok(!nomsDe(sans('grilles')).includes('contrastes'));
  assert.deepEqual(sans('light').racine.enfants.map((noeud) => noeud.nom), ['en-tête', 'thème dark']);
  assert.deepEqual(sans('dark').racine.enfants.map((noeud) => noeud.nom), ['en-tête', 'thème light']);
});

test('[PLA-24] Y5.4 : les calques du cadre de Bleu, toutes parties dessinées, à une et à deux intensités', () => {
  // Trois états par dossier : 1 754 calques à deux intensités, 902 à une.
  assert.equal(compterCalques(AVEC_GRILLE.racine), 1754);
  assert.equal(compterCalques(modeleDeCadre(RECETTE_SEULE, BLEU_SEUL, 'SRGB').racine), 902);
});
