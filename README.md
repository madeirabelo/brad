# Travel Map Application

A React-based web application that displays interactive maps showing visited countries across different continents.

## Features

- Interactive world map
- Regional maps (Asia, Africa, Americas, Australia)
- Country highlighting for visited locations
- Responsive design
- Tooltips showing country names
- Smooth animations and transitions
- Concerts and Movies collections
- Chess games
- Mandelbrot fractal viewer

## Technologies Used

- React
- D3.js for map rendering
- CSS3 for styling
- RESTful API integration
- Node.js backend

## Getting Started

1. Clone the repository:
```bash
git clone [your-repository-url]
```

2. Install dependencies:
```bash
npm install
cd server && npm install
```

3. Start the development server:
```bash
npm start
```

4. Start the backend server (in another terminal):
```bash
cd server && node server.js
```

5. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Environment Configuration

The application uses environment variables to configure API endpoints:

### Development (for mobile testing)
```bash
# Create .env.development file
REACT_APP_API_URL=http://192.168.31.71:5050
```

### Production (Raspberry Pi)
```bash
# Create .env.production file
REACT_APP_API_URL=http://localhost:5050
```

### Build Commands
- `npm run build:dev` - Build for development with IP address
- `npm run build:prod` - Build for production with localhost
- `npm run build:pi` - Build for Raspberry Pi deployment

## Deployment to Raspberry Pi

### Option 1: Using the deployment script
```bash
./deploy_to_pi.sh
```

### Option 2: Manual deployment
1. Build the application for Raspberry Pi:
```bash
npm run build:pi
```

2. Copy files to Raspberry Pi:
```bash
# Copy frontend build
scp -r build/* pi@[RASPBERRY_PI_IP]:/var/www/html/

# Copy backend
scp -r server/* pi@[RASPBERRY_PI_IP]:/home/pi/brad/
```

3. On the Raspberry Pi:
```bash
# Install backend dependencies
cd /home/pi/brad && npm install

# Start the backend server
node server.js

# Configure nginx to serve the frontend and proxy API calls
```

### Important Notes for Raspberry Pi Deployment
- The backend will run on `localhost:5050` (internal to the Pi)
- The frontend will be served by nginx on port 80
- API calls from the frontend will be proxied to the backend
- No IP address conflicts since everything runs locally on the Pi

## Project Structure

- `/src/components` - React components including map implementations
- `/src/data` - JSON data files for country mappings
- `/server` - Node.js backend server
- `/public` - Static assets and index.html

## API Integration

The application connects to a backend API for fetching visited countries data. The API endpoint is configured in the environment variables and defaults to `localhost:5050` for production deployments.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
