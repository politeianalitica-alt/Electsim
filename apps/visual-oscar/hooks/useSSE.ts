'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export type SSEStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed'

export interface SSEOptions {
  maxRetries?: number
  retryDelay?: number // ms, will be multiplied by 1.5^n
  onMessage?: (event: MessageEvent) => void
  onError?: (err: Event) => void
  onOpen?: () => void
  onClose?: () => void
}

export interface SSEState {
  status: SSEStatus
  lastEvent: MessageEvent | null
  errorCount: number
  retryCount: number
}

export function useSSE(url: string | null, options: SSEOptions = {}) {
  const {
    maxRetries = 5,
    retryDelay = 1500,
    onMessage,
    onError,
    onOpen,
    onClose,
  } = options

  const esRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const [state, setState] = useState<SSEState>({
    status: 'connecting',
    lastEvent: null,
    errorCount: 0,
    retryCount: 0,
  })

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return

    setState(s => ({ ...s, status: retryCountRef.current > 0 ? 'reconnecting' : 'connecting' }))

    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      if (!mountedRef.current) return
      retryCountRef.current = 0
      setState(s => ({ ...s, status: 'connected', retryCount: 0 }))
      onOpen?.()
    }

    es.onmessage = (ev: MessageEvent) => {
      if (!mountedRef.current) return
      setState(s => ({ ...s, lastEvent: ev }))
      onMessage?.(ev)
    }

    es.onerror = (err: Event) => {
      if (!mountedRef.current) return
      es.close()
      setState(s => ({ ...s, status: 'error', errorCount: s.errorCount + 1 }))
      onError?.(err)

      if (retryCountRef.current < maxRetries) {
        const delay = retryDelay * Math.pow(1.5, retryCountRef.current)
        retryCountRef.current++
        setState(s => ({ ...s, retryCount: retryCountRef.current }))
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect()
        }, delay)
      } else {
        setState(s => ({ ...s, status: 'closed' }))
        onClose?.()
      }
    }
  }, [url, maxRetries, retryDelay, onMessage, onError, onOpen, onClose])

  useEffect(() => {
    mountedRef.current = true
    if (url) connect()
    return () => {
      mountedRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      esRef.current?.close()
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => {
    mountedRef.current = false
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    esRef.current?.close()
    setState(s => ({ ...s, status: 'closed' }))
  }, [])

  return { ...state, close }
}
