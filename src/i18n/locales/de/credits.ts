// Machine-drafted de translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/credits';

export default {
  title: 'Credits',
  subtitle: 'Coinline · Vending Machine Simulator',
  opensHint: 'Öffnet im Browser',
  rowA11y: '{name}. {license}',
  sections: {
    help: 'Datenschutz und Hilfe',
    data: 'Daten',
    software: 'Software und Schriften',
  },
  privacy: {
    name: 'Datenschutzerklärung',
    detail: 'Was das Spiel sendet und welche Wahl du hast.',
  },
  support: {
    name: 'Support',
    detail: 'Fragen, Probleme, Käufe wiederherstellen.',
  },
  open: 'Öffnen',
  installId: 'Installations-ID (für Datenanfragen): {id}',
  placesNote: 'Orte stammen aus offenen Kartendaten. Keine Verbindung oder Empfehlung.',
  brandsNote:
    'Alle Produkte und Marken im Spiel sind erfunden. Mit „Melden“ an einem Standort kannst du einen Ort ausblenden.',
  madeBy: 'Gemacht von Coinline.',
  data: {
    osm: 'Kartendaten, Ortsnamen und Gebäudeumrisse.',
    openfreemap: 'Vektorkacheln und Kartenschriften, kostenlos gehostet von OpenFreeMap.',
    openfreemapLicense: 'Freie öffentliche Instanz; Kacheln aus OpenStreetMap-Daten (ODbL)',
    openmaptiles: 'Vektorkachel-Schema der Basiskarte.',
    protomaps:
      'Ortsdaten aus OpenStreetMap über den Protomaps-Planet-Build; optional selbst gehostete Kacheln. Overture Maps Places ist geplant.',
    protomapsLicense: 'Erstellt aus OpenStreetMap-Daten (ODbL)',
    populationName: 'Bevölkerung',
    population: 'Geschätzt aus OpenStreetMap-Gebäuden.',
    met: 'Live-Wetter vom Norwegischen Meteorologischen Institut (api.met.no), ohne Änderungen außer der Umrechnung in Spielbedingungen. Offline nutzt das Spiel Klimamittelwerte.',
    metLicense: 'CC BY 4.0 und NLOD 2.0',
  },
  software: {
    nunito: 'Schriftart.',
    maplibre: 'Kartendarstellung.',
    three: '3D-Nahansichten.',
    h3: 'Sechseckraster.',
    suncalc: 'Sonnenstand für echtes Tageslicht.',
  },
} satisfies Shape<typeof en>;
