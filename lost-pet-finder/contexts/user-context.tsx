"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useRef } from "react"

// Define user type based on API response
export type User = {
  id: string
  name: string
  // Add other fields if needed, e.g., username
}

// Define Contact Info type
export type ContactInfo = {
  id: string
  value: string
  type: string // e.g., "Email", "Phone"
  isPrimary: boolean
}

// Define context type
type UserContextType = {
  user: User | null
  isLoading: boolean
  token: string | null
  contactInfos: ContactInfo[] | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, name: string) => Promise<void>
  logout: () => void
  fetchCurrentUser: (token: string) => Promise<User | null>
  fetchContactInfos: (token: string) => Promise<ContactInfo[] | null>
  fetchContactInfosByUserId: (token: string, userId: string) => Promise<ContactInfo[] | null>
  addContactInfo: (token: string, info: Omit<ContactInfo, 'id' | 'isPrimary'>) => Promise<ContactInfo | null>
  deleteContactInfos: (token: string, ids: string[]) => Promise<void>
  setPrimaryContact: (token: string, id: string) => Promise<void>
  updateContactInfo: (token: string, id: string, info: Omit<ContactInfo, 'id' | 'isPrimary'>) => Promise<void>
}

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

// Create context with default values
const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  token: null,
  contactInfos: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  fetchCurrentUser: async () => null,
  fetchContactInfos: async () => null,
  fetchContactInfosByUserId: async () => null,
  addContactInfo: async () => null,
  deleteContactInfos: async () => {},
  setPrimaryContact: async () => {},
  updateContactInfo: async () => {},
})

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [contactInfos, setContactInfos] = useState<ContactInfo[] | null>(null)
  
  // Simple cache to prevent redundant API calls
  const contactInfoCache = useRef<Record<string, {timestamp: number, data: ContactInfo[]}>>({});
  const CACHE_EXPIRY = 60000; // 1 minute in milliseconds

  // Fetch current user data
  const fetchCurrentUser = async (authToken: string): Promise<User | null> => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined. Check your .env.local file.")
      return null
    }
    try {
      const response = await fetch(`${API_BASE_URL}/GeneralUsers/current`, {
        method: "GET",
        headers: {
          "accept": "*/*",
          "Authorization": `Bearer ${authToken}`,
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const userData: User = await response.json()
      setUser(userData)
      await fetchContactInfos(authToken)
      return userData
    } catch (error) {
      console.error("Failed to fetch current user:", error)
      setToken(null)
      setUser(null)
      setContactInfos(null)
      localStorage.removeItem("authToken")
      return null
    }
  }

  // Fetch contact information
  const fetchContactInfos = async (authToken: string): Promise<ContactInfo[] | null> => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined.")
      return null
    }
    if (!authToken) {
      console.error("No auth token provided for fetching contact infos.")
      return null
    }
    try {
      const response = await fetch(`${API_BASE_URL}/ContactInfos`, {
        method: "GET",
        headers: {
          "accept": "text/plain",
          "Authorization": `Bearer ${authToken}`,
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const infos: ContactInfo[] = await response.json()
      setContactInfos(infos)
      return infos
    } catch (error) {
      console.error("Failed to fetch contact infos:", error)
      setContactInfos(null)
      return null
    }
  }

  // Fetch contact information by user ID
  const fetchContactInfosByUserId = async (authToken: string, userId: string): Promise<ContactInfo[] | null> => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined.")
      return null
    }
    if (!authToken) {
      console.error("No auth token provided for fetching contact infos.")
      return null
    }
    if (!userId) {
      console.error("No user ID provided for fetching contact infos.")
      return null
    }

    // Generate a unique request ID for this specific call
    const requestId = `${userId}-${Date.now()}`;
    console.log(`[${requestId}] Starting contact info request for user ${userId}`);

    // Check cache first
    const cacheKey = `user-${userId}`;
    const cachedData = contactInfoCache.current[cacheKey];
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_EXPIRY)) {
      console.log(`[${requestId}] Using cached contacts for user ${userId}, age: ${(now - cachedData.timestamp)/1000}s`);
      return cachedData.data;
    }
    
    try {
      console.log(`[${requestId}] Fetching contacts for user ID: ${userId} from ${API_BASE_URL}/ContactInfos/user/${userId}`)
      const response = await fetch(`${API_BASE_URL}/ContactInfos/user/${userId}`, {
        method: "GET",
        headers: {
          "accept": "text/plain",
          "Authorization": `Bearer ${authToken}`,
        },
      })
      
      console.log(`[${requestId}] Response status for user ${userId} contacts:`, response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[${requestId}] Error fetching contacts for user ${userId}:`, errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
      
      const infos: ContactInfo[] = await response.json()
      console.log(`[${requestId}] Received ${infos.length} contacts for user ${userId}:`, infos)
      
      // Update cache
      contactInfoCache.current[cacheKey] = {
        timestamp: now,
        data: infos
      };
      
      console.log(`[${requestId}] Successfully completed request for user ${userId}`);
      return infos
    } catch (error) {
      console.error(`[${requestId}] Failed to fetch contact infos for user ${userId}:`, error)
      return null
    }
  }

  // Add contact information
  const addContactInfo = async (authToken: string, info: Omit<ContactInfo, 'id' | 'isPrimary'>): Promise<ContactInfo | null> => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined.")
      throw new Error("API configuration error.")
    }
    if (!authToken) {
      console.error("No auth token provided for adding contact info.")
      throw new Error("Authentication required.")
    }
    try {
      const response = await fetch(`${API_BASE_URL}/ContactInfos`, {
        method: "POST",
        headers: {
          "accept": "*/*",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([info]),
      })

      if (!response.ok) {
        const errorData = await response.text().catch(() => (`Adding contact info failed with status: ${response.status}`))
        throw new Error(errorData)
      }

      await fetchContactInfos(authToken)
      return null
    } catch (error) {
      console.error("Failed to add contact info:", error)
      throw error
    }
  }

  // Delete contact information
  const deleteContactInfos = async (authToken: string, ids: string[]): Promise<void> => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined.")
      throw new Error("API configuration error.")
    }
    if (!authToken) {
      console.error("No auth token provided for deleting contact info.")
      throw new Error("Authentication required.")
    }
    try {
      const response = await fetch(`${API_BASE_URL}/ContactInfos`, {
        method: "DELETE",
        headers: {
          "accept": "*/*",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ids),
      })

      if (!response.ok) {
        const errorData = await response.text().catch(() => (`Deleting contact info failed with status: ${response.status}`))
        throw new Error(errorData)
      }

      await fetchContactInfos(authToken)
    } catch (error) {
      console.error("Failed to delete contact infos:", error)
      throw error
    }
  }

  // Set primary contact information
  const setPrimaryContact = async (authToken: string, id: string): Promise<void> => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined.")
      throw new Error("API configuration error.")
    }
    if (!authToken) {
      console.error("No auth token provided for setting primary contact info.")
      throw new Error("Authentication required.")
    }
    try {
      const response = await fetch(`${API_BASE_URL}/ContactInfos/${id}/primary`, {
        method: "PUT",
        headers: {
          "accept": "*/*",
          "Authorization": `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.text().catch(() => (`Setting primary contact info failed with status: ${response.status}`))
        throw new Error(errorData)
      }

      await fetchContactInfos(authToken)
    } catch (error) {
      console.error("Failed to set primary contact info:", error)
      throw error
    }
  }

  // Update contact information
  const updateContactInfo = async (authToken: string, id: string, info: Omit<ContactInfo, 'id' | 'isPrimary'>): Promise<void> => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined.")
      throw new Error("API configuration error.")
    }
    if (!authToken) {
      console.error("No auth token provided for updating contact info.")
      throw new Error("Authentication required.")
    }
    try {
      const response = await fetch(`${API_BASE_URL}/ContactInfos/${id}`, {
        method: "PUT",
        headers: {
          "accept": "*/*",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(info),
      })

      if (!response.ok) {
        const errorData = await response.text().catch(() => (`Updating contact info failed with status: ${response.status}`))
        throw new Error(errorData)
      }

      await fetchContactInfos(authToken)
    } catch (error) {
      console.error("Failed to update contact info:", error)
      throw error
    }
  }

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      const storedToken = localStorage.getItem("authToken")
      if (storedToken) {
        setToken(storedToken)
        await fetchCurrentUser(storedToken)
      } else {
        setUser(null)
        setContactInfos(null)
      }
      setIsLoading(false)
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Login function
  const login = async (username: string, password: string) => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined. Check your .env.local file.")
      throw new Error("API configuration error.")
    }
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/GeneralUsers/login`, {
        method: "POST",
        headers: {
          "accept": "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Login failed with status: ${response.status}`)
      }

      const { accessToken } = await response.json()
      setToken(accessToken)
      localStorage.setItem("authToken", accessToken)
      await fetchCurrentUser(accessToken)
    } catch (error) {
      console.error("Login failed:", error)
      setToken(null)
      setUser(null)
      setContactInfos(null)
      localStorage.removeItem("authToken")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  const register = async (username: string, password: string, name: string) => {
    if (!API_BASE_URL) {
      console.error("API base URL is not defined. Check your .env.local file.")
      throw new Error("API configuration error.")
    }
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/GeneralUsers/register`, {
        method: "POST",
        headers: {
          "accept": "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, name }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Registration failed with status: ${response.status}`)
      }

      const { accessToken } = await response.json()
      setToken(accessToken)
      localStorage.setItem("authToken", accessToken)
      await fetchCurrentUser(accessToken)
    } catch (error) {
      console.error("Registration failed:", error)
      setToken(null)
      setUser(null)
      setContactInfos(null)
      localStorage.removeItem("authToken")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    setUser(null)
    setToken(null)
    setContactInfos(null)
    localStorage.removeItem("authToken")
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        token,
        contactInfos,
        login,
        register,
        logout,
        fetchCurrentUser,
        fetchContactInfos,
        fetchContactInfosByUserId,
        addContactInfo,
        deleteContactInfos,
        setPrimaryContact,
        updateContactInfo,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

// Custom hook for using the context
export function useUser() {
  return useContext(UserContext)
}

