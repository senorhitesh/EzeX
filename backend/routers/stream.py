import os
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, AsyncGenerator
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

router = APIRouter()

class StreamRequest(BaseModel):
    code: str = Field(description="Provide the code for refactor, find bugs and to understand.")
    language: str = Field(description="Select the Programming Language to get help.")
    prompt: str = Field(description="Specify your query.")
    message: List[Dict[str, Any]] = Field(default=[], description="Previous message history list")
    mode: str = Field(default="chat", description="Modes: 'refactor', 'bugs', or 'chat'")


def build_system_prompt(language: str, mode: str) -> str:
    if mode == "refactor":
        return (
            f"You are an Expert Coding Assistant in {language}. Help refactor their code, "
            "identify security issues, fill loopholes, increase code quality, and optimize structure. "
            "CRITICAL: You must return valid raw JSON matching this structure: "
            '{"explanation": "brief description of all changes made", "refactored_code": "the complete refactored code here"}'
        )
    if mode == "bugs":
        return (
            f"You are an Expert Coding Assistant in {language}. Find bugs, runtime issues, security gaps, "
            "and structural errors. Outline exactly where this code could fail in production. "
            "CRITICAL: You must return valid raw JSON matching this structure: "
            '{"has_bugs": true, "bugs": [{"line": 1, "severity": "critical", "issue": "description", "fix": "How to fix"}], "problem_using_this": "General summary of breaking risks"}'
        )

    return (
        f"You are an Expert Coding Assistant in {language}. Explain code, answer programming architecture questions, "
        "and suggest clean optimization structures based strictly on the user query. "
        "CRITICAL: You must return valid raw JSON matching this structure: "
        '{"explanation": "Here is what you asked", "changes": "the code snippet or change here"}'
    )


def build_user_message(code: str, language: str, prompt: str) -> str:
    return (
        f"Here is my {language} code:\n"
        f"```{language}\n"
        f"{code}\n"
        f"```\n\n"
        f"User Query: {prompt}"
    )


async def stream_gemini(request: StreamRequest) -> AsyncGenerator[str, None]:
    # Use the asynchronous namespace client.aio for FastAPI concurrency compliance
    client = genai.Client()
    
    # 1. Evaluate the system instructions dynamically based on user input flags
    system_prompt_string = build_system_prompt(request.language, request.mode)
    
    # 2. Configure output types using native JSON constraints
    config = types.GenerateContentConfig(
        system_instruction=system_prompt_string,
        temperature=0.2,  # Low temperature makes code generation deterministic and reliable
        response_mime_type="application/json",
    )
    
    # 3. Assemble full runtime payload (History + New Input context payload)
    contents = []
    for msg in request.message:
        # Expected shape per message: {"role": "user"/"model", "parts": ["text content"]}
        contents.append(
            types.Content(
                role=msg.get("role", "user"),
                parts=[types.Part.from_text(text=msg.get("content", ""))]
            )
        )
    
    # Construct and append current prompt context block
    current_prompt = build_user_message(request.code, request.language, request.prompt)
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=current_prompt)]
        )
    )

    try:
        # Using gemini-2.5-flash as default, or use gemini-2.5-pro for high complexity code structural analysis
        response_stream = await client.aio.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=contents,
            config=config
        )
        
        async for chunk in response_stream:
            if chunk.text:
                yield f"data: {chunk.text}\n\n"
                
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@router.post("/stream")
async def stream_endpoint(request: StreamRequest):
    return StreamingResponse(
        stream_gemini(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # Disables proxy caching layers (like Nginx) from choking your stream
            "Connection": "keep-alive"
        }
    )