import { NextRequest, NextResponse } from "next/server";
import { SchematicClient } from "@schematichq/schematic-typescript-node";

const DEFAULT_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_SCHEMATIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "No Schematic key" }, { status: 400 });
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const featureId = searchParams.get('featureId');
  const offset = parseInt(searchParams.get('offset') || '0');
  const limit = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE));

  if (!featureId) {
    return NextResponse.json(
      { message: "Feature ID is required" }, 
      { status: 400 }
    );
  }

  try {
    const schematicClient = new SchematicClient({ apiKey });
    
    const response = await schematicClient.entitlements.listFeatureCompanies({
      featureId,
      limit,
      offset,
    });

    // Add pagination metadata
    const result = {
      data: response.data,
      pagination: {
        offset,
        limit,
        total: response.data.length, // Note: Update if API provides total count
        hasMore: response.data.length === limit
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Schematic API error:', error);
    return NextResponse.json(
      { message: "Failed to fetch feature usage data" },
      { status: 500 }
    );
  }
}