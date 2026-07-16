import hashlib
import json
import os
from web3 import Web3

POLYGON_RPC_URL = os.environ.get("POLYGON_RPC_URL", "https://polygon-rpc.com")
WALLET_PRIVATE_KEY = os.environ.get("WALLET_PRIVATE_KEY")

def generate_invoice_hash(invoice):
    """
    Computes a deterministic SHA-256 hash from invoice data.
    Takes an Invoice model instance or a dict.
    """
    # Convert to dict if it's an object
    if hasattr(invoice, 'to_dict'):
        invoice_dict = invoice.to_dict()
    else:
        invoice_dict = invoice

    # Extract immutable fields
    payload = {
        "id": invoice_dict.get("id"),
        "month": invoice_dict.get("month"),
        "amount": str(invoice_dict.get("costs", {}).get("total_amount", 0.0) if "costs" in invoice_dict else invoice_dict.get("total_amount", 0.0)),
        "generated_at": invoice_dict.get("generated_at")
    }
    
    # Serialize to canonical JSON (sorted keys)
    canonical_json = json.dumps(payload, sort_keys=True)
    
    # Compute hash
    return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()

def anchor_hash_to_chain(invoice_hash):
    """
    Anchors the invoice hash to Polygon by sending a 0-value transaction
    with the hash in the calldata.
    """
    if not WALLET_PRIVATE_KEY:
        print("WARNING: WALLET_PRIVATE_KEY not set. Skipping blockchain anchoring.")
        return None

    try:
        w3 = Web3(Web3.HTTPProvider(POLYGON_RPC_URL))
        if not w3.is_connected():
             print("WARNING: Could not connect to Polygon RPC.")
             return None

        account = w3.eth.account.from_key(WALLET_PRIVATE_KEY)
        
        # Prepare transaction with hash in data
        tx = {
            'nonce': w3.eth.get_transaction_count(account.address),
            'to': account.address, # Send to self
            'value': 0,
            'gas': 2000000,
            'gasPrice': w3.eth.gas_price,
            'data': invoice_hash.encode('utf-8')
        }
        
        # Sign transaction
        signed_tx = w3.eth.account.sign_transaction(tx, WALLET_PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        return w3.to_hex(tx_hash)
    except Exception as e:
        print(f"Error anchoring to blockchain: {e}")
        return None
