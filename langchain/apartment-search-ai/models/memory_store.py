from langchain.memory import ConversationBufferWindowMemory
from typing import Dict, List, Any, Optional
import json
import os
from datetime import datetime

class AgentMemoryManager:
    """Memory manager for agent conversations"""
    
    def __init__(self, agent_name: str, max_history: int = 15, persist_dir: str = "./agent_memory"):
        """
        Initialize a memory manager for an agent
        
        Args:
            agent_name: Unique name of the agent
            max_history: Maximum number of messages to keep in memory
            persist_dir: Directory to persist memory to disk
        """
        self.agent_name = agent_name
        self.max_history = max_history
        self.persist_dir = persist_dir
        self.session_memories: Dict[str, List[Dict[str, Any]]] = {}
        
        # Create memory directory if it doesn't exist
        if not os.path.exists(persist_dir):
            os.makedirs(persist_dir)
        
        # Load any existing memory from disk
        self.load_memories()
    
    def add_user_message(self, session_id: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add a user message to memory"""
        if session_id not in self.session_memories:
            self.session_memories[session_id] = []
        
        self.session_memories[session_id].append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        })
        
        # Trim memory if it exceeds max_history
        if len(self.session_memories[session_id]) > self.max_history * 2:  # *2 for pairs of messages
            self.session_memories[session_id] = self.session_memories[session_id][-self.max_history * 2:]
        
        # Persist to disk
        self.save_memories()
    
    def add_ai_message(self, session_id: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add an AI message to memory"""
        if session_id not in self.session_memories:
            self.session_memories[session_id] = []
        
        self.session_memories[session_id].append({
            "role": "assistant",
            "content": message,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        })
        
        # Persist to disk
        self.save_memories()
    
    def get_memory_messages(self, session_id: str, k: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get the last k messages from memory for a session"""
        if session_id not in self.session_memories:
            return []
        
        messages = self.session_memories[session_id]
        if k is not None:
            messages = messages[-k:]
        
        return messages
    
    def get_chat_history(self, session_id: str, k: Optional[int] = None) -> str:
        """Get the chat history as a formatted string"""
        messages = self.get_memory_messages(session_id, k)
        history = ""
        
        for msg in messages:
            if msg["role"] == "user":
                history += f"User: {msg['content']}\n"
            else:
                history += f"AI: {msg['content']}\n"
        
        return history
    
    def clear_memory(self, session_id: str) -> None:
        """Clear memory for a session"""
        if session_id in self.session_memories:
            self.session_memories[session_id] = []
            self.save_memories()
    
    def save_memories(self) -> None:
        """Save memories to disk"""
        file_path = os.path.join(self.persist_dir, f"{self.agent_name}_memory.json")
        with open(file_path, 'w') as f:
            json.dump(self.session_memories, f)
    
    def load_memories(self) -> None:
        """Load memories from disk"""
        file_path = os.path.join(self.persist_dir, f"{self.agent_name}_memory.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    self.session_memories = json.load(f)
            except:
                self.session_memories = {}

# LangChain compatible memory adapter
class AgentWindowMemory(ConversationBufferWindowMemory):
    """LangChain compatible memory adapter for AgentMemoryManager"""
    
    def __init__(self, agent_memory: AgentMemoryManager, session_id: str, k: int = 5):
        """
        Initialize a LangChain compatible memory adapter
        
        Args:
            agent_memory: The underlying memory manager
            session_id: The session ID for this memory
            k: Number of messages to include in the window
        """
        super().__init__(k=k)
        self.agent_memory = agent_memory
        self.session_id = session_id
    
    def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, str]) -> None:
        """Save the context to memory"""
        # Extract the input message
        input_message = inputs.get("input", "")
        if not input_message:
            for key, value in inputs.items():
                if isinstance(value, str):
                    input_message = value
                    break
        
        # Extract the output message
        output_message = outputs.get("output", "")
        if not output_message:
            for key, value in outputs.items():
                if isinstance(value, str):
                    output_message = value
                    break
        
        # Add to memory manager
        self.agent_memory.add_user_message(self.session_id, input_message)
        self.agent_memory.add_ai_message(self.session_id, output_message)
    
    def load_memory_variables(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Load memory variables for LangChain"""
        history = self.agent_memory.get_chat_history(self.session_id, self.k * 2)
        return {"history": history} 