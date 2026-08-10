/**
 * Supabase Client Configuration
 * Replaces MongoDB with Supabase (PostgreSQL)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

// Client for server-side operations (uses service_role key with bypass RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Client for client-side operations (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Product database operations
 */
export const ProductDB = {
  // Get all products with filters
  async find(filters = {}, options = {}) {
    let query = supabaseAdmin.from('products').select('*', { count: 'exact' });

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters.batch && filters.batch !== 'all') {
      query = query.eq('batch', filters.batch);
    }
    if (filters.is_pinned !== undefined) {
      if (filters.is_pinned === 'pinned') {
        query = query.eq('is_pinned', true);
      } else if (filters.is_pinned === 'unpinned') {
        query = query.eq('is_pinned', false);
      }
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    // Apply sorting
    if (options.sort) {
      const sortMapping = {
        'pinned_order': ['is_pinned desc', 'pinned_order asc', 'created_at desc'],
        'name': ['name asc'],
        'price': ['price desc'],
        'clicks': ['clicks desc'],
        'created_at': ['created_at desc']
      };
      
      const sortFields = sortMapping[options.sort] || sortMapping['pinned_order'];
      sortFields.forEach(field => {
        const [column, direction] = field.split(' ');
        query = query.order(column, { ascending: direction === 'asc' });
      });
    } else {
      query = query.order('is_pinned', { ascending: false })
                   .order('pinned_order', { ascending: true })
                   .order('created_at', { ascending: false });
    }

    // Apply pagination
    if (options.limit) {
      const from = ((options.page || 1) - 1) * options.limit;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return { data, count };
  },

  // Get single product by ID
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new product
  async create(productData) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update product
  async update(id, updates) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete product
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  // Delete multiple products
  async deleteMany(ids) {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
    return { deletedCount: ids.length };
  },

  // Update multiple products
  async updateMany(ids, updates) {
    const { error } = await supabaseAdmin
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids);
    
    if (error) throw error;
    return { modifiedCount: ids.length };
  },

  // Count documents
  async countDocuments(filters = {}) {
    let query = supabaseAdmin.from('products').select('*', { count: 'exact', head: true });

    if (filters.is_pinned !== undefined) {
      query = query.eq('is_pinned', filters.is_pinned);
    }

    const { count, error } = await query;
    
    if (error) throw error;
    return count;
  },

  // Find one with filter
  async findOne(filter) {
    let query = supabaseAdmin.from('products').select('*');

    Object.keys(filter).forEach(key => {
      query = query.eq(key, filter[key]);
    });

    const { data, error } = await query.limit(1).single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  }
};

export default supabaseAdmin;
