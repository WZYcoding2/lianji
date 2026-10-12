import type { BodyPart, Equipment, ExerciseType, SetKind } from '../types';

export const BODY_PARTS: { id: BodyPart; label: string; short: string; color: string }[] = [
  { id: 'chest', label: '胸部', short: '胸', color: '#FF5A5F' },
  { id: 'back', label: '背部', short: '背', color: '#3A86FF' },
  { id: 'shoulders', label: '肩部', short: '肩', color: '#F5A300' },
  { id: 'legs', label: '腿部', short: '腿', color: '#4CB944' },
  { id: 'glutes', label: '臀部', short: '臀', color: '#FF5FA2' },
  { id: 'biceps', label: '二头', short: '二', color: '#7B61FF' },
  { id: 'triceps', label: '三头', short: '三', color: '#00A8CC' },
  { id: 'core', label: '核心', short: '核', color: '#FF8A00' },
  { id: 'cardio', label: '有氧', short: '氧', color: '#13B987' },
  { id: 'other', label: '全身/其他', short: '全', color: '#A55EEA' },
];

export const BODY_PART_MAP = Object.fromEntries(BODY_PARTS.map((b) => [b.id, b])) as Record<
  BodyPart,
  (typeof BODY_PARTS)[number]
>;

export const EQUIPMENTS: { id: Equipment; label: string }[] = [
  { id: 'barbell', label: '杠铃' },
  { id: 'dumbbell', label: '哑铃' },
  { id: 'machine', label: '器械' },
  { id: 'cable', label: '绳索' },
  { id: 'smith', label: '史密斯' },
  { id: 'bodyweight', label: '自重' },
  { id: 'kettlebell', label: '壶铃' },
  { id: 'band', label: '弹力带' },
  { id: 'other', label: '其他' },
];

export const EQUIPMENT_MAP = Object.fromEntries(EQUIPMENTS.map((e) => [e.id, e.label])) as Record<
  Equipment,
  string
>;

export const EXERCISE_TYPES: { id: ExerciseType; label: string; desc: string }[] = [
  { id: 'weight_reps', label: '重量 × 次数', desc: '如卧推、深蹲' },
  { id: 'reps', label: '次数', desc: '如引体向上、俯卧撑' },
  { id: 'time', label: '时长', desc: '如平板支撑、跳绳' },
  { id: 'distance_time', label: '距离 + 时长', desc: '如跑步、骑行' },
];

export const EXERCISE_TYPE_MAP = Object.fromEntries(EXERCISE_TYPES.map((t) => [t.id, t.label])) as Record<
  ExerciseType,
  string
>;

export const SET_KINDS: { id: SetKind; label: string; badge: string; color: string }[] = [
  { id: 'normal', label: '正式组', badge: '', color: '' },
  { id: 'warmup', label: '热身组', badge: '热', color: '#F5A300' },
  { id: 'drop', label: '递减组', badge: '递', color: '#7B61FF' },
  { id: 'failure', label: '力竭组', badge: '竭', color: '#FF3B30' },
];

export const SET_KIND_MAP = Object.fromEntries(SET_KINDS.map((k) => [k.id, k])) as Record<
  SetKind,
  (typeof SET_KINDS)[number]
>;

export const ACCENTS: { id: string; label: string; color: string; on: string }[] = [
  { id: 'orange', label: '活力橙', color: '#FF6B2C', on: '#FFFFFF' },
  { id: 'green', label: '薄荷绿', color: '#22C55E', on: '#FFFFFF' },
  { id: 'blue', label: '天空蓝', color: '#0A84FF', on: '#FFFFFF' },
  { id: 'purple', label: '星空紫', color: '#8B5CF6', on: '#FFFFFF' },
  { id: 'pink', label: '樱花粉', color: '#FF2D78', on: '#FFFFFF' },
  { id: 'lime', label: '荧光黄', color: '#C6F000', on: '#111111' },
];

export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
