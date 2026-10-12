import type { BodyPart, Equipment, ExerciseType } from '../types';

type Def = [key: string, name: string, bodyPart: BodyPart, equipment: Equipment, type?: ExerciseType];

/**
 * 内置动作库。只能在末尾追加新动作，不要调整已有顺序或修改 key，
 * 否则已有用户数据中的动作编号会对不上。
 */
export const BUILTIN_EXERCISES: Def[] = [
  // 胸部
  ['bench_press', '杠铃卧推', 'chest', 'barbell'],
  ['incline_bench_press', '上斜杠铃卧推', 'chest', 'barbell'],
  ['decline_bench_press', '下斜杠铃卧推', 'chest', 'barbell'],
  ['db_bench_press', '哑铃卧推', 'chest', 'dumbbell'],
  ['incline_db_press', '上斜哑铃卧推', 'chest', 'dumbbell'],
  ['decline_db_press', '下斜哑铃卧推', 'chest', 'dumbbell'],
  ['db_fly', '哑铃飞鸟', 'chest', 'dumbbell'],
  ['incline_db_fly', '上斜哑铃飞鸟', 'chest', 'dumbbell'],
  ['smith_bench_press', '史密斯卧推', 'chest', 'smith'],
  ['smith_incline_press', '史密斯上斜卧推', 'chest', 'smith'],
  ['machine_chest_press', '坐姿器械推胸', 'chest', 'machine'],
  ['incline_machine_press', '上斜器械推胸', 'chest', 'machine'],
  ['pec_deck', '蝴蝶机夹胸', 'chest', 'machine'],
  ['cable_crossover', '龙门架绳索夹胸', 'chest', 'cable'],
  ['low_cable_fly', '低位绳索夹胸', 'chest', 'cable'],
  ['chest_dip', '双杠臂屈伸', 'chest', 'bodyweight', 'reps'],
  ['push_up', '俯卧撑', 'chest', 'bodyweight', 'reps'],
  ['db_pullover', '哑铃仰卧上拉', 'chest', 'dumbbell'],

  // 背部
  ['pull_up', '引体向上', 'back', 'bodyweight', 'reps'],
  ['chin_up', '反手引体向上', 'back', 'bodyweight', 'reps'],
  ['weighted_pull_up', '负重引体向上', 'back', 'bodyweight'],
  ['assisted_pull_up', '器械辅助引体向上', 'back', 'machine'],
  ['lat_pulldown', '高位下拉', 'back', 'cable'],
  ['close_grip_pulldown', '窄握高位下拉', 'back', 'cable'],
  ['seated_cable_row', '坐姿绳索划船', 'back', 'cable'],
  ['barbell_row', '杠铃俯身划船', 'back', 'barbell'],
  ['one_arm_db_row', '单臂哑铃划船', 'back', 'dumbbell'],
  ['t_bar_row', 'T杠划船', 'back', 'barbell'],
  ['machine_row', '坐姿器械划船', 'back', 'machine'],
  ['deadlift', '硬拉', 'back', 'barbell'],
  ['straight_arm_pulldown', '绳索直臂下压', 'back', 'cable'],
  ['back_extension', '山羊挺身', 'back', 'bodyweight', 'reps'],
  ['inverted_row', '澳式引体（反向划船）', 'back', 'bodyweight', 'reps'],

  // 肩部
  ['overhead_press', '站姿杠铃推举', 'shoulders', 'barbell'],
  ['seated_db_press', '坐姿哑铃推举', 'shoulders', 'dumbbell'],
  ['arnold_press', '阿诺德推举', 'shoulders', 'dumbbell'],
  ['machine_shoulder_press', '器械推肩', 'shoulders', 'machine'],
  ['smith_shoulder_press', '史密斯推肩', 'shoulders', 'smith'],
  ['lateral_raise', '哑铃侧平举', 'shoulders', 'dumbbell'],
  ['cable_lateral_raise', '绳索侧平举', 'shoulders', 'cable'],
  ['machine_lateral_raise', '器械侧平举', 'shoulders', 'machine'],
  ['front_raise', '哑铃前平举', 'shoulders', 'dumbbell'],
  ['rear_delt_fly', '俯身哑铃飞鸟', 'shoulders', 'dumbbell'],
  ['reverse_pec_deck', '反向蝴蝶机', 'shoulders', 'machine'],
  ['face_pull', '绳索面拉', 'shoulders', 'cable'],
  ['upright_row', '杠铃直立划船', 'shoulders', 'barbell'],
  ['barbell_shrug', '杠铃耸肩', 'shoulders', 'barbell'],
  ['db_shrug', '哑铃耸肩', 'shoulders', 'dumbbell'],

  // 腿部
  ['squat', '杠铃深蹲', 'legs', 'barbell'],
  ['front_squat', '杠铃前蹲', 'legs', 'barbell'],
  ['smith_squat', '史密斯深蹲', 'legs', 'smith'],
  ['goblet_squat', '高脚杯深蹲', 'legs', 'dumbbell'],
  ['hack_squat', '哈克深蹲', 'legs', 'machine'],
  ['leg_press', '腿举（倒蹬）', 'legs', 'machine'],
  ['bulgarian_split_squat', '保加利亚分腿蹲', 'legs', 'dumbbell'],
  ['lunge', '哑铃箭步蹲', 'legs', 'dumbbell'],
  ['leg_extension', '坐姿腿屈伸', 'legs', 'machine'],
  ['lying_leg_curl', '俯卧腿弯举', 'legs', 'machine'],
  ['seated_leg_curl', '坐姿腿弯举', 'legs', 'machine'],
  ['romanian_deadlift', '罗马尼亚硬拉', 'legs', 'barbell'],
  ['db_romanian_deadlift', '哑铃罗马尼亚硬拉', 'legs', 'dumbbell'],
  ['sumo_deadlift', '相扑硬拉', 'legs', 'barbell'],
  ['good_morning', '杠铃早安式', 'legs', 'barbell'],
  ['standing_calf_raise', '站姿提踵', 'legs', 'machine'],
  ['seated_calf_raise', '坐姿提踵', 'legs', 'machine'],
  ['hip_adduction', '器械髋内收', 'legs', 'machine'],
  ['bodyweight_squat', '徒手深蹲', 'legs', 'bodyweight', 'reps'],

  // 臀部
  ['hip_thrust', '杠铃臀推', 'glutes', 'barbell'],
  ['machine_hip_thrust', '器械臀推', 'glutes', 'machine'],
  ['glute_bridge', '臀桥', 'glutes', 'bodyweight', 'reps'],
  ['cable_kickback', '绳索后踢腿', 'glutes', 'cable'],
  ['hip_abduction', '器械髋外展', 'glutes', 'machine'],
  ['band_walk', '弹力带侧向走', 'glutes', 'band', 'reps'],

  // 二头
  ['barbell_curl', '杠铃弯举', 'biceps', 'barbell'],
  ['ez_bar_curl', '曲杆弯举', 'biceps', 'barbell'],
  ['db_curl', '哑铃弯举', 'biceps', 'dumbbell'],
  ['hammer_curl', '锤式弯举', 'biceps', 'dumbbell'],
  ['incline_db_curl', '上斜哑铃弯举', 'biceps', 'dumbbell'],
  ['concentration_curl', '集中弯举', 'biceps', 'dumbbell'],
  ['preacher_curl', '牧师凳弯举', 'biceps', 'barbell'],
  ['cable_curl', '绳索弯举', 'biceps', 'cable'],
  ['machine_curl', '器械弯举', 'biceps', 'machine'],

  // 三头
  ['triceps_pushdown', '绳索下压', 'triceps', 'cable'],
  ['overhead_cable_extension', '绳索过头臂屈伸', 'triceps', 'cable'],
  ['skull_crusher', '杠铃仰卧臂屈伸', 'triceps', 'barbell'],
  ['db_overhead_extension', '哑铃颈后臂屈伸', 'triceps', 'dumbbell'],
  ['close_grip_bench', '窄距卧推', 'triceps', 'barbell'],
  ['bench_dip', '凳上臂屈伸', 'triceps', 'bodyweight', 'reps'],
  ['db_kickback', '哑铃俯身臂屈伸', 'triceps', 'dumbbell'],
  ['machine_dip', '器械臂屈伸', 'triceps', 'machine'],
  ['diamond_push_up', '钻石俯卧撑', 'triceps', 'bodyweight', 'reps'],

  // 核心
  ['crunch', '卷腹', 'core', 'bodyweight', 'reps'],
  ['plank', '平板支撑', 'core', 'bodyweight', 'time'],
  ['side_plank', '侧平板支撑', 'core', 'bodyweight', 'time'],
  ['hanging_leg_raise', '悬垂举腿', 'core', 'bodyweight', 'reps'],
  ['lying_leg_raise', '仰卧举腿', 'core', 'bodyweight', 'reps'],
  ['russian_twist', '俄罗斯转体', 'core', 'bodyweight', 'reps'],
  ['ab_wheel', '健腹轮', 'core', 'other', 'reps'],
  ['cable_crunch', '绳索卷腹', 'core', 'cable'],
  ['machine_crunch', '器械卷腹', 'core', 'machine'],
  ['dead_bug', '死虫式', 'core', 'bodyweight', 'reps'],
  ['sit_up', '仰卧起坐', 'core', 'bodyweight', 'reps'],
  ['v_up', 'V字两头起', 'core', 'bodyweight', 'reps'],
  ['bicycle_crunch', '空中自行车', 'core', 'bodyweight', 'reps'],
  ['mountain_climber', '登山跑', 'core', 'bodyweight', 'time'],

  // 有氧
  ['treadmill', '跑步机', 'cardio', 'machine', 'distance_time'],
  ['outdoor_run', '户外跑步', 'cardio', 'other', 'distance_time'],
  ['elliptical', '椭圆机', 'cardio', 'machine', 'distance_time'],
  ['stationary_bike', '动感单车', 'cardio', 'machine', 'distance_time'],
  ['rowing_machine', '划船机', 'cardio', 'machine', 'distance_time'],
  ['stair_climber', '爬楼机', 'cardio', 'machine', 'time'],
  ['jump_rope', '跳绳', 'cardio', 'other', 'time'],
  ['swimming', '游泳', 'cardio', 'other', 'distance_time'],
  ['brisk_walk', '快走', 'cardio', 'other', 'distance_time'],
  ['cycling', '户外骑行', 'cardio', 'other', 'distance_time'],
  ['hiit', 'HIIT 间歇训练', 'cardio', 'bodyweight', 'time'],
  ['jumping_jack', '开合跳', 'cardio', 'bodyweight', 'reps'],

  // 全身 / 其他
  ['kettlebell_swing', '壶铃摇摆', 'other', 'kettlebell'],
  ['power_clean', '杠铃高翻', 'other', 'barbell'],
  ['thruster', '杠铃火箭推', 'other', 'barbell'],
  ['turkish_get_up', '土耳其起立', 'other', 'kettlebell'],
  ['burpee', '波比跳', 'other', 'bodyweight', 'reps'],
  ['battle_rope', '战绳', 'other', 'other', 'time'],
  ['dead_hang', '悬垂', 'other', 'bodyweight', 'time'],
  ['wrist_curl', '杠铃腕弯举', 'other', 'barbell'],
];

type TemplateDef = { name: string; notes?: string; items: [key: string, sets: number, reps?: number, duration?: number][] };

export const BUILTIN_TEMPLATES: TemplateDef[] = [
  {
    name: '推 · 胸肩三头',
    notes: '示例计划，可以随意修改或删除',
    items: [
      ['bench_press', 4, 8],
      ['incline_db_press', 3, 10],
      ['seated_db_press', 3, 10],
      ['lateral_raise', 4, 12],
      ['triceps_pushdown', 3, 12],
    ],
  },
  {
    name: '拉 · 背二头',
    notes: '示例计划，可以随意修改或删除',
    items: [
      ['pull_up', 4, 8],
      ['barbell_row', 4, 8],
      ['lat_pulldown', 3, 10],
      ['seated_cable_row', 3, 12],
      ['barbell_curl', 3, 10],
      ['hammer_curl', 3, 12],
    ],
  },
  {
    name: '腿 · 腿臀',
    notes: '示例计划，可以随意修改或删除',
    items: [
      ['squat', 4, 8],
      ['romanian_deadlift', 3, 10],
      ['leg_press', 3, 12],
      ['leg_extension', 3, 12],
      ['lying_leg_curl', 3, 12],
      ['standing_calf_raise', 4, 15],
    ],
  },
  {
    name: '新手全身训练',
    notes: '适合刚开始健身，每周 2~3 次',
    items: [
      ['goblet_squat', 3, 12],
      ['db_bench_press', 3, 10],
      ['lat_pulldown', 3, 12],
      ['seated_db_press', 3, 10],
      ['plank', 3, undefined, 60],
    ],
  },
];
