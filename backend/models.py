from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class DemoLoginRequest(BaseModel):
    role: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class QuestionSchema(BaseModel):
    id: Optional[str] = None
    question_text: str
    type: str = "mcq"
    options: List[str] = []
    correct_option: int = 0
    correct_answer_text: Optional[str] = None
    marks: int = 1
    explanation: Optional[str] = ""

class ExamCreate(BaseModel):
    title: str
    subject: str
    code: str
    description: str
    duration_minutes: int = 30
    total_marks: int = 100
    pass_percentage: int = 50
    shuffle_questions: bool = True
    show_results_immediately: bool = True
    is_published: bool = True
    # Scheduled exam time fields
    scheduled_start: Optional[str] = None   # ISO datetime string
    scheduled_end: Optional[str] = None     # ISO datetime string
    questions: List[QuestionSchema]

class ExamResponse(BaseModel):
    id: str
    title: str
    subject: str
    code: str
    description: str
    duration_minutes: int
    total_marks: int
    pass_percentage: int
    shuffle_questions: bool
    show_results_immediately: bool
    is_published: bool
    question_count: int
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    questions: Optional[List[QuestionSchema]] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None

class AnswerSubmission(BaseModel):
    question_id: str
    selected_option: Optional[int] = None
    text_answer: Optional[str] = None

class SubmissionCreate(BaseModel):
    exam_id: str
    answers: List[AnswerSubmission]
    time_taken_seconds: int = 0
    anti_cheat_warnings: int = 0

class SubmissionResponse(BaseModel):
    id: str
    exam_id: str
    exam_title: str
    subject: str
    student_id: str
    student_name: str
    score: float
    total_marks: int
    percentage: float
    passed: bool
    time_taken_seconds: int
    anti_cheat_warnings: int
    submitted_at: str
    detailed_results: Optional[List[Dict[str, Any]]] = None
