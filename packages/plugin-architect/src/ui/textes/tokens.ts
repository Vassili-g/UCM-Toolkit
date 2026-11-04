/** Les libellés propres au classement des constats du mode Tokens : l'onglet Constats, son sommaire et ses sections. */
const pluriel = (nombre: number): string => (nombre > 1 ? 's' : '');

export const TEXTES_TOKENS = {
  categorieNoms: 'Noms',
  ongletConstats: 'Constats',
  /** Le nom de l'onglet pour la technologie d'assistance, avec son compte. */
  nomDeLOngletConstats: (nombre: number): string => `Constats, ${nombre} constat${pluriel(nombre)}`,
  etiquetteDuSommaire: 'Catégories de constats',
  tout: 'Tout',
  questions: 'Questions',
  nomDeLaPuce: (libelle: string, nombre: number): string => `${libelle}, ${nombre} constat${pluriel(nombre)}`,
  nomDeLaPuceDesQuestions: (libelle: string, nombre: number): string => `${libelle}, ${nombre} question${pluriel(nombre)}`,
  nomDeLaBande: (libelle: string, nombre: number): string => `${libelle}, ${nombre} constat${pluriel(nombre)}`,
  nomDeLaBandeDesQuestions: (libelle: string, nombre: number): string => `${libelle}, ${nombre} question${pluriel(nombre)}`,
};
