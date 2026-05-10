import sqlite3

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
                query = f"SELECT * FROM {table} WHERE CAST({col} AS TEXT) LIKE '%fair123142%';"
                c.execute(query)
                res = c.fetchall()
                if res:
                    print(f"Found in table '{table}', column '{col}': {res}")
                    found = True
        except Exception as e:
            pass
            
    if not found:
        print("Not found.")

if __name__ == '__main__':
    main()
