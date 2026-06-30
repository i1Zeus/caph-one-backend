# GitHub Integration Module

This module provides integration with GitHub API to manage repositories and create issues directly from your ERP system.

## Environment Variables

You need to set up the following environment variables in your `.env` file:

```bash
# Required: Your GitHub Personal Access Token
GITHUB_TOKEN=your_github_personal_access_token_here

# Optional: GitHub Organization Name (defaults to 'izeus-org')
GITHUB_ORG_NAME=your-organization-name
```

### Getting a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with the following scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read organization membership)

## API Endpoints

### 1. Get Organization Repositories

**GET** `/github/repositories`

Returns a list of all repositories in your organization.

**Response:**

```json
{
  "success": true,
  "message": "Organization repositories fetched successfully",
  "data": {
    "total": 10,
    "repositories": [
      {
        "id": 123456,
        "name": "example-repo",
        "fullName": "izeus-org/example-repo",
        "description": "Repository description",
        "private": false,
        "htmlUrl": "https://github.com/izeus-org/example-repo",
        "cloneUrl": "https://github.com/izeus-org/example-repo.git",
        "language": "TypeScript",
        "forksCount": 5,
        "stargazersCount": 12,
        "openIssuesCount": 3,
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-12-01T00:00:00Z"
      }
    ]
  }
}
```

### 2. Create GitHub Issue

**POST** `/github/issues`

Creates a new issue in a specified repository.

**Request Body:**

```json
{
  "title": "Bug: Application crashes on startup",
  "description": "The application crashes when starting up with the following error...",
  "repository": "example-repo"
}
```

**Optional fields:**

```json
{
  "title": "Bug: Application crashes on startup",
  "description": "The application crashes when starting up with the following error...",
  "repository": "example-repo",
  "assignee": "username",
  "labels": ["bug", "high-priority"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "GitHub issue created successfully",
  "data": {
    "id": 1234567890,
    "number": 42,
    "title": "Bug: Application crashes on startup",
    "body": "The application crashes when starting up with the following error...",
    "state": "open",
    "htmlUrl": "https://github.com/izeus-org/example-repo/issues/42",
    "assignee": "username",
    "labels": ["bug", "high-priority"],
    "createdAt": "2023-12-01T12:00:00Z",
    "updatedAt": "2023-12-01T12:00:00Z"
  }
}
```

## Testing with Postman

### 1. Test Get Repositories

- Method: GET
- URL: `http://localhost:3000/github/repositories`
- Headers: (none required)

### 2. Test Create Issue

- Method: POST
- URL: `http://localhost:3000/github/issues`
- Headers: `Content-Type: application/json`
- Body:

```json
{
  "title": "Test Issue from ERP",
  "description": "This is a test issue created from the ERP system",
  "repository": "your-repo-name"
}
```

## Error Handling

The module includes comprehensive error handling:

- Invalid GitHub token
- Repository not found
- Permission issues
- Network errors

All errors are logged and returned with appropriate HTTP status codes and error messages.

## Usage in ERP

This integration allows you to:

1. View all your organization's repositories
2. Create GitHub issues directly from tasks in your ERP system
3. Link ERP tasks with GitHub issues for better project management

The module is designed to be easily extended for additional GitHub features like updating issues, adding comments, or managing labels.
