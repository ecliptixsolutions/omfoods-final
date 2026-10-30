// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const content=sqliteTable('content',{id:text('id').primaryKey(),value:text('value').notNull()});
export const users=sqliteTable('users',{id:text('id').primaryKey(),email:text('email').notNull().unique(),role:text('role').notNull()});
export const leads=sqliteTable('leads',{id:text('id').primaryKey(),value:text('value').notNull()});
export const audit=sqliteTable('audit',{id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),at:text('at').notNull()});
