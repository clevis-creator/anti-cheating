import { Exam, Question } from '../models/index.js';
import { recalculateTotalMarks } from './examController.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const getQuestions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.exam) filter.exam = req.query.exam;
  if (req.query.bank === 'true') filter.bank = true;
  if (req.query.type) filter.type = req.query.type;
  if (req.user.role === 'teacher') filter.createdBy = req.user._id;

  const questions = await Question.find(filter).sort('order createdAt');
  sendSuccess(res, { questions });
});

export const getQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new AppError('Question not found', 404);

  if (req.user.role === 'teacher' && !question.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  if (req.user.role === 'student') {
    throw new AppError('Not authorized', 403);
  }

  sendSuccess(res, { question });
});

export const createQuestion = asyncHandler(async (req, res) => {
  if (req.body.exam) {
    const exam = await Exam.findById(req.body.exam).select('createdBy');
    if (!exam) throw new AppError('Exam not found', 404);
    if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
      throw new AppError('Not authorized', 403);
    }
  }

  const question = await Question.create({
    ...req.body,
    createdBy: req.user._id,
  });

  if (question.exam) {
    await Exam.findByIdAndUpdate(question.exam, { $push: { questions: question._id } });
    await recalculateTotalMarks(question.exam);
  }

  sendSuccess(res, { question }, 'Question created', 201);
});

export const createBulkQuestions = asyncHandler(async (req, res) => {
  const { examId, questions } = req.body;
  if (!Array.isArray(questions) || !questions.length) {
    throw new AppError('Questions array is required', 400);
  }

  if (examId) {
    const exam = await Exam.findById(examId).select('createdBy');
    if (!exam) throw new AppError('Exam not found', 404);
    if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
      throw new AppError('Not authorized', 403);
    }
  }

  const created = await Question.insertMany(
    questions.map((q, i) => ({
      ...q,
      exam: examId,
      createdBy: req.user._id,
      order: q.order ?? i,
    }))
  );

  if (examId) {
    await Exam.findByIdAndUpdate(examId, {
      $push: { questions: { $each: created.map((q) => q._id) } },
    });
    await recalculateTotalMarks(examId);
  }

  sendSuccess(res, { questions: created }, 'Questions created', 201);
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new AppError('Question not found', 404);

  if (req.user.role === 'teacher' && !question.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  Object.assign(question, req.body);
  await question.save();

  if (question.exam) await recalculateTotalMarks(question.exam);
  sendSuccess(res, { question }, 'Question updated');
});

export const reorderQuestions = asyncHandler(async (req, res) => {
  const { order } = req.body; // [{ id, order }]
  if (!Array.isArray(order)) throw new AppError('Order array required', 400);

  const ids = order.map(({ id }) => id);
  const questions = await Question.find({ _id: { $in: ids } });
  if (questions.length !== ids.length) throw new AppError('One or more questions not found', 404);

  if (req.user.role === 'teacher') {
    const unauthorized = questions.find((question) => !question.createdBy.equals(req.user._id));
    if (unauthorized) throw new AppError('Not authorized', 403);
  }

  await Promise.all(
    order.map(({ id, order: ord }) => Question.findByIdAndUpdate(id, { order: ord }))
  );

  sendSuccess(res, null, 'Questions reordered');
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new AppError('Question not found', 404);

  if (req.user.role === 'teacher' && !question.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  const examId = question.exam;
  await question.deleteOne();

  if (examId) {
    await Exam.findByIdAndUpdate(examId, { $pull: { questions: question._id } });
    await recalculateTotalMarks(examId);
  }

  sendSuccess(res, null, 'Question deleted');
});

export const addToBank = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new AppError('Question not found', 404);

  if (req.user.role === 'teacher' && !question.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  const bankQ = question.toObject();
  delete bankQ._id;
  bankQ.bank = true;
  bankQ.exam = undefined;
  bankQ.createdBy = req.user._id;

  const created = await Question.create(bankQ);
  sendSuccess(res, { question: created }, 'Added to question bank', 201);
});
