// Google OAuth 2.0 via GIS (Google Identity Services)
// Scope: read + write Google Sheets
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

let tokenClient = null
let accessToken = null
let onTokenCallback = null

export function initGoogleAuth(clientId, onToken) {
  onTokenCallback = onToken
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) return
      accessToken = response.access_token
      if (onTokenCallback) onTokenCallback(accessToken)
    },
  })
}

export function requestAccessToken() {
  if (!tokenClient) throw new Error('Auth belum diinisialisasi')
  tokenClient.requestToken()
}

export function getAccessToken() {
  return accessToken
}

export function revokeToken() {
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken)
    accessToken = null
    if (onTokenCallback) onTokenCallback(null)
  }
}
