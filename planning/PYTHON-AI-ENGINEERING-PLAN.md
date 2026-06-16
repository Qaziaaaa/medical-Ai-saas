# Python + AI Engineering Plan
### A Learning Path for a MERN Developer

---

## Why Python? Why Separate?

Think of it this way:

- **Node.js/Express** is your clinic's front desk — handles logins, form submissions, database CRUD, and talking to the React frontend
- **Python** is the lab in the back — it runs complex analysis, trains models, and sends results back

You don't ask your receptionist to run blood tests. You send the sample to the lab. Same idea here — Python is better at math, statistics, and ML libraries. Node is better at I/O and API orchestration.

---

## Core Concepts (In Plain English)

### What is a Machine Learning Model?
A recipe book. You show it thousands of examples (training), and it learns the pattern. Later, when you give it new input, it follows the pattern to give you an answer.

### What is an API?
You already know this — it's the same `POST /api/...` pattern. The Python service exposes REST endpoints just like your Express backend. The only difference is, instead of querying MongoDB, it runs a model and returns the analysis.

### What is FastAPI?
Python's Express. Instead of:
```js
router.post('/', async (req, res) => { ... })
```
You write:
```python
@router.post("/")
async def analyze(req: Request): ...
```

### What is a Transformer / BERT?
A type of neural network that reads text like a human would — understanding context, not just keywords. BioBERT is BERT trained on medical research papers so it understands medical terminology.

### What is PyTorch?
Python's React — it's a framework. React manages UI state; PyTorch manages neural network training and inference.

---

## Milestone 0: Python Basics (Prerequisite)

Before touching AI, get comfortable with Python itself:

```python
# Variables (like JS let/const)
name = "Sarah"  # no const/let needed
age = 30

# Lists (like JS arrays)
patients = ["John", "Jane", "Bob"]
patients.append("Alice")

# Dicts (like JS objects)
patient = {"name": "John", "age": 45, "diagnosis": "Hypertension"}

# Functions (like JS functions)
def greet(name):
    return f"Hello, {name}"

# Async (like JS async/await)
async def fetch_data():
    result = await some_api_call()
    return result

# Type hints (like TypeScript but optional)
def add(a: int, b: int) -> int:
    return a + b
```

**Do this first:** Follow a 2-hour Python crash course. Understand functions, dicts, lists, async/await, and pip (Python's npm).

---

## Milestone 1: Build the Python Service Shell

**Goal:** Create a Python server that can talk to your existing Node.js backend.

**Why:** Like building a new Express app before writing routes.

### Step 1.1 — Project Setup

```bash
mkdir ai-service
cd ai-service
python -m venv .venv       # Creates isolated Python env (like node_modules)
.venv\Scripts\activate      # Activates it (Windows)
pip install fastapi uvicorn # FastAPI is Express, Uvicorn is the server
```

Create `main.py`:
```python
from fastapi import FastAPI

app = FastAPI(title="AI Clinic Service")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-python"}
```

Run it:
```bash
uvicorn main:app --reload   # Like nodemon
```

**What you learned:** How to start a Python web server. It's the same mental model as Express — define routes, return JSON.

### Step 1.2 — Add JWT Auth Middleware

Your Node.js backend validates JWTs. The Python service must do the same so not just anyone can call it.

**How it works:**
1. Frontend calls Node.js with JWT
2. Node.js proxies the request to Python, forwarding the JWT
3. Python verifies the JWT using the same `JWT_SECRET`

```python
from fastapi import Request, HTTPException
import jwt  # PyJWT library

SECRET = "your-jwt-secret"  # Same as .env

async def verify_token(request: Request):
    auth = request.headers.get("Authorization")
    if not auth:
        raise HTTPException(401, "No token")
    try:
        token = auth.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        request.state.user = payload  # Attach user info like req.user
    except:
        raise HTTPException(401, "Invalid token")
```

**What you learned:** JWT works the same in Python. You're just using `PyJWT` instead of `jsonwebtoken`.

### Step 1.3 — Create Node.js Proxy Routes

In your Express backend, create a thin proxy:

```js
// backend/src/services/aiPythonService.js
const axios = require('axios')

const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'

async function proxyToPython(endpoint, data, token) {
  const response = await axios.post(`${PYTHON_URL}/api/v1/${endpoint}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}
```

**What you learned:** The Python service is just another API your Node app talks to — like Stripe or OpenAI.

---

## Milestone 2: NLP Triage Engine

**What is NLP?**
Natural Language Processing — teaching computers to read text and extract meaning.

**What is "Triage"?**
In emergency rooms, triage means deciding who needs immediate help vs. who can wait. Green = stable, Yellow = urgent, Red = immediate.

### Step 2.1 — The Simple Version First

Before diving into AI models, build a keyword-based triage:

```python
# ai-service/app/triage/keyword_triage.py

RISK_KEYWORDS = {
    "immediate": [
        "chest pain", "difficulty breathing", "unconscious",
        "severe bleeding", "heart attack", "stroke"
    ],
    "urgent": [
        "high fever", "broken bone", "severe headache",
        "deep cut", "burn"
    ],
    "non-urgent": [
        "cold", "cough", "mild headache", "rash",
        "sore throat", "stomach ache"
    ]
}

def keyword_triage(symptoms: str) -> dict:
    symptoms_lower = symptoms.lower()
    
    for level, keywords in RISK_KEYWORDS.items():
        for keyword in keywords:
            if keyword in symptoms_lower:
                return {"triage_level": level, "method": "keyword"}
    
    return {"triage_level": "unknown", "method": "keyword"}
```

**What you learned:** Even simple rules can be useful. AI = rules that learn themselves from data.

### Step 2.2 — Upgrade to BioBERT (Real AI)

**What is BioBERT?**
A model trained on millions of medical research papers. It can read "chest pain radiating to left arm" and understand this sounds like a heart attack.

**How it works:**
1. You give it text
2. It converts words to numbers (embeddings)
3. Numbers flow through a neural network
4. Output = probabilities for each possible condition

```python
# pip install transformers torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# Load the model (like importing a library)
model_name = "emilyalsentzer/Bio_ClinicalBERT"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

def analyze_symptoms(text: str):
    # Step 1: Convert text to numbers the model understands
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    
    # Step 2: Run the model
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Step 3: Convert numbers back to probabilities
    probabilities = torch.nn.functional.softmax(outputs.logits, dim=1)
    
    return probabilities.tolist()[0]
```

**Analogy:** The tokenizer is like JSON.stringify — it converts data to a format the system can use. The model is like a giant `switch` statement with millions of cases that learned itself.

### Step 2.3 — The API Endpoint

```python
@router.post("/analyze/triage")
async def triage_analysis(data: TriageRequest):
    # data.symptoms = "chest pain radiating to left arm"
    # data.age = 55
    # data.gender = "male"
    
    result = triage_engine.analyze(data.symptoms, data.age, data.gender)
    
    return {
        "triage_level": result.level,       # "immediate"
        "confidence": result.confidence,     # 0.89
        "conditions": result.diagnoses,      # ["Heart Attack", "Aortic Dissection"]
        "recommendation": result.advice      # "Get ECG immediately"
    }
```

**What you learned:** An AI endpoint is just a regular API route that runs math instead of a database query.

---

## Milestone 3: Drug Interaction Checker

**What is a Drug Interaction?**
When two medications affect each other. For example, Warfarin (blood thinner) + Aspirin = dangerous bleeding risk. Doctors need to know this before prescribing.

### Step 3.1 — Build the Knowledge Base

This is NOT machine learning. It's just a lookup table — like a Mongo collection of interactions.

```python
# ai-service/app/drugs/data.py

DRUG_DB = {
    "warfarin": {
        "aspirin": {
            "severity": "major",
            "effect": "Increased bleeding risk",
            "recommendation": "Monitor INR, reduce dose"
        },
        "ibuprofen": {
            "severity": "major",
            "effect": "Increased bleeding risk",
            "recommendation": "Use alternative painkiller"
        }
    }
}

def check_interaction(drug_a: str, drug_b: str):
    a = drug_a.lower().strip()
    b = drug_b.lower().strip()
    
    # Check both directions (A→B and B→A)
    if a in DRUG_DB and b in DRUG_DB[a]:
        return DRUG_DB[a][b]
    if b in DRUG_DB and a in DRUG_DB[b]:
        return DRUG_DB[b][a]
    
    return None  # No known interaction
```

### Step 3.2 — Import Real Drug Data

Instead of manually typing interactions, download from a real source:

```bash
# Download RxNorm data (NIH's free drug database)
# https://rxnav.nlm.nih.gov/
```

**What you learned:** Not every AI feature requires a model. Sometimes it's just smart data.

### Step 3.3 — Integration Flow

When a doctor creates a prescription:
1. Frontend sends medicines to Node.js
2. Node.js calls Python: `POST /api/v1/analyze/interactions`
3. Python checks all pairs of medicines
4. If interactions found → Node.js returns a warning
5. Frontend shows warning in red before allowing submission

**Why this matters:** This is a real, useful feature that saves lives. It's also simple enough to build in a weekend.

---

## Milestone 4: X-Ray Image Analysis

**What is Computer Vision?**
Teaching computers to "see" — analyzing images instead of text.

### Step 4.1 — How Image Classification Works

An image is just a grid of numbers (pixels). Each pixel has RGB values (0-255).

```
[255, 0, 0]    [255, 255, 0]   [0, 255, 0]
[0, 0, 255]    [128, 0, 128]   [255, 255, 255]
```

A neural network processes this grid through layers, each layer detecting more complex patterns:
- Layer 1: detects edges (horizontal, vertical lines)
- Layer 2: detects shapes (circles, squares)  
- Layer 3: detects parts (lung shape, heart outline)
- Layer 4: detects abnormalities (fluid in lungs, enlarged heart)

### Step 4.2 — Using a Pre-trained Model

You don't need to train from scratch (that would take months and a supercomputer). Use a model someone else trained on 100,000+ chest X-rays:

```python
import torch
from torchvision import models, transforms
from PIL import Image

# Load pre-trained model
model = models.densenet121(pretrained=True)

# Preprocessing pipeline (like sanitizing input)
transform = transforms.Compose([
    transforms.Resize(224),         # Standard size
    transforms.ToTensor(),           # Convert to numbers
    transforms.Normalize(...)        # Normalize for better accuracy
])

def analyze_xray(image_bytes):
    img = Image.open(io.BytesIO(image_bytes))
    tensor = transform(img).unsqueeze(0)  # Add batch dimension
    
    with torch.no_grad():
        predictions = model(tensor)
    
    # predictions = [0.02, 0.91, 0.03, ...]
    # Each index = a condition (0=normal, 1=pneumonia, etc.)
    
    return {
        "findings": ["No acute abnormality", 0.94],
        "normal": True
    }
```

**What you learned:** Transfer learning = using a pre-trained model and adapting it to your use case. Like using React Bootstrap instead of writing CSS from scratch.

### Step 4.3 — API with File Upload

```python
@router.post("/analyze/xray")
async def analyze_xray(file: UploadFile = File(...)):
    contents = await file.read()
    result = xray_model.analyze(contents)
    return result
```

---

## Milestone 5: Patient Risk Stratification

**What is this?**
Predicting which patients are at risk of complications or readmission — like a weather forecast for patient health.

### Step 5.1 — What is XGBoost?

The "gold standard" for structured data (spreadsheets/tables). It builds many small decision trees and combines them:

```
Decision Tree 1:          Decision Tree 2:
Age > 65? ──Yes──► ...   Prior visits > 5? ──Yes──► ...
    │                          │
    └──No──► ...               └──No──► ...

Final = average of all trees
```

**Analogy:** Like asking 100 doctors for their opinion and averaging the results. Usually more accurate than any single doctor.

### Step 5.2 — Training Example

```python
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split

# Step 1: Get data (like querying MongoDB)
data = pd.read_csv("patient_data.csv")
# Columns: age, gender, visits_last_6mo, conditions_count, readmitted

# Step 2: Split into training and testing
X = data[["age", "visits_last_6mo", "conditions_count"]]
y = data["readmitted"]  # 0 = no, 1 = yes

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Step 3: Train the model
model = xgb.XGBClassifier()
model.fit(X_train, y_train)

# Step 4: Test accuracy
accuracy = model.score(X_test, y_test)
print(f"Model accuracy: {accuracy:.2%}")

# Step 5: Save the model
model.save_model("risk_model.json")
```

### Step 5.3 — Making Predictions

```python
model = xgb.XGBClassifier()
model.load_model("risk_model.json")

def predict_risk(patient_data: dict):
    features = [[
        patient_data["age"],
        patient_data["visits_last_6mo"],
        patient_data["conditions_count"]
    ]]
    
    risk = model.predict_proba(features)[0][1]  # Probability of readmission
    
    if risk > 0.7: level = "high"
    elif risk > 0.3: level = "moderate"
    else: level = "low"
    
    return {"risk_score": risk, "risk_level": level}
```

**What you learned:** Machine Learning = show examples → model learns pattern → make predictions on new data.

---

## Milestone 6: Report Generator (Using GROQ)

**What is this?**
Take doctor's messy notes and turn them into a structured SOAP format (Subjective, Objective, Assessment, Plan).

### Step 6.1 — Use GROQ (you already have the key)

```python
from groq import Groq

client = Groq(api_key="your-key")

def generate_report(notes: str, patient_info: dict):
    prompt = f"""
    Convert these doctor notes into a structured SOAP report.
    
    Patient: {patient_info['name']}, Age: {patient_info['age']}
    
    Notes: {notes}
    
    FORMAT:
    Subjective: [patient's reported symptoms]
    Objective: [vitals, physical findings]
    Assessment: [diagnosis]
    Plan: [treatment plan]
    """
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.choices[0].message.content
```

**What you learned:** LLMs are great at transforming unstructured text → structured text. This is "prompt engineering" — learning how to ask the AI to get useful results.

---

## Milestone 7: Put It All Together

### 7.1 — Docker Compose (like your docker-compose but for Python)

```yaml
services:
  ai-service:
    build: ./ai-service
    ports: ["8000:8000"]
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - GROQ_API_KEY=${GROQ_API_KEY}
  
  redis:
    image: redis:7-alpine  # Cache for drug lookup
```

### 7.2 — Full Request Flow

```
User fills form in React
  → POST /api/ai/python/analyze/triage (to Node.js)
    → Node verifies JWT
    → Node forwards to Python (http://ai-service:8000/api/v1/analyze/triage)
      → Python verifies JWT (same secret)
      → Python runs model analysis
      → Python returns JSON result
    → Node returns to frontend
  → User sees triage result
```

---

## Learning Roadmap Summary

| Milestone | What you'll learn | Time estimate | Difficulty |
|-----------|-------------------|--------------|------------|
| 0 | Python basics (vars, functions, async) | 2-3 days | Beginner |
| 1 | FastAPI, JWT auth, service architecture | 2-3 days | Easy (you know this pattern) |
| 2 | NLP, tokenization, BioBERT, transformers | 1 week | Medium |
| 3 | Drug databases, graph lookups, Redis cache | 3-4 days | Easy |
| 4 | Computer vision, PyTorch, DenseNet | 1 week | Hard |
| 5 | ML training, XGBoost, scikit-learn | 1 week | Medium |
| 6 | Prompt engineering, LLM integration | 2-3 days | Easy (you know GROQ) |
| 7 | Docker, deployment, full integration | 2-3 days | Medium |

**Total: ~4-6 weeks for a MERN developer learning AI from scratch.**

---

## Key Differences from MERN (Cheat Sheet)

| MERN Concept | Python Equivalent |
|-------------|-------------------|
| `npm install` | `pip install` |
| `package.json` | `pyproject.toml` or `requirements.txt` |
| `node_modules/` | `.venv/Lib/site-packages/` |
| Express | FastAPI |
| `nodemon` | `uvicorn --reload` |
| `req.body` | `data: RequestBody` |
| `axios.post()` | `httpx.AsyncClient().post()` |
| JSON | JSON (same format) |
| JWT (`jsonwebtoken`) | JWT (`PyJWT`) |
| TypeScript types | Python type hints |
| React state | No concept (Python is backend only) |

---

## Suggested Weekly Plan

**Week 1:** Python basics + Milestone 1
- Day 1-2: Python syntax, pip, virtual environments
- Day 3-4: FastAPI basics, routes, request validation
- Day 5: JWT auth in Python
- Day 6-7: Proxy integration with Node.js

**Week 2:** Milestone 2 (NLP)
- Day 1-2: Keyword triage (simple version)
- Day 3-4: Install transformers, play with BioBERT
- Day 5-7: Build triage API endpoint

**Week 3:** Milestones 3 + 4
- Day 1-2: Drug interaction lookup
- Day 3-4: Image basics with PIL/torchvision
- Day 5-7: X-ray model integration

**Week 4:** Milestones 5 + 6
- Day 1-3: XGBoost training
- Day 4-5: Risk prediction API
- Day 6-7: GROQ report generation

**Week 5:** Milestone 7 + Polish
- Docker, testing, documentation
- Integration testing with full stack

---

## Where to Start RIGHT NOW

```bash
# 1. Create the Python project
mkdir ai-service && cd ai-service
python -m venv .venv
.venv\Scripts\activate

# 2. Install minimal dependencies
pip install fastapi uvicorn PyJWT

# 3. Create main.py with a health endpoint
# 4. Run it: uvicorn main:app --reload
# 5. Verify: curl http://localhost:8000/health
# 6. Add a GET /api/v1/hello endpoint that returns {"message": "AI service is alive"}
# 7. In Node.js, create backend/src/services/aiPythonService.js that calls it

# THAT'S IT. You just built a Python AI service.
```
