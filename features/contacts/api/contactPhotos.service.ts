import * as Contacts from "expo-contacts";
import type { ProfileContact } from "./contacts.service";

interface PhotoCache {
  uri: string | null;
  timestamp: number;
}

/**
 * Service for loading and caching contact photos from device contacts
 */
class ContactPhotosService {
  private cache: Map<string, PhotoCache> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Get a single contact's photo from device
   */
  async getContactPhoto(contact: ProfileContact): Promise<string | null> {
    if (!contact.$id) return null;

    // Check cache first
    const cached = this.cache.get(contact.$id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.uri;
    }

    // Fetch from device
    const photoUri = await this.fetchPhotoFromDevice(contact);

    // Update cache
    this.cache.set(contact.$id, {
      uri: photoUri,
      timestamp: Date.now(),
    });

    return photoUri;
  }

  /**
   * Batch load photos for multiple contacts (more efficient)
   */
  async batchLoadPhotos(
    contacts: ProfileContact[]
  ): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    // Request permissions first
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Contact permissions not granted - photos will use fallback");
      // Return empty results, components will fallback to initials
      contacts.forEach((c) => {
        if (c.$id) results.set(c.$id, null);
      });
      return results;
    }

    // Fetch all device contacts once
    let deviceContacts: Contacts.Contact[] = [];
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
        ],
      });
      deviceContacts = data;
    } catch (error) {
      console.error("Error fetching device contacts:", error);
      contacts.forEach((c) => {
        if (c.$id) results.set(c.$id, null);
      });
      return results;
    }

    // Match each ProfileContact to device contact and extract photo
    const photoPromises = contacts.map(async (contact) => {
      if (!contact.$id) return;

      // Check cache first
      const cached = this.cache.get(contact.$id);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        results.set(contact.$id, cached.uri);
        return;
      }

      // Find matching device contact
      const deviceContact = this.findMatchingDeviceContact(
        contact,
        deviceContacts
      );

      const photoUri = deviceContact?.image?.uri || null;

      // Update cache
      this.cache.set(contact.$id, {
        uri: photoUri,
        timestamp: Date.now(),
      });

      results.set(contact.$id, photoUri);
    });

    await Promise.all(photoPromises);

    return results;
  }

  /**
   * Clear all cached photos
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Find matching device contact by phone/email (using dedupeSignature logic)
   */
  private findMatchingDeviceContact(
    profileContact: ProfileContact,
    deviceContacts: Contacts.Contact[]
  ): Contacts.Contact | null {
    // Try to match by phone number first (most reliable)
    // phoneNumbers is a comma-separated string in ProfileContact
    if (profileContact.phoneNumbers) {
      const profilePhones = profileContact.phoneNumbers
        .split(",")
        .map((p) => this.normalizePhone(p.trim()))
        .filter((p) => p);

      for (const deviceContact of deviceContacts) {
        if (deviceContact.phoneNumbers) {
          for (const phoneData of deviceContact.phoneNumbers) {
            if (phoneData.number) {
              const devicePhone = this.normalizePhone(phoneData.number);
              if (profilePhones.includes(devicePhone)) {
                return deviceContact;
              }
            }
          }
        }
      }
    }

    // Fall back to email matching
    // emails is a comma-separated string in ProfileContact
    if (profileContact.emails) {
      const profileEmails = profileContact.emails
        .split(",")
        .map((e) => e.toLowerCase().trim())
        .filter((e) => e);

      for (const deviceContact of deviceContacts) {
        if (deviceContact.emails) {
          for (const emailData of deviceContact.emails) {
            if (emailData.email) {
              const deviceEmail = emailData.email.toLowerCase().trim();
              if (profileEmails.includes(deviceEmail)) {
                return deviceContact;
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Normalize phone number to digits only (matching dedupeSignature logic)
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  /**
   * Fetch photo from device for a single contact
   */
  private async fetchPhotoFromDevice(
    contact: ProfileContact
  ): Promise<string | null> {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        return null;
      }

      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
        ],
      });

      const matchedContact = this.findMatchingDeviceContact(
        contact,
        deviceContacts
      );

      return matchedContact?.image?.uri || null;
    } catch (error) {
      console.error("Error fetching photo from device:", error);
      return null;
    }
  }
}

// Export singleton instance
export const contactPhotosService = new ContactPhotosService();
