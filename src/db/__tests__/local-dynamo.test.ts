import {
  putItem,
  getItem,
  deleteItem,
  updateItem,
  query,
  transactWrite,
} from "../local-dynamo";
import { initializeDB, closeDB } from "../schema";
import {
  DynamoWorkdayItem,
  DynamoTimeSlotItem,
  DynamoPersonnelItem,
  DynamoGrantItem,
} from "../../models/types";

// Mock IndexedDB for testing
import "fake-indexeddb/auto";

// Polyfill for structuredClone in test environment
if (!global.structuredClone) {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

describe("Local DynamoDB Facade", () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    await initializeDB();
  });

  afterEach(async () => {
    // Clean up after each test
    await closeDB();
  });

  describe("Basic CRUD Operations", () => {
    it("should put and get an item successfully", async () => {
      const testItem: DynamoWorkdayItem = {
        PK: "user1",
        SK: "WORKDAYS#2024",
        Workdays: {
          "2024-01-15": true,
          "2024-01-16": true,
        },
      };

      // Put item
      await putItem({ Item: testItem }, "Workdays");

      // Get item
      const result = await getItem(
        {
          Key: { PK: "user1", SK: "WORKDAYS#2024" },
        },
        "Workdays"
      );

      expect(result).toEqual(testItem);
    });

    it("should return null for non-existent item", async () => {
      const result = await getItem(
        {
          Key: { PK: "nonexistent", SK: "WORKDAYS#2024" },
        },
        "Workdays"
      );

      expect(result).toBeNull();
    });

    it("should delete an item successfully", async () => {
      const testItem: DynamoTimeSlotItem = {
        PK: "user1",
        SK: "2024-01-15#grant1",
        AllocationPercent: 50,
        TotalHours: 8.0,
      };

      // Put item
      await putItem({ Item: testItem }, "TimeSlots");

      // Verify it exists
      let result = await getItem(
        {
          Key: { PK: "user1", SK: "2024-01-15#grant1" },
        },
        "TimeSlots"
      );
      expect(result).toEqual(testItem);

      // Delete item
      await deleteItem(
        {
          Key: { PK: "user1", SK: "2024-01-15#grant1" },
        },
        "TimeSlots"
      );

      // Verify it's gone
      result = await getItem(
        {
          Key: { PK: "user1", SK: "2024-01-15#grant1" },
        },
        "TimeSlots"
      );
      expect(result).toBeNull();
    });
  });

  describe("Update Operations", () => {
    it("should update an item with SET expression", async () => {
      const testItem: DynamoPersonnelItem = {
        PK: "PERSONNEL",
        SK: "person1",
        FirstName: "John",
        LastName: "Doe",
        AnnualGrossSalary: 50000,
        Pension: 5000,
        NationalInsurance: 3000,
      };

      // Put initial item
      await putItem({ Item: testItem }, "Personnel");

      // Update salary
      await updateItem(
        {
          Key: { PK: "PERSONNEL", SK: "person1" },
          UpdateExpression: "SET AnnualGrossSalary = :salary",
          ExpressionAttributeValues: {
            ":salary": 60000,
          },
        },
        "Personnel"
      );

      // Verify update
      const result = await getItem(
        {
          Key: { PK: "PERSONNEL", SK: "person1" },
        },
        "Personnel"
      );

      expect(result?.AnnualGrossSalary).toBe(60000);
      expect(result?.FirstName).toBe("John"); // Other fields unchanged
    });
  });

  describe("Query Operations", () => {
    beforeEach(async () => {
      // Set up test data
      const timeSlots: DynamoTimeSlotItem[] = [
        {
          PK: "user1",
          SK: "2024-01-15#grant1",
          AllocationPercent: 40,
          TotalHours: 8.0,
        },
        {
          PK: "user1",
          SK: "2024-01-15#grant2",
          AllocationPercent: 30,
          TotalHours: 8.0,
        },
        {
          PK: "user1",
          SK: "2024-01-16#grant1",
          AllocationPercent: 50,
          TotalHours: 7.5,
        },
        {
          PK: "user2",
          SK: "2024-01-15#grant1",
          AllocationPercent: 60,
          TotalHours: 8.5,
        },
      ];

      for (const slot of timeSlots) {
        await putItem({ Item: slot }, "TimeSlots");
      }
    });

    it("should query by PK only", async () => {
      const result = await query(
        {
          KeyConditionExpression: "PK = :userId",
          ExpressionAttributeValues: {
            ":userId": "user1",
          },
        },
        "TimeSlots"
      );

      expect(result.Items).toHaveLength(3);
      expect(result.Items.every((item) => item.PK === "user1")).toBe(true);
    });

    it("should query with begins_with condition", async () => {
      const result = await query(
        {
          KeyConditionExpression:
            "PK = :userId AND begins_with(SK, :datePrefix)",
          ExpressionAttributeValues: {
            ":userId": "user1",
            ":datePrefix": "2024-01-15",
          },
        },
        "TimeSlots"
      );

      expect(result.Items).toHaveLength(2);
      expect(
        result.Items.every(
          (item) => item.PK === "user1" && item.SK.startsWith("2024-01-15")
        )
      ).toBe(true);
    });
  });

  describe("Condition Expressions", () => {
    it("should enforce attribute_not_exists condition", async () => {
      const testItem: DynamoGrantItem = {
        PK: "GRANTS",
        SK: "grant1",
        Name: "Test Grant",
        Color: "#ff0000",
        Description: "Test description",
      };

      // First put should succeed
      await putItem(
        {
          Item: testItem,
          ConditionExpression: "attribute_not_exists(PK)",
        },
        "Grants"
      );

      // Second put should fail
      await expect(
        putItem(
          {
            Item: testItem,
            ConditionExpression: "attribute_not_exists(PK)",
          },
          "Grants"
        )
      ).rejects.toThrow("ConditionalCheckFailedException");
    });

    it("should enforce attribute_exists condition", async () => {
      // Delete should fail if item doesn't exist
      await expect(
        deleteItem(
          {
            Key: { PK: "GRANTS", SK: "nonexistent" },
            ConditionExpression: "attribute_exists(PK)",
          },
          "Grants"
        )
      ).rejects.toThrow("ConditionalCheckFailedException");
    });
  });

  describe("Transaction Operations", () => {
    it("should execute multiple operations in a transaction", async () => {
      const workdayItem: DynamoWorkdayItem = {
        PK: "user1",
        SK: "WORKDAYS#2024",
        Workdays: { "2024-01-15": true },
      };

      const timeSlotItem: DynamoTimeSlotItem = {
        PK: "user1",
        SK: "2024-01-15#grant1",
        AllocationPercent: 100,
        TotalHours: 8.0,
      };

      // Execute transaction - remove condition expressions since items don't exist yet
      await transactWrite({
        TransactItems: [
          {
            Put: {
              Item: workdayItem,
            },
          },
          {
            Put: {
              Item: timeSlotItem,
            },
          },
        ],
      });

      // Verify both items were created
      const workdayResult = await getItem(
        {
          Key: { PK: "user1", SK: "WORKDAYS#2024" },
        },
        "Workdays"
      );
      const timeSlotResult = await getItem(
        {
          Key: { PK: "user1", SK: "2024-01-15#grant1" },
        },
        "TimeSlots"
      );

      expect(workdayResult).toEqual(workdayItem);
      expect(timeSlotResult).toEqual(timeSlotItem);
    });

    it("should rollback transaction on condition failure", async () => {
      // Put an item first
      const existingItem: DynamoGrantItem = {
        PK: "GRANTS",
        SK: "grant1",
        Name: "Existing Grant",
        Color: "#ff0000",
        Description: "Existing",
      };
      await putItem({ Item: existingItem }, "Grants");

      // Try transaction that should fail
      await expect(
        transactWrite({
          TransactItems: [
            {
              Put: {
                Item: {
                  PK: "GRANTS",
                  SK: "grant2",
                  Name: "New Grant",
                  Color: "#00ff00",
                  Description: "New",
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Put: {
                Item: existingItem,
                ConditionExpression: "attribute_not_exists(PK)", // This should fail
              },
            },
          ],
        })
      ).rejects.toThrow("TransactionCanceledException");

      // Verify no new items were created
      const result = await getItem(
        {
          Key: { PK: "GRANTS", SK: "grant2" },
        },
        "Grants"
      );
      expect(result).toBeNull();
    });
  });
});
