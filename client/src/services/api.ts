const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error("AniVerse API is unavailable.");
  }

  return response.json() as Promise<{ status: string; service: string; timestamp: string }>;
}
