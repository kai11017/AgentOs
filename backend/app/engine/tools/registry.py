from typing import Dict, List, Optional, Any
from backend.app.engine.tools.base import BaseTool
from backend.app.engine.tools.calculator import CalculatorTool
from backend.app.engine.tools.web_search import WebSearchTool
from backend.app.engine.tools.fetch_url import FetchURLTool
from backend.app.engine.tools.code_runner import CodeRunnerTool
from backend.app.engine.tools.memory import global_memory_tool
from backend.app.engine.tools.knowledge import KnowledgeRetrieverTool

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_defaults()

    def _register_defaults(self):
        self.register(CalculatorTool())
        self.register(WebSearchTool())
        self.register(FetchURLTool())
        self.register(CodeRunnerTool())
        self.register(global_memory_tool)
        self.register(KnowledgeRetrieverTool())

    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool

    def unregister(self, name: str):
        self._tools.pop(name, None)

    def get(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def list_all(self) -> List[BaseTool]:
        return list(self._tools.values())

    def get_tools_for_names(self, names: Optional[List[str]] = None) -> List[BaseTool]:
        if not names:
            return self.list_all()
        selected = []
        for n in names:
            tool = self._tools.get(n)
            if tool:
                selected.append(tool)
        return selected or self.list_all()

    def to_gemini_tools(self, tool_names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Produces Gemini API tools parameter: [{'function_declarations': [...]}]"""
        tools = self.get_tools_for_names(tool_names)
        declarations = [t.to_gemini_declaration() for t in tools]
        if not declarations:
            return []
        return [{"function_declarations": declarations}]

    def to_ollama_tools(self, tool_names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Produces Ollama / OpenAI API tools parameter: [{'type': 'function', 'function': {...}}]"""
        tools = self.get_tools_for_names(tool_names)
        return [t.to_ollama_tool() for t in tools]

# Global Singleton Registry
global_tool_registry = ToolRegistry()
