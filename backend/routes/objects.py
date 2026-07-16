from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, StorageObject, UsageLog
from services.usage_service import log_api_call, update_storage_snapshot
from services.minio_service import (
    upload_file, download_file, delete_file,
    list_files, get_total_storage_used,get_storage_summary
)
from utils.validators import validate_file, sanitize_filename, format_bytes
from config import Config
from datetime import datetime, date
import io
import hashlib
from services.optimizer_service import get_optimization_report

objects_bp = Blueprint("objects", __name__)


def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


# def log_api_call(user_id):
#     today = date.today()
#     log = UsageLog.query.filter_by(user_id=user_id, date=today).first()
#     if log:
#         log.api_calls += 1
#     else:
#         log = UsageLog(user_id=user_id, date=today, api_calls=1, storage_used=0)
#         db.session.add(log)
#     db.session.commit()


# def update_storage_log(user_id, username):
#     today = date.today()
#     total_bytes = get_total_storage_used(username)
#     log = UsageLog.query.filter_by(user_id=user_id, date=today).first()
#     if log:
#         log.storage_used = total_bytes
#     else:
#         log = UsageLog(user_id=user_id, date=today, storage_used=total_bytes, api_calls=0)
#         db.session.add(log)
#     db.session.commit()


# UPLOAD file
@objects_bp.route("/api/objects/upload", methods=["POST"])
@jwt_required()
def upload():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    if "file" not in request.files:
        return jsonify({
            "error": "No file found in request",
            "hint": "In Postman: Body → form-data → key='file', type=File"
        }), 400

    file = request.files["file"]

    current_storage = get_total_storage_used(user.username)

    is_valid, error_msg = validate_file(file, current_storage, user_quota=user.storage_quota)
    if not is_valid:
        return jsonify({"error": error_msg}), 400
    
    original_name  = file.filename
    safe_filename  = sanitize_filename(original_name)
    content_type   = file.content_type or "application/octet-stream"
    file_data      = file.read()
    file_size      = len(file_data)

    existing = StorageObject.query.filter_by(
        user_id=user.id, filename=safe_filename
    ).first()

    if existing:
        import os
        name, ext = os.path.splitext(safe_filename)
        timestamp  = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{name}_{timestamp}{ext}"

    success = upload_file(
        user.username, file_data,
        safe_filename, content_type, file_size
    )

    if not success:
        return jsonify({
            "error": "Upload to storage failed",
            "hint": "Make sure MinIO is running: docker ps"
        }), 500
    
    file_hash      = hashlib.md5(file_data).hexdigest()
    blockchain_hash = hashlib.sha256(file_data).hexdigest()

    new_object = StorageObject(
        user_id=user.id,
        filename=safe_filename,
        object_key=f"{user.username}/{safe_filename}",
        file_size=file_size,
        file_hash=file_hash,
        blockchain_hash=blockchain_hash,
        last_accessed_at=datetime.utcnow()
    )
    db.session.add(new_object)
    db.session.commit()
    
    from services.blockchain import anchor_hash_to_chain
    tx_hash = anchor_hash_to_chain(blockchain_hash)
    if tx_hash:
        new_object.chain_tx_hash = tx_hash
        db.session.commit()
    
    log_api_call(user.id)
    update_storage_snapshot(user.id, user.username)

    summary = get_storage_summary(user.username)

    response = {
        "message": "File uploaded successfully!",
        "file": {
            **new_object.to_dict(),
            "original_name":  original_name,
            "saved_as":       safe_filename,
            "size_readable":  format_bytes(file_size),
            "renamed": original_name != safe_filename
        },
        "storage": summary
    }

    if summary["is_near_limit"]:
        response["warning"] = (
            f"You have used {summary['percent_used']}% of your storage quota. "
            f"Only {summary['remaining_readable']} remaining."
        )
    return jsonify({
    "message": "File uploaded successfully!",
    "file": {
        **new_object.to_dict(),
        "original_name": original_name,
        "saved_as": safe_filename,
        "size_readable": format_bytes(file_size),
        "renamed": original_name != safe_filename
    },
    "storage": summary
}), 201
    


# LIST all files 
@objects_bp.route("/api/objects/list", methods=["GET"])
@jwt_required()
def list_user_files():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    log_api_call(user.id)

    sort_by = request.args.get("sort", "date")

    db_files = StorageObject.query.filter_by(user_id=user.id).all()

    if sort_by == "size":
        db_files.sort(key=lambda f: f.file_size, reverse=True)
    elif sort_by == "name":
        db_files.sort(key=lambda f: f.filename.lower())
    else:  
        db_files.sort(key=lambda f: f.uploaded_at, reverse=True)

    files_data = []
    for f in db_files:
        file_dict = f.to_dict()
        file_dict["size_readable"] = format_bytes(f.file_size)
        files_data.append(file_dict)

    summary = get_storage_summary(user.username)

    response = {
        "username":    user.username,
        "total_files": len(db_files),
        "storage":     summary,
        "sort_by":     sort_by,
        "files":       files_data
    }

    if summary["is_near_limit"]:
        response["warning"] = (
            f"Storage at {summary['percent_used']}%! "
            f"Delete some files or contact admin."
        )

    return jsonify(response), 200


# DOWNLOAD file
@objects_bp.route("/api/objects/download/<filename>", methods=["GET"])
@jwt_required()
def download(filename):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    obj = StorageObject.query.filter_by(
        user_id=user.id, filename=filename
    ).first()

    if not obj:
        user_files = StorageObject.query.filter_by(user_id=user.id).all()
        filenames  = [f.filename for f in user_files]
        return jsonify({
            "error": f"File '{filename}' not found",
            "your_files": filenames,
            "hint": "Filename is case-sensitive"
        }), 404

    log_api_call(user.id)
    
    obj.last_accessed_at = datetime.utcnow()
    db.session.commit()

    file_data = download_file(user.username, filename)
    if file_data is None:
        return jsonify({
            "error": "File exists in database but not in storage",
            "hint": "This file may be corrupted. Try deleting and re-uploading it."
        }), 500

    import mimetypes
    content_type, _ = mimetypes.guess_type(filename)
    content_type = content_type or "application/octet-stream"

    return send_file(
        io.BytesIO(file_data),
        download_name=filename,
        as_attachment=True,
        mimetype=content_type
    )


# DELETE
@objects_bp.route("/api/objects/<filename>", methods=["DELETE"])
@jwt_required()
def delete(filename):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    obj = StorageObject.query.filter_by(
        user_id=user.id, filename=filename
    ).first()

    if not obj:
        return jsonify({
            "error": f"File '{filename}' not found",
            "hint": "Use GET /api/objects/list to see your files"
        }), 404

    deleted_size = obj.file_size

    success = delete_file(user.username, filename)
    if not success:
        return jsonify({
            "error": "Failed to delete from storage",
            "hint": "Make sure MinIO is still running"
        }), 500

    db.session.delete(obj)
    db.session.commit()

    log_api_call(user.id)
    update_storage_snapshot(user.id, user.username)

    summary = get_storage_summary(user.username)

    return jsonify({
        "message": f"File '{filename}' deleted successfully!",
        "freed_space": format_bytes(deleted_size),
        "storage":     summary
    }), 200


# DELETE MULTIPLE OR ALL
@objects_bp.route("/api/objects/delete-multiple", methods=["POST"])
@jwt_required()
def delete_multiple():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    filenames = data.get("filenames", [])
    delete_all = data.get("delete_all", False)

    if delete_all:
        user_files = StorageObject.query.filter_by(user_id=user.id).all()
        filenames = [f.filename for f in user_files]

    if not filenames:
        return jsonify({"message": "No files selected for deletion"}), 200

    deleted_count = 0
    failed_filenames = []
    
    for filename in filenames:
        obj = StorageObject.query.filter_by(
            user_id=user.id, filename=filename
        ).first()
        if not obj:
            failed_filenames.append(filename)
            continue
            
        success = delete_file(user.username, filename)
        if success:
            db.session.delete(obj)
            deleted_count += 1
        else:
            failed_filenames.append(filename)

    db.session.commit()

    log_api_call(user.id)
    update_storage_snapshot(user.id, user.username)
    summary = get_storage_summary(user.username)

    return jsonify({
        "message": f"Successfully deleted {deleted_count} files.",
        "failed_files": failed_filenames,
        "storage": summary
    }), 200


# STORAGE SUMMARY 
@objects_bp.route("/api/objects/storage", methods=["GET"])
@jwt_required()
def storage_info():
    """
    Quick endpoint to check storage usage without listing all files.
    Frontend dashboard will call this frequently.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    log_api_call(user.id)
    summary = get_storage_summary(user.username)

    return jsonify({
        "username": user.username,
        "storage":  summary
    }), 200

# OPTIMIZE 
@objects_bp.route("/api/objects/optimize", methods=["GET"])
@jwt_required()
def optimize():
    """
    Returns recommendations for freeing up storage.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    report = get_optimization_report(user.id)
    return jsonify(report), 200


# Verify file on chain
@objects_bp.route("/api/objects/verify/<int:object_id>", methods=["GET"])
@jwt_required()
def verify_object(object_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    from models import StorageObject
    obj = StorageObject.query.filter_by(id=object_id, user_id=user.id).first()
    if not obj:
        return jsonify({"error": "File not found"}), 404

    from services.minio_service import download_file
    import hashlib

    # Download file content to check integrity
    file_data = download_file(user.username, obj.filename)
    if not file_data:
        return jsonify({"error": "Could not retrieve file from storage"}), 500

    current_hash = hashlib.sha256(file_data).hexdigest()

    # If blockchain_hash is not set (for old files)
    if not obj.blockchain_hash:
        return jsonify({
            "error": "This file was uploaded before blockchain anchoring was enabled."
        }), 400

    is_authentic = (current_hash == obj.blockchain_hash)
    explorer_url = f"https://polygonscan.com/tx/{obj.chain_tx_hash}" if obj.chain_tx_hash else None

    return jsonify({
        "object_id": obj.id,
        "is_authentic": is_authentic,
        "current_hash": current_hash,
        "stored_hash": obj.blockchain_hash,
        "chain_tx_hash": obj.chain_tx_hash,
        "explorer_url": explorer_url
    }), 200