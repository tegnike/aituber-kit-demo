import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'

import { Language } from '@/features/constants/settings'
import homeStore from '@/features/stores/home'
import menuStore from '@/features/stores/menu'
import settingsStore from '@/features/stores/settings'
import { TextButton } from '../textButton'

const emotionFields = [
  {
    key: 'neutralEmotions',
    label: 'Neutral Emotions',
    defaultValue: ['Neutral'],
  },
  {
    key: 'happyEmotions',
    label: 'Happy Emotions',
    defaultValue: ['Happy,Happy2'],
  },
  {
    key: 'sadEmotions',
    label: 'Sad Emotions',
    defaultValue: ['Sad,Sad2,Troubled'],
  },
  {
    key: 'angryEmotions',
    label: 'Angry Emotions',
    defaultValue: ['Angry,Focus'],
  },
  {
    key: 'relaxedEmotions',
    label: 'Relaxed Emotions',
    defaultValue: ['Relaxed'],
  },
] as const

const motionFields = [
  { key: 'idleMotionGroup', label: 'Idle Motion Group', defaultValue: 'Idle' },
  {
    key: 'neutralMotionGroup',
    label: 'Neutral Motion Group',
    defaultValue: 'Neutral',
  },
  {
    key: 'happyMotionGroup',
    label: 'Happy Motion Group',
    defaultValue: 'Happy',
  },
  { key: 'sadMotionGroup', label: 'Sad Motion Group', defaultValue: 'Sad' },
  {
    key: 'angryMotionGroup',
    label: 'Angry Motion Group',
    defaultValue: 'Angry',
  },
  {
    key: 'relaxedMotionGroup',
    label: 'Relaxed Motion Group',
    defaultValue: 'Relaxed',
  },
] as const

interface Live2DModel {
  path: string
  name: string
  expressions: string[]
  motions: string[]
}

type EmotionFieldKey = (typeof emotionFields)[number]['key']

const Live2DSettingsForm = () => {
  const store = settingsStore()
  const { t } = useTranslation()
  const [currentModel, setCurrentModel] = useState<Live2DModel | null>(null)
  const [openDropdown, setOpenDropdown] = useState<EmotionFieldKey | null>(null)

  // useEffect(() => {
  //   // 現在選択されているLive2Dモデルの情報を取得
  //   const fetchCurrentModel = async () => {
  //     try {
  //       const response = await fetch('/api/get-live2d-list')
  //       const models: Live2DModel[] = await response.json()
  //       const selected = models.find(
  //         (model) => model.path === store.selectedLive2DPath
  //       )
  //       setCurrentModel(selected || null)
  //     } catch (error) {
  //       console.error('Error fetching Live2D model info:', error)
  //     }
  //   }

  //   if (store.selectedLive2DPath) {
  //     fetchCurrentModel()
  //   }
  // }, [store.selectedLive2DPath])

  // コンポーネントマウント時にデフォルト値を設定
  useEffect(() => {
    const updates: Record<string, any> = {}

    emotionFields.forEach((field) => {
      if (!store[field.key] || store[field.key].length === 0) {
        updates[field.key] = field.defaultValue
      }
    })

    motionFields.forEach((field) => {
      if (!store[field.key] || store[field.key] === '') {
        updates[field.key] = field.defaultValue
      }
    })

    if (Object.keys(updates).length > 0) {
      settingsStore.setState(updates)
    }
  }, [])

  const handleEmotionChange = (
    key: EmotionFieldKey,
    expression: string,
    checked: boolean
  ) => {
    const currentValues = store[key]
    const newValues = checked
      ? [...currentValues, expression]
      : currentValues.filter((value) => value !== expression)

    settingsStore.setState({
      [key]: newValues,
    })
  }

  const handleMotionChange = (key: string, value: string) => {
    settingsStore.setState({
      [key]: value,
    })
  }

  if (!currentModel) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        {/* {t('Live2D.LoadingModel')} */}
      </div>
    )
  }

  return (
    <div className="space-y-32">
      <div className="mb-24">
        <div className="mb-16 typography-20 font-bold">
          {t('Live2D.Emotions')}
        </div>
        <div className="mb-24 typography-16 text-gray-500 whitespace-pre-line">
          {t('Live2D.EmotionInfo')}
        </div>
        <div className="space-y-16">
          {emotionFields.map((field) => (
            <div key={field.key}>
              <label className="block mb-8 typography-16 font-bold text-gray-800">
                {t(`Live2D.${field.key}`)}
              </label>
              <div className="relative">
                <button
                  type="button"
                  className="w-full px-16 py-4 py-12 bg-surface1 hover:bg-surface1-hover rounded-8 text-left flex items-center justify-between"
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === field.key ? null : field.key
                    )
                  }
                >
                  <div className="flex flex-wrap gap-4">
                    {store[field.key].length > 0 ? (
                      store[field.key].map((expression) => (
                        <span
                          key={expression}
                          className="inline-flex items-center px-8 py-4 bg-primary/10 rounded-4 mr-4"
                        >
                          {expression}
                          <button
                            type="button"
                            className="ml-4 text-gray-500 hover:text-gray-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEmotionChange(field.key, expression, false)
                            }}
                          >
                            <svg
                              className="h-8 w-8"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">
                        {t('Live2D.SelectEmotions')}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`h-8 w-8 text-gray-400 transition-transform ${
                      openDropdown === field.key ? 'rotate-180' : ''
                    }`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2 5l6 6 6-6"
                    />
                  </svg>
                </button>
                {openDropdown === field.key && (
                  <div className="absolute z-10 w-full mt-4 max-h-[200px] overflow-y-auto bg-white rounded-8 shadow-lg border-gray-200 divide-y divide-gray-200">
                    {currentModel.expressions.map((expression) => (
                      <label
                        key={expression}
                        className="flex items-center px-16 py-8 hover:bg-surface1-hover cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="w-16 h-16 rounded border-gray-300 text-primary focus:ring-primary mr-8"
                          checked={store[field.key].includes(expression)}
                          onChange={(e) =>
                            handleEmotionChange(
                              field.key,
                              expression,
                              e.target.checked
                            )
                          }
                        />
                        <span className="typography-16">{expression}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-16 typography-20 font-bold">
          {t('Live2D.MotionGroups')}
        </div>
        <div className="mb-24 typography-16 text-gray-500 whitespace-pre-line">
          {t('Live2D.MotionGroupsInfo')}
        </div>
        <div className="space-y-16">
          {motionFields.map((field) => (
            <div key={field.key}>
              <label className="block mb-8 typography-16 font-bold text-gray-800">
                {t(`Live2D.${field.key}`)}
              </label>
              <div className="relative">
                <select
                  className="w-full px-16 py-8 bg-surface1 hover:bg-surface1-hover rounded-8 appearance-none cursor-pointer"
                  value={store[field.key]}
                  onChange={(e) =>
                    handleMotionChange(field.key, e.target.value)
                  }
                >
                  <option value="" className="text-gray-400">
                    {t('Live2D.SelectMotionGroup')}
                  </option>
                  {currentModel.motions.map((motion) => (
                    <option
                      key={motion}
                      value={motion}
                      className="py-4 px-8 hover:bg-primary hover:text-white"
                    >
                      {motion}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-16 flex items-center pointer-events-none">
                  <svg
                    className="h-8 w-8 text-gray-400"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2 5l6 6 6-6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Based = () => {
  const { t } = useTranslation()
  const { characterName, selectedVrmPath, selectedLive2DPath, modelType } =
    settingsStore()
  const [vrmFiles, setVrmFiles] = useState<string[]>([
    'AvatarSample_A.vrm',
    'AvatarSample_B.vrm',
    'AvatarSample_C.vrm',
    'nikechan_v1.vrm',
  ])
  const [live2dModels, setLive2dModels] = useState<
    Array<{ path: string; name: string }>
  >([{ path: '/live2d/nikechan01.vrm', name: 'nikechan01' }])
  const selectLanguage = settingsStore((s) => s.selectLanguage)

  // useEffect(() => {
  //   fetch('/api/get-vrm-list')
  //     .then((res) => res.json())
  //     .then((files) => setVrmFiles(files))
  //     .catch((error) => {
  //       console.error('Error fetching VRM list:', error)
  //     })

  //   fetch('/api/get-live2d-list')
  //     .then((res) => res.json())
  //     .then((models) => setLive2dModels(models))
  //     .catch((error) => {
  //       console.error('Error fetching Live2D list:', error)
  //     })
  // }, [])

  const handleVrmUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload-vrm-list', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const { path } = await response.json()
      settingsStore.setState({ selectedVrmPath: path })
      const { viewer } = homeStore.getState()
      viewer.loadVrm(path)

      // リストを更新
      fetch('/api/get-vrm-list')
        .then((res) => res.json())
        .then((files) => setVrmFiles(files))
        .catch((error) => {
          console.error('Error fetching VRM list:', error)
        })
    }
  }

  return (
    <>
      <div className="mb-24">
        <div className="mb-16 typography-20 font-bold">{t('Language')}</div>
        <div className="my-8">
          <select
            className="px-16 py-8 bg-surface1 hover:bg-surface1-hover rounded-8"
            value={selectLanguage}
            onChange={(e) => {
              const newLanguage = e.target.value as Language

              const ss = settingsStore.getState()
              const jaVoiceSelected =
                ss.selectVoice === 'voicevox' ||
                ss.selectVoice === 'koeiromap' ||
                ss.selectVoice === 'aivis_speech' ||
                ss.selectVoice === 'nijivoice'

              switch (newLanguage) {
                case 'ja':
                  settingsStore.setState({ selectLanguage: 'ja' })

                  i18n.changeLanguage('ja')
                  break
                case 'en':
                  settingsStore.setState({ selectLanguage: 'en' })

                  if (jaVoiceSelected) {
                    settingsStore.setState({ selectVoice: 'google' })
                  }

                  i18n.changeLanguage('en')
                  break
                case 'zh':
                  settingsStore.setState({ selectLanguage: 'zh' })

                  if (jaVoiceSelected) {
                    settingsStore.setState({ selectVoice: 'google' })
                  }

                  i18n.changeLanguage('zh-TW')
                  break
                case 'ko':
                  settingsStore.setState({ selectLanguage: 'ko' })

                  if (jaVoiceSelected) {
                    settingsStore.setState({ selectVoice: 'google' })
                  }

                  i18n.changeLanguage('ko')
                  break
                default:
                  break
              }
            }}
          >
            <option value="ja">日本語 - Japanese</option>
            <option value="en">英語 - English</option>
            <option value="zh">繁體中文 - Traditional Chinese</option>
            <option value="ko">韓語 - Korean</option>
          </select>
        </div>
      </div>
      <div className="my-24">
        <div className="my-16 typography-20 font-bold">
          {t('CharacterName')}
        </div>
        <input
          className="text-ellipsis px-16 py-8 w-col-span-2 bg-surface1 hover:bg-surface1-hover rounded-8"
          type="text"
          placeholder={t('CharacterName')}
          value={characterName}
          onChange={(e) =>
            settingsStore.setState({ characterName: e.target.value })
          }
        />

        <div className="mt-24 mb-16 typography-20 font-bold">
          {t('CharacterModelLabel')}
        </div>
        <div className="mb-16 typography-16 whitespace-pre-line">
          {t('CharacterModelInfo')}
        </div>

        <div className="flex gap-4 mb-8">
          <button
            className={`px-16 py-8 rounded-8 mr-8 ${
              modelType === 'vrm'
                ? 'bg-primary text-white'
                : 'bg-surface1 hover:bg-surface1-hover'
            }`}
            onClick={() => settingsStore.setState({ modelType: 'vrm' })}
          >
            VRM
          </button>
        </div>

        {modelType === 'vrm' ? (
          <>
            <select
              className="text-ellipsis px-16 py-8 w-col-span-2 bg-surface1 hover:bg-surface1-hover rounded-8"
              value={selectedVrmPath}
              onChange={(e) => {
                const path = e.target.value
                settingsStore.setState({ selectedVrmPath: path })
                const { viewer } = homeStore.getState()
                viewer.loadVrm(path)
              }}
            >
              {vrmFiles.map((file) => (
                <option key={file} value={`/vrm/${file}`}>
                  {file.replace('.vrm', '')}
                </option>
              ))}
            </select>

            <div className="my-16">
              <TextButton
                onClick={() => {
                  const { fileInput } = menuStore.getState()
                  if (fileInput) {
                    fileInput.accept = '.vrm'
                    fileInput.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        handleVrmUpload(file)
                      }
                    }
                    fileInput.click()
                  }
                }}
              >
                {t('OpenVRM')}
              </TextButton>
            </div>
          </>
        ) : (
          <>
            <div className="my-16 whitespace-pre-line">
              {t('Live2D.FileInfo')}
            </div>
            <select
              className="text-ellipsis px-16 py-8 w-col-span-2 bg-surface1 hover:bg-surface1-hover rounded-8 mb-8"
              value={selectedLive2DPath}
              onChange={(e) => {
                const path = e.target.value
                settingsStore.setState({ selectedLive2DPath: path })
              }}
            >
              {live2dModels.map((model) => (
                <option key={model.path} value={model.path}>
                  {model.name}
                </option>
              ))}
            </select>
            <div className="my-16">
              <Live2DSettingsForm />
            </div>
          </>
        )}
      </div>
      <div className="mt-24">
        <div className="my-16 typography-20 font-bold">
          {t('BackgroundImage')}
        </div>
        <div className="my-8">
          <TextButton
            onClick={() => {
              const { bgFileInput } = menuStore.getState()
              bgFileInput?.click()
            }}
          >
            {t('ChangeBackgroundImage')}
          </TextButton>
        </div>
      </div>
    </>
  )
}
export default Based
