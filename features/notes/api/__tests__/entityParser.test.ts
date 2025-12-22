import { extractEntitiesHybrid } from "../hybridEntityExtraction.service";

describe("Entity Parser", () => {
  test("extracts people names", () => {
    const text = "Had lunch with John Smith and Sarah Johnson today.";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.people.length).toBeGreaterThan(0);
    expect(result.structured.people.some((p) => p.value.includes("John"))).toBe(
      true
    );
  });

  test("extracts dates", () => {
    const text = "Let's meet next Tuesday at 3pm for coffee.";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.dates.length).toBeGreaterThan(0);
    const date = result.structured.dates[0];
    expect(date.metadata?.isRelative).toBe(true);
    expect(date.metadata?.isFuture).toBe(true);
  });

  test("extracts companies", () => {
    const text = "Meeting with Microsoft and Google representatives.";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.companies.length).toBeGreaterThan(0);
  });

  test("extracts commitments", () => {
    const text = "I'll call you back tomorrow to discuss the proposal.";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.commitments.length).toBeGreaterThan(0);
    const commitment = result.structured.commitments[0];
    expect(commitment.metadata?.direction).toBe("outbound");
    expect(commitment.metadata?.actionVerb).toBe("call");
  });

  test("extracts relationship signals", () => {
    const text = "My boss wants to meet about the project.";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.relationshipSignals.length).toBeGreaterThan(0);
    const signal = result.structured.relationshipSignals[0];
    expect(signal.metadata?.signalType).toBe("professional");
    expect(signal.value).toBe("boss");
  });

  test("extracts phone numbers", () => {
    const text = "Call me at 555-123-4567 or 555.987.6543";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.contacts.length).toBe(2);
    expect(
      result.structured.contacts.every((c) => c.type === "phone")
    ).toBe(true);
  });

  test("extracts email addresses", () => {
    const text = "Email john@example.com or sarah@company.org";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.contacts.length).toBe(2);
    expect(
      result.structured.contacts.every((c) => c.type === "email")
    ).toBe(true);
  });

  test("links dates to commitments", () => {
    const text = "I'll follow up with them next Friday about the contract.";
    const result = extractEntitiesHybrid(text);

    expect(result.structured.commitments.length).toBeGreaterThan(0);
    expect(result.structured.dates.length).toBeGreaterThan(0);

    const commitment = result.structured.commitments.find(
      (c) => c.metadata?.linkedDate
    );
    expect(commitment).toBeDefined();
  });

  test("complex note with multiple entity types", () => {
    const text =
      "Met with Sarah Johnson from Microsoft yesterday. She's my mentor and promised to introduce me to the CEO. We'll meet again next Tuesday at their San Francisco office. I need to call her at 555-123-4567 before then.";

    const result = extractEntitiesHybrid(text);

    expect(result.structured.people.length).toBeGreaterThan(0);
    expect(result.structured.companies.length).toBeGreaterThan(0);
    expect(result.structured.dates.length).toBeGreaterThan(0);
    expect(result.structured.locations.length).toBeGreaterThan(0);
    expect(result.structured.commitments.length).toBeGreaterThan(0);
    expect(result.structured.relationshipSignals.length).toBeGreaterThan(0);
    expect(result.structured.contacts.length).toBeGreaterThan(0);

    expect(result.metadata.totalCount).toBeGreaterThan(5);
    expect(result.metadata.deterministicCount).toBe(result.metadata.totalCount);
  });

  test("merges AI and deterministic entities", () => {
    const text = "Meeting with the client about the project timeline.";
    const aiEntities = ["project budget", "Q4 deadline"];

    const result = extractEntitiesHybrid(text, aiEntities);

    expect(result.structured.other.length).toBe(2);
    expect(result.metadata.aiCount).toBe(2);
    expect(result.metadata.deterministicCount).toBeGreaterThan(0);
  });

  test("deduplicates AI entities that match deterministic", () => {
    const text = "Meeting with John Smith tomorrow.";
    const aiEntities = ["john smith", "tomorrow"]; // Duplicates

    const result = extractEntitiesHybrid(text, aiEntities);

    // AI entities should be filtered out as duplicates
    expect(result.structured.other.length).toBe(0);
    expect(result.metadata.aiCount).toBe(0);
  });
});
