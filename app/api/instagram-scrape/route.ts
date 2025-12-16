import { NextResponse } from "next/server";

type InstagramScrapeRequest = {
  instagramUrl?: string;
};

const APIFY_ACTOR_RUNS_URL =
  "https://api.apify.com/v2/acts/apify~instagram-scraper/runs";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const body = (await req.json()) as InstagramScrapeRequest;
    const instagramUrl = body?.instagramUrl?.trim();

    if (!instagramUrl) {
      return NextResponse.json(
        { error: "Missing instagramUrl", correlationId },
        { status: 400 }
      );
    }

    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) {
      return NextResponse.json(
        { error: "APIFY_TOKEN not configured on server", correlationId },
        { status: 500 }
      );
    }

    // Input format matching existing client usage.
    const input = {
      directUrls: [instagramUrl],
      resultsType: "details",
      resultsLimit: 10,
      searchType: "user",
      addParentData: false,
      searchLimit: 10,
      includeNestedItems: true,
      scrapeAbout: true,
      scrapePosts: true,
      postsLimit: 10,
      scrapeUserPosts: true,
      userPostsLimit: 10,
    };

    const runResponse = await fetch(APIFY_ACTOR_RUNS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APIFY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      // Ensure this route isn't cached by intermediaries.
      cache: "no-store",
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      return NextResponse.json(
        {
          error: `Apify API error: ${runResponse.status}`,
          details: errorText,
          correlationId,
        },
        { status: 502 }
      );
    }

    const runData = (await runResponse.json()) as any;
    const runId: string | undefined = runData?.data?.id;

    if (!runId) {
      return NextResponse.json(
        { error: "Apify run did not return an id", correlationId },
        { status: 502 }
      );
    }

    const maxAttempts = 60; // ~10 minutes (60 * 10s)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(10_000);

      const statusResponse = await fetch(`${APIFY_ACTOR_RUNS_URL}/${runId}`, {
        headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
        cache: "no-store",
      });

      const statusData = (await statusResponse.json()) as any;
      const status = statusData?.data?.status as string | undefined;

      if (status === "SUCCEEDED") {
        const datasetId: string | undefined =
          statusData?.data?.defaultDatasetId;
        if (!datasetId) {
          return NextResponse.json(
            { error: "Apify run succeeded but dataset id missing", correlationId },
            { status: 502 }
          );
        }

        const resultsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?format=json`,
          {
            headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
            cache: "no-store",
          }
        );

        const results = await resultsResponse.json();
        return NextResponse.json({ results, correlationId }, { status: 200 });
      }

      if (status === "FAILED") {
        const msg = statusData?.data?.statusMessage || "Unknown error";
        return NextResponse.json(
          { error: `Instagram scraping failed: ${msg}`, correlationId },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: "Scraping timeout - please try again", correlationId },
      { status: 504 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        correlationId,
      },
      { status: 500 }
    );
  }
}


