export function getExamDeadline(response, exam) {
  const startedAt = response.startedAt ? new Date(response.startedAt).getTime() : NaN;
  if (!Number.isFinite(startedAt)) return null;

  const durationDeadline = startedAt + Number(exam.duration || 0) * 60 * 1000;
  const scheduledDeadline = exam.endTime ? new Date(exam.endTime).getTime() : Infinity;
  return Math.min(durationDeadline, scheduledDeadline);
}

export function getRemainingSeconds(response, exam, now = Date.now()) {
  const deadline = getExamDeadline(response, exam);
  if (deadline === null) return 0;
  return Math.max(0, Math.floor((deadline - now) / 1000));
}

export function isExamExpired(response, exam, now = Date.now()) {
  return getRemainingSeconds(response, exam, now) <= 0;
}