import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Message } from '@/features/messages/messages'
import { Viewer } from '../vrmViewer/viewer'
import { messageSelectors } from '../messages/messageSelectors'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch'

export interface PersistedState {
  userOnboarded: boolean
  chatLog: Message[]
  showIntroduction: boolean
  isModelLoading: boolean
  sessionId: string
}

export interface TransientState {
  viewer: Viewer
  live2dViewer: any
  assistantMessage: string
  slideMessages: string[]
  chatProcessing: boolean
  chatProcessingCount: number
  incrementChatProcessingCount: () => void
  decrementChatProcessingCount: () => void
  backgroundImageUrl: string
  modalImage: string
  triggerShutter: boolean
  webcamStatus: boolean
  captureStatus: boolean
  isCubismCoreLoaded: boolean
  setIsCubismCoreLoaded: (loaded: boolean) => void
  isLive2dLoaded: boolean
  setIsLive2dLoaded: (loaded: boolean) => void
  isCreatingSession: boolean
  isSpeaking: boolean
}

export type HomeState = PersistedState & TransientState

const homeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      // persisted states
      userOnboarded: false,
      chatLog: [],
      showIntroduction: process.env.NEXT_PUBLIC_SHOW_INTRODUCTION !== 'false',
      isModelLoading: false,
      sessionId:
        typeof window !== 'undefined'
          ? localStorage.getItem('current-session-id') || crypto.randomUUID()
          : crypto.randomUUID(),
      assistantMessage: '',

      // transient states
      viewer: new Viewer(),
      live2dViewer: null,
      slideMessages: [],
      chatProcessing: false,
      chatProcessingCount: 0,
      incrementChatProcessingCount: () => {
        set(({ chatProcessingCount }) => ({
          chatProcessingCount: chatProcessingCount + 1,
        }))
      },
      decrementChatProcessingCount: () => {
        set(({ chatProcessingCount }) => ({
          chatProcessingCount: chatProcessingCount - 1,
        }))
      },
      backgroundImageUrl:
        process.env.NEXT_PUBLIC_BACKGROUND_IMAGE_PATH ?? '/bg-c.png',
      modalImage: '',
      triggerShutter: false,
      webcamStatus: false,
      captureStatus: false,
      isCubismCoreLoaded: false,
      setIsCubismCoreLoaded: (loaded) =>
        set(() => ({ isCubismCoreLoaded: loaded })),
      isLive2dLoaded: false,
      setIsLive2dLoaded: (loaded) => set(() => ({ isLive2dLoaded: loaded })),
      isCreatingSession: false,
      isSpeaking: false,
    }),
    {
      name: 'aitube-kit-home',
      partialize: ({ chatLog, showIntroduction, sessionId }) => ({
        chatLog: messageSelectors.cutImageMessage(chatLog),
        showIntroduction,
        sessionId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // セッションIDが存在しない場合のみ新規生成
        if (!state.sessionId) {
          const newSessionId = crypto.randomUUID()
          if (typeof window !== 'undefined') {
            localStorage.setItem('current-session-id', newSessionId)
          }
          state.sessionId = newSessionId
        } else if (typeof window !== 'undefined') {
          localStorage.setItem('current-session-id', state.sessionId)
        }
      },
    }
  )
)

// chatLogの変更を監視して保存
homeStore.subscribe((state, prevState) => {
  if (state.chatLog !== prevState.chatLog) {
    if (state.chatLog.length === 0 && prevState.chatLog.length > 0) {
      const newSessionId = crypto.randomUUID()
      if (typeof window !== 'undefined') {
        localStorage.setItem('current-session-id', newSessionId)
      }
      homeStore.setState({ sessionId: newSessionId })
    } else if (state.chatLog.length > 0) {
      // 最新のメッセージを取得し、保存用に処理
      const lastMessage = state.chatLog[state.chatLog.length - 1]
      const processedMessage =
        messageSelectors.sanitizeMessageForStorage(lastMessage)

      void fetch('/api/save-chat-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: processedMessage,
          sessionId: state.sessionId,
        }),
      })
        .then((response) => response.json())
        .catch((error) => {
          console.error('Error saving chat log:', error)
        })
    }
  }
})

export default homeStore
