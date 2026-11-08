// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/companyHub';

export default {
  section: {
    hintOpen: 'このセクションを閉じます',
    hintClosed: 'このセクションを開きます',
  },
  chapter: {
    requirements: 'レベルアップの条件',
    toReach: 'チャプター{n}に進むには',
    rewards: 'このチャプターをクリアすると解放',
    last: '最終チャプター：準備ができたら会社を売却しましょう。',
    stepsHint: '数字をタップするとそのチャプターを表示',
    stepHint: 'このチャプターの目標と解放内容を表示します',
  },
  chapterSheet: {
    title: 'チャプター{n}',
    done: '達成',
    current: '現在',
    locked: 'この先',
    goal: '目標',
    unlocks: '解放',
    unlocked: '解放済み',
    close: '閉じる',
  },
  finances: {
    cash: '現金',
    cashDesc: '手元の資金',
    netToday: '今日の純益',
    netTodayDesc: '今日の収入 − 支出',
    inToday: '今日の収入',
    inTodayDesc: '売上と報酬',
    outToday: '今日の支出',
    outTodayDesc: '仕入れ・家賃・給料など',
    netYesterday: '昨日の純益',
    netYesterdayDesc: '1日分',
    lifetimeSales: '累計売上',
    lifetimeSalesDesc: '開始から',
    lifetimeCosts: '累計コスト',
    lifetimeCostsDesc: '開始から',
    unitsSold: '販売数',
    unitsSoldDesc: '累計',
    breakdown: '今日の内訳',
    noActivity: '今日はまだ動きがありません',
  },
  more: {
    research: '研究',
    rankings: '街のランキング',
    globalRanking: '世界ランキング',
    prestige: 'プレステージ',
    trophies: 'トロフィー',
  },
  trophies: {
    title: 'トロフィー',
    subtitle: '{total}個中{got}個獲得',
    waiting: '未受け取りの報酬',
    claim: '{amount}を受け取る',
    claimed: '{amount}を受け取りました',
  },
} satisfies Shape<typeof en>;
