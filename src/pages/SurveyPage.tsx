import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  order_index: number;
}

interface SurveyPageProps {
  eventId: string;
  participantId: string;
  onComplete: () => void;
}

export function SurveyPage({ eventId, participantId, onComplete }: SurveyPageProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuestions();
  }, [eventId]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index');

      if (error) throw error;

      setQuestions(
        data.map((q) => ({
          ...q,
          options: q.options as string[],
        }))
      );
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('質問の読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('すべての質問に回答してください。');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const answerRecords = Object.entries(answers).map(([questionId, optionIndex]) => ({
        participant_id: participantId,
        question_id: questionId,
        selected_option_index: optionIndex,
      }));

      const { error: insertError } = await supabase
        .from('answers')
        .insert(answerRecords);

      if (insertError) throw insertError;

      onComplete();
    } catch (err) {
      console.error('Error submitting answers:', err);
      setError('回答の送信に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              アンケート
            </h1>
            <p className="text-gray-600 mb-4">
              すべての質問に回答して相性診断を始めましょう
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {Object.keys(answers).length} / {questions.length} 完了
            </p>
          </div>

          <div className="space-y-8">
            {questions.map((question, index) => (
              <div key={question.id} className="border-b border-gray-200 pb-8 last:border-0">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-semibold">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 flex-1">
                    {question.question_text}
                  </h3>
                  {answers[question.id] !== undefined && (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-3 ml-11">
                  {question.options.map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                      onClick={() => handleAnswerSelect(question.id, optionIndex)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        answers[question.id] === optionIndex
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50/50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(answers).length < questions.length}
            className="mt-8 w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '送信中...' : '回答を送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
