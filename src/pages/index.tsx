import { Form } from '@/components/form'
import MessageReceiver from '@/components/messageReceiver'
import { Introduction } from '@/components/introduction'
import { Menu } from '@/components/menu'
import { Meta } from '@/components/meta'
import { CreatorLink } from '@/components/creatorLink'
import ModalImage from '@/components/modalImage'
import VrmViewer from '@/components/vrmViewer'
import Live2DViewer from '@/components/live2DViewer'
import { Toasts } from '@/components/toasts'
import { WebSocketManager } from '@/components/websocketManager'
import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'
import '@/lib/i18n'
import { buildUrl } from '@/utils/buildUrl'
import { YoutubeManager } from '@/components/youtubeManager'
import { useEffect, useState } from 'react'
import { Live2DHandler } from '@/features/messages/live2dHandler'

const Home = () => {
  const [showAudioButton, setShowAudioButton] = useState(false)
  const bgUrl = homeStore((s) => `url(${buildUrl(s.backgroundImageUrl)})`)
  const messageReceiverEnabled = settingsStore((s) => s.messageReceiverEnabled)
  const modelType = settingsStore((s) => s.modelType)

  useEffect(() => {
    // AudioContextの状態をチェック
    const checkAudioContext = async () => {
      if (Live2DHandler.audioContext?.state === 'suspended') {
        setShowAudioButton(true)
      }
    }
    checkAudioContext()
  }, [])

  const handleAudioInit = async () => {
    if (Live2DHandler.audioContext?.state === 'suspended') {
      await Live2DHandler.audioContext.resume()
    }
    setShowAudioButton(false)
  }

  return (
    <div className="h-[100svh] bg-cover" style={{ backgroundImage: bgUrl }}>
      <Meta />
      {showAudioButton && (
        <button
          onClick={handleAudioInit}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
                     bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded
                     shadow-lg transition-all duration-200"
        >
          タップして音声を有効化
        </button>
      )}
      <CreatorLink />
      <Introduction />
      {modelType === 'vrm' ? <VrmViewer /> : <Live2DViewer />}
      <Form />
      <Menu />
      <ModalImage />
      {messageReceiverEnabled && <MessageReceiver />}
      <Toasts />
      <WebSocketManager />
      <YoutubeManager />
    </div>
  )
}

export default Home
