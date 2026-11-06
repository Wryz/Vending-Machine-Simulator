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
  },
  footer: '切换前会先保存当前生意。完成第 5 章即可出售公司，并带着优势在任意城市重新开始。',
  opening: '正在打开城市……',
} satisfies Shape<typeof en>;
