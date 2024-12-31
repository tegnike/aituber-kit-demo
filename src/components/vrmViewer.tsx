import { useCallback } from 'react'
import Image from 'next/image'

import homeStore from '@/features/stores/home'
import settingsStore from '@/features/stores/settings'

export default function VrmViewer() {
  const isModelLoading = homeStore((state) => state.isModelLoading)

  const canvasRef = useCallback((canvas: HTMLCanvasElement) => {
    if (canvas) {
      const { viewer } = homeStore.getState()
      const { selectedVrmPath } = settingsStore.getState()
      viewer.setup(canvas)

      homeStore.setState({ isModelLoading: true })

      viewer
        .loadVrm(selectedVrmPath)
        .then(() => {
          homeStore.setState({ isModelLoading: false })
        })
        .catch((error) => {
          console.error('VRM loading failed:', error)
          homeStore.setState({ isModelLoading: false })
        })

      // Drag and DropでVRMを差し替え
      canvas.addEventListener('dragover', function (event) {
        event.preventDefault()
      })

      canvas.addEventListener('drop', function (event) {
        event.preventDefault()

        const files = event.dataTransfer?.files
        if (!files) {
          return
        }

        const file = files[0]
        if (!file) {
          return
        }
        const file_type = file.name.split('.').pop()
        if (file_type === 'vrm') {
          const blob = new Blob([file], { type: 'application/octet-stream' })
          const url = window.URL.createObjectURL(blob)
          homeStore.setState({ isModelLoading: true })

          Promise.resolve(viewer.loadVrm(url)).finally(() => {
            homeStore.setState({ isModelLoading: false })
          })
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = function () {
            const image = reader.result as string
            image !== '' && homeStore.setState({ modalImage: image })
          }
        }
      })
    }
  }, [])

  return (
    <div className={'absolute top-0 left-0 w-screen h-[100svh] z-5'}>
      <canvas ref={canvasRef} className={'h-full w-full'}></canvas>
      {isModelLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Image
            src="/nikechan_run_loading.gif"
            alt="Loading..."
            width={800}
            height={200}
            priority
            unoptimized
          />
        </div>
      )}
    </div>
  )
}
