import os
import requests
from config import Config
from langchain_community.utilities import SQLDatabase
from langchain_community.llms import Ollama
from langchain_classic.chains import create_sql_query_chain
from langchain_core.prompts import PromptTemplate
from langchain_core.language_models.llms import LLM
from typing import Any, List, Mapping, Optional
from langchain_core.callbacks.manager import CallbackManagerForLLMRun

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DB_URI = Config.SQLALCHEMY_DATABASE_URI
if DB_URI.startswith("sqlite:///") and not DB_URI.startswith("sqlite:////") and not DB_URI.startswith("sqlite:///instance/"):
    DB_URI = "sqlite:///instance/billing.db"

class GeminiLLM(LLM):
    api_key: str
    model_name: str = "gemini-flash-lite-latest"
    temperature: float = 0.1

    @property
    def _llm_type(self) -> str:
        return "gemini"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self.temperature
            }
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            raise ValueError(f"Error calling Gemini API: {str(e)}")

def is_ollama_running():
    try:
        response = requests.get(OLLAMA_URL, timeout=2)
        return response.status_code == 200
    except:
        return False

def get_billing_answer(user_id, question):
    if not GEMINI_API_KEY and not is_ollama_running():
        return "I am unable to reach either the Google Gemini API (GEMINI_API_KEY not set) or the local AI engine (Ollama is not running)."

    try:
        # Check if this is a negotiation request
        is_negotiation = any(word in question.lower() for word in ["negotiat", "discount", "waiver", "reduce", "refund", "cheaper", "negotiate", "offer", "coupon", "lower my bill", "too high"])
        
        if is_negotiation:
            from models import User, Invoice, StorageObject
            user = User.query.get(user_id)
            invoices = Invoice.query.filter_by(user_id=user_id).all()
            total_spent = sum(inv.total_amount for inv in invoices)
            file_count = StorageObject.query.filter_by(user_id=user_id).count()
            
            if GEMINI_API_KEY:
                llm = GeminiLLM(api_key=GEMINI_API_KEY, temperature=0.3)
            else:
                llm = Ollama(base_url=OLLAMA_URL, model="mistral", temperature=0.3)
            
            negotiation_prompt = f"""You are the Smart Bill Negotiation Bot for BillFlow.
The user ({user.username}) wants to negotiate their bill or is asking for discounts/waivers.
Here is their profile context:
- Total spent historically: ₹{total_spent:.4f}
- Number of active files: {file_count}
- Account Type: Free Tier

As a negotiation bot, you have the authority to:
1. Suggest they use the "Zero-Waste Storage Optimizer" to clean up duplicate/stale files, which can reduce their storage footprint and save them money.
2. Offer a one-time 15% discount code "BILLFLOW15" if they are struggling with storage costs.
3. Recommend they set a monthly budget limit under the Billing section to prevent future bill shock.

Write a professional, empathetic, and persuasive response negotiating with the user. Address them by their username. Keep it concise.
User's Question: {question}
Response:"""
            res = llm.invoke(negotiation_prompt)
            return res.strip()

        db = SQLDatabase.from_uri(DB_URI)
        if GEMINI_API_KEY:
            llm = GeminiLLM(api_key=GEMINI_API_KEY, temperature=0.1)
        else:
            llm = Ollama(base_url=OLLAMA_URL, model="mistral", temperature=0.1)
        
        template = f"""You are a helpful AI billing assistant for BillFlow.
You have access to a SQLite database. 
CRITICAL RULE: You must ONLY query information where user_id = {user_id}. 

Tables available:
- usage_logs (user_id, date, storage_used, api_calls)
- invoices (user_id, month, total_amount, storage_cost, api_cost, status)
- objects (user_id, filename, file_size, uploaded_at)

Based on the database schema, write a SQL query to answer the user's question.
Return ONLY the raw SQL query, no markdown formatting.

Database Dialect: {{dialect}}

Available Tables:
{{table_info}}

Return at most {{top_k}} results.

Question: {{input}}
SQL Query:"""
        
        prompt = PromptTemplate(
            input_variables=["input", "table_info", "top_k", "dialect"],
            template=template
        )
        chain = create_sql_query_chain(llm, db, prompt=prompt)
        
        sql_query = chain.invoke({"question": question})
        sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
        
        result = db.run(sql_query)
        
        answer_prompt = PromptTemplate.from_template(
            "You are a helpful, conversational billing assistant for the BillFlow app.\n"
            "Given the user's question and the data retrieved from the database, write a natural, concise answer.\n"
            "Question: {question}\n"
            "Data Result: {result}\n"
            "Answer:"
        )
        
        answer_chain = answer_prompt | llm
        final_answer = answer_chain.invoke({"question": question, "result": result})
        
        return final_answer.strip()
        
    except Exception as e:
        return f"I'm sorry, I encountered an error while analyzing your billing data: {str(e)}"
