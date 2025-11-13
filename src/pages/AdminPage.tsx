import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Users, Calculator, ChevronDown, ChevronUp, Heart, FileText, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

interface Question {
  id?: string;
  question_text: string;
  options: string[];
  order_index: number;
}

interface ParticipantWithAnswers {
  id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
  gender: string | null;
  answers: {
    question_id: string;
    question_text: string;
    selected_option_index: number;
    selected_option_label: string;
  }[];
}

interface MatchPair {
  participantId: string;
  participantName: string;
  participantGender: string | null;
  matchedParticipantId: string;
  matchedParticipantName: string;
  matchedParticipantGender: string | null;
  score: number;
  isHidden: boolean;
  matchResultId: string;
}

type EventRow = Database['public']['Tables']['events']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];
type ParticipantRow = Database['public']['Tables']['participants']['Row'];
type AnswerRow = Database['public']['Tables']['answers']['Row'];
type MatchResultRow = Database['public']['Tables']['match_results']['Row'];

export function AdminPage() {
  const [eventName, setEventName] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);
const [newQuestions, setNewQuestions] = useState<Question[]>([
    { question_text: '', options: ['', '', ''], order_index: 0 },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);
  const [participantsDetail, setParticipantsDetail] = useState<ParticipantWithAnswers[]>([]);
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([]);
  const [matchThreshold, setMatchThreshold] = useState(85);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [isSavingAdminCode, setIsSavingAdminCode] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [isMatchResultsExpanded, setIsMatchResultsExpanded] = useState(false);
  const [isQuestionsExpanded, setIsQuestionsExpanded] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [editingQuestionOptions, setEditingQuestionOptions] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [questionAnswerStats, setQuestionAnswerStats] = useState<Array<{
    questionId: string;
    questionText: string;
    orderIndex: number;
    optionCounts: Array<{ optionIndex: number; optionText: string; count: number }>;
    totalAnswers: number;
  }>>([]);

  useEffect(() => {
    if (!eventId) return;

    fetchEventDetails(eventId);
    refreshAdminData(eventId);
    loadEventStats(eventId);

    const interval = setInterval(() => loadEventStats(eventId), 5000);
      return () => clearInterval(interval);
  }, [eventId]);

  const fetchEventDetails = async (targetEventId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', targetEventId)
      .single();

    if (error || !data) {
      console.error('Error loading event details:', error);
      return;
    }

    const event = data as EventRow;

    setActiveEvent(event);
    setEventName(event.name ?? '');
    setResultsVisible(event.results_visible ?? false);

    const thresholdValue =
      typeof event.match_threshold === 'number'
        ? Math.max(0, Math.min(100, Number(event.match_threshold)))
        : 85;
    setMatchThreshold(thresholdValue);
    setAdminCode(event.admin_code ?? '');
  };

  const refreshAdminData = async (targetEventId = eventId) => {
    if (!targetEventId) return;

    setIsRefreshingData(true);
    try {
      const [questionsResponse, participantsResponse] = await Promise.all([
        supabase
          .from('questions')
          .select('*')
          .eq('event_id', targetEventId)
          .order('order_index', { ascending: true }),
        supabase
          .from('participants')
          .select('*')
          .eq('event_id', targetEventId)
          .order('created_at', { ascending: true }),
      ]);

      if (questionsResponse.error) throw questionsResponse.error;
      if (participantsResponse.error) throw participantsResponse.error;

      const questionsRows = (questionsResponse.data ?? []) as QuestionRow[];
      const participantsRows = (participantsResponse.data ?? []) as ParticipantRow[];

      const normalizedQuestions = questionsRows.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? (q.options as unknown[]).map((option) => String(option)) : [],
        order_index: q.order_index,
      }));

      setExistingQuestions(normalizedQuestions);

      const participantIds = participantsRows.map((participant) => participant.id);

      let answersData:
        | {
            participant_id: string;
            question_id: string;
            selected_option_index: number;
          }[]
        | null = null;

      if (participantIds.length > 0) {
        const answersResponse = await supabase
          .from('answers')
          .select('*')
          .in('participant_id', participantIds);

        if (answersResponse.error) throw answersResponse.error;

        answersData = (answersResponse.data ?? []) as AnswerRow[];
      }

      const matchResponse = await supabase
        .from('match_results')
        .select('*')
        .eq('event_id', targetEventId);

      if (matchResponse.error) {
        console.error('Match results query error:', matchResponse.error);
        // エラーが発生しても続行（マッチング結果がまだない場合など）
      }

      const matchData = (matchResponse.data ?? []) as MatchResultRow[];
      
      console.log('Match data loaded:', matchData.length, 'records');

      const questionMap = new Map(
        normalizedQuestions.map((q) => [
          q.id,
          {
            text: q.question_text,
            options: q.options,
            order: q.order_index,
          },
        ]),
      );

      const enrichedParticipants = participantsRows.map((participant) => {
        const answersForParticipant =
          answersData
            ?.filter((answer) => answer.participant_id === participant.id)
            .map((answer) => {
              const question = questionMap.get(answer.question_id);
              const optionLabel =
                question && question.options[answer.selected_option_index]
                  ? question.options[answer.selected_option_index]
                  : `選択肢${answer.selected_option_index + 1}`;

              return {
                question_id: answer.question_id,
                question_text: question?.text ?? '不明な質問',
                selected_option_index: answer.selected_option_index,
                selected_option_label: optionLabel,
                order_index: question?.order ?? 999,
              };
            })
            .sort((a, b) => a.order_index - b.order_index)
            .map(({ order_index, ...rest }) => rest) ?? [];

        return {
          id: participant.id,
          name: participant.name,
          profile_image_url: participant.profile_image_url,
          created_at: participant.created_at,
          gender: participant.gender,
          answers: answersForParticipant,
        };
      });

      setParticipantsDetail(enrichedParticipants);

      // 問題ごとの回答数を計算
      const questionAnswerStats = normalizedQuestions.map(question => {
        const answersForQuestion = answersData?.filter(
          answer => answer.question_id === question.id
        ) || [];
        
        const optionCounts = question.options.map((optionText, optionIndex) => {
          const count = answersForQuestion.filter(
            answer => answer.selected_option_index === optionIndex
          ).length;
          return { optionIndex, optionText, count };
        });

        return {
          questionId: question.id,
          questionText: question.question_text,
          orderIndex: question.order_index,
          optionCounts,
          totalAnswers: answersForQuestion.length,
        };
      });

      // order_index順にソート
      questionAnswerStats.sort((a, b) => a.orderIndex - b.orderIndex);
      setQuestionAnswerStats(questionAnswerStats);

      const participantInfoMap = new Map(
        participantsRows.map((participant) => [
          participant.id,
          { name: participant.name, gender: participant.gender },
        ]),
      );

      const uniquePairs = new Map<string, MatchPair>();

      matchData.forEach((result) => {
        const participantId = result.participant_id;
        const matchedId = result.matched_participant_id;
        const key = [participantId, matchedId].sort().join('|');
        const score = typeof result.compatibility_score === 'number' ? result.compatibility_score : 0;
        const isHidden = result.is_hidden ?? false;

        if (!participantId || !matchedId) return;

        const participantInfo = participantInfoMap.get(participantId);
        const matchedInfo = participantInfoMap.get(matchedId);

        const pair: MatchPair = {
          participantId,
          participantName: participantInfo?.name ?? '不明な参加者',
          participantGender: participantInfo?.gender ?? null,
          matchedParticipantId: matchedId,
          matchedParticipantName: matchedInfo?.name ?? '不明な参加者',
          matchedParticipantGender: matchedInfo?.gender ?? null,
          score,
          isHidden,
          matchResultId: result.id,
        };

        const existingPair = uniquePairs.get(key);
        if (!existingPair || existingPair.score < score) {
          uniquePairs.set(key, pair);
        }
      });

      setMatchPairs(Array.from(uniquePairs.values()).sort((a, b) => b.score - a.score));
    } catch (error) {
      console.error('Error refreshing admin data:', error);
    } finally {
      setIsRefreshingData(false);
    }
  };

  const loadEventStats = async (targetEventId = eventId) => {
    if (!targetEventId) return;

    const { count: pCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', targetEventId);

    const { data: participants } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', targetEventId);

    const participantIdRows = (participants ?? []) as Pick<ParticipantRow, 'id'>[];

    if (participantIdRows.length > 0) {
      const { count: aCount } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .in(
          'participant_id',
          participantIdRows.map((p) => p.id),
        );

      setAnswerCount(aCount || 0);
    } else {
      setAnswerCount(0);
    }

    setParticipantCount(pCount || 0);
  };

  const addQuestion = () => {
    setNewQuestions([
      ...newQuestions,
      {
        question_text: '',
        options: ['', '', ''],
        order_index: newQuestions.length,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setNewQuestions(newQuestions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...newQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setNewQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...newQuestions];
    updated[qIndex].options[oIndex] = value;
    setNewQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...newQuestions];
    updated[qIndex].options.push('');
    setNewQuestions(updated);
  };

  const loadExistingEvent = async () => {
    const sanitizedCode = accessCodeInput.trim().toUpperCase();

    setLoadError('');

    if (!sanitizedCode) {
      setLoadError('アクセスコードを入力してください。');
      return;
    }

    setIsLoadingEvent(true);

    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('access_code', sanitizedCode)
        .maybeSingle();

      if (error) throw error;

      if (!event) {
        setLoadError('イベントが見つかりませんでした。');
        return;
      }

      const eventRow = event as EventRow;

      setEventId(eventRow.id);
      setActiveEvent(eventRow);
      setEventName(eventRow.name ?? '');
      setAccessCodeInput(eventRow.access_code ?? sanitizedCode);
      setResultsVisible(eventRow.results_visible ?? false);

      const thresholdValue =
        typeof eventRow.match_threshold === 'number'
          ? Math.max(0, Math.min(100, Number(eventRow.match_threshold)))
          : 85;
      setMatchThreshold(thresholdValue);

      await Promise.all([refreshAdminData(eventRow.id), loadEventStats(eventRow.id)]);
    } catch (err) {
      console.error('Error loading event:', err);
      setLoadError('イベントの読み込みに失敗しました。');
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const createEvent = async () => {
    if (!eventName || newQuestions.some(q => !q.question_text || q.options.some(o => !o))) {
      alert('すべての項目を入力してください。');
      return;
    }

    setIsCreating(true);

    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 24);

      const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data: event, error: eventError } = await (supabase.from('events') as any).insert({
          name: eventName,
          access_code: accessCode,
          ends_at: endsAt.toISOString(),
        }).select().single();

      if (eventError) throw eventError;

      const questionRecords: Database['public']['Tables']['questions']['Insert'][] = newQuestions.map(
        (q, index) => ({
        event_id: event.id,
        question_text: q.question_text,
        options: q.options,
        order_index: index,
        }),
      );

      const { error: questionsError } = await (supabase.from('questions') as any).insert(questionRecords);

      if (questionsError) throw questionsError;

      const eventRow = event as EventRow;

      setEventId(eventRow.id);
      setActiveEvent(eventRow);
      setResultsVisible(eventRow.results_visible ?? false);

      const thresholdValue =
        typeof eventRow.match_threshold === 'number'
          ? Math.max(0, Math.min(100, Number(eventRow.match_threshold)))
          : 85;
      setMatchThreshold(thresholdValue);
      setAccessCodeInput(eventRow.access_code ?? accessCode);

      setNewQuestions([{ question_text: '', options: ['', '', ''], order_index: 0 }]);
      setEventName(eventRow.name ?? '');

      await Promise.all([refreshAdminData(eventRow.id), loadEventStats(eventRow.id)]);

      alert(`イベントが作成されました！\nアクセスコード: ${eventRow.access_code}`);
    } catch (err: any) {
      console.error('Error creating event:', err);
      const errorMessage = err?.message || '不明なエラーが発生しました';
      alert(`イベントの作成に失敗しました。\n\nエラー詳細: ${errorMessage}\n\nSupabaseのマイグレーションが実行されているか確認してください。`);
    } finally {
      setIsCreating(false);
    }
  };

  const calculateMatches = async () => {
    if (!eventId) return;

    try {
      const { data: participants } = await supabase
        .from('participants')
        .select('id, gender')
        .eq('event_id', eventId);

      const participantRows = (participants ?? []) as Pick<ParticipantRow, 'id' | 'gender'>[];

      if (participantRows.length < 2) {
        alert('参加者が足りません。');
        return;
      }

      const { data: allAnswers } = await supabase
        .from('answers')
        .select('participant_id, question_id, selected_option_index')
        .in(
          'participant_id',
          participantRows.map((p) => p.id),
        );

      const answerRows = (allAnswers ?? []) as Pick<
        AnswerRow,
        'participant_id' | 'question_id' | 'selected_option_index'
      >[];

      if (answerRows.length === 0) {
        alert('まだ回答が十分に集まっていません。');
        return;
      }

      const answersByParticipant = answerRows.reduce<Record<string, typeof answerRows>>((acc, answer) => {
        if (!acc[answer.participant_id]) {
          acc[answer.participant_id] = [];
        }
        acc[answer.participant_id].push(answer);
        return acc;
      }, {});

      const matchRecords: Database['public']['Tables']['match_results']['Insert'][] = [];

      for (let i = 0; i < participantRows.length; i++) {
        for (let j = i + 1; j < participantRows.length; j++) {
          const p1 = participantRows[i];
          const p2 = participantRows[j];

          // 基本的には同性別同士でペアにならないようにする
          // ただし、どちらかがnullの場合は除外しない（既存データとの互換性のため）
          if (p1.gender && p2.gender && p1.gender === p2.gender && p1.gender !== 'other') {
            continue;
          }

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

          // 双方向のマッチ結果を追加（p1→p2 と p2→p1）
          matchRecords.push({
            event_id: eventId,
            participant_id: p1.id,
            matched_participant_id: p2.id,
            compatibility_score: score,
            is_hidden: false,
          });
          matchRecords.push({
            event_id: eventId,
            participant_id: p2.id,
            matched_participant_id: p1.id,
            compatibility_score: score,
            is_hidden: false,
          });
        }
      }

      if (matchRecords.length === 0) {
        alert('マッチング結果が生成されませんでした。参加者と回答を確認してください。');
        return;
      }

      // 重複を防ぐため、既に存在するレコードをチェック
      const uniqueRecords = matchRecords.filter((record, index, self) => {
        return index === self.findIndex((r) => 
          r.participant_id === record.participant_id && 
          r.matched_participant_id === record.matched_participant_id
        );
      });

      // 既存のマッチ結果を削除（確実に完了するまで待つ）
      const { error: deleteError } = await supabase
        .from('match_results')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error(`既存のマッチ結果の削除に失敗しました: ${deleteError.message}`);
      }

      // 削除が確実に完了するまで待つ（削除が完了したことを確認）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 削除が完了したことを確認
      let retryCount = 0;
      while (retryCount < 5) {
        const { count } = await supabase
          .from('match_results')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId);
        
        if (count === 0) break;
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }

      // バッチで挿入（50件ずつ、重複チェック付き）
      const batchSize = 50;
      const insertedKeys = new Set<string>();
      
      for (let i = 0; i < uniqueRecords.length; i += batchSize) {
        const batch = uniqueRecords.slice(i, i + batchSize);
        
        // バッチ内の重複をチェック
        const deduplicatedBatch = batch.filter(record => {
          const key = `${record.participant_id}-${record.matched_participant_id}`;
          if (insertedKeys.has(key)) {
            return false;
          }
          insertedKeys.add(key);
          return true;
        });
        
        if (deduplicatedBatch.length === 0) continue;
        
        const { error: insertError } = await (supabase.from('match_results') as any)
          .insert(deduplicatedBatch)
          .select();

        if (insertError) {
          console.error('Insert error:', insertError);
          // 重複キーエラーの場合は、既存のレコードを更新する
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
            // 重複したレコードを個別に更新
            for (const record of deduplicatedBatch) {
              const { error: updateError } = await (supabase.from('match_results') as any)
                .update({
                  compatibility_score: record.compatibility_score,
                  is_hidden: record.is_hidden ?? false,
                })
                .eq('participant_id', record.participant_id)
                .eq('matched_participant_id', record.matched_participant_id);
              
              if (updateError && updateError.code !== '23505') {
                console.error('Update error:', updateError);
              }
            }
          } else {
            throw new Error(`マッチ結果の保存に失敗しました: ${insertError.message}`);
          }
        }
      }

      await refreshAdminData(eventId);
      alert('マッチング計算が完了しました！');
    } catch (err: any) {
      console.error('Error calculating matches:', err);
      const errorMessage = err?.message || '不明なエラーが発生しました';
      alert(`マッチング計算に失敗しました。\n\nエラー詳細: ${errorMessage}\n\nSupabaseのマイグレーションが実行されているか確認してください。`);
    }
  };

  const toggleResultsVisibility = async () => {
    if (!eventId) return;

    const newValue = !resultsVisible;

    const { error } = await (supabase.from('events') as any)
      .update({ results_visible: newValue })
      .eq('id', eventId);

    if (error) {
      alert('更新に失敗しました。');
      return;
    }

    setResultsVisible(newValue);
    setActiveEvent(prev =>
      prev
        ? {
            ...prev,
            results_visible: newValue,
          }
        : prev,
    );
  };

  const saveMatchThreshold = async (showAlert = true) => {
    if (!eventId) return;

    const normalized = Math.max(0, Math.min(100, Number(matchThreshold) || 0));

    setIsSavingThreshold(true);

    try {
      const { error } = await (supabase.from('events') as any)
        .update({ match_threshold: normalized })
        .eq('id', eventId);

      if (error) throw error;

      setMatchThreshold(normalized);
      setActiveEvent(prev =>
        prev
          ? {
              ...prev,
              match_threshold: normalized,
            }
          : prev,
      );

      // スライダーの自動保存ではalertを表示しない
      if (showAlert) {
        alert('マッチング閾値を更新しました。');
      }
    } catch (err) {
      console.error('Error saving match threshold:', err);
      if (showAlert) {
        alert('マッチング閾値の保存に失敗しました。');
      }
    } finally {
      setIsSavingThreshold(false);
    }
  };

  if (eventId) {
    const filteredPairs = matchPairs.filter(pair => pair.score >= matchThreshold);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">イベント管理画面</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-2">
                  イベント名: {activeEvent?.name ?? eventName ?? '未設定'}
                </p>
                <p className="text-sm sm:text-base text-gray-600">
                  アクセスコード:{' '}
                  <span className="font-mono text-sm sm:text-base text-gray-800 break-all">
                    {activeEvent?.access_code ?? accessCodeInput}
                  </span>
                </p>
              </div>
              <button
                onClick={() => refreshAdminData(eventId)}
                disabled={isRefreshingData}
                className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-60 text-sm sm:text-base"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{isRefreshingData ? '更新中...' : '最新のデータを再取得'}</span>
                <span className="sm:hidden">{isRefreshingData ? '更新中' : '更新'}</span>
              </button>
            </div>

            {/* リンク表示セクション */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                アクセスリンク
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    参加者用リンク
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/`}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-mono text-gray-800"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/`);
                        setCopiedLink('participant');
                        setTimeout(() => setCopiedLink(null), 2000);
                      }}
                      className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {copiedLink === 'participant' ? '✓ コピー済み' : 'コピー'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    管理者用リンク
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/admin`}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-mono text-gray-800"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/admin`);
                        setCopiedLink('admin');
                        setTimeout(() => setCopiedLink(null), 2000);
                      }}
                      className="px-3 sm:px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {copiedLink === 'admin' ? '✓ コピー済み' : 'コピー'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    大画面モニター用リンク
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={eventId ? `${window.location.origin}/display/${eventId}` : 'イベントを選択してください'}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-mono text-gray-800"
                    />
                    <button
                      onClick={() => {
                        if (eventId) {
                          navigator.clipboard.writeText(`${window.location.origin}/display/${eventId}`);
                          setCopiedLink('display');
                          setTimeout(() => setCopiedLink(null), 2000);
                        }
                      }}
                      disabled={!eventId}
                      className="px-3 sm:px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copiedLink === 'display' ? '✓ コピー済み' : 'コピー'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    大画面モニターに結果を表示するためのリンクです
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-600">
                    💡 <strong>注意:</strong> 携帯からアクセスするには、PCと携帯が同じWi-Fiネットワークに接続されている必要があります。
                    <br />
                    <span className="text-gray-500">
                      PCのIPアドレスが {window.location.hostname} の場合、携帯のブラウザで上記のリンクにアクセスしてください。
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <span className="text-xs sm:text-sm text-gray-600">参加者数</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{participantCount}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <span className="text-xs sm:text-sm text-gray-600">回答数</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{answerCount}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  {resultsVisible ? (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  )}
                  <span className="text-xs sm:text-sm text-gray-600">結果公開状態</span>
                </div>
                <p
                  className={`text-base sm:text-lg font-semibold ${
                    resultsVisible ? 'text-green-600' : 'text-gray-700'
                  }`}
                >
                  {resultsVisible ? '参加者に公開中' : '非公開'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">マッチング閾値</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  この値以上のペアを「成立」とみなして表示します。
                </p>
                <div className="mt-4 space-y-4">
                  {/* スライダー */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">閾値: {matchThreshold}%</span>
                      <span className="text-xs text-gray-500">0% - 100%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={matchThreshold}
                      onChange={e => {
                        const value = Number(e.target.value);
                        setMatchThreshold(value);
                        // スライダーを動かしたら自動保存（alertは表示しない）
                        setTimeout(() => {
                          saveMatchThreshold(false);
                        }, 300); // 300ms後に自動保存（連続変更を防ぐ）
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${matchThreshold}%, #e5e7eb ${matchThreshold}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* 直接入力 */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      直接入力（0-100）
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={matchThreshold}
                        onChange={e => {
                          const value = Number(e.target.value);
                          if (!Number.isNaN(value)) {
                            const clampedValue = Math.max(0, Math.min(100, value));
                            setMatchThreshold(clampedValue);
                          }
                        }}
                        onBlur={() => {
                          // フォーカスが外れたときに自動保存
                          saveMatchThreshold();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveMatchThreshold();
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium"
                        placeholder="0-100"
                      />
                      <span className="text-base font-medium text-gray-700">%</span>
                      <button
                        onClick={() => saveMatchThreshold(true)}
                        disabled={isSavingThreshold}
                        className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
                      >
                        {isSavingThreshold ? '保存中...' : '保存'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 スライダーを動かすと自動保存されます。直接入力の場合はEnterキーまたは保存ボタンで保存できます。
                    </p>
                  </div>

                  {/* クイック設定ボタン */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      よく使う設定
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[70, 75, 80, 85, 90, 95, 100].map(value => (
                        <button
                          key={value}
                          onClick={() => {
                            setMatchThreshold(value);
                            setTimeout(() => {
                              saveMatchThreshold(false); // クイック設定でもalertは表示しない
                            }, 100);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            matchThreshold === value
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">管理者コード</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  管理者ページにアクセスするためのコードを設定します。
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="text"
                    value={adminCode}
                    onChange={e => setAdminCode(e.target.value)}
                    placeholder="管理者コードを入力"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={async () => {
                      if (!eventId) return;
                      setIsSavingAdminCode(true);
                      try {
                        const { error } = await (supabase.from('events') as any)
                          .update({ admin_code: adminCode.trim() || null })
                          .eq('id', eventId);
                        if (error) {
                          console.error('Supabase error:', error);
                          throw error;
                        }
                        await fetchEventDetails(eventId);
                        alert('管理者コードを保存しました。');
                      } catch (err: any) {
                        console.error('Error saving admin code:', err);
                        const errorMessage = err?.message || err?.code || '不明なエラー';
                        alert(`管理者コードの保存に失敗しました。\nエラー: ${errorMessage}\n\nSupabaseのマイグレーション（20251112132000_add_admin_code_to_events.sql）が実行されているか確認してください。`);
                      } finally {
                        setIsSavingAdminCode(false);
                      }
                    }}
                    disabled={isSavingAdminCode}
                    className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {isSavingAdminCode ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <h2 className="text-lg font-semibold text-gray-800">公開と再計算</h2>
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

            <div className="space-y-3">
              <button
                onClick={() => setIsMatchResultsExpanded(!isMatchResultsExpanded)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors flex-shrink-0">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">マッチング結果</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      閾値 {matchThreshold}% 以上のペア: {filteredPairs.length}組
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className={`text-xs sm:text-sm font-medium transition-colors ${
                    isMatchResultsExpanded ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {isMatchResultsExpanded ? '閉じる' : '開く'}
                  </span>
                  {isMatchResultsExpanded ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                  )}
                </div>
              </button>
              
              {isMatchResultsExpanded && (
                <div className="mt-2 p-3 sm:p-4 md:p-6 bg-green-50 border-2 border-green-200 rounded-xl shadow-sm">
                  {matchPairs.length === 0 ? (
                    <p className="text-gray-600">
                      まだマッチング結果がありません。「マッチングを計算」を実行してください。
                    </p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {filteredPairs.length === 0 ? (
                          <p className="text-sm text-rose-500">
                            現在の閾値を満たすペアは見つかりませんでした。
                          </p>
                        ) : (
                          filteredPairs.map(pair => (
                        <div
                          key={`${pair.participantId}-${pair.matchedParticipantId}`}
                          className={`border rounded-xl p-4 space-y-2 ${
                            pair.isHidden ? 'border-gray-300 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!pair.isHidden}
                                  onChange={async (e) => {
                                    const newIsHidden = !e.target.checked;
                                    try {
                                      const { error } = await (supabase.from('match_results') as any)
                                        .update({ is_hidden: newIsHidden })
                                        .eq('id', pair.matchResultId);
                                      
                                      if (error) throw error;
                                      
                                      // 双方向のマッチ結果も更新
                                      const reverseMatchResponse = await supabase
                                        .from('match_results')
                                        .select('id')
                                        .eq('participant_id', pair.matchedParticipantId)
                                        .eq('matched_participant_id', pair.participantId)
                                        .maybeSingle();
                                      
                                      const reverseMatch = reverseMatchResponse.data as { id: string } | null;
                                      if (reverseMatch?.id) {
                                        await (supabase.from('match_results') as any)
                                          .update({ is_hidden: newIsHidden })
                                          .eq('id', reverseMatch.id);
                                      }
                                      
                                      await refreshAdminData(eventId);
                                    } catch (err) {
                                      console.error('Error updating is_hidden:', err);
                                      alert('更新に失敗しました。');
                                    }
                                  }}
                                  className="w-5 h-5 text-rose-500 rounded focus:ring-rose-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-600 font-medium">
                                  参加者に表示する
                                </span>
                              </label>
                              <span className="text-gray-400">|</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">
                                  {pair.participantName}
                                </span>
                                {pair.participantGender && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    pair.participantGender === 'male' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : pair.participantGender === 'female' 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {pair.participantGender === 'male' ? '男' : pair.participantGender === 'female' ? '女' : 'その他'}
                                  </span>
                                )}
                                <span className="text-gray-400">×</span>
                                <span className="font-semibold text-gray-800">
                                  {pair.matchedParticipantName}
                                </span>
                                {pair.matchedParticipantGender && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    pair.matchedParticipantGender === 'male' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : pair.matchedParticipantGender === 'female' 
                                      ? 'bg-red-100 text-red-700' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {pair.matchedParticipantGender === 'male' ? '男' : pair.matchedParticipantGender === 'female' ? '女' : 'その他'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-medium text-green-600">
                              {pair.score.toFixed(1)}%
                            </span>
                          </div>
                          {pair.isHidden && (
                            <p className="text-xs text-rose-500 bg-rose-50 px-3 py-1 rounded">
                              ⚠️ このペアは参加者に表示されません
                            </p>
                          )}
                        </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">参加者と回答状況</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      {participantsDetail.length}人が参加中
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className={`text-xs sm:text-sm font-medium transition-colors ${
                    isParticipantsExpanded ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {isParticipantsExpanded ? '閉じる' : '開く'}
                  </span>
                  {isParticipantsExpanded ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  )}
                </div>
              </button>
              
              {isParticipantsExpanded && (
                <div className="mt-2 p-3 sm:p-4 md:p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
                  {participantsDetail.length === 0 ? (
                    <p className="text-gray-600">まだ参加者が登録されていません。</p>
                  ) : (
                    <div className="space-y-6">
                      {/* 問題ごとの回答数統計 */}
                      {questionAnswerStats.length > 0 && (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-blue-300 shadow-md">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-blue-600" />
                            問題ごとの回答数
                          </h3>
                          <div className="space-y-4">
                            {questionAnswerStats.map((stat, index) => (
                              <div key={stat.questionId} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                                <div className="flex items-start gap-2 mb-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                                    {index + 1}
                                  </span>
                                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 flex-1">
                                    {stat.questionText}
                                  </h4>
                                </div>
                                <div className="ml-8 space-y-2">
                                  {stat.optionCounts.map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center justify-between gap-3">
                                      <span className="text-sm sm:text-base text-gray-700 flex-1">
                                        {option.optionText}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-4 sm:h-5 overflow-hidden">
                                          <div
                                            className="bg-blue-500 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                                            style={{
                                              width: stat.totalAnswers > 0 
                                                ? `${(option.count / stat.totalAnswers) * 100}%` 
                                                : '0%',
                                            }}
                                          >
                                            {option.count > 0 && (
                                              <span className="text-xs font-bold text-white">
                                                {option.count}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-sm sm:text-base font-semibold text-gray-800 w-8 sm:w-10 text-right">
                                          {option.count}件
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs sm:text-sm text-gray-500">合計回答数</span>
                                      <span className="text-sm sm:text-base font-bold text-blue-600">
                                        {stat.totalAnswers}件
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 参加者ごとの回答 */}
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          参加者ごとの回答
                        </h3>
                        <div className="space-y-4">
                          {participantsDetail.map(participant => (
                      <div
                        key={participant.id}
                        className="border border-gray-200 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-gray-800">
                              {participant.name}
                            </span>
                            {participant.gender && (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                participant.gender === 'male' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : participant.gender === 'female' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {participant.gender === 'male' ? '男' : participant.gender === 'female' ? '女' : 'その他'}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            登録: {new Date(participant.created_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        {participant.answers.length === 0 ? (
                          <p className="text-sm text-gray-500">まだ回答はありません。</p>
                        ) : (
                          <ul className="space-y-2">
                            {participant.answers.map(answer => (
                              <li key={`${participant.id}-${answer.question_id}`} className="text-sm">
                                <span className="font-medium text-gray-700">
                                  {answer.question_text}
                                </span>
                                <span className="block text-gray-600">
                                  回答: {answer.selected_option_label}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setIsQuestionsExpanded(!isQuestionsExpanded)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">設定済みの質問</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      {existingQuestions.length}件の質問が登録されています
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className={`text-xs sm:text-sm font-medium transition-colors ${
                    isQuestionsExpanded ? 'text-purple-600' : 'text-gray-500'
                  }`}>
                    {isQuestionsExpanded ? '閉じる' : '開く'}
                  </span>
                  {isQuestionsExpanded ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  )}
                </div>
              </button>
              
              {isQuestionsExpanded && (
                <div className="mt-2 p-3 sm:p-4 md:p-6 bg-purple-50 border-2 border-purple-200 rounded-xl shadow-sm">
                  {existingQuestions.length === 0 ? (
                    <p className="text-gray-600">登録済みの質問はありません。</p>
                  ) : (
                    <div className="space-y-4">
                      {existingQuestions.map((question, index) => (
                        <div
                          key={question.id ?? index}
                          className="border border-gray-200 rounded-xl p-4"
                        >
                          {editingQuestionId === question.id ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  質問文
                                </label>
                                <input
                                  type="text"
                                  value={editingQuestionText}
                                  onChange={(e) => setEditingQuestionText(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  placeholder="質問を入力してください"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  選択肢
                                </label>
                                {editingQuestionOptions.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex gap-2 mb-2">
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...editingQuestionOptions];
                                        newOptions[optionIndex] = e.target.value;
                                        setEditingQuestionOptions(newOptions);
                                      }}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                      placeholder={`選択肢 ${optionIndex + 1}`}
                                    />
                                    {editingQuestionOptions.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newOptions = editingQuestionOptions.filter((_, i) => i !== optionIndex);
                                          setEditingQuestionOptions(newOptions);
                                        }}
                                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestionOptions([...editingQuestionOptions, ''])}
                                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                                >
                                  + 選択肢を追加
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!question.id || !eventId) return;
                                    try {
                                      const { error } = await (supabase.from('questions') as any)
                                        .update({
                                          question_text: editingQuestionText,
                                          options: editingQuestionOptions.filter(opt => opt.trim() !== ''),
                                        })
                                        .eq('id', question.id);
                                      
                                      if (error) throw error;
                                      
                                      setEditingQuestionId(null);
                                      setEditingQuestionText('');
                                      setEditingQuestionOptions([]);
                                      await refreshAdminData(eventId);
                                    } catch (err) {
                                      console.error('Error updating question:', err);
                                      alert('質問の更新に失敗しました。');
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                                >
                                  <Save className="w-4 h-4" />
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuestionId(null);
                                    setEditingQuestionText('');
                                    setEditingQuestionOptions([]);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-800 mb-2">
                                    質問 {index + 1}: {question.question_text}
                                  </h3>
                                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                    {question.options.map((option, optionIndex) => (
                                      <li key={`${question.id ?? index}-option-${optionIndex}`}>
                                        ・{option}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuestionId(question.id ?? null);
                                    setEditingQuestionText(question.question_text);
                                    setEditingQuestionOptions([...question.options]);
                                  }}
                                  className="ml-4 p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="編集"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">既存イベントを管理</h1>
          <p className="text-sm text-gray-600 mb-4">
            参加者向けの画面で共有したアクセスコードを入力すると、そのイベントの集計や設定を確認できます。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={accessCodeInput}
              onChange={e => setAccessCodeInput(e.target.value.toUpperCase())}
              placeholder="例: ABCD1234"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
            />
            <button
              onClick={loadExistingEvent}
              disabled={isLoadingEvent}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingEvent ? '読み込み中...' : 'イベントを読み込む'}
            </button>
          </div>
          {loadError && <p className="text-sm text-red-500 mt-3">{loadError}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">新規イベント作成</h2>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">イベント名</label>
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
              <h3 className="text-xl font-bold text-gray-800">質問設定</h3>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                質問を追加
              </button>
            </div>

            <div className="space-y-6">
              {newQuestions.map((question, qIndex) => (
                <div key={qIndex} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">質問 {qIndex + 1}</h4>
                    {newQuestions.length > 1 && (
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
                    <label className="block text-sm font-medium text-gray-700">選択肢</label>
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
