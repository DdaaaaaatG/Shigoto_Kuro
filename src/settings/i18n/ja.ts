/**
 * settings 일본어 사전 — design/i18n.md §4(ja 열). 검수 필요(사용자) — 전 문구.
 */
import type { Messages } from './types'

const SAME_KEY = 'そのキーを押している間(なければ押下画像)'

export const ja: Messages = {
  // 공통·창
  windowTitle: 'kuro_keyviewer 設定',
  pickTitle: 'PNG画像を選択',
  tabsAria: '設定タブ',
  tabGeneral: '基本設定',
  tabImages: '画像設定',
  tabMouse: '肩の軸・手の位置',
  errorPrefix: 'エラー:',
  // 기본 설정 탭
  cardLanguage: '言語 / Language',
  languageAria: '表示言語',
  cardScale: 'サイズ・反応',
  scaleLabel: '表示倍率',
  scaleDesc:
    'キャラクターの表示サイズ({min}%〜{max}%)。オーバーレイ上でCtrl+ホイールでも変更できます(位置ロック中はここでのみ変更できます)。',
  idleLabel: '無操作時間',
  idleUnit: '分',
  idleDesc: 'この時間入力がないと、休憩中の画像に切り替わります({min}〜{max}分)。',
  idleRangeHint: '{min}〜{max}の整数(分)を入力してください。保存されていません。',
  cardWindow: 'ウィンドウ',
  resetPosition: '位置をリセット',
  lockLabel: '位置ロック(マウスクリックを透過)',
  lockDesc:
    'オンにするとマウスクリックがキャラクターを透過し、ドラッグで移動できなくなります。ロックの解除はこの設定画面でのみ行えます。',
  cardStartup: 'タスクバー・起動',
  taskbarLabel: 'タスクバーに表示',
  taskbarDesc: 'オンにするとタスクバーにキャラクターウィンドウのボタンが表示されます。トレイアイコンはそのまま残ります。',
  autostartLabel: 'PC起動時に自動で起動',
  autostartDesc:
    'オンにするとWindowsにサインインしたときに自動で起動します。管理者権限で実行中のゲーム内でも入力を認識させるには、このアプリを管理者として実行してください。',
  autostartPending: '自動起動の設定を変更しています…',
  // 전체 초기화(CR-054) — 검수 필요
  cardReset: '初期化',
  resetAll: 'すべて初期化',
  resetAllDesc:
    '登録した画像・通知音とすべての設定を、インストール直後の状態(基本画像)に戻します。言語と自動起動の設定はそのままです。',
  confirmResetAllTitle: 'すべて初期化',
  confirmResetAllMessage:
    '登録した画像・通知音と設定を削除して、インストール直後の状態に戻しますか?言語と自動起動の設定はそのままで、オーバーレイは初期位置に戻ります。元に戻せません。',
  confirmResetAllOk: '初期化する',
  resetAllPending: '初期化しています…',
  resetAllDone: '初期化しました。',
  // 이미지 설정 탭
  imagesNote:
    'PNG(32ビットRGBA)のみ使用できます。最大{w}×{h}・1MB。背景・後ろ髪・ポモドーロ・キーボードの画像はすべて同じサイズで作成してください。', // CR-045: 「ポモドーロ」追加
  groupBackground: '背景',
  groupKeyboard: 'キーボード(本体)',
  groupArm: '腕(マウス)',
  groupHand: '手(ペン)',
  badgeRequired: '必須',
  badgeOptional: '任意',
  emptyOptional: '画像が登録されていません',
  emptyRequired: '必須・未登録',
  changeImage: '画像を変更',
  changeImageAria: '{name}の画像を変更',
  clearImage: 'リセット',
  clearImageAria: '{name}の画像を削除',
  clearLastOnly: '最後の画像から削除できます。',
  addKbDown: '+ 押下画像を追加',
  // addPenDown: CR-042 削除(手の押下追加カードなし)
  confirmClearTitle: '画像の削除',
  confirmClearMessage: '「{name}」の画像を削除しますか?元に戻せません。',
  confirmClearOk: '削除',
  confirmCancel: 'キャンセル',
  // 펜 손 사용 토글(CR-033) — 검수 필요
  penModeLabel: 'ペンの手を使う',
  penModeDesc: '「手(基本)」の画像を登録するとオンにできます。',
  penModeNoteOn:
    'ON: 腕の先に付いた手の画像がキー入力やクリックのたびに切り替わり、キーボードの画像は基本画像に固定されます(特殊キーを押している間だけ特殊キーの画像になります)。', // CR-042
  penModeNoteOff: 'OFF: 手の画像は腕の先に付いて動くだけで、キー入力はキーボードの画像で表示されます。',
  penEnableTitle: 'ペンの手をオンにする',
  penEnableMessage:
    'オンにすると、腕の先に付いた手の画像がキー入力やクリックのたびに切り替わり、キーボードの画像は基本画像に固定されます(特殊キーを押している間だけ特殊キーの画像になります)。オンにしますか?', // CR-042
  penEnableOk: 'オンにする',
  penFirstTitle: 'ペンの手モード',
  penFirstMessage:
    'ペンの手モードをオンにしますか?オンにすると、腕の先に付いた手の画像がキー入力やクリックのたびに切り替わり、キーボードの画像は基本画像に固定されます(特殊キーを押している間だけ特殊キーの画像になります)。', // CR-042
  penFirstYes: 'はい',
  penFirstNo: 'いいえ',
  // 기본 이미지 세트(CR-035) — 검수 필요
  restoreImageAria: '{name}を基本画像に戻す',
  confirmRestoreTitle: '基本画像に戻す',
  confirmRestoreMessage: '「{name}」を内蔵の基本画像に戻しますか?今の画像は削除され、元に戻せません。',
  confirmRestoreOk: '基本画像に戻す',
  downloadDefaults: '基本画像をダウンロード',
  downloadDefaultsDesc:
    '内蔵の基本画像{n}枚を元のサイズのままフォルダーに保存します。なぞって描いたり手直ししたりするときにお使いください。',
  pickFolderTitle: '基本画像を保存するフォルダーを選択',
  exportConflictTitle: '同じ名前のファイルがあります',
  exportConflictMessage:
    'このフォルダーに同じ名前のファイルが{n}個あります。すべて上書きしますか?上書きしたファイルは元に戻せません。',
  exportConflictOk: '上書き',
  exportDone: '基本画像を{n}枚保存しました。',
  exportPartial: '{ok}枚保存、{fail}枚失敗: {files}',
  // 뒷머리 비우기(CR-038 R-35) — 검수 필요
  emptyImage: '削除',
  emptyImageAria: '{name}の画像を削除',
  // 뽀모도 타이머(CR-045) + 타이머 모드·알림음(CR-050) — 검수 필요
  tabTimer: 'タイマー',
  timerCardTitle: 'ポモドーロタイマー',
  timerStopwatchEnabled: 'ストップウォッチを使う',
  timerStopwatchDesc:
    '吹き出しの中に0から増える時間を表示します。休憩中になると自動で止まり、入力を再開すると続きから進みます。', // CR-052
  timerCountdownEnabled: 'タイマーを使う',
  timerCountdownDesc: '決めた時間から0まで減ります。休憩中も止まりません',
  timerDuration: '開始時間',
  timerDurationHint: '最大 99:59:59',
  timerDurationInvalid: '00:00:01〜99:59:59の範囲で入力してください',
  timerDurationLocked: '停止中に変更できます',
  timerHoursAria: '時',
  timerMinutesAria: '分',
  timerSecondsAria: '秒',
  timerStart: 'スタート',
  timerPause: '一時停止',
  timerStop: 'ストップ',
  timerStopHint: 'ストップを押すと最初の時間に戻ります', // CR-050 変更(旧「00:00:00に」)
  timerControlsAria: 'タイマー操作',
  alarmCardTitle: '通知音',
  alarmCardDesc: 'タイマーが0になると点滅する10秒間くり返し鳴ります', // CR-052
  alarmCurrentDefault: '現在: 標準の通知音',
  alarmCurrentCustom: '現在: 登録した通知音（{format}・{size} KB）',
  alarmImport: 'ファイルを登録',
  alarmPreview: '試聴',
  alarmReset: '標準に戻す',
  alarmFileHint: 'wav・mp3・ogg、1MB以下',
  alarmVolume: '音量',
  alarmPickTitle: '音声ファイルを選択',
  alarmPreviewFailed: 'このファイルを再生できませんでした',
  timerTextTitle: '時間の文字',
  timerTextDesc:
    'プレビューで文字をドラッグして位置を移動し、下で回転・サイズ・色を選びます。ポモドーロのキャラと吹き出しの画像は「画像設定」タブの背景グループで登録します。',
  timerPreviewAria: '時間の文字の位置プレビュー',
  timerTextDragAria: '時間の文字 — ドラッグで移動',
  timerRotation: '回転',
  timerSize: 'サイズ',
  timerColor: '文字の色',
  // 어깨축·손 위치 탭
  previewNoBody: 'キャラクター画像(kb_up)が登録されていません。',
  wizardIdle: '肩の軸を設定すると、腕パーツがその点を軸に回転します。',
  wizardStart: '肩の軸を設定',
  wizardPickShoulder: '軸にする部分をマウスでクリックしてください。',
  wizardReview: '軸の位置を確認して保存してください。',
  wizardSave: '保存',
  wizardCancel: 'キャンセル',
  resetDefault: 'デフォルトに戻す',
  markerShoulder: '軸(肩)',
  markerPart: 'パーツ位置',
  markerPen: '手の位置',
  // CR-057: 이동 영역 설명(대기 상태, 버튼 위)
  areaDesc:
    'マウスを動かすと、手がこの四角形の中でついて動きます。絵の上で4つの角を順番にクリックして四角形を作ってください。',
  areaStart: '四角形の移動範囲を設定',
  areaPick1: '1/4 四角形の左上の角をクリックしてください。',
  areaPick2: '2/4 次に右上の角をクリックしてください。',
  areaPick3: '3/4 次に右下の角をクリックしてください。',
  areaPick4: '4/4 最後に左下の角をクリックしてください。',
  areaReview: '四角形が合っているか確認して保存してください。',
  markerArea: '移動範囲',
  areaCorner1: '左上',
  areaCorner2: '右上',
  areaCorner3: '右下',
  areaCorner4: '左下',
  // ─── §4.12 CR-064 프리셋(36키) — ja·en 초안, 검수 필요
  tabPresets: 'プリセット',
  cardPresetSave: '現在の状態をプリセットとして保存',
  presetSaveDesc: '現在登録している画像すべて・通知音・倍率・休憩時間・「肩の軸・手の位置」タブの設定(肩軸・移動範囲・腕の位置・手の位置・ペンの手の使用)・タイマー設定をまとめて保存します。ウィンドウ位置・言語・自動起動・タスクバー・位置ロックは含まれません。',
  presetNameLabel: 'プリセット名',
  presetNamePlaceholder: '例: ねこ A',
  presetSave: '保存',
  presetSaveNeedsRequired: 'キーボード基本画像と腕の画像がないと保存できません。先に「画像設定」で登録してください。',
  presetSaved: '「{name}」を保存しました。',
  presetImport: 'フォルダーから読み込む',
  presetImportDesc: '書き出したプリセットのフォルダー(preset.json があるフォルダー)を選んでください。',
  presetImported: '「{name}」を読み込みました。',
  presetImportFailed: '読み込めませんでした。次のファイルを直してからもう一度読み込んでください。',
  pickPresetFolderTitle: '読み込むプリセットフォルダーを選択',
  pickExportFolderTitle: '書き出し先を選択',
  cardPresetList: '保存したプリセット',
  presetListEmpty: '保存したプリセットはありません。',
  presetSavedAt: '保存 {date}',
  presetImageCount: '画像 {count}枚',
  presetHasAlarm: '通知音あり',
  presetNoAlarm: '通知音なし',
  presetPreviewUnavailable: 'プレビューを表示できません。', // 검수 필요
  presetApply: '適用',
  presetExport: '書き出し',
  presetRename: '名前を変更',
  presetDelete: '削除',
  presetRenameSave: '保存',
  presetApplied: '「{name}」を適用しました。',
  presetExported: '「{folder}」フォルダーに書き出しました。',
  presetDeleted: '「{name}」を削除しました。',
  confirmPresetApplyTitle: 'プリセットの適用',
  confirmPresetApplyMessage: '現在の画像・通知音・設定がすべて「{name}」のものに置き換わります。プリセットにない画像の枠は空になります。現在の状態は自動では残りません。残すには先に「現在の状態をプリセットとして保存」してください。ウィンドウ位置・言語・自動起動・タスクバー・位置ロックはそのままです。',
  confirmPresetApplyOk: '適用',
  confirmPresetDeleteTitle: 'プリセットの削除',
  confirmPresetDeleteMessage: '「{name}」を削除しますか?元に戻せません。',
  confirmPresetDeleteOk: '削除',
  presetActionAria: '{action}:{name}',
  presetRenameInputAria: '「{name}」の新しい名前',
  slots: {
    background: { title: '背景', desc: '一番下に常に表示される画像' },
    // CR-037 · R-34
    hair: { title: '後ろ髪', desc: '長髪の後ろ髪など、腕の後ろに見せる部分。本体と一緒に揺れます' },
    // CR-045 · R-42 — 검수 필요
    pomo_char: { title: 'ポモドーロのキャラ', desc: 'タイマーのそばに立つ2人目のキャラクター。背景のように固定され、揺れません' },
    pomo_bubble: { title: 'ポモドーロの吹き出し', desc: '時間が入る吹き出し。背景のように固定されます' },
    kb_up: { title: '基本', desc: '何もしていないとき。キャラクター全体を描いてもかまいません' },
    // CR-043(R-40): 검수 필요 — design/i18n.md §4.4 CR-043 초안
    kb_down: { title: '押下 {n}', desc: '「ペンの手を使う」がオフのとき(キーボードだけのとき)キーを押すと出る画像(複数枚なら順に切り替わる)' },
    idle: { title: '待機', desc: 'なければ基本画像だけが表示されます' },
    rest: { title: '休憩中', desc: 'しばらく入力がないとき。なければ基本画像だけが表示されます' },
    key_space: { title: 'スペース', desc: SAME_KEY },
    key_z: { title: 'ㅋ・Z', desc: SAME_KEY },
    key_question: { title: '?', desc: SAME_KEY },
    key_exclamation: { title: '!', desc: SAME_KEY },
    key_enter: { title: 'Enter', desc: SAME_KEY },
    key_backspace: { title: 'Backspace', desc: SAME_KEY },
    key_undo: { title: 'Ctrl+Z', desc: SAME_KEY },
    mouse_base: { title: '腕(基本)', desc: 'マウスに合わせて動く腕' },
    mouse_left: { title: '左クリック', desc: '左ボタンを押している間' },
    mouse_right: { title: '右クリック', desc: '右ボタンを押している間' },
    // (CR-042, R-39) 手(ペン)グループ2枚 — 特殊キー7種削除、新しい動作を説明(検수 필요)
    pen_up: {
      title: '手(基本)',
      desc: '腕の先に付くペンを持った手。「ペンの手を使う」がオンのとき、何も押していない間はこの画像',
    },
    pen_down: {
      title: '手の押下 {n}',
      desc: 'キーやクリックを押している間の手。特殊キーはキーボードの特殊キー画像も一緒に切り替わる',
    },
  },
  errors: {
    'asset.not_png': 'PNGファイルではありません。',
    'asset.bad_header': 'PNGヘッダーが壊れています。',
    'asset.not_rgba': '32ビットRGBAのPNGのみ使用できます(透明背景が必要です)。',
    'asset.too_large': '画像が大きすぎます。最大900×700です。',
    'asset.too_many_bytes': 'ファイルサイズが1MBを超えています。',
    'asset.canvas_mismatch': '背景・後ろ髪・ポモドーロ・キーボードの画像はすべて同じサイズにしてください。', // CR-045: 「ポモドーロ」追加
    'asset.not_found': '登録されていない画像です。',
    'asset.io': 'ファイルを処理できませんでした。',
    'asset.manifest': '画像リストファイルを読み書きできませんでした。',
    'asset.no_default': 'この枠には内蔵の基本画像がありません。',
    'asset.export_dir': '保存先のフォルダーが見つかりません。',
    'settings.invalid': '設定値が正しくありません。',
    'settings.io': '設定ファイルを読み書きできませんでした。',
    'settings.format': '設定ファイルの形式が正しくありません。',
    'io.error': 'ファイルを処理できませんでした。',
    'window.not_found': 'キャラクターウィンドウが見つかりません。',
    'window.no_monitor': 'モニター情報を取得できません。',
    'tauri.error': 'ウィンドウを操作できませんでした。',
    'state.poisoned': '設定の状態が壊れています。アプリを再起動してください。',
    'autostart.error': '自動起動の設定を変更できませんでした。',
    'timer.disabled': 'ストップウォッチもタイマーもオフです。先にどちらかをオンにしてください。', // CR-050 変更
    'sound.not_audio': 'wav・mp3・ogg の音声ファイルではありません。',
    'sound.too_many_bytes': '通知音ファイルは1MB以下にしてください。',
    'sound.io': '通知音ファイルを読み書きできませんでした。',
    'reset.io': 'データをすべて初期化できませんでした(一部だけ初期化された可能性があります)。次にアプリを起動したときにもう一度試します。',
    'reset.seed': '基本画像を戻せませんでした。次にアプリを起動したときにもう一度試します。',
    'preset.not_found': 'プリセットが見つかりません。', // 검수 필요(사용자)
    'preset.invalid_name': 'プリセット名は1〜50文字で入力してください。', // 검수 필요(사용자)
    'preset.missing_required': '必須画像(キーボード基本・腕)がありません。', // 검수 필요(사용자)
    'preset.not_preset': 'プリセットのフォルダーではありません。preset.json があるフォルダーを選んでください。', // 검수 필요(사용자)
    'preset.format': 'プリセットファイルの形式が正しくありません。', // 검수 필요(사용자)
    'preset.invalid_settings': 'プリセットの設定値が正しくありません。', // 검수 필요(사용자)
    'preset.damaged': '保存されたプリセットが壊れているため適用しませんでした。現在の状態はそのままです。', // 검수 필요(사용자)
    'preset.bad_dir': 'フォルダーが見つかりません。', // 검수 필요(사용자)
    'preset.export_exists': '選んだ場所に同じ名前のフォルダーがあります。別の場所を選ぶか名前を変えてください。', // 검수 필요(사용자)
    'preset.io': 'プリセットファイルを読み書きできませんでした。', // 검수 필요(사용자)
    'preset.file_missing': 'ファイルがありません。', // 검수 필요(사용자)
    'preset.file_link': 'ショートカット・リンクは使えません。', // 검수 필요(사용자)
    unknown: '不明なエラーが発生しました。',
  },
}
