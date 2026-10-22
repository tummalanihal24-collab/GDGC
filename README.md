# Travel Explorer

A Travel Explorer app for discovering destinations across India and saving favourites to a wishlist.
Built with **React Native (Expo)** for the GDGC VNRVJIET App Development assignment.

## Features

**Core stages**
1. **Destination discovery**: 8 destinations in 4 categories (Beaches, Mountains, Heritage, Adventure), each with image, name, location and category.
2. **Navigation & details**: Home, Destination Details and Wishlist screens, with description, best time to visit and 2-3 popular attractions (image + name).
3. **Search & filtering**: search by name, filter by category, and the two combine.
4. **Wishlist**: add or remove destinations with the heart button (cards and details page). The Wishlist tab updates instantly and shows a count badge.

**Extension challenge (all four done)**
- **Smart Destination Matcher** ("Match me" on Home): pick travel type, budget and trip length to get ranked suggestions.
- **Live weather**: current temperature and conditions from the free [Open-Meteo](https://open-meteo.com) API (no key needed).
- **Google Maps**: "View on Google Maps" opens the destination in Maps.
- **Local storage**: the wishlist is saved with AsyncStorage and survives app restarts.

## Setup

Requirements: Node 18+ and the **Expo Go** app on your phone (or an Android/iOS emulator).

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` (Android), `i` (iOS) or `w` (web).

## Project structure

```
App.js                      navigation (tabs + stack) and providers
src/data/destinations.js    static destination data + search/filter helper
src/data/images.js          bundled image map
src/context/WishlistContext.js   wishlist state + AsyncStorage persistence
src/screens/                Home, Details, Wishlist, Matcher
src/components/             DestinationCard, CategoryChips
src/utils/weather.js        Open-Meteo weather fetch
assets/images/              bundled photos
```

## How it works

- Destination data is a local JS array, so no backend is needed.
- The wishlist stores only destination ids in a React context; screens derive the saved list from it, so any heart tap updates every screen.
- Search and filter are one pure function, `filterDestinations(list, query, category)`.
- The matcher scores each destination: +3 for the matching category, up to +2 for budget closeness, +2 for fitting the trip length, then shows the top 3.

## Screenshots

Add screenshots of Home, Details, Wishlist and Matcher here before submitting.

## Image credits

Photos are from Wikipedia / Wikimedia Commons under their respective free licences.
