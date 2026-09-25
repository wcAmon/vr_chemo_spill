# 化療藥物潑灑處理・五站任務

只含玩家遊玩狀態的獨立 3D 教學遊戲。先自由參觀，對準中央啟動台按 **F** 開始計時，依序完成通報、警示、防護、清理與廢棄物處理。

## 遊玩

下載根目錄 **index.html** 並用現代瀏覽器開啟，或使用發布連結。HTML 內含 JavaScript、CSS、程序化模型、動作資料、場景布局及 Havok WebAssembly，不需要遊戲伺服器、登入或額外素材下載。語音使用瀏覽器語音功能；若裝置沒有可用聲音，仍可依文字提示遊玩。體感功能需瀏覽器與裝置允許。

- WASD：移動；滑鼠：環視。
- F：拿起、開啟、閱讀、按啟動台開始。
- 左鍵：使用或放置手持物件；廣播完放下麥克風。
- Esc：暫停／繼續；選單可重新開始。
- 手機：搖桿移動、滑動環視、右側兩個動作按鈕。

## 檔案

- `index.html`：可直接分享的單檔遊戲。
- `docs/WORLD_ANNOTATIONS.md`：世界標註、物件設計及 agent 製作說明。
- `src/world.json`：公開版場景布局。
- `src/`：可重建的遊戲與模型原始碼。
- `docs/VERIFICATION.md`：驗證方法與範圍。
- `THIRD_PARTY_NOTICES.md` / `LICENSES/`：第三方授權。

沒有場景編輯器、標記編輯工具、發布切換、資料同步、帳密或私有主機設定。原專案的歷史不在本儲存庫。

## 開發與重建

Node.js 22 或更新版本：

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`npm run dev` 後開啟 `/app.html`。`app.html` 是開發入口，`index.html` 是完成品；請修改 src 後重建，不要手改 bundle。

瀏覽器測試使用 Playwright（可自行安裝於開發環境）；啟動開發伺服器於 5190 後執行 `node tests/browser.cjs`，觸控模擬加 `MOBILE=1`；`node tests/offline.cjs` 驗證成品不發出外部請求。QA 測試橋只存在於開發模式，不包含在發布 HTML。

此遊戲作為教學情境練習，實務作業仍依院內規範與指導。桌面與觸控模擬已測試；尚未驗證頭戴式 WebXR 或真實手機裝置。
