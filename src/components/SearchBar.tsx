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
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: `1.5px solid ${isFocused ? 'var(--color-accent)' : 'var(--color-border-bright)'}`,
        background: 'var(--color-bg-input)',
        transition: 'all 0.25s ease',
        boxShadow: isFocused ? '0 0 0 3px var(--color-accent-glow), var(--shadow-card)' : 'var(--shadow-card)',
      }}>
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
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
          style={{ width: '100%', margin: 0, padding: 0 }}
        >
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
              padding: '18px 56px 18px 54px',
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
        </form>

        {/* Right indicator */}
        <div style={{
          position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {value && !isLoading && (
            <button
              onClick={() => onChange('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: 18, padding: 4,
                borderRadius: 4, transition: 'color 0.15s',
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          {resultCount !== undefined && value && !isLoading && (
            <span style={{
              fontSize: 12, color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}>
              {resultCount} result{resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

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
