/**
 * Ce que l'onglet À trancher affiche d'une question : le texte, les colonnes,
 * les boutons et la réponse que chacun envoie. Le module est pur ; `aTrancher.ts`
 * en fait du DOM.
 */
import { COLLECTIONS } from '@ucm-kit/core/referentiel';
import type { ConflitVue, LigneVue, QuestionVue, Reponse, TermeVue } from '../messages';
import { TEXTES } from './textes';

type QuestionDePaire = Extract<QuestionVue, { type: 'paire' }>;
type QuestionDEcriture = Extract<QuestionVue, { type: 'ecriture-du-terme' }>;
type QuestionDeCollection = Extract<QuestionVue, { type: 'collection' }>;

/** Ce que fait un bouton : répondre tout de suite, ouvrir le champ de saisie, ou répondre avec la valeur choisie dans la liste. */
export type Suite =
  | { readonly sorte: 'repondre'; readonly reponse: Reponse }
  | { readonly sorte: 'saisir' }
  | { readonly sorte: 'choisir'; readonly reponse: (cible: string) => Reponse };

export interface ActionDeCarte {
  readonly id: 'garder' | 'termes-differents' | 'autre-terme' | 'corriger' | 'separer' | 'voulu' | 'seul-mot' | 'renommer' | 'garder-ce-nom' | 'plus-tard';
  readonly libelle: string;
  /** Un bouton `principal` est plein, un bouton `secondaire` est bordé. */
  readonly poids: 'principal' | 'secondaire';
  readonly suite: Suite;
}

/** Les boutons du pied : ceux de gauche, puis « Plus tard » à droite. */
export interface PiedDeCarte {
  readonly actions: readonly ActionDeCarte[];
  readonly plusTard: ActionDeCarte;
}

export interface ColonneDeCarte {
  readonly rang: 0 | 1;
  readonly terme: string;
  readonly ucm: boolean;
  readonly detail: string;
  readonly exemple: LigneVue | null;
  readonly propose: boolean;
  readonly garder: ActionDeCarte;
}

export type CarteDeQuestion =
  | {
      readonly forme: 'face-a-face';
      readonly cle: string;
      readonly question: string;
      readonly indice: string;
      readonly colonnes: readonly [ColonneDeCarte, ColonneDeCarte];
      /** La cible que les deux termes partagent, quand la question en a une. */
      readonly preuve: string | null;
      readonly pied: PiedDeCarte;
    }
  | {
      readonly forme: 'avant-apres';
      readonly cle: string;
      readonly question: string;
      readonly indice: string;
      readonly avant: string;
      readonly apres: string;
      readonly detail: string;
      readonly pied: PiedDeCarte;
    }
  | {
      readonly forme: 'collection';
      readonly cle: string;
      readonly question: string;
      readonly indice: string;
      readonly nom: string;
      /** Les collections UCM, dans l'ordre du référentiel. */
      readonly options: readonly string[];
      /** La collection présélectionnée ; `null` quand la proposition n'est pas une collection UCM. */
      readonly choix: string | null;
      readonly pied: PiedDeCarte;
    };

const repondre = (reponse: Reponse): Suite => ({ sorte: 'repondre', reponse });
const plusTard: ActionDeCarte = { id: 'plus-tard', libelle: TEXTES.plusTard, poids: 'secondaire', suite: repondre({ type: 'plus-tard' }) };

function colonneDeTerme(rang: 0 | 1, terme: TermeVue, propose: boolean): ColonneDeCarte {
  return {
    rang,
    terme: terme.mot,
    ucm: terme.ucm,
    detail: TEXTES.nombreDeNoms(terme.nombre, 0),
    exemple: terme.exemples[0] ?? null,
    propose,
    garder: { id: 'garder', libelle: TEXTES.garderLeTerme(terme.mot), poids: propose ? 'principal' : 'secondaire', suite: repondre({ type: 'garder', rang }) },
  };
}

function carteDePaire(question: QuestionDePaire): CarteDeQuestion {
  const [premier, second] = question.termes;
  return {
    forme: 'face-a-face',
    cle: question.cle,
    question: TEXTES.questionDePaire,
    indice: TEXTES.indiceDePaire[question.indice],
    colonnes: [colonneDeTerme(0, premier, question.propose === 0), colonneDeTerme(1, second, question.propose === 1)],
    preuve: question.cibleCommune === null ? null : TEXTES.lesDeuxVisent(question.cibleCommune),
    pied: {
      actions: [
        { id: 'termes-differents', libelle: TEXTES.termesDifferents, poids: 'secondaire', suite: repondre({ type: 'distincts' }) },
        { id: 'autre-terme', libelle: TEXTES.autreTerme, poids: 'secondaire', suite: { sorte: 'saisir' } },
      ],
      plusTard,
    },
  };
}

function carteDEcriture(question: QuestionDEcriture): CarteDeQuestion {
  const faute = question.indice === 'faute';
  return {
    forme: 'avant-apres',
    cle: question.cle,
    question: faute ? TEXTES.questionDeFaute : TEXTES.questionDeMotsColles,
    indice: faute ? TEXTES.indiceDeFaute : TEXTES.indiceDeMotsColles,
    avant: question.terme.mot,
    apres: question.proposition.join('-'),
    detail: TEXTES.detailDuTerme(question.terme.nombre, question.reference),
    pied: {
      actions: [
        { id: faute ? 'corriger' : 'separer', libelle: faute ? TEXTES.corriger : TEXTES.separer, poids: 'principal', suite: repondre({ type: 'corriger', mots: question.proposition }) },
        { id: faute ? 'voulu' : 'seul-mot', libelle: faute ? TEXTES.cEstVoulu : TEXTES.cEstUnSeulMot, poids: 'secondaire', suite: repondre({ type: 'voulu' }) },
      ],
      plusTard,
    },
  };
}

function carteDeCollection(question: QuestionDeCollection): CarteDeQuestion {
  return {
    forme: 'collection',
    cle: question.cle,
    question: TEXTES.questionDeCollection(question.nom),
    indice: TEXTES.nombreDeNoms(question.nombre, 0),
    nom: question.nom,
    options: COLLECTIONS,
    choix: COLLECTIONS.find((collection) => collection === question.proposee) ?? null,
    pied: {
      actions: [
        { id: 'renommer', libelle: TEXTES.renommer, poids: 'principal', suite: { sorte: 'choisir', reponse: (cible) => ({ type: 'collection', cible }) } },
        { id: 'garder-ce-nom', libelle: TEXTES.garderCeNom, poids: 'secondaire', suite: repondre({ type: 'collection', cible: null }) },
      ],
      plusTard,
    },
  };
}

export function carteDeQuestion(question: QuestionVue): CarteDeQuestion {
  switch (question.type) {
    case 'paire':
      return carteDePaire(question);
    case 'ecriture-du-terme':
      return carteDEcriture(question);
    case 'collection':
      return carteDeCollection(question);
  }
}

/** La carte « Autre terme… » : le terme saisi remplace les deux termes de la paire. */
export interface ChampAutreTerme {
  readonly question: string;
  readonly libelle: string;
  /** L'avant → après que la saisie produit, et ce qu'elle ajoute à À appliquer. */
  effet(saisie: string): { readonly avant: string; readonly apres: string; readonly detail: string };
  /** `null` tant que la saisie est vide. */
  reponse(saisie: string): Reponse | null;
}

export function champAutreTerme(question: QuestionDePaire): ChampAutreTerme {
  const [premier, second] = question.termes;
  return {
    question: TEXTES.remplacerPar(premier.mot, second.mot),
    libelle: TEXTES.termeAEmployer,
    effet: (saisie) => ({ avant: `${premier.mot}, ${second.mot}`, apres: saisie.trim(), detail: TEXTES.rejoindrontAAppliquer(premier.nombre + second.nombre) }),
    reponse: (saisie) => (saisie.trim() === '' ? null : { type: 'autre', terme: saisie.trim() }),
  };
}

/** Ce que la ligne de réussite montre : « avant → après », ou un seul terme, et son détail. */
export interface LigneFaite {
  readonly avant: string;
  readonly separateur: '→' | '≠' | null;
  readonly apres: string | null;
  readonly detail: string;
}

/** La ligne qui remplace la carte une fois `reponse` acceptée ; `null` quand la réponse ne va pas avec la question. */
export function ligneFaite(question: QuestionVue, reponse: Reponse): LigneFaite | null {
  switch (question.type) {
    case 'paire': {
      const [premier, second] = question.termes;
      const mots = `${premier.mot}, ${second.mot}`;
      switch (reponse.type) {
        case 'garder': {
          const garde = question.termes[reponse.rang];
          const remplace = question.termes[reponse.rang === 0 ? 1 : 0];
          return { avant: remplace.mot, separateur: '→', apres: garde.mot, detail: TEXTES.ajouteesAAppliquer(remplace.nombre, 0) };
        }
        case 'autre':
          return { avant: mots, separateur: '→', apres: reponse.terme, detail: TEXTES.ajouteesAAppliquer(premier.nombre + second.nombre, 0) };
        case 'distincts':
          return { avant: premier.mot, separateur: '≠', apres: second.mot, detail: TEXTES.gardesSepares };
        case 'plus-tard':
          return { avant: mots, separateur: null, apres: null, detail: TEXTES.remisAPlusTard };
        default:
          return null;
      }
    }
    case 'ecriture-du-terme':
      switch (reponse.type) {
        case 'corriger':
          return { avant: question.terme.mot, separateur: '→', apres: reponse.mots.join('-'), detail: TEXTES.ajouteesAAppliquer(question.terme.nombre, 0) };
        case 'voulu':
          return { avant: question.terme.mot, separateur: null, apres: null, detail: TEXTES.ecritureGardee };
        case 'plus-tard':
          return { avant: question.terme.mot, separateur: null, apres: null, detail: TEXTES.remisAPlusTard };
        default:
          return null;
      }
    case 'collection':
      switch (reponse.type) {
        case 'collection':
          return reponse.cible === null
            ? { avant: question.nom, separateur: null, apres: null, detail: TEXTES.nomGarde }
            : { avant: question.nom, separateur: '→', apres: reponse.cible, detail: TEXTES.ajouteesAAppliquer(0, 1) };
        case 'plus-tard':
          return { avant: question.nom, separateur: null, apres: null, detail: TEXTES.remisAPlusTard };
        default:
          return null;
      }
  }
}

/** Une ligne de la section « Plus tard » : la proposition de la question, ou son seul terme. */
export interface LigneDeReprise {
  readonly cle: string;
  readonly avant: string;
  readonly apres: string | null;
}

export function ligneDeReprise(question: QuestionVue): LigneDeReprise {
  switch (question.type) {
    case 'paire': {
      const gardee = question.termes[question.propose];
      const remplacee = question.termes[question.propose === 0 ? 1 : 0];
      return { cle: question.cle, avant: remplacee.mot, apres: gardee.mot };
    }
    case 'ecriture-du-terme':
      return { cle: question.cle, avant: question.terme.mot, apres: question.proposition.join('-') };
    case 'collection':
      return { cle: question.cle, avant: question.nom, apres: null };
  }
}

/** La carte d'un refus : le titre, un avant → après quand le conflit en a un, l'explication et le terme UCM qu'un bouton peut écarter. */
export interface BlocDeConflit {
  readonly avant: string | null;
  readonly apres: string | null;
  /** Un texte où les mots entre accents graves s'écrivent en code. */
  readonly explication: string;
  /** Le terme UCM que « Ne pas appliquer … dans ce fichier » écarte ; `null` quand le conflit ne vient pas d'un terme UCM. */
  readonly termeUcm: string | null;
}

export interface CarteDeConflit {
  readonly titre: string;
  readonly blocs: readonly BlocDeConflit[];
}

function blocDeConflit(conflit: ConflitVue): BlocDeConflit {
  switch (conflit.type) {
    case 'contredit-ucm':
      return {
        avant: conflit.remplace,
        apres: conflit.terme,
        // Quand le terme remplacé est lui-même celui d'UCM, UCM ne le remplace par rien.
        explication: conflit.remplace.toLowerCase() === conflit.termeUcm.toLowerCase() ? TEXTES.estUnTermeUcm(conflit.termeUcm) : TEXTES.ucmRemplace(conflit.remplace, conflit.termeUcm),
        termeUcm: conflit.termeUcm,
      };
    case 'deja-remplace':
      return { avant: conflit.remplace, apres: conflit.par, explication: TEXTES.dejaRemplaceExplication(conflit.remplace, conflit.par), termeUcm: null };
    case 'cycle':
      return { avant: null, apres: null, explication: TEXTES.boucleExplication(conflit.termes), termeUcm: null };
  }
}

export function carteDeConflit(conflits: readonly ConflitVue[]): CarteDeConflit {
  const titre = conflits[0]?.type === 'deja-remplace' ? TEXTES.conflitDejaRemplace : conflits[0]?.type === 'cycle' ? TEXTES.conflitDeBoucle : TEXTES.conflitContreditUcm;
  return { titre, blocs: conflits.map(blocDeConflit) };
}

/** Une clé absente de la liste précédente passe après toutes les autres. */
const rangDans = (liste: readonly string[], cle: string): number => {
  const rang = liste.indexOf(cle);
  return rang === -1 ? Number.MAX_SAFE_INTEGER : rang;
};

/**
 * L'ordre des entrées de la liste après un `bilan`. Les questions suivent
 * l'ordre du bilan ; une ligne de réussite reprend la place qu'avait sa carte
 * dans la liste précédente, sans passer devant les questions qui la précédaient.
 */
export function composerLaListe(precedente: readonly string[], questions: readonly string[], lignes: ReadonlySet<string>): string[] {
  const resultat = questions.filter((cle) => !lignes.has(cle));
  const aPlacer = [...lignes].sort((a, b) => rangDans(precedente, a) - rangDans(precedente, b));
  for (const cle of aPlacer) {
    const rang = precedente.indexOf(cle);
    resultat.splice(rang === -1 ? resultat.length : Math.min(rang, resultat.length), 0, cle);
  }
  return resultat;
}
