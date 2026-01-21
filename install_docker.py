#!/usr/bin/env python3
import subprocess
import sys
import os

def run_cmd(cmd, check=True):
    """Run a command and return output"""
    print(f"\n>>> Running: {cmd}")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=check
        )
        if result.stdout:
            print(result.stdout)
        if result.stderr and result.returncode != 0:
            print(f"Error: {result.stderr}", file=sys.stderr)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}", file=sys.stderr)
        return False

def main():
    print("=== Docker Installation Script ===")
    print()
    
    # Step 1: Update package list
    print("Step 1: Updating package list...")
    if not run_cmd("apt-get update -qq"):
        print("Warning: apt-get update had issues, continuing anyway...")
    
    # Step 2: Remove problematic Docker repo
    print("\nStep 2: Checking for problematic Docker repository...")
    docker_list = "/etc/apt/sources.list.d/docker.list"
    if os.path.exists(docker_list):
        print(f"Removing {docker_list}...")
        run_cmd(f"rm -f {docker_list}", check=False)
    
    # Step 3: Install Docker
    print("\nStep 3: Installing docker.io...")
    if not run_cmd("apt-get install -y docker.io docker-compose"):
        print("ERROR: Failed to install Docker packages")
        return 1
    
    # Step 4: Check if docker binary exists
    print("\nStep 4: Checking Docker installation...")
    docker_paths = [
        "/usr/bin/docker",
        "/usr/sbin/docker",
        "/usr/lib/docker/docker"
    ]
    
    docker_found = False
    for path in docker_paths:
        if os.path.exists(path):
            print(f"✓ Found Docker at: {path}")
            docker_found = True
            # Try to get version
            run_cmd(f"{path} --version", check=False)
            break
    
    if not docker_found:
        print("⚠ Docker binary not found in common locations")
        print("Searching system...")
        run_cmd("find /usr -name docker -type f 2>/dev/null | head -5", check=False)
    
    # Step 5: Check docker-compose
    print("\nStep 5: Checking docker-compose...")
    compose_paths = ["/usr/bin/docker-compose", "/usr/local/bin/docker-compose"]
    for path in compose_paths:
        if os.path.exists(path):
            print(f"✓ Found docker-compose at: {path}")
            run_cmd(f"{path} --version", check=False)
            break
    
    # Step 6: Try to start Docker daemon
    print("\nStep 6: Attempting to start Docker daemon...")
    dockerd_paths = ["/usr/bin/dockerd", "/usr/sbin/dockerd"]
    dockerd_found = False
    
    for path in dockerd_paths:
        if os.path.exists(path):
            print(f"✓ Found dockerd at: {path}")
            dockerd_found = True
            print("Starting dockerd in background...")
            # Start in background
            subprocess.Popen(
                [path],
                stdout=open("/tmp/dockerd.log", "w"),
                stderr=subprocess.STDOUT
            )
            print("Waiting 3 seconds for daemon to start...")
            import time
            time.sleep(3)
            
            # Check if it's running
            result = subprocess.run(
                "pgrep dockerd",
                shell=True,
                capture_output=True
            )
            if result.returncode == 0:
                print("✓ Docker daemon is running!")
            else:
                print("⚠ Docker daemon may not have started. Check /tmp/dockerd.log")
            break
    
    if not dockerd_found:
        print("⚠ dockerd not found. Searching...")
        run_cmd("find /usr -name dockerd -type f 2>/dev/null | head -5", check=False)
    
    print("\n=== Installation Complete ===")
    print("\nNext steps:")
    print("1. Check if Docker works: docker --version")
    print("2. Stop local MySQL: service mysql stop")
    print("3. Start containers: cd /root/Project/final-project-backend && docker-compose up -d db phpmyadmin")
    
    return 0

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("ERROR: This script must be run as root")
        sys.exit(1)
    sys.exit(main())
