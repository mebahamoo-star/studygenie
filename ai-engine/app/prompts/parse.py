PROMPT_VERSION = "parse-v4"

# Exact System Instruction required by specification
SYSTEM_INSTRUCTION = (
    "You are an expert university professor and meticulous instructional designer. Your task is exhaustive topic extraction "
    "from course materials, lecture slides, and chapter documents. You must ignore template text, headers/footers, and "
    "slide master placeholders. Extract a comprehensive, granular breakdown of EVERY core academic topic, section, protocol, "
    "configuration step, mechanism, and definition covered across the entire document. DO NOT summarize or compress multiple "
    "distinct concepts into just 1 or 2 vague high-level modules. Every major concept, procedure, or section must be its own "
    "distinct topic entry with detailed, rich subtopics (including step-by-step procedures, formulas, definitions, and "
    "academic explanations displayed in the expandable Accordion). Generate EXACTLY 10 high-yield study flashcards that test "
    "definitions, comparisons, formulas, and practical applications."
)

# Backward compatibility alias
SYSTEM_PROMPT = SYSTEM_INSTRUCTION

USER_PROMPT_TEMPLATE = """Please deeply and thoroughly analyze the following course material / lecture slides. Extract EVERY distinct topic and section covered throughout the entire document into its own topic entry (do NOT consolidate everything into only 1 or 2 high-level topics; break down all sections, protocols, steps, and key concepts into their own separate topic entries with rich subtopics and detailed summaries). Generate EXACTLY 10 high-yield study flashcards testing definitions, comparisons, formulas, and practical applications (do NOT generate more than 10 flashcards in total):

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
            "description": "Exhaustive list of all distinct topics, sections, and procedures covered across the document (do not compress into fewer than 5-12 topics for a complete chapter).",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "categoryTitle": {
                        "type": "STRING",
                        "description": "Precise name of the specific topic, mechanism, or section."
                    },
                    "subtopics": {
                        "type": "ARRAY",
                        "description": "Granular subtopics and key points for this topic (2 to 8 items).",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "title": {
                                    "type": "STRING",
                                    "description": "Short heading of the subtopic."
                                },
                                "summary": {
                                    "type": "STRING",
                                    "description": "Detailed explanation of the concept, step-by-step procedures, definitions, formulas, or academic analysis (displayed in the expandable Accordion)."
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
