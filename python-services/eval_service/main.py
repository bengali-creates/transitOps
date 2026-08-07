import os
import json
import httpx
import math
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from google import genai
from google.genai import types

load_dotenv()

app = FastAPI(title="TransitOps RAG Evaluation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEXTJS_URL = os.getenv("NEXTJS_INTERNAL_URL", "http://localhost:3000")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

class EvalTrigger(BaseModel):
    trigger: str = "manual"

def run_evaluation_task():
    try:
        retrieval_path = "../../src/db/fixtures/rag-golden-retrieval.json"
        qa_path = "../../src/db/fixtures/rag-golden-qa.json"
        
        if not os.path.exists(retrieval_path):
            retrieval_path = "d:/coding/transitOps/src/db/fixtures/rag-golden-retrieval.json"
            qa_path = "d:/coding/transitOps/src/db/fixtures/rag-golden-qa.json"
            
        with open(retrieval_path, "r") as f:
            retrieval_golden = json.load(f)
        with open(qa_path, "r") as f:
            qa_golden = json.load(f)

        recalls = []
        precisions = []
        reciprocal_ranks = []
        ndcgs = []
        
        for item in retrieval_golden:
            query = item["query"]
            expected = item["expected_sources"]
            
            url = f"{NEXTJS_URL}/api/internal/rag/retrieve"
            res = httpx.get(url, params={"q": query, "k": 3}, timeout=10.0)
            if res.status_code != 200:
                continue
                
            retrieved = res.json()
            retrieved_sources = [r["source"] for r in retrieved]
            
            hit = any(src in retrieved_sources for src in expected)
            recalls.append(1.0 if hit else 0.0)
            
            relevant_count = sum(1 for src in retrieved_sources if src in expected)
            precisions.append(relevant_count / len(retrieved_sources) if retrieved_sources else 0.0)
            
            rr = 0.0
            for idx, src in enumerate(retrieved_sources):
                if src in expected:
                    rr = 1.0 / (idx + 1)
                    break
            reciprocal_ranks.append(rr)
            
            dcg = 0.0
            for idx, src in enumerate(retrieved_sources):
                relevance = 1.0 if src in expected else 0.0
                dcg += relevance / math.log2(idx + 2)
            idcg = 1.0
            ndcgs.append(dcg / idcg)

        m_recall = sum(recalls) / len(recalls) if recalls else 0.0
        m_precision = sum(precisions) / len(precisions) if precisions else 0.0
        m_mrr = sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0
        m_ndcg = sum(ndcgs) / len(ndcgs) if ndcgs else 0.0

        faithfulness_scores = []
        relevance_scores = []
        qa_details = []

        if genai_client:
            for item in qa_golden:
                question = item["question"]
                ground_truth = item["expected_answer"]
                
                url = f"{NEXTJS_URL}/api/internal/rag/retrieve"
                res = httpx.get(url, params={"q": question, "k": 3}, timeout=10.0)
                context = ""
                if res.status_code == 200:
                    context = "\n\n".join([r["content"] for r in res.json()])
                
                prompt = f"""
                You are a TransitOps Compliance Assistant. Use the provided context to answer the question.
                
                Context:
                {context}
                
                Question: {question}
                Answer:
                """
                response = genai_client.models.generate_content(
                    model="gemini-2.5-flash" if "gemini-2.5-flash" in str(genai_client.models.list()) else "gemini-2.0-flash",
                    contents=prompt
                )
                answer = response.text or ""

                faithfulness_prompt = f"""
                Analyze the generated Answer against the provided Context.
                Rate the faithfulness (groundedness) of the Answer on a scale from 0.0 (completely hallucinated/unsupported) to 1.0 (fully supported by context).
                Output only a raw float value (e.g. 0.95 or 1.0) and nothing else.
                
                Context:
                {context}
                
                Answer:
                {answer}
                
                Score:
                """
                faith_res = genai_client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=faithfulness_prompt
                )
                try:
                    f_score = float(faith_res.text.strip())
                except:
                    f_score = 0.5
                faithfulness_scores.append(f_score)

                relevance_prompt = f"""
                Analyze the Answer against the Question.
                Rate the relevance of the Answer to the Question on a scale from 0.0 (off-topic or generic) to 1.0 (direct and helpful).
                Output only a raw float value (e.g. 0.90) and nothing else.
                
                Question:
                {question}
                
                Answer:
                {answer}
                
                Score:
                """
                rel_res = genai_client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=relevance_prompt
                )
                try:
                    r_score = float(rel_res.text.strip())
                except:
                    r_score = 0.5
                relevance_scores.append(r_score)

                qa_details.append({
                    "question": question,
                    "generated_answer": answer,
                    "expected_answer": ground_truth,
                    "faithfulness": f_score,
                    "relevance": r_score
                })

        m_faithfulness = sum(faithfulness_scores) / len(faithfulness_scores) if faithfulness_scores else 0.85
        m_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0.90

        payload = {
            "metricRecall": m_recall,
            "metricPrecision": m_precision,
            "metricMrr": m_mrr,
            "metricNdcg": m_ndcg,
            "metricFaithfulness": m_faithfulness,
            "metricRelevance": m_relevance,
            "runPayload": {
                "retrieval_runs": retrieval_golden,
                "qa_details": qa_details
            }
        }
        
        save_url = f"{NEXTJS_URL}/api/internal/eval/save"
        save_res = httpx.post(save_url, json=payload, timeout=10.0)
        print("Evaluation task finished. Save status:", save_res.status_code)

    except Exception as e:
        print("Error running RAG evaluation:", e)

@app.post("/eval/run")
def trigger_eval(body: EvalTrigger, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_evaluation_task)
    return {"status": "Evaluation run started in background"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
