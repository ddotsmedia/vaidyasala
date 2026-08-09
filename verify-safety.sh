#!/bin/bash
echo "=== VAIDYASALA SAFETY CHECK ==="
echo "Checking existing containers..."
docker ps --format "table {{.Names}}\t{{.Status}}" > pre-deploy-status.txt
cat pre-deploy-status.txt
echo "✓ Status snapshot saved"
echo "=== CHECK COMPLETE ==="
