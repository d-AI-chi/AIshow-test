import { useEffect, useState, useRef } from 'react';
import { Heart, Trophy, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MatchPair {
  participantId: string;
  participantName: string;
  participantImage: string | null;
  matchedParticipantId: string;
  matchedParticipantName: string;
  matchedParticipantImage: string | null;
  score: number;
}

interface DisplayPageProps {
  eventId: string;
}

interface AnswerNotification {
  id: string;
  participantName: string;
  participantImage: string | null;
  timestamp: number;
}

export function DisplayPage({ eventId }: DisplayPageProps) {
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [matchThreshold, setMatchThreshold] = useState(85);
  const [notifications, setNotifications] = useState<AnswerNotification[]>([]);
  const processedAnswerIdsRef = useRef<Set<string>>(new Set());
  const notifiedParticipantsRef = useRef<Set<string>>(new Set());

  const checkForNewAnswers = async () => {
    try {
      // 質問数を取得
      const { data: questions } = await supabase
        .from('questions')
        .select('id')
        .eq('event_id', eventId);

      if (!questions || questions.length === 0) return;

      // 全参加者を取得
      const { data: participants } = await supabase
        .from('participants')
        .select('id, name, profile_image_url')
        .eq('event_id', eventId);

      if (!participants) return;

      // 各参加者の回答数を確認
      for (const participant of participants) {
        // 既に通知済みの参加者はスキップ
        if (notifiedParticipantsRef.current.has(participant.id)) continue;

        const { count: answerCount } = await supabase
          .from('answers')
          .select('*', { count: 'exact', head: true })
          .eq('participant_id', participant.id);

        // 全質問に回答した場合、通知を表示
        if (answerCount && answerCount >= questions.length) {
          notifiedParticipantsRef.current.add(participant.id);
          
          const notificationId = `notification-${Date.now()}-${Math.random()}`;
          setNotifications(prev => [...prev, {
            id: notificationId,
            participantName: participant.name,
            participantImage: participant.profile_image_url,
            timestamp: Date.now(),
          }]);

          console.log('Notification added via polling for:', participant.name);

          // 6秒後に通知を削除（ただし、notifiedParticipantsRefからは削除しない - 1人1回のみ表示するため）
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
          }, 6000);
        }
      }
    } catch (err) {
      console.error('Error checking for new answers:', err);
    }
  };

  useEffect(() => {
    loadDisplayData();
    loadInitialAnswers();
    checkForNewAnswers();

    // 定期的に更新（5秒ごと）
    const interval = setInterval(loadDisplayData, 5000);
    // 回答状況を定期的にチェック（2秒ごと）
    const answerCheckInterval = setInterval(checkForNewAnswers, 2000);

    // Realtimeで更新を監視
    const subscription = supabase
      .channel(`display-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results',
        },
        () => {
          loadDisplayData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        () => {
          loadDisplayData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'answers',
        },
        async (payload) => {
          console.log('Answer INSERT detected:', payload);
          // 新しい回答が追加されたとき
          const answer = payload.new as any;
          if (answer.participant_id && !processedAnswerIdsRef.current.has(answer.id)) {
            processedAnswerIdsRef.current.add(answer.id);
            
            // 参加者情報を取得
            const { data: participant } = await supabase
              .from('participants')
              .select('name, profile_image_url, event_id')
              .eq('id', answer.participant_id)
              .single();

            if (participant && participant.event_id === eventId) {
              console.log('Participant found:', participant.name);
              
              // この参加者の回答数を確認
              const { data: questions } = await supabase
                .from('questions')
                .select('id')
                .eq('event_id', eventId);

              const { count: answerCount } = await supabase
                .from('answers')
                .select('*', { count: 'exact', head: true })
                .eq('participant_id', answer.participant_id);

              console.log('Questions:', questions?.length, 'Answers:', answerCount);

              // 全質問に回答した場合のみ通知を表示
              if (questions && answerCount && answerCount >= questions.length) {
                // 既に通知済みの参加者かチェック（同じ参加者の通知は1回のみ）
                if (!notifiedParticipantsRef.current.has(participant.id)) {
                  notifiedParticipantsRef.current.add(participant.id);
                  
                  const notificationId = `notification-${Date.now()}-${Math.random()}`;
                  setNotifications(prev => [...prev, {
                    id: notificationId,
                    participantName: participant.name,
                    participantImage: participant.profile_image_url,
                    timestamp: Date.now(),
                  }]);

                  console.log('Notification added for:', participant.name);

                  // 6秒後に通知を削除（ただし、notifiedParticipantsRefからは削除しない - 1人1回のみ表示するため）
                  setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== notificationId));
                  }, 6000);
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      clearInterval(answerCheckInterval);
      subscription.unsubscribe();
    };
  }, [eventId]);

  const loadInitialAnswers = async () => {
    // 既存の回答IDを取得して、重複通知を防ぐ
    const { data: answers } = await supabase
      .from('answers')
      .select('id, participant_id')
      .eq('event_id', eventId);

    if (answers) {
      processedAnswerIdsRef.current = new Set(answers.map(a => a.id));
      
      // 既に全質問に回答した参加者を取得
      const { data: questions } = await supabase
        .from('questions')
        .select('id')
        .eq('event_id', eventId);

      if (questions) {
        const participantIds = new Set(answers.map(a => a.participant_id));
        for (const participantId of participantIds) {
          const { count } = await supabase
            .from('answers')
            .select('*', { count: 'exact', head: true })
            .eq('participant_id', participantId);
          
          if (count && count >= questions.length) {
            notifiedParticipantsRef.current.add(participantId);
          }
        }
      }
    }
  };

  const loadDisplayData = async () => {
    try {
      // イベント情報を取得
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('name, match_threshold, results_visible')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      if (!event) return;

      setEventName(event.name || '');
      setMatchThreshold(event.match_threshold ? Number(event.match_threshold) : 85);

      // 結果が公開されていない場合は何も表示しない
      if (!event.results_visible) {
        setMatchPairs([]);
        setIsLoading(false);
        return;
      }

      // マッチング結果を取得
      const { data: matchResults, error: matchError } = await (supabase
        .from('match_results')
        .select(`
          id,
          participant_id,
          matched_participant_id,
          compatibility_score,
          is_hidden,
          participant:participant_id (
            id,
            name,
            profile_image_url
          ),
          matched_participant:matched_participant_id (
            id,
            name,
            profile_image_url
          )
        `)
        .eq('event_id', eventId)
        .order('compatibility_score', { ascending: false }) as any);

      if (matchError) throw matchError;

      // フィルタリングとフォーマット
      const formattedPairs: MatchPair[] = [];
      const processedPairs = new Set<string>();

      for (const result of matchResults || []) {
        const participant = (result as any).participant;
        const matchedParticipant = (result as any).matched_participant;

        if (!participant || !matchedParticipant) continue;
        if ((result as any).is_hidden === true) continue;
        if (Number((result as any).compatibility_score) < matchThreshold) continue;

        // 重複を防ぐ（p1-p2とp2-p1は同じペア）
        const pairKey = [participant.id, matchedParticipant.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        formattedPairs.push({
          participantId: participant.id,
          participantName: participant.name,
          participantImage: participant.profile_image_url,
          matchedParticipantId: matchedParticipant.id,
          matchedParticipantName: matchedParticipant.name,
          matchedParticipantImage: matchedParticipant.profile_image_url,
          score: Number((result as any).compatibility_score),
        });
      }

      // スコア順にソート
      formattedPairs.sort((a, b) => b.score - a.score);

      setMatchPairs(formattedPairs);
    } catch (err: any) {
      console.error('Error loading display data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-rose-500 animate-pulse mx-auto mb-4" />
          <p className="text-xl text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 py-8 px-6 relative overflow-hidden">
      {/* 回答通知の吹き出し */}
      {notifications.map((notification, index) => {
        // 画面の異なる位置に配置（左から右へ、上から下へ）
        const positions = [
          { top: '5%', left: '5%' },
          { top: '15%', right: '5%' },
          { top: '25%', left: '10%' },
          { top: '35%', right: '10%' },
          { top: '45%', left: '15%' },
        ];
        const position = positions[index % positions.length];
        
        return (
          <div
            key={notification.id}
            className="fixed z-50"
            style={{
              ...position,
              animation: 'slideInBounce 0.6s ease-out',
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 flex items-center gap-4 border-4 border-rose-500 animate-bounce max-w-sm">
              <div className="flex-shrink-0">
                {notification.participantImage ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-rose-500">
                    <img
                      src={notification.participantImage}
                      alt={notification.participantName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center border-2 border-rose-500">
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {notification.participantName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                  {notification.participantName}さん
                </div>
                <div className="text-base sm:text-lg text-rose-600 font-semibold">
                  回答完了しました！✨
                </div>
              </div>
              <div className="text-3xl sm:text-4xl flex-shrink-0">🎉</div>
            </div>
          </div>
        );
      })}

      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4 shadow-lg">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <div className="mb-2">
            <p className="text-lg font-bold text-rose-500 mb-1 tracking-wider">
              あいしょうしんだん
            </p>
            <h1 className="text-5xl font-bold text-gray-800 mb-2">
              AI-Show 診断
            </h1>
            <p className="text-2xl text-gray-600 font-medium mb-2">
              〜最も価値観が似ているペアは？〜
            </p>
            {eventName && (
              <p className="text-xl text-gray-500">{eventName}</p>
            )}
          </div>
        </div>

        {/* マッチング結果 */}
        {matchPairs.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <p className="text-2xl text-gray-600">
              まだ結果が公開されていません
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchPairs.map((pair, index) => (
              <div
                key={`${pair.participantId}-${pair.matchedParticipantId}`}
                className="bg-white rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition-all transform hover:scale-[1.02]"
              >
                {index === 0 && (
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-lg font-bold mb-4">
                      <Sparkles className="w-6 h-6" />
                      <span>最高の相性！</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center gap-6">
                  {/* 参加者1 */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      {pair.participantImage ? (
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-xl">
                          <img
                            src={pair.participantImage}
                            alt={pair.participantName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center border-4 border-rose-500 shadow-xl">
                          <span className="text-6xl font-bold text-white">
                            {pair.participantName.charAt(0)}
                          </span>
                        </div>
                      )}
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2">
                          <Sparkles className="w-12 h-12 text-amber-500 fill-current animate-pulse" />
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-xl font-bold text-gray-800">{pair.participantName}</p>
                  </div>

                  {/* ハートアイコン */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Heart className="w-20 h-20 text-rose-500 fill-current animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white drop-shadow-lg">
                          {Math.round(pair.score)}%
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-base text-gray-600 font-medium">相性度</p>
                  </div>

                  {/* 参加者2 */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      {pair.matchedParticipantImage ? (
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-xl">
                          <img
                            src={pair.matchedParticipantImage}
                            alt={pair.matchedParticipantName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center border-4 border-rose-500 shadow-xl">
                          <span className="text-6xl font-bold text-white">
                            {pair.matchedParticipantName.charAt(0)}
                          </span>
                        </div>
                      )}
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2">
                          <Sparkles className="w-12 h-12 text-amber-500 fill-current animate-pulse" />
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-xl font-bold text-gray-800">{pair.matchedParticipantName}</p>
                  </div>
                </div>

                {index === 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                    <p className="text-xl font-semibold text-rose-600 mb-2">
                      🎉 最高の相性です！ 🎉
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

