import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from agent import get_agent
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TransitOps Agent Service", version="0.1.0")

class PlanRequest(BaseModel):
    goal: str
    cargoWeight: float
    region: Optional[str] = None

class PlanResponse(BaseModel):
    success: bool
    plan: Optional[str] = None
    steps: List[Dict[str, Any]] = []
    error: Optional[str] = None

agent = None

@app.on_event("startup")
def startup_event():
    global agent
    try:
        agent = get_agent()
    except Exception as e:
        print(f"Error loading agent on startup: {str(e)}")

@app.post("/plan", response_model=PlanResponse)
async def plan_trip(request: PlanRequest):
    global agent
    if agent is None:
        try:
            agent = get_agent()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Agent not initialized: {str(e)}")
            
    try:
        inputs = {"messages": [("user", f"Goal: {request.goal}. Weight: {request.cargoWeight} kg. Region: {request.region or 'Any'}.")]}
        config = {"recursion_limit": 25} 
        
        result = agent.invoke(inputs, config=config)
        
        steps = []
        messages = result.get("messages", [])
        
        for msg in messages:
            msg_type = msg.__class__.__name__
            step_data = {
                "role": "assistant" if msg_type == "AIMessage" else ("user" if msg_type == "HumanMessage" else "tool"),
                "content": msg.content,
            }
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                step_data["tool_calls"] = msg.tool_calls
            if msg_type == "ToolMessage":
                step_data["name"] = msg.name
                step_data["tool_id"] = msg.tool_call_id
                
            steps.append(step_data)
            
        final_plan = messages[-1].content if messages else "No plan generated"
        
        return PlanResponse(
            success=True,
            plan=final_plan,
            steps=steps
        )
    except Exception as e:
        return PlanResponse(
            success=False,
            error=str(e),
            steps=[]
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
