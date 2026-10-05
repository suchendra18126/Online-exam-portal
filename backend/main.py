from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import os

from .config import MONGODB_URI
from .database import users_collection, exams_collection, submissions_collection
from .auth import hash_password, verify_password, create_access_token, get_current_user, require_teacher_or_admin
from .models import (
    UserRegister, UserLogin, DemoLoginRequest, TokenResponse, UserResponse,
    ExamCreate, ExamResponse, SubmissionCreate, SubmissionResponse, QuestionSchema
)
from .seed import seed_database

app = FastAPI(title="Online Exam Portal API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Auto-seed database if empty
    if users_collection.count_documents({}) == 0:
        print("Database is empty. Running initial seed...")
        seed_database()

# Health check
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Online Exam Portal Backend is running!"}

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register", response_model=TokenResponse)
def register_user(user_data: UserRegister):
    existing_user = users_collection.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    role = user_data.role if user_data.role in ["student", "teacher", "admin"] else "student"
    avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={user_data.name.replace(' ', '')}"

    new_user = {
        "name": user_data.name,
        "email": user_data.email.lower(),
        "password": hash_password(user_data.password),
        "role": role,
        "avatar": avatar,
        "created_at": datetime.utcnow().isoformat()
    }
    result = users_collection.insert_one(new_user)
    user_id = str(result.inserted_id)

    user_resp = UserResponse(
        id=user_id,
        name=new_user["name"],
        email=new_user["email"],
        role=new_user["role"],
        avatar=avatar
    )
    token = create_access_token({"sub": user_id, "role": role})
    return TokenResponse(access_token=token, user=user_resp)

@app.post("/api/auth/login", response_model=TokenResponse)
def login_user(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    user_id = str(user["_id"])
    user_resp = UserResponse(
        id=user_id,
        name=user["name"],
        email=user["email"],
        role=user["role"],
        avatar=user.get("avatar")
    )
    token = create_access_token({"sub": user_id, "role": user["role"]})
    return TokenResponse(access_token=token, user=user_resp)

@app.post("/api/auth/demo-login", response_model=TokenResponse)
def demo_login(req: DemoLoginRequest):
    role = req.role if req.role in ["student", "teacher", "admin"] else "student"
    user = users_collection.find_one({"role": role})
    if not user:
        # Re-seed if needed
        seed_database()
        user = users_collection.find_one({"role": role})
        if not user:
            raise HTTPException(status_code=404, detail=f"No demo user found for role {role}")

    user_id = str(user["_id"])
    user_resp = UserResponse(
        id=user_id,
        name=user["name"],
        email=user["email"],
        role=user["role"],
        avatar=user.get("avatar")
    )
    token = create_access_token({"sub": user_id, "role": user["role"]})
    return TokenResponse(access_token=token, user=user_resp)

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        avatar=current_user.get("avatar")
    )

# --- EXAM ENDPOINTS ---

@app.get("/api/exams", response_model=List[ExamResponse])
def get_all_exams(
    subject: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if current_user.get("role") == "student":
        query["is_published"] = True
    if subject:
        query["subject"] = subject

    cursor = exams_collection.find(query)
    exams_list = []
    for doc in cursor:
        q_list = doc.get("questions", [])
        exams_list.append(ExamResponse(
            id=str(doc["_id"]),
            title=doc["title"],
            subject=doc["subject"],
            code=doc["code"],
            description=doc["description"],
            duration_minutes=doc["duration_minutes"],
            total_marks=doc["total_marks"],
            pass_percentage=doc["pass_percentage"],
            shuffle_questions=doc.get("shuffle_questions", True),
            show_results_immediately=doc.get("show_results_immediately", True),
            is_published=doc.get("is_published", True),
            question_count=len(q_list),
            created_by=doc.get("created_by"),
            created_at=doc.get("created_at")
        ))
    return exams_list

@app.get("/api/exams/{exam_id}", response_model=ExamResponse)
def get_exam_by_id(exam_id: str, current_user: dict = Depends(get_current_user)):
    try:
        doc = exams_collection.find_one({"_id": ObjectId(exam_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")

    if not doc:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions_raw = doc.get("questions", [])
    formatted_questions = []
    
    for idx, q in enumerate(questions_raw):
        q_schema = QuestionSchema(
            id=q.get("id", f"q_{idx}"),
            question_text=q["question_text"],
            type=q.get("type", "mcq"),
            options=q.get("options", []),
            correct_option=q.get("correct_option", 0),
            correct_answer_text=q.get("correct_answer_text"),
            marks=q.get("marks", 10),
            explanation=q.get("explanation", "")
        )
        # Hide correct option from students taking test if needed, but send full schema for grading
        formatted_questions.append(q_schema)

    return ExamResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        subject=doc["subject"],
        code=doc["code"],
        description=doc["description"],
        duration_minutes=doc["duration_minutes"],
        total_marks=doc["total_marks"],
        pass_percentage=doc["pass_percentage"],
        shuffle_questions=doc.get("shuffle_questions", True),
        show_results_immediately=doc.get("show_results_immediately", True),
        is_published=doc.get("is_published", True),
        question_count=len(formatted_questions),
        questions=formatted_questions,
        created_by=doc.get("created_by"),
        created_at=doc.get("created_at")
    )

@app.post("/api/exams", response_model=ExamResponse)
def create_exam(
    exam_data: ExamCreate,
    current_user: dict = Depends(require_teacher_or_admin)
):
    questions_list = []
    for idx, q in enumerate(exam_data.questions):
        q_dict = q.dict()
        if not q_dict.get("id"):
            q_dict["id"] = f"q_{idx+1}_{ObjectId()}"
        questions_list.append(q_dict)

    new_exam = {
        "title": exam_data.title,
        "subject": exam_data.subject,
        "code": exam_data.code,
        "description": exam_data.description,
        "duration_minutes": exam_data.duration_minutes,
        "total_marks": exam_data.total_marks,
        "pass_percentage": exam_data.pass_percentage,
        "shuffle_questions": exam_data.shuffle_questions,
        "show_results_immediately": exam_data.show_results_immediately,
        "is_published": exam_data.is_published,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow().isoformat(),
        "questions": questions_list
    }

    result = exams_collection.insert_one(new_exam)
    exam_id = str(result.inserted_id)

    return ExamResponse(
        id=exam_id,
        title=new_exam["title"],
        subject=new_exam["subject"],
        code=new_exam["code"],
        description=new_exam["description"],
        duration_minutes=new_exam["duration_minutes"],
        total_marks=new_exam["total_marks"],
        pass_percentage=new_exam["pass_percentage"],
        shuffle_questions=new_exam["shuffle_questions"],
        show_results_immediately=new_exam["show_results_immediately"],
        is_published=new_exam["is_published"],
        question_count=len(questions_list),
        questions=[QuestionSchema(**q) for q in questions_list],
        created_by=current_user["id"],
        created_at=new_exam["created_at"]
    )

@app.delete("/api/exams/{exam_id}")
def delete_exam(exam_id: str, current_user: dict = Depends(require_teacher_or_admin)):
    try:
        res = exams_collection.delete_one({"_id": ObjectId(exam_id)})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Exam not found")
        return {"status": "success", "message": "Exam deleted successfully"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")

# --- SUBMISSION ENDPOINTS ---

@app.post("/api/submissions", response_model=SubmissionResponse)
def submit_exam(
    sub_data: SubmissionCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        exam = exams_collection.find_one({"_id": ObjectId(sub_data.exam_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid exam ID format")

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions = exam.get("questions", [])
    questions_map = {q.get("id", f"q_{i}"): q for i, q in enumerate(questions)}

    user_answers_map = {a.question_id: a for a in sub_data.answers}

    obtained_score = 0.0
    total_marks = exam.get("total_marks", 100)
    detailed_results = []

    for q_id, q in questions_map.items():
        q_marks = q.get("marks", 10)
        u_ans = user_answers_map.get(q_id)
        is_correct = False

        selected_opt = u_ans.selected_option if u_ans else None
        correct_opt = q.get("correct_option", 0)

        if selected_opt is not None and selected_opt == correct_opt:
            is_correct = True
            obtained_score += q_marks

        detailed_results.append({
            "question_id": q_id,
            "question_text": q.get("question_text"),
            "options": q.get("options", []),
            "selected_option": selected_opt,
            "correct_option": correct_opt,
            "is_correct": is_correct,
            "marks_awarded": q_marks if is_correct else 0,
            "total_marks": q_marks,
            "explanation": q.get("explanation", "")
        })

    percentage = round((obtained_score / total_marks) * 100, 2) if total_marks > 0 else 0.0
    pass_pct = exam.get("pass_percentage", 50)
    passed = percentage >= pass_pct

    submission_doc = {
        "exam_id": sub_data.exam_id,
        "exam_title": exam.get("title"),
        "subject": exam.get("subject"),
        "student_id": current_user["id"],
        "student_name": current_user["name"],
        "score": obtained_score,
        "total_marks": total_marks,
        "percentage": percentage,
        "passed": passed,
        "time_taken_seconds": sub_data.time_taken_seconds,
        "anti_cheat_warnings": sub_data.anti_cheat_warnings,
        "submitted_at": datetime.utcnow().isoformat(),
        "detailed_results": detailed_results
    }

    res = submissions_collection.insert_one(submission_doc)

    return SubmissionResponse(
        id=str(res.inserted_id),
        exam_id=sub_data.exam_id,
        exam_title=exam.get("title"),
        subject=exam.get("subject"),
        student_id=current_user["id"],
        student_name=current_user["name"],
        score=obtained_score,
        total_marks=total_marks,
        percentage=percentage,
        passed=passed,
        time_taken_seconds=sub_data.time_taken_seconds,
        anti_cheat_warnings=sub_data.anti_cheat_warnings,
        submitted_at=submission_doc["submitted_at"],
        detailed_results=detailed_results
    )

@app.get("/api/submissions/my", response_model=List[SubmissionResponse])
def get_my_submissions(current_user: dict = Depends(get_current_user)):
    cursor = submissions_collection.find({"student_id": current_user["id"]}).sort("submitted_at", -1)
    results = []
    for doc in cursor:
        results.append(SubmissionResponse(
            id=str(doc["_id"]),
            exam_id=doc["exam_id"],
            exam_title=doc.get("exam_title", "Exam"),
            subject=doc.get("subject", "General"),
            student_id=doc["student_id"],
            student_name=doc.get("student_name", "Student"),
            score=doc["score"],
            total_marks=doc["total_marks"],
            percentage=doc["percentage"],
            passed=doc["passed"],
            time_taken_seconds=doc.get("time_taken_seconds", 0),
            anti_cheat_warnings=doc.get("anti_cheat_warnings", 0),
            submitted_at=doc["submitted_at"],
            detailed_results=doc.get("detailed_results")
        ))
    return results

@app.get("/api/submissions/exam/{exam_id}", response_model=List[SubmissionResponse])
def get_exam_submissions(
    exam_id: str,
    current_user: dict = Depends(require_teacher_or_admin)
):
    cursor = submissions_collection.find({"exam_id": exam_id}).sort("submitted_at", -1)
    results = []
    for doc in cursor:
        results.append(SubmissionResponse(
            id=str(doc["_id"]),
            exam_id=doc["exam_id"],
            exam_title=doc.get("exam_title", "Exam"),
            subject=doc.get("subject", "General"),
            student_id=doc["student_id"],
            student_name=doc.get("student_name", "Student"),
            score=doc["score"],
            total_marks=doc["total_marks"],
            percentage=doc["percentage"],
            passed=doc["passed"],
            time_taken_seconds=doc.get("time_taken_seconds", 0),
            anti_cheat_warnings=doc.get("anti_cheat_warnings", 0),
            submitted_at=doc["submitted_at"],
            detailed_results=doc.get("detailed_results")
        ))
    return results

# --- ANALYTICS ENDPOINT ---

@app.get("/api/analytics")
def get_analytics(current_user: dict = Depends(get_current_user)):
    total_students = users_collection.count_documents({"role": "student"})
    total_exams = exams_collection.count_documents({"is_published": True})
    total_submissions = submissions_collection.count_documents({})
    
    passed_submissions = submissions_collection.count_documents({"passed": True})
    pass_rate = round((passed_submissions / total_submissions * 100), 1) if total_submissions > 0 else 100.0

    avg_pipeline = [
        {"$group": {"_id": None, "avg_percentage": {"$avg": "$percentage"}}}
    ]
    avg_res = list(submissions_collection.aggregate(avg_pipeline))
    avg_score = round(avg_res[0]["avg_percentage"], 1) if avg_res else 85.0

    recent_submissions = list(submissions_collection.find({}, {"detailed_results": 0}).sort("submitted_at", -1).limit(5))
    recent_formatted = []
    for s in recent_submissions:
        s["id"] = str(s["_id"])
        del s["_id"]
        recent_formatted.append(s)

    return {
        "total_students": total_students,
        "total_exams": total_exams,
        "total_submissions": total_submissions,
        "pass_rate": pass_rate,
        "avg_score": avg_score,
        "recent_submissions": recent_formatted
    }

@app.post("/api/seed")
def trigger_seed(current_user: dict = Depends(require_teacher_or_admin)):
    seed_database()
    return {"status": "success", "message": "Database successfully re-seeded with demo data!"}

# --- STATIC FILES FOR REACT FRONTEND ---
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dir = os.path.join(base_dir, "frontend")

if os.path.exists(frontend_dir):
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend index.html not found"}
