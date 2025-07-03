"use client"

import { Button } from "@/components/ui/button";
import { FollowerBarChart } from "@/components/follower-bar-chart";
import { api } from "@/trpc/react";
import { useState } from "react";

// Mock data for now - will be replaced with real data in later steps
const mockContestants = [
  {
    id: "1",
    name: "Olivia Kaiser",
    followerCount: 125000,
    profileImage: "/placeholder-avatar.jpg"
  },
  {
    id: "2", 
    name: "Korey Gandy",
    followerCount: 98000,
    profileImage: "/placeholder-avatar.jpg"
  },
  {
    id: "3",
    name: "Kyra Lizama", 
    followerCount: 87000,
    profileImage: "/placeholder-avatar.jpg"
  },
  {
    id: "4",
    name: "Will Moncada",
    followerCount: 76000,
    profileImage: "/placeholder-avatar.jpg"
  },
  {
    id: "5",
    name: "Trina Njoroge",
    followerCount: 65000,
    profileImage: "/placeholder-avatar.jpg"
  }
];

export default function Home() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  
  const updateAllFollowerCounts = api.scraping.updateAllFollowerCounts.useMutation({
    onSuccess: (data) => {
      setUpdateMessage(`✅ ${data.message}`);
      setIsUpdating(false);
    },
    onError: (error) => {
      setUpdateMessage(`❌ ${error.message}`);
      setIsUpdating(false);
    },
  });

  const handleUpdateClick = () => {
    setIsUpdating(true);
    setUpdateMessage("🔄 Updating follower counts...");
    updateAllFollowerCounts.mutate();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] mb-4">
            Love Island <span className="text-[hsl(280,100%,70%)]">Follower</span> Tracker
          </h1>
          <p className="text-xl text-gray-200 mb-8">
            Track Instagram follower counts of Love Island USA contestants
          </p>
          <div className="space-y-4">
            <Button
              size="lg"
              className="bg-[hsl(280,100%,70%)] hover:bg-[hsl(280,100%,60%)] text-white font-semibold"
              onClick={handleUpdateClick}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update All Follower Counts"}
            </Button>
            {updateMessage && (
              <p className="text-sm text-gray-200">{updateMessage}</p>
            )}
          </div>
        </div>

        <div className="w-full max-w-6xl mx-auto">
          <FollowerBarChart data={mockContestants} />
        </div>
      </div>
    </main>
  );
}
