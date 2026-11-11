export async function buildoraApi(
  endpoint,
  {
    token,
    method = "GET",
    body
  } = {}
) {
  const base = process.env.BUILDORA_CORE_API_URL;

  if (!base) {
    throw new Error("BUILDORA_CORE_API_URL is not configured");
  }

  if (!token) {
    throw new Error("Integration access token is required");
  }

  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//")
  ) {
    throw new Error("Invalid relative API endpoint");
  }

  const response = await fetch(
    new URL(endpoint, base),
    {
      method: method,
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
        ...(body === undefined
          ? {}
          : { "Content-Type": "application/json" })
      },
      body: body === undefined
        ? undefined
        : JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    }
  );

  if (!response.ok) {
    throw new Error(
      "BUILDORA core API failed with status " + response.status
    );
  }

  return response.json();
}