from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import shutil
import os
import uuid
from typing import Optional
from file_parser import parse_test_file

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Text file containing credentials
CREDENTIALS_FILE = "credentials.txt"
# Store active sessions: session_id -> username
sessions = {}

def get_credentials():
    creds = {}
    if os.path.exists(CREDENTIALS_FILE):
        with open(CREDENTIALS_FILE, "r") as f:
            for line in f:
                if ":" in line:
                    user, pwd = line.strip().split(":", 1)
                    creds[user] = pwd
    return creds

def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        return None
    return sessions[session_id]

@app.get("/login")
async def login_page(request: Request):
    # If already logged in, redirect to home
    if get_current_user(request):
        return RedirectResponse(url="/", status_code=302)
    return FileResponse('static/login.html')

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    creds = get_credentials()
    if username in creds and creds[username] == password:
        session_id = str(uuid.uuid4())
        sessions[session_id] = username
        response = RedirectResponse(url="/", status_code=302)
        response.set_cookie(key="session_id", value=session_id)
        return response
    else:
        return RedirectResponse(url="/login?error=1", status_code=302)

@app.get("/logout")
async def logout(request: Request):
    session_id = request.cookies.get("session_id")
    if session_id and session_id in sessions:
        del sessions[session_id]
    response = RedirectResponse(url="/login", status_code=302)
    response.delete_cookie("session_id")
    return response

@app.get("/")
async def read_index(user: Optional[str] = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    return FileResponse('static/index.html')

@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...), user: Optional[str] = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Use portable temp directory (works on Windows and Lambda's /tmp)
    import tempfile
    safe_filename = f"{uuid.uuid4()}_{file.filename.replace(' ', '_')}"
    temp_file_path = os.path.join(tempfile.gettempdir(), safe_filename)
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Determine file type and parse
        if file.filename.endswith('.docx'):
            questions = parse_test_file(temp_file_path, 'docx')
        elif file.filename.endswith('.pdf'):
            questions = parse_test_file(temp_file_path, 'pdf')
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Only .docx and .pdf supported.")
            
        return {"questions": questions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# Mangum handler for Netlify/AWS Lambda
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    handler = None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
