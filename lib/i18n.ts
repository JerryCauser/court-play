export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "lang";

const en = {
  appName: "Court Play",
  tagline: "Fair match rotation for badminton, tennis and friends",
  newEvent: "New event",
  creating: "Creating…",
  openEvent: "Open",
  openPlaceholder: "Paste a link or event ID",
  myEvents: "My events",
  noEvents: "No events yet. Create one or open a shared link.",
  forget: "Remove from list",
  back: "Events",
  eventName: "Event name",
  share: "Share",
  copied: "Link copied",
  format: "Format",
  singles: "Singles",
  doubles: "Doubles",
  players: "Players",
  addPlayer: "Add player",
  playerName: "Player {n}",
  remove: "Remove",
  restore: "Return",
  resting: "Away",
  color: "Color",
  games: "Games",
  addGame: "Add game",
  needPlayers: "Need at least {n} active players",
  noGames: "No games yet",
  game: "Game {n}",
  bench: "Resting",
  winner: "Winner",
  setWinner: "Won",
  deleteGame: "Delete",
  vs: "vs",
  stats: "Stats",
  player: "Player",
  played: "Played",
  benched: "Rested",
  wins: "Wins",
  losses: "Losses",
  winRate: "Win rate",
  statusSaved: "Saved",
  statusSaving: "Saving…",
  statusOffline: "Offline, will retry",
  statusConflict: "Updated from server",
  notFound: "Event not found",
  notFoundHint: "The link may be wrong or the event was never saved.",
  home: "Go home",
  error: "Something went wrong",
  theme: "Theme",
  replace: "Replace {name}",
  opponents: "Opponents",
  notInGame: "Not in this game",
  themeSystem: "system",
  themeLight: "light",
  themeDark: "dark",
};

export type Dict = typeof en;

const ru: Dict = {
  appName: "Court Play",
  tagline: "Честная ротация игр для бадминтона, тенниса и не только",
  newEvent: "Новое событие",
  creating: "Создаём…",
  openEvent: "Открыть",
  openPlaceholder: "Вставьте ссылку или ID события",
  myEvents: "Мои события",
  noEvents: "Пока пусто. Создайте событие или откройте ссылку.",
  forget: "Убрать из списка",
  back: "События",
  eventName: "Название",
  share: "Поделиться",
  copied: "Ссылка скопирована",
  format: "Формат",
  singles: "Одиночка",
  doubles: "Пары",
  players: "Игроки",
  addPlayer: "Добавить игрока",
  playerName: "Игрок {n}",
  remove: "Убрать",
  restore: "Вернуть",
  resting: "Не играет",
  color: "Цвет",
  games: "Игры",
  addGame: "Добавить игру",
  needPlayers: "Нужно минимум {n} активных игроков",
  noGames: "Игр пока нет",
  game: "Игра {n}",
  bench: "Отдыхают",
  winner: "Победитель",
  setWinner: "Победа",
  deleteGame: "Удалить",
  vs: "vs",
  stats: "Статистика",
  player: "Игрок",
  played: "Игры",
  benched: "Отдых",
  wins: "Победы",
  losses: "Поражения",
  winRate: "% побед",
  statusSaved: "Сохранено",
  statusSaving: "Сохраняем…",
  statusOffline: "Нет сети, повторим",
  statusConflict: "Обновлено с сервера",
  notFound: "Событие не найдено",
  notFoundHint: "Возможно, ссылка неверная или событие не было сохранено.",
  home: "На главную",
  error: "Что-то пошло не так",
  theme: "Тема",
  replace: "Заменить: {name}",
  opponents: "Соперники",
  notInGame: "Не в этой игре",
  themeSystem: "как в системе",
  themeLight: "светлая",
  themeDark: "тёмная",
};

export const DICTS: Record<Locale, Dict> = { en, ru };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const langs = (acceptLanguage ?? "").toLowerCase().split(",");
  for (const l of langs) {
    const code = l.trim().slice(0, 2);
    if (isLocale(code)) return code;
  }
  return "en";
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)}/g, (_, k: string) => String(vars[k] ?? ""));
}
