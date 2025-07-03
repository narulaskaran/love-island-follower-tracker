"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import Image from "next/image"

interface ContestantData {
  id: string
  name: string
  followerCount: number
  profileImage?: string
}

interface FollowerBarChartProps {
  data: ContestantData[]
}

interface TooltipPayload {
  payload: ContestantData
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0]!.payload
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          {data.profileImage && (
            <Image
              src={data.profileImage}
              alt={data.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <p className="font-medium">{data.name}</p>
        </div>
        <p className="text-sm text-gray-600">
          {data.followerCount.toLocaleString()} followers
        </p>
      </div>
    )
  }
  return null
}

export function FollowerBarChart({ data }: FollowerBarChartProps) {
  // Sort data by follower count in descending order
  const sortedData = [...data].sort((a, b) => b.followerCount - a.followerCount)

  const chartConfig = {
    followerCount: {
      label: "Followers",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Love Island USA Contestant Followers</CardTitle>
        <CardDescription>
          Instagram follower counts sorted by popularity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            data={sortedData}
            margin={{
              top: 40,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="followerCount"
              fill="hsl(280, 100%, 70%)"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}