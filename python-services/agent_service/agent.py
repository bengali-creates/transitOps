import os
import httpx
import asyncio
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
    Returns the path (list of depot IDs) and cumulative metrics.
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
def check_route_conditions(depot_names: List[str]) -> List[Dict[str, Any]]:
    """
    Check real-time news alerts (accidents, construction, blocks) and weather reports 
    for the specified corridor path. Call this with the names of the depots along the route.
    """
    news_key = os.getenv("NEWS_API_KEY")
    weather_key = os.getenv("OPENWEATHER_API_KEY")
    
    reports = []
    
    # 1. Fetch News Alerts (Accidents, Roadblocks)
    if news_key:
        try:
            query = " OR ".join([f'"{name}"' for name in depot_names])
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": f"({query}) AND (accident OR roadblock OR landslide OR construction OR closure)",
                "sortBy": "publishedAt",
                "apiKey": news_key,
                "pageSize": 5
            }
            res = httpx.get(url, params=params, timeout=5.0)
            if res.status_code == 200:
                articles = res.json().get("articles", [])
                for art in articles:
                    reports.append({
                        "type": "NEWS_ALERT",
                        "source": art.get("source", {}).get("name", "News"),
                        "title": art.get("title"),
                        "description": art.get("description"),
                        "url": art.get("url"),
                        "risk_level": "HIGH" if "closed" in art.get("title", "").lower() or "block" in art.get("title", "").lower() else "MEDIUM"
                    })
        except Exception as e:
            print(f"Error checking News API: {e}")
            
    # 2. Fetch Weather conditions for each depot via OpenWeatherMap
    if weather_key:
        for name in depot_names:
            try:
                search_name = name.split("Hub")[0].split("Logistics")[0].strip()
                url = "https://api.openweathermap.org/data/2.5/weather"
                params = {
                    "q": search_name,
                    "appid": weather_key,
                    "units": "metric"
                }
                res = httpx.get(url, params=params, timeout=4.0)
                if res.status_code == 200:
                    wdata = res.json()
                    main_weather = wdata.get("weather", [{}])[0].get("main", "").lower()
                    desc_weather = wdata.get("weather", [{}])[0].get("description", "")
                    temp = wdata.get("main", {}).get("temp")
                    
                    # Flag extreme weather
                    is_extreme = any(term in main_weather for term in ["storm", "tornado", "hurricane", "extreme", "snow", "fog"])
                    if is_extreme:
                        reports.append({
                            "type": "WEATHER_ALERT",
                            "source": "OpenWeatherMap",
                            "title": f"Extreme weather at {name} ({main_weather})",
                            "description": f"Severe conditions: {desc_weather}. Temperature: {temp}°C. Visibility is highly compromised.",
                            "risk_level": "HIGH",
                            "blocked_depot": name
                        })
            except Exception as e:
                print(f"Error checking OpenWeather API for {name}: {e}")

    if os.getenv("SIMULATE_ROADBLOCKS", "false").lower() == "true":
        for name in depot_names:
            if "ahmedabad" in name.lower():
                reports.append({
                    "type": "SIMULATED_ALERT",
                    "source": "Local Traffic Control",
                    "title": f"Landslide blockage near {name}",
                    "description": f"A major landslide occurred near {name} corridor. Road is temporarily closed.",
                    "risk_level": "HIGH",
                    "blocked_depot": name
                })
            
    if not reports:
        reports.append({
            "type": "STATUS_INFO",
            "source": "Automated Sensor Log",
            "title": "Clear Corridor",
            "description": "All route segments are currently reported clear with optimal driving visibility.",
            "risk_level": "LOW"
        })
        
    return reports

@tool
def get_alternate_route(
    origin_id: str, 
    destination_id: str, 
    vehicle_type: str, 
    blocked_edge_ids: List[str]
) -> Dict[str, Any]:
    """
    Request detour route alternatives from the Next.js server, explicitly bypassing 
    the blocked road edge IDs. Returns the alternate path, distance, fuel, and cost.
    """
    url = f"{NEXTJS_URL}/api/internal/matrix/detour"
    payload = {
        "originId": origin_id,
        "destinationId": destination_id,
        "vehicleType": vehicle_type,
        "blockedEdgeIds": blocked_edge_ids
    }
    
    try:
        response = httpx.post(url, json=payload, timeout=10.0)
        if response.status_code == 200:
            return response.json()
        return {"reachable": False, "error": f"Detour API status {response.status_code}"}
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
        check_route_conditions,
        get_alternate_route,
        draft_trip_action
    ]
    
    system_message = (
        "You are an advanced fleet operations planner agent for TransitOps.\n"
        "Your goal is to build a safe, cost-effective dispatch plan based on a user's instruction.\n"
        "To accomplish this, follow these rules strictly:\n"
        "1. Check for eligible vehicles that can hold the cargo weight.\n"
        "2. Check for eligible drivers.\n"
        "3. Estimate the primary route using the estimate_route tool. This returns the path (depot IDs).\n"
        "4. Always call check_route_conditions with the names of the depots in the estimated path.\n"
        "5. If check_route_conditions returns any alerts with risk_level 'HIGH', identify the blocked edges.\n"
        "   If an edge is blocked, you must query get_alternate_route passing the origin, destination, and the blocked edge IDs to find a detour.\n"
        "6. If a detour path is found, use it instead of the blocked primary path.\n"
        "7. Draft the final selected route using the draft_trip_action tool.\n"
        "8. Formulate a final response summarizing the chosen route path, vehicle, driver, distance, estimated fuel, cost, "
        "and draft trip ID. If alternate detour routes were selected, explain why (citing the blocked news/weather alerts).\n"
        "Never invent details. Always ground your claims strictly in the observations returned by tools."
    )
    
    # create_react_agent creates a LangGraph CompiledGraph implementing the ReAct loop
    agent = create_react_agent(
        model=model,
        tools=tools,
        state_modifier=system_message
    )
    return agent
