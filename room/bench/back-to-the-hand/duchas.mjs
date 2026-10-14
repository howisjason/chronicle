// The manuscript side: dúchas.ie's own catalogue of the Main Manuscript Collection
// (CBÉ), read through the same summarising page reader. For each tale: the volume's
// dúchas id, the item's link, its page label, title and date as dúchas gives them,
// and the county. `next` is the page label of the item after it, kept only where it
// decides a bin. volumeId null: the volume isn't on dúchas (its listing of 821
// volumes skips that number; it has nothing above 1060). No informant or collector
// names are kept.
//
// The county is the volume's, not the tale's: dúchas gives places for a volume, and
// mostly not for an item. Where a volume's places are in two counties, both are kept.
// A few pages were served in Irish ("Imleabhar 0113, Leathanach 017"); their labels
// are written here in the English form, with the page number exactly as shown.
//
// 35, 37 (14 Oct) and 43 (15 Oct) I read myself, first. The rest were read on 15 Oct
// by five helpers, one per stretch of the book, and three of their rows (1, 25, 49)
// I read again myself: all three labels, titles and dates came back the same.

export const DUCHAS = {
  1:  { vol: 113, volumeId: 9000111, href: 'https://www.duchas.ie/en/cbe/9000111/7057972/9092190',
        label: 'Volume 0113, Page 017', title: 'An Mháthair Fhada agus an Dreoilín', county: 'Galway', date: '1931–1935' },
  2:  { vol: 962, volumeId: null },
  3:  { vol: 134, volumeId: 9001174, href: 'https://www.duchas.ie/en/cbe/9001174/7066607/9096777',
        label: 'Volume 0134, Page 177', title: 'An Sionnach', county: 'Mayo', date: '27 February 1936' },
  4:  { vol: 702, volumeId: 9002815, href: 'https://www.duchas.ie/en/cbe/9002815/7361665/9133253',
        label: 'Volume 0702, Page 282', title: 'An Magpie agus an Mada Rua', county: 'Kerry', date: '3 September 1940' },
  // Two items start on this page; this is the one about a fox, the other has a priest's name.
  5:  { vol: 84, volumeId: 9001202, href: 'https://www.duchas.ie/en/cbe/9001202/7047432/9097499',
        label: 'Volume 0084, Page 201', title: 'Madra Rua', county: 'Waterford', date: 'June 1934' },
  6:  { vol: 605, volumeId: 9001792, href: 'https://www.duchas.ie/en/cbe/9001792/7310698/9113010',
        label: 'Volume 0605, Page 434', title: 'Easóg agus Loch Mhór a Bhí ag Troid', county: 'Galway', date: '14 March 1939' },
  7:  { vol: 308, volumeId: 9000302, href: 'https://www.duchas.ie/en/cbe/9000302/7149883/9061439',
        label: 'Volume 0308, Page 0039', title: 'An Fear gur Chuaigh an Luch ina Bholg', county: 'Kerry', date: '1935–1937' },
  8:  { vol: 62, volumeId: null },
  9:  { vol: 84, volumeId: 9001202, href: 'https://www.duchas.ie/en/cbe/9001202/7047482/9097550',
        label: 'Volume 0084, Page 250', title: 'Cráin agus Banbh', county: 'Waterford', date: 'July 1934' },
  10: { vol: 489, volumeId: 9002955, href: 'https://www.duchas.ie/en/cbe/9002955/7232616/9123446',
        label: 'Volume 0489, Page 0281', title: 'An Seanphréachán agus an Préachán Óg', county: 'Galway', date: '1937' },
  11: { vol: 1009, volumeId: null },
  12: { vol: 168, volumeId: 9000166, href: 'https://www.duchas.ie/en/cbe/9000166/7081844/9050546',
        label: 'Volume 0168, Page 001', title: 'Scéal Rí Cormac agus Rí Conn', county: 'Donegal', date: '5 July 1934' },
  13: { vol: 157, volumeId: 9000155, href: 'https://www.duchas.ie/en/cbe/9000155/7076502/9055066',
        label: 'Volume 0157, Page 215a', title: 'Céatach Mhac Rí na gCor as Éirinn', county: 'Galway', date: 'September 1935' },
  14: { vol: 984, volumeId: null },
  15: { vol: 937, volumeId: null },
  // The book gives pp. 1312-34; the volume on dúchas runs to page 556.
  16: { vol: 142, volumeId: 9000375, pagesOnline: 556 },
  17: { vol: 981, volumeId: null },
  18: { vol: 980, volumeId: null },
  19: { vol: 990, volumeId: null },
  20: { vol: 277, volumeId: 9000712, href: 'https://www.duchas.ie/en/cbe/9000712/7136552/9064249',
        label: 'Volume 0277, Page 0273', title: 'An Séiplíneach agus an Gasúr', county: 'Mayo', date: '21 January 1937' },
  21: { vol: 315, volumeId: 9000309, href: 'https://www.duchas.ie/en/cbe/9000309/7153864/9069847',
        label: 'Volume 0315, Page 0194', title: 'Mac Uí Shéaghdha', county: 'Kerry', date: '15 February 1937' },
  22: { vol: 224, volumeId: 9000220, href: 'https://www.duchas.ie/en/cbe/9000220/7108485/9059682',
        label: 'Volume 0224, Page 0110', title: 'Bráthair Ó gConchubhair', county: 'Donegal', date: '21 March 1936' },
  23: { vol: 1052, volumeId: null },
  24: { vol: 965, volumeId: null },
  // The book says Cork; this volume's places are Tuosist and Baile an Fheirtéaraigh, both Kerry.
  25: { vol: 31, volumeId: 9000029, href: 'https://www.duchas.ie/en/cbe/9000029/7023527/9095665',
        label: 'Volume 0031, Page 136', title: 'An Fáth a Bhí ag Dia leis an bhFios a Bhaint Dínn i dTaobh an Lá a Gheobhaimis Bás', county: 'Kerry', date: '4 August 1933' },
  26: { vol: 155, volumeId: 9000417, href: 'https://www.duchas.ie/en/cbe/9000417/7075980/9053395',
        label: 'Volume 0155, Page 121', title: 'Scéal Sí', county: 'Galway', date: '5 October 1935' },
  27: { vol: 1033, volumeId: null },
  28: { vol: 1034, volumeId: null },
  29: { vol: 156, volumeId: 9000154, href: 'https://www.duchas.ie/en/cbe/9000154/7076231/9054680',
        label: 'Volume 0156, Page 141', title: 'Clann an Mná Mairbhe', county: 'Galway', date: '8 July 1935' },
  30: { vol: 451, volumeId: 9000876, href: 'https://www.duchas.ie/en/cbe/9000876/7255073/9085689',
        label: 'Volume 0451, Page 0071', title: 'An Leipreachán', county: 'Galway, Mayo', date: '20 December 1937' },
  31: { vol: 47, volumeId: 9001112, href: 'https://www.duchas.ie/en/cbe/9001112/7030621/9094661',
        label: 'Volume 0047, Page 008', title: 'Ruaidhrí Ó Donnchadha an Ghleanna', county: 'Cork', date: '18 May 1933' },
  32: { vol: 447, volumeId: 9000872, href: 'https://www.duchas.ie/en/cbe/9000872/7254085/9085449',
        label: 'Volume 0447, Page 0376', title: 'An Dochtúr Ó Laoidh agus Beag-Árainn', county: 'Galway', date: '9 February 1938' },
  33: { vol: 589, volumeId: 9001767, href: 'https://www.duchas.ie/en/cbe/9001767/7303378/9111395',
        label: 'Volume 0589, Page 603', title: 'Iascaire Iorrais Mhóir a Thóg an Páiste as an bhFarraige', county: 'Galway, Mayo', date: '1 February 1939' },
  34: { vol: 388, volumeId: 9000472, href: 'https://www.duchas.ie/en/cbe/9000472/7185217/9078169',
        label: 'Volume 0388, Page 0258', title: 'An Cut Mór agus an Luch Mhór', county: 'Galway', date: '31 August 1938' },
  35: { vol: 529, volumeId: 9001029, href: 'https://www.duchas.ie/en/cbe/9001029/7273688/9104689',
        label: 'Imleabhar 0529, Leathanach 241', title: 'An Coileach Mártan ag Díbirt an Chróchair', county: 'Galway', date: '23 September 1938' },
  36: { vol: 965, volumeId: null },
  37: { vol: 2, volumeId: 9000000, href: 'https://www.duchas.ie/en/cbe/9000000/7010366/9089476',
        label: 'Volume 0002, Page 122b', title: 'Bainríon na bPlainéad', county: 'Kerry', date: '1 January 1930' },
  39: { vol: 160, volumeId: 9000158, href: 'https://www.duchas.ie/en/cbe/9000158/7078099/9055632',
        label: 'Volume 0160, Page 211', title: 'An Mairnéalach a Chuir Artha na Luchan', county: 'Galway', date: '26 February 1936' },
  40: { vol: 1051, volumeId: null },
  41: { vol: 272, volumeId: 9000267, href: 'https://www.duchas.ie/en/cbe/9000267/7133590/9066879',
        label: 'Volume 0272, Page 0415', title: 'Seamróg na Cheithre gCluas', county: 'Kerry', date: '7 December 1936' },
  42: { vol: 1034, volumeId: null },
  43: { vol: 12, volumeId: 9000010, href: 'https://www.duchas.ie/en/cbe/9000010/7015702/9092583',
        label: 'Volume 0012, Page 333', title: 'An Dá Mhuic agus Domhnall Ó Conaill', county: 'Kerry', date: 'February 1933' },
  46: { vol: 1094, volumeId: null },
  47: { vol: 1093, volumeId: null },
  48: { vol: 157, volumeId: 9000155, href: 'https://www.duchas.ie/en/cbe/9000155/7076450/9055061',
        label: 'Volume 0157, Page 176a', title: 'Seanchas faoi Chromail', county: 'Galway', date: 'August 1935' },
  49: { vol: 404, volumeId: 9000891, href: 'https://www.duchas.ie/en/cbe/9000891/7258976/9081407',
        label: 'Volume 0404, Page 0147', title: 'Damer and his Gold', county: 'Galway', date: '9 September 1937' },
  50: { vol: 1009, volumeId: null },
  51: { vol: 702, volumeId: 9002815, href: 'https://www.duchas.ie/en/cbe/9002815/7361550/9133180',
        label: 'Volume 0702, Page 167', title: 'An Bhó agus an Píopaire', county: 'Kerry', date: '26 August 1940' },
  52: { vol: 32, volumeId: 9000030, href: 'https://www.duchas.ie/en/cbe/9000030/7023694/9098650',
        label: 'Volume 0032, Page 057a', title: 'Seáinín na Scuab', county: 'Cork, Kerry', date: '23 December 1932' },
  // The book gives pp. 2093-2104 ("Recorded on Ediphone, February 7, 1936"); the volume on dúchas runs to page 549.
  53: { vol: 143, volumeId: 9000141, pagesOnline: 549 },
  // The book says Cork; this volume part's place is Dingle, Kerry.
  54: { vol: 211, volumeId: 9000689, href: 'https://www.duchas.ie/en/cbe/9000689/7102234/9062965',
        label: 'Volume 0211, Page 0216', title: 'Scéilín', county: 'Kerry', date: '1936' },
  55: { vol: 966, volumeId: null },
};
