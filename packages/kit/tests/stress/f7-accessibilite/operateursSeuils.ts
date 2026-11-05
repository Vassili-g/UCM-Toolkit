/**
 * Les opérateurs de seuil sur P0 : S1 à S3 (paires autour des seuils et rapports connus), G1 à G3 (classe et taille du texte).
 * Chaque cas pose une paire opaque en dur sur la scène du variant cible (`Degradation.poserLaPaire`) ; l'oracle rend le rapport
 * de la paire par `oracleContraste.ts` et ne déclare un constat que sous le seuil de l'usage.
 */
import {
  attenduDeLaPaire, contrasteAttendu, fabrique, nomDeLaCible, PLAGE_DU_TEXTE, tailleAttendue, type CasAccessibilite, type Usage,
} from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import type { Degradation } from './degradation.js';
import { atteintLeSeuil, rapportDeHex, seuilDeLUsage, seuilDuTexte } from './oracleContraste.js';
import { grisLesPlusProches, paireLaPlusProche } from './paires.js';

const BLANC = '#FFFFFF';
const FONDS = [BLANC, '#000000', '#F8FAFC'] as const;
const LIGNES_DE_S1: readonly (readonly [Usage, 'AA' | 'AAA'])[] = [
  ['texte', 'AA'], ['texte', 'AAA'], ['grand-texte', 'AA'], ['grand-texte', 'AAA'], ['icone', 'AA'], ['icone', 'AAA'],
  ['stroke', 'AA'], ['stroke', 'AAA'], ['anneau', 'AA'], ['anneau', 'AAA'],
];

/** S1 (80), S2 (8) et S3 (8). */
export function operateurS(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];

  // S1 : par ligne, une paire juste au-dessus et une juste au-dessous du seuil sur chaque fond, puis deux gris.
  let n = 0;
  for (const [usage, niveau] of LIGNES_DE_S1) {
    const seuil = seuilDeLUsage(usage, niveau);
    const paires: [string, string, string][] = FONDS.flatMap((fond) => {
      const { auDessus, auDessous } = paireLaPlusProche(seuil, fond);
      return [[auDessus.couleur, fond, 'au-dessus'], [auDessous.couleur, fond, 'au-dessous']] as [string, string, string][];
    });
    const gris = grisLesPlusProches(seuil, BLANC);
    paires.push([gris.auDessus.couleur, BLANC, 'gris au-dessus'], [gris.auDessous.couleur, BLANC, 'gris au-dessous']);
    for (const [couleur, fond, sens] of paires) {
      cas.push(faire(`S1-${++n}`, 'S1', {
        description: `${usage} ${niveau}, ${couleur} sur ${fond} (${sens} du seuil ${seuil}, ${rapportDeHex(couleur, fond).toFixed(9)})`, niveau,
        degrader: (d) => { d.poserLaPaire(usage, couleur, fond); },
        attendus: attenduDeLaPaire(usage, couleur, fond, niveau, [cible]),
      }));
    }
  }

  // S2 : les repères connus sur blanc.
  const reperes: [string, Usage, 'AA' | 'AAA'][] = [
    ['#767676', 'texte', 'AA'], ['#777777', 'texte', 'AA'], ['#595959', 'texte', 'AAA'], ['#5A5A5A', 'texte', 'AAA'],
    ['#949494', 'grand-texte', 'AA'], ['#959595', 'grand-texte', 'AA'], ['#949494', 'icone', 'AA'], ['#959595', 'icone', 'AA'],
  ];
  reperes.forEach(([couleur, usage, niveau], rang) => cas.push(faire(`S2-${rang + 1}`, 'S2', {
    description: `${couleur} sur blanc en ${usage} ${niveau} (${rapportDeHex(couleur, BLANC).toFixed(4)})`, niveau,
    degrader: (d) => { d.poserLaPaire(usage, couleur, BLANC); },
    attendus: attenduDeLaPaire(usage, couleur, BLANC, niveau, [cible]),
  })));

  // S3 : un même rapport aux deux niveaux, 5,0:1 en texte et 3,9:1 ailleurs.
  const cinq = paireLaPlusProche(5, BLANC).auDessus.couleur;
  const troisNeuf = paireLaPlusProche(3.9, BLANC).auDessus.couleur;
  const lignes: [Usage, string][] = [['texte', cinq], ['grand-texte', troisNeuf], ['icone', troisNeuf], ['stroke', troisNeuf]];
  for (const [usage, couleur] of lignes) {
    for (const niveau of ['AA', 'AAA'] as const) {
      cas.push(faire(`S3-${cas.filter((c) => c.operateur === 'S3').length + 1}`, 'S3', {
        description: `${usage} ${niveau}, ${couleur} sur blanc (${rapportDeHex(couleur, BLANC).toFixed(4)})`, niveau,
        degrader: (d) => { d.poserLaPaire(usage, couleur, BLANC); },
        attendus: attenduDeLaPaire(usage, couleur, BLANC, niveau, [cible]),
      }));
    }
  }
  return cas;
}

const TAILLES_DE_G1 = [18.65, 18.66, 18.664, 18.6667, 18.67, 23.99, 24] as const;
const GRAISSES = [400, 699, 700, 900] as const;

/** Le texte de `taille` px et de `graisse` sur le blanc : l'oracle classe d'après 14 pt = 56/3 px (Q-F7-3). */
function texteDeG(d: Degradation, couleur: string, taille: number, graisse: number): void {
  d.poserLaPaire('texte', couleur, BLANC, { fontSize: taille, fontWeight: graisse });
}

/** G1 (28), G2 (8) et G3 (9). */
export function operateurG(base: ComposantDeContraste): CasAccessibilite[] {
  const faire = fabrique(base);
  const cible = nomDeLaCible(base);
  const cas: CasAccessibilite[] = [];

  // G1 : une paire à 3,5:1 passe le seuil du grand texte (3) et échoue celui du texte (4,5).
  const troisCinq = paireLaPlusProche(3.5, BLANC).auDessus.couleur;
  for (const taille of TAILLES_DE_G1) {
    for (const graisse of GRAISSES) {
      const seuil = seuilDuTexte(taille, graisse, 'AA');
      const grand = seuil === 3;
      const rapport = rapportDeHex(troisCinq, BLANC);
      cas.push(faire(`G1-${cas.length + 1}`, 'G1', {
        description: `${taille} px en graisse ${graisse}, ${troisCinq} sur blanc (${rapport.toFixed(4)}), ${grand ? 'grand texte' : 'texte'}`,
        degrader: (d) => texteDeG(d, troisCinq, taille, graisse),
        attendus: atteintLeSeuil(rapport, seuil) ? [] : [contrasteAttendu({
          usage: 'texte', layer: 'Texte', plage: PLAGE_DU_TEXTE, rapport, seuil, niveau: 'AA', variants: [cible], premierPlan: troisCinq, fondHex: BLANC,
        })],
        hypothese: 'H11',
      }));
    }
  }

  // G2 : une paire à 4,0:1 échoue aux deux seuils du niveau AAA (4,5 et 7) ; le constat nomme le bon.
  const quatre = paireLaPlusProche(4, BLANC).auDessus.couleur;
  let g2 = 0;
  for (const taille of [18.66, 18.67, 23.99, 24] as const) {
    for (const graisse of [400, 700] as const) {
      const seuil = seuilDuTexte(taille, graisse, 'AAA');
      const rapport = rapportDeHex(quatre, BLANC);
      cas.push(faire(`G2-${++g2}`, 'G2', {
        description: `AAA, ${taille} px en graisse ${graisse}, ${quatre} sur blanc (${rapport.toFixed(4)}), seuil attendu ${seuil}`, niveau: 'AAA',
        degrader: (d) => texteDeG(d, quatre, taille, graisse),
        attendus: [contrasteAttendu({
          usage: seuil === 4.5 ? 'grand-texte' : 'texte', layer: 'Texte', plage: PLAGE_DU_TEXTE, rapport, seuil, niveau: 'AAA', variants: [cible], premierPlan: quatre, fondHex: BLANC,
        })],
        hypothese: 'H11',
      }));
    }
  }

  // G3 : texte sous 12 px, frontière 11,99 / 12.
  let g3 = 0;
  for (const taille of [8, 10, 11, 11.99, 12, 12.01, 0]) {
    cas.push(faire(`G3-${++g3}`, 'G3', {
      description: `texte noir sur blanc de ${taille} px`,
      degrader: (d) => { d.poserLaPaire('texte', '#000000', BLANC, { fontSize: taille }); },
      attendus: taille < 12 ? [tailleAttendue('Texte', taille, [cible])] : [],
    }));
  }
  cas.push(faire(`G3-${++g3}`, 'G3', {
    description: 'une plage de 11 px et une plage de 14 px dans le même texte',
    degrader: (d) => {
      d.poserLaPaire('texte', '#000000', BLANC);
      const texte = d.layer('Texte');
      d.fixer(texte.texte!.plages[0], 'fin', 5);
      d.inserer(texte.texte!.plages, { debut: 5, fin: 10, fontSize: 14, fontWeight: 400, peintures: [{ ...texte.texte!.plages[0].peintures[0] }], liaisons: [] });
      d.fixer(texte.texte!.plages[0], 'fontSize', 11);
    },
    attendus: [tailleAttendue('Texte', 11, [cible])],
  }));
  const desactive = base.releve.variants.find((variant) => variant.valeurs.State === 'Disabled')!;
  cas.push(faire(`G3-${++g3}`, 'G3', {
    description: `texte de 11 px dans le variant désactivé ${desactive.nom} (C53 l'exclut du contraste ; la proposition garde le texte sous 12 px)`,
    degrader: (d) => { d.poserLaPaire('texte', '#000000', BLANC, { variant: d.variantOu({ ...desactive.valeurs }), fontSize: 11 }); },
    attendus: [tailleAttendue('Texte', 11, [desactive.nom])], hypothese: 'H19',
  }));
  return cas;
}
