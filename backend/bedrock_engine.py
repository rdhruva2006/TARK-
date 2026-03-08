import os
import json
import json_repair
import boto3
import re
from dotenv import load_dotenv

BLOOMS_LABELS = {
    1: "Remember",
    2: "Understand",
    3: "Apply",
    4: "Analyze",
    5: "Evaluate",
    6: "Create"
}

def _make_client():
    """Initialize and return a Bedrock Runtime client using .env credentials."""
    load_dotenv()
    region = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
    kwargs = {'service_name': 'bedrock-runtime', 'region_name': region}
    key = os.environ.get('AWS_ACCESS_KEY_ID')
    secret = os.environ.get('AWS_SECRET_ACCESS_KEY')
    token = os.environ.get('AWS_SESSION_TOKEN')
    if key and secret:
        kwargs['aws_access_key_id'] = key
        kwargs['aws_secret_access_key'] = secret
        if token:
            kwargs['aws_session_token'] = token
    return boto3.client(**kwargs)


def extract_json_payload(raw_text: str) -> dict:
    """
    Robustly extract a JSON object from raw LLM output.
    Uses json_repair to handle common LLM mistakes like unescaped quotes,
    trailing commas, or missing braces.
    """
    print(f"[BEDROCK RAW] {repr(raw_text[:600])}")

    # Strip markdown fences
    clean = re.sub(r'```(?:json)?\s*', '', raw_text).replace('```', '').strip()

    # Try to find the outermost JSON object
    try:
        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if match:
            json_str = match.group(0)
            
            # Use json_repair to robustly parse the LLM's broken JSON string
            repaired_dict = json_repair.loads(json_str)
            
            if isinstance(repaired_dict, dict):
                return repaired_dict
            else:
                print(f"[EXTRACT] json_repair returned non-dict: {type(repaired_dict)}")
                return {"logic_score": 0, "feedback": f"LLM returned invalid structure: {str(repaired_dict)[:250]}", "assumptions": []}

        else:
            print(f"[EXTRACT] No JSON braces found. Raw: {clean[:300]}")
            return {"logic_score": 0, "feedback": f"LLM returned unstructured response: {clean[:250]}", "assumptions": []}
    except json.JSONDecodeError as e:
        print(f"[EXTRACT] Final JSONDecodeError: {e}. Snippet: {clean[:300]}")
        return {"logic_score": 0, "feedback": f"JSON parse error: {str(e)}", "assumptions": []}
    except Exception as e:
        print(f"[EXTRACT] Unexpected: {e}")
        return {"logic_score": 0, "feedback": str(e), "assumptions": []}


def _call_model(client, system_prompt: str, user_input: str) -> str:
    """Send a prompt to the Bedrock Converse API and return the raw text."""
    model_id = "us.meta.llama3-1-8b-instruct-v1:0"
    try:
        response = client.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": user_input}]}],
            system=[{"text": system_prompt}],
            inferenceConfig={"temperature": 0.0}
        )
        return response['output']['message']['content'][0]['text']
    except AttributeError:
        # Fallback for older boto3 versions
        prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            f"{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"{user_input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
        )
        body = json.dumps({"prompt": prompt, "max_gen_len": 1024, "temperature": 0.0, "top_p": 0.9})
        resp = client.invoke_model(
            modelId=model_id, body=body,
            accept="application/json", contentType="application/json"
        )
        return json.loads(resp.get("body").read()).get("generation", "")


def evaluate_logic(user_input: str, domain: str, min_blooms_level: int = 1) -> dict:
    """Main evaluation: grades user reasoning strictly against the required Bloom's level."""
    client = _make_client()
    blooms_label = BLOOMS_LABELS.get(int(min_blooms_level), "Remember")

    system_prompt = f"""You are a ruthless Socratic Auditor for domain: {domain}.
Cognitive Strictness: Level {min_blooms_level}/6 — [{blooms_label.upper()}]

=== LINEAR MULTIPLIER SCORING RULES (STRICT) ===

LEVEL 1-2 (Remember / Understand):
  - Acceptable: Definitions, recall, basic explanations.
  - Max score: 100 if fully correct. Penalize incorrect facts heavily.

LEVEL 3-4 (Apply / Analyze):
  - REJECT pure definitions. The user MUST show a specific use-case, concrete example, or architectural analysis.
  - If the user only provides a definition or says what something IS without demonstrating HOW/WHY it works in practice: CAP score at 40, trigger simulation crash.
  - Acceptable: "A binary search runs on sorted arrays because the midpoint elimination halves the search space, giving O(log n) — useful when index lookups must beat O(n) in large datasets."

LEVEL 5-6 (Evaluate / Create):
  - REJECT single-variable reasoning. The user MUST weigh MULTIPLE competing factors (e.g., time vs. memory, throughput vs. latency, scalability vs. cost).
  - If reasoning is one-dimensional (only mentions one trade-off): FORCE score = 0, feedback = "Critical Sequence Failure", trigger simulation crash.
  - Acceptable: "React's reconciliation is faster for DOM-heavy UIs but increases memory overhead vs. vanilla JS. For mobile-first apps, the bundle weight (React ~42KB gzipped) must be justified by team productivity gains."

DOMAIN FAILURE MODES:
  - Coding: race conditions, O(n²) hidden complexity, memory leaks, edge cases.
  - Banking: APR miscalculation, unrealistic ROI, compounding errors, liquidity risk.
  - Studies: confirmation bias, logical fallacies, strawman arguments, correlation ≠ causation.

HINGLISH: Treat Hinglish (Hindi + English) as formal pseudocode. Evaluate logic structure, not language.

Output ONLY a single raw JSON object — zero prose before or after. Keys:
- "logic_score": integer 0-100
- "blooms_level": string like "Level {min_blooms_level}: {blooms_label}"
- "feedback": string (Socratic critique, 2-4 sentences)
- "simulation": string (Virtual System Crash, required if score < 85, else null)
- "assumptions": array of strings (hidden dangerous premises found)
- "analogy": string or null
"""

    raw_text = _call_model(client, system_prompt, user_input)
    return extract_json_payload(raw_text)


def get_expert_reveal(domain: str, min_blooms_level: int, user_input: str) -> dict:
    """
    Emergency Reveal: bypasses scoring and returns the expert-level perfect answer
    for the given domain and Bloom's level.
    """
    client = _make_client()
    blooms_label = BLOOMS_LABELS.get(int(min_blooms_level), "Remember")

    system_prompt = f"""You are the world's foremost expert in {domain}.
The user has requested the definitive expert answer at Bloom's Level {min_blooms_level} ({blooms_label}).

Provide the PERFECT reasoning for their question at this cognitive level.
Your answer must demonstrate exactly what a Level {min_blooms_level} response looks like.
Be specific, concrete, and educational.

Output ONLY a single raw JSON object. Keys:
- "logic_score": 100
- "blooms_level": "Level {min_blooms_level}: {blooms_label}"
- "feedback": string (the expert answer / perfect reasoning \u2014 3-6 sentences)
- "final_answer": string (structured expert solution for the specific question asked)
- "simulation": null
- "assumptions": []
- "analogy": string (a memorable analogy for this concept)
"""

    user_msg = f"Show me the perfect Level {min_blooms_level} ({blooms_label}) answer for: {user_input}"
    raw_text = _call_model(client, system_prompt, user_msg)
    return extract_json_payload(raw_text)


if __name__ == "__main__":
    pass
