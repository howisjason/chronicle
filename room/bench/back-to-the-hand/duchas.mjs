// The manuscript side: dúchas.ie's own catalogue of the Main Manuscript Collection
// (CBÉ), read through the same summarising page reader. For each tale: the volume's
// dúchas id, the item's link, its page label, title and date as dúchas gives them,
// and the county dúchas gives for it. `next` is the page label of the item after
// it, kept only where it decides a bin. volumeId null: the volume isn't on dúchas.
// No informant or collector names are kept.

export const DUCHAS = {
  // Read by me first, before any other row.
  35: { vol: 529, volumeId: 9001029, href: 'https://www.duchas.ie/en/cbe/9001029/7273688/9104689',
        label: 'Imleabhar 0529, Leathanach 241', title: 'An Coileach Mártan ag Díbirt an Chróchair', county: 'Galway', date: '23 September 1938' },
  37: { vol: 2, volumeId: 9000000, href: 'https://www.duchas.ie/en/cbe/9000000/7010366/9089476',
        label: 'Volume 0002, Page 122b', title: 'Bainríon na bPlainéad', county: 'Kerry', date: '1 January 1930' },
};
