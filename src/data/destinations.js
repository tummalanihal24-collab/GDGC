import { images } from './images';

export const CATEGORIES = ['Beaches', 'Mountains', 'Heritage', 'Adventure'];

// Static, locally stored destination data (no backend needed).
// budget: 1 = budget friendly, 2 = moderate, 3 = premium. days: suggested trip length.
export const destinations = [
  {
    id: 'goa',
    name: 'Goa',
    location: 'Goa, India',
    category: 'Beaches',
    image: images.palolem,
    coords: { lat: 15.2993, lon: 74.124 },
    budget: 2,
    days: 4,
    bestTime: 'November to February',
    description:
      'India\'s party capital is also a place of quiet coves, Portuguese-era churches and spice-scented villages. Swim at sunrise, eat fresh seafood at sunset.',
    attractions: [
      { name: 'Palolem Beach', image: images.palolem },
      { name: 'Fort Aguada', image: images.aguada },
      { name: 'Basilica of Bom Jesus', image: images.basilica },
    ],
  },
  {
    id: 'andaman',
    name: 'Havelock Island',
    location: 'Andaman & Nicobar Islands',
    category: 'Beaches',
    image: images.radhanagar,
    coords: { lat: 11.9748, lon: 92.9876 },
    budget: 3,
    days: 6,
    bestTime: 'October to May',
    description:
      'Turquoise water, white sand and coral reefs make Havelock one of Asia\'s best island escapes. Perfect for snorkelling, diving and slow beach days.',
    attractions: [
      { name: 'Radhanagar Beach', image: images.radhanagar },
      { name: 'Havelock Island Shoreline', image: images.havelock },
      { name: 'Cellular Jail, Port Blair', image: images.cellularJail },
    ],
  },
  {
    id: 'manali',
    name: 'Manali',
    location: 'Himachal Pradesh',
    category: 'Mountains',
    image: images.solang,
    coords: { lat: 32.2432, lon: 77.1892 },
    budget: 2,
    days: 5,
    bestTime: 'March to June, December to January for snow',
    description:
      'A Himalayan hill station wrapped in pine forests and snow peaks, loved for its valleys, cafes, temples and winter sports.',
    attractions: [
      { name: 'Solang Valley', image: images.solang },
      { name: 'Rohtang Pass', image: images.rohtang },
      { name: 'Hidimba Devi Temple', image: images.hidimba },
    ],
  },
  {
    id: 'munnar',
    name: 'Munnar',
    location: 'Kerala, India',
    category: 'Mountains',
    image: images.munnar,
    coords: { lat: 10.0889, lon: 77.0595 },
    budget: 1,
    days: 3,
    bestTime: 'September to March',
    description:
      'Rolling tea plantations, misty hills and cool air in the Western Ghats. A gentle, green escape that is easy on the budget.',
    attractions: [
      { name: 'Tea Plantations Overview', image: images.munnar },
      { name: 'Eravikulam National Park', image: images.eravikulam },
      { name: 'Mattupetty Dam', image: images.mattupetty },
    ],
  },
  {
    id: 'agra',
    name: 'Agra',
    location: 'Uttar Pradesh',
    category: 'Heritage',
    image: images.tajMahal,
    coords: { lat: 27.1767, lon: 78.0081 },
    budget: 1,
    days: 2,
    bestTime: 'October to March',
    description:
      'Home of the Taj Mahal, the marble monument to love, and the mighty Mughal red-sandstone fort that watched over an empire.',
    attractions: [
      { name: 'Taj Mahal', image: images.tajMahal },
      { name: 'Agra Fort', image: images.agraFort },
    ],
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    location: 'Rajasthan, India',
    category: 'Heritage',
    image: images.hawaMahal,
    coords: { lat: 26.9124, lon: 75.7873 },
    budget: 2,
    days: 3,
    bestTime: 'October to March',
    description:
      'The Pink City is a blend of royal palaces, hilltop forts and bustling bazaars. Every street corner tells a Rajput story.',
    attractions: [
      { name: 'Hawa Mahal', image: images.hawaMahal },
      { name: 'Amber Fort', image: images.amber },
      { name: 'City Palace', image: images.cityPalace },
    ],
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh',
    location: 'Uttarakhand',
    category: 'Adventure',
    image: images.lakshmanJhula,
    coords: { lat: 30.0869, lon: 78.2676 },
    budget: 1,
    days: 3,
    bestTime: 'September to November, February to May',
    description:
      'The yoga capital of the world doubles as India\'s rafting hub. Run the rapids of the Ganga, bungee jump, camp on the riverbank and watch the evening aarti.',
    attractions: [
      { name: 'Lakshman Jhula', image: images.lakshmanJhula },
      { name: 'Ram Jhula', image: images.ramJhula },
    ],
  },
  {
    id: 'ladakh',
    name: 'Leh-Ladakh',
    location: 'Ladakh, India',
    category: 'Adventure',
    image: images.leh,
    coords: { lat: 34.1526, lon: 77.5771 },
    budget: 3,
    days: 7,
    bestTime: 'May to September',
    description:
      'A high-altitude cold desert of monasteries, mountain passes and unreal blue lakes. The ultimate road trip and trekking destination.',
    attractions: [
      { name: 'Pangong Tso', image: images.pangong },
      { name: 'Nubra Valley', image: images.nubra },
      { name: 'Leh Palace', image: images.lehPalace },
    ],
  },
];

export const getDestination = (id) => destinations.find((d) => d.id === id);

/**
 * Filters destinations by (case-insensitive) name and an optional category.
 * 'All' (or an empty category) disables category filtering.
 */
export function filterDestinations(list, query, category) {
  const q = query.trim().toLowerCase();
  return list.filter(
    (d) =>
      (!category || category === 'All' || d.category === category) &&
      (!q || d.name.toLowerCase().includes(q))
  );
}
