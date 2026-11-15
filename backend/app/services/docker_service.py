import logging
from typing import Dict, Any, List, Optional
import docker
from docker.errors import DockerException, NotFound

logger = logging.getLogger("agentos.docker")

class DockerService:
    def __init__(self):
        self._client: Optional[docker.DockerClient] = None

    def get_client(self) -> Optional[docker.DockerClient]:
        if self._client is None:
            try:
                self._client = docker.from_env()
                self._client.ping()
            except Exception as e:
                logger.warning(f"Docker engine is not currently accessible: {e}")
                self._client = None
        return self._client

    def is_docker_available(self) -> bool:
        client = self.get_client()
        if not client:
            return False
        try:
            return client.ping()
        except Exception:
            return False

    def get_system_status(self) -> Dict[str, Any]:
        """Returns Docker engine status and known AgentOS container states."""
        client = self.get_client()
        if not client:
            return {
                "available": False,
                "message": "Docker engine not running or not accessible",
                "containers": [],
            }

        try:
            version_info = client.version()
            containers = client.containers.list(all=True)
            
            agentos_containers = []
            for c in containers:
                if any(name in c.name for name in ["agentos", "postgres", "ollama"]):
                    agentos_containers.append({
                        "id": c.short_id,
                        "name": c.name,
                        "status": c.status,
                        "image": c.image.tags[0] if c.image.tags else c.image.short_id,
                        "ports": c.ports,
                    })

            return {
                "available": True,
                "version": version_info.get("Version", "Unknown"),
                "os": version_info.get("Os", "Unknown"),
                "containers": agentos_containers,
            }
        except Exception as e:
            return {
                "available": False,
                "error": str(e),
                "containers": [],
            }

    def start_container(self, container_name: str) -> Dict[str, Any]:
        """Starts an existing container by name."""
        client = self.get_client()
        if not client:
            raise RuntimeError("Docker is not available.")
        try:
            container = client.containers.get(container_name)
            if container.status != "running":
                container.start()
            return {"status": "started", "name": container.name, "id": container.short_id}
        except NotFound:
            raise RuntimeError(f"Container '{container_name}' not found.")
        except Exception as e:
            raise RuntimeError(f"Failed to start container '{container_name}': {e}")

    def stop_container(self, container_name: str) -> Dict[str, Any]:
        """Stops an existing container by name."""
        client = self.get_client()
        if not client:
            raise RuntimeError("Docker is not available.")
        try:
            container = client.containers.get(container_name)
            container.stop()
            return {"status": "stopped", "name": container.name}
        except Exception as e:
            raise RuntimeError(f"Failed to stop container '{container_name}': {e}")

docker_service = DockerService()

