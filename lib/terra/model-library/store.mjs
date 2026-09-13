import {validateRecipe} from './library.mjs';
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export const queryKey=q=>digest(q.toLowerCase().trim().replace(/\s+/g,' '));
const terms=q=>[...new Set(q.toLowerCase().match(/[a-z]{3,30}/g)??[])].filter(t=>!['the','how','does','what','with','this','that','explain','show','model','could','would','please','into'].includes(t)).slice(0,8);
export function createD1ModelStore(db){
 if(!db)return null;
 const read=row=>row?{id:row.id,recipe:{...validateRecipe(JSON.parse(row.recipe)),id:row.id},provenance:JSON.parse(row.provenance)}:null;
 return {
 async get(id){return read(await db.prepare('SELECT id,recipe,provenance FROM model_recipes WHERE id=?').bind(id).first());},
 async find(query){return read(await db.prepare('SELECT r.id,r.recipe,r.provenance FROM model_queries q JOIN model_recipes r ON r.id=q.model_id WHERE q.query_hash=?').bind(await queryKey(query)).first());},
 async candidates(query){const words=terms(query);if(!words.length)return [];const {results}=await db.prepare(`SELECT r.id,r.title,r.hint,COUNT(*) AS score FROM model_terms t JOIN model_recipes r ON r.id=t.model_id WHERE t.term IN (${words.map(()=>'?').join(',')}) GROUP BY r.id ORDER BY score DESC,r.id LIMIT 8`).bind(...words).all();return results.map(({id,title,hint})=>({id,title,hint}));},
 async list(){const {results}=await db.prepare('SELECT id,title,hint FROM model_recipes ORDER BY created_at DESC,id LIMIT 50').all();return results;},
 async save(query,raw,provenance,signal){const recipe=validateRecipe(raw),id='generated-'+(await digest(JSON.stringify(recipe))).slice(0,20),key=await queryKey(query),hint=[...new Set(recipe.parts.map(p=>p.label))].join(', ').slice(0,500);signal?.throwIfAborted();
 const statements=[db.prepare('INSERT OR IGNORE INTO model_recipes(id,title,hint,recipe,provenance) VALUES(?,?,?,?,?)').bind(id,recipe.title,hint,JSON.stringify(recipe),JSON.stringify(provenance)),db.prepare('INSERT INTO model_queries(query_hash,model_id) VALUES(?,?) ON CONFLICT(query_hash) DO UPDATE SET model_id=excluded.model_id').bind(key,id),...terms(recipe.title+' '+hint).map(term=>db.prepare('INSERT OR IGNORE INTO model_terms(term,model_id) VALUES(?,?)').bind(term,id))];
 await db.batch(statements);return {...recipe,id};
 },
 async alias(query,id,signal){signal?.throwIfAborted();await db.prepare('INSERT INTO model_queries(query_hash,model_id) VALUES(?,?) ON CONFLICT(query_hash) DO UPDATE SET model_id=excluded.model_id').bind(await queryKey(query),id).run();}
 };
}
