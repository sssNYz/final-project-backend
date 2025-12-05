/**
 * Get the base URL for API calls
 * Uses environment variable if set, otherwise uses same origin
 */
export function getApiBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // If empty or not set, return empty string (relative URL = same server)
    if (!baseUrl) {
      return "";
    }
    
    // Remove trailing slash if present
    return baseUrl.replace(/\/$/, "");
  }
  
  /**
   * Build full API URL from path
   * @param path - API path like "/api/admin/signin"
   * @returns Full URL or relative path
   */
  export function apiUrl(path: string): string {
    const baseUrl = getApiBaseUrl();
    
    // Ensure path starts with /
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    
    // If no base URL, return relative path
    if (!baseUrl) {
      return cleanPath;
    }
    
    // Return full URL
    return `${baseUrl}${cleanPath}`;
  }