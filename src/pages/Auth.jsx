import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function Auth() {
  const navigate = useNavigate()
  const { setUser, fetchProfile } = useAuthStore()
  const [mode, setMode] = useState('login') // login | register | forgot | verify
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  })

  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const errs = {}

    if (!form.email.trim()) {
      errs.email = 'Vui lòng nhập email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email không hợp lệ'
    }

    if (mode !== 'forgot') {
      if (!form.password) {
        errs.password = 'Vui lòng nhập mật khẩu'
      } else if (form.password.length < 6) {
        errs.password = 'Mật khẩu tối thiểu 6 ký tự'
      }
    }

    if (mode === 'register') {
      if (!form.displayName.trim()) {
        errs.displayName = 'Vui lòng nhập tên hiển thị'
      }
      if (form.password !== form.confirmPassword) {
        errs.confirmPassword = 'Mật khẩu không khớp'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw error
    } catch (err) {
      toast.error(err.message || 'Đăng nhập Google thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        setUser(data.user)
        await fetchProfile(data.user.id)
        toast.success('Đăng nhập thành công!')
        navigate('/dashboard')
      }

      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.displayName,
              name: form.displayName,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })
        if (error) throw error

        if (data.user?.identities?.length === 0) {
          throw new Error('Email này đã được sử dụng')
        }

        // Check if email confirmation is required
        if (data.session) {
          // Auto-confirmed (email confirmation disabled in Supabase)
          setUser(data.user)
          await fetchProfile(data.user.id)
          toast.success('Tạo tài khoản thành công!')
          navigate('/dashboard')
        } else {
          setVerifyEmail(form.email)
          setMode('verify')
          toast.success('Đã gửi email xác thực!')
        }
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        })
        if (error) throw error
        toast.success('Đã gửi email khôi phục mật khẩu!')
        setMode('login')
      }
    } catch (err) {
      const msg = err.message
      if (msg.includes('Invalid login credentials')) {
        toast.error('Email hoặc mật khẩu không đúng')
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Vui lòng xác thực email trước khi đăng nhập')
      } else if (msg.includes('User already registered')) {
        toast.error('Email này đã được đăng ký')
      } else if (msg.includes('Signups not allowed')) {
        toast.error('Đăng ký tạm thời bị tắt. Vui lòng liên hệ admin.')
      } else if (msg.includes('Database error')) {
        toast.error('Lỗi hệ thống. Vui lòng thử lại sau.')
      } else {
        toast.error(msg || 'Có lỗi xảy ra')
      }
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const titles = {
    login: { title: 'Đăng nhập', subtitle: 'Chào mừng bạn trở lại 👋' },
    register: { title: 'Tạo tài khoản', subtitle: 'Bắt đầu hành trình nhật ký của bạn' },
    forgot: { title: 'Quên mật khẩu', subtitle: 'Nhập email để nhận link khôi phục' },
    verify: { title: 'Kiểm tra email', subtitle: `Chúng tôi đã gửi email xác thực đến` },
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: '16px 20px 8px' }}
      >
        <button
          onClick={() => {
            if (mode === 'verify' || mode === 'forgot') setMode('login')
            else navigate('/')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            color: '#64748b',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
          </svg>
          <span>{mode === 'verify' || mode === 'forgot' ? 'Quay lại' : 'Trang chủ'}</span>
        </button>
      </motion.div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 20px 32px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Title */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 4px',
              }}>
                {titles[mode].title}
              </h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {titles[mode].subtitle}
                {mode === 'verify' && (
                  <span style={{
                    display: 'block',
                    marginTop: 4,
                    fontWeight: 600,
                    color: '#ea580c',
                  }}>
                    {verifyEmail}
                  </span>
                )}
              </p>
            </div>

            {/* Verify screen */}
            {mode === 'verify' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  style={{
                    width: 80, height: 80,
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </motion.div>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
                  Vui lòng mở email và nhấn vào link xác thực để hoàn tất đăng ký.
                </p>
                <button
                  onClick={() => setMode('login')}
                  className="btn btn-primary"
                  style={{ width: '100%', borderRadius: 16, padding: '14px 20px' }}
                >
                  Đã xác thực? Đăng nhập
                </button>
              </div>
            )}

            {/* Login/Register/Forgot form */}
            {mode !== 'verify' && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Google OAuth */}
                {mode !== 'forgot' && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        padding: '14px 20px',
                        borderRadius: 16,
                        border: '2px solid #f1f5f9',
                        background: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 15,
                        color: '#374151',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <GoogleIcon />
                      Tiếp tục với Google
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>hoặc</span>
                      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                    </div>
                  </>
                )}

                {/* Display Name (register only) */}
                {mode === 'register' && (
                  <div>
                    <label style={labelStyle}>Tên hiển thị</label>
                    <div style={{ position: 'relative' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <input
                        type="text"
                        value={form.displayName}
                        onChange={(e) => updateField('displayName', e.target.value)}
                        placeholder="Nhập tên của bạn"
                        className="input-base"
                        style={{
                          paddingLeft: 44,
                          ...(errors.displayName ? { borderColor: '#fca5a5' } : {}),
                        }}
                      />
                    </div>
                    {errors.displayName && <p style={errorStyle}>⚠ {errors.displayName}</p>}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="email@example.com"
                      className="input-base"
                      style={{
                        paddingLeft: 44,
                        ...(errors.email ? { borderColor: '#fca5a5' } : {}),
                      }}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p style={errorStyle}>⚠ {errors.email}</p>}
                </div>

                {/* Password */}
                {mode !== 'forgot' && (
                  <div>
                    <label style={labelStyle}>Mật khẩu</label>
                    <div style={{ position: 'relative' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="••••••••"
                        className="input-base"
                        style={{
                          paddingLeft: 44,
                          paddingRight: 44,
                          ...(errors.password ? { borderColor: '#fca5a5' } : {}),
                        }}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: '#94a3b8',
                          display: 'flex',
                        }}
                      >
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && <p style={errorStyle}>⚠ {errors.password}</p>}
                  </div>
                )}

                {/* Confirm Password (register) */}
                {mode === 'register' && (
                  <div>
                    <label style={labelStyle}>Xác nhận mật khẩu</label>
                    <div style={{ position: 'relative' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        className="input-base"
                        style={{
                          paddingLeft: 44,
                          ...(errors.confirmPassword ? { borderColor: '#fca5a5' } : {}),
                        }}
                        autoComplete="new-password"
                      />
                    </div>
                    {errors.confirmPassword && <p style={errorStyle}>⚠ {errors.confirmPassword}</p>}
                  </div>
                )}

                {/* Forgot password link */}
                {mode === 'login' && (
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      style={{
                        fontSize: 14,
                        color: '#ea580c',
                        fontWeight: 500,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    borderRadius: 16,
                    padding: '14px 20px',
                    marginTop: 8,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? (
                    <div style={{
                      width: 20, height: 20,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  ) : (
                    {
                      login: 'Đăng nhập',
                      register: 'Tạo tài khoản',
                      forgot: 'Gửi link khôi phục',
                    }[mode]
                  )}
                </button>

                {/* Switch mode */}
                {mode !== 'forgot' && (
                  <p style={{
                    textAlign: 'center',
                    fontSize: 14,
                    color: '#64748b',
                    marginTop: 16,
                  }}>
                    {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login')
                        setErrors({})
                      }}
                      style={{
                        color: '#ea580c',
                        fontWeight: 600,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 14,
                      }}
                    >
                      {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
                    </button>
                  </p>
                )}
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom decoration */}
      <div style={{ padding: '0 20px 24px' }}>
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#94a3b8',
        }}>
          Bằng việc đăng ký, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của MyDaily.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const labelStyle = {
  fontSize: 14,
  fontWeight: 500,
  color: '#374151',
  display: 'block',
  marginBottom: 6,
}

const iconStyle = {
  position: 'absolute',
  left: 16,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
}

const errorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  color: '#ef4444',
  marginTop: 4,
}
