// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/picker';

export default {
  title: 'Para onde?',
  subtitle: 'Gire o globo ou escolha uma cidade',
  locate: 'Usar minha localização',
  locateHint: 'Aproximada, pedida uma vez, nunca armazenada',
  here: 'Aqui',
  km: '{n} km',
  nearYou: 'Perto de você',
  bigCities: 'Grandes cidades',
  saved: 'Salva',
  playing: 'Jogando',
  start: 'Começar em {city}',
  go: 'Ir para {city}',
  sell: 'Vender e recomeçar em {city}',
  youreHere: 'Você está jogando aqui',
  none: 'Ainda não há cidade aqui',
  nearest: 'Mais próxima: {city}, {km}',
  flyNearest: 'Ver {city}',
  opening: 'Abrindo {city}…',
  offline: 'Conecte-se à internet uma vez para baixar {city}.',
  failed: 'Não foi possível abrir {city}. Tente de novo.',
  district: '{city} · {dir}',
  dir: {
    n: 'Norte',
    ne: 'Nordeste',
    e: 'Leste',
    se: 'Sudeste',
    s: 'Sul',
    sw: 'Sudoeste',
    w: 'Oeste',
    nw: 'Noroeste',
  },
  a11y: {
    card: '{city}, {km}',
    globe: 'Globo. Arraste para girar, use dois dedos para aproximar.',
  },
} satisfies Shape<typeof en>;
