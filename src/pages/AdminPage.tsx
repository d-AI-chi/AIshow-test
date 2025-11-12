import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Users, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Question {
  id?: string;
  question_text: string;
  options: string[];
  order_index: number;
}

export function AdminPage() {
  const [eventName, setEventName] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: '', options: ['', '', ''], order_index: 0 },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);

  useEffect(() => {
    if (eventId) {
      loadEventStats();
      const interval = setInterval(loadEventStats, 5000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const loadEventStats = async () => {
    if (!eventId) return;

    const { count: pCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    const { data: participants } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', eventId);

    if (participants) {
      const { count: aCount } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .in('participant_id', participants.map(p => p.id));

      setAnswerCount(aCount || 0);
    }

    setParticipantCount(pCount || 0);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        options: ['', '', ''],
        order_index: questions.length,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const createEvent = async () => {
    if (!eventName || questions.some(q => !q.question_text || q.options.some(o => !o))) {
      alert('すべての項目を入力してください。');
      return;
    }

    setIsCreating(true);

    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 24);

      const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          name: eventName,
          access_code: accessCode,
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single();

      if (eventError) throw eventError;

      const questionRecords = questions.map((q, index) => ({
        event_id: event.id,
        question_text: q.question_text,
        options: q.options,
        order_index: index,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionRecords);

      if (questionsError) throw questionsError;

      setEventId(event.id);
      alert('イベントが作成されました！');
    } catch (err) {
      console.error('Error creating event:', err);
      alert('イベントの作成に失敗しました。');
    } finally {
      setIsCreating(false);
    }
  };

  const calculateMatches = async () => {
    if (!eventId) return;

    try {
      const { data: participants } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId);

      if (!participants || participants.length < 2) {
        alert('参加者が足りません。');
        return;
      }

      const { data: allAnswers } = await supabase
        .from('answers')
        .select('participant_id, question_id, selected_option_index')
        .in('participant_id', participants.map(p => p.id));

      if (!allAnswers) return;

      const answersByParticipant = allAnswers.reduce((acc, answer) => {
        if (!acc[answer.participant_id]) {
          acc[answer.participant_id] = [];
        }
        acc[answer.participant_id].push(answer);
        return acc;
      }, {} as Record<string, any[]>);

      const matchRecords = [];

      for (const p1 of participants) {
        for (const p2 of participants) {
          if (p1.id === p2.id) continue;

          const answers1 = answersByParticipant[p1.id] || [];
          const answers2 = answersByParticipant[p2.id] || [];

          if (answers1.length === 0 || answers2.length === 0) continue;

          let matches = 0;
          const totalQuestions = Math.min(answers1.length, answers2.length);

          for (const a1 of answers1) {
            const a2 = answers2.find(a => a.question_id === a1.question_id);
            if (a2 && a1.selected_option_index === a2.selected_option_index) {
              matches++;
            }
          }

          const score = totalQuestions > 0 ? (matches / totalQuestions) * 100 : 0;

          matchRecords.push({
            event_id: eventId,
            participant_id: p1.id,
            matched_participant_id: p2.id,
            compatibility_score: score,
          });
        }
      }

      await supabase.from('match_results').delete().eq('event_id', eventId);

      const { error } = await supabase
        .from('match_results')
        .insert(matchRecords);

      if (error) throw error;

      alert('マッチング計算が完了しました！');
    } catch (err) {
      console.error('Error calculating matches:', err);
      alert('マッチング計算に失敗しました。');
    }
  };

  const toggleResultsVisibility = async () => {
    if (!eventId) return;

    const newValue = !resultsVisible;

    const { error } = await supabase
      .from('events')
      .update({ results_visible: newValue })
      .eq('id', eventId);

    if (error) {
      alert('更新に失敗しました。');
      return;
    }

    setResultsVisible(newValue);
  };

  if (eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              イベント管理画面
            </h1>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">参加者数</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{participantCount}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">回答数</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{answerCount}</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={calculateMatches}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                マッチングを計算
              </button>

              <button
                onClick={toggleResultsVisibility}
                className={`w-full font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  resultsVisible
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {resultsVisible ? (
                  <>
                    <EyeOff className="w-5 h-5" />
                    結果を非表示にする
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    結果を公開する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            新規イベント作成
          </h1>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                イベント名
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: 太郎と花子の結婚式二次会"
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">質問設定</h2>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                質問を追加
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      質問 {qIndex + 1}
                    </h3>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="質問内容を入力"
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      選択肢
                    </label>
                    {question.options.map((option, oIndex) => (
                      <input
                        key={oIndex}
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`選択肢 ${oIndex + 1}`}
                      />
                    ))}
                    <button
                      onClick={() => addOption(qIndex)}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      + 選択肢を追加
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={createEvent}
            disabled={isCreating}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? '作成中...' : 'イベントを作成'}
          </button>
        </div>
      </div>
    </div>
  );
}
