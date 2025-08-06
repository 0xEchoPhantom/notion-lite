# Notion Lite

A lightweight Notion-like editor built with Next.js 14, React 18, TypeScript, TailwindCSS, Tiptap, and Firebase.

## Features

- **Rich Text Editor**: Three block types - Paragraph, Bulleted list, To-do list
- **Markdown Shortcuts**: Type `-` for bullets, `[]` for todos
- **Slash Commands**: Type `/` to open block type menu
- **Keyboard Navigation**: Tab/Shift+Tab for indentation, Cmd/Ctrl+Shift+↑/↓ for reordering
- **Real-time Sync**: Firebase Firestore with live updates
- **Authentication**: Email/password and Google OAuth
- **Responsive Design**: TailwindCSS styling

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: TailwindCSS
- **Rich Text**: Tiptap React (headless editor)
- **State Management**: React Context + useReducer
- **Backend**: Firebase v10 (Firestore + Auth)
- **Deployment**: Firebase Hosting

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Authentication (Email/Password and Google)
5. Get your Firebase config from Project Settings

### 2. Environment Variables

Update `.env.local` with your Firebase configuration:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

### 5. Deployment

```bash
npm run deploy
```

## Keyboard Shortcuts

- **Enter**: Create new block
- **Backspace**: Delete empty block or merge with previous
- **Tab**: Indent block (bullets and todos)
- **Shift+Tab**: Outdent block
- **Cmd/Ctrl+Shift+↑**: Move block up
- **Cmd/Ctrl+Shift+↓**: Move block down
- **Cmd/Ctrl+Enter**: Toggle todo checkbox
- **/**: Open slash menu for block types
