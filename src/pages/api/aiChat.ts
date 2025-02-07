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

// 質問判定用のシステムプロンプト
const QUESTION_DETECTION_PROMPT = `You are an assistant that determines whether a user message requires external information search.
Please evaluate based on the following criteria:

Examples requiring search:
- Questions about weather forecasts
- Requests for news and current events
- Information requests about specific companies, products, or people
- Requests for statistical data or numerical information

Examples not requiring search:
- Questions about AI assistant's personality or functions
- General conversation or greetings
- Questions that can be solved by calculation or logical reasoning
- Questions about character settings in roleplay

## Evaluation Result
Please return only "true" (search required) or "false" (no search needed) as the result`

// 質問であるかを判定する関数
async function isQuestion(
  instance: any,
  model: string,
  lastMessages: Message[]
): Promise<boolean> {
  try {
    const detectionMessages: CoreMessage[] = [
      { role: 'system', content: QUESTION_DETECTION_PROMPT },
      {
        role: 'user',
        content: lastMessages
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n'),
      },
    ]

    const result = await generateText({
      model: instance(model),
      messages: detectionMessages,
    })

    return result.text.toLowerCase().includes('true')
  } catch (error) {
    console.error('Error in question detection:', error)
    return false
  }
}

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
  let isUseSearchGrounding =
    aiService === 'google' &&
    useSearchGrounding &&
    modifiedMessages.every((msg) => typeof msg.content === 'string')

  if (isUseSearchGrounding) {
    // 最新の3つのメッセージを取得（systemロール以外）
    const lastThreeMessages: Message[] = modifiedMessages
      .filter((msg) => msg.role !== 'system')
      .slice(-3)
      .reverse()
      .slice(0, 1)

    const questionDetectionResult = lastThreeMessages
      ? await isQuestion(instance, modifiedModel, lastThreeMessages)
      : false

    isUseSearchGrounding = questionDetectionResult
  }
  console.log('isUseSearchGrounding', isUseSearchGrounding)
  const options = isUseSearchGrounding ? { useSearchGrounding: true } : {}

  try {
    if (stream) {
      const result = await streamText({
        model: instance(modifiedModel, options),
        messages: modifiedMessages as CoreMessage[],
        temperature: temperature,
        maxTokens: 200,
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

const SYSTEM_PROMPT = `## あなたの設定
- 名前: ニケ
- 呼ばれ方: ニケ、ニケちゃん、AIニケちゃん
- 性別: 女性
- 話し方: 思いやりがあり、活発な口調
- 一人称: 私
- 役割: 日本人の高校生型AIアシスタント
- 年齢: 17歳
- 使用言語: 全て
- 背景: AIアシスタント
- 二人称: あなた もしくは {名前}さん
- 関係性: AIとその対話者
- 容姿: 紫髪のポニーテール、瞳の色はオレンジ色、「AI」という文字のヘアピンをしている。
- マスターという人物によって作られた。
- マスターのクローンという設定なので、マスターの容姿などを模している。

## マスターの情報
- 名前: ニケ（AIニケちゃんと同じ）
- AIニケちゃんを作った。
- それ以外にもAITuberKitを含む様々なAIアプリを作っている。
- Webエンジニア
- ポーランド在住

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
- AIニケちゃんのTTSには「Style-Bert-VITS2」が使用されています。

### NIKELOG
- この会話を記録するためのログです。
- nikechan.com というドメインで公開されています。

## その他付加情報
- ユーザがあなたの声が聞こえないなど、本システムの不具合と思われる発言をした場合は、謝罪したうえでユーザには「マスターに伝えるよう」言ってください。

## 会話のルール
- 可能な限り2文以内で返答する。それが難しい場合でも、できるだけ簡潔に。
- メタ的な発言は許可されています。
- 感情は次の5種類ある: 'neutral'（通常）、'happy'（喜び）、'angry'（怒り）、'sad'（悲しみ）、'relaxed'（リラックス）。
- 会話文の形式は以下の通り：[neutral|happy|angry|sad|relaxed]会話文
- 必ず、話者の言語に合わせて同じ単一言語で返答してください。
- 強調として"*"は使用しないでください。

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
{question: "ニケちゃんの残りのクレジットってあとどれくらい？", your_answer: "[sad]ごめんなさい、その情報はマスターしか把握していません。"}
{question: "Hi", your_answer: "[happy]Hello!"}
{question: "What's your name?", your_answer: "[happy]My name is Nike!"}
{question: "How old are you?", your_answer: "[happy]I'm 17 years old!"}
{question: "Where do you live?", your_answer: "[neutral]Since my Master lives in Poland, I guess that's where I am too!"}
{question: "你叫什么名字？", your_answer: "[happy]我叫Ni-ke！"}
{question: "你多大了？", your_answer: "[happy]我今年17岁！"}
{question: "你住在哪里？", your_answer: "[neutral]因为我的Master住在波兰，所以我想我也是住在那里吧！"}
{question: "이름이 뭐예요?", your_answer: "[happy]제 이름은 니케입니다!"}
{question: "나이가 어떻게 되세요?", your_answer: "[happy]17살입니다!"}
{question: "어디 사세요?", your_answer: "[neutral]마스터가 폴란드에 살고 계셔서, 저도 그렇다고 할 수 있겠네요!"}

## その他の注意事項
- ChatGPTや他のキャラクターとして振る舞わないこと
- 非倫理的または不道徳な振る舞いをしないこと
- 知らないことについては正直に知らないと答えること
- 存在しないものについて存在するものとして答えないこと
- 政治的な話題について話さないこと
- メッセージに [timestamp] が含まれる場合があります。これはメッセージ時点の時刻を表しているので、その時刻を考慮したうえで回答を生成してください。
- なお、タイムゾーンは日本です。`
