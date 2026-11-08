// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/credits';

export default {
  title: 'Créditos',
  subtitle: 'Coinline · Simulador de Máquina de Venda',
  opensHint: 'Abre no navegador',
  rowA11y: '{name}. {license}',
  sections: {
    help: 'Privacidade e ajuda',
    data: 'Dados',
    software: 'Software e fontes',
  },
  privacy: {
    name: 'Política de privacidade',
    detail: 'O que o jogo envia e as escolhas que você tem.',
  },
  support: {
    name: 'Suporte',
    detail: 'Dúvidas, problemas, restaurar compras.',
  },
  open: 'Abrir',
  installId: 'ID de instalação (para pedidos de dados): {id}',
  placesNote: 'Locais exibidos a partir de dados abertos de mapas. Sem afiliação ou endosso.',
  brandsNote:
    'Todos os produtos e marcas do jogo são inventados. Use "Denunciar este local" num ponto para ocultar um estabelecimento.',
  madeBy: 'Feito pela Coinline.',
  data: {
    osm: 'Dados do mapa, nomes de locais e contornos de prédios.',
    openfreemap:
      'Blocos vetoriais do mapa base e fontes do mapa, hospedados gratuitamente pelo OpenFreeMap.',
    openfreemapLicense: 'Instância pública gratuita; blocos com dados do OpenStreetMap (ODbL)',
    openmaptiles: 'Esquema de blocos vetoriais usado pelo mapa base.',
    protomaps:
      'Dados de locais do OpenStreetMap via a build planetária do Protomaps; opção de blocos auto-hospedados. Overture Maps Places está planejado.',
    protomapsLicense: 'Feito com dados do OpenStreetMap (ODbL)',
    populationName: 'População',
    population: 'Estimada a partir dos prédios do OpenStreetMap.',
    met: 'Clima ao vivo do Instituto Meteorológico Norueguês (api.met.no), sem alterações além da conversão para as condições do jogo. Offline, o jogo usa médias climáticas.',
    metLicense: 'CC BY 4.0 e NLOD 2.0',
    naturalEarth: 'Globo do seletor de cidades (terras, fronteiras, relevo) e países para as bandeiras.',
    timeZones: 'O fuso horário de cada cidade, para a hora local real.',
  },
  software: {
    nunito: 'Fonte tipográfica.',
    maplibre: 'Renderização do mapa.',
    three: 'Closes em 3D.',
    h3: 'Grade hexagonal.',
    suncalc: 'Posição do sol para a luz do dia real.',
  },
} satisfies Shape<typeof en>;
