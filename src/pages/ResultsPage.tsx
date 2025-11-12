import { useEffect, useState } from 'react';
import { Heart, Sparkles, Trophy, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    loadResults();
  }, [participantId]);

  const loadResults = async () => {
    try {
      const { data: participant } = await supabase
        .from('participants')
        .select('name')
        .eq('id', participantId)
        .single();

      if (participant) {
        setParticipantName(participant.name);
      }

      const { data: matchResults, error } = await supabase
        .from('match_results')
        .select(`
          id,
          compatibility_score,
          matched_participant:matched_participant_id (
            id,
            name,
            profile_image_url
          )
        `)
        .eq('participant_id', participantId)
        .order('compatibility_score', { ascending: false })
        .limit(3);

      if (error) throw error;

      const formattedMatches = matchResults.map((result: any) => ({
        id: result.matched_participant.id,
        name: result.matched_participant.name,
        compatibility_score: result.compatibility_score,
        profile_image_url: result.matched_participant.profile_image_url,
      }));

      setMatches(formattedMatches);
    } catch (err) {
      console.error('Error loading results:', err);
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
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4 shadow-lg animate-bounce">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            診断結果
          </h1>
          <p className="text-gray-600">
            {participantName}さんと相性の良い方々
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-gray-600">
              まだ結果が計算されていません。しばらくお待ちください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, index) => (
              <div
                key={match.id}
                className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
              >
                <div className="flex items-center gap-6">
                  <div className="relative flex-shrink-0">
                    {match.profile_image_url ? (
                      <>
                        <img
                          src={match.profile_image_url}
                          alt={match.name}
                          className="w-24 h-24 rounded-full object-cover shadow-lg"
                        />
                        {index === 0 && (
                          <div className="absolute -top-2 -right-2">
                            <Sparkles className="w-8 h-8 text-amber-500 fill-current" />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {index === 0 ? (
                          <>
                            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-4xl font-bold text-white">
                                {match.name.charAt(0)}
                              </span>
                            </div>
                            <div className="absolute -top-2 -right-2">
                              <Sparkles className="w-8 h-8 text-amber-500 fill-current" />
                            </div>
                          </>
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-4xl font-bold text-white">
                              {match.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                      <span className="text-sm font-bold text-gray-700">{index + 1}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {match.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500 fill-current" />
                      <span className="text-gray-600">相性度</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-center">
                    <div className="text-5xl font-bold bg-gradient-to-br from-rose-500 to-pink-600 bg-clip-text text-transparent">
                      {Math.round(match.compatibility_score)}%
                    </div>
                  </div>
                </div>

                {index === 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-center text-sm text-gray-600">
                      最高の相性です！ぜひお話ししてみてください
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            診断について
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            この診断結果は、アンケートの回答を基に計算されています。
            相性の良い方々と楽しく交流してください。
          </p>
        </div>
      </div>
    </div>
  );
}
