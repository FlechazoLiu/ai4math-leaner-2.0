import os
import subprocess
import shutil
from pathlib import Path
from typing import Optional
from git import Repo, GitCommandError

class LeanProject:
    """Manages cached Lean projects from GitHub repositories or local paths."""

    def __init__(
        self,
        repo_url_or_path: str,
        revision: Optional[str] = None,
        cache_dir: Optional[str] = None,
        setup: bool = True,
        modules: list[str] = [],
    ):
        """
        Initialize a LeanProject.

        Args:
            repo_url_or_path: GitHub repository URL or local project path
            revision: Git revision (tag, branch, or commit hash) for GitHub repos
            cache_dir: Directory to cache projects (defaults to LEAN_CACHE_DIR env var or ~/.lean-cache)
            setup: Whether to setup the project (defaults to True)
        """
        self.repo_url_or_path = repo_url_or_path
        self.revision = revision
        self.cache_dir = self._get_cache_dir(cache_dir)
        self.project_path = None
        self.is_github_repo = self._is_github_url(repo_url_or_path)
        self.modules = modules
        if setup:
            self.setup()

    def _get_cache_dir(self, cache_dir: Optional[str]) -> Path:
        """Get the cache directory from environment variable or default."""
        if cache_dir:
            return Path(cache_dir)

        env_cache = os.environ.get("LEAN_CACHE_DIR")
        if env_cache:
            return Path(env_cache)

        # Default to ~/.lean-cache
        return Path.home() / ".lean-cache"

    def _is_github_url(self, url: str) -> bool:
        """Check if the URL is a GitHub repository."""
        return url.startswith(("https://github.com/", "git@github.com:"))

    def _get_project_name(self) -> str:
        """Extract project name from GitHub URL or use path name."""
        if self.is_github_repo:
            # Extract repo name from GitHub URL
            if self.repo_url_or_path.startswith("https://github.com/"):
                path_parts = self.repo_url_or_path.rstrip("/").split("/")
                return path_parts[-1].replace(".git", "")
            elif self.repo_url_or_path.startswith("git@github.com:"):
                return self.repo_url_or_path.split(":")[-1].replace(".git", "")
        else:
            # Use the directory name for local paths
            return Path(self.repo_url_or_path).name

        return "unknown-project"

    def _get_cached_project_path(self) -> Path:
        """Get the path where the project should be cached."""
        project_name = self._get_project_name()
        if self.is_github_repo and self.revision:
            return self.cache_dir / f"{project_name}-{self.revision}"
        else:
            return self.cache_dir / project_name

    def _validate_lean_project(self, project_path: Path) -> bool:
        """
        Validate that a directory contains a valid Lean project.

        Args:
            project_path: Path to the project directory

        Returns:
            True if valid Lean project, False otherwise
        """
        lake_files = ["lakefile.lean", "lakefile.toml"]
        manifest_file = "lake-manifest.json"

        # Check if lean-toolchain exists
        if not (project_path / "lean-toolchain").exists():
            return False

        # Check if at least one lakefile exists
        if not any((project_path / lake_file).exists() for lake_file in lake_files):
            return False

        # Check if lake-manifest.json exists
        if not (project_path / manifest_file).exists():
            return False

        if not self._build_project(project_path):
            return False

        return True

    def _clone_repository(self, repo_url: str, target_path: Path) -> bool:
        """
        Clone a GitHub repository to the target path.

        Args:
            repo_url: GitHub repository URL
            target_path: Path where to clone the repository

        Returns:
            True if successful, False otherwise
        """
        try:
            # Remove existing directory if it exists
            if target_path.exists():
                shutil.rmtree(target_path)

            # Clone the repository using GitPython
            print(f"Cloning {repo_url} to {target_path}")
            repo = Repo.clone_from(repo_url, target_path)

            # Checkout specific revision if specified
            if self.revision:
                print(f"Checking out revision: {self.revision}")
                repo.git.checkout(self.revision)

            return True

        except GitCommandError as e:
            print(f"Git error during cloning: {e}")
            return False
        except Exception as e:
            print(f"Unexpected error during cloning: {e}")
            return False

    def _build_project(self, project_path: Path) -> bool:
        """
        Build the Lean project using lake.

        Args:
            project_path: Path to the project directory

        Returns:
            True if successful, False otherwise
        """
        try:
            # Run 'lake exe cache get' to download dependencies
            print("Downloading Mathlib cache...")
            subprocess.run(
                ["lake", "exe", "cache", "get"],
                cwd=project_path,
                capture_output=True,
                text=True,
                check=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"Error downloading Mathlib cache: {e}")
            pass
        try:
            # Run 'lake build' to build the project
            print("Building project...")
            subprocess.run(
                ["lake", "build"],
                cwd=project_path,
                capture_output=True,
                text=True,
                check=True,
            )

            return True
        except subprocess.CalledProcessError as e:
            print(f"Error building project: {e}")
            return False
        except Exception as e:
            print(f"Unexpected error during building: {e}")
            return False

    def setup(self, modules: list[str] = []) -> bool:
        """
        Set up the Lean project (clone if needed, validate, and build).

        Args:
            modules: List of modules to extract data from

        Returns:
            True if successful, False otherwise
        """
        if self.is_github_repo:
            return self._setup_github_repo(modules)
        else:
            return self._setup_local_project(modules)

    def _setup_github_repo(self, modules: list[str] = []) -> bool:
        """Set up a GitHub repository."""
        cached_path = self._get_cached_project_path()

        # Check if already cached and valid
        if cached_path.exists() and self._validate_lean_project(cached_path):
            print(f"Project already cached and valid at: {cached_path}")
            self.project_path = cached_path
            return True

        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Clone the repository
        print(f"Cloning repository to: {cached_path}")
        if not self._clone_repository(self.repo_url_or_path, cached_path):
            return False

        # Validate the cloned project
        if not self._validate_lean_project(cached_path):
            print("Cloned repository is not a valid Lean project")
            return False

        # Build the project
        if not self._build_project(cached_path):
            return False

        self.project_path = cached_path

        print(f"Project successfully set up at: {cached_path}")
        return True

    def _setup_local_project(self, modules: list[str] = []) -> bool:
        """Set up a local project."""
        local_path = Path(self.repo_url_or_path)

        if not local_path.exists():
            print(f"Local path does not exist: {local_path}")
            return False

        if not local_path.is_dir():
            print(f"Local path is not a directory: {local_path}")
            return False

        # Validate the local project
        if not self._validate_lean_project(local_path):
            print(f"Local path is not a valid Lean project: {local_path}")
            return False

        self.project_path = local_path
        print(f"Local project validated at: {local_path}")

        return True

    def get_project_path(self) -> Optional[Path]:
        """Get the path to the set up project."""
        return self.project_path

    def is_setup(self) -> bool:
        """Check if the project is set up and ready."""
        return self.project_path is not None and self.project_path.exists()

    def clean_cache(self) -> bool:
        """Remove the cached project."""
        if not self.is_github_repo:
            print("Cannot clean cache for local projects")
            return False

        cached_path = self._get_cached_project_path()
        if cached_path.exists():
            try:
                shutil.rmtree(cached_path)
                print(f"Cleaned cache at: {cached_path}")
                return True
            except Exception as e:
                print(f"Error cleaning cache: {e}")
                return False

        return True

    def get_repo_info(self) -> Optional[dict[str, str | list[str] | bool]]:
        """Get repository information if available."""
        if not self.is_setup():
            return None

        try:
            repo = Repo(self.project_path)
            return {
                "active_branch": str(repo.active_branch),
                "head_commit": repo.head.commit.hexsha[:8],
                "remote_urls": [remote.url for remote in repo.remotes],
                "is_detached": repo.head.is_detached,
            }
        except Exception as e:
            print(f"Error getting repo info: {e}")
            return None

    def get_cache_status(self) -> dict[str, str | bool | None]:
        """Get information about the cache status."""
        cached_path = self._get_cached_project_path()
        return {
            "cache_dir": str(self.cache_dir),
            "cached_path": str(cached_path),
            "is_cached": cached_path.exists(),
            "is_valid": cached_path.exists()
            and self._validate_lean_project(cached_path)
            if cached_path.exists()
            else False,
            "project_path": str(self.project_path) if self.project_path else None,
            "is_setup": self.is_setup(),
        }
