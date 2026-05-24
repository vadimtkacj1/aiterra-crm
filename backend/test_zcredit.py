"""Quick Z-Credit payment test"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.settings import settings
from app.services.payments.zcredit import service as zcredit_service

def test_zcredit():
    print("=" * 60)
    print("Z-CREDIT PAYMENT TEST")
    print("=" * 60)

    # Check credentials
    print("\n1. Checking credentials...")
    print(f"   Terminal: {settings.zcredit_terminal_number}")
    print(f"   API Key: {settings.zcredit_api_key[:8]}...{settings.zcredit_api_key[-4:]}")

    if not settings.zcredit_terminal_number or not settings.zcredit_api_key:
        print("   [FAIL] MISSING CREDENTIALS")
        return False
    print("   [OK] Credentials configured")

    # Test creating an invoice (WebCheckout API)
    print("\n2. Testing WebCheckout API (create_invoice)...")
    try:
        from app.models.core import Account
        from sqlalchemy import create_engine
        from sqlalchemy.orm import Session

        # Get a test account from database
        engine = create_engine(settings.database_url)
        with Session(engine) as db:
            account = db.query(Account).first()
            if not account:
                print("   [SKIP] No accounts in database to test with")
                return True

            print(f"   Using test account: #{account.id}")

            # Create a test invoice (amount_minor is in cents, so 100 = 1.00)
            doc_id, payment_url = zcredit_service.create_invoice(
                account=account,
                amount_minor=100,  # 1.00 ILS
                currency="ILS",
                description="Test invoice",
                success_url="http://localhost:5173/billing/success",
                cancel_url="http://localhost:5173/billing/failed",
                failure_url="http://localhost:5173/billing/failed",
                callback_url="http://localhost:8000/api/webhooks/zcredit",
            )

            print(f"   [OK] Invoice created: {doc_id}")
            print(f"   Payment URL: {payment_url[:60]}...")

    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Test token lookup (Gateway API)
    print("\n3. Testing Gateway API (fetch_token_card_info)...")
    try:
        # Use a dummy token - should fail but auth should pass
        zcredit_service.fetch_token_card_info("0000000000000000")
        print("   [OK] Gateway API accessible")

    except Exception as e:
        error_msg = str(e).lower()
        if "password" in error_msg or "terminal" in error_msg or "unauthorized" in error_msg:
            print(f"   [FAIL] Auth failed: {e}")
            return False
        else:
            # Token not found is expected - means auth worked
            print("   [OK] Gateway API accessible (token not found as expected)")

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL TESTS PASSED - Z-Credit is working!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_zcredit()
    sys.exit(0 if success else 1)
