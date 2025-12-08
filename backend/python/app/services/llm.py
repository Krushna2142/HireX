from typing import List, Dict

# Placeholder stub. Replace with vLLM/TGI/OpenAI later.
def llm_chat(messages: List[Dict[str, str]]) -> str:
  user_msgs = [m["content"] for m in messages if m["role"] == "user"]
  last = user_msgs[-1] if user_msgs else "Hello"
  return f"AI (stub): You said: {last}. I can analyze resumes, recommend roles, and explain job descriptions."