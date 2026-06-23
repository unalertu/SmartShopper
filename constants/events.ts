import { 
  Gift, PartyPopper, Flag, 
  Rabbit, ShoppingCart, Monitor, Backpack, Trophy,
  Sparkles, Sun, Snowflake, Leaf, Flame, UtensilsCrossed, TreePine, Coffee,
  Heart, Flower2, Shirt
} from 'lucide-react-native';

export interface EventData {
  name: string;
  date: Date;
  items: string[];
  icon: any;
  daysLeft?: number;
}

export interface SeasonalCard {
  name: string;
  items: string[];
  icon: any;
}

// ─── Shopping Events (countdown cards) ───

function getEasterDate(year: number): Date {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function getShoppingEvents(): EventData[] {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  const events: EventData[] = [];

  years.forEach(year => {
    // Back to School
    events.push({
      name: "Back to School",
      date: new Date(year, 7, 15),
      items: ["Notebooks", "Pens", "Backpack", "Lunchbox"],
      icon: Backpack
    });

    // Halloween
    events.push({
      name: "Halloween",
      date: new Date(year, 9, 31),
      items: ["Candy", "Pumpkins", "Costume Accessories", "Decorations"],
      icon: PartyPopper
    });

    // Thanksgiving: 4th Thursday of November
    const novFirst = new Date(year, 10, 1);
    const firstThursdayOffset = (4 - novFirst.getDay() + 7) % 7;
    const thanksgivingDate = new Date(year, 10, 1 + firstThursdayOffset + 21);
    events.push({
      name: "Thanksgiving",
      date: thanksgivingDate,
      items: ["Turkey", "Stuffing", "Cranberry Sauce", "Potatoes"],
      icon: PartyPopper
    });

    // Black Friday
    const blackFridayDate = new Date(thanksgivingDate);
    blackFridayDate.setDate(thanksgivingDate.getDate() + 1);
    events.push({
      name: "Black Friday",
      date: blackFridayDate,
      items: ["Electronics", "Gifts", "Toys", "Clothes"],
      icon: ShoppingCart
    });

    // Cyber Monday
    const cyberMondayDate = new Date(thanksgivingDate);
    cyberMondayDate.setDate(thanksgivingDate.getDate() + 4);
    events.push({
      name: "Cyber Monday",
      date: cyberMondayDate,
      items: ["Laptops", "Gadgets", "Software", "Headphones"],
      icon: Monitor
    });

    // Christmas
    events.push({
      name: "Christmas",
      date: new Date(year, 11, 25),
      items: ["Wrapping Paper", "Gift Bags", "Tape", "Batteries"],
      icon: Gift
    });

    // Super Bowl: 2nd Sunday in February
    const febFirst = new Date(year, 1, 1);
    const firstSunOffsetFeb = (0 - febFirst.getDay() + 7) % 7;
    const superBowlDate = new Date(year, 1, 1 + firstSunOffsetFeb + 7);
    events.push({
      name: "Super Bowl",
      date: superBowlDate,
      items: ["Chips", "Dip", "Wings", "Beer"],
      icon: Trophy
    });

    // Easter
    events.push({
      name: "Easter",
      date: getEasterDate(year),
      items: ["Chocolate Eggs", "Easter Baskets", "Candy", "Ham"],
      icon: Rabbit
    });

    // Independence Day
    events.push({
      name: "Independence Day",
      date: new Date(year, 6, 4),
      items: ["Burgers", "Hot Dogs", "Charcoal", "Soda"],
      icon: Flag
    });
    // Valentine's Day
    events.push({
      name: "Valentine's Day",
      date: new Date(year, 1, 14),
      items: ["Chocolates", "Flowers", "Cards", "Candles"],
      icon: Heart
    });

    // Mother's Day: 2nd Sunday in May
    const mayFirst = new Date(year, 4, 1);
    const firstSunOffsetMay = (0 - mayFirst.getDay() + 7) % 7;
    events.push({
      name: "Mother's Day",
      date: new Date(year, 4, 1 + firstSunOffsetMay + 7),
      items: ["Flowers", "Cards", "Gift Wrap", "Perfume"],
      icon: Flower2
    });

    // Father's Day: 3rd Sunday in June
    const juneFirst = new Date(year, 5, 1);
    const firstSunOffsetJune = (0 - juneFirst.getDay() + 7) % 7;
    events.push({
      name: "Father's Day",
      date: new Date(year, 5, 1 + firstSunOffsetJune + 14),
      items: ["Cards", "Tools", "Grill Accessories", "Cologne"],
      icon: Shirt
    });

    // New Year's
    events.push({
      name: "New Year's",
      date: new Date(year, 11, 31),
      items: ["Champagne", "Party Hats", "Snacks", "Decorations"],
      icon: PartyPopper
    });
  });

  return events;
}

// ─── Seasonal Cards (rotating, no countdown) ───

const springCards: SeasonalCard[] = [
  { name: "Spring Cleaning", items: ["Trash Bags", "Sponges", "Window Cleaner", "Paper Towels"], icon: Sparkles },
  { name: "Picnic Essentials", items: ["Sandwiches", "Fruit", "Juice", "Napkins"], icon: Sun },
  { name: "Garden Season", items: ["Seeds", "Soil", "Gloves", "Watering Can"], icon: Leaf },
];

const summerCards: SeasonalCard[] = [
  { name: "Summer BBQ", items: ["Burgers", "Hot Dogs", "Charcoal", "Soda"], icon: Flame },
  { name: "Road Trip Snacks", items: ["Chips", "Granola Bars", "Water Bottles", "Gum"], icon: Sun },
  { name: "Beach Day", items: ["Sunscreen", "Towels", "Snacks", "Cooler"], icon: Sun },
];

const fallCards: SeasonalCard[] = [
  { name: "Back to School", items: ["Notebooks", "Pens", "Backpack", "Lunchbox"], icon: Backpack },
  { name: "Football Sunday", items: ["Wings", "Chips", "Dip", "Beer"], icon: Trophy },
  { name: "Thanksgiving Prep", items: ["Turkey", "Stuffing", "Cranberry Sauce", "Pie Crust"], icon: UtensilsCrossed },
];

const winterCards: SeasonalCard[] = [
  { name: "Holiday Baking", items: ["Flour", "Sugar", "Butter", "Vanilla Extract"], icon: Gift },
  { name: "Winter Essentials", items: ["Hot Chocolate", "Tea", "Soup", "Blankets"], icon: Snowflake },
  { name: "Game Night Snacks", items: ["Popcorn", "Chips", "Candy", "Soda"], icon: Coffee },
];

function getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function getSeasonalCards(): SeasonalCard[] {
  const season = getCurrentSeason();
  switch (season) {
    case 'spring': return springCards;
    case 'summer': return summerCards;
    case 'fall': return fallCards;
    case 'winter': return winterCards;
  }
}

/** Pick one seasonal card based on the current date, rotating every 3 days */
export function getCurrentSeasonalCard(): SeasonalCard {
  const cards = getSeasonalCards();
  const now = new Date();
  // Day index since epoch, divided by 3 for a 3-day rotation
  const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  const index = Math.floor(daysSinceEpoch / 3) % cards.length;
  return cards[index];
}

// ─── Priority System ───

export interface SuggestionCard {
  type: 'event' | 'seasonal';
  name: string;
  items: string[];
  icon: any;
  daysLeft?: number;
}

/**
 * Priority:
 * 1. Shopping event ≤14 days away → show event card with countdown
 * 2. No upcoming event → show rotating seasonal card
 */
export function getSuggestionCards(): SuggestionCard[] {
  const events = getShoppingEvents();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingEvents: SuggestionCard[] = [];

  for (const event of events) {
    const eventDate = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 14) {
      upcomingEvents.push({
        type: 'event',
        name: event.name,
        items: event.items,
        icon: event.icon,
        daysLeft: diffDays,
      });
    }
  }

  if (upcomingEvents.length > 0) {
    return upcomingEvents.sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));
  }

  // Fallback: seasonal card
  const seasonal = getCurrentSeasonalCard();
  return [{
    type: 'seasonal',
    name: seasonal.name,
    items: seasonal.items,
    icon: seasonal.icon,
  }];
}
