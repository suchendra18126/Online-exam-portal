from datetime import datetime
from bson import ObjectId
from .database import users_collection, exams_collection, submissions_collection
from .auth import hash_password

def seed_database():
    print("Starting database seeding process...")
    
    # 1. Seed Users
    users_collection.delete_many({})
    
    student_id = ObjectId()
    teacher_id = ObjectId()
    admin_id = ObjectId()

    users = [
        {
            "_id": student_id,
            "name": "Suchendra (Student)",
            "email": "student@exam.com",
            "password": hash_password("password123"),
            "role": "student",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=StudentSuchendra"
        },
        {
            "_id": teacher_id,
            "name": "Prof. Alan Turing",
            "email": "instructor@exam.com",
            "password": hash_password("password123"),
            "role": "teacher",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=ProfTuring"
        },
        {
            "_id": admin_id,
            "name": "System Administrator",
            "email": "admin@exam.com",
            "password": hash_password("password123"),
            "role": "admin",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=AdminPortal"
        }
    ]
    
    users_collection.insert_many(users)
    print("Seeded 3 demo users successfully.")

    # 2. Seed Exams
    exams_collection.delete_many({})
    
    exam1_id = ObjectId()
    exam2_id = ObjectId()
    exam3_id = ObjectId()
    exam4_id = ObjectId()

    exams = [
        {
            "_id": exam1_id,
            "title": "Python Programming Essentials",
            "subject": "Computer Science",
            "code": "CS101",
            "description": "Comprehensive evaluation covering Python syntax, data types, control flow, functions, and object-oriented programming concepts.",
            "duration_minutes": 20,
            "total_marks": 40,
            "pass_percentage": 50,
            "shuffle_questions": True,
            "show_results_immediately": True,
            "is_published": True,
            "created_by": str(teacher_id),
            "created_at": datetime.utcnow().isoformat(),
            "questions": [
                {
                    "id": "q1",
                    "question_text": "Which data structure in Python is mutable and ordered?",
                    "type": "mcq",
                    "options": ["Tuple", "List", "Set", "String"],
                    "correct_option": 1,
                    "marks": 10,
                    "explanation": "Lists in Python are ordered and mutable sequences defined using square brackets []."
                },
                {
                    "id": "q2",
                    "question_text": "What is the output of `type(3.14)` in Python?",
                    "type": "mcq",
                    "options": ["<class 'int'>", "<class 'float'>", "<class 'double'>", "<class 'number'>"],
                    "correct_option": 1,
                    "marks": 10,
                    "explanation": "In Python, floating point numbers are instances of the `float` class."
                },
                {
                    "id": "q3",
                    "question_text": "Python supports multiple inheritance natively.",
                    "type": "tf",
                    "options": ["True", "False"],
                    "correct_option": 0,
                    "marks": 10,
                    "explanation": "Python supports multiple inheritance via Method Resolution Order (MRO)."
                },
                {
                    "id": "q4",
                    "question_text": "Which keyword is used to create a generator function in Python?",
                    "type": "mcq",
                    "options": ["return", "yield", "generate", "async"],
                    "correct_option": 1,
                    "marks": 10,
                    "explanation": "The `yield` keyword pauses function execution and yields a value back to the caller."
                }
            ]
        },
        {
            "_id": exam2_id,
            "title": "Data Structures & Algorithms",
            "subject": "Computer Science",
            "code": "CS201",
            "description": "Test your knowledge on Big-O analysis, binary search trees, hash tables, graph algorithms, and dynamic programming.",
            "duration_minutes": 30,
            "total_marks": 50,
            "pass_percentage": 60,
            "shuffle_questions": True,
            "show_results_immediately": True,
            "is_published": True,
            "created_by": str(teacher_id),
            "created_at": datetime.utcnow().isoformat(),
            "questions": [
                {
                    "id": "q2_1",
                    "question_text": "What is the worst-case time complexity of Quick Sort?",
                    "type": "mcq",
                    "options": ["O(N log N)", "O(N)", "O(N^2)", "O(1)"],
                    "correct_option": 2,
                    "marks": 15,
                    "explanation": "Quick Sort has a worst-case time complexity of O(N^2) when the pivot selection is poor (e.g. sorted array)."
                },
                {
                    "id": "q2_2",
                    "question_text": "Which data structure follows First-In, First-Out (FIFO) ordering?",
                    "type": "mcq",
                    "options": ["Stack", "Queue", "Tree", "Graph"],
                    "correct_option": 1,
                    "marks": 15,
                    "explanation": "A Queue follows the FIFO principle where elements are inserted at rear and removed from front."
                },
                {
                    "id": "q2_3",
                    "question_text": "Binary search requires an array to be sorted prior to execution.",
                    "type": "tf",
                    "options": ["True", "False"],
                    "correct_option": 0,
                    "marks": 20,
                    "explanation": "Binary search relies on divide-and-conquer on sorted ranges."
                }
            ]
        },
        {
            "_id": exam3_id,
            "title": "Modern Full-Stack Web Development",
            "subject": "Web Engineering",
            "code": "CS301",
            "description": "Assess proficiency in REST APIs, React components, state management, HTTP status codes, and database integration.",
            "duration_minutes": 25,
            "total_marks": 50,
            "pass_percentage": 50,
            "shuffle_questions": False,
            "show_results_immediately": True,
            "is_published": True,
            "created_by": str(teacher_id),
            "created_at": datetime.utcnow().isoformat(),
            "questions": [
                {
                    "id": "q3_1",
                    "question_text": "Which HTTP status code signifies a resource was successfully created?",
                    "type": "mcq",
                    "options": ["200 OK", "201 Created", "204 No Content", "404 Not Found"],
                    "correct_option": 1,
                    "marks": 15,
                    "explanation": "HTTP 201 Created indicates that the request has succeeded and led to the creation of a resource."
                },
                {
                    "id": "q3_2",
                    "question_text": "In React, which hook is primarily used for handling side effects like data fetching?",
                    "type": "mcq",
                    "options": ["useState", "useMemo", "useEffect", "useCallback"],
                    "correct_option": 2,
                    "marks": 15,
                    "explanation": "useEffect lets you synchronize a component with an external system or perform side-effects."
                },
                {
                    "id": "q3_3",
                    "question_text": "MongoDB is a relational SQL database system.",
                    "type": "tf",
                    "options": ["True", "False"],
                    "correct_option": 1,
                    "marks": 20,
                    "explanation": "MongoDB is a document-oriented NoSQL database system that stores JSON-like BSON documents."
                }
            ]
        },
        {
            "_id": exam4_id,
            "title": "General Mathematics & Quantitative Aptitude",
            "subject": "Mathematics",
            "code": "MATH101",
            "description": "Speed and accuracy challenge covering algebra, probability, percentages, and logical reasoning.",
            "duration_minutes": 15,
            "total_marks": 30,
            "pass_percentage": 50,
            "shuffle_questions": True,
            "show_results_immediately": True,
            "is_published": True,
            "created_by": str(teacher_id),
            "created_at": datetime.utcnow().isoformat(),
            "questions": [
                {
                    "id": "q4_1",
                    "question_text": "What is the value of 2^8?",
                    "type": "mcq",
                    "options": ["128", "256", "512", "1024"],
                    "correct_option": 1,
                    "marks": 15,
                    "explanation": "2^8 = 256."
                },
                {
                    "id": "q4_2",
                    "question_text": "If a fair coin is flipped twice, what is the probability of getting two heads?",
                    "type": "mcq",
                    "options": ["1/2", "1/4", "3/4", "1/8"],
                    "correct_option": 1,
                    "marks": 15,
                    "explanation": "P(Head) * P(Head) = 1/2 * 1/2 = 1/4."
                }
            ]
        }
    ]

    exams_collection.insert_many(exams)
    print("Seeded 4 realistic exams successfully.")

    # 3. Seed Submissions for analytics
    submissions_collection.delete_many({})
    
    sample_submissions = [
        {
            "exam_id": str(exam1_id),
            "exam_title": "Python Programming Essentials",
            "subject": "Computer Science",
            "student_id": str(student_id),
            "student_name": "Suchendra (Student)",
            "score": 40.0,
            "total_marks": 40,
            "percentage": 100.0,
            "passed": True,
            "time_taken_seconds": 480,
            "anti_cheat_warnings": 0,
            "submitted_at": datetime.utcnow().isoformat(),
            "detailed_results": []
        }
    ]
    submissions_collection.insert_many(sample_submissions)
    print("Seeded sample submissions successfully.")
    print("Database seeding completed!")

if __name__ == "__main__":
    seed_database()
