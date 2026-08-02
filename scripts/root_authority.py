import sys
import binascii
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

def sign_developer_key(root_private_key_hex, developer_public_key_hex):
    # Load Root Private Key
    try:
        root_priv_bytes = bytes.fromhex(root_private_key_hex)
        if len(root_priv_bytes) != 32:
            print("Error: Root private key must be exactly 32 bytes (64 hex characters).")
            sys.exit(1)
        root_key = ed25519.Ed25519PrivateKey.from_private_bytes(root_priv_bytes)
    except ValueError as e:
        print(f"Error loading root private key: {e}")
        sys.exit(1)

    # Convert developer public key hex to bytes
    try:
        dev_pub_bytes = bytes.fromhex(developer_public_key_hex)
    except ValueError:
        print("Error: Invalid developer public key hex.")
        sys.exit(1)

    # Sign the bytes
    signature = root_key.sign(dev_pub_bytes)
    
    # Root Public Key
    root_public_key = root_key.public_key()
    root_public_bytes = root_public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )

    print("\n✅ SUCCESS: Identity Verified & Signed.")
    print("\n--- PASTE THESE INTO THE UPLOAD FORM ---")
    print(f"Issuer Public Key (Hex): {root_public_bytes.hex()}")
    print(f"Issuer Signature (Hex): {signature.hex()}")
    print("----------------------------------------\n")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/root_authority.py <ROOT_PRIVATE_KEY_HEX> <DEVELOPER_PUBLIC_KEY_HEX>")
        sys.exit(1)
        
    root_private_key_hex = sys.argv[1]
    developer_public_key_hex = sys.argv[2]
    
    sign_developer_key(root_private_key_hex, developer_public_key_hex)
