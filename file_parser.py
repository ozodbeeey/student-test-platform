import docx
import pdfplumber
import re

def parse_test_file(file_path, file_type):
    text = ""
    if file_type == 'docx':
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        text = '\n'.join(full_text)
    elif file_type == 'pdf':
        with pdfplumber.open(file_path) as pdf:
            full_text = []
            for page in pdf.pages:
                full_text.append(page.extract_text())
            text = '\n'.join(full_text)
    
    return parse_text_content(text)

def parse_text_content(text):
    # Normalize newlines
    text = text.replace('\r\n', '\n')
    
    # Split by question separator '++++' (allow flexible whitespace around it)
    # Regex look for 4 or more plus signs
    raw_questions = re.split(r'\+{4,}', text)
    
    parsed_questions = []
    question_id = 1
    
    for raw_q in raw_questions:
        raw_q = raw_q.strip()
        if not raw_q:
            continue
            
        # Split by option separator '====' (allow flexible whitespace)
        # Regex look for 4 or more equals signs
        parts = re.split(r'={4,}', raw_q)
        
        # First part is the question text
        question_text = parts[0].strip()
        
        # If no options found by delimiter, try splitting by newlines if looks like options?
        # For now, let's stick to the delimiter but be robust about it.
        
        # Remaining parts are options
        options = []
        for i in range(1, len(parts)):
            opt_text = parts[i].strip()
            if not opt_text:
                continue
                
            is_correct = False
            if opt_text.startswith('#'):
                is_correct = True
                opt_text = opt_text[1:].strip() # Remove the '#'
            
            options.append({
                "id": i,
                "text": opt_text,
                "isCorrect": is_correct
            })
            
        if question_text and options:
             parsed_questions.append({
                "id": question_id,
                "question": question_text,
                "options": options
            })
             question_id += 1
              
    return parsed_questions
