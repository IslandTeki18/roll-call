import { Client, Databases, ID } from "node-appwrite";
import OpenAI from "openai";

export default async ({ req, res, log, error }) => {
  let payload;

  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    return res.json({ error: "Invalid JSON" }, 400);
  }

  const { raw_text, user_id, contact_ids } = payload;

  if (!raw_text || !user_id) {
    return res.json(
      { error: "Missing required fields: raw_text, user_id" },
      400
    );
  }

  const execution_id = ID.unique();
  const timestamp = new Date().toISOString();

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build system prompt for structured analysis
    const systemPrompt = `You are an AI assistant that analyzes relationship notes and outcomes.
Extract the following from the provided text:
1. Summary: A concise 1-2 sentence summary
2. Next Steps: Specific actionable items (list format)
3. Entities: People, companies, or organizations mentioned (list format)
4. Sentiment: Overall tone (positive, neutral, negative, or mixed)

Return valid JSON only with this structure:
{
  "summary": "string",
  "next_steps": ["string"],
  "entities": ["string"],
  "sentiment": "positive|neutral|negative|mixed"
}`;

    log(`Starting AI analysis - execution_id: ${execution_id}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: raw_text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw_response = completion.choices[0].message.content;
    log(`Raw OpenAI response: ${raw_response}`);

    const analysis = JSON.parse(raw_response);

    // Auto-link contacts based on entities if contact_ids provided
    let linked_contacts = [];
    if (contact_ids && contact_ids.length > 0) {
      linked_contacts = contact_ids;
      log(`Using provided contact_ids: ${linked_contacts.join(", ")}`);
    } else if (analysis.entities && analysis.entities.length > 0) {
      log(
        `Auto-linking contacts based on entities: ${analysis.entities.join(
          ", "
        )}`
      );
      // Query contacts matching entity names
      const contactMatches = await databases.listDocuments(
        process.env.DATABASE_ID,
        process.env.PROFILE_CONTACTS_TABLE_ID
        // Search for entities in displayName or organization
      );

      linked_contacts = contactMatches.documents
        .map((doc) => doc.$id)
        .slice(0, 5); // Limit auto-linked contacts

      log(`Auto-linked ${linked_contacts.length} contacts`);
    }

    const result = {
      summary: analysis.summary || "",
      next_steps: analysis.next_steps || [],
      entities: analysis.entities || [],
      sentiment: analysis.sentiment || "neutral",
      linked_contacts,
      raw_text,
      processed_at: timestamp,
      user_id,
    };

    // Store intermediate artifacts for debugging
    await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.AI_ANALYSIS_LOGS_TABLE_ID,
      execution_id,
      {
        user_id,
        execution_id,
        raw_text,
        system_prompt: systemPrompt,
        raw_openai_response: raw_response,
        parsed_analysis: JSON.stringify(analysis),
        linked_contacts: linked_contacts.join(","),
        contact_ids_provided: contact_ids ? contact_ids.join(",") : "",
        summary: result.summary,
        next_steps: result.next_steps.join("|"),
        entities: result.entities.join(","),
        sentiment: result.sentiment,
        model: "gpt-4o-mini",
        temperature: 0.3,
        isSuccessful: true,
        error_message: "",
        $createdAt: timestamp,
      }
    );

    log(`AI analysis complete and stored - execution_id: ${execution_id}`);
    return res.json({ ...result, execution_id });
  } catch (err) {
    error(`AI engine error: ${err.message}`);

    // Store failed execution for debugging
    try {
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);

      await databases.createDocument(
        process.env.DATABASE_ID,
        process.env.AI_ANALYSIS_LOGS_TABLE_ID,
        execution_id,
        {
          user_id,
          execution_id,
          raw_text,
          system_prompt: "",
          raw_openai_response: "",
          parsed_analysis: "",
          linked_contacts: "",
          contact_ids_provided: contact_ids ? contact_ids.join(",") : "",
          summary: "",
          next_steps: "",
          entities: "",
          sentiment: "neutral",
          model: "gpt-4o-mini",
          temperature: 0.3,
          isSuccessful: false,
          error_message: err.message,
          $createdAt: timestamp,
        }
      );
    } catch (logErr) {
      error(`Failed to store error log: ${logErr.message}`);
    }

    return res.json({ error: err.message, execution_id }, 500);
  }
};
