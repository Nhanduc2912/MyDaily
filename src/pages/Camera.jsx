import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import dayjs, { getMyDailyDate } from '@/lib/dayjs'
import { VISIBILITY_LABELS } from '@/lib/constants'
import { X, Camera as CamIcon, RotateCcw, Check, ChevronDown, Lock, Users, Globe, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Camera() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [showEditor, setShowEditor] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Editor state
  const [themes, setThemes] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [customTitle, setCustomTitle] = useState('')
  const [visibility, setVisibility] = useState('private')

  useEffect(() => {
    startCamera()
    loadThemes()
    return () => stopCamera()
  }, [facingMode])

  const startCamera = async () => {
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err) {
      toast.error('Không thể truy cập camera. Vui lòng cấp quyền.')
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }

  const loadThemes = async () => {
    const currentHour = dayjs().hour()
    const { data: slots } = await supabase
      .from('theme_time_slots')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (slots) {
      setTimeSlots(slots)
      const currentSlot = slots.find(s => {
        if (s.start_hour < s.end_hour) return currentHour >= s.start_hour && currentHour < s.end_hour
        return currentHour >= s.start_hour || currentHour < s.end_hour
      })

      if (currentSlot) {
        const { data: themeData } = await supabase
          .from('themes')
          .select('*')
          .eq('time_slot_id', currentSlot.id)
          .eq('state', 'active')
          .eq('is_deleted', false)

        if (themeData) setThemes(themeData)
      }
    }
  }

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(imageData)
    setShowEditor(true)
    stopCamera()
  }, [facingMode])

  const retake = () => {
    setCapturedImage(null)
    setShowEditor(false)
    startCamera()
  }

  const upload = async () => {
    if (!capturedImage || !profile?.id) return

    setUploading(true)
    try {
      // Convert base64 to blob
      const res = await fetch(capturedImage)
      const blob = await res.blob()
      const fileName = `${profile.id}/${Date.now()}.jpg`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, blob, { contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName)

      // Create/get daily page
      const pageDate = getMyDailyDate()
      let { data: page } = await supabase
        .from('daily_pages')
        .select('id')
        .eq('user_id', profile.id)
        .eq('page_date', pageDate)
        .maybeSingle()

      if (!page) {
        const { data: newPage, error: pageError } = await supabase
          .from('daily_pages')
          .upsert(
            { user_id: profile.id, page_date: pageDate, is_deleted: false, deleted_at: null },
            { onConflict: 'user_id,page_date' }
          )
          .select('id')
          .single()

        if (pageError) throw pageError
        page = newPage
      }

      // Get current time slot
      const currentHour = dayjs().hour()
      const currentSlot = timeSlots.find(s => {
        if (s.start_hour < s.end_hour) return currentHour >= s.start_hour && currentHour < s.end_hour
        return currentHour >= s.start_hour || currentHour < s.end_hour
      })

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          page_id: page.id,
          user_id: profile.id,
          image_url: publicUrl,
          image_path: fileName,
          taken_at: new Date().toISOString(),
          time_slot_id: currentSlot?.id || null,
          theme_id: selectedTheme?.id || null,
          custom_title: customTitle || null,
          visibility,
        })

      if (postError) throw postError

      toast.success('Đã đăng ảnh! 📸')
      navigate(`/day/${pageDate}`)
    } catch (err) {
      toast.error(err.message || 'Lỗi khi đăng ảnh')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const visibilityIcon = {
    private: <Lock size={14} />,
    friends: <Users size={14} />,
    public: <Globe size={14} />,
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col max-w-[480px] mx-auto">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera / Captured View */}
      <div className="flex-1 relative overflow-hidden">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <Loader2 size={32} className="text-white animate-spin" />
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => { stopCamera(); navigate(-1) }}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center tap-highlight"
          >
            <X size={20} className="text-white" />
          </button>
          <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-white text-xs font-semibold">
            {dayjs().format('HH:mm')}
          </div>
        </div>
      </div>

      {/* Controls */}
      {!showEditor ? (
        <div className="bg-black px-6 py-6 safe-bottom">
          <div className="flex items-center justify-center gap-8">
            <div className="w-12" />
            <button
              onClick={capture}
              disabled={!cameraReady}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center tap-highlight disabled:opacity-40"
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
            <button
              onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center tap-highlight"
            >
              <RotateCcw size={20} className="text-white" />
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-white rounded-t-3xl px-5 pt-5 pb-6 safe-bottom max-h-[55vh] overflow-y-auto"
        >
          {/* Theme Picker */}
          <h3 className="text-sm font-bold text-gray-800 mb-3">Chọn chủ đề</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(selectedTheme?.id === theme.id ? null : theme)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors tap-highlight ${
                  selectedTheme?.id === theme.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {theme.icon} {theme.name_vi}
              </button>
            ))}
            {themes.length === 0 && (
              <p className="text-xs text-gray-400">Không có chủ đề cho khung giờ này</p>
            )}
          </div>

          {/* Custom Title */}
          <div className="mb-4">
            <label className="text-sm font-bold text-gray-800 mb-1.5 block">Tiêu đề</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Nhập tiêu đề (tuỳ chọn)"
              className="input-base"
              maxLength={100}
            />
          </div>

          {/* Visibility */}
          <div className="mb-5">
            <label className="text-sm font-bold text-gray-800 mb-2 block">Ai có thể xem?</label>
            <div className="flex gap-2">
              {Object.entries(VISIBILITY_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setVisibility(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors tap-highlight ${
                    visibility === key
                      ? 'bg-orange-50 text-orange-600 border-2 border-orange-200'
                      : 'bg-gray-50 text-gray-500 border-2 border-transparent'
                  }`}
                >
                  {visibilityIcon[key]}
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex-1 btn btn-secondary rounded-2xl py-3"
            >
              <RotateCcw size={16} /> Chụp lại
            </button>
            <button
              onClick={upload}
              disabled={uploading}
              className="flex-1 btn btn-primary rounded-2xl py-3 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Check size={16} /> Đăng
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
