// sources.mjs: every source as I read it, 15 Oct 2026. Each was read twice through
// the page reader with two different prompts, and the two readings agree on every
// name and number. They differ only in punctuation (， or ・) and in whether the
// kana readings in brackets came through. The quotes below are the first reading,
// kana and all. Nothing here is tidied; names() in count.mjs strips the kana itself.

// The temples, by the id this build uses. Japanese as the Council writes them.
export const TEMPLES = {
  kennin:  { en: 'Kennin-ji',  ja: '建仁寺' },
  tofuku:  { en: 'Tōfuku-ji',  ja: '東福寺' },
  kencho:  { en: 'Kenchō-ji',  ja: '建長寺' },
  engaku:  { en: 'Engaku-ji',  ja: '円覚寺' },
  nanzen:  { en: 'Nanzen-ji',  ja: '南禅寺' },
  kokutai: { en: 'Kokutai-ji', ja: '国泰寺' },
  daitoku: { en: 'Daitoku-ji', ja: '大徳寺' },
  kogaku:  { en: 'Kōgaku-ji',  ja: '向嶽寺' },
  myoshin: { en: 'Myōshin-ji', ja: '妙心寺' },
  tenryu:  { en: 'Tenryū-ji',  ja: '天龍寺' },
  eigen:   { en: 'Eigen-ji',   ja: '永源寺' },
  hoko:    { en: 'Hōkō-ji',    ja: '方広寺' },
  shokoku: { en: 'Shōkoku-ji', ja: '相国寺' },
  buttsu:  { en: 'Buttsū-ji',  ja: '佛通寺' },
  kosho:   { en: 'Kōshō-ji',   ja: '興聖寺', note: 'Kyoto; under the Shōkoku-ji branch from 1887, its own branch from 1953 (ja.wikipedia 興聖寺 (京都市), one reading, not checked)' },
  manpuku: { en: 'Manpuku-ji', ja: '萬福寺', note: 'the head temple of Ōbaku, a separate school' },
};

// The only spellings that differ between sources, and nothing else: three pairs
// between the Japanese sources, and the four old character forms the Council's
// English page prints (南禪, 圓覺, 相國, 國泰).
export const VARIANTS = { '天竜': '天龍', '方廣': '方広', '仏通': '佛通', '禪': '禅', '圓': '円', '覺': '覚', '國': '国' };

// Where the 本山 is, as ja.wikipedia 臨済宗 writes each branch's 本山 line.
export const PLACE = {
  kennin: '京都', tofuku: '京都', kencho: '鎌倉', engaku: '鎌倉', nanzen: '京都',
  kokutai: '富山県高岡市', daitoku: '京都', myoshin: '京都・花園', tenryu: '京都・嵐山',
  eigen: '滋賀県東近江市永源寺高野町', kogaku: '山梨県甲州市', shokoku: '京都',
  hoko: '静岡県浜松市浜名区引佐町奥山', buttsu: '広島県三原市', kosho: '京都',
};

// Each source. `says` is the number it states (null if none); `of` says what that
// number counts. `quote` is word for word. `list` is the temples it names, read from
// the quote when `listIn` is 'quote', from the rest of the page when 'page'.
// `apart` is a temple a source names but keeps out of its number.
export const SOURCES = [
  { id: 'council-ja', who: 'Joint Council of Rinzai and Ōbaku, Japanese home page', url: 'https://www.rinnou.net/',
    says: 15, of: 'head temples, Rinzai and Ōbaku together (14 + 1)',
    quote: '臨済宗十四派と黄檗宗を含め、併せて十五派の本山があり',
    listIn: 'page',
    list: ['妙心寺', '萬福寺', '南禅寺', '建長寺', '東福寺', '円覚寺', '大徳寺', '方広寺', '永源寺', '天龍寺', '相国寺', '建仁寺', '向嶽寺', '佛通寺', '国泰寺'] },
  { id: 'council-en', who: 'Joint Council, English “Head Temples” page', url: 'http://zen.rinnou.net/head_temples/',
    says: 14, of: 'Rinzai branches',
    quote: 'The Rinzai school has fourteen branches, each led by a head temple; the Obaku school has a single head temple.',
    listIn: 'page',
    list: ['妙心寺', '萬福寺', '南禪寺', '建長寺', '東福寺', '圓覺寺', '大徳寺', '方廣寺', '永源寺', '天龍寺', '相國寺', '建仁寺', '向嶽寺', '佛通寺', '國泰寺'] },
  { id: 'en-buttsuji', who: 'English Wikipedia, “Buttsū-ji”', url: 'https://en.wikipedia.org/wiki/Butts%C5%AB-ji',
    says: 14, of: 'Rinzai branches', cites: 'council-en',
    quote: 'head one of fourteen autonomous branches of the Rinzai school of Zen Buddhism',
    list: null },
  { id: 'en-rinzai', who: 'English Wikipedia, “Rinzai school”', url: 'https://en.wikipedia.org/wiki/Rinzai_school',
    says: 15, of: 'Rinzai branches', cites: 'council-en',
    quote: 'it is divided into 15 branches (or 16, if Ōbaku is included), referred to by the names of their head temples, of which half are based in Kyoto (8, plus Ōbaku)',
    kyoto: 8,
    listIn: 'page', listEn: true,
    list: ['Kennin-ji', 'Tōfuku-ji', 'Kenchō-ji', 'Engaku-ji', 'Nanzen-ji', 'Kokutai-ji', 'Daitoku-ji', 'Kōgaku-ji', 'Myōshin-ji', 'Tenryū-ji', 'Eigen-ji', 'Hōkō-ji', 'Shōkoku-ji', 'Buttsū-ji', 'Kōshō-ji'],
    ownRefs: ['kosho'] },
  { id: 'ja-rinzai', who: 'Japanese Wikipedia, 臨済宗', url: 'https://ja.wikipedia.org/wiki/%E8%87%A8%E6%B8%88%E5%AE%97',
    says: 15, of: 'Rinzai branches',
    quote: '曹洞宗が単一教団であるのに対して、十五派に分かれて活動している。',
    listIn: 'page',
    list: ['建仁寺', '東福寺', '建長寺', '円覚寺', '南禅寺', '国泰寺', '大徳寺', '妙心寺', '天龍寺', '永源寺', '向嶽寺', '相国寺', '方廣寺', '佛通寺', '興聖寺'] },
  { id: 'daijisen', who: 'デジタル大辞泉 (on Kotobank)', url: 'https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337',
    says: 14, of: 'Rinzai branches',
    quote: '現在は、天竜寺派・相国寺しょうこくじ派・建仁寺派・南禅寺派・妙心寺派・建長寺派・東福寺派・大徳寺派・円覚寺派・永源寺派・方広寺派・国泰寺派・仏通寺派・向嶽寺派の14寺派、および相国寺派から分かれた興聖寺派がある。',
    listIn: 'quote', apart: ['興聖寺'] },
  { id: 'mypedia', who: '百科事典マイペディア (on Kotobank)', url: 'https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337',
    says: 15, of: 'Rinzai branches',
    quote: '派は各大寺を中心に多く分かれ，天竜寺派，相国(しょうこく)寺派，建仁寺派，南禅寺派，妙心寺派，建長寺派，東福寺派，大徳寺派，円覚(えんがく)寺派，永源寺派，方広寺派，国泰(こくたい)寺派，仏通寺派，向嶽(こうがく)寺派，興聖(こうしょう)寺派の15。',
    listIn: 'quote' },
  { id: 'britannica', who: 'ブリタニカ国際大百科事典 小項目事典 (on Kotobank)', url: 'https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337',
    says: 14, of: 'Rinzai branches',
    quote: 'おもな宗派は天竜寺派，相国寺派，建仁寺派，南禅寺派，妙心寺派，建長寺派，東福寺派，大徳寺派，円覚寺派，永源寺派，方広寺派，国泰寺派，仏通寺派，向嶽寺派の 14寺派を数え，妙心寺派が最も大きい。',
    listIn: 'quote' },
  { id: 'sekai', who: '改訂新版 世界大百科事典 (on Kotobank)', url: 'https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337',
    says: null,
    quote: '現在では，天竜寺派，相国寺派，建仁寺派，南禅寺派，妙心寺派，建長寺派，東福寺派，大徳寺派，円覚寺派，永源寺派，方広寺派，国泰寺派，仏通寺派，向嶽寺派がある。',
    listIn: 'quote' },
  { id: 'yamakawa', who: '山川 日本史小辞典 改訂新版 (on Kotobank)', url: 'https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337',
    says: null,
    quote: '日本臨済宗には天竜寺派・相国寺派・建仁寺派・南禅寺派・妙心寺派・建長寺派・東福寺派・大徳寺派・円覚寺派・永源寺派・方広寺派・国泰寺派・仏通寺派・向嶽(こうがく)寺派の各派がある。',
    listIn: 'quote' },
  { id: 'obunsha', who: '旺文社日本史事典 三訂版 (on Kotobank)', url: 'https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337',
    says: 14, of: 'Rinzai branches',
    quote: '明治時代以後諸派に分かれ，現在14派に分立している。',
    list: null },
  { id: 'kokugo', who: '精選版 日本国語大辞典 (on Kotobank)', url: 'https://kotobank.jp/word/%E8%87%A8%E6%B8%88%E5%AE%97-150337',
    says: null, partial: true,
    quote: '建仁寺派・建長寺派・円覚寺派・東福寺派・南禅寺派・天龍寺派・大徳寺派・妙心寺派・永源寺派などの別がある。',
    listIn: 'quote' },
];
