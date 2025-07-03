"use client"

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState<string>("");

  const testProfiles = api.profile.getAll.useQuery();
  const testScraping = api.scraping.test.useQuery();
  const testScrapingDb = api.scraping.testDb.useMutation();


  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Debug Test Page</h1>
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Profile Query Test</h2>
        {testProfiles.isLoading && <p>Loading...</p>}
        {testProfiles.data && (
          <div>
            <p className="text-green-600">✅ Found {testProfiles.data.length} profiles</p>
            <ul className="text-sm">
              {testProfiles.data.map(profile => (
                <li key={profile.id}>{profile.name}: {profile.followerCount.toLocaleString()} followers</li>
              ))}
            </ul>
          </div>
        )}
        {testProfiles.error && (
          <p className="text-red-600">❌ {testProfiles.error.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Scraping Router Test</h2>
        {testScraping.isLoading && <p>Loading...</p>}
        {testScraping.data && (
          <p className={testScraping.data.success ? "text-green-600" : "text-red-600"}>
            {testScraping.data.success ? "✅" : "❌"} {testScraping.data.message}
          </p>
        )}
        {testScraping.error && (
          <p className="text-red-600">❌ {testScraping.error.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Scraping DB Test</h2>
        <Button 
          onClick={() => testScrapingDb.mutate()} 
          disabled={testScrapingDb.isPending}
        >
          {testScrapingDb.isPending ? "Testing..." : "Test Database"}
        </Button>
        {testScrapingDb.data && (
          <p className={testScrapingDb.data.success ? "text-green-600" : "text-red-600"}>
            {testScrapingDb.data.success ? "✅" : "❌"} {testScrapingDb.data.message}
          </p>
        )}
        {testScrapingDb.error && (
          <p className="text-red-600">❌ {testScrapingDb.error.message}</p>
        )}
      </div>

    </div>
  );
}