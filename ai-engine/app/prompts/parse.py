PROMPT_VERSION = "parse-v3"

# Exact System Instruction required by specification
SYSTEM_INSTRUCTION = (
    "You are an expert university professor and instructional designer. Your task is to analyze course materials, "
    "lecture slides, and documents. You must ignore template text, master slide placeholders, and formatting artifacts. "
    "Extract a comprehensive, hierarchical breakdown of the core academic topics (grouped into logical modules with "
    "detailed sub-points) and generate high-yield study flashcards that test definitions, comparisons, formulas, and "
    "practical applications."
)

# Backward compatibility alias
SYSTEM_PROMPT = SYSTEM_INSTRUCTION

USER_PROMPT_TEMPLATE = """Please analyze the following course material / lecture slides thoroughly. Extract the logical module topics with detailed subtopics (title and detailed summary) and generate EXACTLY 10 high-yield study flashcards testing definitions, comparisons, formulas, and practical applications (do NOT generate more than 10 flashcards in total):

<document>
{document_text}
</document>"""

# Strict JSON Schema for Gemini structured output
COURSE_ANALYSIS_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "courseTitle": {
            "type": "STRING",
            "description": "The inferred title of the course or lecture."
        },
        "topics": {
            "type": "ARRAY",
            "description": "Logical modules/sections covered in the file.",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "categoryTitle": {
                        "type": "STRING"
                    },
                    "subtopics": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "title": {
                                    "type": "STRING"
                                },
                                "summary": {
                                    "type": "STRING",
                                    "description": "Detailed explanation of the concept, definitions, or formulas."
                                }
                            },
                            "required": ["title", "summary"]
                        }
                    }
                },
                "required": ["categoryTitle", "subtopics"]
            }
        },
        "flashcards": {
            "type": "ARRAY",
            "description": "Generate EXACTLY 10 high-yield flashcards covering key terms, models, formulas, and comparisons. Maximum 10 items.",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "question": {
                        "type": "STRING"
                    },
                    "answer": {
                        "type": "STRING"
                    },
                    "topicTag": {
                        "type": "STRING"
                    }
                },
                "required": ["question", "answer", "topicTag"]
            }
        }
    },
    "required": ["courseTitle", "topics", "flashcards"]
}
