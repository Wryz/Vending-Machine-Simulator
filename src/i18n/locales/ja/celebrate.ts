// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/celebrate';

export default {
  kind: {
    chapter: '章クリア',
    trophy: 'トロフィー',
    order: '注文達成',
    streak: '全注文達成',
    event: '近くでもうすぐ',
    info: 'お知らせ',
    research: '研究完了',
  },
  modal: {
    title: 'いいお知らせ',
    claim: '{amount}を受け取る',
    ok: 'OK',
    waiting: '報酬が届いています。',
  },
  a11y: '{label}：{title}。タップで閉じる。',
  moment: {
    chapterTitle: '{n}. {title}',
    next: '次：{goal}',
    unlocked: '解放：{unlock}',
    eventTitle: '{place}で{event}',
    startsMin: 'あと{n}分で開始',
    startsHours: 'あと{n}時間で開始',
    orderReady: '注文の報酬を受け取れます',
  },
} satisfies Shape<typeof en>;
