/**
 * Strip grading-sensitive fields from exam questions for student-facing responses.
 */
export function sanitizeQuestionForStudent(question) {
  const q = typeof question.toObject === 'function' ? question.toObject() : { ...question };
  const { correctAnswers, explanation, referenceAnswer, rubric, ...safe } = q;
  safe.options = (safe.options || []).map(({ isCorrect, ...opt }) => opt);
  return safe;
}

export function sanitizeExamForStudent(exam) {
  const examObj = typeof exam.toObject === 'function' ? exam.toObject() : { ...exam };
  delete examObj.accessCode;
  examObj.questions = (examObj.questions || []).map(sanitizeQuestionForStudent);
  return examObj;
}

const AI_GRADE_SAFE_FOR_STUDENT = [
  'response',
  'question',
  'student',
  'exam',
  'maxMarks',
  'score',
  'feedback',
  'suggestions',
  'provider',
  'overridden',
  'overrideScore',
  'overrideFeedback',
  'overriddenAt',
  'createdAt',
  'updatedAt',
];

/**
 * Strip grading-sensitive fields (reference answer, rubric, raw LLM payload,
 * reasoning, student answer snapshot) from AI grades before returning them to
 * students. Teachers/admins always receive the full records.
 */
export function sanitizeAIGradesForStudent(aiGrades) {
  return (aiGrades || []).map((grade) => {
    const plain = typeof grade.toObject === 'function' ? grade.toObject() : { ...grade };
    const safe = {};
    for (const key of AI_GRADE_SAFE_FOR_STUDENT) {
      if (plain[key] !== undefined) safe[key] = plain[key];
    }
    return safe;
  });
}
