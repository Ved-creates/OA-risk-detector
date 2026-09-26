import type { AnswerMap, Question } from "@/src/types/questionnaire";

// Full questionnaire definition for OA Risk Detector.
// Base questions (Q1..Q14) always show. Conditional follow-ups only show when
// the triggering answer is "yes".
//
// This module is data only. It never produces a diagnosis or score.

export const QUESTIONS: Question[] = [
  // ---------------------------------------------------------------------------
  // Section 1 — Current symptoms
  // ---------------------------------------------------------------------------
  {
    id: "q1",
    section: "Current symptoms",
    prompt: "Do you currently experience pain in the joint being assessed?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
      { value: "almost_daily", label: "Almost daily" },
    ],
  },
  {
    id: "q2",
    section: "Current symptoms",
    prompt: "How often does the pain occur?",
    type: "single",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "daily", label: "Every day" },
    ],
  },
  {
    id: "q3",
    section: "Current symptoms",
    prompt: "How severe is your pain right now?",
    helper: "0 means no pain. 10 means the worst pain imaginable.",
    type: "scale",
    min: 0,
    max: 10,
    minLabel: "No pain",
    maxLabel: "Worst",
  },
  {
    id: "q4",
    section: "Current symptoms",
    prompt: "Does the pain increase during movement or physical activity?",
    type: "single",
    options: [
      { value: "never", label: "Never" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "almost_always", label: "Almost always" },
    ],
  },
  {
    id: "q5",
    section: "Current symptoms",
    prompt: "Does the pain interfere with your daily activities?",
    type: "single",
    options: [
      { value: "not_at_all", label: "Not at all" },
      { value: "slightly", label: "Slightly" },
      { value: "moderately", label: "Moderately" },
      { value: "a_lot", label: "A lot" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 2 — Stiffness and movement
  // ---------------------------------------------------------------------------
  {
    id: "q6",
    section: "Stiffness & movement",
    prompt: "Do you experience stiffness in the joint being assessed?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q7",
    section: "Stiffness & movement",
    prompt: "Do you notice stiffness after waking up or after sitting or resting for a long time?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q8",
    section: "Stiffness & movement",
    prompt: "Do you find it difficult to move the joint through its usual range?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q9",
    section: "Stiffness & movement",
    prompt: "Does the joint ever feel unstable or like it may give way?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 3 — Previous injury (Q10 is the gate for Q10a/Q10b)
  // ---------------------------------------------------------------------------
  {
    id: "q10",
    section: "Previous injury",
    prompt: "Have you previously injured the joint being assessed?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "q10a",
    section: "Previous injury",
    prompt: "What type of injury was it?",
    type: "single",
    options: [
      { value: "sports", label: "Sports injury" },
      { value: "fall_accident", label: "Fall or accident" },
      { value: "fracture", label: "Fracture" },
      { value: "ligament", label: "Ligament injury" },
      { value: "surgery", label: "Surgery" },
      { value: "other", label: "Other" },
    ],
    showIf: (answers) => answers.q10 === "yes",
  },
  {
    id: "q10b",
    section: "Previous injury",
    prompt: "Approximately when did the injury occur?",
    type: "single",
    options: [
      { value: "lt_1y", label: "Less than 1 year ago" },
      { value: "1_5y", label: "1 to 5 years ago" },
      { value: "gt_5y", label: "More than 5 years ago" },
      { value: "dont_remember", label: "Don't remember" },
    ],
    showIf: (answers) => answers.q10 === "yes",
  },

  // ---------------------------------------------------------------------------
  // Section 4 — Family history
  // ---------------------------------------------------------------------------
  {
    id: "q11",
    section: "Family history",
    prompt: "Has a close family member been diagnosed with osteoarthritis?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "dont_know", label: "Don't know" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 5 — Daily activity
  // ---------------------------------------------------------------------------
  {
    id: "q12",
    section: "Daily activity",
    prompt: "Does your daily work or activity involve repetitive joint loading or movement?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q13",
    section: "Daily activity",
    prompt: "Which of these activities do you regularly perform?",
    helper: "Select all that apply.",
    type: "multi",
    options: [
      { value: "squatting", label: "Squatting" },
      { value: "kneeling", label: "Kneeling" },
      { value: "stairs", label: "Climbing stairs" },
      { value: "heavy_lifting", label: "Heavy lifting" },
      { value: "repetitive_hand", label: "Repetitive hand movements" },
      { value: "long_standing", label: "Long periods of standing" },
      { value: "other", label: "Other" },
      { value: "none", label: "None of these" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 6 — Other joint conditions
  // ---------------------------------------------------------------------------
  {
    id: "q14",
    section: "Other joint conditions",
    prompt: "Have you previously been diagnosed with another joint condition?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "dont_know", label: "Don't know" },
    ],
  },
  {
    id: "q14a",
    section: "Other joint conditions",
    prompt: "Which condition were you diagnosed with?",
    type: "single",
    options: [
      { value: "prev_arthritis", label: "Previous arthritis" },
      { value: "gout", label: "Gout" },
      { value: "prev_joint_disease", label: "Previous joint disease" },
      { value: "other", label: "Other" },
      { value: "dont_know", label: "Don't know" },
    ],
    showIf: (answers) => answers.q14 === "yes",
  },
];

export function getVisibleQuestions(answers: AnswerMap): Question[] {
  return QUESTIONS.filter((q) => (q.showIf ? q.showIf(answers) : true));
}

export function findQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
