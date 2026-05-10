import sqlite3

def main():
    conn = sqlite3.connect('backend/app.db')
    c = conn.cursor()
    c.execute('SELECT id, title, signed_copy_email, signer_name FROM contracts')
    rows = c.fetchall()
    with open('backend/contracts_dump.txt', 'w', encoding='utf-8') as f:
        for row in rows:
            f.write(str(row) + '\n')

if __name__ == '__main__':
    main()
