/** Helper to create a matra from bol strings */
const m = (...bols) => ({
  bols: bols,
});

// ── Common Taals ──────────────────────────────────────────────

export const TEENTAAL = {
  id: 'teentaal',
  name: 'Teentaal',
  matras: 16,
  vibhag: [4, 4, 4, 4],
  khaliVibhag: [2], // vibhag index 2 is khali (matra 9)
  theka: [
    m('Dha'), m('Dhin'), m('Dhin'), m('Dha'),
    m('Dha'), m('Dhin'), m('Dhin'), m('Dha'),
    m('Dha'), m('Tin'),  m('Tin'),  m('Ta'),
    m('Tete'), m('Dhin'), m('Dhin'), m('Dha'),
  ],
  isCustom: false,
};

export const EKTAAL = {
  id: 'ektaal',
  name: 'Ektaal',
  matras: 12,
  vibhag: [2, 2, 2, 2, 2, 2],
  khaliVibhag: [2, 5],
  theka: [
    m('Dhin'), m('Dhin'),
    m('Dha', 'Ge'), m('Tirakita'),
    m('Tin'),  m('Tin'),
    m('Na'),   m('Ke'),
    m('Dhin'), m('Dhin'),
    m('Dha', 'Ge'), m('Tirakita'),
  ],
  isCustom: false,
};

export const JHAPTAAL = {
  id: 'jhaptaal',
  name: 'Jhaptaal',
  matras: 10,
  vibhag: [2, 3, 2, 3],
  khaliVibhag: [2],
  theka: [
    m('Dhi'), m('Na'),
    m('Dhi'), m('Dhi'), m('Na'),
    m('Ti'),  m('Na'),
    m('Dhi'), m('Dhi'), m('Na'),
  ],
  isCustom: false,
};

export const RUPAK = {
  id: 'rupak',
  name: 'Rupak',
  matras: 7,
  vibhag: [3, 2, 2],
  khaliVibhag: [0], // first vibhag is khali in rupak
  theka: [
    m('Tin'), m('Tin'), m('Na'),
    m('Dhi'), m('Na'),
    m('Dhi'), m('Na'),
  ],
  isCustom: false,
};

export const DADRA = {
  id: 'dadra',
  name: 'Dadra',
  matras: 6,
  vibhag: [3, 3],
  khaliVibhag: [1],
  theka: [
    m('Dha'), m('Dhin'), m('Na'),
    m('Dha'), m('Tin'),  m('Na'),
  ],
  isCustom: false,
};

export const KEHERWA = {
  id: 'keherwa',
  name: 'Keherwa',
  matras: 8,
  vibhag: [4, 4],
  khaliVibhag: [1],
  theka: [
    m('Dha'), m('Ge'), m('Na'), m('Tin'),
    m('Na'),  m('Ke'), m('Dhi'), m('Na'),
  ],
  isCustom: false,
};

export const CHAUTAAL = {
  id: 'chautaal',
  name: 'Chautaal',
  matras: 12,
  vibhag: [2, 2, 2, 2, 2, 2],
  khaliVibhag: [2, 4],
  theka: [
    m('Dha'), m('Dha'),
    m('Dhin'), m('Ta'),
    m('Ke', 'Te'), m('Dha'),
    m('Ge'), m('Na'),
    m('Tin'), m('Na'),
    m('Ke'), m('Na'),
  ],
  isCustom: false,
};

// ── Gurmat Sangeet specific ───────────────────────────────────

export const ADDHA = {
  id: 'addha',
  name: 'Addha',
  matras: 16,
  vibhag: [4, 4, 4, 4],
  khaliVibhag: [2],
  theka: [
    m('Dhi'), m('Na'), m('Dhi'), m('Na'),
    m('Dhi'), m('Na'), m('Dhi'), m('Na'),
    m('Ti'),  m('Na'), m('Ti'),  m('Na'),
    m('Dhi'), m('Na'), m('Dhi'), m('Na'),
  ],
  isCustom: false,
};

// ── All built-in taals ────────────────────────────────────────

export const BUILT_IN_TAALS = [
  TEENTAAL,
  EKTAAL,
  JHAPTAAL,
  RUPAK,
  DADRA,
  KEHERWA,
  CHAUTAAL,
  ADDHA,
];
