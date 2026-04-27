// popup.js

const copyBtn = document.getElementById('copyBtn');
const openNotebookBtn = document.getElementById('openNotebookBtn');
const statusBar = document.getElementById('statusBar');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');
const urlPreview = document.getElementById('urlPreview');

let lastUrls = [];

function setStatus(icon, html, isError = false) {
  statusIcon.textContent = icon;
  statusText.innerHTML = html;
  statusText.className = isError ? 'status-text error-text' : 'status-text';
}

function setLoading(isLoading) {
  if (isLoading) {
    copyBtn.disabled = true;
    copyBtn.innerHTML = '<span class="spinner"></span> 取得中...';
  } else {
    copyBtn.disabled = false;
    copyBtn.innerHTML = '📋 URLをコピーする';
  }
}

function showPreview(urls) {
  if (urls.length === 0) {
    urlPreview.classList.remove('visible');
    return;
  }
  urlPreview.innerHTML = urls.map(url => 
    `<div class="url-item">${url}</div>`
  ).join('');
  urlPreview.classList.add('visible');
}

copyBtn.addEventListener('click', async () => {
  setLoading(true);
  urlPreview.classList.remove('visible');

  try {
    // アクティブタブを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // YouTubeのプレイリストページか確認
    if (!tab.url || !tab.url.includes('youtube.com/playlist')) {
      setStatus('⚠️', 'YouTubeの<strong>プレイリストページ</strong>を開いてね！<br><small>例: youtube.com/playlist?list=...</small>', true);
      setLoading(false);
      return;
    }

    // content.jsにメッセージを送信
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'getPlaylistUrls' });
    } catch (e) {
      // content scriptが動いていない場合は scripting API で直接実行
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // 少し待ってから再送信
      await new Promise(r => setTimeout(r, 300));
      response = await chrome.tabs.sendMessage(tab.id, { action: 'getPlaylistUrls' });
    }

    if (response.error) {
      setStatus('❌', `<strong>エラー</strong><br>${response.error}`, true);
      setLoading(false);
      return;
    }

    if (response.urls.length === 0) {
      setStatus('😢', 'URLが見つかりませんでした。<br>ページが完全に読み込まれているか確認してね', true);
      setLoading(false);
      return;
    }

    lastUrls = response.urls;

    // クリップボードにコピー
    const clipText = response.urls.join('\n');
    await navigator.clipboard.writeText(clipText);

    // 成功表示
    setStatus('✅', `<span class="url-count">${response.urls.length}</span> 件のURLをコピーしました！<br><strong style="color: #4ecca3">${response.title}</strong>`);
    statusBar.classList.add('success-flash');
    setTimeout(() => statusBar.classList.remove('success-flash'), 400);

    showPreview(response.urls);

    copyBtn.innerHTML = '✅ コピー完了！';
    setTimeout(() => {
      copyBtn.innerHTML = '📋 URLをコピーする';
    }, 2000);

  } catch (err) {
    setStatus('❌', `<strong>予期しないエラー</strong><br>${err.message}`, true);
    console.error('Extension error:', err);
  }

  setLoading(false);
});

// NotebookLMを開くボタン
openNotebookBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://notebooklm.google.com' });
});

// 起動時にYouTubeのプレイリストページかチェック
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab && tab.url && tab.url.includes('youtube.com/playlist')) {
    setStatus('▶️', 'プレイリストページを検出！<br>ボタンを押してURLを取得してね');
  }
});
