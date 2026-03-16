import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Game crashed:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', minHeight: '60vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 40, textAlign: 'center',
          background: '#0d0b1e', color: '#e8e8f0',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💥</div>
          <h2 style={{
            fontFamily: "'Fredoka One',cursive", fontSize: 24,
            color: '#FF6B6B', marginBottom: 8,
          }}>
            Oops! Game Crash
          </h2>
          <p style={{
            fontSize: 14, color: '#8892b0', marginBottom: 24,
            maxWidth: 360, lineHeight: 1.6,
          }}>
            Terjadi error saat menjalankan game. Coba kembali dan main lagi.
          </p>
          <div style={{
            fontSize: 11, color: '#636E72', marginBottom: 20,
            padding: '8px 16px', background: 'rgba(255,255,255,0.04)',
            borderRadius: 8, maxWidth: 400, wordBreak: 'break-word',
          }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: 'linear-gradient(135deg,#A29BFE,#6C5CE7)',
                color: '#fff', border: 'none', borderRadius: 100,
                padding: '12px 28px', fontSize: 15, fontWeight: 800,
                fontFamily: "'Fredoka One',cursive", cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(162,155,254,0.4)',
              }}>
              🔄 Coba Lagi
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: 'rgba(255,255,255,0.06)', color: '#8892b0',
                border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 100,
                padding: '12px 20px', fontSize: 14, fontWeight: 700,
                fontFamily: "'Fredoka One',cursive", cursor: 'pointer',
              }}>
              🏠 Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
