import base64
import hashlib
import logging
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from backend.app.core.config import settings

logger = logging.getLogger("agentos.security")

# Salt for PBKDF2 key derivation (deterministic per installation secret)
_SALT = b"agentos_salt_v1_secure_storage"

def _derive_fernet_key(secret_seed: str) -> bytes:
    """Derives a url-safe 32-byte base64-encoded Fernet key using PBKDF2HMAC."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=100_000,
    )
    key = kdf.derive(secret_seed.encode("utf-8"))
    return base64.urlsafe_b64encode(key)

class CredentialVaultSecurity:
    """Provides AES-128-CBC encryption with SHA256 HMAC authentication for credentials."""
    def __init__(self, secret_key: Optional[str] = None):
        seed = secret_key or settings.API_SECRET_KEY
        self.fernet_key = _derive_fernet_key(seed)
        self.fernet = Fernet(self.fernet_key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypts a plaintext string and returns a base64 ciphertext token."""
        if not plaintext:
            return ""
        encrypted_bytes = self.fernet.encrypt(plaintext.encode("utf-8"))
        return encrypted_bytes.decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypts a base64 ciphertext token and returns the original plaintext."""
        if not ciphertext:
            return ""
        decrypted_bytes = self.fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")

    @staticmethod
    def mask_secret(secret_str: str) -> str:
        """Generates a safe preview of the secret without exposing sensitive characters."""
        if not secret_str:
            return "••••••••"
        if len(secret_str) <= 6:
            return "••••••"
        # Reveal only the last 4 characters
        return f"••••••••{secret_str[-4:]}"

# Singleton security engine
vault_security = CredentialVaultSecurity()
