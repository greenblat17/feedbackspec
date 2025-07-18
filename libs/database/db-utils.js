import { createAuthenticatedSupabaseClient } from "../auth/server-auth.js";
import { 
  createDatabaseError, 
  createValidationError,
  logErrorToMonitoring 
} from "../errors/error-handler.js";
import { validateUUID, validatePagination } from "../validation/validators.js";

/**
 * Base database utility class with common operations
 */
export class DatabaseUtils {
  constructor() {
    this.supabase = null;
  }

  /**
   * Get Supabase client (lazy initialization)
   */
  getSupabase() {
    if (!this.supabase) {
      this.supabase = createAuthenticatedSupabaseClient();
    }
    return this.supabase;
  }

  /**
   * Execute a query with error handling
   */
  async executeQuery(query, context = "Database operation") {
    try {
      const result = await query;
      
      if (result.error) {
        await logErrorToMonitoring(result.error, context);
        throw createDatabaseError(`${context} failed`, result.error.message);
      }
      
      return result;
    } catch (error) {
      if (error.name === "AppError") {
        throw error; // Re-throw our custom errors
      }
      
      await logErrorToMonitoring(error, context);
      throw createDatabaseError(`${context} failed`, error.message);
    }
  }

  /**
   * Get a single record by ID with user authorization
   */
  async getById(table, id, userId, context = "Get record") {
    validateUUID(id, "Record ID");
    validateUUID(userId, "User ID");

    const supabase = this.getSupabase();
    const query = supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    const result = await this.executeQuery(query, context);
    
    if (!result.data) {
      throw createValidationError("Record not found or unauthorized");
    }
    
    return result.data;
  }

  /**
   * Get multiple records with pagination and filtering
   */
  async getMany(table, userId, options = {}, context = "Get records") {
    validateUUID(userId, "User ID");
    
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      filters = {},
      select = "*"
    } = options;

    // Validate pagination
    const paginationParams = validatePagination({ page, limit, sortBy, sortOrder });

    const supabase = this.getSupabase();
    let query = supabase
      .from(table)
      .select(select)
      .eq("user_id", userId);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply sorting and pagination
    query = query
      .order(paginationParams.sortBy, { ascending: paginationParams.sortOrder === "asc" })
      .range(paginationParams.offset, paginationParams.offset + paginationParams.limit - 1);

    const result = await this.executeQuery(query, context);
    
    return {
      data: result.data || [],
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total: result.count || 0,
        hasMore: (result.data || []).length === paginationParams.limit
      }
    };
  }

  /**
   * Create a new record
   */
  async create(table, data, context = "Create record") {
    if (!data.user_id) {
      throw createValidationError("User ID is required");
    }

    const supabase = this.getSupabase();
    const query = supabase
      .from(table)
      .insert([data])
      .select()
      .single();

    const result = await this.executeQuery(query, context);
    return result.data;
  }

  /**
   * Update a record by ID with user authorization
   */
  async update(table, id, userId, data, context = "Update record") {
    validateUUID(id, "Record ID");
    validateUUID(userId, "User ID");

    const supabase = this.getSupabase();
    const query = supabase
      .from(table)
      .update(data)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    const result = await this.executeQuery(query, context);
    
    if (!result.data) {
      throw createValidationError("Record not found or unauthorized");
    }
    
    return result.data;
  }

  /**
   * Delete a record by ID with user authorization
   */
  async delete(table, id, userId, context = "Delete record") {
    validateUUID(id, "Record ID");
    validateUUID(userId, "User ID");

    const supabase = this.getSupabase();
    const query = supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    await this.executeQuery(query, context);
    return { success: true };
  }

  /**
   * Count records with optional filters
   */
  async count(table, userId, filters = {}, context = "Count records") {
    validateUUID(userId, "User ID");

    const supabase = this.getSupabase();
    let query = supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const result = await this.executeQuery(query, context);
    return result.count || 0;
  }

  /**
   * Check if a record exists
   */
  async exists(table, id, userId, context = "Check record exists") {
    validateUUID(id, "Record ID");
    validateUUID(userId, "User ID");

    const supabase = this.getSupabase();
    const query = supabase
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    try {
      const result = await this.executeQuery(query, context);
      return !!result.data;
    } catch (error) {
      if (error.message.includes("not found")) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Batch create multiple records
   */
  async batchCreate(table, records, context = "Batch create records") {
    if (!Array.isArray(records) || records.length === 0) {
      throw createValidationError("Records array is required and cannot be empty");
    }

    // Validate all records have user_id
    records.forEach((record, index) => {
      if (!record.user_id) {
        throw createValidationError(`Record at index ${index} is missing user_id`);
      }
    });

    const supabase = this.getSupabase();
    const query = supabase
      .from(table)
      .insert(records)
      .select();

    const result = await this.executeQuery(query, context);
    return result.data || [];
  }

  /**
   * Batch update multiple records
   */
  async batchUpdate(table, updates, userId, context = "Batch update records") {
    validateUUID(userId, "User ID");
    
    if (!Array.isArray(updates) || updates.length === 0) {
      throw createValidationError("Updates array is required and cannot be empty");
    }

    // Validate all updates have id
    updates.forEach((update, index) => {
      if (!update.id) {
        throw createValidationError(`Update at index ${index} is missing id`);
      }
      validateUUID(update.id, `Update ${index} ID`);
    });

    const results = [];
    
    // Execute updates in parallel (be careful with rate limits)
    const updatePromises = updates.map(async (update) => {
      const { id, ...data } = update;
      return this.update(table, id, userId, data, `${context} - ID ${id}`);
    });

    const updateResults = await Promise.allSettled(updatePromises);
    
    updateResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error(`Batch update failed for record ${index}:`, result.reason);
        // Continue with other updates
      }
    });

    return results;
  }

  /**
   * Search records with text search
   */
  async search(table, userId, searchTerm, searchFields = [], options = {}, context = "Search records") {
    validateUUID(userId, "User ID");
    
    if (!searchTerm || typeof searchTerm !== "string") {
      throw createValidationError("Search term is required and must be a string");
    }

    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      filters = {}
    } = options;

    const paginationParams = validatePagination({ page, limit, sortBy, sortOrder });

    const supabase = this.getSupabase();
    let query = supabase
      .from(table)
      .select("*")
      .eq("user_id", userId);

    // Apply text search to specified fields
    if (searchFields.length > 0) {
      const searchConditions = searchFields.map(field => 
        `${field}.ilike.%${searchTerm}%`
      ).join(",");
      query = query.or(searchConditions);
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply sorting and pagination
    query = query
      .order(paginationParams.sortBy, { ascending: paginationParams.sortOrder === "asc" })
      .range(paginationParams.offset, paginationParams.offset + paginationParams.limit - 1);

    const result = await this.executeQuery(query, context);
    
    return {
      data: result.data || [],
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total: result.count || 0,
        hasMore: (result.data || []).length === paginationParams.limit
      },
      searchTerm,
      searchFields
    };
  }
}

/**
 * Specialized database utilities for feedback
 */
export class FeedbackDatabase extends DatabaseUtils {
  constructor() {
    super();
    this.table = "raw_feedback";
  }

  /**
   * Get all feedback for a user with enhanced formatting
   */
  async getAllForUser(userId, options = {}) {
    const result = await this.getMany(this.table, userId, options, "Get user feedback");
    
    // Transform to frontend format
    result.data = result.data.map(item => ({
      id: item.id,
      title: item.metadata?.title || "Untitled",
      content: item.content,
      source: item.platform || "unknown",
      priority: item.metadata?.priority || "medium",
      category: item.metadata?.category || "other",
      userEmail: item.metadata?.userEmail || null,
      tags: item.metadata?.tags || [],
      submittedAt: item.created_at,
      processed: item.processed,
      submittedBy: item.user_id,
      metadata: item.metadata,
      aiAnalysis: item.ai_analysis || null,
    }));

    return result;
  }

  /**
   * Get feedback by platform/source
   */
  async getBySource(userId, source, options = {}) {
    const filters = { platform: source };
    return this.getMany(this.table, userId, { ...options, filters }, "Get feedback by source");
  }

  /**
   * Get feedback by category
   */
  async getByCategory(userId, category, options = {}) {
    // Category is stored in metadata.category, need custom query
    const supabase = this.getSupabase();
    let query = supabase
      .from(this.table)
      .select("*")
      .eq("user_id", userId)
      .contains("metadata", { category });

    const result = await this.executeQuery(query, "Get feedback by category");
    return result.data || [];
  }

  /**
   * Get recent feedback
   */
  async getRecent(userId, limit = 10) {
    const options = {
      limit,
      sortBy: "created_at",
      sortOrder: "desc"
    };
    
    return this.getMany(this.table, userId, options, "Get recent feedback");
  }

  /**
   * Search feedback content
   */
  async searchContent(userId, searchTerm, options = {}) {
    return this.search(
      this.table, 
      userId, 
      searchTerm, 
      ["content", "metadata->title"], 
      options, 
      "Search feedback content"
    );
  }

  /**
   * Get feedback statistics
   */
  async getStats(userId) {
    const supabase = this.getSupabase();
    const query = supabase
      .from(this.table)
      .select("processed, platform, metadata, ai_analysis")
      .eq("user_id", userId);

    const result = await this.executeQuery(query, "Get feedback statistics");
    const data = result.data || [];

    return {
      total: data.length,
      processed: data.filter(item => item.processed).length,
      unprocessed: data.filter(item => !item.processed).length,
      bySource: data.reduce((acc, item) => {
        const source = item.platform || "unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}),
      byCategory: data.reduce((acc, item) => {
        const category = item.metadata?.category || "other";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
      aiAnalyzed: data.filter(item => item.ai_analysis).length,
      sentimentDistribution: data.reduce((acc, item) => {
        if (item.ai_analysis?.sentiment) {
          acc[item.ai_analysis.sentiment] = (acc[item.ai_analysis.sentiment] || 0) + 1;
        }
        return acc;
      }, {})
    };
  }
}

/**
 * Specialized database utilities for generated specs
 */
export class SpecDatabase extends DatabaseUtils {
  constructor() {
    super();
    this.table = "generated_specs";
  }

  /**
   * Get specs by cluster ID
   */
  async getByCluster(userId, clusterId, options = {}) {
    validateUUID(clusterId, "Cluster ID");
    const filters = { cluster_id: clusterId };
    return this.getMany(this.table, userId, { ...options, filters }, "Get specs by cluster");
  }

  /**
   * Get individual specs (no cluster)
   */
  async getIndividualSpecs(userId, options = {}) {
    const supabase = this.getSupabase();
    let query = supabase
      .from(this.table)
      .select("*")
      .eq("user_id", userId)
      .is("cluster_id", null);

    const result = await this.executeQuery(query, "Get individual specs");
    return result.data || [];
  }

  /**
   * Search specs by title and content
   */
  async searchSpecs(userId, searchTerm, options = {}) {
    return this.search(
      this.table, 
      userId, 
      searchTerm, 
      ["title", "content"], 
      options, 
      "Search specs"
    );
  }
}

/**
 * Factory functions for database utilities (to avoid initialization issues)
 */
export function createFeedbackDB() {
  return new FeedbackDatabase();
}

export function createSpecDB() {
  return new SpecDatabase();
}

export function createDBUtils() {
  return new DatabaseUtils();
}

/**
 * Singleton instances for easy access (lazy-loaded)
 */
let _feedbackDB = null;
let _specDB = null;
let _dbUtils = null;

export const feedbackDB = {
  get instance() {
    if (!_feedbackDB) {
      _feedbackDB = new FeedbackDatabase();
    }
    return _feedbackDB;
  }
};

export const specDB = {
  get instance() {
    if (!_specDB) {
      _specDB = new SpecDatabase();
    }
    return _specDB;
  }
};

export const dbUtils = {
  get instance() {
    if (!_dbUtils) {
      _dbUtils = new DatabaseUtils();
    }
    return _dbUtils;
  }
};