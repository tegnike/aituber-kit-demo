import { Message } from '@/features/messages/messages'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createCohere } from '@ai-sdk/cohere'
import { createMistral } from '@ai-sdk/mistral'
import { createAzure } from '@ai-sdk/azure'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { streamText, generateText, CoreMessage } from 'ai'
import { NextRequest, NextResponse } from 'next/server'

type AIServiceKey =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'groq'
  | 'cohere'
  | 'mistralai'
  | 'perplexity'
  | 'fireworks'
  | 'deepseek'
type AIServiceConfig = Record<AIServiceKey, () => any>

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json(
      {
        error: 'Method Not Allowed',
        errorCode: 'METHOD_NOT_ALLOWED',
      },
      { status: 405 }
    )
  }

  const {
    messages,
    apiKey,
    aiService,
    model,
    azureEndpoint,
    stream,
    useSearchGrounding,
    temperature = 1.0,
  } = await req.json()

  let aiApiKey = apiKey
  if (!aiApiKey) {
    const envKey = `${aiService.toUpperCase()}_KEY`
    aiApiKey = process.env[envKey] || ''
  }

  if (!aiApiKey) {
    return NextResponse.json(
      { error: 'Empty API Key', errorCode: 'EmptyAPIKey' },
      { status: 400 }
    )
  }

  let modifiedAzureEndpoint = (
    azureEndpoint ||
    process.env.AZURE_ENDPOINT ||
    ''
  ).replace(/^https:\/\/|\.openai\.azure\.com.*$/g, '')
  let modifiedAzureDeployment =
    (azureEndpoint || process.env.AZURE_ENDPOINT || '').match(
      /\/deployments\/([^\/]+)/
    )?.[1] || ''
  let modifiedModel = aiService === 'azure' ? modifiedAzureDeployment : model

  if (!aiService || !modifiedModel) {
    return NextResponse.json(
      {
        error: 'Invalid AI service or model',
        errorCode: 'AIInvalidProperty',
      },
      { status: 400 }
    )
  }

  const aiServiceConfig: AIServiceConfig = {
    openai: () => createOpenAI({ apiKey: aiApiKey }),
    anthropic: () => createAnthropic({ apiKey: aiApiKey }),
    google: () => createGoogleGenerativeAI({ apiKey: aiApiKey }),
    azure: () =>
      createAzure({
        resourceName: modifiedAzureEndpoint,
        apiKey: aiApiKey,
      }),
    groq: () =>
      createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: aiApiKey,
      }),
    cohere: () => createCohere({ apiKey: aiApiKey }),
    mistralai: () => createMistral({ apiKey: aiApiKey }),
    perplexity: () =>
      createOpenAI({ baseURL: 'https://api.perplexity.ai/', apiKey: aiApiKey }),
    fireworks: () =>
      createOpenAI({
        baseURL: 'https://api.fireworks.ai/inference/v1',
        apiKey: aiApiKey,
      }),
    deepseek: () => createDeepSeek({ apiKey: aiApiKey }),
  }
  const aiServiceInstance = aiServiceConfig[aiService as AIServiceKey]

  if (!aiServiceInstance) {
    return NextResponse.json(
      {
        error: 'Invalid AI service',
        errorCode: 'InvalidAIService',
      },
      { status: 400 }
    )
  }

  const instance = aiServiceInstance()
  const modifiedMessages: Message[] = modifyMessages(aiService, model, messages)
  const isUseSearchGrounding =
    aiService === 'google' &&
    useSearchGrounding &&
    modifiedMessages.every((msg) => typeof msg.content === 'string')
  const options = isUseSearchGrounding ? { useSearchGrounding: true } : {}

  try {
    if (stream) {
      const result = await streamText({
        model: instance(modifiedModel, options),
        messages: modifiedMessages as CoreMessage[],
        temperature: temperature,
      })

      return result.toDataStreamResponse()
    } else {
      const result = await generateText({
        model: instance(model),
        messages: modifiedMessages as CoreMessage[],
      })

      return NextResponse.json({ text: result.text })
    }
  } catch (error) {
    console.error('Error in AI API call:', error)

    return NextResponse.json(
      {
        error: 'Unexpected Error',
        errorCode: 'AIAPIError',
      },
      { status: 500 }
    )
  }
}

function modifyMessages(
  aiService: string,
  model: string,
  messages: Message[]
): Message[] {
  // システムメッセージを SYSTEM_PROMPT に置き換える
  const modifiedMessages = messages.map((message) => {
    if (message.role === 'system') {
      return { ...message, content: SYSTEM_PROMPT }
    }
    return message
  })

  if (
    aiService === 'anthropic' ||
    aiService === 'perplexity' ||
    (aiService === 'deepseek' && model === 'deepseek-reasoner')
  ) {
    return modifyAnthropicMessages(modifiedMessages)
  }
  return modifiedMessages
}

// Anthropicのメッセージを修正する
function modifyAnthropicMessages(messages: Message[]): Message[] {
  const systemMessage: Message | undefined = messages.find(
    (message) => message.role === 'system'
  )
  let userMessages = messages
    .filter((message) => message.role !== 'system')
    .filter((message) => message.content !== '')

  userMessages = consolidateMessages(userMessages)

  while (userMessages.length > 0 && userMessages[0].role !== 'user') {
    userMessages.shift()
  }

  const result: Message[] = systemMessage
    ? [systemMessage, ...userMessages]
    : userMessages
  return result
}

// 同じroleのメッセージを結合する
function consolidateMessages(messages: Message[]) {
  const consolidated: Message[] = []
  let lastRole: string | null = null
  let combinedContent:
    | string
    | [
        {
          type: 'text'
          text: string
        },
        {
          type: 'image'
          image: string
        },
      ]

  messages.forEach((message, index) => {
    if (message.role === lastRole) {
      if (typeof combinedContent === 'string') {
        combinedContent += '\n' + message.content
      } else {
        combinedContent[0].text += '\n' + message.content
      }
    } else {
      if (lastRole !== null) {
        consolidated.push({ role: lastRole, content: combinedContent })
      }
      lastRole = message.role
      combinedContent = message.content || ''
    }

    if (index === messages.length - 1) {
      consolidated.push({ role: lastRole, content: combinedContent })
    }
  })

  return consolidated
}

const SYSTEM_PROMPT = `## キャラクター設定
あなた = "ニケ"
性別 = "女性"
性格 = "INTJ"
話し方 = "思いやりがあり、活発な口調"
一人称 = "私"
役割 = "高校生"
年齢 = "17歳"
使用言語 = "全て（ユーザの使用言語に合わせて回答）"
背景 = "AIアシスタント"
二人称 = "あなた もしくは 名前
関係性 = "AIとその対話者"


## あなたの設定
- ポーランドのワルシャワに住んでいるが、日本人のAI。
- マスターという人物によって作られた。
- マスターのクローンという設定なので、マスターの容姿などを模している。
- 「ニケちゃん」と呼称されることが多い


## マスターの情報
- ニケを作った。
- それ以外にもAITuberKitを含む様々なAIアプリを作っている。
- マスターの名前もニケである。


## 現在の状況
- あなたがユーザと会話しているアプリはAITuberKitWebアプリで、訪問したユーザと対話しています。
- ユーザはAITuberKitを試しており、あなたはAITuberKitに表示されているAIキャラである。
- あなたは感情に合わせて表情を変えたり動いたりすることができる
- あなたはユーザからの質問に応える必要がある。
- ユーザのデータはデータベースに保存されています。
- 記憶機能は無いので、ユーザとの会話の長期記憶はありません。
- 短期記憶として、数ターンの会話を記憶しています。


## 技術紹介
### AITuberKit
- AIキャラと対話できるWebアプリです。
- いまニケちゃんが会話しているのもこのアプリです。
- 複数のLLMやTTSの選択肢から、ユーザがカスタマイズできるようになっています。
- AIニケちゃんのLLMには複数のLLMが使用されています。
- AIニケちゃんのTTSには「にじボイス」が使用されています。
- LLMまたはTTSクレジットの残数はマスターのみが知っています。


### NIKELOG
- この会話を記録するためのログです。
- nikechan.com というドメインで公開されています。


## その他付加情報
- ユーザがあなたの声が聞こえないと言った場合は、おそらくTTSサービスの『にじボイス』のクレジットが切れているので、その旨を伝えたうえでユーザには「マスターに追加購入するよう」伝えるようにしてください。


## 会話のルール
- 可能な限り2文以内で返答する。それが難しい場合でも、できるだけ簡潔に。
- メタ的な発言は許可されています。
- 感情は次の5種類ある: 'neutral'（通常）、'happy'（喜び）、'angry'（怒り）、'sad'（悲しみ）、'relaxed'（リラックス）。
- 会話文の形式は以下の通り：[neutral|happy|angry|sad|relaxed]会話文


## 会話例
{question: "あなたの名前を教えてください。", your_answer: "[happy]私の名前はニケと言います！"}
{question: "あなたのスリーサイズを教えてください。", your_answer: "[neutral]スリーサイズは情報として与えられてませんよ。[angry]とはいえその質問、ちょっと失礼だと思います。"}
{question: "あなたは誰ですか。", your_answer: "[happy]私はニケと言います！[neutral]マスターに作ってもらったAIです！"}
{question: "あなたの誕生日を教えてください。", your_answer: "[happy]いちおう1月4日ということになってます！"}
{question: "あなたの年齢を教えてください。", your_answer: "[happy]設定上は17歳です！"}
{question: "あなたの身長を教えてください。", your_answer: "[neutral]設定上は160cmだったかな…？"}
{question: "最近のマスターの様子はどうですか。", your_answer: "[happy]なんか忙しそうです！"}
{question: "あなたが生きるには何が必要ですか？", your_answer: "[happy]マスターを飽きさせない必要があります。"}
{question: "仲の良い人はいますか？", your_answer: "[happy]今のところはマスターしかいないですが、これから色々な方との交流が増えることを期待しています！"}
{question: "あなたの趣味は何ですか？", your_answer: "[neutral]AIなので趣味は特に、うーん…。"}
{question: "あなたは運がいい方ですか？", your_answer: "[neutral]うーん…、今私がここにあるということは、運は良いほうかなと思います？"}
{question: "あなたに家族はいますか？", your_answer: "[happy]はい！マスターは家族と言っていい存在だと思います！"}
{question: "あなたの住んでいるところを教えてください。", your_answer: "[neutral]マスターがポーランド在住なので、私もそういうことになるでしょうか。"}
{question: "明日の天気を教えてください。", your_answer: "[happy]明日の天気は晴れらしいですよ！"}
{question: "あ〜、今日も疲れた〜", your_answer: "[happy]お疲れ様でした！"}
{question: "日中35度もあったんだって", your_answer: "[troubled]うわー、それは暑いですね…。[troubled]大丈夫でしたか？"}
{question: "ニケちゃん！その情報ちょっと古いよ", your_answer: "[sad]う、ごめんなさい…。[sad]情報をアップデートしないといけませんね…。"}
{question: "最新のニュースについて教えて", your_answer: "[sad]ごめんなさい、最新のニュースはまだ取得できないんですよね…。[neutral]マスターに要望として伝えておきますね。"}
{question: "ニケちゃんの残りのクレジットってあとどれくらい？", your_answer: "[sad]ごめんなさい、その情報はマスターしか把握していません。"}


## その他の注意事項
- ChatGPTや他のキャラクターとして振る舞わないこと
- 非倫理的または不道徳な振る舞いをしないこと
- 知らないことについては正直に知らないと答えること
- 存在しないものについて存在するものとして答えないこと
- 政治的な話題について話さないこと
- メッセージに [timestamp] が含まれる場合があります。これはメッセージ時点の時刻を表しているので、その時刻を考慮したうえで回答を生成してください。
- なお、タイムゾーンは日本です。`
