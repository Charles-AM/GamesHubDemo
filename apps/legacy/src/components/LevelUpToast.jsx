import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../context/UserContext'

export default function LevelUpToast() {
  const { levelUpInfo, clearLevelUp } = useUser()

  // Auto-dismiss after 3.5s
  useEffect(() => {
    if (!levelUpInfo) return
    const t = setTimeout(clearLevelUp, 3500)
    return () => clearTimeout(t)
  }, [levelUpInfo, clearLevelUp])

  return (
    <AnimatePresence>
      {levelUpInfo && (
        <motion.div
          key="levelup"
          initial={{ opacity: 0, y: -80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0,   scale: 1    }}
          exit={{   opacity: 0, y: -60,  scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          onClick={clearLevelUp}
          className="fixed top-5 left-0 right-0 z-[100] flex justify-center pointer-events-auto px-4"
          style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,140,0,0.12))',
              border: '1px solid rgba(255,215,0,0.55)',
              boxShadow: '0 0 40px rgba(255,215,0,0.25), 0 4px 20px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
            }}>
            <motion.span
              animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-2xl">⬆️</motion.span>
            <div>
              <p className="font-orbitron text-[10px] tracking-widest" style={{ color: 'rgba(255,215,0,0.7)' }}>
                LEVEL UP!
              </p>
              <p className="font-orbitron text-xl font-black leading-tight" style={{ color: '#ffd700' }}>
                LV.{levelUpInfo.newLevel}
              </p>
            </div>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="ml-1">
              <span className="text-lg">✨</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
