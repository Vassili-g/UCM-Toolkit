/**
 * Les faux positifs du stress test F8 : 67 cas où l'oracle n'attend aucun C43 ni C45 (ni autre constat que ceux que la page porte
 * vraiment). 48 profils de règles (propriété P1) et 19 thèmes ciblés de la section 4 du plan.
 *
 * Un profil aux règles marquées « [À compléter] » rend des C44 légitimes : seuls C43 et C45 y sont jugés.
 */
import { attenduC44, HYPOTHESES, Registre, type AttenduF8, type CasF8, type SortieDeCas } from './cas';
import { attenduDuPoint, chaineAvecLePointDuMoteur, constatsDesPoints, point } from './operateursMoteur';
import { avecLesProprietes, avecLesRegles, avecLeConteneur, jouerLaPage, reglesDe, reecrire, specDeLaForme, specR0 } from './operateursRegles';
import { specDuProfil, type SpecDePage } from './pageDeRegles';
import { PROFILS_DE_REGLES, REDIGE, type ProprieteDuJeu } from './profilsRegles';

const CODES = ['C43', 'C45'] as const;

function profils(registre: Registre): void {
  for (const profil of PROFILS_DE_REGLES) {
    registre.ajouter('FP1', {
      description: `${profil.id} : ${profil.forme}, règles ${profil.redigees ? 'rédigées' : 'marquées'}, cibles ${profil.ecriture === 'exacte' ? 'exactes' : 'compactées'}, ${profil.composants} composant(s)`,
      attendus: [], codesJuges: CODES, jouer: jouerLaPage(specDuProfil(profil)),
    });
  }
}

function themes(registre: Registre): void {
  const fp = (description: string, spec: SpecDePage, attendus: readonly AttenduF8[] = [], codesJuges: readonly string[] = CODES): void => {
    registre.ajouter('FP2', { description, attendus, codesJuges, jouer: jouerLaPage(spec) });
  };
  const tuile = specDeLaForme('tile-link');
  for (const ecrit of ['Show Icon', 'show icon', 'SHOW ICON']) fp(`cible écrite « ${ecrit} »`, avecLesRegles(tuile, reecrire(reglesDe(tuile), 'showIcon', ecrit)));
  fp('propriété du wrapper de dimensions fusionnée (tile-link)', tuile);
  const imbrique: ProprieteDuJeu = { nom: 'Icon Slot', type: 'BOOLEAN', imbrique: true };
  fp('propriété d’un imbriqué rattaché au parent', avecLesProprietes(specR0(), [...specR0().proprietes, imbrique]));
  const base = specR0();
  fp('règle sur une propriété de texte publiée', {
    ...avecLesRegles(base, [...reglesDe(base), { tag: 'boolean', cible: 'label', contenu: REDIGE }]), proprietes: [...base.proprietes, { nom: 'Label', type: 'TEXT' }],
  });
  fp('règles @icons, @usage, @default, @do, @dont et @pairs présentes', avecLesRegles(base, [
    ...reglesDe(base), { tag: 'default', cible: 'palette.primary', contenu: '' }, { tag: 'do', contenu: 'Faire.' }, { tag: 'dont', contenu: 'Ne pas faire.' }, { tag: 'pairs', contenu: 'Chip, Tag' },
  ]), [], ['C43', 'C45', 'C44']);
  fp('règle rédigée et règle marquée sur deux propriétés', avecLesRegles(base, reglesDe(base).map((regle) => (regle.cible === 'hasIcon' ? { ...regle, contenu: '[À compléter] Décrivez cette règle.' } : regle))),
    [attenduC44('a-completer|@boolean')], ['C43', 'C45', 'C44']);
  fp('page à deux composants et deux conteneurs', specDuProfil(PROFILS_DE_REGLES.find((p) => p.forme === 'button-36' && p.composants === 3 && p.redigees && p.ecriture === 'exacte')!));
  const diviseur = specDeLaForme('divider-1');
  fp('composant sans propriété, conteneur réduit à `@usage`', avecLesRegles(diviseur, reglesDe(diviseur).filter((regle) => regle.tag === 'usage')));
  fp('conteneur dans une section', avecLeConteneur(base, { emplacement: 'section' }));

  const mot = (description: string, titre: string, plus: Parameters<typeof point>[1], code: 'C30' | 'C34' | 'C42'): void => {
    const p = point(titre, plus);
    registre.ajouter('FP2', {
      description, attendus: [attenduDuPoint(code, p, ['12:34'])], rattachement: HYPOTHESES.H05, jouer: async () => ({ constats: constatsDesPoints([{ point: p, noeuds: ['12:34'] }]) }),
    });
  };
  mot('calque nommé « masqué » dans un point ordinaire', 'Layer « masqué » : il range 3 calques mais n\'utilise pas d\'auto layout.', {}, 'C42');
  mot('propriété nommée « pilote » dans un point ordinaire', 'Component Set « Button » : une combinaison de valeurs de ses propriétés de variante n\'a pas de variant, parmi « pilote ».', { famille: 'proprietes' }, 'C34');
  mot('calque nommé « Variable introuvable » dans un point de variables', 'Layer « Variable introuvable », gap : aucune variable associée.', { famille: 'variables' }, 'C30');
  mot('calque nommé « Variable introuvable » dans un point de disposition', 'Layer « Variable introuvable » : il n\'utilise pas d\'auto layout.', {}, 'C42');
  registre.ajouter('FP2', { description: 'moteur sans aucun point', attendus: [], jouer: async () => ({ constats: constatsDesPoints([]) }) });
  const repete = point('Layer « Card » : il n\'utilise pas d\'auto layout.');
  registre.ajouter('FP2', {
    description: 'même phrase du moteur répétée', attendus: [attenduDuPoint('C42', repete, ['12:34'])],
    jouer: async () => ({ constats: constatsDesPoints([{ point: repete, noeuds: ['12:34'] }, { point: repete, noeuds: ['12:34'] }]) }),
  });
  const champsDifferents = (description: string, champ: string): void => {
    registre.ajouter('FP2', {
      description, attendus: [], codesJuges: ['C29'], rattachement: 'E-30',
      jouer: async (): Promise<SortieDeCas> => {
        const sortie = await chaineAvecLePointDuMoteur({ operateur: 'Z1', code: 'C29', description: 'paddingLeft' }, { champ, layerVoisin: false });
        return { ...sortie, constats: sortie.constats.filter((constat) => constat.code === 'C30') };
      },
      verifier: (sortie) => (sortie.donnees?.kit === 1 && sortie.constats.length === 1 ? [] : [`le C29 du kit (${String(sortie.donnees?.kit)}) et le C30 du moteur (${sortie.constats.length}) doivent rester tous deux`]),
    });
  };
  champsDifferents('constat du kit sur paddingLeft, point du moteur sur itemSpacing', 'itemSpacing');
  champsDifferents('constat du kit sur paddingLeft, point du moteur sur cornerRadius', 'cornerRadius');
}

export function fauxPositifs(): CasF8[] {
  const registre = new Registre('F8');
  profils(registre);
  themes(registre);
  return registre.cas;
}
