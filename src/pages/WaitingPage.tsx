import { useEffect, useState } from 'react';
import { Clock, Users, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WaitingPageProps {
  eventId: string;
  onResultsReady: () => void;
}

export function WaitingPage({ eventId, onResultsReady }: WaitingPageProps) {
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    loadParticipantCount();
    checkResultsVisibility();

    const subscription = supabase
      .channel(`event-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Event update received:', payload);
          if (payload.new.results_visible) {
            console.log('Results visible changed to true, calling onResultsReady');
            onResultsReady();
          }
        }
      )
      .subscribe();

    const participantInterval = setInterval(loadParticipantCount, 5000);
    // より頻繁にチェック（1秒ごと）
    const resultsInterval = setInterval(checkResultsVisibility, 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(participantInterval);
      clearInterval(resultsInterval);
    };
  }, [eventId, onResultsReady]);

  const checkResultsVisibility = async () => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('results_visible')
        .eq('id', eventId)
        .single();

      if (!error && event && event.results_visible) {
        onResultsReady();
      }
    } catch (err) {
      console.error('Error checking results visibility:', err);
    }
  };

  const loadParticipantCount = async () => {
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (count !== null) {
      setParticipantCount(count);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mb-4 sm:mb-6 shadow-lg animate-pulse">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">
            回答ありがとうございます
          </h1>

          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-2">
            相性診断の結果を計算中です。司会者の合図までお待ちください。
          </p>

          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
              <span className="text-2xl sm:text-3xl font-bold text-rose-600">{participantCount}</span>
              <span className="text-sm sm:text-base text-gray-600">人</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">参加中</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500 px-2">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>結果が発表されるまでお待ちください</span>
          </div>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-500">
              このページは自動的に更新されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
