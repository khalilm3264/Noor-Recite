import React from 'react';
import { BookOpen, Compass, Bookmark, Sparkles, SlidersHorizontal, Sun, Moon, HeartHandshake, MoonStar, ScrollText, Award } from 'lucide-react';
import { AppScreen } from '../types/quran';
import { RubElHizbBadge } from './RubElHizbIcon';

interface TopNavProps {
  activeScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  bookmarkCount: number;
}

const NAV_ITEMS: {
  id: AppScreen;
  label: string;
  mobileLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'reader', label: 'Read', icon: BookOpen },
  { id: 'surahs', label: 'Surahs', icon: Compass },
  { id: 'hifz', label: 'Hifz Quiz', mobileLabel: 'Hifz', icon: Award },
  { id: 'salah', label: 'Salah & Prayers', mobileLabel: 'Salah', icon: MoonStar },
  { id: 'duas', label: 'Duas & Kalimas', mobileLabel: 'Duas', icon: HeartHandshake },
  { id: 'hadiths', label: 'Popular Hadiths', mobileLabel: 'Hadiths', icon: ScrollText },
  { id: 'tajweed', label: 'Tajweed', icon: Sparkles },
  { id: 'bookmarks', label: 'Bookmarks', mobileLabel: 'Saved', icon: Bookmark },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeScreen,
  onSelectScreen,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  bookmarkCount,
}) => {
  return (
    <header className="shrink-0 relative z-30 h-13 sm:h-14 [@media(max-height:540px)]:h-11 border-b border-[#064E3B]/10 dark:border-emerald-300/12 bg-[#FBFBFA]/95 dark:bg-[#041D17]/95 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto h-full px-3 sm:px-5 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
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

        {/* Zone 2: Clean Single-Line Navigation Links (Landscape Phone, Tablet & Desktop: >=640px) */}
        <nav className="hidden sm:flex items-center gap-2 md:gap-3 lg:gap-4 xl:gap-6 min-w-0" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive =
              activeScreen === item.id ||
              (item.id === 'surahs' && (activeScreen === 'khatmah' || activeScreen === 'topics'));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectScreen(item.id)}
                className={`relative py-1.5 sm:py-2 text-xs md:text-[13px] xl:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] rounded ${
                  isActive
                    ? 'text-[#064E3B] dark:text-amber-300 font-semibold'
                    : 'text-[#404944] hover:text-[#022C22] dark:text-emerald-200/75 dark:hover:text-[#E6FFF4]'
                }`}
              >
                <span className="xl:hidden">
                  {item.mobileLabel ?? item.label}
                  {item.id === 'bookmarks' && bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}
                </span>
                <span className="hidden xl:inline">
                  {item.label}
                  {item.id === 'bookmarks' && bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}
                </span>
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

        {/* Zone 3: Primary Action + Theme Switch */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light parchment mode' : 'Switch to night cypress mode'}
            title={darkMode ? 'Light Parchment' : 'Night Cypress'}
            className="min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-lg text-[#404944] hover:text-[#064E3B] hover:bg-[#064E3B]/6 dark:text-emerald-200 dark:hover:text-amber-300 dark:hover:bg-emerald-400/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Preferences"
            title="Reading & Audio Preferences"
            className="min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold bg-[#064E3B] text-white hover:bg-[#003527] dark:bg-emerald-500 dark:text-[#022C22] dark:hover:bg-emerald-400 transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="sm:hidden md:inline">Preferences</span>
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
      className="sm:hidden shrink-0 relative z-40 h-12 [@media(max-height:540px)]:h-10 border-t border-[#064E3B]/10 dark:border-emerald-300/15 bg-[#FFFFFF]/96 dark:bg-[#041D17]/96 backdrop-blur-lg"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-8 h-full">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeScreen === item.id ||
            (item.id === 'surahs' && (activeScreen === 'khatmah' || activeScreen === 'topics'));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectScreen(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-0.5 text-[9.5px] tracking-tight font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-[#064E3B] dark:text-amber-300 font-semibold'
                  : 'text-[#404944] dark:text-emerald-200/70'
              }`}
            >
              <Icon className="w-[16px] h-[16px]" />
              <span className="[@media(max-height:540px)]:hidden">{item.mobileLabel ?? item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
