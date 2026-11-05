/**
 * Les opérateurs d'opacité et de couches sur P0 : O1 (alpha du texte), O2 (peintures empilées), O3 (fond composé des ancêtres),
 * O4 (fond translucide sans ancêtre opaque), O5 (opacité héritée) et O6 (composition fragile). L'oracle compose le rendu final
 * de bas en haut dans l'espace encodé, avec un seul arrondi à 8 bits (Q-F7-1), et applique l'opacité d'un ancêtre à tout ce qu'il
 * contient (Q-F7-2). Les cas qui en dépendent sont `mesure`.
 */
import {
  attenduSurLeFond, attendusSurPageEtCarte, contrasteAttendu, fabrique, limiteAttendue, nomDeLaCible, PLAGE_DU_TEXTE, repliAttendu, type AttenduAcc, type CasAccessibilite,
} from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { cadre, solide, type Degradation } from './degradation.js';
import { atteintLeSeuil, couleurDeHex, mesurerLaPaire, type Couleur } from './oracleContraste.js';
import { COMPOSITIONS_FRAGILES } from './paires.js';

const BLANC = '#FFFFFF';
const SEUIL_AA = 4.5;
/** Les constats de repli du texte noir ou gris d'un cas : le texte est le même dans les deux modes. */
const surLaPageEtLaCarte = (premierPlan: Couleur[], fond: Couleur[], cible: string): AttenduAcc[] =>
  attendusSurPageEtCarte({ usage: 'texte', seuil: SEUIL_AA, cible, premierPlan: () => premierPlan, fond });
const NOIR = '#000000';

export function operateurO(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;
  const blanc = couleurDeHex(BLANC);

  // O1 : l'alpha de la couleur, l'opacité de la peinture et celle du layer valent 1 ou 0,5 (8 cas), puis l'un des trois vaut 0.
  for (const alpha of [1, 0.5]) for (const peinture of [1, 0.5]) for (const layer of [1, 0.5]) {
    const effectif = alpha * peinture * layer;
    cas.push(faire(`O1-${numero('O1')}`, 'O1', {
      description: `texte noir sur blanc, alpha ${alpha}, peinture ${peinture}, layer ${layer} (alpha effectif ${effectif})`,
      degrader: (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR, { alpha, opacite: peinture })] }, { opacite: layer }); },
      attendus: attenduSurLeFond([couleurDeHex(NOIR, effectif)], [blanc], null, cible),
    }));
  }
  const zeros: [string, (d: Degradation) => void][] = [
    ['l\'alpha de la couleur vaut 0', (d) => { d.ajouterUnTexte('Texte', { peintures: [solide(NOIR, { alpha: 0 })] }); }],
    ['l\'opacité de la peinture vaut 0', (d) => { d.ajouterUnTexte('Texte', { peintures: [solide(NOIR, { opacite: 0 })] }); }],
    ['l\'opacité du layer vaut 0', (d) => { d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }, { opacite: 0 }); }],
    ['la plage n\'a aucune peinture', (d) => { d.ajouterUnTexte('Texte', { peintures: [] }); }],
  ];
  for (const [quoi, poser] of zeros) {
    cas.push(faire(`O1-${numero('O1')}`, 'O1', {
      description: `texte sur blanc, ${quoi} : rien n'est lisible, ni verdict ni constat`,
      degrader: (d) => { d.scene(); poser(d); }, attendus: [], verdict: 'mesure', question: 'Q-F7-2', hypothese: 'H3',
    }));
  }

  // O2 : les peintures du texte, de la plus basse à la plus haute ; la pile s'arrête à la première couche opaque.
  type Pile = { description: string; peintures: { hex: string; alpha?: number; visible?: boolean }[] };
  const piles: Pile[] = [
    { description: 'deux peintures translucides', peintures: [{ hex: '#999999', alpha: 0.5 }, { hex: '#6666CC', alpha: 0.5 }] },
    { description: 'trois peintures translucides', peintures: [{ hex: '#AAAAAA', alpha: 0.4 }, { hex: '#8888AA', alpha: 0.4 }, { hex: '#777777', alpha: 0.4 }] },
    { description: 'une peinture opaque au milieu', peintures: [{ hex: '#FF0000', alpha: 0.5 }, { hex: '#9A9A9A' }, { hex: '#707070', alpha: 0.5 }] },
    { description: 'une peinture opaque en bas', peintures: [{ hex: '#8A8A8A' }, { hex: '#FFFFFF', alpha: 0.3 }] },
    { description: 'une peinture masquée au milieu', peintures: [{ hex: '#999999', alpha: 0.5 }, { hex: '#FF00FF', visible: false }, { hex: '#A0A0A0', alpha: 0.5 }] },
    { description: "l'ordre de la première pile inversé", peintures: [{ hex: '#6666CC', alpha: 0.5 }, { hex: '#999999', alpha: 0.5 }] },
  ];
  for (const pile of piles) {
    const visibles = pile.peintures.filter((p) => p.visible !== false).map((p) => couleurDeHex(p.hex, p.alpha ?? 1));
    cas.push(faire(`O2-${numero('O2')}`, 'O2', {
      description: `${pile.description} sur le texte, fond blanc`,
      degrader: (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: pile.peintures.map((p, indice) => solide(p.hex, { alpha: p.alpha, visible: p.visible, indice })) }); },
      attendus: attenduSurLeFond([...visibles].reverse(), [blanc], null, cible),
    }));
  }

  // O3 : le fond d'un texte est la composition de ses ancêtres jusqu'au premier opaque. Le texte est gris pour que les fonds le mettent en défaut.
  const gris = '#808080';
  const texteGris = [couleurDeHex(gris)];
  const o3 = (description: string, poser: (d: Degradation) => ReturnType<Degradation['racine']>, fond: Couleur[], extra: Partial<Parameters<typeof faire>[2]> = {}, texte: Couleur[] = texteGris): void => {
    cas.push(faire(`O3-${numero('O3')}`, 'O3', {
      description, degrader: (d) => { const parent = poser(d); d.ajouterUnTexte('Texte', { peintures: [solide(gris)] }, { parent }); },
      attendus: attenduSurLeFond(texte, fond, null, cible), ...extra,
    }));
  };
  const sombre = '#4B5563';
  o3('fond blanc translucide à 50 % sur une racine opaque (2 niveaux)', (d) => { const r = d.scene({ fond: couleurDeHex(sombre) }); return cadre(d, 'Zone', r, [solide(BLANC, { alpha: 0.5 })]); },
    [couleurDeHex(BLANC, 0.5), couleurDeHex(sombre)]);
  o3('deux cadres translucides sur une racine opaque (3 niveaux)', (d) => {
    const r = d.scene({ fond: couleurDeHex(sombre) });
    return cadre(d, 'Zone2', cadre(d, 'Zone1', r, [solide('#FF0000', { alpha: 0.3 })]), [solide('#00FF00', { alpha: 0.3 })]);
  }, [couleurDeHex('#00FF00', 0.3), couleurDeHex('#FF0000', 0.3), couleurDeHex(sombre)]);
  o3('un cadre opaque au grand-parent : la racine n\'est plus lue', (d) => {
    const r = d.scene({ fond: couleurDeHex('#FF0000') });
    return cadre(d, 'Zone2', cadre(d, 'Zone1', r, [solide('#CCCCCC')]), [solide('#000000', { alpha: 0.3 })]);
  }, [couleurDeHex('#000000', 0.3), couleurDeHex('#CCCCCC')]);
  o3('un ancêtre sans peinture entre deux fonds', (d) => {
    const r = d.scene({ fond: couleurDeHex(sombre) });
    return cadre(d, 'Zone2', cadre(d, 'Zone1', r, []), [solide(BLANC, { alpha: 0.5 })]);
  }, [couleurDeHex(BLANC, 0.5), couleurDeHex(sombre)]);
  o3('un ancêtre à opacité 0,5 sur sa propre peinture opaque, qui contient aussi le texte (Q-F7-2)', (d) => {
    const r = d.scene({ fond: couleurDeHex(sombre) });
    return cadre(d, 'Zone', r, [solide(BLANC)], 0.5);
  }, [couleurDeHex(BLANC, 0.5), couleurDeHex(sombre)], { verdict: 'mesure', question: 'Q-F7-2', hypothese: 'H2' }, [couleurDeHex(gris, 0.5)]);
  o3('deux peintures translucides empilées sur le même cadre', (d) => {
    const r = d.scene({ fond: couleurDeHex(sombre) });
    return cadre(d, 'Zone', r, [solide(BLANC, { alpha: 0.5, indice: 0 }), solide('#0000FF', { alpha: 0.5, indice: 1 })]);
  }, [couleurDeHex('#0000FF', 0.5), couleurDeHex(BLANC, 0.5), couleurDeHex(sombre)]);

  // O4 : un fond translucide sans ancêtre opaque se mesure sur la page et la carte du thème, sinon sur la page Figma.
  const noir = [couleurDeHex(NOIR)];
  for (const alpha of [0.9, 0.5, 0.1, 0]) {
    const fond = [couleurDeHex(BLANC, alpha)];
    cas.push(faire(`O4-${numero('O4')}`, 'O4', {
      description: `racine blanche d'alpha ${alpha} sans ancêtre opaque : texte noir mesuré sur la page et la carte`,
      degrader: (d) => { d.scene({ fond: fond[0] }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }); },
      attendus: surLaPageEtLaCarte(noir, fond, cible),
    }));
  }
  const pageFigma = '#1E293B';
  for (const alpha of [0.9, 0.5, 0.1, 0]) {
    const fond = [couleurDeHex(BLANC, alpha)];
    const mesure = mesurerLaPaire(noir, fond, couleurDeHex(pageFigma))!;
    cas.push(faire(`O4-${numero('O4')}`, 'O4', {
      description: `racine blanche d'alpha ${alpha}, sans fonds d'élévation, page Figma ${pageFigma} : texte noir mesuré sur la page Figma`,
      degrader: (d) => { d.sansElevation(); d.pageFigma(pageFigma); d.scene({ fond: fond[0] }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }); },
      attendus: [
        ...(atteintLeSeuil(mesure.rapport, SEUIL_AA) ? [] : [contrasteAttendu({
          usage: 'texte', layer: 'Texte', plage: PLAGE_DU_TEXTE, fond: 'page-figma', rapport: mesure.rapport, seuil: SEUIL_AA, variants: [cible], premierPlan: mesure.premierPlan, fondHex: mesure.fond,
        })]),
        repliAttendu(pageFigma),
      ],
    }));
  }
  const limitesDuTexte = (): AttenduAcc[] => [
    limiteAttendue({ usage: 'stroke', layer: 'Root', cause: 'fond-indetermine' }),
    limiteAttendue({ usage: 'texte', layer: 'Texte', cause: 'fond-indetermine', plage: PLAGE_DU_TEXTE, variants: [cible] }),
  ];
  cas.push(faire(`O4-${numero('O4')}`, 'O4', {
    description: 'racine blanche d\'alpha 0,5, ni fonds d\'élévation ni page Figma : fond indéterminé',
    degrader: (d) => { d.sansElevation(); d.scene({ fond: couleurDeHex(BLANC, 0.5) }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }); },
    attendus: limitesDuTexte(),
  }));
  cas.push(faire(`O4-${numero('O4')}`, 'O4', {
    description: 'page Figma d\'alpha 0,5 : un fond translucide est indéterminé et non forcé opaque (Q-F7-1)',
    degrader: (d) => { d.sansElevation(); d.pageFigma(BLANC, 0.5); d.scene({ fond: couleurDeHex(BLANC, 0.5) }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }); },
    attendus: limitesDuTexte(),
  }));
  cas.push(faire(`O4-${numero('O4')}`, 'O4', {
    description: 'elevation/page et elevation/raised d\'alpha 0,5 : un fond translucide est indéterminé (Q-F7-1)',
    degrader: (d) => {
      for (const mode of Object.values(d.catalogue.fondsDElevation!)) { d.fixer(mode.page, 'a', 0.5); d.fixer(mode.carte, 'a', 0.5); }
      d.scene({ fond: couleurDeHex(BLANC, 0.5) }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] });
    },
    attendus: limitesDuTexte(),
  }));
  cas.push(faire(`O4-${numero('O4')}`, 'O4', {
    description: 'racine sans peinture : texte noir mesuré sur la page et la carte',
    degrader: (d) => { d.scene({ fond: null }); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }); },
    attendus: surLaPageEtLaCarte(noir, [], cible),
  }));

  // O5 : l'opacité d'un ancêtre s'applique à ce qu'il contient (Q-F7-2). Le texte noir est mesuré à l'alpha effectif.
  const o5 = (description: string, poser: (d: Degradation) => ReturnType<Degradation['racine']>, effectif: number, fond: Couleur[] = [blanc]): void => {
    cas.push(faire(`O5-${numero('O5')}`, 'O5', {
      description, degrader: (d) => { const parent = poser(d); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }, { parent }); },
      attendus: effectif === 0 ? [] : attenduSurLeFond([couleurDeHex(NOIR, effectif)], fond, null, cible),
      verdict: 'mesure', question: 'Q-F7-2', hypothese: 'H2',
    }));
  };
  o5('parent à 50 % d\'opacité', (d) => cadre(d, 'Parent', d.scene(), [], 0.5), 0.5);
  o5('parent à 10 % d\'opacité', (d) => cadre(d, 'Parent', d.scene(), [], 0.1), 0.1);
  o5('grand-parent à 50 % d\'opacité', (d) => cadre(d, 'Parent', cadre(d, 'Grand-parent', d.scene(), [], 0.5), []), 0.5);
  o5('parent à 0 d\'opacité : alpha effectif nul, rien n\'est mesuré', (d) => cadre(d, 'Parent', d.scene(), [], 0), 0);
  o5('parent à 50 % d\'opacité avec sa propre peinture grise', (d) => cadre(d, 'Parent', d.scene(), [solide('#CCCCCC')], 0.5), 0.5, [couleurDeHex('#CCCCCC', 0.5), blanc]);

  // O6 : six compositions que l'arrondi final et l'arrondi par couche jugent différemment ; l'oracle suit l'arrondi final (Q-F7-1).
  COMPOSITIONS_FRAGILES.forEach((c, rang) => {
    const zone = couleurDeHex(c.zone.couleur, c.zone.alpha);
    const texte = couleurDeHex(c.texte.couleur, c.texte.alpha);
    cas.push(faire(`O6-${rang + 1}`, 'O6', {
      description: `texte ${c.texte.couleur} à ${c.texte.alpha} sur ${c.zone.couleur} à ${c.zone.alpha} sur ${c.fond} : deux ordres d'arrondi, deux verdicts`,
      degrader: (d) => {
        const zoneLayer = cadre(d, 'Zone', d.scene({ fond: couleurDeHex(c.fond) }), [solide(c.zone.couleur, { alpha: c.zone.alpha })]);
        d.ajouterUnTexte('Texte', { peintures: [solide(c.texte.couleur, { alpha: c.texte.alpha })] }, { parent: zoneLayer });
      },
      attendus: attenduSurLeFond([texte], [zone, couleurDeHex(c.fond)], null, cible),
    }));
  });
  return cas;
}
