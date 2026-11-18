import React from 'react';
import {
  BookOpen,
  Bookmark,
  HeartHandshake,
  MoonStar,
  ScrollText,
  SlidersHorizontal,
  Sun,
  Moon,
} from 'lucide-react';
import { AppScreen } from '../types/quran';
import { RubElHizbBadge } from './RubElHizbIcon';

interface TopNavProps {
  activeScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  bookmarkCount: number;
  isDriveConnected?: boolean;
}

const DESKTOP_NAV_ITEMS: {
  id: AppScreen;
  label: string;
  matches: AppScreen[];
}[] = [
  {
    id: 'reader',
    label: "Qur'an",
    matches: ['reader', 'surahs', 'hifz', 'topics'],
  },
  {
    id: 'duas',
    label: 'Duas',
    matches: ['duas'],
  },
  {
    id: 'hadiths',
    label: 'Hadiths',
    matches: ['hadiths'],
  },
  {
    id: 'salah',
    label: 'Salah',
    matches: ['salah'],
  },
  {
    id: 'tajweed',
    label: 'Tajweed',
    matches: ['tajweed'],
  },
  {
    id: 'bookmarks',
    label: 'Saved',
    matches: ['bookmarks', 'khatmah', 'drive'],
  },
];

const MOBILE_NAV_ITEMS: {
  id: AppScreen;
  label: string;
  matches: AppScreen[];
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'reader',
    label: "Qur'an",
    matches: ['reader', 'surahs', 'hifz', 'topics', 'tajweed'],
    icon: BookOpen,
  },
  {
    id: 'duas',
    label: 'Duas',
    matches: ['duas'],
    icon: HeartHandshake,
  },
  {
    id: 'hadiths',
    label: 'Hadiths',
    matches: ['hadiths'],
    icon: ScrollText,
  },
  {
    id: 'salah',
    label: 'Salah',
    matches: ['salah'],
    icon: MoonStar,
  },
  {
    id: 'bookmarks',
    label: 'Saved',
    matches: ['bookmarks', 'khatmah', 'drive'],
    icon: Bookmark,
  },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeScreen,
  onSelectScreen,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  bookmarkCount,
  isDriveConnected = false,
}) => {
  return (
    <header className="shrink-0 relative z-30 h-13 sm:h-14 [@media(max-height:540px)]:h-11 border-b border-[#064E3B]/10 dark:border-emerald-300/12 bg-[#FBFBFA]/95 dark:bg-[#041D17]/95 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto h-full px-3 sm:px-5 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectScreen('reader')}
          className="flex items-center gap-2 sm:gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] rounded-lg py-1"
        >
          <RubElHizbBadge className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" active />
          <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-[#022C22] dark:text-[#E6FFF4]">
            Noor Recite
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links (>=640px) */}
        <nav
          className="hidden sm:flex items-center gap-3.5 md:gap-5 lg:gap-7 min-w-0"
          aria-label="Primary navigation"
        >
          {DESKTOP_NAV_ITEMS.map((item) => {
            const isActive = item.matches.includes(activeScreen);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectScreen(item.id)}
                className={`relative py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] rounded inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#064E3B] dark:text-amber-300 font-semibold'
                    : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/75 dark:hover:text-[#E6FFF4]'
                }`}
              >
                <span>
                  {item.label}
                  {item.id === 'bookmarks' && bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}
                </span>
                {item.id === 'bookmarks' && isDriveConnected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"
                    title="Google Drive Sync Connected"
                    aria-hidden="true"
                  />
                )}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#D97706] dark:bg-amber-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Theme Switch + Preferences */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light parchment mode' : 'Switch to night cypress mode'}
            title={darkMode ? 'Light Parchment' : 'Night Cypress'}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:text-amber-300 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Preferences"
            title="Reading & Audio Preferences"
            className="min-h-[38px] px-3 lg:px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#064E3B] text-white hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22] dark:hover:bg-emerald-400 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Preferences</span>
            <span className="md:hidden">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};

interface MobileBottomNavProps {
  activeScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeScreen,
  onSelectScreen,
}) => {
  return (
    <nav
      className="sm:hidden shrink-0 relative z-40 h-13 [@media(max-height:540px)]:h-11 border-t border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FFFFFF]/96 dark:bg-[#041D17]/96 backdrop-blur-lg"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-full">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches.includes(activeScreen);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectScreen(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-[#064E3B] dark:text-amber-300 font-semibold'
                  : 'text-[#404944] dark:text-emerald-200/70'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="[@media(max-height:540px)]:hidden">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

