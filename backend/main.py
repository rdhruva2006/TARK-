from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import EvaluationRequest, LogicAuditResponse
from bedrock_engine import evaluate_logic, get_expert_reveal
from pydantic import ValidationError
import traceback
import hashlib
import time

app = FastAPI(title="TARK Operations Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_SALT = "TARK_COGNITIVE_SALT_2026"
BLOOMS_LABELS = {1: "Remember", 2: "Understand", 3: "Apply", 4: "Analyze", 5: "Evaluate", 6: "Create"}

def generate_logic_hash(user_input: str, domain: str) -> str:
    raw_string = f"{user_input}|{domain}|{time.time()}|{SECRET_SALT}"
    return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()

def generate_mermaid_syntax(score: int, blooms_level: str, domain: str, is_bypass: bool = False) -> str:
    """Generate a dynamic Mermaid flowchart reflecting the actual audit path."""
    blooms_short = (blooms_level or "L1: Remember").replace("\"", "'")
    if is_bypass:
        return f"""graph TD
    A["User Input"] --> B["Socratic Filter"]
    B --> EO["⚡ Emergency Override"]
    EO --> FA["Expert Answer Revealed"]
    style A fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style B fill:#0f172a,stroke:#00f2fe,stroke-width:2px,color:#fff
    style EO fill:#1a1000,stroke:#eab308,stroke-width:3px,color:#eab308
    style FA fill:#0f172a,stroke:#eab308,stroke-width:2px,color:#fff"""
    elif score == 100:
        return f"""graph TD
    A["User Input"] --> B["Socratic Filter"]
    B --> BC["{blooms_short}"]
    BC --> P["✅ Crucible"]
    P --> POT["🏆 Proof of Thought"]
    style A fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style B fill:#0f172a,stroke:#00f2fe,stroke-width:2px,color:#fff
    style BC fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#fff
    style P fill:#0f172a,stroke:#22c55e,stroke-width:2px,color:#fff
    style POT fill:#1a1200,stroke:#eab308,stroke-width:3px,color:#eab308"""
    elif score < 40:
        return f"""graph TD
    A["User Input"] --> B["Socratic Filter"]
    B --> BC["{blooms_short}"]
    BC --> F["❌ Bloom's Rejection"]
    F --> CR["💥 Crash Simulation"]
    style A fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style B fill:#0f172a,stroke:#00f2fe,stroke-width:2px,color:#fff
    style BC fill:#0f172a,stroke:#ef4444,stroke-width:2px,color:#fff
    style F fill:#1a0000,stroke:#ef4444,stroke-width:3px,color:#ef4444
    style CR fill:#1a0000,stroke:#ef4444,stroke-width:2px,color:#fff"""
    else:
        return f"""graph TD
    A["User Input"] --> B["Socratic Filter"]
    B --> BC["{blooms_short}"]
    BC --> P["⚠️ Partial Pass"]
    P --> FB["Socratic Feedback"]
    style A fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style B fill:#0f172a,stroke:#00f2fe,stroke-width:2px,color:#fff
    style BC fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#fff
    style P fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#fff
    style FB fill:#0f172a,stroke:#22d3ee,stroke-width:2px,color:#fff"""

@app.post("/verify-logic", response_model=LogicAuditResponse)
async def verify_logic(request: EvaluationRequest):
    # === EMERGENCY REVEAL: I Give Up bypass ===
    if request.bypass_audit:
        try:
            raw_result = get_expert_reveal(request.domain, request.min_blooms_level, request.input)
            raw_result['domain'] = request.domain
            
            # The LLM sometimes hallucinates nested JSON objects instead of a flat string.
            # Force coercion to string to satisfy Pydantic Schema
            if 'final_answer' in raw_result and not isinstance(raw_result['final_answer'], str):
                import json
                raw_result['final_answer'] = json.dumps(raw_result['final_answer'])
                
            response = LogicAuditResponse.model_validate(raw_result)
            response.pot_hash = generate_logic_hash(request.input, request.domain)
            response.mermaid_syntax = generate_mermaid_syntax(100, f"Level {request.min_blooms_level}", request.domain, is_bypass=True)
            return response
        except Exception as e:
            print(f"[BYPASS ERROR] {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Expert reveal failed: {str(e)}")

    # === NORMAL AUDIT FLOW ===
    max_retries = 1

    for attempt in range(max_retries + 1):
        try:
            raw_result = evaluate_logic(request.input, request.domain, request.min_blooms_level)

            if isinstance(raw_result, dict):
                raw_result['domain'] = request.domain

            validated_response = LogicAuditResponse.model_validate(raw_result)

            # === Bloom's Strictness Server-Side Enforcement ===
            min_level = request.min_blooms_level
            blooms_response = validated_response.blooms_level or ""

            # L5-L6: Force 0 if model gave score > 0 but reasoning is shallow
            if min_level >= 5:
                achieved_low = any(f"Level {l}" in blooms_response for l in range(1, min_level))
                if achieved_low and validated_response.logic_score > 0:
                    validated_response.logic_score = 0
                    validated_response.simulation = (
                        f"CRITICAL SEQUENCE FAILURE: Level {min_level} ({BLOOMS_LABELS[min_level]}) "
                        f"requires multi-variable reasoning. Achieved: {blooms_response}. "
                        "One-dimensional analysis detected — complete cognitive collapse."
                    )

            # L3-L4: Cap at 40 if model gave higher but achieved level is below threshold
            elif min_level >= 3:
                achieved_low = any(f"Level {l}" in blooms_response for l in range(1, min_level))
                if achieved_low and validated_response.logic_score > 40:
                    validated_response.logic_score = 30
                    validated_response.simulation = (
                        f"BLOOM_CAP_VIOLATION: Level {min_level} ({BLOOMS_LABELS[min_level]}) "
                        f"requires concrete use-cases. Definitions only detected. "
                        f"Score capped at 30. Achieved: {blooms_response}."
                    )

            # Proof of Thought
            if validated_response.logic_score == 100:
                validated_response.pot_hash = generate_logic_hash(request.input, request.domain)

            # Attach dynamic flowchart
            validated_response.mermaid_syntax = generate_mermaid_syntax(
                validated_response.logic_score,
                validated_response.blooms_level or f"Level {request.min_blooms_level}",
                request.domain
            )

            return validated_response

        except ValidationError as ve:
            print(f"Pydantic Validation Error on attempt {attempt}: {ve}")
            if attempt < max_retries:
                continue
            raise HTTPException(status_code=500, detail="LLM failed to adhere to strict verification schema.")

        except Exception as e:
            print(f"System Error: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
