'use client'

import { useState, useCallback, useRef } from 'react'
import { useSSE } from './useSSE'

export interface BriefingSection {
  id: string
  titulo: string
  contenido: string
  step: number
}

export interface GenerationState {
  isGenerating: boolean
  progress: number
  currentStep: number
  totalSteps: number
  sections: BriefingSection[]
  briefingId: string | null
  error: string | null
}

export function useBriefingGeneration() {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: 0,
    totalSteps: 8,
    sections: [],
    briefingId: null,
    error: null,
  })
  const [sseEnabled, setSseEnabled] = useState(false)
  const startedRef = useRef(false)

  const handleMessage = useCallback((ev: MessageEvent) => {
    try {
      const payload = JSON.parse(ev.data)
      if (payload.step !== undefined) {
        // section_ready event data
        setState(s => ({
          ...s,
          progress: payload.progress ?? s.progress,
          currentStep: payload.step ?? s.currentStep,
          totalSteps: payload.total ?? s.totalSteps,
          sections: [
            ...s.sections,
            {
              id: payload.section_id,
              titulo: payload.titulo,
              contenido: payload.contenido,
              step: payload.step,
            },
          ],
        }))
      } else if (payload.briefing_id) {
        // generation_complete
        setState(s => ({
          ...s,
          isGenerating: false,
          progress: 100,
          briefingId: payload.briefing_id,
        }))
        setSseEnabled(false)
      } else if (payload.total_steps) {
        // generation_start
        setState(s => ({ ...s, totalSteps: payload.total_steps }))
      }
    } catch { /* ignore */ }
  }, [])

  const { status } = useSSE(sseEnabled ? '/api/briefings/generate' : null, {
    onMessage: handleMessage,
    onError: () => {
      setState(s => ({ ...s, isGenerating: false, error: 'Error generando briefing' }))
      setSseEnabled(false)
    },
  })

  const startGeneration = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    setState({
      isGenerating: true,
      progress: 0,
      currentStep: 0,
      totalSteps: 8,
      sections: [],
      briefingId: null,
      error: null,
    })
    setSseEnabled(true)
  }, [])

  const reset = useCallback(() => {
    startedRef.current = false
    setSseEnabled(false)
    setState({
      isGenerating: false,
      progress: 0,
      currentStep: 0,
      totalSteps: 8,
      sections: [],
      briefingId: null,
      error: null,
    })
  }, [])

  return { ...state, status, startGeneration, reset }
}
