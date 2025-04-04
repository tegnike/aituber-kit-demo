import { useTranslation } from 'react-i18next'
import Image from 'next/image'

const Description = () => {
  const { t } = useTranslation()

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center mb-6">
          <Image
            src="/images/setting-icons/description.svg"
            alt="Description Settings"
            width={24}
            height={24}
            className="mr-2"
          />
          <h2 className="text-2xl font-bold">{t('AboutThisApplication')}</h2>
        </div>
        <div className="mb-6">
          <div className="my-2 whitespace-pre-line">
            {t('AboutThisApplicationDescription')}
          </div>
          <div className="my-2 whitespace-pre-line">
            <a href="https://github.com/tegnike/aituber-kit">
              https://github.com/tegnike/aituber-kit
            </a>
          </div>
          <div className="my-2 whitespace-pre-line">
            {t('AboutThisApplicationDescription2')}
          </div>
          <div className="my-6 whitespace-pre-line">
            {t('AboutThisApplicationDescription3')}
            <ul className="my-2">
              <li>
                <a href="https://github.com/sponsors/tegnike">
                  - Github Sponsor: https://github.com/sponsors/tegnike
                </a>
              </li>
              <li>
                <a href="https://nikechan.fanbox.cc">
                  - FANBOX: https://nikechan.fanbox.cc
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="my-10">
          <div className="mb-4 text-xl font-bold">
            {t('TechnologyIntroduction')}
          </div>
          <div className="my-2 whitespace-pre-line">
            {t('TechnologyIntroductionDescription')}
          </div>
        </div>
        <div className="my-10">
          <div className="mb-4 text-xl font-bold">{t('Contact')}</div>
          <div className="my-2 whitespace-pre-line">
            <a
              href="mailto:support@aituberkit.com"
              className="text-black hover:text-gray-800 hover:underline transition-all duration-300 ease-in-out"
            >
              Email: support@aituberkit.com
            </a>
          </div>
          <div className="my-2 whitespace-pre-line">
            <a
              href="https://twitter.com/tegnike"
              className="text-black hover:text-gray-800 hover:underline transition-all duration-300 ease-in-out"
            >
              Twitter: @tegnike
            </a>
          </div>
        </div>
        <div className="mt-10">
          <div className="mb-4 text-xl font-bold">{t('Creator')}</div>
          <div className="my-2 whitespace-pre-line">
            {t('CreatorDescription')}
          </div>
          <div className="my-2 whitespace-pre-line">
            <a
              href="https://nikechan.com"
              className="text-black hover:text-gray-800 hover:underline transition-all duration-300 ease-in-out"
            >
              URL: https://nikechan.com
            </a>
          </div>
        </div>
        <div className="mt-10">
          <div className="mb-4 text-xl font-bold">{t('Documentation')}</div>
          <div className="my-2 whitespace-pre-line">
            {t('DocumentationDescription')}
          </div>
          <div className="my-2 whitespace-pre-line">
            <a
              href="https://docs.aituberkit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-gray-800 hover:underline transition-all duration-300 ease-in-out"
            >
              https://docs.aituberkit.com/
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
export default Description
