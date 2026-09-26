// Questionnaire domain types.
// Answers are stored as structured data. The questionnaire NEVER computes an OA
// score. Future ML integration decides how to use these features.

export type QuestionType = "single" | "multi" | "scale";

export type QuestionOption = {
  value: string;
  label: string;
};

export type Question = {
  id: string;
  section: string;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  // Conditional visibility. If omitted, the question is always visible.
  showIf?: (answers: AnswerMap) => boolean;
};

// A single-choice answer is a string, multi-choice is an array of strings,
// and a scale answer is a number.
export type AnswerValue = string | string[] | number;

export type AnswerMap = Record<string, AnswerValue>;

export type QuestionnaireDraft = {
  patientId: string;
  answers: AnswerMap;
  updatedAt: string;
  completedAt?: string;
};
