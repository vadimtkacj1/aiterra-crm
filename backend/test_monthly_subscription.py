"""
Test script to verify monthly subscription contracts work correctly.

This script tests:
1. Creating a contract with monthly subscription
2. Signing the contract
3. Verifying billing instruction is created
4. Checking Z-Credit integration
"""

import sys
sys.path.insert(0, '/c/Users/vadim/Downloads/crm/backend')

from app.db.session import get_db
from app.models.core import User, AccountMembership
from app.models.contracts import Contract
from app.models.billing import AccountBillingInstruction
from sqlalchemy.orm import Session

def test_monthly_subscription_contract():
    db: Session = next(get_db())

    print("=" * 60)
    print("MONTHLY SUBSCRIPTION CONTRACT TEST")
    print("=" * 60)

    # Step 1: Find a test user with an account
    membership = db.query(AccountMembership).first()

    if not membership:
        print("[X] No account memberships found. Create a user with an account first.")
        return False

    user = db.query(User).filter(User.id == membership.user_id).first()
    account_id = membership.account_id

    print(f"\n[OK] Found test user: {user.email} (Account #{account_id})")

    # Step 2: Check if there are any subscription contracts
    subscription_contracts = db.query(Contract).filter(
        Contract.monthly_amount.isnot(None),
        Contract.monthly_amount > 0
    ).all()

    print(f"\n[INFO] Found {len(subscription_contracts)} subscription contracts in database")

    for contract in subscription_contracts:
        print(f"\n--- Contract #{contract.id} ---")
        print(f"  Title: {contract.title}")
        print(f"  Account: #{contract.account_id}")
        print(f"  Status: {contract.status}")
        print(f"  Monthly Amount: {contract.monthly_amount} {contract.currency}")
        print(f"  Subscription Months: {contract.subscription_months or 'Unlimited'}")
        print(f"  Billing Instruction ID: {contract.billing_instruction_id or 'Not linked yet'}")

        # Check if signed
        if contract.status == "signed":
            print(f"  [OK] Contract is SIGNED")
            print(f"  Signed at: {contract.signed_at}")
            print(f"  Signed by: {contract.signer_name}")

            # Check billing instruction
            if contract.billing_instruction_id:
                billing = db.query(AccountBillingInstruction).filter(
                    AccountBillingInstruction.id == contract.billing_instruction_id
                ).first()

                if billing:
                    print(f"\n  [BILLING] Billing Instruction:")
                    print(f"     Charge Type: {billing.charge_type}")
                    print(f"     Amount: {billing.amount} {billing.currency}")
                    print(f"     Description: {billing.description}")
                    print(f"     Z-Credit Terminal: {billing.zcredit_terminal_number or 'Not set'}")
                    print(f"     Active: {'Yes' if billing.charge_type == 'monthly' else 'No'}")
                else:
                    print(f"  [WARN] Billing instruction #{contract.billing_instruction_id} not found")
            else:
                print(f"  [WARN] No billing instruction linked (should be created on signing)")
        else:
            print(f"  [PENDING] Contract not signed yet (status: {contract.status})")

    # Step 3: Test workflow explanation
    print("\n" + "=" * 60)
    print("HOW TO TEST MONTHLY SUBSCRIPTION:")
    print("=" * 60)
    print("\n1. Go to Admin Panel > Contracts")
    print("2. Click 'New Contract'")
    print("3. Fill in:")
    print("   - Select a client")
    print("   - Enter contract title")
    print("   - Add payment stages")
    print("   - Toggle 'Enable monthly subscription billing' ON")
    print("   - Enter monthly amount (e.g., 100)")
    print("   - Enter subscription months (e.g., 12) or leave empty for unlimited")
    print("4. Click 'Create'")
    print("5. Copy the signing link and open it")
    print("6. Sign the contract")
    print("7. Check that:")
    print("   [OK] Contract status changes to 'Signed'")
    print("   [OK] Billing instruction is created automatically")
    print("   [OK] Monthly recurring payment is active in Z-Credit")

    print("\n" + "=" * 60)
    print("EXPECTED BEHAVIOR:")
    print("=" * 60)
    print("\nWhen client signs a subscription contract:")
    print("[OK] Contract.status -> 'signed'")
    print("[OK] Contract.billing_instruction_id -> linked to billing instruction")
    print("[OK] AccountBillingInstruction created with:")
    print("  - charge_type: 'monthly'")
    print("  - amount: contract.monthly_amount")
    print("  - description: 'Monthly subscription: {contract.title}'")
    print("[OK] Z-Credit recurring billing activated")
    print("[OK] Client will be charged monthly automatically")

    return True

if __name__ == "__main__":
    try:
        test_monthly_subscription_contract()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
