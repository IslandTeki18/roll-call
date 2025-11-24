import { Client, Databases, Query } from "node-appwrite";
import OpenAI from "openai";

export default async ({ req, res, log, error }) => {
  let payload;

  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    return res.json({ error: "Invalid JSON" }, 400);
  }

  const { userId, contactId, context } = payload;

  if (!userId || !contactId) {
    return res.json({ error: "Missing required fields" }, 400);
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const contact = await databases.getDocument(
      process.env.DATABASE_ID,
      process.env.PROFILE_CONTACTS_TABLE_ID,
      contactId
    );

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Generate a brief, friendly message to ${
      contact.displayName
    }${contact.organization ? ` at ${contact.organization}` : ""}.${
      context ? ` Context: ${context}` : ""
    } Keep it casual and under 100 words.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    const draft = completion.choices[0].message.content;
    log(`Draft generated: ${draft}`);

    log(`Generated draft for contact: ${contactId}`);
    return res.json({ draft });
  } catch (err) {
    error(`OpenAI error: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
