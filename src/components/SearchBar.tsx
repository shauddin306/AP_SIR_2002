'use client'

import { useEffect, useRef, useState } from 'react'

interface SearchBarProps {
  value: string
  onChange: (val: string) => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
  isLoading?: boolean
  resultCount?: number
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search by name, EPIC ID, house no... Telugu or English',
  autoFocus,
  isLoading,
  resultCount,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  return (
    <div className="search-glow" style={{ width: '100%' }}>
      <form 
        onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          border: `1.5px solid ${isFocused ? 'var(--color-accent)' : 'var(--color-border-bright)'}`,
          background: 'var(--color-bg-input)',
          transition: 'all 0.25s ease',
          boxShadow: isFocused ? '0 0 0 3px var(--color-accent-glow), var(--shadow-card)' : 'var(--shadow-card)',
          width: '100%',
        }}
      >
        {/* Left icon */}
        <div style={{
          position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
          fontSize: 20, opacity: 0.7,
        }}>
          {isLoading ? (
            <span className="animate-spin-slow" style={{ display: 'inline-block' }}>⚙️</span>
          ) : '🔍'}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id="voter-search-input"
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '18px 160px 18px 54px', /* Increased right padding for the big button */
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 18,
            color: 'var(--color-text-primary)',
            fontFamily: value.match(/[\u0C00-\u0C7F]/) ? 'var(--font-telugu)' : 'var(--font-sans)',
          }}
          aria-label="Search voters"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Right indicator & Button */}
        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {resultCount !== undefined && value && !isLoading && (
            <span style={{
              fontSize: 13, color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap', fontWeight: 500
            }}>
              {resultCount} results
            </span>
          )}
          {value && !isLoading && (
            <button
              type="button"
              onClick={() => { onChange(''); onSubmit?.(); }}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: 14, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', transition: 'all 0.2s',
              }}
              aria-label="Clear search"
              title="Clear"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            style={{
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
              border: 'none',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '100px',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* AI hint */}
      {isFocused && !value && (
        <div className="animate-fade-in" style={{
          marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap',
        }}>
          {[
            'Try: "Shareef"',
            'Try: "AP2215..."',
            'Try: "44-2"',
            'Try: "షరీఫున్నీసా"',
            'Try: "Abdul" (relative name)',
          ].map(hint => (
            <button
              key={hint}
              onClick={() => {
                const q = hint.replace('Try: "', '').replace('"', '')
                onChange(q)
              }}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12,
                background: 'rgba(59,130,246,0.1)',
                color: 'var(--color-accent-text)',
                border: '1px solid rgba(59,130,246,0.25)',
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: hint.includes('షరీఫున్నీసా') ? 'var(--font-telugu)' : 'inherit',
              }}
            >
              {hint}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
