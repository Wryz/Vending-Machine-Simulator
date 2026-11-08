// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/credits';

export default {
  title: 'Créditos',
  subtitle: 'Coinline · Simulador de máquinas expendedoras',
  opensHint: 'Se abre en tu navegador',
  rowA11y: '{name}. {license}',
  sections: {
    help: 'Privacidad y ayuda',
    data: 'Datos',
    software: 'Software y fuentes',
  },
  privacy: {
    name: 'Política de privacidad',
    detail: 'Qué envía el juego y qué opciones tienes.',
  },
  support: {
    name: 'Soporte',
    detail: 'Preguntas, problemas, restaurar compras.',
  },
  open: 'Abrir',
  installId: 'ID de instalación (para solicitudes de datos): {id}',
  placesNote: 'Lugares de datos de mapas abiertos. Sin afiliación ni respaldo.',
  brandsNote:
    'Todos los productos y marcas del juego son inventados. Usa «Reportar este lugar» en un sitio para ocultarlo.',
  madeBy: 'Hecho por Coinline.',
  data: {
    osm: 'Datos del mapa, nombres de lugares y contornos de edificios.',
    openfreemap:
      'Teselas vectoriales del mapa base y fuentes del mapa, alojadas gratis por OpenFreeMap.',
    openfreemapLicense: 'Instancia pública gratuita; teselas con datos de OpenStreetMap (ODbL)',
    openmaptiles: 'Esquema de teselas vectoriales del mapa base.',
    protomaps:
      'Datos de lugares de OpenStreetMap mediante la compilación planetaria de Protomaps; opción de teselas propias. Se prevé usar Overture Maps Places.',
    protomapsLicense: 'Creado con datos de OpenStreetMap (ODbL)',
    populationName: 'Población',
    population: 'Estimada a partir de los edificios de OpenStreetMap.',
    met: 'Clima en vivo del Instituto Meteorológico de Noruega (api.met.no), sin más cambios que adaptarlo a las condiciones del juego. Sin conexión, el juego usa promedios climáticos.',
    metLicense: 'CC BY 4.0 y NLOD 2.0',
    naturalEarth: 'Países para las banderas del selector de ciudades.',
    timeZones: 'La zona horaria de cada ciudad, para su hora local real.',
  },
  software: {
    nunito: 'Tipografía.',
    maplibre: 'Renderizado del mapa.',
    three: 'Vistas 3D de cerca.',
    h3: 'Cuadrícula hexagonal.',
    suncalc: 'Posición del sol para la luz real.',
  },
} satisfies Shape<typeof en>;
