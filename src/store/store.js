// LocalStorage-backed state management for characters, stories, chat histories, and settings

const KEYS = {
  CHARACTERS: 'storyai_characters',
  STORIES: 'storyai_stories',
  CHAT_HISTORIES: 'storyai_chat_histories',
  SETTINGS: 'storyai_settings',
};

const DEFAULT_SETTINGS = {
  ollamaUrl: 'http://localhost:11434',
  defaultModel: '',
  aiProvider: 'ollama', // 'ollama' or 'zhipu'
  zhipuApiKey: '',
  zhipuModel: 'glm-4-flash',
  theme: 'dark',
};

// ========== Generic Helpers ==========

function getItem(key, fallback = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ========== Characters ==========

export function getCharacters() {
  return getItem(KEYS.CHARACTERS, []);
}

export function getCharacter(id) {
  return getCharacters().find((c) => c.id === id) || null;
}

export function saveCharacter(character) {
  const characters = getCharacters();
  const existing = characters.findIndex((c) => c.id === character.id);
  if (existing >= 0) {
    characters[existing] = { ...characters[existing], ...character, updatedAt: Date.now() };
  } else {
    characters.push({
      ...character,
      id: character.id || generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  setItem(KEYS.CHARACTERS, characters);
  return characters;
}

export function deleteCharacter(id) {
  const characters = getCharacters().filter((c) => c.id !== id);
  setItem(KEYS.CHARACTERS, characters);
  return characters;
}

// ========== Stories ==========

export function getStories() {
  return getItem(KEYS.STORIES, []);
}

export function getStory(id) {
  return getStories().find((s) => s.id === id) || null;
}

export function saveStory(story) {
  const stories = getStories();
  const existing = stories.findIndex((s) => s.id === story.id);
  if (existing >= 0) {
    stories[existing] = { ...stories[existing], ...story, updatedAt: Date.now() };
  } else {
    stories.push({
      ...story,
      id: story.id || generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  setItem(KEYS.STORIES, stories);
  return stories;
}

export function deleteStory(id) {
  const stories = getStories().filter((s) => s.id !== id);
  setItem(KEYS.STORIES, stories);
  return stories;
}

// ========== Chat Histories ==========

export function getChatHistories() {
  return getItem(KEYS.CHAT_HISTORIES, {});
}

export function getChatHistory(characterId) {
  const histories = getChatHistories();
  return histories[characterId] || [];
}

export function saveChatHistory(characterId, messages) {
  const histories = getChatHistories();
  histories[characterId] = messages;
  setItem(KEYS.CHAT_HISTORIES, histories);
}

export function clearChatHistory(characterId) {
  const histories = getChatHistories();
  delete histories[characterId];
  setItem(KEYS.CHAT_HISTORIES, histories);
}

// ========== Settings ==========

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...getItem(KEYS.SETTINGS, {}) };
}

export function updateSettings(updates) {
  const settings = { ...getSettings(), ...updates };
  setItem(KEYS.SETTINGS, settings);
  return settings;
}

// ========== Utilities ==========

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Genre options
export const GENRES = [
  'Romance', 'Fantasy', 'Horror', 'Mystery', 'Sci-Fi',
  'Drama', 'Comedy', 'Action', 'Slice of Life', 'Thriller',
  'Historical', 'Supernatural', 'Adventure', 'Fanfiction',
];

// Voice style options
export const VOICE_STYLES = [
  'Friendly', 'Mysterious', 'Sarcastic', 'Romantic', 'Cold',
  'Cheerful', 'Dark', 'Wise', 'Playful', 'Aggressive',
  'Gentle', 'Formal', 'Casual', 'Poetic',
];
