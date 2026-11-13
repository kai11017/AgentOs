from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseNodeHandler(ABC):
    @abstractmethod
    async def execute(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a single node.
        :param node: Node definition with id, label, definitionType, and config.
        :param context: Context dictionary containing $json, $prev, $nodes.
        :return: Node execution output dictionary.
        """
        pass

