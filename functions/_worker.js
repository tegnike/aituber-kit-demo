export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // もしURLが .vrm で終わるなら…
    if (url.pathname.endsWith('.vrm')) {
      // ① パスを書き換えて、.vrm.gz を取りに行かせる
      url.pathname += '.gz'; // 例: /avatar.vrm → /avatar.vrm.gz

      // ② 書き換えたパスで静的ファイルを取ってくる
      let newRequest = new Request(url, request);
      let response = await env.ASSETS.fetch(newRequest);

      // ③ レスポンスヘッダを編集して「これは gzip ですよ」と伝える
      let newHeaders = new Headers(response.headers);
      newHeaders.set('Content-Encoding', 'gzip');
      // 例えば Content-Type は VRMを扱うなら application/octet-stream など
      newHeaders.set('Content-Type', 'application/octet-stream');

      return new Response(response.body, { headers: newHeaders });
    }

    // それ以外は普通に静的ファイルとして返す
    return env.ASSETS.fetch(request);
  }
}
