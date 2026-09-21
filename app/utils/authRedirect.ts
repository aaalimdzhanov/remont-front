// Куда вернуть пользователя после успешного login/register, если он попал
// на /auth/login или /auth/register через auth gate (см. задание "Public
// Marketplace v1", секция AUTH GATE) с ?redirect=<исходная страница>.
// Единственная опасность здесь — open redirect (?redirect=https://evil.com
// или ?redirect=//evil.com, оба браузер трактует как переход на чужой
// хост) — поэтому принимается только internal path, начинающийся ровно с
// одного "/". Любое другое значение (отсутствует, не строка, внешний URL,
// protocol-relative "//") — используется fallback.
export function resolveAuthRedirect(raw: unknown, fallback = '/projects'): string {
  if (typeof raw !== 'string' || raw.length === 0) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}
