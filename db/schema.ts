import {sql} from 'drizzle-orm';
import {sqliteTable,text,primaryKey} from 'drizzle-orm/sqlite-core';
export const modelRecipes=sqliteTable('model_recipes',{
 id:text('id').primaryKey(),title:text('title').notNull(),hint:text('hint').notNull(),recipe:text('recipe').notNull(),provenance:text('provenance').notNull(),createdAt:text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const modelQueries=sqliteTable('model_queries',{queryHash:text('query_hash').primaryKey(),modelId:text('model_id').notNull().references(()=>modelRecipes.id)});
export const modelTerms=sqliteTable('model_terms',{term:text('term').notNull(),modelId:text('model_id').notNull().references(()=>modelRecipes.id)},table=>[primaryKey({columns:[table.term,table.modelId]})]);
