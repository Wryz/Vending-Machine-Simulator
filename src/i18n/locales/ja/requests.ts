// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/requests';

export default {
  reason: {
    thirsty: '{place}で食べたばかり。のどカラカラ！',
    studying: '{place}で夜まで勉強。エネルギー補給！',
    dorm: '{place}の寮で日用品が切れた。',
    charging: '{place}の近くでスマホの電池が切れそう！',
    afterSchool: '{place}の放課後。おやつタイム！',
    workout: '{place}でトレーニングしてきた。',
    deadline: '{place}で大事な締め切り。',
    visiting: '{place}にお見舞い中。',
    patient: '{place}の帰り。具合がよくない。',
    travel: '{place}で移動中。',
    game: '{place}で試合の日！',
    sunny: '{place}で日差しの中。',
    lateNight: '{place}で長い夜…',
    sweetTooth: '{place}のあと、甘いものが欲しい。',
    shopping: '{place}で買い物の休憩。',
    forgot: '{place}に忘れてきた！',
    home: '家からちょっと出てきた。',
  },
  card: {
    label: 'お客さんのリクエスト',
    title: '{product}がほしい',
    load: '入れる',
    loaded: '次は「補充」をタップ',
    waiting: 'あと{time}',
    tip: 'チップ {amount}',
    otherMachine: 'この自販機では売れません。{m}m以内に「{type}」を設置しよう。',
    locked: '第{n}章で解放。',
  },
  served: {
    label: 'リクエスト達成',
    title: '{venue}で{product}',
    subtitle: '売れて、チップももらえた',
  },
  a11y: {
    bubble: 'お客さんのリクエスト：{product}。タップで自販機を開きます。',
  },
} satisfies Shape<typeof en>;
