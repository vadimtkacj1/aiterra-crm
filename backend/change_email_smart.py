import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

def main(old_email, new_email):
    # Load environment variables from .env file in the same directory
    load_dotenv()
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Помилка: DATABASE_URL не знайдено в файлі .env")
        return
        
    print(f"Використовуємо базу даних за адресою: {db_url}")
    
    try:
        engine = create_engine(db_url)
        with engine.begin() as conn:
            tables_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = [r[0] for r in tables_res]
            
            total_replaced = 0
            for table in tables:
                try:
                    cols_res = conn.execute(text(f"PRAGMA table_info({table});"))
                    columns = [r[1] for r in cols_res]
                    for col in columns:
                        query = text(f"UPDATE {table} SET {col} = REPLACE(CAST({col} AS TEXT), :old, :new) WHERE CAST({col} AS TEXT) LIKE :like")
                        res = conn.execute(query, {"old": old_email, "new": new_email, "like": f"%{old_email}%"})
                        if res.rowcount > 0:
                            print(f"Оновлено {res.rowcount} запис(ів) у таблиці '{table}', колонка '{col}'.")
                            total_replaced += res.rowcount
                except Exception as e:
                    pass
                    
            if total_replaced > 0:
                print(f"Успішно замінено '{old_email}' на '{new_email}' у {total_replaced} місцях.")
            else:
                print(f"Пошту '{old_email}' не знайдено в жодній таблиці цієї бази.")
    except Exception as e:
        print(f"Помилка підключення до БД: {e}")

if __name__ == '__main__':
    if len(sys.argv) == 3:
        main(sys.argv[1], sys.argv[2])
    else:
        main('fair123142@gmail.com', 'office@neot-sade.com')
