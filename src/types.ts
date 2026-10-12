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
  templateId?: number;
  exercises: WorkoutExercise[];
  exerciseIds: number[];
}

export interface Template {
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
  exercises: WorkoutExercise[];
}
