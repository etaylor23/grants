import { IDBPDatabase } from "idb";
import {
  DynamoKey,
  PutItemInput,
  GetItemInput,
  DeleteItemInput,
  UpdateItemInput,
  QueryInput,
  TransactWriteInput,
  BatchWriteInput,
} from "../models/types";
import {
  GrantTrackerDB,
  initializeDB,
  addCompositeKey,
  removeCompositeKey,
  createCompositeKey,
} from "./schema";
import { createConditionParser } from "./condition-parser";

// Environment flag to toggle between local and AWS DynamoDB (for future use)
// const USE_LOCAL_DYNAMO = process.env.REACT_APP_USE_LOCAL_DYNAMO === "true";

// Table name mapping for IndexedDB stores
const TABLE_STORE_MAP: Record<string, keyof GrantTrackerDB> = {
  Workdays: "Workdays",
  TimeSlots: "TimeSlots",
  Personnel: "Personnel",
  Grants: "Grants",
};

// Get the appropriate store name for a table
const getStoreName = (
  tableName?: string
): "Workdays" | "TimeSlots" | "Personnel" | "Grants" => {
  if (!tableName || !TABLE_STORE_MAP[tableName]) {
    // Default logic: determine store based on PK pattern
    return "TimeSlots"; // Default fallback
  }
  return TABLE_STORE_MAP[tableName] as
    | "Workdays"
    | "TimeSlots"
    | "Personnel"
    | "Grants";
};

// Determine store name from PK pattern
const determineStoreFromPK = (
  PK: string
): "Workdays" | "TimeSlots" | "Personnel" | "Grants" => {
  if (PK === "PERSONNEL") return "Personnel";
  if (PK === "GRANTS") return "Grants";
  if (PK.startsWith("U-") || PK.startsWith("user")) {
    // Check SK to determine if it's workdays or timeslots
    return "TimeSlots"; // Default, will be refined in actual operations
  }
  return "TimeSlots";
};

// Determine store name from item structure
const determineStoreFromItem = (
  item: Record<string, any>
): "Workdays" | "TimeSlots" | "Personnel" | "Grants" => {
  if (item.PK === "PERSONNEL") return "Personnel";
  if (item.PK === "GRANTS") return "Grants";
  if (item.SK?.startsWith("WORKDAYS#")) return "Workdays";
  return "TimeSlots";
};

// Put item into IndexedDB
export async function putItem(
  input: PutItemInput,
  tableName?: string
): Promise<void> {
  const db = await initializeDB();
  const storeName = tableName
    ? getStoreName(tableName)
    : determineStoreFromItem(input.Item);

  // Validate condition expression if provided
  if (input.ConditionExpression) {
    const existingItem = await getItemInternal(
      { PK: input.Item.PK, SK: input.Item.SK },
      storeName,
      db
    );

    const parser = createConditionParser(
      input.ExpressionAttributeNames,
      input.ExpressionAttributeValues
    );

    if (
      existingItem &&
      !parser.evaluate(input.ConditionExpression, existingItem)
    ) {
      throw new Error(
        "ConditionalCheckFailedException: The conditional request failed"
      );
    }
  }

  const itemWithKey = addCompositeKey(input.Item as any);
  await db.put(storeName, itemWithKey);
}

// Get item from IndexedDB
export async function getItem(
  input: GetItemInput,
  tableName?: string
): Promise<Record<string, any> | null> {
  const db = await initializeDB();
  const storeName = tableName
    ? getStoreName(tableName)
    : determineStoreFromPK(input.Key.PK);

  return await getItemInternal(input.Key, storeName, db);
}

// Internal get item helper
async function getItemInternal(
  key: DynamoKey,
  storeName: "Workdays" | "TimeSlots" | "Personnel" | "Grants",
  db: IDBPDatabase<GrantTrackerDB>
): Promise<Record<string, any> | null> {
  const compositeKey = createCompositeKey(key.PK, key.SK);
  const item = await db.get(storeName, compositeKey);

  if (!item) return null;

  return removeCompositeKey(item as any);
}

// Delete item from IndexedDB
export async function deleteItem(
  input: DeleteItemInput,
  tableName?: string
): Promise<void> {
  const db = await initializeDB();
  const storeName = tableName
    ? getStoreName(tableName)
    : determineStoreFromPK(input.Key.PK);

  // Validate condition expression if provided
  if (input.ConditionExpression) {
    const existingItem = await getItemInternal(input.Key, storeName, db);

    if (!existingItem) {
      throw new Error(
        "ConditionalCheckFailedException: The conditional request failed"
      );
    }

    const parser = createConditionParser(
      input.ExpressionAttributeNames,
      input.ExpressionAttributeValues
    );

    if (!parser.evaluate(input.ConditionExpression, existingItem)) {
      throw new Error(
        "ConditionalCheckFailedException: The conditional request failed"
      );
    }
  }

  const compositeKey = createCompositeKey(input.Key.PK, input.Key.SK);
  await db.delete(storeName, compositeKey);
}

// Update item in IndexedDB
export async function updateItem(
  input: UpdateItemInput,
  tableName?: string
): Promise<void> {
  const db = await initializeDB();
  const storeName = tableName
    ? getStoreName(tableName)
    : determineStoreFromPK(input.Key.PK);

  // Get existing item
  const existingItem = await getItemInternal(input.Key, storeName, db);

  // Validate condition expression if provided
  if (input.ConditionExpression) {
    const parser = createConditionParser(
      input.ExpressionAttributeNames,
      input.ExpressionAttributeValues
    );

    if (
      !existingItem ||
      !parser.evaluate(input.ConditionExpression, existingItem)
    ) {
      throw new Error(
        "ConditionalCheckFailedException: The conditional request failed"
      );
    }
  }

  // Apply update expression (simplified implementation)
  const updatedItem = applyUpdateExpression(
    existingItem || { PK: input.Key.PK, SK: input.Key.SK },
    input.UpdateExpression,
    input.ExpressionAttributeNames,
    input.ExpressionAttributeValues
  );

  const itemWithKey = addCompositeKey(updatedItem as any);
  await db.put(storeName, itemWithKey as any);
}

// Apply update expression to item
function applyUpdateExpression(
  item: Record<string, any>,
  updateExpression: string,
  attributeNames?: Record<string, string>,
  attributeValues?: Record<string, any>
): Record<string, any> {
  const result = { ...item };

  // Simple SET operation parser
  const setMatch = updateExpression.match(/SET\s+(.+)/i);
  if (setMatch) {
    const setClause = setMatch[1];
    const assignments = setClause.split(",").map((s) => s.trim());

    for (const assignment of assignments) {
      const [left, right] = assignment.split("=").map((s) => s.trim());

      // Resolve attribute names
      let attributeName = left;
      if (attributeNames && left.startsWith("#")) {
        attributeName = attributeNames[left] || left;
      }

      // Resolve attribute values
      let value: any = right;
      if (attributeValues && right.startsWith(":")) {
        value = attributeValues[right];
      } else if (right.includes("+") || right.includes("-")) {
        // Handle arithmetic operations
        value = evaluateArithmetic(
          right,
          result,
          attributeNames,
          attributeValues
        );
      }

      result[attributeName] = value;
    }
  }

  return result;
}

// Evaluate arithmetic expressions in update operations
function evaluateArithmetic(
  expression: string,
  item: Record<string, any>,
  attributeNames?: Record<string, string>,
  attributeValues?: Record<string, any>
): number {
  // Simple arithmetic parser for expressions like "DailyTotal + :increment"
  const parts = expression.split(/([+\-])/).map((s) => s.trim());

  let result = 0;
  let operator = "+";

  for (const part of parts) {
    if (part === "+" || part === "-") {
      operator = part;
    } else {
      let value = 0;

      if (attributeValues && part.startsWith(":")) {
        value = attributeValues[part] || 0;
      } else if (attributeNames && part.startsWith("#")) {
        const attrName = attributeNames[part] || part;
        value = item[attrName] || 0;
      } else if (!isNaN(parseFloat(part))) {
        value = parseFloat(part);
      } else {
        value = item[part] || 0;
      }

      if (operator === "+") {
        result += value;
      } else {
        result -= value;
      }
    }
  }

  return result;
}

// Query items from IndexedDB
export async function query(
  input: QueryInput,
  tableName?: string
): Promise<{ Items: Record<string, any>[] }> {
  const db = await initializeDB();
  const storeName = tableName ? getStoreName(tableName) : "TimeSlots"; // Default to TimeSlots for most queries

  // Parse key condition expression
  const keyCondition = parseKeyConditionExpression(
    input.KeyConditionExpression,
    input.ExpressionAttributeNames,
    input.ExpressionAttributeValues
  );

  let items: any[] = [];

  if (keyCondition.type === "PK_ONLY") {
    // Query by PK only - use appropriate index based on store
    let indexName: string;
    if (storeName === "TimeSlots") indexName = "userTimeSlots";
    else if (storeName === "Workdays") indexName = "userWorkdays";
    else if (storeName === "Personnel") indexName = "allPersonnel";
    else if (storeName === "Grants") indexName = "allGrants";
    else indexName = "userTimeSlots"; // fallback

    const transaction = db.transaction(storeName);
    const store = transaction.store;

    // Check if the index exists, fallback to old names if needed
    let actualIndexName = indexName;
    if (!(store as any).indexNames.contains(indexName)) {
      // Fallback to old index names for backward compatibility
      if (
        indexName === "userTimeSlots" ||
        indexName === "userWorkdays" ||
        indexName === "allPersonnel" ||
        indexName === "allGrants"
      ) {
        actualIndexName = "byPK";
      }
    }

    const index = (store as any).index(actualIndexName);
    const cursor = await index.openCursor(keyCondition.PK);
    items = await getAllFromCursor(cursor);
  } else if (keyCondition.type === "PK_AND_SK_PREFIX") {
    // Query by PK and SK prefix (begins_with)
    if (storeName === "TimeSlots") {
      // Use userDateTimeSlots index for date-based queries
      const transaction = db.transaction(storeName);
      const store = transaction.store;

      // Check if the new index exists, fallback to old name if needed
      let dateIndexName = "userDateTimeSlots";
      if (!(store as any).indexNames.contains("userDateTimeSlots")) {
        dateIndexName = "byPKDate";
      }

      const range = IDBKeyRange.bound(
        [keyCondition.PK, keyCondition.SKPrefix],
        [keyCondition.PK, keyCondition.SKPrefix + "\uffff"]
      );
      const cursor = await (store as any)
        .index(dateIndexName)
        .openCursor(range);
      items = await getAllFromCursor(cursor);
    } else {
      // Fallback to PK index and filter
      let indexName: string;
      if (storeName === "Workdays") indexName = "userWorkdays";
      else if (storeName === "Personnel") indexName = "allPersonnel";
      else if (storeName === "Grants") indexName = "allGrants";
      else indexName = "userTimeSlots"; // fallback

      const transaction = db.transaction(storeName);
      const store = transaction.store;

      // Check if the index exists, fallback to old names if needed
      let actualIndexName = indexName;
      if (!(store as any).indexNames.contains(indexName)) {
        actualIndexName = "byPK";
      }

      const index = (store as any).index(actualIndexName);
      const cursor = await index.openCursor(keyCondition.PK);
      const allItems = await getAllFromCursor(cursor);
      items = allItems.filter((item) =>
        item.SK.startsWith(keyCondition.SKPrefix)
      );
    }
  } else if (keyCondition.type === "PK_AND_SK_EXACT") {
    // Exact PK and SK match
    const compositeKey = createCompositeKey(keyCondition.PK, keyCondition.SK!);
    const item = await db.get(storeName, compositeKey);
    items = item ? [item] : [];
  }

  // Apply filter expression if provided
  if (input.FilterExpression && items.length > 0) {
    const parser = createConditionParser(
      input.ExpressionAttributeNames,
      input.ExpressionAttributeValues
    );
    items = items.filter((item) =>
      parser.evaluate(input.FilterExpression!, item)
    );
  }

  // Apply limit
  if (input.Limit && items.length > input.Limit) {
    items = items.slice(0, input.Limit);
  }

  // Remove composite keys from results
  const cleanItems = items.map((item) => removeCompositeKey(item));

  return { Items: cleanItems };
}

// Helper to get all items from a cursor
async function getAllFromCursor(cursor: any): Promise<any[]> {
  const items: any[] = [];
  let currentCursor = cursor;

  while (currentCursor) {
    items.push(currentCursor.value);
    currentCursor = await currentCursor.continue();
  }

  return items;
}

// Parse key condition expression
function parseKeyConditionExpression(
  expression: string,
  attributeNames?: Record<string, string>,
  attributeValues?: Record<string, any>
): {
  type: "PK_ONLY" | "PK_AND_SK_PREFIX" | "PK_AND_SK_EXACT";
  PK: string;
  SK?: string;
  SKPrefix?: string;
} {
  // Replace attribute names and values
  let processedExpression = expression;

  if (attributeNames) {
    for (const [placeholder, actualName] of Object.entries(attributeNames)) {
      processedExpression = processedExpression.replace(
        new RegExp(placeholder.replace("#", "\\#"), "g"),
        actualName
      );
    }
  }

  if (attributeValues) {
    for (const [placeholder, actualValue] of Object.entries(attributeValues)) {
      processedExpression = processedExpression.replace(
        new RegExp(placeholder.replace(":", "\\:"), "g"),
        `"${actualValue}"`
      );
    }
  }

  // Parse different patterns

  // PK = :pk AND begins_with(SK, :prefix)
  const beginsWithMatch = processedExpression.match(
    /PK\s*=\s*"([^"]+)"\s+AND\s+begins_with\s*\(\s*SK\s*,\s*"([^"]+)"\s*\)/
  );
  if (beginsWithMatch) {
    return {
      type: "PK_AND_SK_PREFIX",
      PK: beginsWithMatch[1],
      SKPrefix: beginsWithMatch[2],
    };
  }

  // PK = :pk AND SK = :sk
  const exactMatch = processedExpression.match(
    /PK\s*=\s*"([^"]+)"\s+AND\s+SK\s*=\s*"([^"]+)"/
  );
  if (exactMatch) {
    return {
      type: "PK_AND_SK_EXACT",
      PK: exactMatch[1],
      SK: exactMatch[2],
    };
  }

  // PK = :pk only
  const pkOnlyMatch = processedExpression.match(/PK\s*=\s*"([^"]+)"/);
  if (pkOnlyMatch) {
    return {
      type: "PK_ONLY",
      PK: pkOnlyMatch[1],
    };
  }

  throw new Error(`Unsupported key condition expression: ${expression}`);
}

// Batch write operations
export async function batchWrite(input: BatchWriteInput): Promise<void> {
  const db = await initializeDB();

  // Process all batch operations
  for (const [tableName, requests] of Object.entries(input.RequestItems)) {
    const storeName = getStoreName(tableName);

    for (const request of requests) {
      if (request.PutRequest) {
        const itemWithKey = addCompositeKey(request.PutRequest.Item as any);
        await db.put(storeName, itemWithKey);
      } else if (request.DeleteRequest) {
        const compositeKey = createCompositeKey(
          request.DeleteRequest.Key.PK,
          request.DeleteRequest.Key.SK
        );
        await db.delete(storeName, compositeKey);
      }
    }
  }
}

// Transaction write operations
export async function transactWrite(input: TransactWriteInput): Promise<void> {
  const db = await initializeDB();

  // Validate all conditions first (simulate DynamoDB transaction behavior)
  const validationPromises = input.TransactItems.map(async (item) => {
    if (item.Put?.ConditionExpression) {
      const existingItem = await getItemInternal(
        { PK: item.Put.Item.PK, SK: item.Put.Item.SK },
        determineStoreFromItem(item.Put.Item),
        db
      );

      const parser = createConditionParser(
        item.Put.ExpressionAttributeNames,
        item.Put.ExpressionAttributeValues
      );

      if (
        existingItem &&
        !parser.evaluate(item.Put.ConditionExpression, existingItem)
      ) {
        throw new Error(
          "TransactionCanceledException: Transaction cancelled due to conditional check failure"
        );
      }
    }

    if (item.Update?.ConditionExpression) {
      const existingItem = await getItemInternal(
        item.Update.Key,
        determineStoreFromPK(item.Update.Key.PK),
        db
      );

      const parser = createConditionParser(
        item.Update.ExpressionAttributeNames,
        item.Update.ExpressionAttributeValues
      );

      if (
        !existingItem ||
        !parser.evaluate(item.Update.ConditionExpression, existingItem)
      ) {
        throw new Error(
          "TransactionCanceledException: Transaction cancelled due to conditional check failure"
        );
      }
    }

    if (item.Delete?.ConditionExpression) {
      const existingItem = await getItemInternal(
        item.Delete.Key,
        determineStoreFromPK(item.Delete.Key.PK),
        db
      );

      if (!existingItem) {
        throw new Error(
          "TransactionCanceledException: Transaction cancelled due to conditional check failure"
        );
      }

      const parser = createConditionParser(
        item.Delete.ExpressionAttributeNames,
        item.Delete.ExpressionAttributeValues
      );

      if (!parser.evaluate(item.Delete.ConditionExpression, existingItem)) {
        throw new Error(
          "TransactionCanceledException: Transaction cancelled due to conditional check failure"
        );
      }
    }
  });

  // Wait for all validations to complete
  await Promise.all(validationPromises);

  // Execute all operations (since IndexedDB doesn't support true transactions across stores,
  // we simulate it by executing all operations sequentially)
  for (const item of input.TransactItems) {
    if (item.Put) {
      const storeName = determineStoreFromItem(item.Put.Item);
      await putItem(item.Put, storeName);
    } else if (item.Update) {
      const storeName = determineStoreFromPK(item.Update.Key.PK);
      await updateItem(item.Update, storeName);
    } else if (item.Delete) {
      const storeName = determineStoreFromPK(item.Delete.Key.PK);
      await deleteItem(item.Delete, storeName);
    }
  }
}
