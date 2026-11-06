// Machine-drafted fr translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/credits';

export default {
  title: 'Crédits',
  subtitle: 'Coinline · Vending Machine Simulator',
  opensHint: 'S’ouvre dans ton navigateur',
  rowA11y: '{name}. {license}',
  sections: {
    help: 'Confidentialité et aide',
    data: 'Données',
    software: 'Logiciels et polices',
  },
  privacy: {
    name: 'Politique de confidentialité',
    detail: 'Ce que le jeu envoie et les choix que tu as.',
  },
  support: {
    name: 'Assistance',
    detail: 'Questions, problèmes, restauration des achats.',
  },
  open: 'Ouvrir',
  installId: 'ID d’installation (pour les demandes de données) : {id}',
  placesNote: 'Lieux issus de données cartographiques ouvertes. Aucune affiliation ni approbation.',
  brandsNote:
    'Tous les produits et marques du jeu sont inventés. Utilise « Signaler ce lieu » sur un emplacement pour masquer un lieu.',
  madeBy: 'Créé par Coinline.',
  data: {
    osm: 'Données cartographiques, noms de lieux et emprises des bâtiments.',
    openfreemap:
      'Tuiles vectorielles du fond de carte et polices, hébergées gratuitement par OpenFreeMap.',
    openfreemapLicense:
      'Instance publique gratuite ; tuiles issues des données OpenStreetMap (ODbL)',
    openmaptiles: 'Schéma de tuiles vectorielles utilisé par le fond de carte.',
    protomaps:
      'Données de lieux d’OpenStreetMap via le build planétaire Protomaps ; option de tuiles auto-hébergées. Overture Maps Places est prévu.',
    protomapsLicense: 'Construit à partir des données OpenStreetMap (ODbL)',
    populationName: 'Population',
    population: 'Estimée à partir des bâtiments OpenStreetMap.',
    met: 'Météo en direct de l’Institut météorologique norvégien (api.met.no), sans autre modification que la conversion en conditions de jeu. Hors ligne, le jeu utilise les normales climatiques.',
    metLicense: 'CC BY 4.0 et NLOD 2.0',
  },
  software: {
    nunito: 'Police de caractères.',
    maplibre: 'Rendu de la carte.',
    three: 'Gros plans en 3D.',
    h3: 'Grille hexagonale.',
    suncalc: 'Position du soleil pour une vraie lumière du jour.',
  },
} satisfies Shape<typeof en>;
