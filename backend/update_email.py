import sqlite3

def update_email_fuzzy(old_email_part, new_email):
    conn = sqlite3.connect('backend/app.db')
    c = conn.cursor()
    
    users_updated = 0
    contracts_updated = 0
    
    # Check users
    c.execute("SELECT id, email FROM users WHERE email LIKE ?", (f'%{old_email_part}%',))
    for row in c.fetchall():
        uid = row[0]
        c.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, uid))
        users_updated += 1

    # Check contracts
    c.execute("SELECT id, signed_copy_email FROM contracts WHERE signed_copy_email LIKE ?", (f'%{old_email_part}%',))
    for row in c.fetchall():
        cid = row[0]
        c.execute("UPDATE contracts SET signed_copy_email = ? WHERE id = ?", (new_email, cid))
        contracts_updated += 1
        
    conn.commit()
    return users_updated, contracts_updated

if __name__ == '__main__':
    u, c = update_email_fuzzy('fair123142', 'office@neot-sade.com')
    print(f"Updated {u} user(s).")
    print(f"Updated {c} contract(s).")
