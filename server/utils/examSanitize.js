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
