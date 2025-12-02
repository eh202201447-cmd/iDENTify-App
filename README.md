# iDENTify-App

This is a dental clinic management application.

## Getting Started

To get the application running, you will need to run both the frontend and backend servers.

### Prerequisites

-   Node.js and npm installed.
-   A MySQL database server.

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up the database:**
    -   Make sure you have a MySQL server running.
    -   Create a database named `identify_app`.
    -   Update the database credentials in `backend/.env` if they are different from the defaults.

4.  **Run the backend server:**
    ```bash
    npm start
    ```
    The backend server will be running on `http://localhost:4000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend server:**
    ```bash
    npm run dev
    ```
    The frontend development server will be running on `http://localhost:5173` (or another port if 5173 is in use).

Now you can open your browser and navigate to the frontend URL to use the application.
