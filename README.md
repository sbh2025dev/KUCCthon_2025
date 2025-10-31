# Slither.io Map Game 🐍

A slither.io style game built on top of an interactive map using your real location! Navigate your snake around your neighborhood, collect colorful food, and grow longer while avoiding collision with yourself.

## Features

### Game Features 🎮

- 🐍 **Smooth snake movement** - Snake follows your cursor/touch with fluid animation
- 🎯 **Collect food** - Eat colorful orbs to grow your snake and increase your score
- 📈 **Progressive difficulty** - The longer you get, the harder it is to avoid yourself
- 💀 **Self-collision detection** - Game over if you run into your own body
- 🎨 **Colorful design** - Randomly colored snake and food items
- 📊 **Real-time score tracking** - See your score and length as you play
- 🔄 **Instant restart** - Play again with one click

### Map Features 🗺️

- 📍 **Real-time geolocation** - Game starts at your actual location
- 🗺️ **Interactive OpenStreetMap** - Play on real streets and landmarks
- 🎯 **Accuracy visualization** - See your location accuracy
- 📊 **Location information panel** - View your exact coordinates
- 🔄 **Manual location refresh** - Update your position anytime

## Technologies Used

- **Leaflet.js** - Open-source JavaScript library for interactive maps
- **OpenStreetMap** - Free, editable map of the world
- **HTML5 Geolocation API** - For getting user's current location
- **HTML5 Canvas & Animation** - Smooth game animations using requestAnimationFrame
- **Vanilla JavaScript** - No frameworks, just pure JS!

## How to Play

1. **Allow location access** when prompted
2. **Move your mouse or finger** - Your snake will follow your cursor
3. **Collect colored orbs** to grow longer and increase your score
4. **Avoid hitting yourself** - The game ends if you collide with your own body
5. **Try to beat your high score!**

## Game Controls

- **Desktop**: Move your mouse to control the snake's direction
- **Mobile**: Touch and drag to control the snake
- **Restart**: Click "Play Again" after game over

## Running the Game

### Local Development

For testing locally, you need to run a simple HTTP server (required for geolocation API):

#### Python 3

```bash
python -m http.server 8000
```

#### Node.js (http-server)

```bash
npx http-server
```

Then visit `http://localhost:8000` in your browser.

### Browser Requirements

This game requires:

- A modern web browser with HTML5 support
- HTTPS connection (required for geolocation on most browsers, except localhost)
- Location permissions granted by the user
- JavaScript enabled

## Files

- `index.html` - Main HTML file with structure and styling
- `script.js` - Game logic, map initialization, and geolocation
- `README.md` - This file

## Game Configuration

You can customize the game by modifying these constants in `script.js`:

```javascript
const INITIAL_SNAKE_LENGTH = 5; // Starting length of snake
const SNAKE_SPEED = 0.00008; // Movement speed
const FOOD_COUNT = 15; // Number of food items on map
const SNAKE_WIDTH = 8; // Visual width of snake
const FOOD_RADIUS = 8; // Size of food items
```

## Tips for High Scores

- 🎯 Plan your route ahead to avoid trapping yourself
- 🐍 Make wide turns when you're long
- 🏃 Move quickly to new areas with fresh food
- 👀 Keep track of your tail position
- 🎨 The map terrain doesn't affect gameplay - it's just for visual reference!

## Browser Compatibility

Tested and working on:

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Privacy

- Your location is only used locally in your browser
- No data is sent to any server
- Location permission can be revoked at any time

## Credits

Built with ❤️ using Leaflet.js and OpenStreetMap

## License

This project is open source and available for free use.

---

**Have fun and happy slithering! 🐍✨**
