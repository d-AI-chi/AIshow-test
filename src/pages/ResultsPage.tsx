import { useEffect, useState } from 'react';
import { Heart, Sparkles, Trophy, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Match {
  id: string;
  name: string;
  compatibility_score: number;
  profile_image_url: string | null;
}

interface ResultsPageProps {
  participantId: string;
}

export function ResultsPage({ participantId }: ResultsPageProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [participantName, setParticipantName] = useState('');
  const [participantImage, setParticipantImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let eventId: string | null = null;
    
    const setupAndLoad = async () => {
      // 初回読み込み
      await loadResults();
      
      // 参加者のevent_idを取得
      const { data: participant } = await supabase
        .from('participants')
        .select('event_id')
        .eq('id', participantId)
        .single();

      if (!participant?.event_id) return;
      eventId = participant.event_id;

      // Supabase Realtimeでeventsテーブルのresults_visible変更を監視
      const eventsSubscription = supabase
        .channel(`events-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'events',
            filter: `id=eq.${eventId}`,
          },
          (payload) => {
            // results_visibleがtrueになったときのみ再読み込み
            if (payload.new.results_visible) {
              loadResults(false); // ローディング表示なしで更新
            }
          }
        )
        .subscribe();

      // match_resultsテーブルの変更も監視（is_hiddenの変更など）
      const matchResultsSubscription = supabase
        .channel(`match-results-${participantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'match_results',
            filter: `participant_id=eq.${participantId}`,
          },
          () => {
            // マッチ結果が更新されたときのみ再読み込み（ローディング表示なし）
            loadResults(false);
          }
        )
        .subscribe();

      // 定期的にresults_visibleをチェック（Realtimeが動作しない場合のフォールバック）
      const checkInterval = setInterval(async () => {
        if (!eventId) return;
        const { data: event } = await supabase
          .from('events')
          .select('results_visible')
          .eq('id', eventId)
          .single();
        
        if (event?.results_visible) {
          loadResults(false);
        }
      }, 3000);

      return () => {
        eventsSubscription.unsubscribe();
        matchResultsSubscription.unsubscribe();
        clearInterval(checkInterval);
      };
    };

    let cleanup: (() => void) | undefined;
    setupAndLoad().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [participantId]);

  const loadResults = async (showLoading = true) => {
    try {
      setError('');
      if (showLoading) {
        setIsLoading(true);
      }
      
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('name, profile_image_url, event_id')
        .eq('id', participantId)
        .single();

      if (participantError) {
        console.error('Participant error:', participantError);
        setError('参加者情報の取得に失敗しました。');
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }

      if (!participant) {
        setError('参加者情報が見つかりませんでした。');
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }

      setParticipantName(participant.name);
      setParticipantImage(participant.profile_image_url);

      // イベントの閾値を取得
      let matchThreshold = 85; // デフォルト値
      if (participant.event_id) {
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('match_threshold')
          .eq('id', participant.event_id)
          .maybeSingle();
        
        if (!eventError && event?.match_threshold !== null && event?.match_threshold !== undefined) {
          matchThreshold = Number(event.match_threshold);
        }
      }

      const { data: matchResults, error: matchError } = await supabase
        .from('match_results')
        .select(`
          id,
          compatibility_score,
          is_hidden,
          matched_participant:matched_participant_id (
            id,
            name,
            profile_image_url
          )
        `)
        .eq('participant_id', participantId)
        .order('compatibility_score', { ascending: false });

      if (matchError) {
        console.error('Match results error:', matchError);
        if (matchError.code === 'PGRST116' || matchError.message.includes('permission') || matchError.message.includes('row-level')) {
          setError('結果はまだ公開されていません。しばらくお待ちください。');
        } else {
          setError(`結果の取得に失敗しました: ${matchError.message}`);
        }
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }

      if (!matchResults || matchResults.length === 0) {
        setError('まだ結果が計算されていません。しばらくお待ちください。');
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }

      // 閾値以上のペアのみをフィルタリング（is_hiddenが明示的にfalseのもののみ）
      const formattedMatches = matchResults
        .filter((result: any) => 
          result.matched_participant && 
          result.is_hidden === false &&
          Number(result.compatibility_score) >= matchThreshold
        )
        .map((result: any) => ({
          id: result.matched_participant.id,
          name: result.matched_participant.name,
          compatibility_score: result.compatibility_score,
          profile_image_url: result.matched_participant.profile_image_url,
        }))
        .slice(0, 3);

      setMatches(formattedMatches);
      setError(''); // 成功時はエラーをクリア
    } catch (err: any) {
      console.error('Error loading results:', err);
      setError(`結果の読み込みに失敗しました: ${err?.message || '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4 shadow-lg animate-bounce">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <div className="mb-2">
            <p className="text-xs sm:text-sm font-bold text-rose-500 mb-1 tracking-wider animate-pulse">
              あいしょうしんだん
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-1">
              AI-Show 診断
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium mb-2">
              〜最も価値観が似ているペアは？〜
            </p>
            <p className="text-sm sm:text-base text-gray-600 px-2">
              {participantName}さんにぴったりのペアが見つかりました！
            </p>
          </div>
        </div>

        {error ? (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-center">
            <p className="text-sm sm:text-base text-gray-600">{error}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-center">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 animate-spin mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-600">
              結果を読み込み中です...
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {matches.map((match, index) => (
              <div
                key={match.id}
                className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-4 sm:p-6 md:p-8 hover:shadow-2xl sm:hover:shadow-3xl transition-all"
              >
                {index === 0 && (
                  <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-xs sm:text-sm font-bold mb-3 sm:mb-4">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>ペア成立！</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6 lg:gap-8">
                  {/* 自分のプロフィール */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="relative">
                      {participantImage ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-rose-500 shadow-lg sm:shadow-xl">
                          <img
                            src={participantImage}
                            alt={participantName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center border-4 border-rose-500 shadow-lg sm:shadow-xl">
                          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                            {participantName.charAt(0)}
                          </span>
                        </div>
                      )}
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2">
                          <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-amber-500 fill-current animate-pulse" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-800 text-center px-1 sm:px-2 truncate max-w-[80px] sm:max-w-[100px] md:max-w-[120px]">{participantName}</p>
                  </div>

                  {/* ハートアイコン */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="relative">
                      <Heart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-rose-500 fill-current animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-white drop-shadow-lg">
                          {Math.round(match.compatibility_score)}%
                        </span>
                      </div>
                    </div>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs md:text-sm text-gray-600 font-medium">相性度</p>
                  </div>

                  {/* マッチした相手のプロフィール */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="relative">
                      {match.profile_image_url ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-rose-500 shadow-lg sm:shadow-xl">
                          <img
                            src={match.profile_image_url}
                            alt={match.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center border-4 border-rose-500 shadow-lg sm:shadow-xl">
                          <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                            {match.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2">
                          <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-amber-500 fill-current animate-pulse" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-800 text-center px-1 sm:px-2 truncate max-w-[80px] sm:max-w-[100px] md:max-w-[120px]">{match.name}</p>
                  </div>
                </div>

                {index === 0 && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 text-center">
                    <p className="text-base sm:text-lg font-semibold text-rose-600 mb-1 sm:mb-2">
                      🎉 最高の相性です！ 🎉
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      ぜひお話ししてみてください
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 sm:mt-8 bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">
            診断について
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
            この診断結果は、アンケートの回答を基に計算されています。
            相性の良い方々と楽しく交流してください。
          </p>
        </div>
      </div>
    </div>
  );
}
