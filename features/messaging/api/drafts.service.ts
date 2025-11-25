const OPENAI_FUNCTION_ENDPOINT =
  process.env.EXPO_PUBLIC_OPENAI_FUNCTION_ENDPOINT!;

export interface DraftRequest {
  userId: string;
  contactId: string;
  context?: string;
}

export interface DraftResponse {
  draft: string;
}

export const generateDraft = async (
  userId: string,
  contactId: string,
  context?: string
): Promise<string> => {
  const payload: DraftRequest = {
    userId,
    contactId,
    context,
  };

  const response = await fetch(OPENAI_FUNCTION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Draft generation failed: ${response.statusText}`);
  }

  const data: DraftResponse = await response.json();
  return data.draft;
};
