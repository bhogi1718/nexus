import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  }
});

// Table names
export const TABLES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || 'nexus-users',
  MESSAGES: process.env.DYNAMODB_MESSAGES_TABLE || 'nexus-messages',
  CONVERSATIONS: process.env.DYNAMODB_CONVERSATIONS_TABLE || 'nexus-conversations',
  OTPS: process.env.DYNAMODB_OTPS_TABLE || 'nexus-otps'
};

// Helper functions for common operations
export const db = {
  // Get single item
  get: async (tableName, key) => {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: key
      }));
      return result.Item || null;
    } catch (error) {
      console.error(`Error getting item from ${tableName}:`, error);
      throw error;
    }
  },

  // Put item
  put: async (tableName, item) => {
    try {
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: item
      }));
      return item;
    } catch (error) {
      console.error(`Error putting item to ${tableName}:`, error);
      throw error;
    }
  },

  // Update item
  update: async (tableName, key, updates) => {
    try {
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.entries(updates).forEach(([field, value], idx) => {
        const fieldName = `#f${idx}`;
        const valueName = `:v${idx}`;
        updateExpressions.push(`${fieldName} = ${valueName}`);
        expressionAttributeNames[fieldName] = field;
        expressionAttributeValues[valueName] = value;
      });

      const result = await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));

      return result.Attributes;
    } catch (error) {
      console.error(`Error updating item in ${tableName}:`, error);
      throw error;
    }
  },

  // Query items
  query: async (tableName, keyConditionExpression, expressionAttributeNames = {}, expressionAttributeValues = {}, indexName = null) => {
    try {
      const params = {
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression
      };

      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      if (Object.keys(expressionAttributeValues).length > 0) {
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      if (indexName) {
        params.IndexName = indexName;
      }

      const result = await docClient.send(new QueryCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error(`Error querying ${tableName}:`, error);
      throw error;
    }
  },

  // Scan items
  scan: async (tableName, filterExpression = null, expressionAttributeNames = {}, expressionAttributeValues = {}) => {
    try {
      const params = {
        TableName: tableName
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeNames = expressionAttributeNames;
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      const result = await docClient.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error(`Error scanning ${tableName}:`, error);
      throw error;
    }
  },

  // Delete item
  delete: async (tableName, key) => {
    try {
      await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: key
      }));
      return true;
    } catch (error) {
      console.error(`Error deleting item from ${tableName}:`, error);
      throw error;
    }
  },

  // Batch get items
  batchGet: async (tableName, keys) => {
    try {
      const result = await docClient.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys
          }
        }
      }));
      return result.Responses[tableName] || [];
    } catch (error) {
      console.error(`Error batch getting items from ${tableName}:`, error);
      throw error;
    }
  }
};

export default db;
