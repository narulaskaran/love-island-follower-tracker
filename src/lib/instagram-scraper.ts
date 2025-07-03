import type { Browser, Page } from "playwright";

// For Vercel deployment compatibility
let playwright: typeof import("playwright") | typeof import("playwright-aws-lambda");

// Check if we're in a serverless environment (Vercel)
const isServerless = process.env.VERCEL ?? process.env.AWS_LAMBDA_FUNCTION_NAME;

if (isServerless) {
  // Use playwright-aws-lambda for serverless environments
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  playwright = require("playwright-aws-lambda");
} else {
  // Use regular playwright for local development
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  playwright = require("playwright");
}

export interface InstagramProfileData {
  followerCount: number;
  profileImageUrl?: string;
  isPrivate: boolean;
  username: string;
}

export interface ScrapingResult {
  success: boolean;
  data?: InstagramProfileData;
  error?: string;
}

/**
 * Scrapes Instagram profile data including follower count and profile image
 * @param instagramUrl - Full Instagram profile URL
 * @returns Promise<ScrapingResult>
 */
export async function scrapeInstagramProfile(instagramUrl: string): Promise<ScrapingResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Extract username from URL
    const username = extractUsernameFromUrl(instagramUrl);
    if (!username) {
      return {
        success: false,
        error: "Invalid Instagram URL format"
      };
    }

    // Launch browser with appropriate configuration
    if (isServerless) {
      // Serverless configuration
      browser = await (playwright as typeof import("playwright-aws-lambda")).launchChromium({
        headless: true,
      });
    } else {
      // Local development configuration
      browser = await (playwright as typeof import("playwright")).chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ]
      });
    }

    page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    // Navigate to Instagram profile
    const response = await page.goto(instagramUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (!response || response.status() !== 200) {
      return {
        success: false,
        error: `Failed to load Instagram page. Status: ${response?.status()}`
      };
    }

    // Wait for page to load and check if profile exists
    try {
      await page.waitForSelector('main', { timeout: 10000 });
    } catch {
      return {
        success: false,
        error: "Instagram page failed to load properly"
      };
    }

    // Check if profile is private or doesn't exist
    const isPrivate = await page.locator('text=This Account is Private').isVisible();
    const profileNotFound = await page.locator('text=Sorry, this page isn\'t available').isVisible();
    
    if (profileNotFound) {
      return {
        success: false,
        error: "Instagram profile not found"
      };
    }

    // Extract follower count
    const followerCount = await extractFollowerCount(page);
    
    // Extract profile image URL
    const profileImageUrl = await extractProfileImage(page);

    return {
      success: true,
      data: {
        followerCount,
        profileImageUrl,
        isPrivate,
        username
      }
    };

  } catch (error) {
    console.error('Instagram scraping error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown scraping error"
    };
  } finally {
    // Clean up resources
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract username from Instagram URL
 */
function extractUsernameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Handle different Instagram URL formats
    // https://instagram.com/username or https://instagram.com/username/
    const match = /^\/([^\/]+)\/?$/.exec(pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract follower count from Instagram page
 */
async function extractFollowerCount(page: Page): Promise<number> {
  try {
    // Try multiple selectors as Instagram layout can vary
    const selectors = [
      'a[href*="/followers/"] span[title]', // Main follower count with title attribute
      'a[href*="/followers/"] span', // Fallback without title
      'text=/followers/', // Text-based search
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          let text = await element.textContent();
          
          // If using title attribute, prefer that
          if (selector.includes('[title]')) {
            const title = await element.getAttribute('title');
            if (title) text = title;
          }
          
          if (text) {
            const followerCount = parseFollowerCount(text);
            if (followerCount > 0) {
              return followerCount;
            }
          }
        }
      } catch {
        // Continue to next selector
        continue;
      }
    }

    // If all selectors fail, try a more general approach
    const pageContent = await page.textContent('main');
    if (pageContent) {
      const followerMatch = /(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?[KMB]?)\s+followers/i.exec(pageContent);
      if (followerMatch?.[1]) {
        return parseFollowerCount(followerMatch[1]);
      }
    }

    return 0;
  } catch (error) {
    console.error('Error extracting follower count:', error);
    return 0;
  }
}

/**
 * Extract profile image URL from Instagram page
 */
async function extractProfileImage(page: Page): Promise<string | undefined> {
  try {
    // Try to find profile image
    const selectors = [
      'header img[alt*="profile picture"]',
      'header img[alt*="avatar"]',
      'article header img',
      'img[style*="border-radius"]'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          const src = await element.getAttribute('src');
          if (src?.startsWith('https://')) {
            return src;
          }
        }
      } catch {
        continue;
      }
    }

    return undefined;
  } catch (error) {
    console.error('Error extracting profile image:', error);
    return undefined;
  }
}

/**
 * Parse follower count string to number
 * Handles formats like: "1,234", "1.2K", "1.5M", "2.1B"
 */
function parseFollowerCount(text: string): number {
  try {
    // Remove any non-numeric characters except K, M, B, and decimal points
    const cleaned = text.replace(/[^\d.,KMB]/gi, '');
    
    // Handle different formats
    if (cleaned.includes('K')) {
      const num = parseFloat(cleaned.replace('K', ''));
      return Math.round(num * 1000);
    }
    
    if (cleaned.includes('M')) {
      const num = parseFloat(cleaned.replace('M', ''));
      return Math.round(num * 1000000);
    }
    
    if (cleaned.includes('B')) {
      const num = parseFloat(cleaned.replace('B', ''));
      return Math.round(num * 1000000000);
    }
    
    // Handle comma-separated numbers (e.g., "1,234,567")
    const numberStr = cleaned.replace(/,/g, '');
    return parseInt(numberStr, 10) || 0;
    
  } catch (error) {
    console.error('Error parsing follower count:', text, error);
    return 0;
  }
}