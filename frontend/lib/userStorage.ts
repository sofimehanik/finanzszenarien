/**
 * Utility functions for managing user storage
 */

export interface SavedUser {
  email: string
  full_name?: string
  avatar_url?: string
  lastLogin: number
  token?: string  // Store token for quick switching
}

const RECENT_USERS_KEY = 'finsim_recent_users'
const RECENT_TOKENS_KEY = 'finsim_recent_tokens'
const MAX_RECENT_USERS = 2

/**
 * Save a user to recent users list (max 2)
 */
export function saveRecentUser(userInfo: SavedUser, token?: string): void {
  if (typeof window === 'undefined') return

  const stored = localStorage.getItem(RECENT_USERS_KEY)
  let users: SavedUser[] = stored ? JSON.parse(stored) : []

  // Remove if already exists
  users = users.filter(u => u.email !== userInfo.email)

  // Add new user at the beginning
  const newUser: SavedUser = {
    email: userInfo.email,
    full_name: userInfo.full_name,
    avatar_url: userInfo.avatar_url,
    lastLogin: userInfo.lastLogin || Date.now()
  }
  users.unshift(newUser)

  // Keep only the most recent 2 users
  users = users.slice(0, MAX_RECENT_USERS)

  localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(users))

  // Save token separately for quick switching (in sessionStorage for security)
  if (token) {
    const tokensStored = sessionStorage.getItem(RECENT_TOKENS_KEY)
    let tokens: Record<string, string> = tokensStored ? JSON.parse(tokensStored) : {}
    tokens[userInfo.email] = token
    
    // Keep only tokens for recent users
    const recentEmails = users.map(u => u.email)
    Object.keys(tokens).forEach(email => {
      if (!recentEmails.includes(email)) {
        delete tokens[email]
      }
    })
    
    sessionStorage.setItem(RECENT_TOKENS_KEY, JSON.stringify(tokens))
  }
}

/**
 * Get token for a user if available
 */
export function getRecentUserToken(email: string): string | null {
  if (typeof window === 'undefined') return null
  
  const tokensStored = sessionStorage.getItem(RECENT_TOKENS_KEY)
  if (!tokensStored) return null
  
  try {
    const tokens: Record<string, string> = JSON.parse(tokensStored)
    return tokens[email] || null
  } catch {
    return null
  }
}

/**
 * Get recent users (max 2, excluding current user)
 */
export function getRecentUsers(currentUserEmail?: string): SavedUser[] {
  if (typeof window === 'undefined') return []

  const stored = localStorage.getItem(RECENT_USERS_KEY)
  if (!stored) return []

  try {
    const users: SavedUser[] = JSON.parse(stored)
    // Filter out current user and return up to 2 users
    return users
      .filter(u => u.email !== currentUserEmail)
      .slice(0, MAX_RECENT_USERS)
  } catch (e) {
    console.error("Error loading recent users:", e)
    return []
  }
}

/**
 * Clear recent users
 */
export function clearRecentUsers(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RECENT_USERS_KEY)
}

