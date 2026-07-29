export const ENTITY_TYPES = ['person', 'group', 'place', 'time', 'event', 'other'];

export const TYPE_LABELS = {
  person: 'Person',
  group: 'Ensemble / Gruppe',
  place: 'Ort',
  time: 'Zeit',
  event: 'Veranstaltung',
  other: 'Sonstiges',
};

export const TYPE_COLORS = {
  person:  { bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' },
  group:   { bg: '#E1F5EE', text: '#085041', border: '#5DCAA5' },
  place:   { bg: '#FAECE7', text: '#712B13', border: '#F0997B' },
  time:    { bg: '#FAEEDA', text: '#633806', border: '#EF9F27' },
  event:   { bg: '#E6F1FB', text: '#0C447C', border: '#85B7EB' },
  other:   { bg: '#F1EFE8', text: '#444441', border: '#B4B2A9' },
};

export const SAMPLE_OCR_TEXT = '';

export const INITIAL_ENTITIES = [];

export const INITIAL_MATCHES = {};

export const INITIAL_NORM_RESULTS = {};

export const INITIAL_ALIASES = [
  { from: 'ß',  to: 'ss' },
  { from: 'ü',  to: 'ue' },
  { from: 'ä',  to: 'ae' },
  { from: 'ö',  to: 'oe' },
  { from: 'Ü',  to: 'Ue' },
];

export const INITIAL_PREFERRED_JOBS = [
  'Komponist', 'Dirigent', 'Musiker', 'Pianist', 'Organist',
  'Violinist', 'Cellist', 'Sänger', 'Kantor', 'Kapellmeister',
  'Konzertmeister', 'Bratschist', 'Flötist', 'Klarinettist', 'Hornist',
];

export const INITIAL_CONTEXT_MAPPINGS = [];
