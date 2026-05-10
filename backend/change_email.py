import sqlite3
import sys

def global_replace_email(old_email, new_email, db_path='app.db'):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in c.fetchall()]
    
    total_replaced = 0
    for table in tables:
        try:
            c.execute(f"PRAGMA table_info({table});")
            columns = [col[1] for col in c.fetchall()]
            for col in columns:
                # We do a direct update. If the column doesn't contain the email, 0 rows affected.
                query = f"UPDATE {table} SET {col} = REPLACE(CAST({col} AS TEXT), ?, ?) WHERE CAST({col} AS TEXT) LIKE ?;"
                c.execute(query, (old_email, new_email, f'%{old_email}%'))
                if c.rowcount > 0:
                    print(f"Updated {c.rowcount} row(s) in table '{table}', column '{col}'.")
                    total_replaced += c.rowcount
        except Exception as e:
            pass
            
    conn.commit()
    if total_replaced > 0:
        print(f"Successfully replaced '{old_email}' with '{new_email}' in {total_replaced} places.")
    else:
        print(f"Email '{old_email}' was not found anywhere in the database.")

if __name__ == '__main__':
    if len(sys.argv) == 3:
        global_replace_email(sys.argv[1], sys.argv[2])
    else:
        # Default fallback
        global_replace_email('fair123142@gmail.com', 'office@neot-sade.com')
