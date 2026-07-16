import os
from config import Config


def validate_file(file, current_storage_used_bytes):
    """
    Validates a file before uploading.
    Returns (is_valid, error_message)
    
    Checks:
    1. File actually has content
    2. Filename is safe
    3. File type is allowed
    4. File size is within limit
    5. User has enough storage quota left
    """

    # File has content
    if not file or file.filename == "":
        return False, "No file provided or file has no name"

    # Safe filename 
    filename = file.filename
    if ".." in filename or "/" in filename or "\\" in filename:
        return False, "Invalid filename — directory traversal not allowed"

    # File extension is allowed 
    _, ext = os.path.splitext(filename.lower())

    if ext in Config.BLOCKED_EXTENSIONS:
        return False, f"File type '{ext}' is not allowed for security reasons"

    if ext not in Config.ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(Config.ALLOWED_EXTENSIONS))
        return False, f"File type '{ext}' is not supported. Allowed types: {allowed}"

    # Individual file size 
    file_data = file.read()
    file.seek(0)  # Reset 
    file_size = len(file_data)

    max_mb = Config.MAX_FILE_SIZE_BYTES / (1024 * 1024)
    if file_size > Config.MAX_FILE_SIZE_BYTES:
        actual_mb = round(file_size / (1024 * 1024), 2)
        return False, f"File too large ({actual_mb} MB). Maximum allowed is {max_mb} MB"

    if file_size == 0:
        return False, "File is empty — cannot upload a 0 byte file"

    # Check 5: Storage quota 
    quota = Config.STORAGE_QUOTA_BYTES
    remaining = quota - current_storage_used_bytes

    if file_size > remaining:
        remaining_mb = round(remaining / (1024 * 1024), 2)
        file_mb = round(file_size / (1024 * 1024), 2)
        quota_mb = round(quota / (1024 * 1024), 2)
        return False, (
            f"Not enough storage. "
            f"File is {file_mb} MB but you only have {remaining_mb} MB remaining "
            f"(quota: {quota_mb} MB)"
        )

    return True, None


def sanitize_filename(filename):
    """
    Makes a filename safe to store.
    Removes dangerous characters but keeps it readable.
    Example: 'my file (1).pdf' → 'my_file_1_.pdf'
    """
    import re
    name, ext = os.path.splitext(filename)
    safe_name = re.sub(r"[^\w\-.]", "_", name)
    safe_name = re.sub(r"_+", "_", safe_name)
    safe_name = safe_name.strip("_")
    return f"{safe_name}{ext.lower()}"


def format_bytes(size_bytes):
    """
    Converts bytes to human-readable string.
    Example: 1536 → '1.50 KB'
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{round(size_bytes / 1024, 2)} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{round(size_bytes / (1024 * 1024), 2)} MB"
    else:
        return f"{round(size_bytes / (1024 * 1024 * 1024), 2)} GB"