from datetime import datetime
from bson import ObjectId
from .database import users_collection, exams_collection, submissions_collection
from .auth import hash_password

def seed_database():
    print("Seeding database...")

    users_collection.delete_many({})

    student_id = ObjectId()
    admin_id = ObjectId()

    users_collection.insert_many([
        {
            "_id": student_id,
            "name": "Suchendra Student",
            "email": "student@exam.com",
            "password": hash_password("password123"),
            "role": "student",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=StudentSuchendra"
        },
        {
            "_id": admin_id,
            "name": "Admin Portal",
            "email": "admin@exam.com",
            "password": hash_password("admin123"),
            "role": "admin",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=AdminPortal"
        }
    ])
    print("✅ Seeded 2 users (1 student, 1 admin)")

    exams_collection.delete_many({})

    # Scheduled exam: started 1 day ago, ends 30 days from now — always accessible
    now = datetime.utcnow()
    past = datetime(now.year, now.month, now.day - 1 if now.day > 1 else 1, 0, 0, 0).isoformat()
    future = datetime(now.year + 1, 1, 1, 0, 0, 0).isoformat()

    exams_collection.insert_many([
        {
            "_id": ObjectId(),
            "title": "Python Programming Essentials",
            "subject": "Computer Science",
            "code": "CS101",
            "description": "Covers Python syntax, data types, control flow, functions, and OOP concepts.",
            "duration_minutes": 20,
            "total_marks": 40,
            "pass_percentage": 50,
            "shuffle_questions": True,
            "show_results_immediately": True,
            "is_published": True,
            "scheduled_start": past,
            "scheduled_end": future,
            "created_by": str(admin_id),
            "created_at": now.isoformat(),
            "questions": [
                {"id": "q1", "question_text": "Which data structure in Python is mutable and ordered?",
                 "type": "mcq", "options": ["Tuple", "List", "Set", "String"],
                 "correct_option": 1, "marks": 10,
                 "explanation": "Lists in Python are ordered and mutable sequences."},
                {"id": "q2", "question_text": "What does `type(3.14)` return in Python?",
                 "type": "mcq", "options": ["<class 'int'>", "<class 'float'>", "<class 'double'>", "<class 'number'>"],
                 "correct_option": 1, "marks": 10,
                 "explanation": "Floating-point numbers are of type `float` in Python."},
                {"id": "q3", "question_text": "Python supports multiple inheritance.",
                 "type": "tf", "options": ["True", "False"],
                 "correct_option": 0, "marks": 10,
                 "explanation": "Python supports multiple inheritance via MRO."},
                {"id": "q4", "question_text": "Which keyword creates a generator function?",
                 "type": "mcq", "options": ["return", "yield", "generate", "async"],
                 "correct_option": 1, "marks": 10,
                 "explanation": "`yield` pauses the function and returns a value to the caller."}
            ]
        },
        {
            "_id": ObjectId(),
            "title": "Data Structures & Algorithms",
            "subject": "Computer Science",
            "code": "CS201",
            "description": "Big-O, binary search trees, hash tables, graph algorithms, and dynamic programming.",
            "duration_minutes": 30,
            "total_marks": 50,
            "pass_percentage": 60,
            "shuffle_questions": True,
            "show_results_immediately": True,
            "is_published": True,
            "scheduled_start": past,
            "scheduled_end": future,
            "created_by": str(admin_id),
            "created_at": now.isoformat(),
            "questions": [
                {"id": "q2_1", "question_text": "Worst-case time complexity of Quick Sort?",
                 "type": "mcq", "options": ["O(N log N)", "O(N)", "O(N²)", "O(1)"],
                 "correct_option": 2, "marks": 15,
                 "explanation": "Quick Sort degrades to O(N²) on a poorly chosen pivot."},
                {"id": "q2_2", "question_text": "Which data structure follows FIFO ordering?",
                 "type": "mcq", "options": ["Stack", "Queue", "Tree", "Graph"],
                 "correct_option": 1, "marks": 15,
                 "explanation": "Queue inserts at the rear and removes from the front."},
                {"id": "q2_3", "question_text": "Binary search requires a sorted array.",
                 "type": "tf", "options": ["True", "False"],
                 "correct_option": 0, "marks": 20,
                 "explanation": "Binary search divides sorted ranges in half each step."}
            ]
        },
        {
            "_id": ObjectId(),
            "title": "Web Development Fundamentals",
            "subject": "Web Engineering",
            "code": "WE301",
            "description": "REST APIs, React, state management, HTTP status codes, and database integration.",
            "duration_minutes": 25,
            "total_marks": 50,
            "pass_percentage": 50,
            "shuffle_questions": False,
            "show_results_immediately": True,
            "is_published": True,
            "scheduled_start": past,
            "scheduled_end": future,
            "created_by": str(admin_id),
            "created_at": now.isoformat(),
            "questions": [
                {"id": "q3_1", "question_text": "Which HTTP status code indicates a resource was successfully created?",
                 "type": "mcq", "options": ["200 OK", "201 Created", "204 No Content", "404 Not Found"],
                 "correct_option": 1, "marks": 15,
                 "explanation": "HTTP 201 Created confirms successful resource creation."},
                {"id": "q3_2", "question_text": "Which React hook handles side effects like data fetching?",
                 "type": "mcq", "options": ["useState", "useMemo", "useEffect", "useCallback"],
                 "correct_option": 2, "marks": 15,
                 "explanation": "useEffect runs after rendering for side-effects."},
                {"id": "q3_3", "question_text": "MongoDB is a relational SQL database.",
                 "type": "tf", "options": ["True", "False"],
                 "correct_option": 1, "marks": 20,
                 "explanation": "MongoDB is a document-oriented NoSQL database."}
            ]
        }
    ])
    print("✅ Seeded 3 exams")
    submissions_collection.delete_many({})
    print("✅ Cleared submissions")
    print("Database seeding complete!")

if __name__ == "__main__":
    seed_database()
