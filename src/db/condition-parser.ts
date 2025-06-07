import { ConditionExpression } from '../models/types';

// Simple condition expression parser for DynamoDB-like conditions
export class ConditionExpressionParser {
  private attributeNames: Record<string, string> = {};
  private attributeValues: Record<string, any> = {};

  constructor(
    attributeNames?: Record<string, string>,
    attributeValues?: Record<string, any>
  ) {
    this.attributeNames = attributeNames || {};
    this.attributeValues = attributeValues || {};
  }

  // Evaluate a condition expression against an item
  evaluate(expression: ConditionExpression, item: Record<string, any>): boolean {
    if (!expression) return true;

    // Replace attribute names and values
    let processedExpression = expression;
    
    // Replace attribute names (e.g., #attr -> actualAttributeName)
    for (const [placeholder, actualName] of Object.entries(this.attributeNames)) {
      processedExpression = processedExpression.replace(
        new RegExp(placeholder.replace('#', '\\#'), 'g'),
        actualName
      );
    }

    // Replace attribute values (e.g., :val -> actualValue)
    for (const [placeholder, actualValue] of Object.entries(this.attributeValues)) {
      processedExpression = processedExpression.replace(
        new RegExp(placeholder.replace(':', '\\:'), 'g'),
        JSON.stringify(actualValue)
      );
    }

    // Parse and evaluate common condition expressions
    return this.evaluateCondition(processedExpression, item);
  }

  private evaluateCondition(expression: string, item: Record<string, any>): boolean {
    // Handle attribute_exists
    const existsMatch = expression.match(/attribute_exists\s*\(\s*([^)]+)\s*\)/);
    if (existsMatch) {
      const attributeName = existsMatch[1].trim();
      return item[attributeName] !== undefined && item[attributeName] !== null;
    }

    // Handle attribute_not_exists
    const notExistsMatch = expression.match(/attribute_not_exists\s*\(\s*([^)]+)\s*\)/);
    if (notExistsMatch) {
      const attributeName = notExistsMatch[1].trim();
      return item[attributeName] === undefined || item[attributeName] === null;
    }

    // Handle numeric comparisons (e.g., DailyTotal + :d <= 100)
    const numericMatch = expression.match(/(\w+)\s*([+\-*/])\s*([^<>=!]+)\s*([<>=!]+)\s*([^<>=!]+)/);
    if (numericMatch) {
      const [, leftAttr, operator, rightOperand, comparison, threshold] = numericMatch;
      
      const leftValue = item[leftAttr] || 0;
      const rightValue = this.parseNumericValue(rightOperand.trim());
      const thresholdValue = this.parseNumericValue(threshold.trim());
      
      let result: number;
      switch (operator) {
        case '+':
          result = leftValue + rightValue;
          break;
        case '-':
          result = leftValue - rightValue;
          break;
        case '*':
          result = leftValue * rightValue;
          break;
        case '/':
          result = leftValue / rightValue;
          break;
        default:
          result = leftValue;
      }

      switch (comparison.trim()) {
        case '<=':
          return result <= thresholdValue;
        case '<':
          return result < thresholdValue;
        case '>=':
          return result >= thresholdValue;
        case '>':
          return result > thresholdValue;
        case '=':
        case '==':
          return result === thresholdValue;
        case '!=':
        case '<>':
          return result !== thresholdValue;
        default:
          return false;
      }
    }

    // Handle simple equality checks (e.g., attributeName = value)
    const equalityMatch = expression.match(/(\w+)\s*=\s*(.+)/);
    if (equalityMatch) {
      const [, attributeName, value] = equalityMatch;
      const expectedValue = this.parseValue(value.trim());
      return item[attributeName] === expectedValue;
    }

    // Handle simple inequality checks
    const inequalityMatch = expression.match(/(\w+)\s*(!=|<>)\s*(.+)/);
    if (inequalityMatch) {
      const [, attributeName, , value] = inequalityMatch;
      const expectedValue = this.parseValue(value.trim());
      return item[attributeName] !== expectedValue;
    }

    // Handle AND/OR logic (basic implementation)
    if (expression.includes(' AND ')) {
      const conditions = expression.split(' AND ');
      return conditions.every(condition => this.evaluateCondition(condition.trim(), item));
    }

    if (expression.includes(' OR ')) {
      const conditions = expression.split(' OR ');
      return conditions.some(condition => this.evaluateCondition(condition.trim(), item));
    }

    // Default: if we can't parse the expression, return true (allow operation)
    console.warn(`Unsupported condition expression: ${expression}`);
    return true;
  }

  private parseNumericValue(value: string): number {
    // Remove quotes if present
    const cleanValue = value.replace(/['"]/g, '');
    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? 0 : numValue;
  }

  private parseValue(value: string): any {
    // Remove quotes for string values
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Try to parse as number
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return numValue;
    }

    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Return as string
    return value;
  }
}

// Helper function to create condition parser
export const createConditionParser = (
  attributeNames?: Record<string, string>,
  attributeValues?: Record<string, any>
): ConditionExpressionParser => {
  return new ConditionExpressionParser(attributeNames, attributeValues);
};
