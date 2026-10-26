"""Verifica o merge real do Compose sem daemon, rede ou segredos reais."""

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


class OracleComposeTests(unittest.TestCase):
    def test_oracle_merge_is_private_and_preserves_volumes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in (
                "docker-compose.yml",
                "docker-compose.home-tunnel.yml",
                "docker-compose.oracle.yml",
                "deploy/compose-oracle.sh",
            ):
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / name, target)
            (root / ".env").write_text(
                "PUBLIC_DOMAIN=example.invalid\nPUID=1002\nPGID=1002\n"
            )
            (root / "secrets").mkdir()
            (root / "secrets/cloudflare-tunnel-token").write_text("placeholder")
            result = subprocess.run(
                [str(root / "deploy/compose-oracle.sh"), "config", "--format", "json"],
                cwd="/tmp",
                check=True,
                capture_output=True,
                text=True,
            )
            config = json.loads(result.stdout)
        self.assertNotIn("utileasydoc_edge", config["networks"])
        self.assertEqual(
            set(config["services"]["caddy"]["networks"]),
            {"default", "tunnel_edge", "reverse_proxy"},
        )
        for service in config["services"].values():
            self.assertFalse(service.get("ports"))
        self.assertEqual(
            config["volumes"]["postgres_data"]["name"], "utilitydev_postgres_data"
        )
        self.assertEqual(config["services"]["cloudflared"]["user"], "1002:1002")
        for name, queue in (
            ("worker", "media"),
            ("worker-provider", "provider,maintenance"),
            ("worker-documents", "documents"),
        ):
            service = config["services"][name]
            self.assertIn(queue, service["command"])
            self.assertEqual(
                service["depends_on"]["backend"]["condition"], "service_healthy"
            )
            self.assertEqual(service["logging"]["options"]["max-size"], "10m")
        caddy = (ROOT / "deploy/Caddyfile.oracle").read_text()
        self.assertNotIn("docs.utileasy.com.br", caddy)
        self.assertIn("reverse_proxy frontend:3000", caddy)
        self.assertIn("reverse_proxy n8n:5678", caddy)


if __name__ == "__main__":
    unittest.main()
