You are to implement a public web application with the following requirements, using an incremental, PR-driven workflow:

**Project Overview:**

- Stack: Next.js (via create-t3-app), TypeScript, Prisma, tRPC, Tailwind CSS, shadcn/ui, Neon Postgres, and Vercel deployment.
- Purpose: Track and display the Instagram follower counts of Love Island USA contestants in a bar chart, sorted descending by follower count.
- No authentication required.

**Instructions:**

For each major unit of work below, complete the implementation in a feature branch, then use the GitHub CLI (`gh`) to open a pull request with a clear title and detailed description. Wait for me to review and merge each PR before beginning the next unit of work.

**Units of Work:**

1. **Skip**

2. **Frontend UI**

   - Integrate shadcn/ui and its chart/bar chart components.
   - Build a main page that displays a bar chart of contestants, with the highest follower count on the left.
   - Each bar should show the contestant's name, current follower count, and profile picture.
   - Add a button labeled "Update All Follower Counts" that triggers a backend update.
   - Create a PR titled "Add UI with shadcn/ui and Bar Chart" with screenshots and implementation notes.

3. **Database Schema**

   - Use Prisma to define:
     - `Profile` table: id (PK), name, instagramUrl (unique), profileImage (URL, optional), relation to FollowerCount.
     - `FollowerCount` table: id (PK), profileId (FK), count (integer), timestamp (datetime).
   - Push the schema to Neon Postgres (use a .env variable for DATABASE_URL).
   - Create a PR titled "Add Prisma Schema for Profiles and FollowerCounts" with schema details.

4. **Backend Logic**

   - Implement a serverless API endpoint (tRPC or Next.js API route) that:
     - Iterates through all profiles in the database.
     - For each, uses Playwright (or playwright-aws-lambda if needed for Vercel compatibility) to:
       - Visit the Instagram profile page.
       - Scrape the current follower count and profile image URL.
       - Insert a new FollowerCount row with the timestamp and count.
       - Update the Profile row with the latest profile image.
   - Ensure the function can be triggered by the frontend button.
   - Create a PR titled "Implement Instagram Scraping and Update Endpoint" with a summary of scraping approach and error handling.

5. **Frontend Data Fetching**

   - Fetch and display only the most recent FollowerCount per Profile for the bar chart.
   - Sort the data so the profile with the highest follower count appears first (leftmost bar).
   - Create a PR titled "Connect Frontend to Latest Follower Data" with implementation notes.

6. **Historical Data**

   - Ensure all FollowerCount records are kept for possible future historical charting.
   - Create a PR titled "Preserve Historical FollowerCount Records".

7. **Deployment**
   - Push the repository to GitHub.
   - Set up deployment to Vercel, configuring the Neon DATABASE_URL as an environment variable.
   - Ensure the Playwright-based scraping function works in the Vercel environment (use playwright-aws-lambda if necessary).
   - Create a PR titled "Configure Vercel Deployment and Environment Variables".

**General:**

- The site must be public with no authentication.
- Code should be clean and well-commented.
- Document any manual environment setup steps required for Playwright or database access.
- Use the GitHub CLI (`gh`) to create PRs for each unit of work, and wait for my review before proceeding to the next.

**Begin by planning the folder structure and confirming all dependencies. Then proceed step by step, asking for clarification if any requirement is ambiguous.**
