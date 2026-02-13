import { z } from 'zod';

/**
 * Base class for all tools.
 */
export class Tool {
  /**
   * @param {string} name - Unique name of the tool
   * @param {string} description - Description for the LLM
   * @param {z.ZodSchema} schema - Zod schema for arguments
   */
  constructor(name, description, schema) {
    this.name = name;
    this.description = description;
    this.schema = schema;
  }

  /**
   * Execute the tool.
   * @param {any} args - Arguments matching the schema
   * @returns {Promise<string>} - The output of the tool
   */
  async execute(args) {
    throw new Error("Not implemented");
  }
}
