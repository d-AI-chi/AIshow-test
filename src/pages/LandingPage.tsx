import { useState } from 'react';
import { Heart, Users, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LandingPageProps {
  onJoinEvent: (eventId: string, participantId: string) => void;
}

export function LandingPage({ onJoinEvent }: LandingPageProps) {
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('画像サイズは5MB以下にしてください。');
        return;
      }
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!event) {
        setError('現在アクティブなイベントがありません。');
        setIsLoading(false);
        return;
      }

      let imageUrl = null;

      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, profileImage);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          event_id: event.id,
          name: name.trim(),
          profile_image_url: imageUrl,
        })
        .select()
        .single();

      if (participantError) throw participantError;

      onJoinEvent(event.id, participant.id);
    } catch (err) {
      console.error('Error joining event:', err);
      setError('参加に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-500 rounded-full mb-4 shadow-lg">
            <Heart className="w-10 h-10 text-white fill-current" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            相性診断ゲーム
          </h1>
          <p className="text-gray-600">
            あなたにぴったりの相手を見つけよう
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                お名前（ニックネーム可）
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                placeholder="例: たろう"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プロフィール画像（任意）
              </label>

              {!previewUrl ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">画像をアップロード</span>
                  <span className="text-xs text-gray-500 mt-1">最大5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="プロフィール画像"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              {isLoading ? '参加中...' : 'イベントに参加'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
