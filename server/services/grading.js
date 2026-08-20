/**
 * Automatic grading for objective question types.
 */
export const autoGradeAnswer = (question, answer) => {
  const maxMarks = question.marks || 0;
  if (answer === undefined || answer === null || answer === '') {
    return { isCorrect: false, marksAwarded: 0, autoGraded: true };
  }

  switch (question.type) {
    case 'multiple_choice':
    case 'dropdown':
    case 'true_false':
      return gradeSingleChoice(question, answer, maxMarks);

    case 'checkbox':
      return gradeCheckbox(question, answer, maxMarks);

    case 'fill_blank':
      return gradeFillBlank(question, answer, maxMarks);

    case 'matching':
      return gradeMatching(question, answer, maxMarks);

    case 'short_answer':
      return gradeShortAnswer(question, answer, maxMarks);

    case 'essay':
    case 'file_upload':
    case 'image':
    case 'video':
      return { isCorrect: null, marksAwarded: 0, autoGraded: false };

    default:
      return { isCorrect: null, marksAwarded: 0, autoGraded: false };
  }
};

const normalize = (val) => String(val ?? '').trim().toLowerCase();

const gradeSingleChoice = (question, answer, maxMarks) => {
  const correct = question.options?.find((o) => o.isCorrect);
  const correctText = correct ? correct.text : question.correctAnswers?.[0];
  const isCorrect =
    normalize(answer) === normalize(correctText) ||
    normalize(answer) === normalize(correct?._id?.toString());
  return { isCorrect, marksAwarded: isCorrect ? maxMarks : 0, autoGraded: true };
};

const gradeCheckbox = (question, answer, maxMarks) => {
  const selected = Array.isArray(answer) ? answer.map(normalize) : [normalize(answer)];
  const correctOptions = (question.options || []).filter((o) => o.isCorrect);
  const correctIds = correctOptions.map((o) => normalize(o._id?.toString()));
  const correctTexts = correctOptions.map((o) => normalize(o.text));

  const allCorrectSelected =
    selected.length === correctOptions.length &&
    selected.every((s) => correctIds.includes(s) || correctTexts.includes(s));

  return {
    isCorrect: allCorrectSelected,
    marksAwarded: allCorrectSelected ? maxMarks : 0,
    autoGraded: true,
  };
};

const gradeFillBlank = (question, answer, maxMarks) => {
  const blanks = question.blanks || [];
  const answers = Array.isArray(answer) ? answer : [answer];
  if (!blanks.length) {
    const accepted = (question.correctAnswers || []).map(normalize);
    const isCorrect = accepted.includes(normalize(answers[0]));
    return { isCorrect, marksAwarded: isCorrect ? maxMarks : 0, autoGraded: true };
  }

  let correctCount = 0;
  blanks.forEach((blank, i) => {
    const accepted = (blank.answers || []).map(normalize);
    if (accepted.includes(normalize(answers[i]))) correctCount += 1;
  });

  const ratio = blanks.length ? correctCount / blanks.length : 0;
  return {
    isCorrect: ratio === 1,
    marksAwarded: Math.round(maxMarks * ratio * 100) / 100,
    autoGraded: true,
  };
};

const gradeMatching = (question, answer, maxMarks) => {
  const pairs = question.matchingPairs || [];
  const studentPairs = typeof answer === 'object' && answer !== null ? answer : {};
  let correctCount = 0;

  pairs.forEach((pair) => {
    const studentRight = studentPairs[pair.left] ?? studentPairs[normalize(pair.left)];
    if (normalize(studentRight) === normalize(pair.right)) correctCount += 1;
  });

  const ratio = pairs.length ? correctCount / pairs.length : 0;
  return {
    isCorrect: ratio === 1,
    marksAwarded: Math.round(maxMarks * ratio * 100) / 100,
    autoGraded: true,
  };
};

const gradeShortAnswer = (question, answer, maxMarks) => {
  const accepted = (question.correctAnswers || []).map(normalize);
  if (!accepted.length) {
    return { isCorrect: null, marksAwarded: 0, autoGraded: false };
  }
  const isCorrect = accepted.some(
    (a) => normalize(answer) === a || normalize(answer).includes(a) || a.includes(normalize(answer))
  );
  return { isCorrect, marksAwarded: isCorrect ? maxMarks : 0, autoGraded: true };
};

export const calculateLetterGrade = (percentage) => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

export default { autoGradeAnswer, calculateLetterGrade };
