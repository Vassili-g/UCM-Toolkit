/** Ordonne les lectures et mutations du document ; un refus libère le geste suivant. */
export function creerFileDuDocument(): <T>(geste: () => Promise<T> | T) => Promise<T> {
  let precedente: Promise<unknown> = Promise.resolve();
  return <T>(geste: () => Promise<T> | T): Promise<T> => {
    const resultat = precedente.then(geste);
    precedente = resultat.catch(() => {});
    return resultat;
  };
}
