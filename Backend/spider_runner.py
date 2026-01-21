import subprocess
import sys
import os

def start_spider():
    """
    Executes the Scrapy spider using absolute paths.
    Reliably targets the 'my_scraper' directory based on your file structure.
    """
    # Get the directory where this script (spider_runner.py) is located
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Target the 'my_scraper' folder where 'scrapy.cfg' lives
    project_dir = os.path.join(backend_dir, "my_scraper")

    print(f"\n>>> [DEBUG] Backend Directory: {backend_dir}")
    print(f">>> [DEBUG] Scrapy Project Directory: {project_dir}")

    # Check if the project folder exists
    if not os.path.exists(project_dir):
        return False, "Project directory not found!"

    try:
        # Command to run the spider: python -m scrapy crawl coin_spider
        command = [sys.executable, "-m", "scrapy", "crawl", "coin_spider"]
        
        # Execute the command inside the project directory
        result = subprocess.run(
            command,
            cwd=project_dir, # Ensures Scrapy finds its context
            capture_output=True,
            text=True
        )
        
        # Log success or failure to the terminal for debugging
        if result.returncode != 0:
            print(f">>> [SCRAPY ERROR LOG]:\n{result.stderr}")
            return False, "Spider execution failed. Check terminal."
            
        print(">>> [SUCCESS] Spider finished successfully!")
        return True, "Data Pipeline Updated Successfully!"

    except Exception as e:
        print(f">>> [SYSTEM ERROR]: {str(e)}")
        return False, str(e)