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

    const subscription = supabase
      .channel('event-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.new.results_visible) {
            onResultsReady();
          }
        }
      )
      .subscribe();

    const interval = setInterval(loadParticipantCount, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [eventId, onResultsReady]);

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
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mb-6 shadow-lg animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            回答ありがとうございます
          </h1>

          <p className="text-gray-600 mb-8">
            相性診断の結果を計算中です。司会者の合図までお待ちください。
          </p>

          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-6 h-6 text-rose-500" />
              <span className="text-3xl font-bold text-rose-600">{participantCount}</span>
              <span className="text-gray-600">人</span>
            </div>
            <p className="text-sm text-gray-600">参加中</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>結果が発表されるまでお待ちください</span>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              このページは自動的に更新されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
