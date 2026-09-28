# iBOM UI

Frontend application for the **iBOM CV/Profile Management System** — an internal platform for managing professional profiles, maintaining multiple CV versions, and generating standardized CV documents.

## Overview

**iBOM UI** provides the frontend experience for the iBOM platform.

The application allows employees to maintain structured professional information across multiple independent CV profiles, while providing management-level capabilities for member discovery, profile management, master data, and user administration.

The frontend is built with **Angular 17** using a feature-based architecture and integrates with the iBOM backend API.

## Application Preview

### Homepage

The public homepage introduces the platform and provides entry points into the authentication flow.
<p align="center">
&#x20; <img src="./img/website_preview/HomePage.png" alt="iBOM Homepage" width="100%" />
</p>

### Member Workspace

The authenticated Member workspace provides an overview of the selected profile, profile completeness, export activity, and quick access to CV management operations.
<p align="center">
&#x20; <img src="./img/website_preview/MemberDashboard.png" alt="iBOM Member Workspace" width="100%" />
</p>

## Core Features

The frontend currently covers the main iBOM application areas:

- Authentication and account management
- Multiple independent CV profiles
- Profile sections and professional information management
- Profile completeness tracking
- CV preview
- PDF and DOCX export flows
- Member dashboard
- Manager dashboard
- Member management and search
- Master data management
- User management
- Role-based application access
- Responsive application shell and navigation

## Profile Management

Each user can maintain multiple CV profiles for different professional directions.

Examples:

```text
Java Backend CV
Full-stack CV
Project Manager CV
```

Each profile maintains its own CV-specific information, including:

```text
About Me
Education
Languages
Certificates
Projects
Skills
```

This allows the same user to prepare different CV versions without unintentionally coupling their profile data.

## Roles

The application supports three roles:

```text
MEMBER
MANAGER
ADMIN
```

### Member

Members can manage their own profiles, maintain professional information, preview and export CVs, and access their personal dashboard.

### Manager / Admin

Management users additionally have access to member management, member search, master data, user management, member CV operations, and management dashboard functionality.

## Tech Stack

### Frontend

- Angular 17
- TypeScript
- SCSS
- Angular Material / CDK
- Angular Router
- RxJS
- Chart.js
- GSAP

### Testing

- Jasmine
- Karma

### Tooling

- Angular CLI
- npm

## Project Structure

The application follows a feature-based Angular structure.

```text
src/app/
├── core/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── home/
│   ├── master-data/
│   ├── member-management/
│   ├── profile/
│   ├── shell/
│   └── user-management/
└── shared/
```

`core` contains application-wide infrastructure, while business functionality is organized by feature to keep individual modules isolated and maintainable.

## Getting Started

### Prerequisites

Make sure the following tools are installed:

```text
Node.js
npm
Git
```

### Clone the Repository

```bash
git clone https://github.com/datphamtat2411/iBOM-UI.git
cd iBOM-UI
```

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm start
```

or:

```bash
npx ng serve
```

The application is available at:

```text
http://localhost:4200
```

## Build

Create a production build with:

```bash
npm run build
```

Build output is generated under:

```text
dist/ibom-ui/
```

## Test

Run the frontend test suite with:

```bash
npm test
```

## Available Scripts

| Command         | Description                                            |
| --------------- | ------------------------------------------------------ |
| `npm start`     | Start the Angular development server                   |
| `npm run build` | Create a production build                              |
| `npm run watch` | Continuously build using the development configuration |
| `npm test`      | Run the Karma/Jasmine test suite                       |

## Development Direction

iBOM UI is developed together with the iBOM backend as a feature-oriented enterprise application.

The project prioritizes:

- clear feature boundaries,
- consistent UI behavior,
- role-aware navigation,
- reusable application infrastructure,
- frontend/backend contract alignment,
- maintainable enterprise-oriented workflows.

