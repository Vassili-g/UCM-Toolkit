/**
 * L'image d'aperçu des états de galerie : un PNG où chaque calque peint sa
 * boîte. Elle tient la place de l'image que Figma exporte, pour juger la zone
 * d'aperçu et les cadres du survol hors de Figma. Un texte se dessine en
 * bande, à mi-hauteur de sa boîte ; un contour, sur le bord de la sienne.
 */
const zlib = require('zlib');

const TABLE = Array.from({ length: 256 }, (_, rang) => {
  let reste = rang;
  for (let tour = 0; tour < 8; tour += 1) reste = reste & 1 ? 0xedb88320 ^ (reste >>> 1) : reste >>> 1;
  return reste >>> 0;
});

/** Le contrôle de redondance d'un bloc PNG. */
function crc(octets) {
  let reste = 0xffffffff;
  for (const octet of octets) reste = TABLE[(reste ^ octet) & 0xff] ^ (reste >>> 8);
  return (reste ^ 0xffffffff) >>> 0;
}

function bloc(type, donnees) {
  const tete = Buffer.alloc(4);
  tete.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const queue = Buffer.alloc(4);
  queue.writeUInt32BE(crc(corps));
  return Buffer.concat([tete, corps, queue]);
}

/**
 * Le PNG de `largeur` × `hauteur` pixels, transparent, où chaque peinture
 * remplit sa boîte dans l'ordre donné.
 */
function imagePng(largeur, hauteur, peintures) {
  const pixels = Buffer.alloc(largeur * hauteur * 4);
  for (const { boite, hexa, texte, contour } of peintures) {
    const [rouge, vert, bleu] = [1, 3, 5].map((debut) => parseInt(hexa.slice(debut, debut + 2), 16));
    const haut = Math.round(texte ? boite.y + boite.hauteur * 0.3 : boite.y);
    const bas = Math.round(texte ? boite.y + boite.hauteur * 0.7 : boite.y + boite.hauteur);
    const gauche = Math.round(boite.x);
    const droite = Math.round(boite.x + boite.largeur);
    for (let y = Math.max(0, haut); y < Math.min(hauteur, bas); y += 1) {
      for (let x = Math.max(0, gauche); x < Math.min(largeur, droite); x += 1) {
        if (contour && y > haut && y < bas - 1 && x > gauche && x < droite - 1) continue;
        pixels.set([rouge, vert, bleu, 255], (y * largeur + x) * 4);
      }
    }
  }
  const lignes = Buffer.alloc((largeur * 4 + 1) * hauteur);
  for (let y = 0; y < hauteur; y += 1) pixels.copy(lignes, y * (largeur * 4 + 1) + 1, y * largeur * 4, (y + 1) * largeur * 4);
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(largeur, 0);
  entete.writeUInt32BE(hauteur, 4);
  entete.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', entete), bloc('IDAT', zlib.deflateSync(lignes)), bloc('IEND', Buffer.alloc(0))]);
}

module.exports = { imagePng };
