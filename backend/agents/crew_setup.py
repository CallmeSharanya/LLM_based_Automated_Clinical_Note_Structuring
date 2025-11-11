from crewai import Crew, Task
from .structuring_agent import structuring_agent
from .chat_agent import chat_agent
from .analytics_agent import analytics_agent, get_icd_statistics

import os
os.environ["CREWAI_DEFAULT_LLM_PROVIDER"] = "none"
os.environ.pop("OPENAI_API_KEY", None)

crew=Crew(agents=[structuring_agent, chat_agent, analytics_agent], name="Clinical EHR Assistant Crew", description="A crew of agents to handle EHR structuring, querying, and analytics tasks.")

structure_task = Task(agent=structuring_agent, description="Structure uploaded clinical note.")
chat_task = Task(agent=chat_agent, description="Respond to user’s clinical queries.")
analytics_task = Task(agent=analytics_agent, description="Generate ICD code statistics report.")

def run_full_pipeline():
    crew.run([structure_task, chat_task, analytics_task])
    stats = get_icd_statistics()
    return {"status":"Crew run complete", "icd_stats":stats}