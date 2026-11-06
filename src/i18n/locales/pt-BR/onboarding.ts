// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/onboarding';

export default {
  coldOpen: {
    subtitle: 'Simulador de Máquina de Venda',
    clockA11y: '{city}, {time}',
    tagline: 'Uma máquina usada. $250. Uma cidade inteira.',
    insertCoin: 'Inserir moeda',
    insertCoinHint: 'Comece seu negócio de máquinas',
  },
  intro: {
    title: 'Como funciona',
    streetsTitle: 'Ruas reais',
    streetsLine:
      'Instale máquinas de venda em lugares reais de cidades reais, por onde as pessoas passam de verdade.',
    stockTitle: 'Abasteça, preço, colete',
    stockLine:
      'Encha suas máquinas, defina preços justos e veja os clientes chegando para comprar.',
    empireTitle: 'Do bico ao império',
    empireLine: 'Cresça de uma máquina usada para vans, motoristas e uma cidade inteira.',
    next: 'Próximo',
    letsGo: 'Bora!',
    skip: 'Pular',
  },
  location: {
    title: 'Onde começar?',
    nearTitle: 'Você está perto de {city}',
    nearBody: 'Monte seu negócio nas ruas ao seu redor.',
    farTitle: 'Sua região ainda não está no mapa',
    farBody: 'A cidade mais próxima é {city}, a {km} km. Mais cidades em breve.',
    offTitle: 'Localização desativada para o Coinline',
    offBody: 'Ative a localização nos Ajustes ou escolha uma cidade você mesmo.',
    startTitle: 'Comece perto de você',
    approxLabel: 'Só localização aproximada',
    approxValue: '~1 km',
    notStoredLabel: 'Sua localização nunca é salva',
    notStoredValue: 'Não salva',
    onceLabel: 'Usada uma vez, para escolher a cidade',
    onceValue: 'Uma vez',
    startIn: 'Começar em {city}',
    openSettings: 'Abrir Ajustes',
    useMyLocation: 'Usar minha localização',
    useMyLocationHint:
      'Usa sua localização aproximada uma vez para achar a cidade mais próxima. Ela nunca é salva.',
    exploreCities: 'Explorar cidades',
    notFound: 'Não conseguimos achar sua localização agora. Escolha uma cidade para começar.',
    yourArea: 'Sua região',
    loadFailed: 'Não foi possível carregar essa cidade.',
  },
  preview: {
    subtitle: 'Prévia',
    localTime: 'Hora local real',
    hasBusiness: 'Você tem um negócio aqui',
    freshStart: 'Um novo começo',
    saved: 'Salvo',
    new: 'Novo',
    switchNote:
      'Você pode trocar de cidade quando quiser pelo mapa. Cada cidade tem seu próprio negócio.',
    continueIn: 'Continuar em {city}',
    startIn: 'Começar em {city}',
    back: 'Voltar às cidades',
  },
  picker: {
    title: 'Explorar cidades',
    subtitle: 'Toque numa cidade para dar uma olhada',
    rowA11y: '{city}, hora local {time}',
    rowA11ySaved: '{city}, hora local {time}, salvo',
    rowHint: 'Ver prévia desta cidade',
    saved: 'Salvo',
  },
} satisfies Shape<typeof en>;
