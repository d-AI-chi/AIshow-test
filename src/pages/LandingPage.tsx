import { useState, useRef, useEffect } from 'react';
import { Heart, Users, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LandingPageProps {
  onJoinEvent: (eventId: string, participantId: string) => void;
  onOpenAdmin: () => void;
}

export function LandingPage({ onJoinEvent, onOpenAdmin }: LandingPageProps) {
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageZoom, setImageZoom] = useState(1.0);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistanceRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [isCheckingAdminCode, setIsCheckingAdminCode] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('画像サイズは5MB以下にしてください。');
        return;
      }
      setProfileImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setImageZoom(1.0);
      setImagePosition({ x: 0, y: 0 });
      setIsEditingImage(true);
      setError('');
    }
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (!isEditingImage) return;
    setIsDragging(true);
    setDragStart({
      x: clientX - imagePosition.x,
      y: clientY - imagePosition.y,
    });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !isEditingImage || !containerRef.current) return;
    const containerSize = containerRef.current.offsetWidth;
    const maxOffset = containerSize * 0.5; // コンテナサイズに応じて調整

    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;

    setImagePosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // マウスイベント
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // タッチイベント（携帯対応）
  const lastTouchDistanceRef = useRef<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      // 単一タッチ：ドラッグ
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
      lastTouchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      // 2本指：ピンチズーム
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchDistanceRef.current = distance;
      setIsDragging(false); // ズーム中はドラッグを無効化
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && !lastTouchDistanceRef.current) {
      // 単一タッチ：ドラッグ
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      // 2本指：ピンチズーム
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (lastTouchDistanceRef.current !== null) {
        const scaleChange = distance / lastTouchDistanceRef.current;
        setImageZoom(prev => {
          const newZoom = prev * scaleChange;
          return Math.max(0.5, Math.min(3.0, newZoom));
        });
      }
      lastTouchDistanceRef.current = distance;
    }
  };

  const handleTouchEnd = () => {
    handleEnd();
    lastTouchDistanceRef.current = null;
  };

  const handleConfirmImage = async () => {
    if (!profileImage || !previewUrl) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // ズームを適用したスケール計算
      const baseScale = Math.max(img.width / size, img.height / size);
      const finalScale = baseScale / imageZoom;
      const scaledWidth = img.width / finalScale;
      const scaledHeight = img.height / finalScale;

      // 位置調整を適用（調整画面のサイズ300pxと実際のサイズ400pxの比率を考慮）
      const displaySize = 300;
      const scaleRatio = size / displaySize; // 400 / 300 = 1.33
      
      // 中央に配置し、位置調整を適用
      const offsetX = (size - scaledWidth) / 2 + imagePosition.x * scaleRatio;
      const offsetY = (size - scaledHeight) / 2 + imagePosition.y * scaleRatio;

      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], profileImage.name, { type: 'image/png' });
          setProfileImage(file);
          const newUrl = URL.createObjectURL(blob);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(newUrl);
          setIsEditingImage(false);
          setImageZoom(1.0);
          setImagePosition({ x: 0, y: 0 });
        }
      }, 'image/png', 0.95);
    };
    img.src = previewUrl;
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleAdminCodeSubmit = async () => {
    if (!adminCodeInput.trim()) {
      setAdminError('管理者コードを入力してください。');
      return;
    }

    setIsCheckingAdminCode(true);
    setAdminError('');

    try {
      // 全てのイベントを取得して、admin_codeが一致するものを探す
      const { data: events, error } = await supabase
        .from('events')
        .select('id, admin_code')
        .eq('is_active', true);

      if (error) throw error;

      const matchingEvent = events?.find(
        event => event.admin_code && event.admin_code.trim() === adminCodeInput.trim()
      );

      if (!matchingEvent) {
        setAdminError('管理者コードが正しくありません。');
        setIsCheckingAdminCode(false);
        return;
      }

      // コードが正しければ管理者ページに遷移
      setShowAdminModal(false);
      setAdminCodeInput('');
      onOpenAdmin();
    } catch (err: any) {
      console.error('Error checking admin code:', err);
      setAdminError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsCheckingAdminCode(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!accessCode.trim()) {
        setError('イベントコードを入力してください。');
        setIsLoading(false);
        return;
      }

      if (!gender) {
        setError('性別を選択してください。');
        setIsLoading(false);
        return;
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('access_code', accessCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!event) {
        setError('イベントコードが正しくないか、イベントがアクティブではありません。');
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
          gender: gender,
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
          <div className="mb-2">
            <p className="text-xs sm:text-sm font-bold text-rose-500 mb-1 tracking-wider animate-pulse">
              あいしょうしんだん
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-1">
              AI-Show 診断
          </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium">
              〜最も価値観が似ているペアは？〜
          </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <form onSubmit={handleJoin} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                イベントコード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all font-mono"
                placeholder="例: ABC12345"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                お名前（ニックネーム可） <span className="text-red-500">*</span>
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
                性別 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-rose-50 hover:border-rose-400">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${gender === 'male' ? 'text-rose-600' : 'text-gray-600'}`}>
                    男
                  </span>
                </label>
                <label className="flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-rose-50 hover:border-rose-400">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${gender === 'female' ? 'text-rose-600' : 'text-gray-600'}`}>
                    女
                  </span>
                </label>
                <label className="flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-rose-50 hover:border-rose-400">
                  <input
                    type="radio"
                    name="gender"
                    value="other"
                    checked={gender === 'other'}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${gender === 'other' ? 'text-rose-600' : 'text-gray-600'}`}>
                    その他
                  </span>
                </label>
              </div>
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
              ) : isEditingImage ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 text-center mb-4">
                      ズームと位置を調整して画像の表示範囲を決めてください
                      <br />
                      <span className="text-xs text-gray-500">
                        💡 1本指でドラッグ、2本指でピンチズーム
                      </span>
                    </p>
                    <div 
                      ref={containerRef}
                      className="relative mx-auto bg-white rounded-full shadow-2xl cursor-move touch-none" 
                      style={{ width: 'min(300px, 80vw)', height: 'min(300px, 80vw)' }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-rose-500 shadow-inner">
                        <img
                          ref={imageRef}
                          src={previewUrl}
                          alt="プロフィール画像"
                          className="w-full h-full object-cover select-none pointer-events-none"
                          style={{
                            transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                            transformOrigin: 'center center',
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>
                    <div className="mt-6 px-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                        ズーム: {Math.round(imageZoom * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={imageZoom}
                        onChange={(e) => setImageZoom(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>縮小</span>
                        <span>拡大</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={handleConfirmImage}
                      className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors shadow-lg"
                    >
                      この画像で決定
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingImage(false);
                        setImageZoom(1.0);
                      }}
                      className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-rose-500 shadow-lg">
                  <img
                    src={previewUrl}
                    alt="プロフィール画像"
                    className="w-full h-full object-cover"
                  />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingImage(true)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      編集
                    </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                      削除
                  </button>
                  </div>
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

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="text-sm text-gray-500 hover:text-rose-500 underline transition-colors"
            >
              管理者の方はこちら
            </button>
          </div>
        </div>
      </div>

      {/* 管理者コード入力モーダル */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
              管理者コードを入力
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              管理者ページにアクセスするには、管理者コードが必要です。
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="adminCode" className="block text-sm font-medium text-gray-700 mb-2">
                  管理者コード
                </label>
                <input
                  type="text"
                  id="adminCode"
                  value={adminCodeInput}
                  onChange={(e) => {
                    setAdminCodeInput(e.target.value);
                    setAdminError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAdminCodeSubmit();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all font-mono"
                  placeholder="管理者コードを入力"
                  autoFocus
                />
              </div>
              {adminError && (
                <p className="text-sm text-red-600">{adminError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminModal(false);
                    setAdminCodeInput('');
                    setAdminError('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleAdminCodeSubmit}
                  disabled={isCheckingAdminCode || !adminCodeInput.trim()}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCheckingAdminCode ? '確認中...' : '送信'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
