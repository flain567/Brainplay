import React, { useRef, useState, useCallback } from 'react'

export default function Tilt({ children, style = {}, className = '', perspective = 1000, tiltMaxAngleX = 10, tiltMaxAngleY = 10 }) {
  const ref = useRef()
  const [styleOverride, setStyleOverride] = useState({
    transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
  })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timeoutRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    
    const x = (e.clientX - rect.left) / width - 0.5
    const y = (e.clientY - rect.top) / height - 0.5

    const tiltX = (tiltMaxAngleY * y).toFixed(2)
    const tiltY = (tiltMaxAngleX * -x).toFixed(2)

    setIsTransitioning(false)
    setStyleOverride({
      transform: `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`
    })
  }, [perspective, tiltMaxAngleX, tiltMaxAngleY])

  const handleMouseLeave = useCallback(() => {
    setIsTransitioning(true)
    setStyleOverride({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
    })
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIsTransitioning(false), 400)
  }, [perspective])

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={handleMouseMove}
      onPointerLeave={handleMouseLeave}
      style={{
        transition: isTransitioning 
            ? 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' 
            : 'transform 0.1s linear',
        transformStyle: 'preserve-3d',
        ...style,
        ...styleOverride
      }}
    >
      {/* 
        This is necessary if children need to pop out via transform: translateZ 
      */}
      <div style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  )
}
