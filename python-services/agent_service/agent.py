import os
import httpx
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

load_dotenv()

NEXTJS_URL = os.getenv("NEXTJS_INTERNAL_URL", "http://localhost:3000")

@tool
def get_eligible_vehicles(cargo_weight: float, region: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all vehicles that are currently 'available' and have a maximum load capacity 
    greater than or equal to the cargo weight specified. Can optionally filter by region.
    """
    url = f"{NEXTJS_URL}/api/internal/eligible"
    params = {"type": "vehicles", "cargoWeight": cargo_weight}
    if region:
        params["region"] = region
    
    try:
        response = httpx.get(url, params=params, timeout=10.0)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        return [{"error": f"Failed to connect to Next.js API: {str(e)}"}]

@tool
def get_eligible_drivers(region: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all drivers that are currently 'available' and have a valid (unexpired) 
    driving license. Can optionally filter by region.
    """
    url = f"{NEXTJS_URL}/api/internal/eligible"
    params = {"type": "drivers"}
    if region:
        params["region"] = region
    
    try:
        response = httpx.get(url, params=params, timeout=10.0)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        return [{"error": f"Failed to connect to Next.js API: {str(e)}"}]

@tool
def estimate_route(origin_id: str, destination_id: str, vehicle_type: str) -> Dict[str, Any]:
    """
    Look up the precomputed shortest path, distance, toll cost, estimated fuel, and 
    estimated cost between two depots using the Floyd-Warshall matrix service.
    """
    url = f"{NEXTJS_URL}/api/internal/matrix"
    params = {
        "originId": origin_id,
        "destinationId": destination_id,
        "vehicleType": vehicle_type
    }
    
    try:
        response = httpx.get(url, params=params, timeout=10.0)
        if response.status_code == 200:
            return response.json()
        return {"reachable": False, "error": f"Status code {response.status_code}"}
    except Exception as e:
        return {"reachable": False, "error": str(e)}

@tool
def draft_trip_action(
    vehicle_id: str, 
    driver_id: str, 
    source: str, 
    destination: str, 
    cargo_weight: float, 
    planned_distance: float
) -> Dict[str, Any]:
    """
    Create a draft trip record in the database. Returns the newly created trip ID.
    The agent does not change operational status (e.g. dispatching or complete) — 
    it only creates a draft to be accepted or modified by the user.
    """
    url = f"{NEXTJS_URL}/api/internal/trips/draft"
    payload = {
        "vehicleId": vehicle_id,
        "driverId": driver_id,
        "source": source,
        "destination": destination,
        "cargoWeight": cargo_weight,
        "plannedDistance": planned_distance
    }
    
    try:
        response = httpx.post(url, json=payload, timeout=10.0)
        if response.status_code == 200:
            return response.json()
        return {"success": False, "error": f"Status code {response.status_code}: {response.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_agent():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY environment variable")
    
    model = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash",
        google_api_key=api_key,
        temperature=0.1
    )
    
    tools = [
        get_eligible_vehicles, 
        get_eligible_drivers, 
        estimate_route, 
        draft_trip_action
    ]
    
    system_message = (
        "You are an advanced fleet operations planner agent for TransitOps.\n"
        "Your goal is to build a dispatch plan based on a user's instruction.\n"
        "To accomplish this, follow these rules strictly:\n"
        "1. Check for eligible vehicles that can hold the cargo weight.\n"
        "2. Check for eligible drivers.\n"
        "3. Estimate the route distance, cost, and fuel using the estimate_route tool.\n"
        "4. If a valid vehicle, driver, and route exist, draft the trip using the draft_trip_action tool.\n"
        "5. Formulate a final response summarizing the vehicle, driver, distance, estimated fuel, cost, "
        "and draft trip ID. If no solution is possible, explain which constraint failed.\n"
        "Never invent details. Always ground your claims strictly in the observations returned by tools."
    )
    
    # create_react_agent creates a LangGraph CompiledGraph implementing the ReAct loop
    agent = create_react_agent(
        model=model,
        tools=tools,
        state_modifier=system_message
    )
    return agent
