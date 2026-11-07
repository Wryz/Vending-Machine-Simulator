// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: '最初の自販機を設置',
      line: '人通りの多い道ほどよく売れます。炎のキーで確認するか、おすすめの場所を選んでもらいましょう。',
      action: 'いい場所を教えて',
      actionHint: '近くのにぎやかな場所を探してカードを開きます',
    },
    stock: {
      title: 'お菓子を入れよう',
      line: '自販機は空っぽです。開いてバンから商品を入れましょう。',
      action: '自販機を開く',
      actionHint: '自販機のカードを開きます',
    },
    delivery: {
      title: 'バンが向かっています',
      /** {store} = a warehouse or wholesaler name from map data. */
      line: '{store}からお菓子を運んでいます。自販機まで走るのを見てみよう！',
      lineDepot: '倉庫からお菓子を運んでいます。自販機まで走るのを見てみよう！',
      action: '到着を見る',
      actionHint: '地図を自販機にズーム',
    },
    wait: {
      title: 'お客さんを待とう',
      line: '通りかかった人が立ち止まって買っていきます。ズームして見てみよう！',
      action: '自販機を見る',
      actionHint: '地図を自販機にズームします',
    },
    collect: {
      title: 'コインを回収しよう',
      line: '売れました！自販機を開いてコインを取り出しましょう。',
      action: '自販機を開く',
      actionHint: '自販機のカードを開きます',
    },
    goal: {
      title: '最初の目標',
      line: '売上 {amount} で第1章クリア。上のメーターで進み具合がわかります。',
    },
  },
  guide: {
    spotGood: 'いい場所です！ここに自販機を置きましょう。',
    placeKey: '設置',
    spotQuiet: 'ここは人通りが少ないです。これを下げて、もっとにぎやかな道を選びましょう。',
    sign: '下にスクロールして、線に沿って指をすべらせてサインします。',
    fill: '「満タン」をタップしてバンから商品を積みます。',
    restock: '次に「補充」をタップ。一番近い倉庫からバンが運びます。',
    onTheWay: 'バンが向かっています。閉じて、走ってくるのを見よう。',
    wait: '準備OK！閉じて、お客さんが来るのを見てみよう。',
    collect: '「回収」をタップしてコインを取り出します。',
  },
  tips: {
    keys: {
      title: 'キーリング',
      line: '持っている自販機がすべてここに。タップするとその場所へ飛びます。',
    },
    routes: {
      title: 'バンとドライバー',
      line: '大きなバンなら一度にたくさん補充できます。あとでドライバーが巡回してくれます。',
    },
    orders: {
      title: '今日の注文',
      line: '1日3つの小さな仕事でボーナス。3つすべて達成で連続記録に。',
    },
    company: {
      title: 'あなたの会社',
      line: '章の目標、お金の出入り、すべての自販機のアップグレード。',
    },
    rankings: {
      title: 'トップ事業者',
      line: '街のほかの自販機会社と売上を比べてみよう。',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: 'わかった',
    close: 'チュートリアルを閉じる',
    step: 'ステップ {n}/{total}',
  },
} satisfies Shape<typeof en>;
