// content.js - YouTubeプレイリストページから全動画URLを取得する

function extractPlaylistUrls() {
  const results = {
    urls: [],
    title: '',
    error: null
  };

  try {
    // プレイリストタイトルを取得
    const titleEl = document.querySelector('h1.style-scope.ytd-playlist-header-renderer') 
      || document.querySelector('yt-formatted-string.style-scope.ytd-playlist-header-renderer')
      || document.querySelector('#title');
    results.title = titleEl ? titleEl.textContent.trim() : 'YouTubeプレイリスト';

    // プレイリストの動画リンクを取得
    // ytd-playlist-video-renderer 内の a#video-title を全て取得
    const videoLinks = document.querySelectorAll('ytd-playlist-video-renderer a#video-title');
    
    const seen = new Set();
    
    videoLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('/watch?v=')) {
        // URLからリストパラメータを除いてv=だけ残す
        try {
          const url = new URL(href, 'https://www.youtube.com');
          const videoId = url.searchParams.get('v');
          if (videoId && !seen.has(videoId)) {
            seen.add(videoId);
            results.urls.push(`https://www.youtube.com/watch?v=${videoId}`);
          }
        } catch (e) {
          // URLパースエラーは無視
        }
      }
    });

    if (results.urls.length === 0) {
      results.error = 'URLが見つかりませんでした。プレイリストページを開いているか確認してください。';
    }

  } catch (e) {
    results.error = `エラーが発生しました: ${e.message}`;
  }

  return results;
}

// popup.js からのメッセージを受け取る
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPlaylistUrls') {
    const results = extractPlaylistUrls();
    sendResponse(results);
  }
  return true; // 非同期レスポンスを許可
});
