import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Camera, CheckSquare, Users, Flame, Share2, Shield, ChevronRight, Star } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const features = [
  {
    icon: Camera,
    title: 'Chụp ảnh theo khung giờ',
    desc: 'Ghi lại mỗi khoảnh khắc từ sáng sớm đến đêm khuya',
    color: '#f97316',
    bg: '#fff7ed',
  },
  {
    icon: CheckSquare,
    title: 'To-do & Ghi chú',
    desc: 'Lên kế hoạch, quản lý việc cần làm mỗi ngày',
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    icon: Flame,
    title: 'Streak & Huy hiệu',
    desc: 'Xây dựng thói quen tốt, nhận huy hiệu độc đáo',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  {
    icon: Users,
    title: 'Kết bạn & Tương tác',
    desc: 'Xem ngày của bạn bè, thả react động viên nhau',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    icon: Share2,
    title: 'Chia sẻ dễ dàng',
    desc: 'Tạo link chia sẻ đẹp cho bạn bè hoặc mạng xã hội',
    color: '#06b6d4',
    bg: '#ecfeff',
  },
  {
    icon: Shield,
    title: 'Riêng tư & An toàn',
    desc: 'Kiểm soát ai xem được bài đăng của bạn',
    color: '#64748b',
    bg: '#f8fafc',
  },
]

const timeSlots = [
  { time: '5:00', emoji: '🌅', label: 'Sáng sớm', color: '#FFF3E0' },
  { time: '7:00', emoji: '☀️', label: 'Buổi sáng', color: '#FFFDE7' },
  { time: '12:00', emoji: '🌤️', label: 'Buổi trưa', color: '#F3F8FF' },
  { time: '17:00', emoji: '🌇', label: 'Chiều tối', color: '#FBE9E7' },
  { time: '19:00', emoji: '🌙', label: 'Buổi tối', color: '#EDE7F6' },
  { time: '22:00', emoji: '🦉', label: 'Đêm khuya', color: '#E8EAF6' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-5 pt-14 pb-10">
        {/* Decorative gradient blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-200/40 to-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-200/30 to-pink-100/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        {/* Logo & Nav */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
              <span className="text-white text-lg font-bold">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MyDaily</span>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="text-sm font-semibold text-orange-600 hover:text-orange-700 px-4 py-2 rounded-full hover:bg-orange-50 transition-colors"
          >
            Đăng nhập
          </button>
        </motion.div>

        {/* Hero Content */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="relative"
        >
          <motion.div variants={fadeUp} custom={0} className="mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full border border-orange-100">
              <Star size={12} fill="currentColor" />
              Nhật ký cuộc sống
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-[2rem] leading-tight font-extrabold text-gray-900 mb-4"
          >
            Ghi lại từng
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              khoảnh khắc
            </span>
            <br />
            trong ngày
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-base text-gray-500 leading-relaxed mb-8 max-w-xs"
          >
            Chụp ảnh theo khung giờ, theo dõi thói quen, kết nối bạn bè và xây dựng cuộc sống tích cực hơn mỗi ngày.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="btn btn-primary text-[15px] px-6 py-3.5 rounded-2xl"
            >
              Bắt đầu miễn phí
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="btn btn-secondary text-[15px] px-5 py-3.5 rounded-2xl"
            >
              Tìm hiểu thêm
            </button>
          </motion.div>
        </motion.div>

        {/* Phone Mockup Timeline Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="relative mt-10 mx-auto max-w-[280px]"
        >
          <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/60 border border-gray-100 overflow-hidden">
            {/* Mock status bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <span className="text-[11px] font-semibold text-gray-400">Hôm nay</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-orange-500">🔥 7</span>
              </div>
            </div>
            {/* Timeline items */}
            <div className="px-3 pb-4 space-y-2">
              {timeSlots.map((slot, i) => (
                <motion.div
                  key={slot.time}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ backgroundColor: slot.color + '60' }}
                >
                  <span className="text-lg">{slot.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{slot.label}</p>
                    <p className="text-[10px] text-gray-400">{slot.time}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
                    <Camera size={12} className="text-gray-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-5 py-12 bg-gray-50/50">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.div variants={fadeUp} custom={0} className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tính năng nổi bật</h2>
            <p className="text-sm text-gray-500">Mọi thứ bạn cần cho nhật ký hàng ngày</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i + 1}
                className="p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: f.bg }}
                >
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-[13px] font-bold text-gray-800 mb-1">{f.title}</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="px-5 py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold text-gray-900 mb-2">
            Cách sử dụng
          </motion.h2>
          <motion.p variants={fadeUp} custom={0.5} className="text-sm text-gray-500 mb-8">
            Chỉ cần 3 bước đơn giản
          </motion.p>

          <div className="space-y-4">
            {[
              { step: '01', title: 'Chụp ảnh', desc: 'Mở camera và chụp ngay khoảnh khắc hiện tại', emoji: '📸' },
              { step: '02', title: 'Chọn chủ đề', desc: 'Gắn chủ đề phù hợp theo khung giờ trong ngày', emoji: '🏷️' },
              { step: '03', title: 'Xem lại & Chia sẻ', desc: 'Theo dõi timeline, xem streak và chia sẻ ngày của bạn', emoji: '🌟' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                custom={i + 1}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-2xl">
                  {item.emoji}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-orange-400 tracking-widest">BƯỚC {item.step}</span>
                  <h3 className="text-sm font-bold text-gray-800 mt-0.5">{item.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="px-5 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-7 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl translate-y-1/3 -translate-x-1/3" />

          <div className="relative">
            <div className="text-4xl mb-3">🚀</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Bắt đầu hành trình
              <br />
              của bạn ngay hôm nay
            </h2>
            <p className="text-sm text-orange-100 mb-6">
              Miễn phí hoàn toàn. Không cần thẻ tín dụng.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-orange-600/20 hover:shadow-xl transition-shadow text-[15px]"
            >
              Tạo tài khoản miễn phí
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-8 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">MyDaily</span>
          </div>
          <span className="text-xs text-gray-400">© 2026</span>
        </div>
      </footer>
    </div>
  )
}
