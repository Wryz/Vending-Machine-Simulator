// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: 'Instale sua primeira máquina',
      line: 'Ruas movimentadas vendem mais. A tecla da chama mostra onde elas estão, ou deixe a gente escolher um lugar.',
      action: 'Mostre um bom lugar',
      actionHint: 'Encontra um lugar movimentado perto e abre o cartão dele',
    },
    stock: {
      title: 'Encha de lanches',
      line: 'Sua máquina está vazia. Abra e carregue lanches da sua van.',
      action: 'Abrir minha máquina',
      actionHint: 'Abre o cartão da sua máquina',
    },
    delivery: {
      title: 'Sua van está a caminho',
      /** {store} = a real supermarket name from map data. */
      line: 'Ela traz seus lanches de {store}. Veja ela chegar à sua máquina!',
      lineDepot: 'Ela traz seus lanches do seu depósito. Veja ela chegar à sua máquina!',
      action: 'Ver a chegada',
      actionHint: 'Aproxima o mapa da sua máquina',
    },
    wait: {
      title: 'Espere os clientes',
      line: 'Quem passa para e compra. Dê zoom para ver!',
      action: 'Ver minha máquina',
      actionHint: 'Aproxima o mapa da sua máquina',
    },
    collect: {
      title: 'Colete suas moedas',
      line: 'Você vendeu! Abra sua máquina e pegue as moedas.',
      action: 'Abrir minha máquina',
      actionHint: 'Abre o cartão da sua máquina',
    },
    goal: {
      title: 'Sua primeira meta',
      line: 'Venda {amount} para terminar o capítulo 1. O medidor lá em cima acompanha.',
    },
  },
  guide: {
    spotGood: 'Bom lugar! Coloque sua máquina aqui.',
    placeKey: 'Instalar',
    spotQuiet: 'Pouca gente passa aqui. Puxe isto para baixo e tente uma rua mais movimentada.',
    sign: 'Role para baixo e deslize o dedo pela linha para assinar.',
    fill: 'Toque em Encher para carregar lanches da sua van.',
    restock: 'Agora toque em Repor. Uma van traz tudo do mercado mais próximo.',
    onTheWay: 'Sua van está a caminho. Feche isto e veja ela chegar.',
    wait: 'Pronto! Feche isto e veja os clientes chegando.',
    collect: 'Toque em Coletar para pegar suas moedas.',
  },
  tips: {
    keys: {
      title: 'Seu chaveiro',
      line: 'Todas as suas máquinas estão aqui. Toque em uma para ir até ela.',
    },
    routes: {
      title: 'Sua van e motoristas',
      line: 'Uma van maior repõe mais de uma vez. Depois, motoristas fazem as rondas por você.',
    },
    orders: {
      title: 'Pedidos do dia',
      line: 'Três tarefas pequenas por dia valendo bônus. Termine as três para manter a sequência.',
    },
    company: {
      title: 'Sua empresa',
      line: 'Sua meta do capítulo, o dinheiro que entra e sai, e melhorias para todas as máquinas.',
    },
    rankings: {
      title: 'Melhores operadores',
      line: 'Compare suas vendas com as outras empresas de máquinas da cidade.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'Entendi',
    close: 'Fechar o tutorial',
    step: 'Passo {n} de {total}',
  },
} satisfies Shape<typeof en>;
