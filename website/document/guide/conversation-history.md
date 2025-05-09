# 会話履歴設定

## 概要

AITuberKitでは、AIとの会話履歴を保持し、会話の文脈を維持することができます。会話履歴は、AIが過去の会話を参照して適切な応答を生成するために使用されます。

## 表示と編集

会話履歴設定画面では、現在保持されている会話履歴を確認し、編集することができます。各メッセージは「You」（ユーザー）と「Character」（AIキャラクター）のラベルで区別されます。

テキストフィールドをクリックすると、会話内容を直接編集することができます。これにより、AIの応答や自分の質問を修正することが可能です。

## 会話履歴リセット

「会話履歴リセット」ボタンをクリックすると、現在保持されているすべての会話履歴を削除することができます。これにより、AIとの会話を新しく始めることができます。

::: tip TIP
会話履歴をリセットすると、AIはそれまでの会話の文脈を失います。新しいトピックについて話し始めたい場合や、AIの応答がおかしくなった場合にリセットすると効果的です。
:::

## 過去のメッセージの保持数

AITuberKitでは、デフォルトで直近の10会話が記憶として保持されます。この値はAI設定画面で変更することができます。

保持数を増やすと、AIはより長い会話の文脈を理解できるようになりますが、APIリクエストのサイズが大きくなり、応答時間が長くなる可能性があります。

::: warning 注意
保持数を大きくしすぎると、AIサービスのトークン制限に達する可能性があります。特に長い会話を行う場合は、適切な値に設定してください。
:::
