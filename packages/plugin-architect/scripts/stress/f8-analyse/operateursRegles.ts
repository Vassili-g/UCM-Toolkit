/**
 * Les opérateurs de règles du stress test F8 : l'instance de règles absente ou mal reconnue (G1, G2), une propriété, une valeur ou une
 * règle en trop (H1 à H4) et les règles toutes marquées « [À compléter] » (J1). 21 + 58 + 6 = 85 cas sur la page de R0 (`button-36`).
 *
 * Chaque cas dégrade la `SpecDePage` d'un profil, la lit par la chaîne entière (scan, modèle, `constatsDeRegles`, points du scan) et
 * attend ce que dit l'oracle : l'inventaire 4.7, la SPEC d'Architect (« Analyse et corrections ») et la section 2.2 du plan pour la
 * correction exacte. Un cas qui dépend d'une question Q-F89-* est `mesure` et suit la proposition de la section 9.
 */
import { normalizePropKey, normalizePropValue } from 'ucm-plugin-socle/src/composant/analyse/proprietesEtEtats';

import {
  appliquerLaVariante, lireLaPage, specDuProfil, type ConteneurEcrit, type SpecDePage, type Variante,
} from './pageDeRegles';
import {
  attenduC43, attenduC44, attenduSansPropriete, attenduSansRegle, attenduSansValeur, compacter, HYPOTHESES, Registre, type AttenduF8, type CasF8, type DefinitionDeCas, type SortieDeCas,
} from './cas';
import {
  FORMES, FORMES_DE_REGLES, modeleDuJeu, nombreDeReglesDuJeu, PROFIL_R0, PROFILS_DE_REGLES, REDIGE, reglesDuModele, sansLesReglesDe,
  type FormeDeRegles, type ProprieteDuJeu, type RegleEcrite,
} from './profilsRegles';

// ---------------------------------------------------------------------------------------------------------------------------
// Aides partagées avec les opérateurs d'écriture

export const profilDeLaForme = (forme: FormeDeRegles) => PROFILS_DE_REGLES.find((profil) => profil.forme === forme && profil.redigees && profil.ecriture === 'exacte' && profil.composants === 1)!;
export const specDeLaForme = (forme: FormeDeRegles): SpecDePage => specDuProfil(profilDeLaForme(forme));
export const specR0 = (): SpecDePage => specDuProfil(PROFIL_R0);

export const jouerLaPage = (spec: SpecDePage) => async (variante: Variante): Promise<SortieDeCas> => {
  const lecture = await lireLaPage(appliquerLaVariante(spec, variante));
  return { constats: lecture.constats, lecture };
};

/** Le conteneur du composant (le premier) avec ses règles remplacées. */
export const avecLesRegles = (spec: SpecDePage, regles: readonly RegleEcrite[]): SpecDePage => ({ ...spec, conteneurs: [{ ...spec.conteneurs[0], regles }, ...spec.conteneurs.slice(1)] });
export const avecLeConteneur = (spec: SpecDePage, conteneur: Partial<ConteneurEcrit>): SpecDePage => ({ ...spec, conteneurs: [{ ...spec.conteneurs[0], ...conteneur }, ...spec.conteneurs.slice(1)] });
export const reglesDe = (spec: SpecDePage): readonly RegleEcrite[] => spec.conteneurs[0].regles;

/** Les propriétés changées, avec les règles du modèle réécrites pour elles (rédigées, cibles exactes). */
export function avecLesProprietes(spec: SpecDePage, proprietes: readonly ProprieteDuJeu[]): SpecDePage {
  return avecLesRegles({ ...spec, proprietes }, reglesDuModele(modeleDuJeu(spec.nom, proprietes), { marquees: false, ecriture: 'exacte' }));
}

/** Réécrit la cible de chaque règle dont la cible compacte vaut `ancienne`. */
export const reecrire = (regles: readonly RegleEcrite[], ancienne: string, nouvelle: string): RegleEcrite[] =>
  regles.map((regle) => (regle.cible !== undefined && compacter(regle.cible) === compacter(ancienne) ? { ...regle, cible: nouvelle } : regle));

export const cleDeLaPropriete = (propriete: ProprieteDuJeu): string => normalizePropKey(propriete.nom);

/** Les cibles `@prop` et `@boolean` que le modèle pose pour une propriété, dans l'ordre. */
export function ciblesDe(propriete: ProprieteDuJeu): string[] {
  const cle = cleDeLaPropriete(propriete);
  if (propriete.type === 'BOOLEAN') return [cle];
  if (propriete.type === 'TEXT') return [];
  return (propriete.options ?? []).map((option) => `${cle}.${normalizePropValue(option)}`);
}

export const valeurDe = (option: string): string => normalizePropValue(option);

/**
 * P5 : le modèle que l'analyse retient pour chaque correction `ajouter` contient exactement les cibles manquantes de la propriété,
 * dans l'ordre du modèle. `attendues` : propriété (clé du contrat) vers ses cibles manquantes.
 */
export const verifierLesModeles = (attendues: Readonly<Record<string, readonly string[]>>) => (sortie: SortieDeCas): string[] => {
  const messages: string[] = [];
  for (const [propriete, cibles] of Object.entries(attendues)) {
    const constat = sortie.constats.find((candidat) => candidat.code === 'C45' && candidat.correction?.apres.nom === 'ajouter' && compacter(String(candidat.faits.propriete)) === compacter(propriete));
    if (!constat?.correction) continue;
    const modele = sortie.lecture?.modeles.get(constat.correction.id);
    const retenues = (modele?.sections ?? []).flatMap((section) => section.elements).flatMap((element) => (element.genre === 'regle' && element.cible ? [element.cible] : []));
    if (JSON.stringify(retenues) !== JSON.stringify(cibles)) messages.push(`modèle retenu pour ${propriete} : [${retenues.join(', ')}], attendu [${cibles.join(', ')}]`);
  }
  return messages;
};

const CODES_DES_REGLES = ['C43', 'C45', 'C44'] as const;
const CODES_C43_C45 = ['C43', 'C45'] as const;
const Q = {
  autrePage: 'Q-F89-5', calqueVide: 'Q-F89-6', compacte: 'Q-F89-1', memeNom: 'Q-F89-7', deuxConteneurs: 'Q-F89-8', dansInstance: 'Q-F89-9', valeurInconnue: 'Q-F89-2',
} as const;

// ---------------------------------------------------------------------------------------------------------------------------
// G1, G2 : l'instance de règles

function operateursG(registre: Registre): void {
  for (const forme of FORMES_DE_REGLES) {
    const spec = { ...specDeLaForme(forme), conteneurs: [] };
    registre.ajouter('G1', {
      description: `${forme} : aucune instance de règles sur la page`,
      attendus: [attenduC43(nombreDeReglesDuJeu(FORMES[forme].proprietes))], codesJuges: CODES_DES_REGLES,
      rattachement: `${HYPOTHESES.H08} ; E-30`, jouer: jouerLaPage(spec),
    });
  }
  const base = specR0();
  const nombre = nombreDeReglesDuJeu(base.proprietes);
  const c43 = [attenduC43(nombre)];
  const g2 = (description: string, spec: SpecDePage, attendus: readonly AttenduF8[], plus: Partial<DefinitionDeCas> = {}): void => {
    registre.ajouter('G2', { description, attendus, codesJuges: CODES_DES_REGLES, jouer: jouerLaPage(spec), ...plus });
  };
  const ecrit = (nom: string | null, emplacement: ConteneurEcrit['emplacement'] = 'page'): SpecDePage => avecLeConteneur(base, { ecrit: nom, emplacement });
  const autreNom = (nom: string, ecritNom: string): SpecDePage => ({ ...avecLeConteneur(base, { ecrit: ecritNom }), nom });

  g2('instance sur une autre page', ecrit('Button', 'autre-page'), c43, { question: Q.autrePage, rattachement: HYPOTHESES.H11 });
  g2('instance qui écrit le nom d\'un autre composant', ecrit('Alert'), c43);
  g2('calque de nom vide', ecrit(''), [attenduC43(nombre, { apres: { nom: 'remplir' } })], { question: Q.calqueVide, rattachement: HYPOTHESES.H11 });
  g2('calque de nom resté « [À compléter] »', ecrit('[À compléter]'), [attenduC43(nombre, { apres: { nom: 'remplir' } })], { question: Q.calqueVide, rattachement: HYPOTHESES.H11 });
  g2('nom en casse différente', ecrit('BUTTON'), []);
  g2('nom aux espaces en trop', ecrit(' B utton '), []);
  g2('nom avec tiret (`icon-button`)', autreNom('Icon Button', 'icon-button'), [], { question: Q.compacte, rattachement: HYPOTHESES.H02 });
  g2('nom avec souligné (`icon_button`)', autreNom('Icon Button', 'icon_button'), [], { question: Q.compacte, rattachement: HYPOTHESES.H02 });
  g2('composant renommé après coup', autreNom('Button v2', 'Button'), c43);
  g2('deux composants au nom compacté égal, un conteneur', {
    ...avecLeConteneur(base, { ecrit: 'Icon Button' }), nom: 'IconButton', voisins: [{ nom: 'Icon Button' }],
  }, [attenduC43(nombre), attenduC44('nom-compacte-double')], { question: Q.memeNom, rattachement: HYPOTHESES.H09 });
  g2('`Button` et `Button Group`, un conteneur chacun', specDuProfil(PROFILS_DE_REGLES.find((profil) => profil.forme === 'button-36' && profil.composants === 3 && profil.redigees && profil.ecriture === 'exacte')!), []);
  g2('deux conteneurs pour le même composant', {
    ...base, conteneurs: [base.conteneurs[0], { ecrit: 'Button', regles: [{ tag: 'usage', contenu: REDIGE }], emplacement: 'page' }],
  }, [attenduC44('plusieurs-instances')], { question: Q.deuxConteneurs });
  g2('conteneur dans un frame', ecrit('Button', 'cadre'), []);
  g2('conteneur dans une instance d\'un autre composant', ecrit('Button', 'instance'), [], { question: Q.dansInstance, rattachement: HYPOTHESES.H10 });
  g2('sélection d\'un composant seul, sans jeu', { ...base, type: 'COMPONENT' }, []);
}

// ---------------------------------------------------------------------------------------------------------------------------
// H1 à H4 : propriété, valeur ou règle en trop

const PROPRIETES_DE_H1: readonly (readonly [FormeDeRegles, number])[] = [['alert-11', 3], ['button-36', 6], ['switch-4', 2], ['badge-9', 2], ['tile-link', 3]];

function operateursH1(registre: Registre): void {
  for (const [forme, nombre] of PROPRIETES_DE_H1) {
    const base = specDeLaForme(forme);
    const proprietes = base.proprietes.filter((propriete) => propriete.type !== 'TEXT');
    if (proprietes.length !== nombre) throw new Error(`${forme} : ${proprietes.length} propriétés, le plan en compte ${nombre}`);
    for (const propriete of proprietes) {
      const cle = cleDeLaPropriete(propriete);
      const cibles = ciblesDe(propriete);
      registre.ajouter('H1', {
        description: `${forme} : « ${propriete.nom} » sans aucune règle`,
        attendus: [attenduSansRegle(cle, cibles.length)], codesJuges: CODES_C43_C45,
        jouer: jouerLaPage(avecLesRegles(base, sansLesReglesDe(reglesDe(base), cle))), verifier: verifierLesModeles({ [cle]: cibles }),
      });
    }
  }
}

function operateursH2(registre: Registre): void {
  const base = specR0();
  const par = (nom: string): ProprieteDuJeu => base.proprietes.find((propriete) => propriete.nom === nom)!;
  const retirer = (description: string, nom: string, valeurs: readonly string[]): void => {
    const propriete = par(nom);
    const cle = cleDeLaPropriete(propriete);
    const manquantes = valeurs.map(valeurDe);
    registre.ajouter('H2', {
      description, attendus: [attenduSansValeur(cle, manquantes)], codesJuges: CODES_C43_C45,
      jouer: jouerLaPage(avecLesRegles(base, sansLesReglesDe(reglesDe(base), cle, manquantes))),
      verifier: verifierLesModeles({ [cle]: manquantes.map((valeur) => `${cle}.${valeur}`) }),
    });
  };
  const options = (nom: string): readonly string[] => par(nom).options!;
  retirer('Palette : première valeur sans règle', 'Palette', [options('Palette')[0]]);
  retirer('Palette : valeur médiane sans règle', 'Palette', [options('Palette')[1]]);
  retirer('Palette : dernière valeur sans règle', 'Palette', [options('Palette')[2]]);
  retirer('Style : première valeur sans règle', 'Style', [options('Style')[0]]);
  retirer('Style : dernière valeur sans règle', 'Style', [options('Style')[1]]);
  retirer('State : première valeur sans règle', 'State', [options('State')[0]]);
  retirer('State : valeur médiane sans règle', 'State', [options('State')[1]]);
  retirer('State : dernière valeur sans règle', 'State', [options('State')[2]]);
  retirer('Size : première valeur sans règle', 'Size', [options('Size')[0]]);
  retirer('Size : dernière valeur sans règle', 'Size', [options('Size')[1]]);
  for (const nom of ['Palette', 'Style', 'State', 'Size']) retirer(`${nom} : toutes les valeurs sauf la dernière sans règle`, nom, options(nom).slice(0, -1));
  retirer('Palette : première et dernière valeurs sans règle', 'Palette', [options('Palette')[0], options('Palette')[2]]);
  retirer('State : première et dernière valeurs sans règle', 'State', [options('State')[0], options('State')[2]]);
}

function operateursH3(registre: Registre): void {
  const base = specR0();
  const regles = reglesDe(base);
  const h3 = (description: string, spec: SpecDePage, attendus: readonly AttenduF8[], plus: Partial<DefinitionDeCas> = {}): void => {
    registre.ajouter('H3', { description, attendus, codesJuges: CODES_C43_C45, jouer: jouerLaPage(spec), ...plus });
  };
  const avec = (...extra: RegleEcrite[]): SpecDePage => avecLesRegles(base, [...regles, ...extra]);
  const booleenne = (cible: string): RegleEcrite => ({ tag: 'boolean', cible, contenu: REDIGE });
  const valeur = (cible: string): RegleEcrite => ({ tag: 'prop', cible, contenu: REDIGE });
  h3('cible à une lettre près (`hasIcn`)', avec(booleenne('hasIcn')), [attenduSansPropriete('hasIcn')]);
  h3('cible en casse différente (`HASICON`)', avec(booleenne('HASICON')), [], { relations: ['ordre'] });
  h3('propriété supprimée du composant (`Loading`)', { ...base, proprietes: base.proprietes.filter((propriete) => propriete.nom !== 'Loading') }, [attenduSansPropriete('loading')]);
  const wrapper: ProprieteDuJeu = { nom: 'Dimension', type: 'VARIANT', options: ['wide', 'tall'], wrapper: true };
  h3('propriété du wrapper de dimensions, ses règles posées', avecLesProprietes(base, [...base.proprietes, wrapper]), []);
  const imbrique: ProprieteDuJeu = { nom: 'Icon Slot', type: 'BOOLEAN', imbrique: true };
  h3('propriété d\'un imbriqué rattaché au parent, sa règle posée', avecLesProprietes(base, [...base.proprietes, imbrique]), []);
  const texte: ProprieteDuJeu = { nom: 'Label', type: 'TEXT' };
  h3('règle sur une propriété de texte publiée', { ...avec(booleenne('label')), proprietes: [...base.proprietes, texte] }, []);
  h3('valeur inexistante (`size.xxl`)', avec(valeur('size.xxl')), [{ code: 'C45', cle: 'valeur-inconnue|size', forme: 'a-faire', faits: { ecart: 'valeur-inconnue' } }], { question: Q.valeurInconnue, rattachement: HYPOTHESES.H03 });
  h3('axe inexistant avec valeur (`tone.loud`)', avec(valeur('tone.loud')), [attenduSansPropriete('tone')]);
  h3('cible vide', avec(valeur('')), [attenduSansPropriete('')]);
  h3('cible faite d\'espaces', avec(valeur('   ')), [attenduSansPropriete('')]);
  h3('cible à deux propriétés (`hasIcon loading`)', avec(booleenne('hasIcon loading')), [attenduSansPropriete('hasIconLoading')]);
  h3('tag croisé : `@boolean` sur un axe (`palette`)', avec(booleenne('palette')), [attenduSansPropriete('palette')]);
}

function operateursH4(registre: Registre): void {
  const h4 = (description: string, spec: SpecDePage, plus: Partial<DefinitionDeCas> = {}): void => {
    registre.ajouter('H4', { description, attendus: [], codesJuges: CODES_C43_C45, jouer: jouerLaPage(spec), ...plus });
  };
  const tuile = specDeLaForme('tile-link');
  const bouton = specR0();
  const ecritePar = (spec: SpecDePage, ancienne: string, nouvelle: string): SpecDePage => avecLesRegles(spec, reecrire(reglesDe(spec), ancienne, nouvelle));
  h4('`Show Icon` écrit `show icon`', ecritePar(tuile, 'showIcon', 'show icon'));
  h4('`Show Icon` écrit `show-icon`', ecritePar(tuile, 'showIcon', 'show-icon'), { question: Q.compacte, rattachement: HYPOTHESES.H02 });
  h4('`Show Icon` écrit `show_icon`', ecritePar(tuile, 'showIcon', 'show_icon'), { question: Q.compacte, rattachement: HYPOTHESES.H02 });
  h4('`Show Icon` écrit `showIcon`', ecritePar(tuile, 'showIcon', 'showIcon'));
  h4('`Has Icon` écrit `Has Icon#1:2`', ecritePar(bouton, 'hasIcon', 'Has Icon#1:2'), { question: Q.compacte });
  const avecPropriete = (propriete: ProprieteDuJeu): SpecDePage => avecLesProprietes(bouton, [...bouton.proprietes, propriete]);
  const variante = (nom: string, options: readonly string[]): ProprieteDuJeu => ({ nom, type: 'VARIANT', options });
  const reecrites = (spec: SpecDePage, paires: ReadonlyArray<readonly [string, string]>): SpecDePage => paires.reduce((courant, [ancienne, nouvelle]) => ecritePar(courant, ancienne, nouvelle), spec);
  h4('valeur accentuée (`Saison.Été`)', reecrites(avecPropriete(variante('Saison', ['Été', 'Hiver'])), [['saison.été', 'Saison.Été'], ['saison.hiver', 'Saison.Hiver']]));
  h4('valeur `1.5` face à `Version.1.5`', reecrites(avecPropriete(variante('Version', ['1.5', '2'])), [['version.1-5', 'Version.1.5']]), { rattachement: HYPOTHESES.H01 });
  h4('valeurs `v2.0` et `v2.1`', reecrites(avecPropriete(variante('Release', ['v2.0', 'v2.1'])), [['release.v2-0', 'Release.v2.0'], ['release.v2-1', 'Release.v2.1']]), { rattachement: HYPOTHESES.H01 });
  h4('propriété nommée `Size.Mode`', reecrites(avecPropriete(variante('Size.Mode', ['compact', 'wide'])), [['sizemode.compact', 'Size.Mode.compact'], ['sizemode.wide', 'Size.Mode.wide']]));
  h4('valeur `Extra Large` écrite `ExtraLarge`', reecrites(avecPropriete(variante('Width', ['Extra Large', 'Small'])), [['width.extra-large', 'Width.ExtraLarge']]));
  h4('valeur `Extra Large` écrite `Extra-Large`', reecrites(avecPropriete(variante('Width', ['Extra Large', 'Small'])), [['width.extra-large', 'Width.Extra-Large']]), { question: Q.compacte });
  h4('valeur `Icon / Left`', reecrites(avecPropriete(variante('Position', ['Icon / Left', 'Icon / Right'])), [['position.icon-/-left', 'Position.Icon / Left']]));
  h4('propriété nommée `1`', avecPropriete(variante('1', ['a', 'b'])));
  h4('deux propriétés au nom compacté égal (`Icon Left`, `icon-left`)', avecLesProprietes(bouton, [...bouton.proprietes, { nom: 'Icon Left', type: 'BOOLEAN' }, { nom: 'icon-left', type: 'BOOLEAN' }]));
}

function operateursJ1(registre: Registre): void {
  for (const forme of FORMES_DE_REGLES) {
    const base = specDeLaForme(forme);
    const marquees = reglesDuModele(modeleDuJeu(base.nom, base.proprietes), { marquees: true, ecriture: 'exacte' });
    const tags = ['usage', 'prop', 'boolean', 'icons'].filter((tag) => marquees.some((regle) => regle.tag === tag));
    registre.ajouter('J1', {
      description: `${forme} : toutes les règles marquées « [À compléter] »`,
      attendus: tags.map((tag) => attenduC44(`a-completer|@${tag}`)), codesJuges: CODES_DES_REGLES,
      jouer: jouerLaPage(avecLesRegles(base, marquees)),
    });
  }
}

export function operateursRegles(): CasF8[] {
  const registre = new Registre('F8');
  operateursG(registre);
  operateursH1(registre);
  operateursH2(registre);
  operateursH3(registre);
  operateursH4(registre);
  operateursJ1(registre);
  return registre.cas;
}
