/**
 * Les opérateurs de contour et d'anneau sur P0 : R1 (contour, C50), R2 (nom du layer d'anneau), R3 (valeur de l'état en focus),
 * R4 (anneau invisible) et R5 (épaisseur de l'anneau, C51). Les cas d'anneau travaillent sur le premier variant `Focus` : sa scène ne
 * garde que le `Root`, les onze autres variants en focus gardent leur anneau, donc `C50:sans-anneau` ne nomme que le variant dégradé.
 * Un anneau est un layer visible, hors texte, dont le nom suit l'expression du kit (`ring`, `focus-ring`, avec un point ou un tiret
 * bas en tête) et qui a une peinture visible (Q-F7-9). Le contour de 2:1 vaut #B8B8B8 sur le fond blanc de la scène.
 */
import {
  attendusSurPageEtCarte, contrasteAttendu, epaisseurAttendue, fabrique, limiteAttendue, modesDuProfil, nomDeLaCible, sansAnneauAttendu,
  type AttenduAcc, type CasAccessibilite,
} from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { peintureDeType, solide, type Degradation } from './degradation.js';
import { couleurDeHex, mesurerLaPaire, rapportDeHex } from './oracleContraste.js';

const BLANC = '#FFFFFF';
const NOIR = '#000000';
const FAIBLE = '#B8B8B8';
const SEUIL = 3;

const contour = (couleur = FAIBLE, o: Parameters<typeof solide>[1] = {}) => solide(couleur, { ...o, champ: 'strokes' });

const contourAttendu = (layer: string, cible: string, couleur = FAIBLE): AttenduAcc =>
  contrasteAttendu({ usage: 'stroke', layer, rapport: rapportDeHex(couleur, BLANC), seuil: SEUIL, variants: [cible], premierPlan: couleur, fondHex: BLANC });

export function operateurR(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];
  const numero = (operateur: string): number => cas.filter((c) => c.operateur === operateur).length + 1;
  const enFocus = base.releve.variants.filter((variant) => variant.valeurs.State === 'Focus');
  const focus = enFocus[0].nom;

  // R1 : le contour d'épaisseur non nulle et de peinture visible, sous 3:1.
  const contourSurRectangle = (peintures: ReturnType<typeof solide>[], strokeWeight: number | undefined = 1, extra: Partial<Parameters<Degradation['ajouterUnLayer']>[0]> = {}) => (d: Degradation): void => {
    d.scene();
    d.ajouterUnLayer({ nom: 'Contour', peintures, ...(strokeWeight === undefined ? {} : { strokeWeight }), ...extra });
  };
  for (const [quoi, epaisseur] of [['absente', undefined], ['0', 0], ['0,5', 0.5], ['1', 1], ['2', 2]] as const) {
    cas.push(faire(`R1-${numero('R1')}`, 'R1', {
      description: `contour ${FAIBLE} d'épaisseur ${quoi}`,
      degrader: (d) => { d.scene(); d.ajouterUnLayer({ nom: 'Contour', peintures: [contour()], ...(epaisseur === undefined ? {} : { strokeWeight: epaisseur }) }); },
      attendus: epaisseur ? [contourAttendu('Contour', cible)] : [],
    }));
  }
  const composee = mesurerLaPaire([couleurDeHex('#606060', 0.5)], [couleurDeHex(BLANC)], null)!;
  const peintures: [string, ReturnType<typeof solide>[], AttenduAcc[], Partial<{ verdict: 'mesure'; question: string; hypothese: string }>][] = [
    ['peinture masquée', [contour(FAIBLE, { visible: false })], [], {}],
    ['peinture d\'opacité 0', [contour(FAIBLE, { opacite: 0 })], [], {}],
    ['peinture d\'alpha 0', [contour(FAIBLE, { alpha: 0 })], [], { hypothese: 'H3' }],
    ['peinture translucide #606060 d\'alpha 0,5', [contour('#606060', { alpha: 0.5 })],
      [contrasteAttendu({ usage: 'stroke', layer: 'Contour', rapport: composee.rapport, seuil: SEUIL, variants: [cible], premierPlan: composee.premierPlan, fondHex: composee.fond })], {}],
    ['peinture en dégradé', [peintureDeType('GRADIENT_LINEAR', { champ: 'strokes' })],
      [limiteAttendue({ usage: 'stroke', layer: 'Contour', cause: 'degrade', variants: [cible] })], {}],
  ];
  for (const [quoi, peinturesDuCas, attendus, plus] of peintures) {
    cas.push(faire(`R1-${numero('R1')}`, 'R1', { description: `contour d'épaisseur 1, ${quoi}`, degrader: contourSurRectangle(peinturesDuCas), attendus, ...plus }));
  }
  cas.push(faire(`R1-${numero('R1')}`, 'R1', {
    description: `contour ${FAIBLE} sur un TEXT : seul le texte se mesure`,
    degrader: (d) => { d.scene(); d.ajouterUnTexte('Texte', { peintures: [solide(NOIR)] }, { peintures: [contour()], strokeWeight: 1 }); }, attendus: [],
  }));
  const surSonFill: [string, ReturnType<typeof solide>[], boolean][] = [
    ['fill #404040 à plus de 3:1 : le contour décoratif reste muet', [solide('#404040', { indice: 0 }), contour()], false],
    ['fill masqué : le contour se mesure', [solide('#404040', { indice: 0, visible: false }), contour()], true],
    [`fill ${FAIBLE} sous 3:1 : le contour se mesure`, [solide(FAIBLE, { indice: 0 }), contour()], true],
  ];
  for (const [quoi, peinturesDuCas, mesure] of surSonFill) {
    cas.push(faire(`R1-${numero('R1')}`, 'R1', {
      description: `contour ${FAIBLE} sur un layer qui a son fill, ${quoi}`, degrader: contourSurRectangle(peinturesDuCas),
      attendus: mesure ? [contourAttendu('Contour', cible)] : [], hypothese: 'H17',
    }));
  }
  cas.push(faire(`R1-${numero('R1')}`, 'R1', {
    description: `contour ${FAIBLE} sur le Root sans parent : il se mesure sur la page et la carte du thème`,
    degrader: (d) => { const racine = d.scene(); d.remplacerLesPeintures(racine, 'strokes', [contour()]); },
    attendus: attendusSurPageEtCarte({ usage: 'stroke', layer: 'Root', seuil: SEUIL, cible, premierPlan: () => [couleurDeHex(FAIBLE)], modes: modesDuProfil(base) }),
  }));
  cas.push(faire(`R1-${numero('R1')}`, 'R1', {
    description: 'contour de 2:1 dont la lecture des peintures a échoué (peintures mixtes) : aucune accusation',
    degrader: (d) => {
      d.scene();
      const layer = d.ajouterUnLayer({ nom: 'Contour', peintures: [contour()], strokeWeight: 1 });
      d.inserer(d.releve.lecture.manquees, { layer: layer.id, champ: 'strokes', motif: 'peintures mixtes' });
    },
    attendus: [],
  }));

  // R2 : le nom d'un layer d'anneau dans un variant en focus.
  const anneauEnFocus = (d: Degradation, nom: string, o: { type?: string; parent?: ReturnType<Degradation['racine']> } = {}): ReturnType<Degradation['racine']> => {
    const variant = d.variantOu({ State: 'Focus' });
    d.scene({ variant });
    return d.ajouterUnLayer({ variant, nom, type: o.type ?? 'RECTANGLE', peintures: [contour(NOIR)], strokeWeight: 2, ...(o.parent ? { parent: o.parent } : {}) });
  };
  for (const nom of ['ring', '.Ring', '_ring', 'focus-ring', 'Focus Ring', 'focus_ring', 'focusRing', 'RING']) {
    cas.push(faire(`R2-${numero('R2')}`, 'R2', { description: `anneau de 2 px nommé « ${nom} » dans un variant en focus : reconnu`, degrader: (d) => { anneauEnFocus(d, nom); }, attendus: [] }));
  }
  cas.push(faire(`R2-${numero('R2')}`, 'R2', {
    description: 'layer de 2 px nommé « ringer » dans un variant en focus : pas un anneau', degrader: (d) => { anneauEnFocus(d, 'ringer'); }, attendus: [sansAnneauAttendu([focus])],
  }));
  for (const nom of ['Ring Wrapper', 'ring-2', 'Focus', 'outline', 'focus-outline', 'Ring/Outer']) {
    cas.push(faire(`R2-${numero('R2')}`, 'R2', {
      description: `layer de 2 px nommé « ${nom} » dans un variant en focus : pas un anneau selon Q-F7-9`, degrader: (d) => { anneauEnFocus(d, nom); },
      attendus: [sansAnneauAttendu([focus])], verdict: 'mesure', question: 'Q-F7-9',
    }));
  }

  // R3 : la valeur de l'état. Les variants dégradés n'ont aucun anneau.
  const sansAnneauAvecEtat = (valeurs: Record<string, string>) => (d: Degradation): void => {
    d.scene();
    for (const [axe, valeur] of Object.entries(valeurs)) d.fixer(d.cible.valeurs, axe, valeur);
  };
  for (const [valeur, enFocusOuPas] of [
    ['focus', true], ['Focused', true], ['Focus', true], ['focus-visible', true], ['Focus Visible', true],
    ['hover', false], ['pressed', false], ['selected', false], ['default', false],
  ] as const) {
    cas.push(faire(`R3-${numero('R3')}`, 'R3', {
      description: `état « ${valeur} » sans anneau : ${enFocusOuPas ? 'un variant en focus' : 'pas un focus'}`, degrader: sansAnneauAvecEtat({ State: valeur }),
      attendus: enFocusOuPas ? [sansAnneauAttendu([cible])] : [],
    }));
  }
  cas.push(faire(`R3-${numero('R3')}`, 'R3', {
    description: 'deux axes d\'états, State et Status, qui valent Focus tous les deux, sans anneau', degrader: sansAnneauAvecEtat({ State: 'Focus', Status: 'Focus' }), attendus: [sansAnneauAttendu([cible])],
  }));

  // R4 : un anneau qui ne se voit pas ne compte pas.
  const invisible: [string, (d: Degradation) => void, boolean][] = [
    ['layer masqué', (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR)], strokeWeight: 2, visible: false }); }, false],
    ['peinture masquée', (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR, { visible: false })], strokeWeight: 2 }); }, false],
    ['peinture d\'opacité 0', (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR, { opacite: 0 })], strokeWeight: 2 }); }, false],
    ['layer d\'opacité 0', (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR)], strokeWeight: 2, opacite: 0 }); }, true],
    ['couleur d\'alpha 0', (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR, { alpha: 0 })], strokeWeight: 2 }); }, true],
    ['sous un ancêtre masqué', (d) => {
      const v = d.variantOu({ State: 'Focus' });
      const zone = d.ajouterUnLayer({ variant: v, nom: 'Zone', type: 'FRAME', parent: d.scene({ variant: v }), visible: false });
      d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR)], strokeWeight: 2, parent: zone });
    }, false],
    ['de type TEXT', (d) => {
      const v = d.variantOu({ State: 'Focus' });
      d.scene({ variant: v });
      d.ajouterUnLayer({ variant: v, nom: 'ring', type: 'TEXT', plages: [{ peintures: [solide(NOIR)] }], peintures: [contour(NOIR)], strokeWeight: 2 });
    }, false],
    ['sans peinture', (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [], strokeWeight: 2 }); }, false],
  ];
  for (const [quoi, degrader, probablementMesure] of invisible) {
    cas.push(faire(`R4-${numero('R4')}`, 'R4', {
      description: `anneau « ring » invisible (${quoi}) dans un variant en focus`, degrader, attendus: [sansAnneauAttendu([focus])], ...(probablementMesure ? { hypothese: 'H3' } : {}),
    }));
  }
  cas.push(faire(`R4-${numero('R4')}`, 'R4', {
    description: 'instance « .Ring » sans peinture propre, dont un descendant a un contour visible : un anneau selon Q-F7-9',
    degrader: (d) => {
      const v = d.variantOu({ State: 'Focus' });
      const instance = d.ajouterUnLayer({ variant: v, nom: '.Ring', type: 'INSTANCE', parent: d.scene({ variant: v }) });
      d.ajouterUnLayer({ variant: v, nom: 'Contour', peintures: [contour(NOIR)], strokeWeight: 2, parent: instance });
    },
    attendus: [], hypothese: 'H7',
  }));
  cas.push(faire(`R4-${numero('R4')}`, 'R4', {
    description: `ELLIPSE « ring » remplie ${FAIBLE} sans contour : mesurée sur son fill, sans accusation de C51`,
    degrader: (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', type: 'ELLIPSE', peintures: [solide(FAIBLE)] }); },
    attendus: [contrasteAttendu({ usage: 'anneau', layer: 'ring', rapport: rapportDeHex(FAIBLE, BLANC), seuil: SEUIL, variants: [focus], premierPlan: FAIBLE, fondHex: BLANC })],
    hypothese: 'H8',
  }));

  // R5 : l'épaisseur de l'anneau vaut 2 px ; C51 donne l'épaisseur lue.
  const anneauDEpaisseur = (epaisseur: number | undefined, extra: Partial<Parameters<Degradation['ajouterUnLayer']>[0]> = {}) => (d: Degradation): void => {
    const v = d.variantOu({ State: 'Focus' });
    d.scene({ variant: v });
    d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR)], ...(epaisseur === undefined ? {} : { strokeWeight: epaisseur }), ...extra });
  };
  for (const epaisseur of [undefined, 0, 1, 1.5, 1.99, 2, 2.01, 3, 4, 8]) {
    cas.push(faire(`R5-${numero('R5')}`, 'R5', {
      description: `anneau d'épaisseur ${epaisseur ?? 'absente'}`, degrader: anneauDEpaisseur(epaisseur),
      attendus: epaisseur === undefined || epaisseur === 2 ? [] : [epaisseurAttendue('ring', epaisseur, [focus])],
    }));
  }
  cas.push(faire(`R5-${numero('R5')}`, 'R5', {
    description: 'anneau d\'épaisseur 1,9999999', degrader: anneauDEpaisseur(1.9999999), attendus: [epaisseurAttendue('ring', 1.9999999, [focus])], verdict: 'mesure', question: 'Q-F7-9',
  }));
  cas.push(faire(`R5-${numero('R5')}`, 'R5', {
    description: 'anneau rempli noir d\'épaisseur 0, sans contour visible : pas accusé par C51 selon Q-F7-9',
    degrader: (d) => { const v = d.variantOu({ State: 'Focus' }); d.scene({ variant: v }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [solide(NOIR)], strokeWeight: 0 }); },
    attendus: [], hypothese: 'H8',
  }));
  cas.push(faire(`R5-${numero('R5')}`, 'R5', {
    description: 'deux anneaux « ring » de 1 px dans le même variant : un seul constat, sans layer en double',
    degrader: (d) => { anneauDEpaisseur(1)(d); const v = d.variantOu({ State: 'Focus' }); d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR)], strokeWeight: 1 }); },
    attendus: [epaisseurAttendue('ring', 1, [focus])], layersUniques: true, hypothese: 'H20',
  }));
  const troisVariants = enFocus.slice(0, 3);
  cas.push(faire(`R5-${numero('R5')}`, 'R5', {
    description: 'le même anneau de 1 px dans trois variants en focus : un seul constat qui les nomme',
    degrader: (d) => {
      for (const modele of troisVariants) {
        const v = d.variantOu({ Palette: modele.valeurs.Palette, Style: modele.valeurs.Style, State: 'Focus', Size: modele.valeurs.Size });
        d.scene({ variant: v });
        d.ajouterUnLayer({ variant: v, nom: 'ring', peintures: [contour(NOIR)], strokeWeight: 1 });
      }
    },
    attendus: [epaisseurAttendue('ring', 1, troisVariants.map((variant) => variant.nom))],
  }));
  return cas;
}
