// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/cities';

export default {
  title: '城市',
  subtitle: '每座城市各有一份独立的生意',
  section: {
    current: '当前城市',
    area: '你的所在地',
    cities: '城市',
  },
  chapterMachines: {
    one: '第 {chapter} 章 · {n} 台售货机',
    other: '第 {chapter} 章 · {n} 台售货机',
  },
  label: {
    saved: '已存档',
    current: '当前',
    newSave: '新存档',
  },
  a11y: {
    row: '{name}，当地时间 {time}，{label}',
    switchHint: '切换到这座城市',
  },
  openFailed: '无法打开这座城市。',
  confirm: {
    startTitle: '在{name}开始？',
    goTitle: '前往{name}？',
    startBody: '开一份新生意，使用新存档。你在{current}的进度会保留。',
    goBody: '会先保存你在{current}的进度。',
    thisCity: '这座城市',
    cancel: '取消',
    start: '开始',
    go: '前往',
    branchTitle: '在{name}开分店?',
    branchBody: '公司的资金、章节和研究都会带过去,你不在时{current}照常营业。',
    branch: '开分店',
    lockedTitle: '第 {n} 章开放分店',
    lockedBody: '从第 {n} 章起,你开的每座城市都是同一家公司的分店。在此之前,{name}会是资金独立的另一门生意。',
    separate: '单独开始',
    farTitle: '{name}在第 {n} 章开放',
    farBody: '公司从总部城市向外扩张:先是你的州或省,然后是国家、地区、大洲,最后是全世界。',
    fullTitle: '目前最多 {count} 座城市',
    fullBody: '你的公司可经营 {count} 座城市。下一章可开更多。',
  },
  footer:
    '切换时会先保存这座城市。从第 3 章起,你的城市都是同一家公司的分店,共享资金和进度。',
  opening: '正在打开城市……',
} satisfies Shape<typeof en>;
