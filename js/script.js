document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================================
       1. テーマ切り替え機能（ダークモード / ライトモード）
       ========================================================================= */
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        if (currentTheme === 'light') {
            html.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '☀️ Light'; // 次に押すときはLightモードへ
        } else {
            html.setAttribute('data-theme', 'light');
            themeToggle.textContent = '🌙 Dark'; // 次に押すときはDarkモードへ
        }
    });


    /* =========================================================================
       2. フィルタリング機能（ゲーム、ブログ記事の絞り込み）
       ========================================================================= */
    // 引数 wrapperId: ボタンを囲んでいるdivのID
    // 引数 itemSelector: 絞り込む対象の要素群のCSSセレクタ
    function setupFilter(wrapperId, itemSelector) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        const buttons = wrapper.querySelectorAll('.filter-btn');
        const items = document.querySelectorAll(itemSelector);

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                // (A) アクティブなボタンの見た目を切り替える
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // (B) クリックされたボタンに設定された絞り込み条件(data-filter)を取得
                const filterValue = button.getAttribute('data-filter');

                // (C) 各要素をチェックして表示/非表示をアニメーションさせる
                items.forEach(item => {
                    const itemCategory = item.getAttribute('data-category');

                    if (filterValue === 'all' || filterValue === itemCategory) {
                        // 【表示する要素の処理】
                        item.classList.remove('card-hidden');

                        // setTimeoutを使って少し遅延させることで、
                        // CSSのアニメーション（opacity, transform）をブラウザに認識させます
                        setTimeout(() => {
                            if (!item.classList.contains('card-hidden')) {
                                item.style.position = 'relative'; // 通常の配置に戻す
                            }
                        }, 50);
                    } else {
                        // 【非表示にする要素の処理】
                        item.classList.add('card-hidden');

                        // アニメーション完了後（0.4秒後）に要素を絶対配置(absolute)にし、
                        // レイアウト上の隙間を詰めます
                        setTimeout(() => {
                            if (item.classList.contains('card-hidden')) {
                                item.style.position = 'absolute';
                            }
                        }, 400);
                    }
                });
            });
        });
    }

    // フィルタリング関数の実行
    setupFilter('portfolioFilters', '#portfolio .card');
    setupFilter('blogFilters', '#blog .blog-item');


    /* =========================================================================
       3. スクロールアニメーション機能 (Intersection Observer API)
       画面をスクロールして要素が見えたときに「フワッ」と表示させます。
       ========================================================================= */
    const revealElements = document.querySelectorAll('.reveal-up');

    // 監視の設定
    const observerOptions = {
        root: null, // ブラウザの表示領域(ビューポート)を基準にする
        rootMargin: '0px',
        threshold: 0.1 // 要素が10%見えたらアニメーションを発火
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // 要素が画面に入った場合
            if (entry.isIntersecting) {
                // activeクラスを付与し、CSSで定義したアニメーションを動かす
                entry.target.classList.add('active');
                // 一度表示させたら監視を解除する（何度もアニメーションさせないため）
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // .reveal-up クラスを持つすべての要素を監視対象に登録
    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    /* =========================================================================
       4. Note RSSの自動取得機能
       ========================================================================= */
    const blogContainer = document.getElementById('blogContainer');
    const blogLoading = document.getElementById('blogLoading');

    // 【重要】ご自身のNoteのIDに書き換えてください。
    // 例: URLが https://note.com/yamada/ ならば 'yamada' と入力します。
    // 今はダミーとして 'your_username' を入れています。
    const NOTE_USER_ID = 'ryukyugame_kobo';

    // NoteのRSS URL
    const RSS_URL = `https://note.com/${NOTE_USER_ID}/rss`;
    // rss2json APIを使ってCORS（セキュリティエラー）を回避してJSONに変換します
    const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

    // 記事のタイトルから自動でカテゴリ（タグ）を判定する関数
    function categorizeArticle(title) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('unity') || lowerTitle.includes('c#')) {
            return { id: 'unity-cs', label: '#Unity' };
        } else if (lowerTitle.includes('ue') || lowerTitle.includes('unreal')) {
            return { id: 'ue', label: '#UnrealEngine' };
        } else if (lowerTitle.includes('scratch')) {
            return { id: 'scratch', label: '#Scratch' };
        } else {
            return { id: 'other', label: '#Blog' }; // 該当しない場合は汎用タグ
        }
    }

    // データを取得して画面に表示する非同期関数（async/await）
    async function fetchNoteArticles() {
        if (!blogContainer) return;

        try {
            // APIにリクエストを送ってデータを取得
            const response = await fetch(API_URL);

            // うまく取得できなかった場合のエラー処理
            if (!response.ok) {
                throw new Error('ネットワークエラーが発生しました');
            }

            // 取得したデータをJavaScriptで使いやすいJSONに変換
            const data = await response.json();

            // ローディング表示を消す
            if (blogLoading) {
                blogLoading.style.display = 'none';
            }

            // 記事データを取り出す (data.itemsの中に記事の配列が入っています)
            const articles = data.items;

            // 記事がない場合の処理
            if (!articles || articles.length === 0) {
                blogContainer.innerHTML = '<p class="loading-message">記事が見つかりませんでした。</p>';
                return;
            }

            // 記事ごとにHTMLを作ってコンテナに追加していく
            articles.forEach(article => {
                const category = categorizeArticle(article.title);

                // 投稿日時を yyyy.mm.dd 形式に整形して見やすくする
                const pubDate = new Date(article.pubDate);
                const formattedDate = `${pubDate.getFullYear()}.${String(pubDate.getMonth() + 1).padStart(2, '0')}.${String(pubDate.getDate()).padStart(2, '0')}`;

                // 新しい <a> タグ（リンク）を作成
                const articleElement = document.createElement('a');
                articleElement.href = article.link;
                articleElement.target = '_blank';
                articleElement.rel = 'noopener noreferrer';
                // フィルタリング用にクラスと data-category をセット
                articleElement.className = 'blog-item glass-card';
                articleElement.setAttribute('data-category', category.id);

                // カードの中身のHTMLをセット
                articleElement.innerHTML = `
                    <div class="blog-content">
                        <h3>${article.title}</h3>
                        <div class="blog-meta">
                            <time datetime="${article.pubDate}">${formattedDate}</time>
                            <span class="blog-tag">${category.label}</span>
                        </div>
                    </div>
                    <div class="blog-icon">↗</div>
                `;

                // 画面(blogContainer)に完成したカードを追加
                blogContainer.appendChild(articleElement);
            });

            // 記事が新しく追加されたので、フィルタリング機能を一回手動で動かす
            // （現在選ばれているフィルターに合わせて表示を整理するため）
            const activeFilter = document.querySelector('#blogFilters .filter-btn.active');
            if (activeFilter) {
                activeFilter.click();
            }

        } catch (error) {
            console.error('RSS取得エラー:', error);
            if (blogLoading) {
                blogLoading.innerHTML = '<p>記事の読み込みに失敗しました。NoteのIDが正しいか確認してください。</p>';
            }
        }
    }

    // ページの準備ができたら関数を呼び出してデータ取得を開始
    fetchNoteArticles();

});