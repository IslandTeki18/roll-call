import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {

  const payload = JSON.parse(req.body);
  const event = payload.event;

  log(`Received event: ${event.type}`);

  if (event.type === "INITIAL_PURCHASE" || event.type === "RENEWAL") {
    const appUserId = event.app_user_id;

    try {
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);

      const users = await databases.listDocuments(
        process.env.DATABASE_ID,
        process.env.USER_PROFILES_TABLE_ID,
        [Query.equal("clerkUserId", appUserId)]
      );

      if (users.documents.length === 0) {
        error(`User not found: ${appUserId}`);
        return res.json({ error: "User not found" }, 404);
      }

      await databases.updateDocument(
        process.env.DATABASE_ID,
        process.env.USER_PROFILES_TABLE_ID,
        users.documents[0].$id,
        { isPremiumUser: true }
      );

      log(`Updated premium status for user: ${appUserId}`);
      return res.json({ success: true });
    } catch (err) {
      error(`Database error: ${err.message}`);
      return res.json({ error: err.message }, 500);
    }
  }

  if (event.type === "CANCELLATION" || event.type === "EXPIRATION") {
    const appUserId = event.app_user_id;

    try {
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);

      const users = await databases.listDocuments(
        process.env.DATABASE_ID,
        process.env.USER_PROFILES_TABLE_ID,
        [Query.equal("clerkUserId", appUserId)]
      );

      if (users.documents.length > 0) {
        await databases.updateDocument(
          process.env.DATABASE_ID,
          process.env.USER_PROFILES_TABLE_ID,
          users.documents[0].$id,
          { isPremiumUser: false }
        );

        log(`Revoked premium status for user: ${appUserId}`);
      }

      return res.json({ success: true });
    } catch (err) {
      error(`Database error: ${err.message}`);
      return res.json({ error: err.message }, 500);
    }
  }

  return res.json({ received: true });
};
