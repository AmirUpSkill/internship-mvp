

# Internship MVP Project 

This repository contains the Minimum Viable Product (MVP) developed during my final year internship (PFE) at Proxym. It includes multiple services designed to process PDF documents, extract information using AI, and interact with the ClickUp API.

**Author:** Amir Abdallah (AmirUpSkill)

## Project Overview

The project follows a microservices architecture:

1.  **AI Service:** Handles PDF uploads, text extraction, and interaction with a Google AI model (Gemini) for information processing. Uses MinIO for object storage. (Python/FastAPI)
2.  **ClickUp Service:** Interacts with the ClickUp API, likely for creating tasks or fetching data based on AI service output. (Python/FastAPI)
3.  **ClickUp Ticket Service:** An alternative/migrated version of the ClickUp interaction service, built with Spring Boot. **(Note: This service requires further testing and integration verification).**
4.  **Front-end:** A user interface built with Next.js to interact with the backend services.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Git:** For cloning the repository.
*   **Python:** Version 3.9+ recommended.
*   **pip:** Python package installer (usually comes with Python).
*   **Node.js:** LTS version (e.g., 18.x or 20.x) recommended.
*   **pnpm:** Node.js package manager (`npm install -g pnpm`).
*   **Docker & Docker Compose:** For running the MinIO object storage service.
*   **Java Development Kit (JDK):** Version 17 or higher recommended (for the `clickup-ticket-service`).
*   **Apache Maven:** For building and running the `clickup-ticket-service`.

## Project Structure


The-Pfe/
├── ai-service/ # AI processing service (Python/FastAPI + MinIO)
│ ├── backend/
│ └── docker/
├── clickUp-service/ # ClickUp interaction service (Python/FastAPI)
│ └── backend/
├── clickup-ticket-service/ # ClickUp interaction service (Spring Boot - Needs Testing)
├── front-end/ # User Interface (Next.js)
└── .gitignore # Specifies intentionally untracked files by Git

*(Note: Client/frontend folders previously inside backend service directories have been removed or consolidated into the root `front-end` directory).*

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/AmirUpSkill/internship-mvp.git
    cd internship-mvp
    ```

2.  **Environment Variables (CRITICAL):**
    This project uses `.env` files to manage sensitive information like API keys and configuration. **NEVER commit your actual `.env` files to Git.**
    *   Example files (`.env.example`) are provided in the relevant service directories.
    *   **For each service requiring configuration, you MUST create a `.env` file by copying its corresponding `.env.example` file and filling in the necessary values.**

    *   **AI Service:**
        *   Navigate to `ai-service/backend/`.
        *   Copy `.env.example` to `.env`.
            ```bash
            # On Windows Powershell:
            copy .env.example .env
            # On Linux/macOS:
            # cp .env.example .env
            ```
        *   Edit the new `.env` file and provide your actual `GOOGLE_API_KEY` and verify MinIO credentials (defaults should work if using the provided Docker Compose).

    *   **ClickUp Service (FastAPI):**
        *   Navigate to `clickUp-service/backend/`.
        *   Copy `.env.example` to `.env`.
            ```bash
            # On Windows Powershell:
            copy .env.example .env
            # On Linux/macOS:
            # cp .env.example .env
            ```
        *   Edit the new `.env` file and provide your actual `CLICKUP_API_KEY`.

    *   **ClickUp Ticket Service (Spring Boot):**
        *   Navigate to `clickup-ticket-service/`.
        *   This service likely reads configuration from `src/main/resources/application.properties` or expects environment variables. Check the `.env.example` (if present) or `application.properties` for required variables like `CLICKUP_API_KEY` and configure them appropriately (either via a `.env` file if using `dotenv-java`, system environment variables, or directly in `application.properties` - **ensure not to commit secrets**). *Consult `ClickUpProperties.java` for specifics.*

    *   **Front-end:**
        *   Navigate to `front-end/`.
        *   Create a `.env.local` file.
            ```bash
            # On Windows Powershell:
            copy .env.example .env.local # Assuming you create a .env.example here
            # On Linux/macOS:
            # cp .env.example .env.local
            ```
        *   Add any necessary environment variables, typically prefixed with `NEXT_PUBLIC_` if they need to be exposed to the browser (e.g., `NEXT_PUBLIC_AI_API_URL=http://localhost:8000`). Create a `.env.example` file in this directory as well for guidance.

3.  **Install Dependencies:**

    *   **AI Service (Python):**
        ```bash
        cd ai-service/backend
        python -m venv venv
        # Activate virtual environment
        # Windows PowerShell:
        .\venv\Scripts\Activate
        # Linux/macOS:
        # source venv/bin/activate
        pip install -r requirements.txt
        # Deactivate when done (optional): deactivate
        ```

    *   **ClickUp Service (Python):**
        ```bash
        cd ../../clickUp-service/backend # Adjust path if needed
        python -m venv venv
        # Activate virtual environment (as above)
        pip install -r requirements.txt
        # Deactivate when done (optional): deactivate
        ```

    *   **ClickUp Ticket Service (Spring Boot):**
        ```bash
        cd ../../clickup-ticket-service # Adjust path if needed
        # Maven will download dependencies when running/building
        ```

    *   **Front-end (Node.js):**
        ```bash
        cd ../front-end # Adjust path if needed
        pnpm install
        ```

## Running the Application

You need to run each component separately. Open multiple terminals for the different services.

1.  **Start MinIO Storage (Docker):**
    *   Navigate to `ai-service/docker/`.
    *   Run:
        ```bash
        docker-compose up -d
        ```
    *   *(To stop: `docker-compose down`)*

2.  **Start AI Service Backend:**
    *   Navigate to `ai-service/backend/`.
    *   Activate the virtual environment (`.\venv\Scripts\Activate` or `source venv/bin/activate`).
    *   Run:
        ```bash
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
        ```
    *   *(`--reload` is optional, for development)*

3.  **Start ClickUp Service Backend (FastAPI):**
    *   Navigate to `clickUp-service/backend/`.
    *   Activate the virtual environment.
    *   Run:
        ```bash
        uvicorn main:app --host 0.0.0.0 --port 8001 --reload
        ```

4.  **Start ClickUp Ticket Service Backend (Spring Boot - Optional/Testing):**
    *   Navigate to `clickup-ticket-service/`.
    *   Run:
        ```bash
        mvn spring-boot:run
        ```
    *   **(Remember this service needs verification)**

5.  **Start Front-end:**
    *   Navigate to `front-end/`.
    *   Run:
        ```bash
        pnpm run dev
        ```

## Accessing Services

Once running, the services should be accessible at:

*   **Front-end UI:** [http://localhost:3000](http://localhost:3000)
*   **AI Service API:** [http://localhost:8000](http://localhost:8000) (API Docs typically at [http://localhost:8000/docs](http://localhost:8000/docs))
*   **ClickUp Service API (FastAPI):** [http://localhost:8001](http://localhost:8001) (API Docs typically at [http://localhost:8001/docs](http://localhost:8001/docs))
*   **ClickUp Ticket Service API (Spring Boot):** [http://localhost:8080](http://localhost:8080) (Default Spring Boot port, check `application.properties` if different)
*   **MinIO Console:** [http://localhost:9001](http://localhost:9001) (Use Access Key/Secret Key from `ai-service/backend/.env`)

## Important Notes

*   Ensure Docker Desktop is running before starting the MinIO container.
*   Make sure the correct Python virtual environment is activated in the terminal before running `pip install` or `uvicorn` for the Python services.
*   The `clickup-ticket-service` (Spring Boot) is less mature than the FastAPI services and requires thorough testing and potentially further integration work.
*   Ensure no other applications are using ports 3000, 8000, 8001, 8080, 9000, or 9001, or adjust the port configurations accordingly.
*   Always refer to the `.env.example` files when setting up your local `.env` files.

---
