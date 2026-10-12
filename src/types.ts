export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'legs'
  | 'glutes'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'cardio'
  | 'other';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'smith'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

/** 记录方式：重量×次数 / 仅次数 / 时长 / 距离+时长 */
export type ExerciseType = 'weight_reps' | 'reps' | 'time' | 'distance_time';

/** 组类型：正式组 / 热身组 / 递减组 / 力竭组 */
export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';

export interface Exercise {
  id?: number;
  /** 内置动作的稳定标识，自定义动作没有 */
  key?: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  type: ExerciseType;
  custom?: boolean;
  hidden?: boolean;
  notes?: string;
  createdAt: number;
}

/** 重量统一以 kg 存储，时长以秒存储，距离以 km 存储 */
export interface SetValues {
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
}

export interface WorkoutSet extends SetValues {
  uid: string;
  kind: SetKind;
  done: boolean;
  /** 来自计划的目标值，作为输入框提示 */
  target?: SetValues;
}

export interface WorkoutExercise {
  uid: string;
  exerciseId: number;
  notes?: string;
  /** 组间休息秒数；undefined 使用默认值，0 表示不计时 */
  rest?: number;
  sets: WorkoutSet[];
}

export interface Workout {
  id?: number;
  name: string;
  startedAt: number;
  endedAt: number;
  notes?: string;
  /** 来自哪个计划（字段名沿用旧版） */
  templateId?: number;
  /** 来自计划里的星期几：0 = 周日 … 6 = 周六 */
  planDay?: number;
  exercises: WorkoutExercise[];
  exerciseIds: number[];
}

export interface PlanDay {
  /** 这天练什么，如「胸 + 三头」；没有动作就是休息日 */
  name?: string;
  exercises: WorkoutExercise[];
}

/** 训练计划，存放在 templates 表 */
export interface Plan {
  id?: number;
  name: string;
  notes?: string;
  /** 固定 7 项，下标即星期几：0 = 周日 … 6 = 周六 */
  days: PlanDay[];
  sort: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

/** 1.0 版的计划格式：只有一组动作，没有按天区分 */
export interface LegacyTemplate {
  id?: number;
  name: string;
  notes?: string;
  exercises: WorkoutExercise[];
  sort: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export interface BodyRecord {
  id?: number;
  /** YYYY-MM-DD */
  date: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arm?: number;
  thigh?: number;
  calf?: number;
  note?: string;
  createdAt: number;
}

export interface ActiveWorkout {
  name: string;
  startedAt: number;
  notes?: string;
  templateId?: number;
  planDay?: number;
  exercises: WorkoutExercise[];
}
