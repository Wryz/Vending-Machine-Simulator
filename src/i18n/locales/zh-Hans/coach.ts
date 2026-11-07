// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: '放置第一台售货机',
      line: '热闹的街道卖得更多。点火焰键查看，或者让我们帮你挑个地方。',
      action: '帮我找个好地方',
      actionHint: '在附近找一个热闹的地点并打开它的卡片',
    },
    stock: {
      title: '装满零食',
      line: '你的售货机是空的。打开它，从货车里装上零食。',
      action: '打开我的售货机',
      actionHint: '打开售货机的卡片',
    },
    wait: {
      title: '等待顾客',
      line: '路过的人会停下来购买。放大地图看看吧！',
      action: '看看我的售货机',
      actionHint: '把地图放大到你的售货机',
    },
    collect: {
      title: '收取硬币',
      line: '卖出去了！打开售货机把硬币取出来。',
      action: '打开我的售货机',
      actionHint: '打开售货机的卡片',
    },
    goal: {
      title: '你的第一个目标',
      line: '销售额达到 {amount} 即可完成第 1 章。顶部的仪表会显示进度。',
    },
  },
  guide: {
    spotGood: '好地方！把售货机放在这里吧。',
    placeKey: '放置',
    spotQuiet: '这里人很少。把它拉下来，换一条更热闹的街道试试。',
    sign: '向下滚动，用手指沿着横线滑动来签名。',
    fill: '点“装满”，从货车里装上零食。',
    restock: '再点“补货”把它们放进去。',
    wait: '准备好了！关掉这里，看看顾客走过来。',
    collect: '点“收款”取出你的硬币。',
  },
  tips: {
    keys: {
      title: '你的钥匙串',
      line: '你所有的售货机都在这里。点一台就能飞过去。',
    },
    routes: {
      title: '货车和司机',
      line: '更大的货车一次能补更多货。之后司机会替你跑路线。',
    },
    orders: {
      title: '每日订单',
      line: '每天三个小任务，完成可得奖金。三个都完成可累积连续天数。',
    },
    company: {
      title: '你的公司',
      line: '章节目标、收支情况，以及所有售货机的升级。',
    },
    rankings: {
      title: '顶尖运营商',
      line: '看看你的销售额和城里其他售货机公司相比如何。',
    },
  },
  ok: '好',
  a11y: {
    gotIt: '知道了',
    close: '关闭教程',
    step: '第 {n} 步，共 {total} 步',
  },
} satisfies Shape<typeof en>;
