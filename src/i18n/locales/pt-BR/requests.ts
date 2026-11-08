// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/requests';

export default {
  reason: {
    thirsty: 'Acabei de comer no {place}. Que sede!',
    studying: 'Estudando até tarde no {place}. Preciso de energia!',
    dorm: 'Acabou o básico no alojamento perto do {place}.',
    charging: 'Celular morrendo perto do {place}!',
    afterSchool: 'Saída da escola no {place}. Hora do lanche!',
    workout: 'Acabei de treinar no {place}.',
    deadline: 'Prazo grande no {place}.',
    visiting: 'Visitando alguém no {place}.',
    patient: 'Acabei de sair do {place}. Não estou bem.',
    travel: 'De passagem pelo {place}.',
    game: 'Dia de jogo no {place}!',
    sunny: 'No sol no {place}.',
    lateNight: 'Noite longa no {place}…',
    sweetTooth: 'Vontade de doce depois do {place}.',
    shopping: 'Pausa nas compras do {place}.',
    forgot: 'Esqueci o meu no {place}!',
    home: 'Dando uma saidinha de casa.',
  },
  card: {
    label: 'Pedido de cliente',
    title: 'Quer {product}',
    load: 'Adicionar à reposição',
    planned: 'No seu plano de reposição. Peça para enviar uma van.',
    order: 'Pedir reposição · {cost}',
    coming: 'Aguardando entrega · cerca de {time}',
    comingNote: 'Compram assim que a van chegar.',
    vanBusy: 'Já tem uma van a caminho. Adicione quando ela chegar.',
    dismiss: 'Dispensar pedido',
    waiting: 'Espera {time}',
    tip: 'Gorjeta {amount}',
    otherMachine: 'Esta máquina não pode vender isso. Instale uma “{type}” a até {m} m.',
    locked: 'Abre no capítulo {n}.',
  },
  served: {
    label: 'Pedido atendido',
    title: '{product} em {venue}',
    subtitle: 'Vendido, com gorjeta',
  },
  a11y: {
    bubble: 'Pedido de cliente: {product}. Toque para abrir a máquina.',
  },
} satisfies Shape<typeof en>;
