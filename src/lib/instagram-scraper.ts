import type { Browser, Page } from "playwright";

// For Vercel deployment compatibility
let playwright:
  | typeof import("playwright")
  | typeof import("playwright-aws-lambda");

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
export async function scrapeInstagramProfile(
  instagramUrl: string,
): Promise<ScrapingResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Extract username from URL
    const username = extractUsernameFromUrl(instagramUrl);
    if (!username) {
      return {
        success: false,
        error: "Invalid Instagram URL format",
      };
    }

    // Launch browser with appropriate configuration
    if (isServerless) {
      // Serverless configuration
      browser = await (
        playwright as typeof import("playwright-aws-lambda")
      ).launchChromium({
        headless: true,
      });
    } else {
      // Local development configuration
      browser = await (
        playwright as typeof import("playwright")
      ).chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-blink-features=AutomationControlled",
          "--disable-features=VizDisplayCompositor",
          "--disable-web-security",
          "--disable-features=site-per-process",
        ],
      });
    }

    page = await browser.newPage();

    // Set realistic headers to avoid detection
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    });

    // Set viewport to common desktop size
    await page.setViewportSize({ width: 1366, height: 768 });

    console.log(`🔍 Scraping Instagram profile: ${instagramUrl}`);

    // Navigate to Instagram profile
    const response = await page.goto(instagramUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    if (!response || response.status() !== 200) {
      console.error(
        `❌ Failed to load Instagram page. Status: ${response?.status()}`,
      );
      return {
        success: false,
        error: `Failed to load Instagram page. Status: ${response?.status()}`,
      };
    }

    console.log(`✅ Page loaded successfully. Status: ${response.status()}`);

    // Wait for JavaScript to render content - try multiple strategies
    let contentLoaded = false;
    const maxRetries = 3;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(
          `⏳ Attempt ${retry + 1}: Waiting for Instagram content to load...`,
        );

        // Wait for any of these selectors that indicate content is loaded
        await page.waitForSelector(
          'article, main, [data-testid], section[role="main"]',
          {
            timeout: 10000,
          },
        );

        contentLoaded = true;
        console.log(`✅ Content loaded on attempt ${retry + 1}`);
        break;
      } catch (error) {
        console.log(
          `❌ Attempt ${retry + 1} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        if (retry < maxRetries - 1) {
          // Wait a bit before retrying
          await page.waitForTimeout(2000);
        }
      }
    }

    if (!contentLoaded) {
      console.error("❌ Content failed to load after all retries");
      return {
        success: false,
        error:
          "Instagram content failed to load - possible bot detection or network issues",
      };
    }

    // Check current URL to see if we were redirected
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Check if we're on a login page
    if (currentUrl.includes("/accounts/login/")) {
      return {
        success: false,
        error:
          "Instagram redirected to login page - profile may be private or require authentication",
      };
    }

    // Check for profile not found
    const profileNotFound = await page
      .locator("text=Sorry, this page isn't available")
      .isVisible();
    if (profileNotFound) {
      return {
        success: false,
        error: "Instagram profile not found",
      };
    }

    // Check if profile is private
    const isPrivate = await page
      .locator("text=This Account is Private")
      .isVisible();
    console.log(`🔒 Profile is private: ${isPrivate}`);

    // Extract follower count
    const followerCount = await extractFollowerCount(page);
    console.log(`👥 Follower count: ${followerCount}`);

    // Extract profile image URL
    const profileImageUrl = await extractProfileImage(page);
    console.log(
      `🖼️ Profile image URL: ${profileImageUrl ? "found" : "not found"}`,
    );

    if (followerCount === 0 && !isPrivate) {
      return {
        success: false,
        error:
          "Could not extract follower count - Instagram may have changed its layout",
      };
    }

    return {
      success: true,
      data: {
        followerCount,
        profileImageUrl,
        isPrivate,
        username,
      },
    };
  } catch (error) {
    console.error("❌ Instagram scraping error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown scraping error",
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
    console.log("🔍 Extracting follower count...");

    // Try multiple selectors as Instagram layout can vary
    const selectors = [
      // New Instagram layout selectors
      'a[href*="/followers/"] span[title]', // Main follower count with title attribute
      'a[href*="/followers/"] span', // Fallback without title
      'span[title*="followers"]', // Title attribute containing "followers"
      'span:has-text("followers")', // Span containing "followers" text
      // Legacy selectors
      "text=/\\d+.*followers/i", // Text-based search
    ];

    for (const selector of selectors) {
      try {
        console.log(`🔍 Trying selector: ${selector}`);
        const elements = page.locator(selector);
        const count = await elements.count();
        console.log(`📊 Found ${count} elements for selector: ${selector}`);

        if (count > 0) {
          const element = elements.first();
          if (await element.isVisible()) {
            let text = await element.textContent();

            // If using title attribute, prefer that
            if (selector.includes("[title]")) {
              const title = await element.getAttribute("title");
              if (title) {
                text = title;
                console.log(`📊 Using title attribute: ${title}`);
              }
            }

            if (text) {
              console.log(`📊 Found follower text: ${text}`);
              const followerCount = parseFollowerCount(text);
              if (followerCount > 0) {
                console.log(`✅ Parsed follower count: ${followerCount}`);
                return followerCount;
              }
            }
          }
        }
      } catch (error) {
        console.log(
          `❌ Selector "${selector}" failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        continue;
      }
    }

    // If all selectors fail, try a more general approach
    console.log("🔍 Trying general page text search...");
    const pageContent = await page.textContent("body");
    if (pageContent) {
      const followerMatch =
        /(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?[KMB]?)\s+followers/i.exec(
          pageContent,
        );
      if (followerMatch?.[1]) {
        console.log(
          `📊 Found follower text in page content: ${followerMatch[1]}`,
        );
        const followerCount = parseFollowerCount(followerMatch[1]);
        if (followerCount > 0) {
          console.log(
            `✅ Parsed follower count from page content: ${followerCount}`,
          );
          return followerCount;
        }
      }
    }

    console.log("❌ No follower count found");
    return 0;
  } catch (error) {
    console.error("❌ Error extracting follower count:", error);
    return 0;
  }
}

/**
 * Extract profile image URL from Instagram page
 */
async function extractProfileImage(page: Page): Promise<string | undefined> {
  try {
    console.log("🔍 Extracting profile image...");

    // Try to find profile image
    const selectors = [
      'header img[alt*="profile picture"]',
      'header img[alt*="avatar"]',
      'img[alt*="profile picture"]',
      "article header img",
      'img[style*="border-radius"]',
      'img[data-testid*="profile"]',
    ];

    for (const selector of selectors) {
      try {
        console.log(`🔍 Trying profile image selector: ${selector}`);
        const elements = page.locator(selector);
        const count = await elements.count();
        console.log(`📊 Found ${count} elements for selector: ${selector}`);

        if (count > 0) {
          const element = elements.first();
          if (await element.isVisible()) {
            const src = await element.getAttribute("src");
            if (src?.startsWith("https://")) {
              console.log(
                `✅ Found profile image URL: ${src.substring(0, 50)}...`,
              );
              return src;
            }
          }
        }
      } catch (error) {
        console.log(
          `❌ Profile image selector "${selector}" failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        continue;
      }
    }

    console.log("❌ No profile image found");
    return undefined;
  } catch (error) {
    console.error("❌ Error extracting profile image:", error);
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
    const cleaned = text.replace(/[^\d.,KMB]/gi, "");

    // Handle different formats
    if (cleaned.toUpperCase().includes("K")) {
      const num = parseFloat(cleaned.replace(/K/gi, ""));
      return Math.round(num * 1000);
    }

    if (cleaned.toUpperCase().includes("M")) {
      const num = parseFloat(cleaned.replace(/M/gi, ""));
      return Math.round(num * 1000000);
    }

    if (cleaned.toUpperCase().includes("B")) {
      const num = parseFloat(cleaned.replace(/B/gi, ""));
      return Math.round(num * 1000000000);
    }

    // Handle comma-separated numbers (e.g., "1,234,567")
    const numberStr = cleaned.replace(/,/g, "");
    const result = parseInt(numberStr, 10) || 0;

    console.log(`📊 Parsed "${text}" -> ${result}`);
    return result;
  } catch (error) {
    console.error("❌ Error parsing follower count:", text, error);
    return 0;
  }
}
