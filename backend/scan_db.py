import sqlite3
import sys

def main():
    conn = sqlite3.connect('backend/app.db')
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in c.fetchall()]
    
    found = False
    for table in tables:
        try:
            c.execute(f"PRAGMA table_info({table});")
            columns = [col[1] for col in c.fetchall()]
            for col in columns:
                query = f"SELECT * FROM {table} WHERE CAST({col} AS TEXT) LIKE '%fair123142@gmail.com%';"
                c.execute(query)
                res = c.fetchall()
                if res:
                    print(f"Found in table '{table}', column '{col}': {res}")
                    found = True
        except Exception as e:
            print(f"Error scanning {table}: {e}")
            
    if not found:
        print("Email not found in any table.")

if __name__ == '__main__':
    main()
