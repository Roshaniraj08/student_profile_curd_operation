from __future__ import annotations

import os

from flask import Flask, jsonify, render_template, request
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError


app = Flask(__name__)

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "student_portal")

mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
students_collection = mongo_client[MONGO_DB_NAME]["students"]
students_collection.create_index("roll_no", unique=True)


def public_student(student: dict | None) -> dict | None:
    if not student:
        return None
    student.pop("_id", None)
    return student


def normalize_roll_no(roll_no: str) -> str:
    return roll_no.strip()


def validate_student_payload(payload: dict) -> tuple[dict | None, str | None]:
    required_fields = {
        "name": "Name",
        "roll_no": "Roll number",
        "mobile": "Mobile",
        "email": "Email",
        "student_class": "Class",
    }

    cleaned = {}
    for field, label in required_fields.items():
        value = str(payload.get(field, "")).strip()
        if not value:
            return None, f"{label} is required."
        cleaned[field] = value

    return cleaned, None


@app.get("/")
def home():
    return render_template("index.html")


@app.post("/api/students")
def create_student():
    payload = request.get_json(silent=True) or {}
    student, error = validate_student_payload(payload)
    if error:
        return jsonify({"error": error}), 400

    try:
        students_collection.insert_one(student)
    except DuplicateKeyError:
        return jsonify({"error": "A student with this roll number already exists."}), 409
    except PyMongoError:
        return jsonify({"error": "Database connection failed."}), 500

    return jsonify({"message": "Student profile created.", "student": public_student(student)}), 201


@app.get("/api/students/<roll_no>")
def get_student(roll_no: str):
    try:
        student = students_collection.find_one({"roll_no": normalize_roll_no(roll_no)})
    except PyMongoError:
        return jsonify({"error": "Database connection failed."}), 500

    student = public_student(student)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    return jsonify({"student": student})


@app.put("/api/students/<roll_no>")
def update_student(roll_no: str):
    payload = request.get_json(silent=True) or {}
    updated_student, error = validate_student_payload(payload)
    if error:
        return jsonify({"error": error}), 400

    try:
        result = students_collection.replace_one(
            {"roll_no": normalize_roll_no(roll_no)},
            updated_student,
        )
    except DuplicateKeyError:
        return jsonify({"error": "Another student already uses this roll number."}), 409
    except PyMongoError:
        return jsonify({"error": "Database connection failed."}), 500

    if result.matched_count == 0:
        return jsonify({"error": "Student not found."}), 404

    return jsonify({"message": "Student profile updated.", "student": updated_student})


@app.delete("/api/students/<roll_no>")
def delete_student(roll_no: str):
    try:
        student = students_collection.find_one_and_delete({"roll_no": normalize_roll_no(roll_no)})
    except PyMongoError:
        return jsonify({"error": "Database connection failed."}), 500

    student = public_student(student)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    return jsonify({"message": "Student profile deleted.", "student": student})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
