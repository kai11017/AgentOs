from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

def convert_type_to_gemini(t: str) -> str:
    """Gemini API expects uppercase types: STRING, NUMBER, INTEGER, BOOLEAN, ARRAY, OBJECT."""
    mapping = {
        "string": "STRING",
        "number": "NUMBER",
        "integer": "INTEGER",
        "boolean": "BOOLEAN",
        "array": "ARRAY",
        "object": "OBJECT",
    }
    return mapping.get(t.lower(), t.upper())

class BaseTool(ABC):
    name: str = ""
    description: str = ""
    parameters_schema: Dict[str, Any] = {}

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """Executes the tool with provided keyword arguments."""
        pass

    def to_gemini_declaration(self) -> Dict[str, Any]:
        """Converts tool definition to Google Gemini API FunctionDeclaration schema."""
        raw_props = self.parameters_schema.get("properties", {})
        gemini_props = {}
        for prop_name, prop_val in raw_props.items():
            gemini_props[prop_name] = {
                "type": convert_type_to_gemini(prop_val.get("type", "string")),
                "description": prop_val.get("description", ""),
            }
            if "enum" in prop_val:
                gemini_props[prop_name]["enum"] = prop_val["enum"]

        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "OBJECT",
                "properties": gemini_props,
                "required": self.parameters_schema.get("required", []),
            },
        }

    def to_ollama_tool(self) -> Dict[str, Any]:
        """Converts tool definition to Ollama / OpenAI function tool schema."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": self.parameters_schema.get("properties", {}),
                    "required": self.parameters_schema.get("required", []),
                },
            },
        }
