export const LANGS = ["en", "ru"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "lang";

const en = {
  appName: "Court Play",
  tagline: "Fair match rotation for badminton, tennis and friends",
  myEvents: "My events",
  noEvents: "No events yet. Create one or open a shared link.",
  createEvent: "Create event",
  creating: "Creating…",
  openEvent: "Open",
  openPlaceholder: "Paste link or event ID",
  invalidLink: "Can't find an event ID in this text",
  forget: "Remove from list",
  back: "All events",
  eventName: "Event name",
  share: "Share",
  copied: "Link copied",
  singles: "Singles",
  doubles: "Doubles",
  format: "Format",
  formatLocked: "Format can't change after games have started",
  players: "Players",
  addPlayer: "Add",
  playerPlaceholder: "Player name",
  playerDefault: "Player",
  pause: "Pause",
  resume: "Return",
  paused: "paused",
  remove: "Remove",
  removeBlocked: "Player has games — pause instead",
  color: "Color",
  games: "Games",
  addGame: "Next game",
  needPlayers: "Need at least {n} active players",
  noGames: "No games yet",
  game: "Game",
  sitting: "Resting",
  winner: "Winner",
  setWinner: "Mark as winner",
  deleteGame: "Delete game",
  confirmDelete: "Delete the last game?",
  stats: "Stats",
  player: "Player",
  played: "Played",
  sat: "Rested",
  wins: "W",
  losses: "L",
  matrix: "Together / against",
  matrixHint: "Each cell: games as partners / as opponents",
  loading: "Loading…",
  notFound: "Event not found",
  loadError: "Couldn't load the event",
  retry: "Retry",
  saving: "Saving…",
  saved: "Saved",
  offline: "Not saved, retrying…",
  conflict: "Someone else changed this event — showing the latest version",
  language: "Language",
};

export type Dict = typeof en;

const ru: Dict = {
  appName: "Court Play",
  tagline: "Честная ротация игроков для бадминтона, тенниса и не только",
  myEvents: "Мои события",
  noEvents: "Событий пока нет. Создайте новое или откройте ссылку.",
  createEvent: "Создать событие",
  creating: "Создаём…",
  openEvent: "Открыть",
  openPlaceholder: "Ссылка или ID события",
  invalidLink: "Не нашли ID события в этом тексте",
  forget: "Убрать из списка",
  back: "Все события",
  eventName: "Название",
  share: "Поделиться",
  copied: "Ссылка скопирована",
  singles: "Одиночная",
  doubles: "Парная",
  format: "Формат",
  formatLocked: "Формат нельзя изменить после начала игр",
  players: "Игроки",
  addPlayer: "Добавить",
  playerPlaceholder: "Имя игрока",
  playerDefault: "Игрок",
  pause: "Пауза",
  resume: "Вернуть",
  paused: "на паузе",
  remove: "Удалить",
  removeBlocked: "У игрока есть игры — поставьте на паузу",
  color: "Цвет",
  games: "Игры",
  addGame: "Следующая игра",
  needPlayers: "Нужно минимум {n} активных игроков",
  noGames: "Игр пока нет",
  game: "Игра",
  sitting: "Отдыхают",
  winner: "Победа",
  setWinner: "Отметить победителя",
  deleteGame: "Удалить игру",
  confirmDelete: "Удалить последнюю игру?",
  stats: "Статистика",
  player: "Игрок",
  played: "Игр",
  sat: "Отдых",
  wins: "П",
  losses: "Пр",
  matrix: "Вместе / против",
  matrixHint: "В ячейке: игр в паре / игр друг против друга",
  loading: "Загрузка…",
  notFound: "Событие не найдено",
  loadError: "Не удалось загрузить событие",
  retry: "Повторить",
  saving: "Сохраняем…",
  saved: "Сохранено",
  offline: "Не сохранено, пробуем снова…",
  conflict: "Событие изменил кто-то другой — показана актуальная версия",
  language: "Язык",
};

export const DICTS: Record<Lang, Dict> = { en, ru };

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export function pickLang(cookie: string | undefined, acceptLanguage: string | null): Lang {
  if (isLang(cookie)) return cookie;
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => part.trim().slice(0, 2).toLowerCase())
    .find(isLang);
  return preferred ?? "en";
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
