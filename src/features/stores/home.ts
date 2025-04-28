import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Message } from '@/features/messages/messages'
import { Viewer } from '../vrmViewer/viewer'
import { messageSelectors } from '../messages/messageSelectors'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch'
import { generateMessageId } from '@/utils/messageUtils'

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
  upsertMessage: (message: Partial<Message>) => void
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

// 更新の一時的なバッファリングを行うための変数
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
const SAVE_DEBOUNCE_DELAY = 2000 // 2秒
let lastSavedLogLength = 0 // 最後に保存したログの長さを記録
// shouldCreateNewFile フラグは削除 (ローカルファイル保存廃止のため)

// ログ保存状態をリセットし、新しいセッションIDを生成する共通関数
const resetSaveStateAndGenerateNewSession = () => {
  console.log('Chat log was cleared, resetting save state and generating new session ID.')
  lastSavedLogLength = 0
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }
  // 新しいセッションIDを生成し、状態とlocalStorageを更新
  const newSessionId = crypto.randomUUID()
  if (typeof window !== 'undefined') {
    localStorage.setItem('current-session-id', newSessionId)
  }
  homeStore.setState({ sessionId: newSessionId })
}

const homeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      // persisted states
      userOnboarded: false,
      chatLog: [],
      showIntroduction: process.env.NEXT_PUBLIC_SHOW_INTRODUCTION !== 'false',
      isModelLoading: false,
      // 初期sessionIdの取得ロジックはHEAD側を維持
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
      upsertMessage: (message) => {
        set((state) => {
          const currentChatLog = state.chatLog
          const messageId = message.id ?? generateMessageId()
          const existingMessageIndex = currentChatLog.findIndex(
            (msg) => msg.id === messageId
          )

          let updatedChatLog: Message[]

          if (existingMessageIndex > -1) {
            updatedChatLog = [...currentChatLog]
            const existingMessage = updatedChatLog[existingMessageIndex]

            updatedChatLog[existingMessageIndex] = {
              ...existingMessage,
              ...message,
              id: messageId,
            }
            console.log(`Message updated: ID=${messageId}`)
          } else {
            if (!message.role || message.content === undefined) {
              console.error(
                'Cannot add message without role or content',
                message
              )
              return { chatLog: currentChatLog }
            }
            const newMessage: Message = {
              id: messageId,
              role: message.role,
              content: message.content,
              ...(message.audio && { audio: message.audio }),
              ...(message.timestamp && { timestamp: message.timestamp }),
            }
            updatedChatLog = [...currentChatLog, newMessage]
            console.log(`Message added: ID=${messageId}`)
          }

          return { chatLog: updatedChatLog }
        })
      },
      backgroundImageUrl:
        process.env.NEXT_PUBLIC_BACKGROUND_IMAGE_PATH ??
        '/backgrounds/bg-c.png',
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
      // onRehydrateStorage で sessionId の localStorage への保存と lastSavedLogLength の復元を行う
      onRehydrateStorage: () => (state) => {
        if (state) {
          // sessionId を localStorage に保存 (HEAD側のロジック)
          if (state.sessionId && typeof window !== 'undefined') {
            localStorage.setItem('current-session-id', state.sessionId)
          }
          // lastSavedLogLength を復元 (upstream/main側のロジック)
          lastSavedLogLength = state.chatLog.length
          console.log(
            'Rehydrated state: sessionId='%s', chatLog length='%d'',
            state.sessionId,
            lastSavedLogLength
          )
        }
      },
    }
  )
)

// chatLogの変更を監視して差分を保存
homeStore.subscribe((state, prevState) => {
  // upstream/main の差分保存ロジックをベースにする
  if (state.chatLog !== prevState.chatLog && state.chatLog.length > 0) {
    // ログがクリアされたか、あるいは過去の状態に戻った場合 (例: undo)
    if (lastSavedLogLength > state.chatLog.length) {
      console.warn(
        'Chat log length decreased unexpectedly. Resetting save state.'
      )
      // このケースではセッションIDは維持し、保存ポインタのみリセット
      lastSavedLogLength = 0
      if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer)
      }
      // resetSaveStateAndGenerateNewSession(); // ログクリア以外でのID再生成は一旦保留
    }

    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
    }

    saveDebounceTimer = setTimeout(() => {
      // 新規追加 or 更新があったメッセージだけを抽出 (upstream/main のロジック)
      const newMessagesToSave = state.chatLog.filter(
        (msg, idx) =>
          idx >= lastSavedLogLength || // 新規追加分
          prevState.chatLog.find((p) => p.id === msg.id)?.content !==
            msg.content // 更新分 (content比較のみ)
      )

      if (newMessagesToSave.length > 0) {
        const processedMessages = newMessagesToSave.map((msg) =>
          messageSelectors.sanitizeMessageForStorage(msg)
        )

        console.log(
          `Debounced save: Saving ${processedMessages.length} messages for session ${state.sessionId}`
        )

        void fetch('/api/save-chat-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // APIに合わせて body を修正 (messages と sessionId を送信)
          body: JSON.stringify({
            messages: processedMessages,
            sessionId: state.sessionId, // 現在のセッションIDを渡す
            // isNewFile は削除
          }),
        })
          .then(async (response) => {
            if (response.ok) {
              lastSavedLogLength = state.chatLog.length // 保存成功したらポインタを進める
              console.log(
                'Messages saved successfully via API. New saved length:',
                lastSavedLogLength
              )
            } else {
              // エラーレスポンスの内容をログに出力
              const errorData = await response.json()
              console.error(
                'Failed to save chat log via API:',
                response.status,
                response.statusText,
                errorData
              )
            }
          })
          .catch((error) => {
            console.error('Error during fetch to save chat log:', error)
          })
      } else {
        // console.log('Debounced save: No new messages to save.'); // ログが多いのでコメントアウト
      }
    }, SAVE_DEBOUNCE_DELAY)
  } else if (
    // ログが完全にクリアされた場合 (HEAD側のロジックを統合)
    state.chatLog !== prevState.chatLog &&
    state.chatLog.length === 0 &&
    prevState.chatLog.length > 0 // 以前はログがあったことを確認
  ) {
    // 状態をリセットし、新しいセッションIDを生成する
    resetSaveStateAndGenerateNewSession()
  }
})

export default homeStore
