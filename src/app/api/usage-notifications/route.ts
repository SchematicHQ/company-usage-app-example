import { NextRequest, NextResponse } from "next/server";
import { SchematicClient } from "@schematichq/schematic-typescript-node";

const THRESHOLDS = [100, 90, 80];

// You might want to use a proper database instead of this
let lastNotifiedUsage = new Map<string, number>();
let lastNotifiedAllocation = new Map<string, number>();

export async function POST(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_SCHEMATIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "No Schematic key" }, { status: 400 });
  }

  const { featureId } = await request.json();

  if (!featureId) {
    return NextResponse.json(
      { message: "Feature ID is required" },
      { status: 400 }
    );
  }

  try {
    const schematicClient = new SchematicClient({ apiKey });
    const notifications = [];

    // Get all companies (with pagination if needed)
    const response = await schematicClient.entitlements.listFeatureCompanies({
      featureId,
    });

    for (const company of response.data) {
      const usagePercentage = (company.usage / (company.allocation || 1)) * 100;
      const lastUsage = lastNotifiedUsage.get(company.company.id) || 0;
      const lastAllocation = lastNotifiedAllocation.get(company.company.id) || 0;

      for (const threshold of THRESHOLDS) {
        if (usagePercentage >= threshold && 
            (lastUsage / (lastAllocation || 1)) * 100 < threshold) {
          // Record notification
          notifications.push({
            companyId: company.company.id,
            companyName: company.company.name,
            feature: company.feature.name,
            threshold,
            usage: company.usage,
            allocation: company.allocation,
            timestamp: new Date().toISOString()
          });

          // Send actual notification (implement your notification logic here)
          await sendNotification({
            companyId: company.company.id,
            companyName: company.company.name,
            threshold,
            feature: company.feature.name,
            usage: company.usage,
            allocation: company.allocation
          });

          break;
        }
      }

      // Update last notified usage
      lastNotifiedUsage.set(company.company.id, company.usage);
      lastNotifiedAllocation.set(company.company.id, company.allocation);

    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Failed to process usage notifications:', error);
    return NextResponse.json(
      { message: "Failed to process usage notifications" },
      { status: 500 }
    );
  }
}

async function sendNotification(data: any) {
  // Implement your notification logic here (e.g., webhooks, email, Slack, etc.)
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}