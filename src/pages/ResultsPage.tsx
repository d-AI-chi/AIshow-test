import { useEffect, useState } from 'react';
import { Heart, Sparkles, Trophy, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Match {
  id: string;
  name: string;
  compatibility_score: number;
  profile_image_url: string | null;
  participantId: string;
  participantName: string;
  participantImage: string | null;
  matchedParticipantId: string;
  matchedParticipantName: string;
  matchedParticipantImage: string | null;
  isMyMatch: boolean; // 自分が含まれるペアかどうか
  isTopScore?: boolean; // 最高スコアのペアかどうか
}

interface ResultsPageProps {
  participantId: string;
}

interface ParticipantSlide {
  id: string;
  name: string;
  profileImage: string | null;
}

export function ResultsPage({ participantId }: ResultsPageProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [participantName, setParticipantName] = useState('');
  const [participantImage, setParticipantImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [resultsVisible, setResultsVisible] = useState(false); // results_visibleの状態を管理
  const [participants, setParticipants] = useState<ParticipantSlide[]>([]); // スライドショー用の参加者リスト
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0); // 現在のスライドインデックス
  const [prevSlideIndex, setPrevSlideIndex] = useState<number | null>(null); // 前のスライドインデックス

  useEffect(() => {
    let eventId: string | null = null;
    let subscription: any = null;
    
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

      // Realtimeでeventsテーブルの更新を監視
      // results_visibleやmatch_thresholdが変更されたときに再読み込み
      const channelName = `results-${eventId}`;
      subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'events',
            filter: `id=eq.${eventId}`,
          },
          async (payload) => {
            console.log('Event updated (ResultsPage):', payload);
            const newResultsVisible = (payload.new as any).results_visible;
            
            // 即座にresultsVisibleの状態を更新
            setResultsVisible(newResultsVisible === true);
            
            // ユーザー側では結果を表示しないため、常に再読み込み（エラーメッセージを表示）
            await loadResults(false);
          }
        )
        .subscribe((status) => {
          console.log('Subscription status (ResultsPage):', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to events table updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel subscription error');
          }
        });
    };

    setupAndLoad();

    return () => {
      if (subscription) {
        console.log('Unsubscribing from events table updates');
        subscription.unsubscribe();
      }
    };
  }, [participantId]);

  // スライドショーの自動切り替え
  useEffect(() => {
    if (participants.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        setPrevSlideIndex(prev); // 前のスライドインデックスを保存
        return (prev + 1) % participants.length;
      });
    }, 3000); // 3秒ごとに切り替え

    return () => clearInterval(interval);
  }, [participants]);

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
        setMatches([]);
        setResultsVisible(false);
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }

      if (!participant) {
        setError('参加者情報が見つかりませんでした。');
        setMatches([]);
        setResultsVisible(false);
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }

        setParticipantName(participant.name);
      setParticipantImage(participant.profile_image_url);

      // イベント情報を取得（閾値と公開状態を確認）
      let matchThreshold = 85; // デフォルト値
      let currentResultsVisible = false;
      if (participant.event_id) {
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('match_threshold, results_visible')
          .eq('id', participant.event_id)
          .maybeSingle();
        
        if (!eventError && event) {
          if (event.match_threshold !== null && event.match_threshold !== undefined) {
            matchThreshold = Number(event.match_threshold);
          }
          currentResultsVisible = event.results_visible === true;
        }
      }

      // results_visibleの状態を更新
      setResultsVisible(currentResultsVisible);

      // 参加者一覧を取得してスライドショー用に設定
      if (participant.event_id) {
        const { data: allParticipants, error: participantsError } = await supabase
          .from('participants')
          .select('id, name, profile_image_url')
          .eq('event_id', participant.event_id)
          .order('created_at', { ascending: true });

        if (!participantsError && allParticipants) {
          const slides: ParticipantSlide[] = allParticipants.map(p => ({
            id: p.id,
            name: p.name,
            profileImage: p.profile_image_url,
          }));
          setParticipants(slides);
        }
      }

      // ユーザー側では結果を表示しない（大画面モニターのみで表示）
      setMatches([]);
      setError('');
      setIsLoading(false);
      return;

      // イベント全体のマッチング結果を取得（自分以外同士のペアも含む）
      const { data: matchResults, error: matchError } = await supabase
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
        .eq('event_id', participant.event_id)
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

      // フィルタリングとフォーマット（重複を防ぐ）
      const formattedMatches: Match[] = [];
      const processedPairs = new Set<string>();

      for (const result of matchResults) {
        const participantData = (result as any).participant;
        const matchedParticipantData = (result as any).matched_participant;

        // 必須チェック
        if (!participantData || !matchedParticipantData) continue;
        
        // 同じ人同士のペアを除外
        if (participantData.id === matchedParticipantData.id) continue;
        
        // 非表示ペアを除外
        if ((result as any).is_hidden === true) continue;
        
        // 閾値未満のペアを除外
        const score = Number((result as any).compatibility_score);
        if (isNaN(score) || score < matchThreshold) continue;

        // 重複を防ぐ（p1-p2とp2-p1は同じペア）
        // IDをソートして一意のキーを生成
        const pairKey = [participantData.id, matchedParticipantData.id]
          .sort()
          .join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // 自分が含まれるペアかどうかを判定
        const isMyMatch = participantData.id === participantId || matchedParticipantData.id === participantId;

        formattedMatches.push({
          id: pairKey, // 重複防止のためのID
          name: isMyMatch 
            ? (participantData.id === participantId ? matchedParticipantData.name : participantData.name)
            : `${participantData.name} & ${matchedParticipantData.name}`,
          compatibility_score: score, // 数値変換済みのスコアを使用
          profile_image_url: isMyMatch
            ? (participantData.id === participantId ? matchedParticipantData.profile_image_url : participantData.profile_image_url)
            : null, // 自分が含まれない場合は個別の画像は使わない
          participantId: participantData.id,
          participantName: participantData.name,
          participantImage: participantData.profile_image_url,
          matchedParticipantId: matchedParticipantData.id,
          matchedParticipantName: matchedParticipantData.name,
          matchedParticipantImage: matchedParticipantData.profile_image_url,
          isMyMatch: isMyMatch,
        });
      }

      // 最高スコアを計算（ソート前に計算して、isMyMatchの影響を受けないようにする）
      const maxScore = formattedMatches.length > 0 
        ? Math.max(...formattedMatches.map(m => m.compatibility_score))
        : 0;

      // スコア順にソート（自分のマッチを優先的に表示）
      formattedMatches.sort((a, b) => {
        if (a.isMyMatch && !b.isMyMatch) return -1;
        if (!a.isMyMatch && b.isMyMatch) return 1;
        return b.compatibility_score - a.compatibility_score;
      });

      // 最高スコアのフラグを設定（同率1位も含む）
      setMatches(formattedMatches.map(match => ({
        ...match,
        isTopScore: match.compatibility_score === maxScore, // 最高スコアかどうかのフラグ
      })));
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
              マッチング結果が公開されました！
          </p>
          </div>
        </div>

        {/* ユーザー側では結果を表示しない（大画面モニターのみで表示） */}
        {/* 参加者のプロフィール画像をスライドショー形式で表示 */}
        {participants.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10">
            <div className="text-center mb-6">
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-2">
                参加者のみなさん
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                結果は大画面モニターでご確認ください
              </p>
            </div>
            <div className="relative w-full max-w-2xl mx-auto overflow-hidden" style={{ height: 'min(400px, 90vw)' }}>
              {/* 右から左へ流れるスライドショー */}
              <div className="relative w-full h-full">
                {participants.map((participant, index) => {
                  const isActive = index === currentSlideIndex;
                  const isPrev = index === prevSlideIndex;
                  
                  // アクティブなスライドと前のスライドのみ表示
                  if (!isActive && !isPrev) {
                    return null;
                  }
                  
                  // 前のスライドは左に流れていくアニメーション
                  if (isPrev && !isActive) {
                    return (
                      <div
                        key={`${participant.id}-prev-${prevSlideIndex}`}
                        className="absolute inset-0 flex flex-col items-center justify-center z-0"
                        style={{
                          animation: 'slideOutToLeft 1s ease-in forwards',
                        }}
                        onAnimationEnd={() => {
                          // アニメーション終了後に前のスライドをクリア
                          if (prevSlideIndex !== null && prevSlideIndex === index) {
                            setPrevSlideIndex(null);
                          }
                        }}
                      >
                        <div className="aspect-square rounded-full overflow-hidden border-4 border-rose-500 shadow-2xl mb-3 sm:mb-4" style={{ width: 'min(300px, 80vw)' }}>
                          {participant.profileImage ? (
                            <img
                              src={participant.profileImage}
                              alt={participant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                              <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-white">
                                {participant.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 text-center px-2">
                          {participant.name}
                        </p>
                      </div>
                    );
                  }
                  
                  // アクティブなスライドは右から入ってくるアニメーション
                  return (
                    <div
                      key={`${participant.id}-${currentSlideIndex}`}
                      className="absolute inset-0 flex flex-col items-center justify-center z-10"
                      style={{
                        animation: 'slideInFromRight 1s ease-out forwards, float 3s ease-in-out 1s infinite',
                      }}
                    >
                      <div className="aspect-square rounded-full overflow-hidden border-4 border-rose-500 shadow-2xl mb-3 sm:mb-4" style={{ width: 'min(300px, 80vw)' }}>
                        {participant.profileImage ? (
                          <img
                            src={participant.profileImage}
                            alt={participant.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                            <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-white">
                              {participant.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 text-center px-2">
                        {participant.name}
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* インジケーター */}
              <div className="mt-6 text-center relative z-20">
                <div className="mt-3 flex justify-center gap-2">
                  {participants.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setPrevSlideIndex(currentSlideIndex);
                        setCurrentSlideIndex(index);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlideIndex
                          ? 'bg-rose-500 w-8'
                          : 'bg-gray-300 hover:bg-gray-400 w-2'
                      }`}
                      aria-label={`スライド ${index + 1}`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs sm:text-sm text-gray-500">
                  {currentSlideIndex + 1} / {participants.length}
                </p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-center">
            <p className="text-sm sm:text-base text-gray-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-center">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 animate-spin mx-auto mb-4" />
            <p className="text-sm sm:text-base text-gray-600">
              読み込み中...
            </p>
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
