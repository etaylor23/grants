#!/bin/bash

# Create React App with TypeScript
npx create-react-app tracker --template typescript
cd tracker

# Install dependencies
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/resource-timeline @fullcalendar/interaction
npm install @tanstack/react-query
npm install axios
npm install @silevis/reactgrid
npm install date-fns

# Install dev dependencies
npm install --save-dev @testing-library/jest-dom @testing-library/react @testing-library/user-event

# Start development server
npm start
