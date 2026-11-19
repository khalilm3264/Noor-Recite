import { DuaOrKalimaItem } from '../types/quran';

export type DuaThemeId =
  | 'morning-evening'
  | 'during-salah'
  | 'for-forgiveness'
  | 'kalimas'
  | 'guidance-family'
  | 'protection-relief'
  | 'daily-etiquette'
  | 'travel-hajj-nature'
  | 'dhikr-salawat';

export interface DuaThemeMeta {
  id: DuaThemeId;
  label: string;
  description: string;
  keywords: string[];
}

export const DUA_THEMES: DuaThemeMeta[] = [
  {
    id: 'morning-evening',
    label: 'Morning / Evening',
    description: 'Dawn & dusk adhkar, waking up, bedtime shields, Ayat al-Kursi & closing of Al-Baqarah',
    keywords: ['morning', 'evening', 'adhkar', 'sleep', 'bedtime', 'waking', 'night', 'dawn', 'dusk', 'dream'],
  },
  {
    id: 'during-salah',
    label: 'During Salah',
    description: 'Wudu, Adhan, Masjid, Istiftah, Ruku, Sujood, Tashahhud, Qunoot, Taraweeh & post-Salah',
    keywords: ['salah', 'namaz', 'prayer', 'wudu', 'adhan', 'masjid', 'ruku', 'sujood', 'tashahhud', 'qunoot', 'taraweeh', 'istikhara'],
  },
  {
    id: 'for-forgiveness',
    label: 'For Forgiveness',
    description: 'Sayyidul Istighfar, Prophet Adam’s repentance, Tawbah, Kaffaratul-Majlis & cleansing the heart',
    keywords: ['forgiveness', 'istighfar', 'tawbah', 'repentance', 'sin', 'pardon', 'mercy', 'maghfirah'],
  },
  {
    id: 'kalimas',
    label: '6 Kalimas',
    description: 'The six foundational declarations of Islamic faith and remembrance',
    keywords: ['kalima', 'kalimas', 'shahadah', 'faith', 'tawheed'],
  },
  {
    id: 'guidance-family',
    label: 'Guidance & Family',
    description: 'Rabbi Shraḥ Lī Ṣadrī, knowledge, parents, spouses, children & Prophetic Qur’anic prayers',
    keywords: ['guidance', 'family', 'parents', 'children', 'marriage', 'knowledge', 'musa', 'ibrahim', 'zakariyya', 'sulayman', 'yusuf', 'rabbana', 'quranic'],
  },
  {
    id: 'protection-relief',
    label: 'Protection & Relief',
    description: 'Distress, healing, anxiety, debt, refuge from oppression & funeral / grave supplications',
    keywords: ['protection', 'relief', 'distress', 'anxiety', 'grief', 'worry', 'healing', 'sick', 'debt', 'oppression', 'janazah', 'funeral', 'grave', 'yunus', 'ayyub'],
  },
  {
    id: 'daily-etiquette',
    label: 'Daily & Home',
    description: 'Leaving home, meals, fasting & hosting, clothing, gratitude, Salam & everyday manners',
    keywords: ['daily', 'home', 'eating', 'food', 'fasting', 'iftar', 'clothes', 'restroom', 'sneeze', 'market', 'salam', 'gratitude', 'loan', 'qurbani'],
  },
  {
    id: 'travel-hajj-nature',
    label: 'Travel, Hajj & Nature',
    description: 'Journeys, sea voyages, Hajj & Umrah rites, crescent moon, rain, thunder & strong winds',
    keywords: ['travel', 'journey', 'hajj', 'umrah', 'arafat', 'talbiyah', 'ocean', 'sea', 'moon', 'rain', 'thunder', 'wind', 'nature'],
  },
  {
    id: 'dhikr-salawat',
    label: 'Dhikr & Salawat',
    description: 'Daily Tasbih, sending blessings upon the Prophet ﷺ & virtues of remembering Allah',
    keywords: ['dhikr', 'tasbih', 'salawat', 'durood', 'remembrance', 'praise', 'subhanallah'],
  },
];

export const DUA_THEME_MAP: Record<DuaThemeId, DuaThemeMeta> = DUA_THEMES.reduce(
  (acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  },
  {} as Record<DuaThemeId, DuaThemeMeta>
);

const EXPLICIT_ITEM_THEME: Record<string, DuaThemeId> = {
  // 6 Kalimas
  'kalima-1': 'kalimas',
  'kalima-2': 'kalimas',
  'kalima-3': 'kalimas',
  'kalima-4': 'kalimas',
  'kalima-5': 'kalimas',
  'kalima-6': 'kalimas',

  // Morning / Evening
  'dua-morning-protection': 'morning-evening',
  'hisn-morning-adhkar-complete': 'morning-evening',
  'hisn-evening-adhkar-complete': 'morning-evening',
  'dua-waking-up': 'morning-evening',
  'hisn-waking-and-dreams': 'morning-evening',
  'dua-before-sleep': 'morning-evening',
  'hisn-sleep-complete': 'morning-evening',
  'ayatul-kursi': 'morning-evening',
  'dua-baqarah-closing': 'morning-evening',

  // During Salah
  'dua-wudu': 'during-salah',
  'dua-after-adhan': 'during-salah',
  'hisn-adhan-and-tashahhud': 'during-salah',
  'dua-masjid-enter': 'during-salah',
  'dua-salah-istiftah': 'during-salah',
  'dua-salah-ruku': 'during-salah',
  'dua-salah-sujood': 'during-salah',
  'hisn-sujood-tilawah': 'during-salah',
  'dhikr-durood-ibrahim': 'during-salah',
  'dua-before-salam': 'during-salah',
  'dhikr-tasbih-fatimah': 'during-salah',
  'hisn-after-salah-complete': 'during-salah',
  'dua-qunoot-witr': 'during-salah',
  'dua-taraweeh': 'during-salah',
  'dua-istikhara': 'during-salah',
  'dua-establish-salah': 'during-salah',

  // For Forgiveness
  'dhikr-sayyidul-istighfar': 'for-forgiveness',
  'hisn-repentance-and-istighfar': 'for-forgiveness',
  'dua-adam-repentance': 'for-forgiveness',
  'dua-kaffarat-majlis': 'for-forgiveness',
  'dua-nuh-forgiveness': 'for-forgiveness',
  'dua-rabbana-aal-imran-collection': 'for-forgiveness',
  'dua-shirk-omens': 'for-forgiveness',
  'hisn-doubts-sin-and-shaytan': 'for-forgiveness',

  // Guidance & Family
  'dua-musa-shrah-sadri': 'guidance-family',
  'dua-knowledge': 'guidance-family',
  'dua-rabbana-good': 'guidance-family',
  'dua-steadfast-heart': 'guidance-family',
  'dua-parents': 'guidance-family',
  'dua-family': 'guidance-family',
  'hisn-marriage-and-family': 'guidance-family',
  'dua-ibrahim-complete': 'guidance-family',
  'dua-zakariyya-offspring': 'guidance-family',
  'dua-sulayman-gratitude': 'guidance-family',
  'dua-yusuf-ending': 'guidance-family',
  'dua-muhammad-quranic-commands': 'guidance-family',
  'dua-asiyah-paradise': 'guidance-family',
  'dua-musa-good': 'guidance-family',

  // Protection & Relief
  'dua-yunus-distress': 'protection-relief',
  'dua-ayyub-healing': 'protection-relief',
  'dua-worry-grief': 'protection-relief',
  'dua-difficulty-debt': 'protection-relief',
  'hisn-adversary-and-oppression': 'protection-relief',
  'dua-night-fear-plots': 'protection-relief',
  'dua-startled-anger': 'protection-relief',
  'dua-pain-evil-eye': 'protection-relief',
  'dua-seeing-afflicted': 'protection-relief',
  'dua-sick-tragedy': 'protection-relief',
  'hisn-visiting-sick-and-terminal': 'protection-relief',
  'dua-janazah-prayer': 'protection-relief',
  'hisn-funeral-and-bereavement': 'protection-relief',
  'hisn-grave-and-burial': 'protection-relief',

  // Daily & Home
  'dua-leaving-home': 'daily-etiquette',
  'dua-before-eating': 'daily-etiquette',
  'dua-after-eating': 'daily-etiquette',
  'dua-breaking-fast': 'daily-etiquette',
  'hisn-fasting-and-hospitality': 'daily-etiquette',
  'dua-restroom': 'daily-etiquette',
  'dua-clothing': 'daily-etiquette',
  'dua-sneezing': 'daily-etiquette',
  'dua-entering-market': 'daily-etiquette',
  'hisn-gratitude-loans-and-brotherhood': 'daily-etiquette',
  'hisn-salam-and-speech-etiquette': 'daily-etiquette',
  'hisn-glad-tidings-and-sacrifice': 'daily-etiquette',
  'dua-first-fruits': 'daily-etiquette',

  // Travel, Hajj & Nature
  'dua-travel': 'travel-hajj-nature',
  'hisn-traveler-and-resident': 'travel-hajj-nature',
  'dua-ocean-voyage': 'travel-hajj-nature',
  'dua-entering-town': 'travel-hajj-nature',
  'dua-mount-stumbles': 'travel-hajj-nature',
  'dua-arafat-talbiyah': 'travel-hajj-nature',
  'hisn-hajj-and-umrah-rites': 'travel-hajj-nature',
  'dua-moon-sighting': 'travel-hajj-nature',
  'dua-moon-night-refuge': 'travel-hajj-nature',
  'dua-wind': 'travel-hajj-nature',
  'dua-thunder': 'travel-hajj-nature',
  'dua-seeking-rain': 'travel-hajj-nature',
  'dua-rain': 'travel-hajj-nature',
  'dua-animal-sounds': 'travel-hajj-nature',

  // Dhikr & Salawat
  'dhikr-subhanallah-bihamdihi': 'dhikr-salawat',
  'hisn-salawat-excellence': 'dhikr-salawat',
  'hisn-dhikr-excellence-part1': 'dhikr-salawat',
  'hisn-dhikr-excellence-part2': 'dhikr-salawat',
};

export function getDuaThemeId(item: DuaOrKalimaItem): DuaThemeId {
  const explicit = EXPLICIT_ITEM_THEME[item.id];
  if (explicit) return explicit;
  if (item.category === 'kalimas') return 'kalimas';
  if (item.category === 'quranic') return 'guidance-family';
  if (item.category === 'rare') return 'travel-hajj-nature';
  if (item.category === 'adhkar') return 'dhikr-salawat';
  return 'daily-etiquette';
}

export interface DuaThemeGroup {
  theme: DuaThemeMeta;
  items: DuaOrKalimaItem[];
}

export function groupDuasByTheme(items: DuaOrKalimaItem[]): DuaThemeGroup[] {
  const buckets = new Map<DuaThemeId, DuaOrKalimaItem[]>();
  for (const theme of DUA_THEMES) {
    buckets.set(theme.id, []);
  }
  for (const item of items) {
    const tid = getDuaThemeId(item);
    buckets.get(tid)?.push(item);
  }
  return DUA_THEMES.map((theme) => ({
    theme,
    items: buckets.get(theme.id) ?? [],
  })).filter((g) => g.items.length > 0);
}
