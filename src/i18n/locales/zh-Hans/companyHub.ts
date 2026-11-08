// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/companyHub';

export default {
  section: {
    hintOpen: '收起此部分',
    hintClosed: '展开此部分',
  },
  chapter: {
    requirements: '升级条件',
    toReach: '进入第 {n} 章需要',
    rewards: '完成本章后解锁',
    last: '最后一章：准备好后即可出售公司。',
    stepsHint: '点按数字查看该章',
    stepHint: '显示本章的目标和解锁内容',
  },
  chapterSheet: {
    title: '第 {n} 章',
    done: '完成',
    current: '当前',
    locked: '未到',
    goal: '目标',
    unlocks: '解锁',
    unlocked: '已解锁',
    close: '关闭',
  },
  finances: {
    cash: '现金',
    cashDesc: '手头资金',
    netToday: '今日净额',
    netTodayDesc: '今日收入 − 支出',
    inToday: '今日收入',
    inTodayDesc: '销售和奖励',
    outToday: '今日支出',
    outTodayDesc: '进货、租金、工资…',
    netYesterday: '昨日净额',
    netYesterdayDesc: '全天',
    lifetimeSales: '累计销售',
    lifetimeSalesDesc: '自开始以来',
    lifetimeCosts: '累计成本',
    lifetimeCostsDesc: '自开始以来',
    unitsSold: '售出件数',
    unitsSoldDesc: '累计',
    breakdown: '今日分类明细',
    noActivity: '今天还没有动静',
  },
  more: {
    research: '研究',
    rankings: '城市排名',
    globalRanking: '全球排名',
    prestige: '声望',
    trophies: '奖杯',
  },
  trophies: {
    title: '奖杯',
    subtitle: '已解锁 {got}/{total}',
    waiting: '待领取奖励',
    claim: '领取 {amount}',
    claimed: '已领取 {amount}',
  },
} satisfies Shape<typeof en>;
