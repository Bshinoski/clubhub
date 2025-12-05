#!/usr/bin/env python3
"""
Fix existing balances after reversing charge/credit logic.
This script multiplies all balances by -1 to flip them.
"""

import sqlite3

def fix_balances():
    conn = sqlite3.connect('clubhub.db')
    cursor = conn.cursor()

    # Flip all balances
    cursor.execute("UPDATE group_members SET balance = -balance WHERE balance != 0")

    # Get the count of updated rows
    updated_count = cursor.rowcount

    conn.commit()
    conn.close()

    print(f"Successfully flipped {updated_count} member balances")

if __name__ == "__main__":
    fix_balances()
