import { Client, Account, Databases, TablesDB } from "react-native-appwrite";

export const client = new Client();
client
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
  .setPlatform("com.landonroney.rollcall");


export const account = new Account(client);
export const databases = new Databases(client);
export const tablesDB = new TablesDB(client);


