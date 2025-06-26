# Project Manager Demo Application

![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/oleksy-piotr-angular/project-manager/ci.yml?branch=main)
![GitHub top language](https://img.shields.io/github/languages/top/oleksy-piotr-angular/project-manager)
![GitHub repo size](https://img.shields.io/github/repo-size/oleksy-piotr-angular/project-manager)
![GitHub last commit](https://img.shields.io/github/last-commit/oleksy-piotr-angular/project-manager)

---

## 🚀 Overview

This is a demonstration Angular application designed to showcase modern frontend development practices, focusing on **project and task management** with user authentication. It leverages Angular's cutting-edge **Signals** for reactive state management, combined with **RxJS** for robust asynchronous operations.

The application allows users to:

- **Log in** (registration functionality is not implemented in this demo).
- Create, view, update, and delete their projects.
- Add, manage, and track tasks within each project.
- Set task statuses (To-Do, In Progress, Done) and due dates.

This demo serves as a blueprint for building scalable, maintainable, and well-tested Angular applications.

---

## ✨ Key Features & Technologies

- **Angular 18+ & Standalone Components:** Modern Angular development without NgModules.
- **Signals for State Management:** Comprehensive use of `signal`, `computed`, and `effect` for highly reactive and efficient state handling. Includes `toSignal`, `toObservable` for RxJS interop.
- **Unit & Integration Tests:** Comprehensive test suite with Karma/Jasmine to ensure application stability and correctness. **Note: Tests were implemented after the core application features.**
- **RxJS:** Used for complex asynchronous operations and data streams.
- **SCSS Styling:** Efficient and organized styling with Sass.
- **Custom Form Controls:** Implementation of `ControlValueAccessor` for enhanced form validation and error display.
- **Authentication & Guards:** Secure user authentication (simulated JWT in `localStorage`) with route guards (`canActivate`) for access control. **Registration functionality is not included in this demo.**
- **Dependency Injection:** Clean and efficient dependency management using `inject`.
- **Project Structure:** Clear and modular organization (`/components`, `/pages`, `/services`, `/models`, `/dto`, `/mappers`, `/guards`, `/shared/validators`).
- **Local API Simulation:** User and project data served via `json-server` for a lightweight, self-contained demo environment.
- **Git Commit Rules:** Consistent and descriptive commit messages (Conventional Commits).
- **Utility Libraries:** Uses `lodash` for various utility functions (e.g., `isEqual` for custom equality checks with signals).

---

## 🛠️ Getting Started

Follow these steps to get the application up and running on your local machine.

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/en/) (LTS version recommended)
- [Angular CLI](https://angular.io/cli) (`npm install -g @angular/cli`)
- **Optional: [GitHub CLI](https://cli.github.com/) for convenient repository cloning.**

### Installation & Setup

1.  **Clone the repository:**
    You can clone the repository using one of the following methods:
    - **Using HTTPS (recommended for most users):**
      ```bash
      git clone [https://github.com/oleksy-piotr-angular/project-manager.git](https://github.com/oleksy-piotr-angular/project-manager.git)
      ```
    - **Using SSH (if you have SSH keys configured with GitHub):**
      ```bash
      git clone git@github.com:oleksy-piotr-angular/project-manager.git
      ```
    - **Using GitHub CLI (if installed):**
      `bash
    gh repo clone oleksy-piotr-angular/project-manager
    `
      After cloning, navigate into the Angular project directory:
    ```bash
    cd project-manager/FrontEnd
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up the JSON Server (Mock Backend):**
    - Ensure you have `json-server` installed globally or locally: `npm install -g json-server` (if not already).
    - The `db.json` file in the project root (`project-manager/db.json`) contains the mock data structure.
    - Start the JSON server:
      `bash
    json-server --watch ../db.json --port 3000
    `
      Keep this terminal window open; the frontend will connect to this server.

### Running the Application

1.  **Start the Angular development server:**
    Open a **new** terminal window (keep the `json-server` running in the first one) and navigate to the `FrontEnd` directory:
    ```bash
    cd project-manager/FrontEnd
    ng serve --open
    ```
    The application should automatically open in your browser at `http://localhost:4200/`.

### Demo Login Credentials

Since registration is not implemented, you can log in using the following credentials:

- **Email:** `user1@example.com`
- **Password:** `password123`

---

## 🧪 Running Tests

This project includes a comprehensive test suite. You can run the unit and integration tests using Karma and Jasmine:

```bash
cd FrontEnd # Ensure you are in the Angular project directory
ng test
```
